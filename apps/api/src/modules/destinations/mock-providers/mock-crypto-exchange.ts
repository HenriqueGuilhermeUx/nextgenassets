// ============================================
//  MOCK CRYPTO EXCHANGE
// ============================================
// Simula exchange de cripto com preços REAIS via CoinGecko.

import { Injectable, Logger } from '@nestjs/common';
import {
  DestinationAdapter, DestinationAction, ExecutionResult, ExecutionStatusResult,
  ValidationResult, CancelResult, ReconciliationResult
} from '../destination.interface';

@Injectable()
export class MockCryptoExchange implements DestinationAdapter {
  readonly type = 'CRYPTO_EXCHANGE' as const;
  readonly adapterName = 'MOCK_CRYPTO_EXCHANGE';

  private readonly logger = new Logger(MockCryptoExchange.name);
  private readonly SPREAD = 0.005; // 0,5% de spread
  private readonly USD_TO_BRL = 5.10; // Câmbio fixo pra mock

  private wallets = new Map<string, Map<string, number>>(); // userId -> asset -> quantity
  private executions = new Map<string, any>();

  async validateUser(externalUserId: string): Promise<ValidationResult> {
    return { isValid: true };
  }

  async execute(action: DestinationAction): Promise<ExecutionResult> {
    this.logger.log(`[${action.userId}] Executing ${action.type}`);

    if (action.type !== 'BUY_CRYPTO' && action.type !== 'SELL_CRYPTO') {
      return {
        status: 'FAILED', errorCode: 'UNSUPPORTED_ACTION',
        errorMessage: `Action ${action.type} not supported`, retryable: false
      };
    }

    await new Promise(r => setTimeout(r, 100 + Math.random() * 300));

    if (action.type === 'BUY_CRYPTO') {
      const priceUsd = await this.fetchCryptoPrice(action.asset);
      const priceBrl = priceUsd * this.USD_TO_BRL;
      const effectivePrice = priceBrl * (1 + this.SPREAD);
      const quantity = action.amountBrl / effectivePrice;

      // Atualiza wallet
      if (!this.wallets.has(action.userId)) this.wallets.set(action.userId, new Map());
      const wallet = this.wallets.get(action.userId);
      wallet.set(action.asset, (wallet.get(action.asset) || 0) + quantity);

      const externalId = `MOCK-CRYPT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const result = {
        status: 'COMPLETED',
        externalId,
        details: {
          asset: action.asset,
          side: 'BUY',
          quantityTokens: quantity,
          pricePerTokenUsd: priceUsd,
          pricePerTokenBrl: effectivePrice,
          spreadAppliedPct: this.SPREAD * 100,
          totalBrl: action.amountBrl,
          exchange: 'Mock Crypto',
          executedAt: new Date().toISOString()
        }
      };

      this.executions.set(externalId, { action, status: 'COMPLETED', result });
      this.logger.log(`[${action.userId}] ✅ Comprou ${quantity.toFixed(6)} ${action.asset} por R$ ${action.amountBrl.toFixed(2)}`);
      return result;
    }

    if (action.type === 'SELL_CRYPTO') {
      const wallet = this.wallets.get(action.userId);
      const balance = wallet?.get(action.asset) || 0;
      if (balance < action.quantity) {
        return {
          status: 'FAILED', errorCode: 'INSUFFICIENT_BALANCE',
          errorMessage: `Wallet tem ${balance.toFixed(6)} ${action.asset}, precisa de ${action.quantity}`,
          retryable: false
        };
      }

      const priceUsd = await this.fetchCryptoPrice(action.asset);
      const priceBrl = priceUsd * this.USD_TO_BRL;
      const effectivePrice = priceBrl * (1 - this.SPREAD);
      const totalBrl = action.quantity * effectivePrice;

      wallet.set(action.asset, balance - action.quantity);

      const externalId = `MOCK-CRYPT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const result = {
        status: 'COMPLETED',
        externalId,
        details: {
          asset: action.asset,
          side: 'SELL',
          quantityTokens: action.quantity,
          pricePerTokenUsd: priceUsd,
          pricePerTokenBrl: effectivePrice,
          totalBrl,
          exchange: 'Mock Crypto',
          executedAt: new Date().toISOString()
        }
      };

      this.executions.set(externalId, { action, status: 'COMPLETED', result });
      this.logger.log(`[${action.userId}] ✅ Vendeu ${action.quantity} ${action.asset} por R$ ${totalBrl.toFixed(2)}`);
      return result;
    }
  }

  async checkExecution(externalId: string): Promise<ExecutionStatusResult> {
    const exec = this.executions.get(externalId);
    if (!exec) return { status: 'FAILED', errorCode: 'NOT_FOUND', errorMessage: 'Não encontrada' };
    return exec.result;
  }

  async cancel(externalId: string): Promise<CancelResult> {
    this.executions.delete(externalId);
    return { canceled: true };
  }

  async reconcile(externalUserId: string, since: Date): Promise<ReconciliationResult> {
    const userExecutions = Array.from(this.executions.entries())
      .filter(([_, exec]) => exec.action.userId === externalUserId)
      .map(([externalId, exec]) => ({
        externalId,
        type: exec.action.type,
        amountBrl: exec.result.details?.totalBrl,
        quantity: exec.result.details?.quantityTokens,
        asset: exec.result.details?.asset,
        executedAt: new Date(exec.result.details?.executedAt || Date.now())
      }));
    return { externalOperations: userExecutions };
  }

  async listSupportedAssets(): Promise<string[]> {
    return ['USDC', 'USDT', 'BTC', 'ETH', 'PAXG', 'USDY'];
  }

  async getQuote(asset: string) {
    const priceUsd = await this.fetchCryptoPrice(asset);
    return { price: priceUsd * this.USD_TO_BRL, currency: 'BRL', timestamp: new Date() };
  }

  private async fetchCryptoPrice(asset: string): Promise<number> {
    // Mapear símbolos pra IDs do CoinGecko
    const geckoIds: Record<string, string> = {
      USDC: 'usd-coin',
      USDT: 'tether',
      BTC: 'bitcoin',
      ETH: 'ethereum',
      PAXG: 'pax-gold',
      USDY: 'ondo-us-dollar-yield'
    };

    const geckoId = geckoIds[asset] || 'usd-coin';
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`
      );
      const data = await response.json();
      const price = data?.[geckoId]?.usd;
      if (price) return price;
    } catch (err) {
      this.logger.warn(`CoinGecko falhou pra ${asset}, usando preço mock`);
    }

    // Fallback mock
    const mockPrices: Record<string, number> = {
      USDC: 1.00, USDT: 1.00, BTC: 67000, ETH: 3500, PAXG: 2350, USDY: 1.05
    };
    return mockPrices[asset] || 1.00;
  }
}
