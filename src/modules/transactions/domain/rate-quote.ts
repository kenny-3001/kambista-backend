/**
 * The prices needed to exchange USD and PEN, as seen by this module. It is a
 * plain shape so the transactions domain does not depend on how the
 * exchange-rate module models its rates.
 */
export interface RateQuote {
  /** Price at which USD is bought (`compra`). */
  buy: number;
  /** Price at which USD is sold (`venta`). */
  sell: number;
}
