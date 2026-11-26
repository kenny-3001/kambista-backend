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
import type { Response } from 'express';
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
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly getTransactionHistory: GetTransactionHistoryUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
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
