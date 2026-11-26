import { InvalidHistoryPeriodError } from '../errors/invalid-history-period.error';

/** Peru does not observe daylight saving time: it is always UTC-5. */
const PERU_UTC_OFFSET = '-05:00';
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const HISTORY_DATE_MESSAGES = {
  invalidStart: 'La fecha de inicio no es válida. Usa el formato AAAA-MM-DD',
  invalidEnd: 'La fecha de fin no es válida. Usa el formato AAAA-MM-DD',
  reversed: 'La fecha de inicio no puede ser posterior a la fecha de fin',
} as const;

/**
 * Range of calendar days chosen by the customer, read in Peru time and
 * with both ends included: 2024-01-18 → 2024-01-18 covers that whole day.
 */
export class HistoryPeriod {
  private constructor(
    /** First instant included. */
    readonly from: Date,
    /** First instant excluded (start of the day after `endDate`). */
    readonly until: Date,
  ) {}

  static of(startDate: string, endDate: string): HistoryPeriod {
    const from = startOfPeruDay(startDate, HISTORY_DATE_MESSAGES.invalidStart);
    const endDay = startOfPeruDay(endDate, HISTORY_DATE_MESSAGES.invalidEnd);
    if (from > endDay) {
      throw new InvalidHistoryPeriodError(HISTORY_DATE_MESSAGES.reversed);
    }
    return new HistoryPeriod(from, new Date(endDay.getTime() + ONE_DAY_MS));
  }
}

function startOfPeruDay(value: string, message: string): Date {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new InvalidHistoryPeriodError(message);
  }

  // Rejects dates that do not exist, such as 2024-02-30.
  const [year, month, day] = match.slice(1).map(Number);
  const calendarDay = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDay.getUTCFullYear() !== year ||
    calendarDay.getUTCMonth() !== month - 1 ||
    calendarDay.getUTCDate() !== day
  ) {
    throw new InvalidHistoryPeriodError(message);
  }

  return new Date(`${value}T00:00:00${PERU_UTC_OFFSET}`);
}
