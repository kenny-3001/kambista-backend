/** One invalid field of a request. */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * The single shape of every error answered by the API, whatever its origin
 * (business rule, validation, malformed request or unexpected failure).
 */
export interface ApiErrorBody {
  statusCode: number;
  /** Stable machine-readable code, e.g. SAME_CURRENCY or VALIDATION_ERROR. */
  error: string;
  /** Human-readable explanation in Spanish, ready to show to the user. */
  message: string;
  /** Only for validation errors: what is wrong with each field. */
  details?: FieldError[];
}
