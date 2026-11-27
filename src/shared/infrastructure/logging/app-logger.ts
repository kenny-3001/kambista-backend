import { ConsoleLogger, LogLevel } from '@nestjs/common';

/** json: one JSON object per line, for log collectors; pretty: for a terminal. */
export const LOG_FORMATS = ['json', 'pretty'] as const;
export type LogFormat = (typeof LOG_FORMATS)[number];

/** From most to least important; a level includes the ones before it. */
const LEVELS_BY_IMPORTANCE: LogLevel[] = [
  'fatal',
  'error',
  'warn',
  'log',
  'debug',
  'verbose',
];

/** The levels LOG_LEVEL may name (fatal is always on). */
export const LOG_LEVEL_NAMES = ['error', 'warn', 'log', 'debug', 'verbose'];

/** 'warn' → fatal, error and warn. */
export function logLevelsUpTo(level: LogLevel): LogLevel[] {
  return LEVELS_BY_IMPORTANCE.slice(0, LEVELS_BY_IMPORTANCE.indexOf(level) + 1);
}

export function createAppLogger(
  format: LogFormat,
  level: LogLevel,
): ConsoleLogger {
  return new ConsoleLogger({
    json: format === 'json',
    logLevels: logLevelsUpTo(level),
  });
}
