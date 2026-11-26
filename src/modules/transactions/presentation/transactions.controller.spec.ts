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
import { GetTransactionHistoryUseCase } from '../application/use-cases/get-transaction-history.use-case';
import { Currency } from '../domain/currency';
import { Transaction } from '../domain/transaction';
import { AMOUNT_MESSAGES } from '../domain/value-objects/amount';
import { HISTORY_DATE_MESSAGES } from '../domain/value-objects/history-period';
import { InMemoryTransactionRepository } from '../testing/in-memory-transaction.repository';
import { StubCurrentRateQuote } from '../testing/stub-current-rate-quote';
import { TransactionsController } from './transactions.controller';

describe('TransactionsController (integration)', () => {
  const NOW = new Date('2024-01-18T15:00:00Z');
  let app: INestApplication<App>;
  let transactions: InMemoryTransactionRepository;
  let currentRate: StubCurrentRateQuote;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    transactions = new InMemoryTransactionRepository();
    currentRate = new StubCurrentRateQuote();
    const tokens = new FakeTokenService();
    userToken = await tokens.signAccessToken({
      sub: 'user-1',
      email: 'juan@example.com',
      role: Role.USER,
    });
    adminToken = await tokens.signAccessToken({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: Role.ADMIN,
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
        {
          provide: GetTransactionHistoryUseCase,
          useValue: new GetTransactionHistoryUseCase(transactions),
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

  describe('POST /transactions', () => {
    const post = (body: object, auth = userToken) => {
      const req = request(app.getHttpServer()).post('/transactions');
      return (auth ? req.set('Authorization', `Bearer ${auth}`) : req).send(
        body,
      );
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
      const res = await post({ ...validBody, monedaDestino: 'USD' }).expect(
        400,
      );

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

  describe('GET /transactions/history', () => {
    const history = (query: Record<string, string>, auth = userToken) => {
      const req = request(app.getHttpServer())
        .get('/transactions/history')
        .query(query);
      return auth ? req.set('Authorization', `Bearer ${auth}`) : req;
    };

    const january = { startDate: '2024-01-01', endDate: '2024-01-31' };

    const store = (userId: string, createdAt: string) =>
      transactions.transactions.push(
        Transaction.restore({
          id: `${userId}@${createdAt}`,
          userId,
          sourceCurrency: Currency.USD,
          targetCurrency: Currency.PEN,
          amount: 100,
          convertedAmount: 373.9,
          rate: 3.739,
          createdAt: new Date(createdAt),
        }),
      );

    beforeEach(() => {
      store('user-1', '2024-01-10T15:00:00Z');
      store('user-1', '2024-01-20T15:00:00Z');
      store('user-2', '2024-01-15T15:00:00Z');
      store('admin-1', '2024-01-12T15:00:00Z');
    });

    const ids = (body: unknown) => (body as { id: string }[]).map((t) => t.id);

    it('answers a plain array with the documented shape, newest first', async () => {
      const res = await history(january).expect(200);

      expect(res.body).toEqual([
        {
          id: 'user-1@2024-01-20T15:00:00Z',
          monedaOrigen: 'USD',
          monedaDestino: 'PEN',
          monto: 100,
          montoCambiado: 373.9,
          tipoCambio: 3.739,
          fecha: '2024-01-20T15:00:00.000Z',
        },
        expect.objectContaining({ id: 'user-1@2024-01-10T15:00:00Z' }),
      ]);
      expect(res.headers['x-total-count']).toBe('2');
    });

    it('lets a user read only their own history, even when sending userId', async () => {
      const res = await history({ ...january, userId: 'user-2' }).expect(200);

      expect(ids(res.body)).toEqual([
        'user-1@2024-01-20T15:00:00Z',
        'user-1@2024-01-10T15:00:00Z',
      ]);
    });

    it('shows the admin their own history when no userId is sent', async () => {
      const res = await history(january, adminToken).expect(200);

      expect(ids(res.body)).toEqual(['admin-1@2024-01-12T15:00:00Z']);
    });

    it("lets the admin read another user's history with userId", async () => {
      const res = await history(
        { ...january, userId: 'user-2' },
        adminToken,
      ).expect(200);

      expect(ids(res.body)).toEqual(['user-2@2024-01-15T15:00:00Z']);
    });

    it('filters by the date range', async () => {
      const res = await history({
        startDate: '2024-01-15',
        endDate: '2024-01-31',
      }).expect(200);

      expect(ids(res.body)).toEqual(['user-1@2024-01-20T15:00:00Z']);
    });

    it('paginates when page and limit are sent, keeping the total in a header', async () => {
      const res = await history({ ...january, page: '2', limit: '1' }).expect(
        200,
      );

      expect(ids(res.body)).toEqual(['user-1@2024-01-10T15:00:00Z']);
      expect(res.headers['x-total-count']).toBe('2');
    });

    it('requires authentication', async () => {
      await history(january, '').expect(401);
    });

    it.each([
      [
        'a missing startDate',
        { endDate: '2024-01-31' },
        'La fecha de inicio (startDate) es obligatoria',
      ],
      [
        'a missing endDate',
        { startDate: '2024-01-01' },
        'La fecha de fin (endDate) es obligatoria',
      ],
      [
        'a badly formatted date',
        { startDate: '01/01/2024', endDate: '2024-01-31' },
        HISTORY_DATE_MESSAGES.invalidStart,
      ],
      [
        'a page that is not a positive integer',
        { ...january, page: '0' },
        'La página debe ser un número entero mayor a 0',
      ],
      [
        'a limit above 100',
        { ...january, limit: '500' },
        'El límite debe ser un número entero entre 1 y 100',
      ],
      [
        'a limit that is not a number',
        { ...january, limit: 'abc' },
        'El límite debe ser un número entero entre 1 y 100',
      ],
    ])('rejects %s with a clear message', async (_label, query, message) => {
      const res = await history(query).expect(400);

      expect(res.body).toMatchObject({ message: [message] });
    });

    it.each([
      [
        'a date that does not exist',
        { startDate: '2024-02-30', endDate: '2024-03-31' },
        HISTORY_DATE_MESSAGES.invalidStart,
      ],
      [
        'a start date after the end date',
        { startDate: '2024-02-01', endDate: '2024-01-01' },
        HISTORY_DATE_MESSAGES.reversed,
      ],
    ])('rejects %s', async (_label, query, message) => {
      const res = await history(query).expect(400);

      expect(res.body).toMatchObject({
        error: 'INVALID_HISTORY_PERIOD',
        message,
      });
    });
  });
});
