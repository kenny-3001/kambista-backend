import { ApiProperty } from '@nestjs/swagger';
import { ExchangeRate } from '../domain/exchange-rate';

/**
 * Public shape of the rate in force. Uses the field names of the provider
 * shown in the statement, plus the moment it was obtained.
 */
export class ExchangeRateResponse {
  @ApiProperty({
    description: 'Precio de compra; se usa para PEN → USD',
    example: 3.733,
  })
  compra!: number;

  @ApiProperty({
    description: 'Precio de venta; se usa para USD → PEN',
    example: 3.739,
  })
  venta!: number;

  @ApiProperty({ example: 'SUNAT' })
  origen!: string;

  @ApiProperty({ example: 'USD' })
  moneda!: string;

  @ApiProperty({
    format: 'date',
    description: 'Fecha del tipo de cambio publicada por SUNAT (AAAA-MM-DD)',
    example: '2024-01-18',
  })
  fecha!: string;

  @ApiProperty({
    description: 'Cuándo se obtuvo del proveedor (ISO 8601, UTC)',
    example: '2024-01-18T15:00:30.000Z',
  })
  actualizadoEn!: string;
}

export function toExchangeRateResponse(
  rate: ExchangeRate,
): ExchangeRateResponse {
  return {
    compra: rate.buy,
    venta: rate.sell,
    origen: rate.source,
    moneda: rate.currency,
    fecha: rate.date,
    actualizadoEn: rate.fetchedAt.toISOString(),
  };
}
