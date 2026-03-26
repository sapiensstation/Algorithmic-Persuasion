import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'faqs' })
export class Faq extends Document {
  @Prop({ required: true })
  question: string;

  @Prop({ required: true, index: true })
  normalizedQuestion: string;

  @Prop({ required: true })
  answer: string;
}
export const FaqSchema = SchemaFactory.createForClass(Faq);