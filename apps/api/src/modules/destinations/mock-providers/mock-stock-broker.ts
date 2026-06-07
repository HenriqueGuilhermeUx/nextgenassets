// ============================================
//  MOCK STOCK BROKER
// ============================================
// Simula uma corretora de ações com portfólio virtual.
// Preços REAIS via Yahoo Finance (grátis, sem auth).
// Execuções são simuladas com latência e falhas ocasionais.

import { Injectable, Logger } from '@nestjs/common';
import {
  DestinationAdapter,
  DestinationAction,
  ExecutionResult,
  ExecutionStatusResult,
  ValidationResult,
  CancelResult,
  ReconciliationResult
} from '../destination.interface';

@Injectable()
export class MockStockBroker implements DestinationAdapter {
  readonly type = 'STOCK_BROKER' as const;
  readonly adapterName = 'MOCK_STOCK_BROKER';

  // Portfólios virtuais (em produção seria persistido no Redis)
  private portfolios = new Map<string, Map<string, { quantity: number; avgPrice: number }>>();
  private executions = new Map<string, { action: DestinationAction; status: string; result: any }>();

  private readonly logger = new Logger(MockStockBroker.name);

  // Probabilidade de falha simulada (5%)
  private readonly FAILURE_RATE = 0.05;

  async validateUser(externalUserId: string): Promise<ValidationResult> {
    return { isValid: true };
  }

  async execute(action: DestinationAction): Promise<ExecutionResult> {
    this.logger.log(`[${action.userId}] Executing ${action.type}`);

    if (action.type !== 'BUY_STOCK' && action.type !== 'SELL_STOCK') {
      return {
        status: 'FAILED',
        errorCode: 'UNSUPPORTED_ACTION',
        errorMessage: `Action ${action.type} not supported by stock broker`,
        retryable: false
      };
    }

    // Latência simulada (50-500ms)
    await this.sleep(50 + Math.random() * 450);

    // Falha ocasional (5%)
    if (Math.random() < this.FAILURE_RATE) {
      return {
        status: 'FAILED',
        errorCode: 'BROKER_REJECTED',
        errorMessage: 'Ordem rejeitada por saldo insuficiente na clearing (simulado)',
        retryable: true
      };
    }

    // BUY_STOCK
    if (action.type === 'BUY_STOCK') {
      const ticker = action.ticker;
      const price = await this.fetchRealPrice(ticker);
      const quantity = Math.floor(action.amountBrl / price);
      const totalCost = quantity * price;

      if (quantity === 0) {
        return {
          status: 'FAILED',
          errorCode: 'INSUFFICIENT_AMOUNT',
          errorMessage: `R$ ${action.amountBrl.toFixed(2)} não é suficiente pra comprar 1 ação de ${ticker} (R$ ${price.toFixed(2)})`,
          retryable: false
        };
      }

      // Atualiza portfólio virtual
      this.updatePortfolio(action.userId, ticker, quantity, price);

      const externalId = `MOCK-ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const result = {
        status: 'COMPLETED',
        externalId,
        details: {
          ticker,
          quantity,
          pricePerShare: price,
          totalBrl: totalCost,
          broker: 'Mock Broker',
          orderType: 'MARKET',
          executedAt: new Date().toISOString()
        }
      };

      this.executions.set(externalId, { action, status: 'COMPLETED', result });
      this.logger.log(`[${action.userId}] ✅ Comprou ${quantity}x ${ticker} @ R$ ${price.toFixed(2)} = R$ ${totalCost.toFixed(2)}`);
      return result;
    }

    // SELL_STOCK
    if (action.type === 'SELL_STOCK') {
      const ticker = action.ticker;
      const portfolio = this.portfolios.get(action.userId);
      const position = portfolio?.get(ticker);

      if (!position || position.quantity < action.quantity) {
        return {
          status: 'FAILED',
          errorCode: 'INSUFFICIENT_SHARES',
          errorMessage: `Usuário tem ${position?.quantity || 0} ações de ${ticker}, precisa de ${action.quantity}`,
          retryable: false
        };
      }

      const price = await this.fetchRealPrice(ticker);
      const totalBrl = action.quantity * price;

      // Atualiza portfólio
      position.quantity -= action.quantity;
      if (position.quantity === 0) portfolio.delete(ticker);

      const externalId = `MOCK-ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const result = {
        status: 'COMPLETED',
        externalId,
        details: {
          ticker,
          quantity: action.quantity,
          pricePerShare: price,
          totalBrl,
          broker: 'Mock Broker',
          orderType: 'MARKET',
          side: 'SELL',
          executedAt: new Date().toISOString()
        }
      };

      this.executions.set(externalId, { action, status: 'COMPLETED', result });
      this.logger.log(`[${action.userId}] ✅ Vendeu ${action.quantity}x ${ticker} @ R$ ${price.toFixed(2)} = R$ ${totalBrl.toFixed(2)}`);
      return result;
    }
  }

