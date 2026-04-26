import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Faq, FaqSchema } from './faq.schema';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { FaqSeed } from './faq/faq.seed';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Faq.name, schema: FaqSchema }]),
    MulterModule.register({ storage: memoryStorage() }),
  ],
  providers: [FaqService, FaqSeed],
  controllers: [FaqController],
  exports: [FaqService],
})
export class FaqModule {}
