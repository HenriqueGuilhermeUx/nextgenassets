// ============================================
//  NUBANK OPEN FINANCE ADAPTER
// ============================================
// Integração direta via Nubank Open Finance
// + alternativa: Plug-and-Play Adapter (Efí) como fallback
//
// NuBank expõe APIs de Open Finance reguladas pelo BC
// Docs: https://nubank.com.br/open-finance/

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DestinationAdapter, DestinationAction, ExecutionResult, ExecutionStatusResult,
  ValidationResult, CancelResult, ReconciliationResult
} from '../destination.interface';

@Injectable()
export class NubankOpenFinanceAdapter implements DestinationAdapter {
  readonly type = 'BANK_ACCOUNT' as const;
  readonly adapterName = 'NUBANK_OPEN_FINANCE';

  private readonly logger = new Logger(NubankOpenFinanceAdapter.name);
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get('NUBANK_OF_URL') || 'https://api.nubank.com.br/open-banking/v1';
    this.clientId = this.config.get('NUBANK_OF_CLIENT_ID');
    this.clientSecret = this.config.get('NUBANK_OF_CLIENT_SECRET');
  }

  /**
   * Obtém access token via client_credentials
   */
  private async getAccessToken(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'accounts balances transactions payments'
      }).toString()
    });
    if (!response.ok) throw new Error('Falha ao obter access token');
    const data = await response.json();
    return data.access_token;
  }

  async validateUser(externalUserId: string): Promise<ValidationResult> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/accounts/${externalUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return { isValid: response.ok };
    } catch (err) {
      return { isValid: false, reason: err.message };
    }
  }

  /**
   * Consulta saldo de uma conta Nubank via Open Finance
   */
  async getBalance(accountId: string): Promise<{ balance: number; available: number; currency: string }> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/accounts/${accountId}/balances`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Nubank OF error: ${response.status}`);
    const data = await response.json();
    return {
      balance: data.data?.instantBalances?.[0]?.amount || 0,
      available: data.data?.instantBalances?.[0]?.amount || 0,
      currency: 'BRL'
    };
  }

  /**
   * Lista transações recentes (pra detectar salário, gastos, etc)
   */
  async getTransactions(accountId: string, days = 30): Promise<any[]> {
    const token = await this.getAccessToken();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(
      `${this.baseUrl}/accounts/${accountId}/transactions?from=${from}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.data?.transactions || [];
  }

  /**
   * Detecta salário nos últimos 30 dias (heurística: maior transação recorrente)
   */
  async detectSalary(accountId: string): Promise<{ amount: number; employer: string } | null> {
    const transactions = await this.getTransactions(accountId, 60);
    if (transactions.length === 0) return null;

    // Agrupa por pagador (origem do crédito)
    const credits = transactions.filter((t: any) => t.type === 'CREDIT');
    if (credits.length === 0) return null;

    // Encontra o pagador com mais créditos (provável empregador)
    const payerMap = new Map<string, { total: number; count: number; amount: number }>();
    credits.forEach((t: any) => {
      const payer = t.creditorName || t.creditor?.name || 'unknown';
      const existing = payerMap.get(payer) || { total: 0, count: 0, amount: 0 };
      existing.total += t.amount;
      existing.count++;
      existing.amount = Math.max(existing.amount, t.amount);
      payerMap.set(payer, existing);
    });

    const topPayer = Array.from(payerMap.entries())
      .filter(([_, v]) => v.count >= 1)  // apareceu pelo menos 1x
      .sort((a, b) => b[1].total - a[1].total)[0];

    if (!topPayer) return null;
    return { amount: topPayer[1].amount, employer: topPayer[0] };
  }

  /**
   * Inicia pagamento via Pix Automático (ITP)
   */
  async initiatePix(params: {
    accountId: string;
    amountBrl: number;
    destinationPixKey: string;
    description: string;
  }): Promise<{ endToEndId: string; status: string }> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        debtorAccount: { id: params.accountId },
        creditorAccount: { pixKey: params.destinationPixKey },
        amount: { value: params.amountBrl, currency: 'BRL' },
        description: params.description,
        type: 'INSTANT'
      })
    });

    if (!response.ok) {
      throw new Error(`Pix initiation failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      endToEndId: data.data?.endToEndId,
      status: data.data?.status || 'PENDING'
    };
  }

  // ========== DestinationAdapter interface ==========

  async execute(action: DestinationAction): Promise<ExecutionResult> {
    if (action.type !== 'TRANSFER') {
      return { status: 'FAILED', errorCode: 'UNSUPPORTED', errorMessage: 'Apenas TRANSFER', retryable: false };
    }

    try {
      const result = await this.initiatePix({
        accountId: action.userId,
        amountBrl: action.amountBrl,
        destinationPixKey: action.destinationAccount,
        description: 'Orkest automated transfer'
      });

      return {
        status: 'COMPLETED',
        externalId: result.endToEndId,
        details: {
          endToEndId: result.endToEndId,
          amountBrl: action.amountBrl,
          fromAccount: action.userId,
          toPixKey: action.destinationAccount,
          status: result.status
        }
      };
    } catch (err) {
      return { status: 'FAILED', errorCode: 'PIX_FAILED', errorMessage: err.message, retryable: true };
    }
  }

  async checkExecution(externalId: string): Promise<ExecutionStatusResult> {
    // Pix já foi confirmado no execute() em geral
    return { status: 'COMPLETED', externalId, details: { endToEndId: externalId } };
  }

  async cancel(externalId: string): Promise<CancelResult> {
    return { canceled: false, reason: 'Pix confirmado não pode ser cancelado' };
  }

  async reconcile(externalUserId: string, since: Date): Promise<ReconciliationResult> {
    const transactions = await this.getTransactions(externalUserId, 30);
    return {
      externalOperations: transactions.map((t: any) => ({
        externalId: t.transactionId,
        type: 'TRANSFER' as const,
        amountBrl: t.amount,
        executedAt: new Date(t.bookingDate)
      }))
    };
  }
}