  async checkExecution(externalId: string): Promise<ExecutionStatusResult> {
    const exec = this.executions.get(externalId);
    if (!exec) {
      return { status: 'FAILED', errorCode: 'NOT_FOUND', errorMessage: 'Execução não encontrada' };
    }
    if (exec.status === 'COMPLETED') {
      return exec.result;
    }
    return { status: 'PENDING' };
  }

  async cancel(externalId: string): Promise<CancelResult> {
    const exec = this.executions.get(externalId);
    if (exec && exec.status === 'COMPLETED') {
      return { canceled: false, reason: 'Execução já completada' };
    }
    this.executions.delete(externalId);
    return { canceled: true };
  }

  async reconcile(externalUserId: string, since: Date): Promise<ReconciliationResult> {
    const userExecutions = Array.from(this.executions.entries())
      .filter(([_, exec]) => exec.action.userId === externalUserId)
      .filter(([_, exec]) => exec.status === 'COMPLETED')
      .map(([externalId, exec]) => ({
        externalId,
        type: exec.action.type,
        amountBrl: exec.result.details?.totalBrl,
        quantity: exec.result.details?.quantity,
        asset: exec.result.details?.ticker,
        executedAt: new Date(exec.result.details?.executedAt || Date.now())
      }));

    return { externalOperations: userExecutions };
  }

  // ========== Auxiliares ==========

  async getQuote(ticker: string): Promise<{ price: number; currency: string; timestamp: Date }> {
    const price = await this.fetchRealPrice(ticker);
    return { price, currency: 'BRL', timestamp: new Date() };
  }

  private async fetchRealPrice(ticker: string): Promise<number> {
    // Yahoo Finance API (gratuita, sem auth)
    const yahooTicker = ticker.endsWith('.SA') ? ticker : `${ticker}.SA`;
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=5d`
      );
      const data = await response.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price) return price;
    } catch (err) {
      this.logger.warn(`Yahoo Finance falhou pra ${ticker}, usando preço mock`);
    }

    // Fallback: preços mock realistas (B3)
    const mockPrices: Record<string, number> = {
      ITUB4: 33.50, PETR4: 38.20, VALE3: 62.40, BBAS3: 27.80,
      BBDC4: 14.20, ABEV3: 13.95, WEGE3: 38.10, MGLU3: 8.45,
      ITSA4: 9.85, SANB11: 27.30
    };
    return mockPrices[ticker] || 25.00;
  }

  private updatePortfolio(userId: string, ticker: string, quantity: number, price: number) {
    if (!this.portfolios.has(userId)) this.portfolios.set(userId, new Map());
    const portfolio = this.portfolios.get(userId);
    const existing = portfolio.get(ticker);
    if (existing) {
      const totalQty = existing.quantity + quantity;
      const avgPrice = (existing.quantity * existing.avgPrice + quantity * price) / totalQty;
      portfolio.set(ticker, { quantity: totalQty, avgPrice });
    } else {
      portfolio.set(ticker, { quantity, avgPrice: price });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
