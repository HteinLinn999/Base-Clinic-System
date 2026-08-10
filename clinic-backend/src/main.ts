// clinic-backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
// import { ValidationPipe } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
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
  app.useGlobalPipes(new ZodValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
