import { Transaction } from '../domain/transaction';

/** Public shape of a transaction, with the field names of the API contract. */
export interface TransactionResponse {
  id: string;
  monedaOrigen: string;
  monedaDestino: string;
  monto: number;
  montoCambiado: number;
  tipoCambio: number;
  fecha: string;
}

export function toTransactionResponse(
  transaction: Transaction,
): TransactionResponse {
  return {
    id: transaction.id,
    monedaOrigen: transaction.sourceCurrency,
    monedaDestino: transaction.targetCurrency,
    monto: transaction.amount,
    montoCambiado: transaction.convertedAmount,
    tipoCambio: transaction.rate,
    fecha: transaction.createdAt.toISOString(),
  };
}
