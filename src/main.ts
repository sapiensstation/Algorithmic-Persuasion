import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import mongoose from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // This tells Nest to serve files from the 'public' folder
  app.useStaticAssets(join(__dirname, '..', 'public'));

  mongoose.connection.on('connected', () => {
    console.log('Connected to DB:', mongoose.connection.name);
  });
  let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // const app = await NestFactory.create(AppModule);

  // let port = 3000;

  while (true) {
    try {
      await app.listen(port);
      console.log(`🚀 Server running on http://localhost:${port}`);
      break;
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${port} busy, trying ${port + 1}...`);
        port++;
      } else {
        throw err;
      }
    }
  }

  // await app.listen(port);
  // console.log(`Listening on http://localhost:${port}`);
}
bootstrap();
