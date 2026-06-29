// Updated Thu
// ============================================
//  EFI OPEN FINANCE SERVICE
//  PISP (Payment Initiation) + Consent
//  Permite PAGAR PIX DIRETO da conta do cliente (sem clique manual)
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import { loadEfiCaBundle } from './efi-ca-bundle';
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
      rejectUnauthorized: false
    });
  }

  /**
   * mTLS com mais controle de TLS (alternativo)
   * Usa tls.connect direto pra ter mais debug
   */
  private mTLSRequestRaw(opts: {
    method: string;
    hostname: string;
    port?: number;
    path: string;
    body: any;
    extraHeaders?: Record<string, string>;
  }): Promise<{ status: number; data?: any; text?: string; error?: string; tlsInfo?: any }> {
    return new Promise((resolve) => {
      const tls = require('tls');
      const http = require('http');
      const pfx = Buffer.from(this.cfg.certBase64, 'base64');
      const ca = loadEfiCaBundle(opts.hostname.includes('-h.'));
      const body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);

      const socket = tls.connect({
        host: opts.hostname,
        port: opts.port || 443,
        pfx,
        passphrase: this.cfg.certPassphrase || '',
        ca,
        rejectUnauthorized: false,
        secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT || 0,
        ciphers: 'DEFAULT:@SECLEVEL=0',
        servername: opts.hostname
      }, () => {
        const tlsInfo = {
          authorized: socket.authorized,
          authorizationError: socket.authorizationError?.toString(),
          cipher: socket.getCipher(),
          peerCert: socket.getPeerCertificate() ? {
            subject: socket.getPeerCertificate().subject,
            issuer: socket.getPeerCertificate().issuer,
            validFrom: socket.getPeerCertificate().valid_from,
            validTo: socket.getPeerCertificate().valid_to
          } : null
        };

        if (!socket.authorized && !opts.hostname.includes('efi')) {
          this.logger.warn(`⚠️ TLS não autorizado: ${socket.authorizationError}`);
        }

        const req = http.request({
          method: opts.method,
          hostname: opts.hostname,
          port: opts.port || 443,
          path: opts.path,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            ...(opts.extraHeaders || {})
          },
          createConnection: () => socket
        }, (res: any) => {
          let data = '';
          res.on('data', (chunk: any) => data += chunk);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data), text: data, tlsInfo });
            } catch {
              resolve({ status: res.statusCode, text: data, tlsInfo });
            }
          });
        });
        req.on('error', (err: any) => resolve({ status: 0, error: err.message, tlsInfo }));
        req.write(body);
        req.end();
      });

      socket.on('error', (err: any) => resolve({ status: 0, error: err.message }));
      socket.setTimeout(15000, () => {
        socket.destroy();
        resolve({ status: 0, error: 'timeout' });
      });
    });
  }

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

    const passphrase = (this.cfg.certPassphrase || '').toString();
    const pfx = Buffer.from(this.cfg.certBase64, 'base64');

    const baseUrl = opts.useOAuthUrl ? this.cfg.oauthUrl : this.cfg.apiUrl;
    const fullUrl = baseUrl.endsWith(opts.path) ? baseUrl : baseUrl + opts.path;
    const url = new URL(fullUrl);

    let ca: Buffer | Buffer[] | undefined;
    try {
      const isHomolog = url.hostname.includes('-h.');
      ca = loadEfiCaBundle(isHomolog);
      this.logger.log(`🔐 mTLS CA bundle loaded (embutido): ${isHomolog ? 'homolog' : 'prod'} (${ca.length} bytes)`);
    } catch (e: any) {
      this.logger.warn(`⚠️ Erro ao carregar CA bundle Efi: ${e.message}`);
    }

    const agent = new https.Agent({
      pfx,
      passphrase,
      ca,
      keepAlive: true,
      timeout: 60000,
      maxVersion: 'TLSv1.3',
      minVersion: 'TLSv1.2',
      secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT || 0,
      ciphers: 'DEFAULT:@SECLEVEL=0',
      rejectUnauthorized: false
    });

    return new Promise((resolve, reject) => {
      const body = opts.body ? JSON.stringify(opts.body) : '';
      const reqOptions: https.RequestOptions = {
        method: opts.method,
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        agent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...(opts.extraHeaders || {})
        }
      };

      const req = https.request(reqOptions, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const data = buffer.toString('utf-8');
          this.logger.log(`📥 Efi response: ${res.statusCode} (${buffer.length} bytes): ${data.substring(0, 200)}`);
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode || 0, data: parsed, text: data });
          } catch {
            resolve({ status: res.statusCode || 0, data: null, text: data });
          }
        });
      });

      req.on('error', (err) => {
        this.logger.error(`❌ Efi request error: ${err.message}`);
        reject(err);
      });

      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error('timeout 60s'));
      });

      if (body) req.write(body);
      req.end();
    });
  }

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
      grant_type: 'client_credentials'
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
   * Cria adesão de pagamento automático Open Finance.
   */
  async createConsent(opts: {
    cpf?: string;
    cnpj?: string;
    nome?: string;
    idParticipante: string;
    favorecido: {
      nome: string;
      documento: string;
      codigoBanco: string;
      agencia: string;
      conta: string;
      tipoConta?: 'TRAN' | 'CACC' | 'SVGS';
    };
    valorFixo?: string;
    valorMinimo?: string;
    valorMaximo?: string;
    intervalo: 'DIARIO' | 'SEMANAL' | 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
    dataInicio: string;
    expiracao?: string;
    descricao?: string;
    permiteRetentativa?: boolean;
  }): Promise<{ identificadorAdesao: string; redirectURI: string }> {
    const token = await this.ensureToken();
    const idempotencyKey = require('crypto').randomUUID();

    const body = {
      pagador: {
        cpf: opts.cpf,
        cnpj: opts.cnpj,
        nome: opts.nome,
        idParticipante: opts.idParticipante
      },
      favorecido: {
        contaBanco: {
          nome: opts.favorecido.nome,
          documento: opts.favorecido.documento,
          codigoBanco: opts.favorecido.codigoBanco,
          agencia: opts.favorecido.agencia,
          conta: opts.favorecido.conta,
          tipoConta: opts.favorecido.tipoConta || 'TRAN'
        }
      },
      assinatura: {
        expiracao: opts.expiracao || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        descricao: opts.descricao || 'Pagamento NextGen Assets',
        idProprio: `nextgen-${Date.now()}`,
        configuracao: {
          automatico: {
            intervalo: opts.intervalo,
            dataInicio: opts.dataInicio,
            permiteRetentativa: opts.permiteRetentativa ?? false
          }
        }
      }
    };

    const res = await this.mTLSRequest({
      method: 'POST',
      path: '/v1/pagamentos-automaticos/adesao',
      body,
      extraHeaders: {
        'Authorization': `Bearer ${token}`,
        'x-idempotency-key': idempotencyKey
      }
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Efi createConsent error: ${res.status} - ${res.text}`);
    }

    const data = res.data;
    this.logger.log(`✅ Adesão criada: ${data.identificadorAdesao}`);
    return {
      identificadorAdesao: data.identificadorAdesao,
      redirectURI: data.redirectURI
    };
  }

  /**
   * Busca status de uma adesão. A Efí criou por POST /adesao, mas a consulta não usa path param.
   * Esta função tenta as variações por query string e retorna qual funcionou.
   */
  async getAdesao(identificadorAdesao: string): Promise<any> {
    const token = await this.ensureToken();
    const encoded = encodeURIComponent(identificadorAdesao);
    const attempts = [
      { name: 'query-identificadorAdesao', path: `/v1/pagamentos-automaticos/adesao?identificadorAdesao=${encoded}` },
      { name: 'query-identificador', path: `/v1/pagamentos-automaticos/adesao?identificador=${encoded}` },
      { name: 'query-recurringConsentId', path: `/v1/pagamentos-automaticos/adesao?recurringConsentId=${encoded}` },
      { name: 'path-encoded-fallback', path: `/v1/pagamentos-automaticos/adesao/${encoded}` }
    ];

    const results: any[] = [];
    for (const attempt of attempts) {
      const res = await this.mTLSRequest({
        method: 'GET',
        path: attempt.path,
        extraHeaders: { 'Authorization': `Bearer ${token}` }
      });

      results.push({
        name: attempt.name,
        path: attempt.path,
        status: res.status,
        data: res.data,
        text: res.text
      });

      if (res.status >= 200 && res.status < 300) {
        return {
          success: true,
          matched: attempt.name,
          data: res.data,
          attempts: results
        };
      }
    }

    throw new Error(`Efi getAdesao error: nenhuma variacao funcionou - ${JSON.stringify(results)}`);
  }

  /**
   * Inicia pagamento PIX via Open Finance (PISP)
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
        creditorAccount: {},
        remittanceInformation: opts.description,
        idempotencyKey: opts.idempotencyKey || `pay-${Date.now()}-${Math.random().toString(36).substring(7)}`
      }
    };

    const res = await this.mTLSRequest({
      method: 'POST',
      path: '/v1/pagamentos/pix',
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

  async testConnection(): Promise<{ ok: boolean; token?: string; error?: string }> {
    try {
      const token = await this.refreshToken();
      return { ok: true, token: token.substring(0, 30) + '...' };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }
}
