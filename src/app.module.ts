import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { FaqModule } from './faq.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb+srv://Algorithmic_Persuasion_admin:qBqMEPcUNdXUR3k6@cluster0.c74rfvw.mongodb.net/',
    ),
    FaqModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

