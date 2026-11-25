import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ExchangeRateProvider } from './application/ports/exchange-rate-provider';
import { GetCurrentExchangeRateUseCase } from './application/use-cases/get-current-exchange-rate.use-case';
import { RefreshExchangeRateUseCase } from './application/use-cases/refresh-exchange-rate.use-case';
import { ExchangeRateRepository } from './domain/exchange-rate.repository';
import { CachedExchangeRateRepository } from './infrastructure/persistence/cached-exchange-rate.repository';
import {
  ExchangeRateDocument,
  ExchangeRateSchema,
} from './infrastructure/persistence/exchange-rate.schema';
import { MongoExchangeRateRepository } from './infrastructure/persistence/mongo-exchange-rate.repository';
import { ApisNetPeExchangeRateProvider } from './infrastructure/providers/apis-net-pe-exchange-rate.provider';
import { ExchangeRateRefreshScheduler } from './infrastructure/scheduling/exchange-rate-refresh.scheduler';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExchangeRateDocument.name, schema: ExchangeRateSchema },
    ]),
  ],
  providers: [
    MongoExchangeRateRepository,
    {
      // Everyone reads and writes through the in-memory cache.
      provide: ExchangeRateRepository,
      useFactory: (mongo: MongoExchangeRateRepository) =>
        new CachedExchangeRateRepository(mongo),
      inject: [MongoExchangeRateRepository],
    },
    {
      provide: ExchangeRateProvider,
      useFactory: (config: ConfigService) =>
        new ApisNetPeExchangeRateProvider(
          config.getOrThrow<string>('EXCHANGE_RATE_API_URL'),
          config.getOrThrow<number>('EXCHANGE_RATE_TIMEOUT_MS'),
        ),
      inject: [ConfigService],
    },
    {
      provide: RefreshExchangeRateUseCase,
      useFactory: (
        provider: ExchangeRateProvider,
        rates: ExchangeRateRepository,
      ) => new RefreshExchangeRateUseCase(provider, rates),
      inject: [ExchangeRateProvider, ExchangeRateRepository],
    },
    {
      provide: GetCurrentExchangeRateUseCase,
      useFactory: (rates: ExchangeRateRepository) =>
        new GetCurrentExchangeRateUseCase(rates),
      inject: [ExchangeRateRepository],
    },
    {
      provide: ExchangeRateRefreshScheduler,
      useFactory: (
        refreshExchangeRate: RefreshExchangeRateUseCase,
        config: ConfigService,
      ) =>
        new ExchangeRateRefreshScheduler(
          refreshExchangeRate,
          config.getOrThrow<number>('EXCHANGE_RATE_REFRESH_INTERVAL_MS'),
        ),
      inject: [RefreshExchangeRateUseCase, ConfigService],
    },
  ],
  // Transactions read the current rate through this use case.
  exports: [GetCurrentExchangeRateUseCase],
})
export class ExchangeRateModule {}
