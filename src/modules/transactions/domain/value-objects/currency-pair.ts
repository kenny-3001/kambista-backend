import Decimal from 'decimal.js';
import { Currency, parseCurrency } from '../currency';
import { InvalidAmountError } from '../errors/invalid-amount.error';
import { SameCurrencyError } from '../errors/same-currency.error';
import { RateQuote } from '../rate-quote';
import { AMOUNT_MAX_DECIMALS, Amount } from './amount';

export interface Conversion {
  convertedAmount: number;
  /** The price actually applied: `venta` or `compra`. */
  appliedRate: number;
}

/** Direction of an exchange: what the customer sends and what they receive. */
export class CurrencyPair {
  private constructor(
    readonly source: Currency,
    readonly target: Currency,
  ) {}

  static of(source: string, target: string): CurrencyPair {
    const pair = new CurrencyPair(parseCurrency(source), parseCurrency(target));
    if (pair.source === pair.target) {
      throw new SameCurrencyError();
    }
    return pair;
  }

  /**
   * USD → PEN: the customer sells dollars, so `monto * venta`.
   * PEN → USD: the customer buys dollars, so `monto / compra`.
   * Computed with decimal arithmetic and rounded half-up to cents.
   */
  convert(amount: Amount, quote: RateQuote): Conversion {
    const sendsDollars = this.source === Currency.USD;
    const appliedRate = sendsDollars ? quote.sell : quote.buy;
    const exact = sendsDollars
      ? new Decimal(amount.value).times(appliedRate)
      : new Decimal(amount.value).dividedBy(appliedRate);

    const convertedAmount = exact
      .toDecimalPlaces(AMOUNT_MAX_DECIMALS, Decimal.ROUND_HALF_UP)
      .toNumber();
    if (convertedAmount <= 0) {
      throw new InvalidAmountError(
        'El monto es demasiado pequeño para realizar el cambio',
      );
    }

    return { convertedAmount, appliedRate };
  }
}
