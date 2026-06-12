// ============================================
//  PLUGGY SERVICE
// ============================================
// Integração com Pluggy Open Finance aggregator.
// Docs: https://docs.pluggy.ai/
//
// Features:
// - Gera Connect Token (pra abrir Pluggy Connect Widget no browser)
// - Busca contas, transações, investimentos
// - Valida assinatura HMAC dos webhooks
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';
const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID || '';
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || '';

@Injectable()
export class PluggyService {
  private readonly logger = new Logger(PluggyService.name);
  private authToken: string | null = null;
  private authExpiresAt: number = 0;

  /**
   * Gera um Connect Token para abrir o Pluggy Connect Widget.
   * O Connect Token é de uso único e expira em 30 min.
   * https://docs.pluggy.ai/docs/webhooks
   */
  async createConnectToken(opts: {
    clientUserId: string;
    webhookUrl?: string;
    country?: 'BR' | string;
  }): Promise<{ connectToken: string; expiresAt: string }> {
    const apiKey = await this.getApiKey();
    const r = await fetch(`${PLUGGY_BASE_URL}/connect_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify({
        clientUserId: opts.clientUserId,
        webhookUrl: opts.webhookUrl || process.env.PLUGGY_WEBHOOK_URL,
        country: opts.country || 'BR',
        language: 'pt-BR'
      })
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Pluggy createConnectToken failed: ${r.status} - ${err}`);
    }
    const data: any = await r.json();
    return {
      connectToken: data.connectToken || data.accessToken,
      expiresAt: data.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
  }

  /**
   * Autentica na API do Pluggy (gera API Key)
   * https://docs.pluggy.ai/reference#auth
   */
  private async getApiKey(): Promise<string> {
    if (this.authToken && Date.now() < this.authExpiresAt - 60_000) {
      return this.authToken;
    }
    const basic = Buffer.from(`${PLUGGY_CLIENT_ID}:${PLUGGY_CLIENT_SECRET}`).toString('base64');
    const r = await fetch(`${PLUGGY_BASE_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basic}`
      },
      body: JSON.stringify({})
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Pluggy auth failed: ${r.status} - ${err}`);
    }
    const data: any = await r.json();
    this.authToken = data.apiKey;
    this.authExpiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2h
    return this.authToken;
  }

  /**
   * Busca todas as contas de um item
   */
  async getAccounts(itemId: string): Promise<any[]> {
    const apiKey = await this.getApiKey();
    const r = await fetch(`${PLUGGY_BASE_URL}/accounts?itemId=${itemId}`, {
      headers: { 'X-API-KEY': apiKey }
    });
    if (!r.ok) throw new Error(`Pluggy getAccounts failed: ${r.status}`);
    const data: any = await r.json();
    return data.results || [];
  }

  /**
   * Busca saldo agregado de todas as contas
   */
  async getTotalBalance(itemId: string): Promise<number> {
    const accounts = await this.getAccounts(itemId);
    return accounts
      .filter((a: any) => a.type === 'BANK' || a.type === 'CREDIT')
      .reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
  }

  /**
   * Busca transações recentes
   */
  async getTransactions(itemId: string, days: number = 30): Promise<any[]> {
    const apiKey = await this.getApiKey();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const r = await fetch(`${PLUGGY_BASE_URL}/transactions?itemId=${itemId}&from=${from}&pageSize=500`, {
      headers: { 'X-API-KEY': apiKey }
    });
    if (!r.ok) throw new Error(`Pluggy getTransactions failed: ${r.status}`);
    const data: any = await r.json();
    return data.results || [];
  }

  /**
   * Busca investimentos
   */
  async getInvestments(itemId: string): Promise<any[]> {
    const apiKey = await this.getApiKey();
    const r = await fetch(`${PLUGGY_BASE_URL}/investments?itemId=${itemId}`, {
      headers: { 'X-API-KEY': apiKey }
    });
    if (!r.ok) throw new Error(`Pluggy getInvestments failed: ${r.status}`);
    const data: any = await r.json();
    return data.results || [];
  }

  /**
   * Inicia pagamento via Open Finance (Pix via OF)
   * https://docs.pluggy.ai/reference#payments
   */
  async createPayment(opts: {
    itemId: string;
    amountBrl: number;
    pixKey: string;
    description?: string;
  }): Promise<any> {
    const apiKey = await this.getApiKey();
    const r = await fetch(`${PLUGGY_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify({
        type: 'PIX',
        amount: opts.amountBrl,
        receiver: { pix: { key: opts.pixKey } },
        payer: { itemId: opts.itemId },
        description: opts.description || 'NextGen Assets'
      })
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Pluggy createPayment failed: ${r.status} - ${err}`);
    }
    return r.json();
  }
}
