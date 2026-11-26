import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  ApiErrors,
  AUTH_ERRORS,
} from '../../../shared/presentation/swagger/api-errors.decorator';
import type { AuthenticatedUser } from '../../auth/application/authenticated-user';
import { Role } from '../../auth/domain/role';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { CreateTransactionUseCase } from '../application/use-cases/create-transaction.use-case';
import { GetTransactionHistoryUseCase } from '../application/use-cases/get-transaction-history.use-case';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionHistoryQuery } from './dto/transaction-history.query';
import {
  toTransactionResponse,
  TransactionResponse,
} from './transaction.response';

export const TOTAL_COUNT_HEADER = 'X-Total-Count';

// Protected by the global JWT guard: any authenticated user or admin.
@ApiTags('Transacciones')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly getTransactionHistory: GetTransactionHistoryUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear una solicitud de cambio',
    description:
      'Convierte con el último tipo de cambio guardado: USD → PEN `monto × venta`, PEN → USD `monto ÷ compra`, redondeado a 2 decimales. La transacción queda a nombre del usuario del token.',
  })
  @ApiCreatedResponse({ type: TransactionResponse })
  @ApiErrors(
    {
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: 'El monto admite como máximo 2 decimales',
      details: [
        { field: 'monto', message: 'El monto admite como máximo 2 decimales' },
      ],
    },
    {
      statusCode: 400,
      error: 'SAME_CURRENCY',
      message: 'La moneda de origen y la de destino no pueden ser iguales',
    },
    {
      statusCode: 400,
      error: 'INVALID_AMOUNT',
      message: 'El monto es demasiado pequeño para realizar el cambio',
    },
    ...AUTH_ERRORS,
    {
      statusCode: 503,
      error: 'EXCHANGE_RATE_NOT_AVAILABLE',
      message:
        'No hay un tipo de cambio registrado todavía. Intenta nuevamente en unos segundos.',
    },
  )
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionResponse> {
    // The owner always comes from the token, never from the request body.
    const transaction = await this.createTransaction.execute({
      userId: user.id,
      sourceCurrency: dto.monedaOrigen,
      targetCurrency: dto.monedaDestino,
      amount: dto.monto,
    });
    return toTransactionResponse(transaction);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Consultar el historial por rango de fechas',
    description:
      'Devuelve las transacciones del rango, de la más reciente a la más antigua. El rol `user` siempre ve las suyas; el `admin` puede indicar `userId` para ver las de otro usuario.',
  })
  @ApiOkResponse({
    type: [TransactionResponse],
    headers: {
      [TOTAL_COUNT_HEADER]: {
        description: 'Total de transacciones del rango, en todas las páginas',
        schema: { type: 'integer', example: 42 },
      },
    },
  })
  @ApiErrors(
    {
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: 'La fecha de inicio (startDate) es obligatoria',
      details: [
        {
          field: 'startDate',
          message: 'La fecha de inicio (startDate) es obligatoria',
        },
      ],
    },
    {
      statusCode: 400,
      error: 'INVALID_HISTORY_PERIOD',
      message: 'La fecha de inicio no puede ser posterior a la fecha de fin',
    },
    ...AUTH_ERRORS,
  )
  async history(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TransactionHistoryQuery,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TransactionResponse[]> {
    const { items, total } = await this.getTransactionHistory.execute({
      requester: { id: user.id, isAdmin: user.role === Role.ADMIN },
      startDate: query.startDate,
      endDate: query.endDate,
      userId: query.userId,
      page: query.page,
      limit: query.limit,
    });

    // The body stays the plain array documented in the statement; the total
    // travels in a header so clients can paginate.
    response.setHeader(TOTAL_COUNT_HEADER, total);
    return items.map(toTransactionResponse);
  }
}
