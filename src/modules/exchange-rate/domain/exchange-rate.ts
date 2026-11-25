import { randomUUID } from 'node:crypto';
import { InvalidExchangeRateError } from './errors/invalid-exchange-rate.error';

export interface ExchangeRateProps {
  id: string;
  /** Price at which USD is bought (`compra`). */
  buy: number;
  /** Price at which USD is sold (`venta`). */
  sell: number;
  /** Foreign currency quoted against PEN. */
  currency: string;
  /** Who published the rate, e.g. SUNAT. */
  source: string;
  /** Business date of the rate as published (YYYY-MM-DD). */
  date: string;
  /** When this rate was obtained from the provider. */
  fetchedAt: Date;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ExchangeRate {
  private constructor(private readonly props: ExchangeRateProps) {}

  static create(params: Omit<ExchangeRateProps, 'id'>): ExchangeRate {
    const { buy, sell, currency, date } = params;

    if (!Number.isFinite(buy) || buy <= 0) {
      throw new InvalidExchangeRateError('la compra debe ser mayor a cero');
    }
    if (!Number.isFinite(sell) || sell <= 0) {
      throw new InvalidExchangeRateError('la venta debe ser mayor a cero');
    }
    if (sell < buy) {
      throw new InvalidExchangeRateError(
        'la venta no puede ser menor que la compra',
      );
    }
    if (currency !== 'USD') {
      throw new InvalidExchangeRateError(`moneda no soportada (${currency})`);
    }
    if (!DATE_PATTERN.test(date)) {
      throw new InvalidExchangeRateError(
        `fecha con formato inválido (${date})`,
      );
    }

    return new ExchangeRate({ id: randomUUID(), ...params });
  }

  static restore(props: ExchangeRateProps): ExchangeRate {
    return new ExchangeRate(props);
  }

  get id(): string {
    return this.props.id;
  }

  get buy(): number {
    return this.props.buy;
  }

  get sell(): number {
    return this.props.sell;
  }

  get currency(): string {
    return this.props.currency;
  }

  get source(): string {
    return this.props.source;
  }

  get date(): string {
    return this.props.date;
  }

  get fetchedAt(): Date {
    return this.props.fetchedAt;
  }
}
