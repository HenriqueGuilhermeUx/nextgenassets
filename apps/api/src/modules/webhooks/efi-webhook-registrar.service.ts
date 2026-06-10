// ============================================
//  EFI WEBHOOK REGISTRAR
//  Cadastra URLs de webhook na API Pix da Efí
//  (porque o painel deles não deixa fazer visualmente)
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class EfiWebhookRegistrar {
  private readonly logger = new Logger(EfiWebhookRegistrar.name);
  private certBuffer: Buffer | null = null;

  constructor(private config: ConfigService) {
    const certBase64 = this.config.get('EFI_CERTIFICATE_BASE64');
    if (certBase64) {
      this.certBuffer = Buffer.from(certBase64, 'base64');
    }
  }

  /**
   * Faz mTLS + OAuth pra obter o access_token
   * Usa https.request direto pq Node fetch nao aceita 'agent' nativo.
   * Segue redirects manualmente (Node 20 nao segue 301 sozinho).
   */
  private async httpsRequest(opts: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(opts.url);
      const req = https.request({
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + (parsedUrl.search || ''),
        method: opts.method,
        pfx: this.certBuffer || undefined,
        passphrase: '',
        rejectUnauthorized: false,
        headers: opts.headers
      }, (res) => {
        // Segue redirect 301/302/303/307/308
        if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          const newUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : `${parsedUrl.protocol}//${parsedUrl.hostname}${res.headers.location}`;
          this.logger.warn(`↪️ Redirect ${res.statusCode} → ${newUrl}`);
          // Recursivo, mas com novo método se for 303
          const newMethod = res.statusCode === 303 ? 'GET' : opts.method;
          this.httpsRequest({ ...opts, url: newUrl, method: newMethod })
            .then(resolve)
            .catch(reject);
          return;
        }

        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, body });
        });
      });
      req.on('error', (err) => reject(err));
      if (opts.body) req.write(opts.body);
      req.end();
    });
  }

  private async getAccessToken(baseUrl: string): Promise<string> {
    const credentials = Buffer.from(
      `${this.config.get('EFI_CLIENT_ID')}:${this.config.get('EFI_CLIENT_SECRET')}`
    ).toString('base64');

    const result = await this.httpsRequest({
      url: `${baseUrl}/v1/authorization`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Content-Length': '0'
      }
    });

    if (result.status >= 200 && result.status < 300) {
      try {
        const data = JSON.parse(result.body);
        return data.access_token;
      } catch (e) {
        throw new Error(`EFI auth: invalid JSON: ${result.body.substring(0, 200)}`);
      }
    } else {
      throw new Error(`EFI auth failed: ${result.status} - ${result.body.substring(0, 200)}`);
    }
  }

  /**
   * PUT request com mTLS via https nativo
   */
  private async putWithMtls(url: string, body: any, token: string): Promise<{ status: number; body: string }> {
    const bodyStr = JSON.stringify(body);
    return this.httpsRequest({
      url,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr).toString()
      },
      body: bodyStr
    });
  }

  /**
   * Registra uma URL de webhook na Efí
   * Endpoint: PUT /v1/wh/{chave}
   */
  async registerWebhook(opts: {
    pixKey: string;
    webhookUrl: string;
  }): Promise<{ success: boolean; status: number; body: any }> {
    const sandbox = this.config.get('EFI_SANDBOX') === 'true' || this.config.get('EFI_SANDBOX') === true;
    // URL correta Efí (api-pix tem auth + pix operations)
    // - Sandbox: https://api-pix-h.efipay.com.br
    // - Produção: https://api-pix.efipay.com.br
    const baseUrl = sandbox
      ? 'https://api-pix-h.efipay.com.br'
      : 'https://api-pix.efipay.com.br';

    // Em modo DEMO, não chama API real
    if (process.env.EFI_DEMO_MODE !== 'false') {
      this.logger.warn(`⚠️  DEMO_MODE - webhook ${opts.webhookUrl} SIMULADO pra chave ${opts.pixKey}`);
      return {
        success: true,
        status: 200,
        body: { simulated: true, webhookUrl: opts.webhookUrl, pixKey: opts.pixKey }
      };
    }

    try {
      const token = await this.getAccessToken(baseUrl);

      // URL com a chave Pix (substituir {chave})
      const url = `${baseUrl}/v1/wh/${opts.pixKey}`;

      this.logger.log(`📡 Registrando webhook: ${url} → ${opts.webhookUrl}`);

      const result = await this.putWithMtls(url, { webhookUrl: opts.webhookUrl }, token);

      let parsed: any = result.body;
      try { parsed = JSON.parse(result.body); } catch {}

      if (result.status >= 200 && result.status < 300) {
        this.logger.log(`✅ Webhook registrado: ${opts.webhookUrl} (status ${result.status})`);
      } else {
        this.logger.error(`❌ Falha ao registrar webhook: ${result.status} - ${result.body.substring(0, 200)}`);
      }

      return { success: result.status >= 200 && result.status < 300, status: result.status, body: parsed };
    } catch (err: any) {
      this.logger.error(`❌ Erro ao registrar webhook: ${err.message}`);
      return { success: false, status: 0, body: { error: err.message } };
    }
  }

  /**
   * Registra TODOS os webhooks necessários pra NextGen Assets
   */
  async registerAllWebhooks(baseUrl: string = 'https://api.nextgenassets.com.br', pixKey?: string): Promise<{
    results: Array<{ name: string; url: string; success: boolean; status: number }>;
  }> {
    const key = pixKey || this.config.get('EFI_PIX_KEY');
    if (!key) {
      throw new Error('EFI_PIX_KEY não configurada');
    }

    const webhooks = [
      {
        name: 'pix-received',
        url: `${baseUrl}/v1/webhooks/pix-received`
      },
      {
        name: 'pix-sent',
        url: `${baseUrl}/v1/webhooks/pix-sent`
      },
      {
        name: 'pix-refunded',
        url: `${baseUrl}/v1/webhooks/pix-refunded`
      }
    ];

    this.logger.log(`🚀 Registrando ${webhooks.length} webhooks na Efí pra chave ${key}`);

    const results = [];
    for (const wh of webhooks) {
      const result = await this.registerWebhook({
        pixKey: key,
        webhookUrl: wh.url
      });
      results.push({
        name: wh.name,
        url: wh.url,
        success: result.success,
        status: result.status
      });
      // Pequeno delay pra não sobrecarregar a API
      await new Promise(r => setTimeout(r, 500));
    }

    return { results };
  }
}
