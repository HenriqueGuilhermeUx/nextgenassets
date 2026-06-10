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
   */
  private async getAccessToken(baseUrl: string): Promise<string> {
    const credentials = Buffer.from(
      `${this.config.get('EFI_CLIENT_ID')}:${this.config.get('EFI_CLIENT_SECRET')}`
    ).toString('base64');

    const response = await fetch(`${baseUrl}/v1/authorization`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      // @ts-ignore - mTLS via https.Agent
      agent: new https.Agent({
        pfx: this.certBuffer || undefined,
        passphrase: '',
        rejectUnauthorized: false
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`EFI auth failed: ${response.status} - ${err}`);
    }

    const data: any = await response.json();
    return data.access_token;
  }

  private getHttpsAgent(): https.Agent {
    return new https.Agent({
      pfx: this.certBuffer || undefined,
      passphrase: '',
      rejectUnauthorized: false
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
    // URL PIX oficial da Efí (sandbox ou produção)
    const baseUrl = sandbox
      ? 'https://pix-h.api.efipay.com.br'
      : 'https://pix.api.efipay.com.br';

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

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhookUrl: opts.webhookUrl
        }),
        // @ts-ignore
        agent: this.getHttpsAgent()
      });

      const body = await response.text();
      let parsed: any = body;
      try { parsed = JSON.parse(body); } catch {}

      if (response.ok) {
        this.logger.log(`✅ Webhook registrado: ${opts.webhookUrl}`);
        // Salva no DB pra referência (best-effort)
        try {
          await prisma.auditLog.create({
            data: {
              partnerId: 'system',
              action: 'EFI_WEBHOOK_REGISTERED',
              targetId: opts.webhookUrl,
              details: { pixKey: opts.pixKey, status: response.status, body: parsed }
            } as any
          });
        } catch (e) {
          // Audit log é best-effort, nao quebra o flow
        }
      } else {
        this.logger.error(`❌ Falha ao registrar webhook: ${response.status} - ${body}`);
      }

      return { success: response.ok, status: response.status, body: parsed };
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
