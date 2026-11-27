import { Logger, LoggerService } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { LogFormat } from '../../infrastructure/logging/app-logger';

export const REQUEST_ID_HEADER = 'X-Request-Id';

/**
 * A request id sent by a proxy or the client is kept only if it is short
 * and plain: it ends up in the logs, which must not be forgeable.
 */
const VALID_REQUEST_ID = /^[\w-]{1,64}$/;

interface TrackedRequest extends Request {
  requestId?: string;
  /** Set by the JWT guard on authenticated routes. */
  user?: { id: string };
}

/** The id given to this request by requestLogging, if any. */
export function requestIdOf(request: Request): string | undefined {
  return (request as TrackedRequest).requestId;
}

export interface RequestLogEntry {
  requestId: string;
  method: string;
  /** Without the query string. */
  path: string;
  /** Left out when the client left before any answer was sent. */
  status?: number;
  durationMs: number;
  userId?: string;
  /** The client closed the connection before the answer was complete. */
  aborted?: true;
}

/**
 * Gives every request an id (answered in X-Request-Id, so a user can report
 * it) and logs one line per request once answered. Only metadata: never
 * bodies, headers or tokens, which may carry passwords and credentials.
 */
export function requestLogging(
  format: LogFormat,
  logger: LoggerService = new Logger('HTTP'),
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const incoming = req.get(REQUEST_ID_HEADER);
    const requestId =
      incoming && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    (req as TrackedRequest).requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    const startedAt = performance.now();

    // 'close' comes in every case, also when the client gives up before
    // the answer ('finish' would never come then).
    res.once('close', () => {
      const aborted = !res.writableFinished;
      const entry: RequestLogEntry = {
        requestId,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: aborted && !res.headersSent ? undefined : res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
        userId: (req as TrackedRequest).user?.id,
        ...(aborted ? { aborted: true as const } : {}),
      };
      const message = format === 'json' ? entry : describe(entry);
      if (entry.status !== undefined && entry.status >= 500) {
        logger.error(message);
      } else if (aborted) {
        logger.warn(message);
      } else {
        logger.log(message);
      }
    });
    next();
  };
}

/** "GET /v1/transactions/history 200 12ms user=… id=…" */
function describe(entry: RequestLogEntry): string {
  const outcome = [entry.status, entry.aborted ? 'aborted' : undefined].filter(
    (part) => part !== undefined,
  );
  const user = entry.userId ? ` user=${entry.userId}` : '';
  return `${entry.method} ${entry.path} ${outcome.join(' ')} ${entry.durationMs}ms${user} id=${entry.requestId}`;
}
