import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Faq } from './faq.schema';
import { normalizeText } from './faq/faq.utils';

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
      return {
        answer: result.answer,
        confidence: 1.0,
      };
    }

    // 2️⃣ Partial match fallback
    result = await this.faqModel.findOne({
      normalizedQuestion: { $regex: normalized },
    });

    if (result) {
      return {
        answer: result.answer,
        confidence: 0.6,
      };
    }

    // 3️⃣ No match
    return {
      answer: "I'm sorry, I don't have a specific answer for that.",
      confidence: 0.0,
    };
  }
}
