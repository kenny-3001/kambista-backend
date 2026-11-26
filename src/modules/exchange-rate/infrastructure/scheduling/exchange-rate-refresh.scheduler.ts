import {
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { RefreshExchangeRateUseCase } from '../../application/use-cases/refresh-exchange-rate.use-case';

/**
 * Refreshes the exchange rate as soon as the app starts and then on a fixed
 * interval. A failed refresh never crashes the app: the last stored rate
 * simply remains the current one until the next successful attempt.
 */
export class ExchangeRateRefreshScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger('ExchangeRate');
  private timer?: NodeJS.Timeout;
  private refreshing = false;
  private lastQuote?: string;

  constructor(
    private readonly refreshExchangeRate: RefreshExchangeRateUseCase,
    private readonly intervalMs: number,
  ) {}

  onApplicationBootstrap(): void {
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), this.intervalMs);
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }

  async refresh(): Promise<void> {
    // Skip a tick if the previous request is still in flight.
    if (this.refreshing) {
      return;
    }
    this.refreshing = true;

    try {
      const rate = await this.refreshExchangeRate.execute();
      const quote = `compra ${rate.buy} / venta ${rate.sell} (${rate.date})`;
      if (quote !== this.lastQuote) {
        this.logger.log(`Tipo de cambio actualizado: ${quote}`);
        this.lastQuote = quote;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      // Accurate both before the first rate exists and after: the cache
      // keeps serving whatever was last stored, if anything.
      this.logger.warn(
        `${reason}. Se reintentará en ${this.intervalMs / 1000} s; mientras tanto se usa el último tipo de cambio guardado, si existe.`,
      );
    } finally {
      this.refreshing = false;
    }
  }
}
