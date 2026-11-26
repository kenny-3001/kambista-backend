import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiErrorBody } from '../errors/api-error';
import { ApiErrorResponse } from './api-error.response';

/**
 * Documents the errors an endpoint can answer, grouped by status, with one
 * named example per error code.
 */
export function ApiErrors(...examples: ApiErrorBody[]): MethodDecorator {
  const byStatus = new Map<number, ApiErrorBody[]>();
  for (const example of examples) {
    byStatus.set(example.statusCode, [
      ...(byStatus.get(example.statusCode) ?? []),
      example,
    ]);
  }

  return applyDecorators(
    ...[...byStatus].map(([status, group]) =>
      ApiResponse({
        status,
        description: group.map((e) => e.error).join(', '),
        type: ApiErrorResponse,
        examples: Object.fromEntries(
          group.map((e) => [e.error, { summary: e.message, value: e }]),
        ),
      }),
    ),
  );
}

/** Errors shared by every endpoint that requires a token. */
export const AUTH_ERRORS: ApiErrorBody[] = [
  {
    statusCode: 401,
    error: 'MISSING_ACCESS_TOKEN',
    message: 'Se requiere un token de acceso (Authorization: Bearer <token>)',
  },
  {
    statusCode: 401,
    error: 'INVALID_ACCESS_TOKEN',
    message: 'El token de acceso es inválido o ha expirado',
  },
];
