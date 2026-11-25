import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('v1');
  app.enableCors({ origin: config.get<string>('CORS_ORIGIN') });
  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  Logger.log(`API running on http://localhost:${port}/v1`, 'Bootstrap');
}

void bootstrap();
