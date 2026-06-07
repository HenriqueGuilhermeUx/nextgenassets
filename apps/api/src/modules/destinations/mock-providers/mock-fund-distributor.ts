// @ts-nocheck
// ============================================
//  MOCK FUND DISTRIBUTOR
// ============================================
// Simula uma distribuidora de fundos com NAVs e cotas.

import { Injectable, Logger } from '@nestjs/common';
import {
  DestinationAdapter, DestinationAction, ExecutionResult, ExecutionStatusResult,
  ValidationResult, CancelResult, ReconciliationResult
} from '../destination.interface';

@Injectable()
export class MockFundDistributor implements DestinationAdapter {
  readonly type = 'FUND_DISTRIBUTOR' as const;
  readonly adapterName = 'MOCK_FUND_DISTRIBUTOR';

  private readonly logger = new Logger(MockFundDistributor.name);

  // NAVs dos fundos (em produção viriam de arquivo CVM ou API)
  private fundNavs: Record<string, { nav: number; name: string; cnpj: string; yieldCdiaPct: number }> = {
    'XP_SELECTION':          { nav: 127.85, name: 'XP Selection Premium', cnpj: '11.123.456/0001-00', yieldCdiaPct: 105 },
    'BTG_PACTUAL_YIELD':     { nav: 18.42,  name: 'BTG Pactual Yield',    cnpj: '11.222.333/0001-11', yieldCdiaPct: 110 },
    'ITAU_PERSONALITE':      { nav: 32.10,  name: 'Itaú Personnalité',    cnpj: '11.333.444/0001-22', yieldCdiaPct: 102 },
    'BRADESCO_PREMIUM':      { nav: 24.78,  name: 'Bradesco Premium DI',  cnpj: '11.444.555/0001-33', yieldCdiaPct: 100 }
  };

  // Cotas virtuais por usuário
  private holdings = new Map<string, Map<string, { shares: number; totalInvested: number }>>();
  private executions = new Map<string, any>();

  async validateUser(externalUserId: string): Promise<ValidationResult> {
    return { isValid: true };
  }

  async execute(action: DestinationAction): Promise<ExecutionResult> {
    this.logger.log(`[${action.userId}] Executing ${action.type}`);

    if (action.type !== 'SUBSCRIBE_FUND' && action.type !== 'REDEEM_FUND') {
      return {
        status: 'FAILED', errorCode: 'UNSUPPORTED_ACTION',
        errorMessage: `Action ${action.type} not supported by fund distributor`, retryable: false
      };
    }

    // Latência simulada (200-800ms — fundos são mais lentos)
    await new Promise(r => setTimeout(r, 200 + Math.random() * 600));

    if (action.type === 'SUBSCRIBE_FUND') {
      const fund = this.fundNavs[action.fundId];
      if (!fund) {
        return {
          status: 'FAILED', errorCode: 'FUND_NOT_FOUND',
          errorMessage: `Fundo ${action.fundId} não encontrado`, retryable: false
        };
      }

      const shares = action.amountBrl / fund.nav;

      // Atualiza holdings
      if (!this.holdings.has(action.userId)) this.holdings.set(action.userId, new Map());
      const userHoldings = this.holdings.get(action.userId);
      const existing = userHoldings.get(action.fundId);
      if (existing) {
        existing.shares += shares;
        existing.totalInvested += action.amountBrl;
      } else {
        userHoldings.set(action.fundId, { shares, totalInvested: action.amountBrl });
      }

      const externalId = `MOCK-FUND-SUB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const result = {
        status: 'COMPLETED',
        externalId,
        details: {
          fundId: action.fundId,
          fundName: fund.name,
          fundCnpj: fund.cnpj,
          sharesAcquired: shares,
          navAtSubscription: fund.nav,
          amountBrl: action.amountBrl,
          grossYieldCdia: fund.yieldCdiaPct,
          settledAt: new Date().toISOString(),
          // Cota é D+1 em fundos reais — aqui é instantâneo
          settlementDays: 0
        }
      };

      this.executions.set(externalId, { action, status: 'COMPLETED', result });
      this.logger.log(`[${action.userId}] ✅ Subscreveu ${shares.toFixed(4)} cotas de ${fund.name}`);
      return result;
    }

    if (action.type === 'REDEEM_FUND') {
      const userHoldings = this.holdings.get(action.userId);
      const holding = userHoldings?.get(action.fundId);
      if (!holding) {
        return {
          status: 'FAILED', errorCode: 'NO_HOLDINGS',
          errorMessage: `Usuário não tem cotas do fundo ${action.fundId}`, retryable: false
        };
      }

      const fund = this.fundNavs[action.fundId];
      const sharesToRedeem = action.amountBrl / fund.nav;

      if (holding.shares < sharesToRedeem) {
        return {
          status: 'FAILED', errorCode: 'INSUFFICIENT_SHARES',
          errorMessage: `Usuário tem ${holding.shares.toFixed(4)} cotas, precisa de ${sharesToRedeem.toFixed(4)}`,
          retryable: false
        };
      }

      holding.shares -= sharesToRedeem;
      holding.totalInvested -= (sharesToRedeem * (holding.totalInvested / (holding.shares + sharesToRedeem)));

      const externalId = `MOCK-FUND-RED-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const result = {
        status: 'COMPLETED',
        externalId,
        details: {
          fundId: action.fundId,
          fundName: fund.name,
          sharesRedeemed: sharesToRedeem,
          navAtRedemption: fund.nav,
          amountBrl: action.amountBrl,
          // Resgate é D+5 em fundos reais — aqui é instantâneo
          settlementDays: 0,
          actualSettlementDate: new Date().toISOString()
        }
      };

      this.executions.set(externalId, { action, status: 'COMPLETED', result });
      this.logger.log(`[${action.userId}] ✅ Resgatou R$ ${action.amountBrl.toFixed(2)} de ${fund.name}`);
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
        amountBrl: exec.result.details?.amountBrl,
        asset: exec.result.details?.fundId,
        executedAt: new Date(exec.result.details?.settledAt || Date.now())
      }));

    return { externalOperations: userExecutions };
  }

  async listSupportedAssets(): Promise<string[]> {
    return Object.keys(this.fundNavs);
  }

  async getQuote(fundId: string) {
    const fund = this.fundNavs[fundId];
    return { price: fund.nav, currency: 'BRL', timestamp: new Date() };
  }
}
