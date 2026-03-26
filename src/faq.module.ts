import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Faq, FaqSchema } from './faq.schema';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { FaqSeed } from './faq/faq.seed';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Faq.name, schema: FaqSchema },
    ]),
  ],
  providers: [FaqService, FaqSeed],
  controllers: [FaqController],
  exports: [FaqService],
})
export class FaqModule {}
