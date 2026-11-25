import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GetCurrentExchangeRateUseCase } from '../exchange-rate/application/use-cases/get-current-exchange-rate.use-case';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module';
import { CurrentRateQuote } from './application/ports/current-rate-quote';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { TransactionRepository } from './domain/transaction.repository';
import { ExchangeRateModuleRateQuote } from './infrastructure/exchange-rate/exchange-rate-module.rate-quote';
import { MongoTransactionRepository } from './infrastructure/persistence/mongo-transaction.repository';
import {
  TransactionDocument,
  TransactionSchema,
} from './infrastructure/persistence/transaction.schema';
import { TransactionsController } from './presentation/transactions.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TransactionDocument.name, schema: TransactionSchema },
    ]),
    ExchangeRateModule,
  ],
  controllers: [TransactionsController],
  providers: [
    { provide: TransactionRepository, useClass: MongoTransactionRepository },
    {
      provide: CurrentRateQuote,
      useFactory: (getCurrentRate: GetCurrentExchangeRateUseCase) =>
        new ExchangeRateModuleRateQuote(getCurrentRate),
      inject: [GetCurrentExchangeRateUseCase],
    },
    {
      provide: CreateTransactionUseCase,
      useFactory: (
        transactions: TransactionRepository,
        currentRate: CurrentRateQuote,
      ) => new CreateTransactionUseCase(transactions, currentRate),
      inject: [TransactionRepository, CurrentRateQuote],
    },
  ],
})
export class TransactionsModule {}
