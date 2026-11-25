import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from '../../domain/transaction';
import { TransactionRepository } from '../../domain/transaction.repository';
import { TransactionMapper } from './transaction.mapper';
import { TransactionDocument } from './transaction.schema';

@Injectable()
export class MongoTransactionRepository extends TransactionRepository {
  constructor(
    @InjectModel(TransactionDocument.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {
    super();
  }

  async save(transaction: Transaction): Promise<void> {
    await this.transactionModel.create(
      TransactionMapper.toPersistence(transaction),
    );
  }
}
