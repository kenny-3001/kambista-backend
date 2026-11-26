import { InvalidHistoryPeriodError } from '../errors/invalid-history-period.error';
import { HISTORY_DATE_MESSAGES, HistoryPeriod } from './history-period';

describe('HistoryPeriod', () => {
  it('covers whole days in Peru time (UTC-5), both ends included', () => {
    const period = HistoryPeriod.of('2024-01-18', '2024-01-20');

    // 2024-01-18 00:00 in Lima is 05:00 UTC.
    expect(period.from).toEqual(new Date('2024-01-18T05:00:00.000Z'));
    // Up to, but excluding, 2024-01-21 00:00 in Lima.
    expect(period.until).toEqual(new Date('2024-01-21T05:00:00.000Z'));
  });

  it('accepts a single day', () => {
    const period = HistoryPeriod.of('2024-01-18', '2024-01-18');

    expect(period.until.getTime() - period.from.getTime()).toBe(
      24 * 60 * 60 * 1000,
    );
  });

  it('crosses month and year boundaries, including leap days', () => {
    expect(HistoryPeriod.of('2023-12-31', '2024-02-29').until).toEqual(
      new Date('2024-03-01T05:00:00.000Z'),
    );
  });

  it('rejects a start date after the end date', () => {
    expect(() => HistoryPeriod.of('2024-01-20', '2024-01-18')).toThrow(
      new InvalidHistoryPeriodError(HISTORY_DATE_MESSAGES.reversed),
    );
  });

  it.each([
    ['a day that does not exist', '2024-02-30'],
    ['February 29 outside a leap year', '2023-02-29'],
    ['month 13', '2024-13-01'],
    ['day zero', '2024-01-00'],
    ['a date with time', '2024-01-18T10:00:00Z'],
    ['another format', '18/01/2024'],
    ['an empty value', ''],
  ])('rejects %s as start date', (_label, value) => {
    expect(() => HistoryPeriod.of(value, '2024-12-31')).toThrow(
      new InvalidHistoryPeriodError(HISTORY_DATE_MESSAGES.invalidStart),
    );
  });

  it('reports an invalid end date as such', () => {
    expect(() => HistoryPeriod.of('2024-01-01', '2024-02-30')).toThrow(
      new InvalidHistoryPeriodError(HISTORY_DATE_MESSAGES.invalidEnd),
    );
  });
});
