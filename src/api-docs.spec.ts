import { INestApplication } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { LoginUserUseCase } from './modules/auth/application/use-cases/login-user.use-case';
import { RegisterUserUseCase } from './modules/auth/application/use-cases/register-user.use-case';
import { AuthController } from './modules/auth/presentation/auth.controller';
import { CreateTransactionUseCase } from './modules/transactions/application/use-cases/create-transaction.use-case';
import { GetTransactionHistoryUseCase } from './modules/transactions/application/use-cases/get-transaction-history.use-case';
import { TransactionsController } from './modules/transactions/presentation/transactions.controller';
import { buildSwaggerDocument } from './shared/presentation/swagger/setup-swagger';

type Operation = {
  security?: unknown[];
  parameters?: { name: string; in: string; required?: boolean }[];
  requestBody?: unknown;
  responses: Record<
    string,
    {
      headers?: Record<string, unknown>;
      content?: Record<
        string,
        { examples?: Record<string, { value: { error: string } }> }
      >;
    }
  >;
};

describe('API documentation (Swagger)', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, TransactionsController],
      providers: [
        // Only the routes and their metadata matter here.
        { provide: RegisterUserUseCase, useValue: {} },
        { provide: LoginUserUseCase, useValue: {} },
        { provide: CreateTransactionUseCase, useValue: {} },
        { provide: GetTransactionHistoryUseCase, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    document = buildSwaggerDocument(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const operation = (path: string, method: 'get' | 'post') =>
    (document.paths[path] as Record<string, Operation>)[method];

  const errorCodes = (op: Operation, status: string) =>
    Object.keys(
      op.responses[status]?.content?.['application/json']?.examples ?? {},
    );

  it('documents every endpoint of the statement under /v1', () => {
    expect(Object.keys(document.paths).sort()).toEqual([
      '/v1/auth/login',
      '/v1/auth/register',
      '/v1/transactions',
      '/v1/transactions/history',
    ]);
  });

  it('declares the bearer token for transactions but not for auth', () => {
    expect(document.components?.securitySchemes?.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
    expect(operation('/v1/transactions', 'post').security).toEqual([
      { bearer: [] },
    ]);
    expect(operation('/v1/transactions/history', 'get').security).toEqual([
      { bearer: [] },
    ]);
    expect(operation('/v1/auth/login', 'post').security).toBeUndefined();
  });

  it('describes the response fields with the names of the statement', () => {
    const propertiesOf = (name: string) =>
      Object.keys(
        (
          document.components?.schemas?.[name] as
            { properties?: Record<string, unknown> } | undefined
        )?.properties ?? {},
      );

    expect(propertiesOf('LoginResponse')).toEqual(['access_token', 'usuario']);
    expect(propertiesOf('UserResponse')).toEqual([
      'id',
      'nombre',
      'email',
      'rol',
    ]);
    expect(propertiesOf('TransactionResponse')).toEqual([
      'id',
      'monedaOrigen',
      'monedaDestino',
      'monto',
      'montoCambiado',
      'tipoCambio',
      'fecha',
    ]);
    expect(propertiesOf('CreateTransactionDto')).toEqual([
      'monedaOrigen',
      'monedaDestino',
      'monto',
    ]);
  });

  it('documents the history filters, with both dates required', () => {
    const params =
      operation('/v1/transactions/history', 'get').parameters ?? [];

    expect(params.map(({ name, required }) => ({ name, required }))).toEqual(
      expect.arrayContaining([
        { name: 'startDate', required: true },
        { name: 'endDate', required: true },
        { name: 'userId', required: false },
        { name: 'page', required: false },
        { name: 'limit', required: false },
      ]),
    );
    expect(
      operation('/v1/transactions/history', 'get').responses['200'].headers,
    ).toHaveProperty('X-Total-Count');
  });

  it('documents the business errors with examples in the unified format', () => {
    const create = operation('/v1/transactions', 'post');

    expect(errorCodes(create, '400')).toEqual([
      'VALIDATION_ERROR',
      'SAME_CURRENCY',
      'INVALID_AMOUNT',
    ]);
    expect(errorCodes(create, '401')).toEqual([
      'MISSING_ACCESS_TOKEN',
      'INVALID_ACCESS_TOKEN',
    ]);
    expect(errorCodes(create, '503')).toEqual(['EXCHANGE_RATE_NOT_AVAILABLE']);
    expect(errorCodes(operation('/v1/auth/register', 'post'), '409')).toEqual([
      'EMAIL_ALREADY_REGISTERED',
    ]);
    expect(errorCodes(operation('/v1/auth/login', 'post'), '401')).toEqual([
      'INVALID_CREDENTIALS',
    ]);
  });
});
