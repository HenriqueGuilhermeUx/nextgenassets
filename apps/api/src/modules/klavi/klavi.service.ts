// ============================================
//  KLAVI OPEN FINANCE SERVICE
//  Docs: https://docs.klavi.ai/connect
//
//  Features:
//  - Gera accessToken (JWT 30min)
//  - Cria Link whitelabel (Klavi Connect)
//  - Lista instituições bancárias
//  - Cria consentimento
//  - Recebe webhook de consent.data
//
//  SUBSTITUI Pluggy (mais barato, sandbox grátis)
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { buildKlaviConfig, KlaviConfig } from '../../config/klavi.config';

@Injectable()
export class KlaviService {
  private readonly logger = new Logger(KlaviService.name);
  private cfg: KlaviConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.cfg = buildKlaviConfig(process.env);
    this.baseUrl = this.cfg.apiUrl;
  }

  private async ensureToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }
    return this.refreshToken();
  }

  async refreshToken(): Promise<string> {
    if (!this.cfg.accessKey || !this.cfg.secretKey) {
      throw new Error('KLAVI_ACCESS_KEY / KLAVI_SECRET_KEY nao configurados');
    }
    const r = await fetch(`${this.baseUrl}/data/v1/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessKey: this.cfg.accessKey, secretKey: this.cfg.secretKey })
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Klavi auth error: ${r.status} - ${err}`);
    }
    const data: any = await r.json();
    this.accessToken = data.accessToken;
    this.tokenExpiresAt = Date.now() + (data.expireIn * 1000);
    this.logger.log(`🔑 Klavi token refreshed (expires in ${data.expireIn}s)`);
    return this.accessToken!;
  }

  private async headers(): Promise<Record<string, string>> {
    const token = await this.ensureToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Cria um link whitelabel (Klavi Connect) pro user conectar seu banco
   */
  async createLink(opts: {
    personalTaxId?: string;
    businessTaxId?: string;
    email?: string;
    phone?: string;
    redirectUrl?: string;
    externalInfo?: any;
  }): Promise<{ linkId: string; linkToken: string; linkUrl: string; expireIn: number }> {
    const headers = await this.headers();
    const r = await fetch(`${this.baseUrl}/data/v1/links`, {
      method: 'POST',
      headers,
      body: JSON.stringify(opts)
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Klavi createLink error: ${r.status} - ${err}`);
    }
    return r.json() as any;
  }

  /**
   * Lista instituições bancárias (bancos suportados)
   */
  async listInstitutions(linkToken: string): Promise<any[]> {
    const r = await fetch(`${this.baseUrl}/data/v1/institutions`, {
      headers: { 'Authorization': `Bearer ${linkToken}` }
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Klavi listInstitutions error: ${r.status} - ${err}`);
    }
    return r.json() as any;
  }

  /**
   * Cria consentimento (vincula conta do user)
   */
  async createConsent(opts: {
    linkToken: string;
    institutionCode: string;
    products?: string[];
  }): Promise<any> {
    const r = await fetch(`${this.baseUrl}/data/v1/consents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${opts.linkToken}` },
      body: JSON.stringify({
        institutionCode: opts.institutionCode,
        products: opts.products || ['accounts', 'transactions', 'identity']
      })
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Klavi createConsent error: ${r.status} - ${err}`);
    }
    return r.json() as any;
  }

  /**
   * Busca dados pessoais do user
   */
  async getPersonalData(linkToken: string, taxId: string): Promise<any> {
    const r = await fetch(`${this.baseUrl}/data/v1/personal/user-data?taxId=${taxId}`, {
      headers: { 'Authorization': `Bearer ${linkToken}` }
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Klavi getPersonalData error: ${r.status} - ${err}`);
    }
    return r.json() as any;
  }

  /**
   * Verifica configuração
   */
  getStatus() {
    return {
      enabled: this.cfg.enabled,
      configured: !!(this.cfg.accessKey && this.cfg.secretKey),
      apiUrl: this.baseUrl,
      productType: this.cfg.productType,
      hasToken: !!this.accessToken
    };
  }
}
