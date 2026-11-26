import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '../domain/currency';
import { Transaction } from '../domain/transaction';

/** Public shape of a transaction, with the field names of the API contract. */
export class TransactionResponse {
  @ApiProperty({ example: '3b8e2f1a-7c4d-4a9e-b1f2-6d5c4b3a2e1f' })
  id!: string;

  @ApiProperty({ enum: Currency, example: Currency.USD })
  monedaOrigen!: string;

  @ApiProperty({ enum: Currency, example: Currency.PEN })
  monedaDestino!: string;

  @ApiProperty({ example: 100 })
  monto!: number;

  @ApiProperty({
    description: 'Monto que recibe el cliente, redondeado a 2 decimales',
    example: 373.9,
  })
  montoCambiado!: number;

  @ApiProperty({
    description:
      'Precio aplicado: `venta` para USD → PEN, `compra` para PEN → USD',
    example: 3.739,
  })
  tipoCambio!: number;

  @ApiProperty({
    description: 'Fecha y hora de la operación (ISO 8601, UTC)',
    example: '2024-01-18T15:00:00.000Z',
  })
  fecha!: string;
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
