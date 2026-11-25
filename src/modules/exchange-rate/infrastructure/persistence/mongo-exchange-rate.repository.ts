import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExchangeRate } from '../../domain/exchange-rate';
import { ExchangeRateRepository } from '../../domain/exchange-rate.repository';
import { ExchangeRateMapper } from './exchange-rate.mapper';
import { ExchangeRateDocument } from './exchange-rate.schema';

@Injectable()
export class MongoExchangeRateRepository extends ExchangeRateRepository {
  constructor(
    @InjectModel(ExchangeRateDocument.name)
    private readonly rateModel: Model<ExchangeRateDocument>,
  ) {
    super();
  }

  async save(rate: ExchangeRate): Promise<void> {
    await this.rateModel.create(ExchangeRateMapper.toPersistence(rate));
  }

  async findLatest(): Promise<ExchangeRate | null> {
    const document = await this.rateModel
      .findOne()
      .sort({ fetchedAt: -1 })
      .lean<ExchangeRateDocument>()
      .exec();
    return document ? ExchangeRateMapper.toDomain(document) : null;
  }
}
