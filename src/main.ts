import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TOTAL_COUNT_HEADER } from './modules/transactions/presentation/transactions.controller';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN'),
    // Lets the frontend read the history total for pagination.
    exposedHeaders: [TOTAL_COUNT_HEADER],
  });
  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  Logger.log(`API running on http://localhost:${port}/v1`, 'Bootstrap');
}

void bootstrap();
