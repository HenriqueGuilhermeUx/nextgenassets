// ============================================
//  EFI OPEN FINANCE SERVICE
//  PISP (Payment Initiation) + Consent
//  Permite PAGAR PIX DIRETO da conta do cliente (sem clique manual)
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import { buildEfiOFConfig, EfiOFConfig } from '../../config/efi-of.config';

@Injectable()
export class EfiOFService {
  private readonly logger = new Logger(EfiOFService.name);
  private cfg: EfiOFConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.cfg = buildEfiOFConfig(process.env);
  }

  private getHttpsAgent(): https.Agent {
    if (!this.cfg.certBase64) {
      throw new Error('EFI_CERTIFICATE_BASE64 nao configurado');
    }
    const pfx = Buffer.from(this.cfg.certBase64, 'base64');
    return new https.Agent({
      pfx,
      passphrase: this.cfg.certPassphrase || '',
      rejectUnauthorized: false  // evita ECONNRESET em alguns cenários
    });
  }

  /**
   * Faz requisição HTTPS com mTLS (cert .p12)
   * @param method POST/GET
   * @param path ex: '/v1/consent'
   * @param body JSON object ou undefined
   * @param extraHeaders headers extras
   */
  private async mTLSRequest(opts: {
    method: 'POST' | 'GET' | 'PUT' | 'DELETE';
    path: string;
    body?: any;
    extraHeaders?: Record<string, string>;
    useOAuthUrl?: boolean;
  }): Promise<{ status: number; data: any; text: string }> {
    if (!this.cfg.certBase64) {
      throw new Error('EFI_CERTIFICATE_BASE64 nao configurado');
    }
    const pfx = Buffer.from(this.cfg.certBase64, 'base64');
    
    const baseUrl = opts.useOAuthUrl ? this.cfg.oauthUrl : this.cfg.apiUrl;
    const url = new URL(baseUrl + opts.path);
    
    return new Promise((resolve, reject) => {
      // Carrega CA bundle Efi (chain prod OU homolog)
      let ca: Buffer | Buffer[] | undefined;
      try {
        const fs = require('fs');
        const path = require('path');
        const homologPath = path.join(process.cwd(), 'apps/api/src/certs/efi-chain-homolog.crt');
        const prodPath = path.join(process.cwd(), 'apps/api/src/certs/efi-chain-prod.crt');
        if (url.hostname.includes('-h.')) {
          ca = fs.readFileSync(homologPath);
        } else {
          ca = fs.readFileSync(prodPath);
        }
        this.logger.log(`🔐 mTLS CA bundle loaded: ${url.hostname.includes('-h.') ? 'homolog' : 'prod'} (${ca.length} bytes)`);
      } catch (e: any) {
        this.logger.warn(`⚠️ CA bundle Efi não encontrado: ${e.message}`);
      }
      
      const reqOptions: https.RequestOptions = {
        method: opts.method,
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        pfx: pfx,
        passphrase: this.cfg.certPassphrase || '',
        ca: ca,
        rejectUnauthorized: false,  // Efi às vezes tem cert cross-signed
        secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT || 0,
        ciphers: 'DEFAULT:@SECLEVEL=0',
        headers: {
          'Content-Type': 'application/json',
          ...(opts.extraHeaders || {})
        }
      };
      
      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode || 0, data: parsed, text: data });
          } catch {
            resolve({ status: res.statusCode || 0, data: null, text: data });
          }
        });
      });
      
      req.on('error', (err) => reject(err));
      
      if (opts.body) {
        req.write(JSON.stringify(opts.body));
      }
      req.end();
    });
  }

  /**
   * Gera access_token via OAuth2 client_credentials
   */
  async ensureToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }
    return this.refreshToken();
  }

  async refreshToken(): Promise<string> {
    if (!this.cfg.clientId || !this.cfg.clientSecret) {
      throw new Error('EFI_CLIENT_ID / EFI_CLIENT_SECRET nao configurados');
    }

    const credenciais = Buffer.from(`${this.cfg.clientId}:${this.cfg.clientSecret}`).toString('base64');

    const body = {
      grant_type: 'client_credentials',
      scope: 'open-finance.consent open-finance.payment'
    };

    const res = await this.mTLSRequest({
      method: 'POST',
      path: '/v1/oauth/token',
      body,
      extraHeaders: { 'Authorization': `Basic ${credenciais}` },
      useOAuthUrl: true
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Efi OAuth error: ${res.status} - ${res.text}`);
    }

    const data = res.data;
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    this.logger.log(`🔑 Efi OF token refreshed (expires in ${data.expires_in}s)`);
    return this.accessToken!;
  }

  /**
   * Cria consentimento de pagamento (cliente autoriza NextGen a iniciar PIX da conta dele)
   * POST /v1/consent
   */
  async createConsent(opts: {
    cpf: string;
    cnpj?: string;
    permissions: ('accounts.read' | 'transactions.read' | 'payments.initiate')[];
    expirationDateTime?: string;  // ISO 8601
    redirectUrl?: string;
  }): Promise<{ consentId: string; status: string; authUrl?: string }> {
    const token = await this.ensureToken();
    const httpsAgent = this.getHttpsAgent();

    const body = {
      data: {
        loggedUser: opts.cnpj 
          ? { document: { identification: opts.cnpj, rel: 'CNPJ' } }
          : { document: { identification: opts.cpf, rel: 'CPF' } },
        businessEntity: opts.cnpj 
          ? { document: { identification: opts.cnpj, rel: 'CNPJ' } }
          : undefined,
        permissions: opts.permissions,
        expirationDateTime: opts.expirationDateTime || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        transactionFromDateTime: new Date().toISOString()
      },
      redirectUri: opts.redirectUrl || 'https://app.nextgenassets.com.br/efi/callback'
    };

    const res = await this.mTLSRequest({
      method: 'POST',
      path: '/v1/consent',
      body,
      extraHeaders: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Efi createConsent error: ${res.status} - ${res.text}`);
    }

    const data = res.data;
    this.logger.log(`✅ Consent criado: ${data.data?.consentId}`);
    return {
      consentId: data.data?.consentId,
      status: data.data?.status,
      authUrl: data.links?.self || data.data?.redirectUri
    };
  }

  /**
   * Inicia pagamento PIX via Open Finance (PISP)
   * POST /v1/payments
   */
  async initiatePayment(opts: {
    consentId: string;
    cpf: string;
    cnpj?: string;
    amountCents: number;
    pixKey: string;
    description: string;
    idempotencyKey?: string;
  }): Promise<{ paymentId: string; status: string; endToEndId?: string }> {
    const token = await this.ensureToken();

    const body = {
      data: {
        consentId: opts.consentId,
        payment: {
          amount: (opts.amountCents / 100).toFixed(2),
          currency: 'BRL',
          paymentDateTime: new Date().toISOString()
        },
        creditorAccount: {
          // Dados do destinatário (NextGen)
          // Precisaria do ISPB + account + branch
          // Vou usar pixKey como simplificação
        },
        remittanceInformation: opts.description,
        idempotencyKey: opts.idempotencyKey || `pay-${Date.now()}-${Math.random().toString(36).substring(7)}`
      }
    };

    const res = await this.mTLSRequest({
      method: 'POST',
      path: '/v1/payments',
      body,
      extraHeaders: {
        'Authorization': `Bearer ${token}`,
        'Idempotency-Key': body.data.idempotencyKey
      }
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Efi initiatePayment error: ${res.status} - ${res.text}`);
    }

    const data = res.data;
    this.logger.log(`💸 Pagamento iniciado: ${data.data?.paymentId}`);
    return {
      paymentId: data.data?.paymentId,
      status: data.data?.status,
      endToEndId: data.data?.endToEndId
    };
  }

  /**
   * Testa conexão com a Efi
   */
  async testConnection(): Promise<{ ok: boolean; token?: string; error?: string }> {
    try {
      const token = await this.refreshToken();
      return { ok: true, token: token.substring(0, 30) + '...' };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }
}
