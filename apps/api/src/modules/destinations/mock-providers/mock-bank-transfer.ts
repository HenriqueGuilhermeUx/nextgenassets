// ============================================
//  MOCK BANK ACCOUNT (Open Finance Mock)
// ============================================
// Simula a conta bancária do consumidor + iniciação de Pix.

import { Injectable, Logger } from '@nestjs/common';
import {
  DestinationAdapter, DestinationAction, ExecutionResult, ExecutionStatusResult,
  ValidationResult, CancelResult, ReconciliationResult
} from '../destination.interface';

@Injectable()
export class MockBankTransfer implements DestinationAdapter {
  readonly type = 'BANK_ACCOUNT' as const;
  readonly adapterName = 'MOCK_BANK_ACCOUNT';

  private readonly logger = new Logger(MockBankTransfer.name);

  // Saldos virtuais por usuário
  private balances = new Map<string, { balance: number; bankName: string; account: string }>();
  private transactions: any[] = [];

  // Configura saldo inicial pra usuários demo
  constructor() {
    this.seedDemoBalances();
  }

  private seedDemoBalances() {
    const demoUsers = ['demo-user-1', 'demo-user-2', 'demo-user-3'];
    demoUsers.forEach((userId, i) => {
      this.balances.set(userId, {
        balance: 5000 + (i * 2000),  // R$ 5k, 7k, 9k
        bankName: 'Itaú',
        account: '0001-9 / 12345-6'
      });
    });
  }

  async validateUser(externalUserId: string): Promise<ValidationResult> {
    const account = this.balances.get(externalUserId);
    if (!account) {
      return { isValid: false, reason: 'Conta não encontrada no Open Finance' };
    }
    return { isValid: true };
  }

  async execute(action: DestinationAction): Promise<ExecutionResult> {
    this.logger.log(`[${action.userId}] Executing ${action.type}`);

    if (action.type !== 'TRANSFER') {
      return {
        status: 'FAILED', errorCode: 'UNSUPPORTED_ACTION',
        errorMessage: `Action ${action.type} not supported`, retryable: false
      };
    }

    // Latência simulada de Pix (1-3s)
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

    const account = this.balances.get(action.userId);
    if (!account) {
      return {
        status: 'FAILED', errorCode: 'ACCOUNT_NOT_FOUND',
        errorMessage: 'Conta não encontrada', retryable: false
      };
    }

    if (account.balance < action.amountBrl) {
      return {
        status: 'FAILED', errorCode: 'INSUFFICIENT_FUNDS',
        errorMessage: `Saldo insuficiente: R$ ${account.balance.toFixed(2)}, precisa R$ ${action.amountBrl.toFixed(2)}`,
        retryable: false
      };
    }

    // Debita
    account.balance -= action.amountBrl;

    // Registra transação
    const tx = {
      id: `MOCK-PIX-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      endToEndId: `E${Date.now()}${Math.random().toString(36).slice(2, 18).toUpperCase()}`,
      fromAccount: action.userId,
      toAccount: action.destinationAccount,
      amountBrl: action.amountBrl,
      newBalance: account.balance,
      bankName: account.bankName,
      executedAt: new Date().toISOString(),
      status: 'CONFIRMED'
    };
    this.transactions.push(tx);

    this.logger.log(`[${action.userId}] ✅ Pix de R$ ${action.amountBrl.toFixed(2)} → ${action.destinationAccount}. Saldo: R$ ${account.balance.toFixed(2)}`);

    return {
      status: 'COMPLETED',
      externalId: tx.id,
      details: {
        ...tx,
        pixEndToEndId: tx.endToEndId,
        isMock: true
      }
    };
  }

  async checkExecution(externalId: string): Promise<ExecutionStatusResult> {
    const tx = this.transactions.find(t => t.id === externalId);
    if (!tx) return { status: 'FAILED', errorCode: 'NOT_FOUND', errorMessage: 'Transação não encontrada' };
    return {
      status: 'COMPLETED',
      externalId: tx.id,
      details: tx
    };
  }

  async cancel(externalId: string): Promise<CancelResult> {
    return { canceled: false, reason: 'Pix já confirmado, não pode ser cancelado' };
  }

  async reconcile(externalUserId: string, since: Date): Promise<ReconciliationResult> {
    return { externalOperations: this.transactions.filter(t => t.fromAccount === externalUserId) };
  }

  // ========== Métodos auxiliares do mock ==========

  async getBalance(userId: string): Promise<{ balance: number; bankName: string; account: string } | null> {
    return this.balances.get(userId) || null;
  }

  async creditAccount(userId: string, amountBrl: number, source: string) {
    const account = this.balances.get(userId);
    if (!account) return null;
    account.balance += amountBrl;
    this.logger.log(`[${userId}] 💰 Creditado R$ ${amountBrl.toFixed(2)} de ${source}. Saldo: R$ ${account.balance.toFixed(2)}`);
    return { previousBalance: account.balance - amountBrl, newBalance: account.balance, creditedBy: source };
  }

  async getRecentTransactions(userId: string, limit = 20): Promise<any[]> {
    return this.transactions.filter(t => t.fromAccount === userId).slice(-limit);
  }
}
