import { ExchangeRateNotAvailableError } from '../../../exchange-rate/domain/errors/exchange-rate-not-available.error';
import { InvalidAmountError } from '../../domain/errors/invalid-amount.error';
import { SameCurrencyError } from '../../domain/errors/same-currency.error';
import { UnsupportedCurrencyError } from '../../domain/errors/unsupported-currency.error';
import { InMemoryTransactionRepository } from '../../testing/in-memory-transaction.repository';
import { StubCurrentRateQuote } from '../../testing/stub-current-rate-quote';
import { CreateTransactionUseCase } from './create-transaction.use-case';

describe('CreateTransactionUseCase', () => {
  const NOW = new Date('2024-01-18T15:00:00Z');
  let transactions: InMemoryTransactionRepository;
  let currentRate: StubCurrentRateQuote;
  let createTransaction: CreateTransactionUseCase;

  const command = {
    userId: 'user-1',
    sourceCurrency: 'USD',
    targetCurrency: 'PEN',
    amount: 100,
  };

  beforeEach(() => {
    transactions = new InMemoryTransactionRepository();
    currentRate = new StubCurrentRateQuote();
    createTransaction = new CreateTransactionUseCase(
      transactions,
      currentRate,
      () => NOW,
    );
  });

  it('exchanges at the current rate and stores the transaction for the caller', async () => {
    const transaction = await createTransaction.execute(command);

    expect(transaction).toMatchObject({
      userId: 'user-1',
      amount: 100,
      convertedAmount: 373.9,
      rate: 3.739,
      createdAt: NOW,
    });
    expect(transactions.transactions).toEqual([transaction]);
  });

  it('uses the rate in force at the moment of the request', async () => {
    currentRate.respondWith({ buy: 3.8, sell: 3.81 });

    const transaction = await createTransaction.execute({
      ...command,
      sourceCurrency: 'PEN',
      targetCurrency: 'USD',
      amount: 380,
    });

    expect(transaction.rate).toBe(3.8);
    expect(transaction.convertedAmount).toBe(100);
  });

  it('refuses to exchange when no rate has been registered', async () => {
    currentRate.withoutRate();

    await expect(createTransaction.execute(command)).rejects.toThrow(
      ExchangeRateNotAvailableError,
    );
    expect(transactions.transactions).toHaveLength(0);
  });

  it.each([
    [
      'the same currency on both sides',
      { targetCurrency: 'USD' },
      SameCurrencyError,
    ],
    [
      'an unsupported currency',
      { sourceCurrency: 'EUR' },
      UnsupportedCurrencyError,
    ],
    ['a zero amount', { amount: 0 }, InvalidAmountError],
    ['an amount with 3 decimals', { amount: 1.001 }, InvalidAmountError],
  ])(
    'rejects %s without looking up the rate or storing anything',
    async (_label, override, error) => {
      await expect(
        createTransaction.execute({ ...command, ...override }),
      ).rejects.toThrow(error);
      expect(currentRate.calls).toBe(0);
      expect(transactions.transactions).toHaveLength(0);
    },
  );
});
