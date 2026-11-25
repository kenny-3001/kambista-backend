import { IsDefined, IsIn, IsNumber, IsPositive, Max } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../domain/currency';
import {
  AMOUNT_MAX,
  AMOUNT_MAX_DECIMALS,
  AMOUNT_MESSAGES,
} from '../../domain/value-objects/amount';

// class-validator runs decorators bottom-up and the pipe stops at the first
// error, so the most basic check (presence) sits closest to the property.
// The domain enforces the same rules; these give early, field-level errors.
export class CreateTransactionDto {
  @IsIn(SUPPORTED_CURRENCIES, {
    message: 'La moneda de origen debe ser USD o PEN',
  })
  @IsDefined({ message: 'La moneda de origen es obligatoria' })
  monedaOrigen!: string;

  @IsIn(SUPPORTED_CURRENCIES, {
    message: 'La moneda de destino debe ser USD o PEN',
  })
  @IsDefined({ message: 'La moneda de destino es obligatoria' })
  monedaDestino!: string;

  @Max(AMOUNT_MAX, { message: AMOUNT_MESSAGES.tooLarge })
  @IsNumber(
    { maxDecimalPlaces: AMOUNT_MAX_DECIMALS },
    { message: AMOUNT_MESSAGES.tooManyDecimals },
  )
  @IsPositive({ message: AMOUNT_MESSAGES.notPositive })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: AMOUNT_MESSAGES.notANumber },
  )
  @IsDefined({ message: 'El monto es obligatorio' })
  monto!: number;
}
