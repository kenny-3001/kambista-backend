import { describeStartupError } from './describe-startup-error';

describe('describeStartupError', () => {
  it('suggests starting MongoDB when it is unreachable', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:27017');
    error.name = 'MongooseServerSelectionError';

    expect(describeStartupError(error)).toBe(
      'No se pudo conectar a MongoDB (connect ECONNREFUSED 127.0.0.1:27017). ¿Está levantado? Ejecuta: docker compose up -d',
    );
  });

  it('explains a port that is already in use', () => {
    const error = Object.assign(new Error('listen EADDRINUSE :::3000'), {
      code: 'EADDRINUSE',
    });

    expect(describeStartupError(error)).toContain(
      'El puerto ya está en uso (listen EADDRINUSE :::3000)',
    );
  });

  it.each([
    [new Error('Config validation error'), 'Config validation error'],
    ['plain failure', 'plain failure'],
    [null, 'null'],
  ])('reports any other failure with its message', (error, message) => {
    expect(describeStartupError(error)).toBe(`No se pudo iniciar: ${message}`);
  });
});
