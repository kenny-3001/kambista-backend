import { TooManyLoginAttemptsError } from './too-many-login-attempts.error';

describe('TooManyLoginAttemptsError', () => {
  it.each([
    [900, 'Demasiados intentos fallidos. Intenta nuevamente en 15 minutos.'],
    [61, 'Demasiados intentos fallidos. Intenta nuevamente en 2 minutos.'],
    [60, 'Demasiados intentos fallidos. Intenta nuevamente en 1 minuto.'],
    [5, 'Demasiados intentos fallidos. Intenta nuevamente en 1 minuto.'],
  ])('rounds %i seconds up to whole minutes', (seconds, message) => {
    const error = new TooManyLoginAttemptsError(seconds);

    expect(error.message).toBe(message);
    expect(error.retryAfterSeconds).toBe(seconds);
    expect(error.code).toBe('TOO_MANY_LOGIN_ATTEMPTS');
  });
});
