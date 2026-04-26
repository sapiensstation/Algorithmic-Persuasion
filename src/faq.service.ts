import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Faq } from './faq.schema';
import { normalizeText } from './faq/faq.utils';
import { FaqSeedItem } from './faq/faq.seed.data';
import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FaqService {
  constructor(@InjectModel(Faq.name) private faqModel: Model<Faq>) {}

  async getAnswer(userInput: string): Promise<{
    answer: string;
    confidence: number;
  }> {
    const normalized = normalizeText(userInput);

    // 1️⃣ Exact match
    let result = await this.faqModel.findOne({
      normalizedQuestion: normalized,
    });

    if (result) {
      return { answer: result.answer, confidence: 1.0 };
    }

    // 2️⃣ Partial match fallback
    result = await this.faqModel.findOne({
      normalizedQuestion: { $regex: normalized },
    });

    if (result) {
      return { answer: result.answer, confidence: 0.6 };
    }

    // 3️⃣ No match
    return {
      answer: "I'm sorry, I don't have a specific answer for that.",
      confidence: 0.0,
    };
  }

  async processUploadedFile(
    file: Express.Multer.File,
  ): Promise<{ added: number; items: FaqSeedItem[] }> {
    const ext = path.extname(file.originalname).toLowerCase();
    let items: FaqSeedItem[] = [];

    if (ext === '.xlsx' || ext === '.xls') {
      items = this.parseExcel(file.buffer);
    } else if (ext === '.docx') {
      items = await this.parseWord(file.buffer);
    } else {
      throw new BadRequestException(
        'Unsupported file type. Please upload .xlsx, .xls, or .docx.',
      );
    }

    if (items.length === 0) {
      throw new BadRequestException(
        'No valid Q&A pairs found. Make sure your file has "Question" and "Answer" columns (Excel) or Q:/A: prefixed paragraphs / a two-column table (Word).',
      );
    }

    // Insert into MongoDB
    await this.faqModel.insertMany(
      items.map((item) => ({
        ...item,
        normalizedQuestion: normalizeText(item.question),
      })),
    );

    // Append to seed file for persistence
    this.appendToSeedFile(items);

    return { added: items.length, items };
  }

  private parseExcel(buffer: Buffer): FaqSeedItem[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

    if (rows.length < 2) return [];

    const header = rows[0].map((h) => String(h ?? '').toLowerCase().trim());
    const qIdx = header.findIndex(
      (h) => h.includes('question') || h === 'q',
    );
    const aIdx = header.findIndex(
      (h) => h.includes('answer') || h === 'a',
    );

    if (qIdx === -1 || aIdx === -1) return [];

    return rows
      .slice(1)
      .filter((row) => row[qIdx] && row[aIdx])
      .map((row) => ({
        question: String(row[qIdx]).trim(),
        answer: String(row[aIdx]).trim(),
      }));
  }

  private async parseWord(buffer: Buffer): Promise<FaqSeedItem[]> {
    const { value: html } = await mammoth.convertToHtml({ buffer });

    // Try Q1. / Q2. numbered question format (most common in this project)
    const qNumbered = this.parseQNumberedHtml(html);
    if (qNumbered.length > 0) return qNumbered;

    // Try two-column table
    const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
    if (tableMatch) {
      const tableItems = this.parseHtmlTable(tableMatch[0]);
      if (tableItems.length > 0) return tableItems;
    }

    // Fall back to Q:/A: paragraph format in raw text
    const { value: text } = await mammoth.extractRawText({ buffer });
    return this.parseQAText(text);
  }

  private parseQNumberedHtml(html: string): FaqSeedItem[] {
    const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').trim();

    // Split into top-level blocks: <p>, <ol>, <ul>
    const blocks = [
      ...html.matchAll(/<(p|ol|ul)([^>]*)>([\s\S]*?)<\/(p|ol|ul)>/gi),
    ];

    const items: FaqSeedItem[] = [];
    let currentQuestion = '';
    let answerParts: string[] = [];
    let capturing = false;

    const flush = () => {
      if (currentQuestion && answerParts.length > 0) {
        items.push({ question: currentQuestion, answer: answerParts.join('\n') });
      }
      answerParts = [];
    };

    for (const block of blocks) {
      const tag = block[1].toLowerCase();
      const inner = block[3];
      const text = stripTags(inner).trim();

      if (!text) continue;

      const qMatch = text.match(/^Q\d+\.\s+(.+)/i);
      if (qMatch) {
        flush();
        currentQuestion = qMatch[1].trim().replace(/\.$/, '');
        capturing = true;
        continue;
      }

      if (!capturing) continue;

      if (tag === 'ol' || tag === 'ul') {
        // Numbered list — extract <li> items and number them
        const liItems = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(
          (m) => stripTags(m[1]).trim(),
        );
        liItems.forEach((li, i) => {
          if (li) answerParts.push(`${i + 1}. ${li}`);
        });
      } else {
        // Regular paragraph — join multi-para narratives with double newline
        if (answerParts.length > 0) {
          answerParts.push('\n' + text);
        } else {
          answerParts.push(text);
        }
      }
    }

    flush();
    return items;
  }

  private parseHtmlTable(tableHtml: string): FaqSeedItem[] {
    const rows = [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)];
    if (rows.length < 2) return [];

    const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').trim();

    // Detect header row to find column indices
    const headerCells = [...rows[0][0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
      (m) => stripTags(m[1]).toLowerCase(),
    );
    const qIdx = headerCells.findIndex(
      (h) => h.includes('question') || h === 'q',
    );
    const aIdx = headerCells.findIndex(
      (h) => h.includes('answer') || h === 'a',
    );

    // If no header found, assume first column = question, second = answer
    const effectiveQIdx = qIdx === -1 ? 0 : qIdx;
    const effectiveAIdx = aIdx === -1 ? 1 : aIdx;
    const dataRows = qIdx === -1 ? rows : rows.slice(1);

    const items: FaqSeedItem[] = [];
    for (const row of dataRows) {
      const cells = [...row[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
        (m) => stripTags(m[1]),
      );
      const question = cells[effectiveQIdx]?.trim();
      const answer = cells[effectiveAIdx]?.trim();
      if (question && answer) items.push({ question, answer });
    }
    return items;
  }

  private parseQAText(text: string): FaqSeedItem[] {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const items: FaqSeedItem[] = [];
    let currentQ = '';
    let currentA = '';

    for (const line of lines) {
      if (/^(question|q)\s*:/i.test(line)) {
        if (currentQ && currentA) items.push({ question: currentQ, answer: currentA });
        currentQ = line.replace(/^(question|q)\s*:\s*/i, '').trim();
        currentA = '';
      } else if (/^(answer|a)\s*:/i.test(line)) {
        currentA = line.replace(/^(answer|a)\s*:\s*/i, '').trim();
      } else if (currentA) {
        currentA += ' ' + line;
      }
    }

    if (currentQ && currentA) items.push({ question: currentQ, answer: currentA });
    return items;
  }

  private appendToSeedFile(items: FaqSeedItem[]): void {
    const seedFilePath = path.join(
      process.cwd(),
      'src',
      'faq',
      'faq.seed.data.ts',
    );

    let content = fs.readFileSync(seedFilePath, 'utf-8');

    const newEntries = items
      .map(
        (item) =>
          `  {\n    question: ${JSON.stringify(item.question)},\n    answer: ${JSON.stringify(item.answer)},\n  },`,
      )
      .join('\n');

    const lastBracket = content.lastIndexOf('];');
    content =
      content.slice(0, lastBracket) +
      newEntries +
      '\n' +
      content.slice(lastBracket);

    fs.writeFileSync(seedFilePath, content, 'utf-8');
  }
}
