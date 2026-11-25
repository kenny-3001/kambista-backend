import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DomainExceptionFilter } from '../../../shared/presentation/filters/domain-exception.filter';
import { TokenService } from '../../auth/application/ports/token-service';
import { Role } from '../../auth/domain/role';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { FakeTokenService } from '../../auth/testing/fake-token-service';
import { CreateTransactionUseCase } from '../application/use-cases/create-transaction.use-case';
import { InMemoryTransactionRepository } from '../testing/in-memory-transaction.repository';
import { StubCurrentRateQuote } from '../testing/stub-current-rate-quote';
import { AMOUNT_MESSAGES } from '../domain/value-objects/amount';
import { TransactionsController } from './transactions.controller';

describe('POST /transactions (integration)', () => {
  const NOW = new Date('2024-01-18T15:00:00Z');
  let app: INestApplication<App>;
  let transactions: InMemoryTransactionRepository;
  let currentRate: StubCurrentRateQuote;
  let token: string;

  beforeAll(async () => {
    transactions = new InMemoryTransactionRepository();
    currentRate = new StubCurrentRateQuote();
    const tokens = new FakeTokenService();
    token = await tokens.signAccessToken({
      sub: 'user-1',
      email: 'juan@example.com',
      role: Role.USER,
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: CreateTransactionUseCase,
          useValue: new CreateTransactionUseCase(
            transactions,
            currentRate,
            () => NOW,
          ),
        },
        { provide: TokenService, useValue: tokens },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        {
          provide: APP_PIPE,
          useValue: new ValidationPipe({
            whitelist: true,
            transform: true,
            stopAtFirstError: true,
          }),
        },
        { provide: APP_FILTER, useClass: DomainExceptionFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    transactions.transactions.length = 0;
    currentRate.respondWith({ buy: 3.733, sell: 3.739 });
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (body: object, auth = token) => {
    const req = request(app.getHttpServer()).post('/transactions');
    return (auth ? req.set('Authorization', `Bearer ${auth}`) : req).send(body);
  };

  const validBody = { monedaOrigen: 'USD', monedaDestino: 'PEN', monto: 100 };

  it('creates the transaction and answers with the documented shape', async () => {
    const res = await post(validBody).expect(201);

    expect(res.body).toEqual({
      id: expect.any(String) as string,
      monedaOrigen: 'USD',
      monedaDestino: 'PEN',
      monto: 100,
      montoCambiado: 373.9,
      tipoCambio: 3.739,
      fecha: '2024-01-18T15:00:00.000Z',
    });
    expect(transactions.transactions[0].id).toBe(
      (res.body as { id: string }).id,
    );
  });

  it('assigns the transaction to the token owner, ignoring any userId in the body', async () => {
    await post({ ...validBody, userId: 'someone-else' }).expect(201);

    expect(transactions.transactions[0].userId).toBe('user-1');
  });

  it('requires authentication', async () => {
    await post(validBody, '').expect(401);
    expect(transactions.transactions).toHaveLength(0);
  });

  it('answers 503 when no exchange rate is registered yet', async () => {
    currentRate.withoutRate();

    const res = await post(validBody).expect(503);
    expect(res.body).toMatchObject({ error: 'EXCHANGE_RATE_NOT_AVAILABLE' });
  });

  it('rejects the same currency on both sides', async () => {
    const res = await post({ ...validBody, monedaDestino: 'USD' }).expect(400);

    expect(res.body).toMatchObject({
      error: 'SAME_CURRENCY',
      message: 'La moneda de origen y la de destino no pueden ser iguales',
    });
  });

  it.each([
    ['a missing amount', { monto: undefined }, 'El monto es obligatorio'],
    ['an amount sent as text', { monto: '100' }, AMOUNT_MESSAGES.notANumber],
    ['a zero amount', { monto: 0 }, AMOUNT_MESSAGES.notPositive],
    ['a negative amount', { monto: -5 }, AMOUNT_MESSAGES.notPositive],
    [
      'more than 2 decimals',
      { monto: 10.123 },
      AMOUNT_MESSAGES.tooManyDecimals,
    ],
    [
      'more than 7 integer digits',
      { monto: 10_000_000 },
      AMOUNT_MESSAGES.tooLarge,
    ],
    [
      'a missing source currency',
      { monedaOrigen: undefined },
      'La moneda de origen es obligatoria',
    ],
    [
      'an unsupported currency',
      { monedaDestino: 'EUR' },
      'La moneda de destino debe ser USD o PEN',
    ],
  ])('rejects %s with a clear message', async (_label, override, message) => {
    const res = await post({ ...validBody, ...override }).expect(400);

    expect(res.body).toMatchObject({ message: [message] });
    expect(transactions.transactions).toHaveLength(0);
  });
});
