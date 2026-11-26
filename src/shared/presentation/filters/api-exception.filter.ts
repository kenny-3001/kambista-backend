import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError, DomainErrorType } from '../../domain/domain-error';
import { ApiErrorBody } from '../errors/api-error';
import { RequestValidationError } from '../validation/request-validation.error';

const STATUS_BY_TYPE: Record<DomainErrorType, HttpStatus> = {
  [DomainErrorType.VALIDATION]: HttpStatus.BAD_REQUEST,
  [DomainErrorType.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [DomainErrorType.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [DomainErrorType.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [DomainErrorType.CONFLICT]: HttpStatus.CONFLICT,
  [DomainErrorType.UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
};

/** Framework-level errors (not raised by our own code), by status. */
const FRAMEWORK_ERRORS: Partial<
  Record<HttpStatus, { error: string; message: string }>
> = {
  // Our code never throws BadRequestException (validation and business rules
  // have their own errors). Nest raises it for a body that is not valid JSON
  // (and for badly encoded path params, which this API does not have).
  [HttpStatus.BAD_REQUEST]: {
    error: 'INVALID_JSON',
    message: 'El cuerpo de la petición no es un JSON válido',
  },
  [HttpStatus.NOT_FOUND]: {
    error: 'ROUTE_NOT_FOUND',
    message: 'Ruta no encontrada',
  },
  [HttpStatus.PAYLOAD_TOO_LARGE]: {
    error: 'PAYLOAD_TOO_LARGE',
    message: 'El cuerpo de la petición es demasiado grande',
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Demasiadas solicitudes. Intenta nuevamente en unos momentos',
  },
};

const INTERNAL_ERROR: ApiErrorBody = {
  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  error: 'INTERNAL_ERROR',
  message: 'Ocurrió un error inesperado. Intenta nuevamente más tarde',
};

/**
 * Client errors raised by Express' body parser that Nest does not wrap, such
 * as a body above the size limit (413) or an unsupported charset (415). They
 * come from the "http-errors" library, which marks them with `expose`.
 */
interface ExposedHttpError {
  status: number;
  expose: true;
}

function isExposedHttpError(error: unknown): error is ExposedHttpError {
  const candidate = error as Partial<ExposedHttpError> | null;
  return typeof candidate?.status === 'number' && candidate.expose === true;
}

/**
 * Turns every error into the same `ApiErrorBody` shape. Business rules keep
 * their own code and message; anything unexpected is logged with its stack
 * and answered with a generic 500, so internals never reach the client.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const body = this.toBody(exception, http.getRequest<Request>());
    http.getResponse<Response>().status(body.statusCode).json(body);
  }

  private toBody(exception: unknown, request: Request): ApiErrorBody {
    if (exception instanceof DomainError) {
      return {
        statusCode: STATUS_BY_TYPE[exception.type],
        error: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof RequestValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'VALIDATION_ERROR',
        message: exception.message,
        details: exception.details,
      };
    }

    if (isExposedHttpError(exception)) {
      return this.fromStatus(exception.status);
    }

    if (exception instanceof HttpException) {
      return this.fromStatus(exception.getStatus());
    }

    this.logger.error(
      `${request.method} ${request.url} falló de forma inesperada`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    return INTERNAL_ERROR;
  }

  private fromStatus(statusCode: number): ApiErrorBody {
    if (statusCode >= 500) {
      return INTERNAL_ERROR;
    }
    const known = FRAMEWORK_ERRORS[statusCode as HttpStatus];
    // Standard name of the status, e.g. 415 → UNSUPPORTED_MEDIA_TYPE. The
    // enum lookup is undefined at runtime for codes it does not list.
    const statusName: string | undefined = HttpStatus[statusCode];
    return {
      statusCode,
      error: known?.error ?? statusName ?? 'BAD_REQUEST',
      message: known?.message ?? 'La petición no es válida',
    };
  }
}
