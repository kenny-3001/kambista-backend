import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/application/authenticated-user';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { CreateTransactionUseCase } from '../application/use-cases/create-transaction.use-case';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import {
  toTransactionResponse,
  TransactionResponse,
} from './transaction.response';

// Protected by the global JWT guard: any authenticated user or admin.
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly createTransaction: CreateTransactionUseCase) {}

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
}
