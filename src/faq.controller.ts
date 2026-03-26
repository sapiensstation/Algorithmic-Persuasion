import { Controller, Post, Body, Get } from '@nestjs/common';
import { FaqService } from './faq.service'; // Adjust the path as needed

@Controller()
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Post('ask')
  async ask(@Body('message') message: string) {
  return this.faqService.getAnswer(message);
  }
}
