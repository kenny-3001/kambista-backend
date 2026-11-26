import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiErrors,
  AUTH_ERRORS,
} from '../../../shared/presentation/swagger/api-errors.decorator';
import { GetCurrentExchangeRateUseCase } from '../application/use-cases/get-current-exchange-rate.use-case';
import {
  ExchangeRateResponse,
  toExchangeRateResponse,
} from './exchange-rate.response';

// Protected by the global JWT guard: any authenticated user or admin.
@ApiTags('Tipo de cambio')
@ApiBearerAuth()
@Controller('exchange-rate')
export class ExchangeRateController {
  constructor(private readonly getCurrentRate: GetCurrentExchangeRateUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Consultar el tipo de cambio vigente',
    description:
      'Devuelve el último tipo de cambio guardado, el mismo que se usará al crear una transacción. Se actualiza cada 30 segundos.',
  })
  @ApiOkResponse({ type: ExchangeRateResponse })
  @ApiErrors(...AUTH_ERRORS, {
    statusCode: 503,
    error: 'EXCHANGE_RATE_NOT_AVAILABLE',
    message:
      'No hay un tipo de cambio registrado todavía. Intenta nuevamente en unos segundos.',
  })
  async current(): Promise<ExchangeRateResponse> {
    return toExchangeRateResponse(await this.getCurrentRate.execute());
  }
}
