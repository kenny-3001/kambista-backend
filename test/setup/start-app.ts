import type { LoggerService } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { ExchangeRateProvider } from '../../src/modules/exchange-rate/application/ports/exchange-rate-provider';
import { GetCurrentExchangeRateUseCase } from '../../src/modules/exchange-rate/application/use-cases/get-current-exchange-rate.use-case';
import { ExchangeRateRefreshScheduler } from '../../src/modules/exchange-rate/infrastructure/scheduling/exchange-rate-refresh.scheduler';
import { StubExchangeRateProvider } from '../../src/modules/exchange-rate/testing/stub-exchange-rate.provider';

export interface E2EApp {
  app: NestExpressApplication;
  /** Requests to the app, as a client would send them. */
  api: () => ReturnType<typeof request>;
  db: Connection;
  provider: StubExchangeRateProvider;
  /** Runs the scheduled refresh now instead of waiting for the interval. */
  refreshRate: () => Promise<void>;
}

/**
 * The real application, configured as in production (configureApp), with
 * one replacement: the SUNAT provider, so tests neither call the external
 * service nor depend on its rate.
 */
export async function startApp(
  options: { providerDown?: Error; logger?: LoggerService } = {},
): Promise<E2EApp> {
  const provider = new StubExchangeRateProvider();
  if (options.providerDown) {
    provider.failWith(options.providerDown);
  }
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ExchangeRateProvider)
    .useValue(provider)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: options.logger ?? false,
  });
  configureApp(app);
  await app.init();

  if (!options.providerDown) {
    // The scheduler fetches the first rate right after startup.
    const currentRate = app.get(GetCurrentExchangeRateUseCase);
    await waitFor(() => currentRate.execute());
  }

  return {
    app,
    api: () => request(app.getHttpServer()),
    db: app.get<Connection>(getConnectionToken()),
    provider,
    refreshRate: () => app.get(ExchangeRateRefreshScheduler).refresh(),
  };
}

async function waitFor(check: () => Promise<unknown>): Promise<void> {
  const deadline = Date.now() + 5_000;
  for (;;) {
    try {
      await check();
      return;
    } catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}

/** Today's date in Peru (YYYY-MM-DD): the history reads days in Peru time. */
export function peruToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
