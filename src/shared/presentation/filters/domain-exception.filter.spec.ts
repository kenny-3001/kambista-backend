import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { DomainError, DomainErrorType } from '../../domain/domain-error';
import { DomainExceptionFilter } from './domain-exception.filter';

class SampleConflictError extends DomainError {
  readonly code = 'SAMPLE_CONFLICT';
  readonly type = DomainErrorType.CONFLICT;

  constructor() {
    super('Conflicto de ejemplo');
  }
}

describe('DomainExceptionFilter', () => {
  it('maps the error category to its HTTP status and exposes code and message', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    new DomainExceptionFilter().catch(new SampleConflictError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      error: 'SAMPLE_CONFLICT',
      message: 'Conflicto de ejemplo',
    });
  });
});
