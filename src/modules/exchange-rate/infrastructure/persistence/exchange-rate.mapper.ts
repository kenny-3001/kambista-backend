import { ExchangeRate } from '../../domain/exchange-rate';
import { ExchangeRateDocument } from './exchange-rate.schema';

export const ExchangeRateMapper = {
  toDomain(document: ExchangeRateDocument): ExchangeRate {
    return ExchangeRate.restore({
      id: document._id,
      buy: document.buy,
      sell: document.sell,
      currency: document.currency,
      source: document.source,
      date: document.date,
      fetchedAt: document.fetchedAt,
    });
  },

  toPersistence(rate: ExchangeRate): ExchangeRateDocument {
    return {
      _id: rate.id,
      buy: rate.buy,
      sell: rate.sell,
      currency: rate.currency,
      source: rate.source,
      date: rate.date,
      fetchedAt: rate.fetchedAt,
    };
  },
};
