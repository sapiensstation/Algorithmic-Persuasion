import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { normalizeText } from './faq.utils';
import { FAQ_SEED } from './faq.seed.data';
import { Faq } from 'src/faq.schema';

@Injectable()
export class FaqSeed implements OnModuleInit {
  constructor(
    @InjectModel(Faq.name)
    private readonly faqModel: Model<Faq>,
  ) {}

  async onModuleInit() {
    const count = await this.faqModel.countDocuments();

    if (count > 0) {
      console.log('FAQ seed skipped (already exists)');
      return;
    }

    await this.faqModel.insertMany(
      FAQ_SEED.map((faq) => ({
        ...faq,
        normalizedQuestion: normalizeText(faq.question),
      })),
    );

    console.log('FAQ seed completed');
  }
}
