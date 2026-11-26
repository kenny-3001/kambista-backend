import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { ExchangeRateModule } from './modules/exchange-rate/exchange-rate.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { envValidationSchema } from './shared/infrastructure/config/env.validation';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { ApiExceptionFilter } from './shared/presentation/filters/api-exception.filter';
import { createValidationPipe } from './shared/presentation/validation/create-validation-pipe';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    AuthModule,
    ExchangeRateModule,
    TransactionsModule,
  ],
  providers: [
    { provide: APP_PIPE, useValue: createValidationPipe() },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
