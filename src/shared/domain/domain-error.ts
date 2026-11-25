export enum DomainErrorType {
  VALIDATION = 'validation',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  UNAVAILABLE = 'unavailable',
}

/**
 * Base class for business rule violations. Each error carries a stable
 * machine-readable code and a category that the presentation layer maps
 * to a transport-specific status, keeping the domain free of HTTP details.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly type: DomainErrorType;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
