// clinic-backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Helmet Security Headers
  app.use(helmet());

  // 2. Strict CORS Setting
  app.enableCors({
    origin: [process.env.ADMIN_WEB_URL, process.env.MOBILE_APP_SCHEME],
    credentials: true,
  });

  // 3. Global Input Validation & DTO Sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO ထဲမပါသော Extra Fields များကို ဖျက်ထုတ်မည်
      forbidNonWhitelisted: true, // မသတ်မှတ်ထားသော Field ပါလာပါက Request ကို ငြင်းပယ်မည်
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
