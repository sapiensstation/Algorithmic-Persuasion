import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { join } from 'path';
import { memoryStorage } from 'multer';
import { FaqService } from './faq.service';

@Controller()
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Post('ask')
  async ask(@Body('message') message: string) {
    return this.faqService.getAnswer(message);
  }

  private checkSecret(key?: string) {
    const expected = process.env.UPLOAD_KEY;
    if (!expected || key !== expected) {
      throw new NotFoundException('Cannot GET /upload');
    }
  }

  @Get('upload')
  getUploadPage(@Query('key') key: string, @Res() res: Response) {
    this.checkSecret(key);
    res.sendFile('upload.html', { root: join(process.cwd(), 'public') });
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadFaqFile(
    @Query('key') key: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.checkSecret(key);
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    return this.faqService.processUploadedFile(file);
  }
}
