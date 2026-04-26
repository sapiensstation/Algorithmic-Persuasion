import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
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

  @Get('upload')
  getUploadPage(@Res() res: Response) {
    res.sendFile('upload.html', { root: join(process.cwd(), 'public') });
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage() }),
  )
  async uploadFaqFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    return this.faqService.processUploadedFile(file);
  }
}
