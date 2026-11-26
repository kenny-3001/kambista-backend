import {
  Body,
  Controller,
  Get,
  INestApplication,
  Logger,
  Post,
} from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { IsDefined, IsInt, IsString, Min } from 'class-validator';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DomainError, DomainErrorType } from '../../domain/domain-error';
import { createValidationPipe } from '../validation/create-validation-pipe';
import { ApiExceptionFilter } from './api-exception.filter';

class SampleConflictError extends DomainError {
  readonly code = 'SAMPLE_CONFLICT';
  readonly type = DomainErrorType.CONFLICT;

  constructor() {
    super('Conflicto de ejemplo');
  }
}

class SampleDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsDefined({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @Min(1, { message: 'La edad debe ser mayor a 0' })
  @IsInt({ message: 'La edad debe ser un número entero' })
  @IsDefined({ message: 'La edad es obligatoria' })
  edad!: number;
}

class SampleThrottledError extends DomainError {
  readonly code = 'SAMPLE_THROTTLED';
  readonly type = DomainErrorType.TOO_MANY_REQUESTS;
  readonly retryAfterSeconds = 90;

  constructor() {
    super('Espera un momento');
  }
}

@Controller('probe')
class ProbeController {
  @Get('conflict')
  conflict() {
    throw new SampleConflictError();
  }

  @Get('throttled')
  throttled() {
    throw new SampleThrottledError();
  }

  @Get('crash')
  crash() {
    throw new Error('database password is hunter2');
  }

  @Post('validate')
  validate(@Body() body: SampleDto) {
    return body;
  }
}

describe('ApiExceptionFilter (integration)', () => {
  let app: INestApplication<App>;
  let loggedError: jest.SpyInstance;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        { provide: APP_PIPE, useValue: createValidationPipe() },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    loggedError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());

  it('answers business rule errors with their own status, code and message', async () => {
    const res = await server().get('/probe/conflict').expect(409);

    expect(res.body).toEqual({
      statusCode: 409,
      error: 'SAMPLE_CONFLICT',
      message: 'Conflicto de ejemplo',
    });
  });

  it('answers throttling errors with 429 and a Retry-After header', async () => {
    const res = await server().get('/probe/throttled').expect(429);

    expect(res.headers['retry-after']).toBe('90');
    expect(res.body).toEqual({
      statusCode: 429,
      error: 'SAMPLE_THROTTLED',
      message: 'Espera un momento',
    });
  });

  it('sends no Retry-After header for other errors', async () => {
    const res = await server().get('/probe/conflict').expect(409);

    expect(res.headers['retry-after']).toBeUndefined();
  });

  it('answers validation errors with one message per invalid field', async () => {
    const res = await server()
      .post('/probe/validate')
      .send({ edad: 0 })
      .expect(400);

    expect(res.body).toEqual({
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: 'El nombre es obligatorio',
      details: [
        { field: 'nombre', message: 'El nombre es obligatorio' },
        { field: 'edad', message: 'La edad debe ser mayor a 0' },
      ],
    });
  });

  it('answers malformed JSON in Spanish', async () => {
    const res = await server()
      .post('/probe/validate')
      .set('Content-Type', 'application/json')
      .send('{"nombre":')
      .expect(400);

    expect(res.body).toEqual({
      statusCode: 400,
      error: 'INVALID_JSON',
      message: 'El cuerpo de la petición no es un JSON válido',
    });
  });

  it('answers unknown routes with 404', async () => {
    const res = await server().get('/nowhere').expect(404);

    expect(res.body).toEqual({
      statusCode: 404,
      error: 'ROUTE_NOT_FOUND',
      message: 'Ruta no encontrada',
    });
  });

  it('answers a body that is too large with 413', async () => {
    const res = await server()
      .post('/probe/validate')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ nombre: 'x'.repeat(200_000), edad: 1 }))
      .expect(413);

    expect(res.body).toMatchObject({ error: 'PAYLOAD_TOO_LARGE' });
  });

  it('answers an unsupported charset with 415 and its standard name', async () => {
    const res = await server()
      .post('/probe/validate')
      .set('Content-Type', 'application/json; charset=latin1')
      .send('{"nombre":"Ana","edad":1}')
      .expect(415);

    expect(res.body).toEqual({
      statusCode: 415,
      error: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'La petición no es válida',
    });
  });

  it('hides unexpected failures from the client but logs them', async () => {
    const res = await server().get('/probe/crash').expect(500);

    expect(res.body).toEqual({
      statusCode: 500,
      error: 'INTERNAL_ERROR',
      message: 'Ocurrió un error inesperado. Intenta nuevamente más tarde',
    });
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
    expect(loggedError).toHaveBeenCalledWith(
      'GET /probe/crash falló de forma inesperada',
      expect.stringContaining('database password is hunter2'),
    );
  });
});
