import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Page, PageRequest } from '../../domain/pagination';
import { Transaction } from '../../domain/transaction';
import { TransactionRepository } from '../../domain/transaction.repository';
import { HistoryPeriod } from '../../domain/value-objects/history-period';
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

  async findHistory(
    userId: string,
    period: HistoryPeriod,
    page?: PageRequest,
  ): Promise<Page<Transaction>> {
    // Served by the { userId, createdAt } index.
    const filter = {
      userId,
      createdAt: { $gte: period.from, $lt: period.until },
    };

    let query = this.transactionModel
      .find(filter)
      // _id breaks ties so pages never overlap or skip items.
      .sort({ createdAt: -1, _id: -1 });
    if (page) {
      query = query.skip((page.page - 1) * page.limit).limit(page.limit);
    }

    const [documents, total] = await Promise.all([
      query.lean<TransactionDocument[]>().exec(),
      this.transactionModel.countDocuments(filter).exec(),
    ]);
    return {
      items: documents.map((document) => TransactionMapper.toDomain(document)),
      total,
    };
  }
}
