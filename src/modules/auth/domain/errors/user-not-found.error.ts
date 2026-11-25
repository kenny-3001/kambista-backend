import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class UserNotFoundError extends DomainError {
  readonly code = 'USER_NOT_FOUND';
  readonly type = DomainErrorType.NOT_FOUND;

  constructor() {
    super('El usuario no existe');
  }
}
