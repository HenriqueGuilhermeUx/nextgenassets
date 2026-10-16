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
import { parseVerifiedEfiAdhesion, VerifiedAdhesionTerms } from './efi-automatic-consent-validation';

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
      rejectUnauthorized: true
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
        rejectUnauthorized: true,
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

        if (!socket.authorized) {
          socket.destroy();
          resolve({ status: 0, error: 'EFI_TLS_PEER_NOT_AUTHORIZED' });
          return;
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
      this.logger.log(`🔐 mTLS CA bundle loaded (${isHomolog ? 'homolog' : 'prod'})`);
    } catch (e: any) {
      throw new Error('EFI_CA_BUNDLE_UNAVAILABLE');
    }

    const agent = new https.Agent({
      pfx,
      passphrase,
      ca,
      keepAlive: true,
      timeout: 60000,
      maxVersion: 'TLSv1.3',
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
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
          this.logger.log(`Efí response status=${res.statusCode}, bytes=${buffer.length}`);
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
      throw new Error(`EFI_OAUTH_HTTP_${res.status}`);
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
    idProprio?: string;
    idempotencyKey?: string;
  }): Promise<{ identificadorAdesao: string; redirectURI: string }> {
    const token = await this.ensureToken();
    const idempotencyKey = opts.idempotencyKey || require('crypto').randomUUID();

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
        idProprio: opts.idProprio || `nextgen-${Date.now()}`,
        configuracao: {
          automatico: {
            ...(opts.valorFixo ? { valorFixo: opts.valorFixo } : {}),
            ...(opts.valorMinimo ? { valorMinimo: opts.valorMinimo } : {}),
            ...(opts.valorMaximo ? { valorMaximo: opts.valorMaximo } : {}),
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
      throw new Error(`EFI_ADHESION_HTTP_${res.status}`);
    }

    const data = res.data;
    this.logger.log(`✅ Adesão criada: ${data.identificadorAdesao}`);
    return {
      identificadorAdesao: data.identificadorAdesao,
      redirectURI: data.redirectURI
    };
  }

  /**
   * Official Efí API lookup (server-to-server over verified TLS).
   * Unlike the legacy exploratory getAdesao(), this requires inicio/fim and
   * matches the exact external ID. A missing match is NEVER an authorization.
   * Does not follow pagination: absent entries fail closed for review.
   */
  async getAutomaticAdhesionOfficial(externalId: string, createdAt: Date):
    Promise<VerifiedAdhesionTerms> {
    if (!externalId || externalId.length > 200 || !/^urn:efi:[a-zA-Z0-9-]+$/.test(externalId)) {
      throw new Error('INVALID_EFI_ADHESION_ID');
    }
    if (!(createdAt instanceof Date) || !Number.isFinite(createdAt.getTime())) {
      throw new Error('INVALID_EFI_ADHESION_CREATION_DATE');
    }
    const from = new Date(createdAt);
    from.setUTCDate(from.getUTCDate() - 1);
    const to = new Date(createdAt);
    to.setUTCDate(to.getUTCDate() + 1);
    const inicio = from.toISOString().slice(0, 10);
    const fim = to.toISOString().slice(0, 10);
    const token = await this.ensureToken();
    const res = await this.mTLSRequest({
      method: 'GET',
      path: `/v1/pagamentos-automaticos/adesao?inicio=${inicio}&fim=${fim}`,
      extraHeaders: { Authorization: `Bearer ${token}` }
    });
    if (res.status < 200 || res.status >= 300 || !Array.isArray(res.data?.adesoes)) {
      throw new Error(`EFI_ADHESION_QUERY_HTTP_${res.status}`);
    }
    const match = res.data.adesoes.find((x: any) => x?.identificadorAdesao === externalId);
    if (!match) throw new Error('EFI_ADHESION_NOT_FOUND_IN_VERIFIED_QUERY');
    return parseVerifiedEfiAdhesion(match);
  }

  /**
   * Submit exactly one scheduled payment to Efí SANDBOX only.
   * HTTP 200/201 means submitted, NOT settled or paid.
   * Caller must atomically claim its cycle before invoking this method.
   */
  async sendAutomaticPaymentSandbox(input: {
    adhesionId: string;
    amountCents: number;
    dueDate: string;
    idempotencyKey: string;
    description: string;
    cityIbge?: string;
  }): Promise<{ status: string; endToEndId: string | null }> {
    const server = new URL(this.cfg.apiUrl);
    if (server.hostname !== 'openfinance-h.api.efipay.com.br' ||
        process.env.NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS !== 'true') {
      throw new Error('EFI_SANDBOX_PAYMENTS_DISABLED');
    }
    if (!/^urn:efi:[a-zA-Z0-9-]+$/.test(input.adhesionId) ||
        !Number.isSafeInteger(input.amountCents) || input.amountCents <= 0 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) ||
        !/^[a-zA-Z0-9-]{32,128}$/.test(input.idempotencyKey)) {
      throw new Error('INVALID_EFI_AUTOMATIC_PAYMENT_REQUEST');
    }
    const token = await this.ensureToken();
    const payload = {
      identificadorAdesao: input.adhesionId,
      pagamento: {
        valor: (input.amountCents / 100).toFixed(2),
        data: input.dueDate,
        ...(input.cityIbge ? { codigoCidadeIBGE: input.cityIbge } : {}),
        infoPagador: input.description.slice(0, 120)
      }
    };
    const res = await this.mTLSRequest({
      method: 'POST',
      path: '/v1/pagamentos-automaticos/pix',
      body: payload,
      extraHeaders: {
        Authorization: `Bearer ${token}`,
        'x-idempotency-key': input.idempotencyKey
      }
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`EFI_AUTOMATIC_SUBMIT_HTTP_${res.status}`);
    }
    const data = res.data;
    if (!data || data.identificadorAdesao !== input.adhesionId ||
        typeof data.status !== 'string') {
      throw new Error('EFI_AUTOMATIC_PAYMENT_UNVERIFIED_RESPONSE');
    }
    return {
      status: data.status.toLowerCase(),
      endToEndId: typeof data.endToEndId === 'string' ? data.endToEndId : null
    };
  }

  /**
   * Read-only status lookup for a previously submitted sandbox payment.
   * This is NOT proof that the beneficiary received funds.
   */
  async getAutomaticSandboxPaymentStatus(input: {
    adhesionId: string;
    endToEndId: string;
    requestedDate: string;
  }): Promise<{ status: string; endToEndId: string }> {
    if (new URL(this.cfg.apiUrl).hostname !== 'openfinance-h.api.efipay.com.br' ||
        process.env.NEXTGEN_EFI_AUTOMATIC_SANDBOX_REQUESTS !== 'true') {
      throw new Error('EFI_SANDBOX_PAYMENT_QUERY_DISABLED');
    }
    if (!/^urn:efi:[a-zA-Z0-9-]+$/.test(input.adhesionId) ||
        !/^[A-Za-z0-9-]{8,120}$/.test(input.endToEndId) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(input.requestedDate)) {
      throw new Error('INVALID_EFI_SANDBOX_STATUS_LOOKUP');
    }
    const token = await this.ensureToken();
    const date = encodeURIComponent(input.requestedDate);
    const result = await this.mTLSRequest({
      method: 'GET',
      path: `/v1/pagamentos-automaticos/pix?inicio=${date}&fim=${date}`,
      extraHeaders: { Authorization: `Bearer ${token}` }
    });
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`EFI_SANDBOX_STATUS_HTTP_${result.status}`);
    }
    const roots = Array.isArray(result.data) ? result.data : [result.data];
    const found = roots.find((entry: any) => entry?.identificadorAdesao === input.adhesionId &&
      Array.isArray(entry?.pagamentos) &&
      entry.pagamentos.some((p: any) => p?.endToEndId === input.endToEndId));
    if (!found) throw new Error('EFI_SANDBOX_PAYMENT_NOT_FOUND');
    const payment = found.pagamentos.find((p: any) => p?.endToEndId === input.endToEndId);
    if (!payment || typeof payment.status !== 'string') {
      throw new Error('EFI_SANDBOX_PAYMENT_UNVERIFIED_STATUS');
    }
    return { status: payment.status.toLowerCase(), endToEndId: input.endToEndId };
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
      throw new Error(`EFI_PAYMENT_HTTP_${res.status}`);
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
      return { ok: Boolean(token) };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }
}
