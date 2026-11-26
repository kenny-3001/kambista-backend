import { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ApiExceptionFilter } from '../../../shared/presentation/filters/api-exception.filter';
import { TokenService } from '../../auth/application/ports/token-service';
import { Role } from '../../auth/domain/role';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { FakeTokenService } from '../../auth/testing/fake-token-service';
import { GetCurrentExchangeRateUseCase } from '../application/use-cases/get-current-exchange-rate.use-case';
import { ExchangeRate } from '../domain/exchange-rate';
import { InMemoryExchangeRateRepository } from '../testing/in-memory-exchange-rate.repository';
import { ExchangeRateController } from './exchange-rate.controller';

describe('ExchangeRateController (integration)', () => {
  let app: INestApplication<App>;
  let rates: InMemoryExchangeRateRepository;
  let token: string;

  const rate = (sell: number, fetchedAt: string) =>
    ExchangeRate.create({
      buy: 3.733,
      sell,
      currency: 'USD',
      source: 'SUNAT',
      date: '2024-01-18',
      fetchedAt: new Date(fetchedAt),
    });

  beforeAll(async () => {
    rates = new InMemoryExchangeRateRepository();
    const tokens = new FakeTokenService();
    token = await tokens.signAccessToken({
      sub: 'user-1',
      email: 'juan@example.com',
      role: Role.USER,
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [ExchangeRateController],
      providers: [
        {
          provide: GetCurrentExchangeRateUseCase,
          useValue: new GetCurrentExchangeRateUseCase(rates),
        },
        { provide: TokenService, useValue: tokens },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    rates.rates.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the latest stored rate with the field names of the statement', async () => {
    await rates.save(rate(3.739, '2024-01-18T15:00:00Z'));
    await rates.save(rate(3.75, '2024-01-18T15:00:30Z'));

    const response = await request(app.getHttpServer())
      .get('/exchange-rate')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      compra: 3.733,
      venta: 3.75,
      origen: 'SUNAT',
      moneda: 'USD',
      fecha: '2024-01-18',
      actualizadoEn: '2024-01-18T15:00:30.000Z',
    });
  });

  it('answers 503 while no rate has been stored yet', async () => {
    const response = await request(app.getHttpServer())
      .get('/exchange-rate')
      .set('Authorization', `Bearer ${token}`)
      .expect(503);

    expect(response.body).toEqual({
      statusCode: 503,
      error: 'EXCHANGE_RATE_NOT_AVAILABLE',
      message:
        'No hay un tipo de cambio registrado todavía. Intenta nuevamente en unos segundos.',
    });
  });

  it('requires an access token', async () => {
    await rates.save(rate(3.739, '2024-01-18T15:00:00Z'));

    const response = await request(app.getHttpServer())
      .get('/exchange-rate')
      .expect(401);

    expect(response.body).toMatchObject({ error: 'MISSING_ACCESS_TOKEN' });
  });
});
