// ============================================
//  WOOVI PIX ADAPTER — OpenPix/Woovi
//  Suporta: PIX Cobrança com Split nativo, Webhook
//  Docs: https://developers.woovi.com/
//
//  VANTAGEM vs Efi:
//   - Split nativo em UMA chamada (Efi precisa cobrar + transferir 2x)
//   - Sem mTLS (só Bearer AppID)
//   - Sem OAuth dance (AppID é estático)
//   - Webhook assina com HMAC SHA256
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildWooviConfig, WooviConfig } from '../../config/woovi.config';

export interface WooviSplitItem {
  pixKey: string;
  value: number; // centavos
}

export interface WooviChargePayload {
  correlationID: string;
  value: number; // centavos (total)
  comment?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    taxID?: string;
  };
  splits?: WooviSplitItem[];
  expiresIn?: number; // segundos
}

export interface WooviCharge {
  id: string;
  identifier: string;
  correlationID: string;
  status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELED' | 'COMPLETED';
  value: number;
  qrCodeImage?: string;
  brCode?: string;
  paymentLinkID?: string;
  paymentLinkUrl?: string;
  splits?: { id: string; pixKey: string; value: number; status: string }[];
  createdAt: string;
  paidAt?: string;
}

@Injectable()
export class WooviPixAdapter {
  readonly adapterName = 'WOOVI_PIX';
  private readonly logger = new Logger(WooviPixAdapter.name);
  private cfg: WooviConfig;
  private baseUrl: string;
  private appId: string;
  private fromPixKey: string;

  constructor(configService?: ConfigService) {
    const env = configService ? {
      get: (k: string) => configService.get<string>(k) ?? process.env[k]
    } as any : process.env;
    this.cfg = buildWooviConfig(env);
    this.baseUrl = this.cfg.apiUrl;
    this.appId = this.cfg.appId;
    this.fromPixKey = this.cfg.fromPixKey;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.appId
    };
  }

  /**
   * Cria uma cobrança PIX com split nativo
   * Split = NESTED na charge, não precisa /transfer depois
   */
  async createCharge(payload: WooviChargePayload): Promise<WooviCharge> {
    const body: any = { ...payload };
    if (!body.comment) body.comment = `NextGen-${payload.correlationID}`;
    if (!body.expiresIn) body.expiresIn = 3600; // 1h

    this.logger.log(`📤 Woovi charge: value=${payload.value} splits=${payload.splits?.length || 0}`);

    const r = await fetch(`${this.baseUrl}/api/v1/charge`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const errText = await r.text();
      this.logger.error(`Woovi charge error: ${r.status} ${errText}`);
      throw new Error(`Woovi charge error: ${r.status} - ${errText}`);
    }

    const data = await r.json() as any;
    const charge: WooviCharge = {
      id: data.charge?.id || data.id,
      identifier: data.charge?.identifier || data.identifier,
      correlationID: data.charge?.correlationID || data.correlationID,
      status: data.charge?.status || data.status,
      value: data.charge?.value ?? data.value,
      qrCodeImage: data.charge?.qrCodeImage || data.qrCodeImage,
      brCode: data.charge?.brCode || data.brCode,
      paymentLinkID: data.charge?.paymentLinkID || data.paymentLinkID,
      splits: data.charge?.splits || data.splits,
      createdAt: data.charge?.createdAt || data.createdAt
    };

    this.logger.log(`✅ Woovi charge created: ${charge.id} (R$ ${(charge.value / 100).toFixed(2)})`);
    return charge;
  }

  /**
   * Cria charge com split (helper de mercado)
   * Cobrar R$ totalCents, dividir entre NextGen (3%) + Partner (97%)
   */
  async createChargeWithSplit(opts: {
    correlationID: string;
    totalCents: number;
    nextgenCents: number;
    partnerCents: number;
    nextgenPixKey: string;
    partnerPixKey: string;
    customer?: { name?: string; email?: string; taxID?: string; phone?: string };
    comment?: string;
  }): Promise<WooviCharge> {
    // Valida split
    const splitSum = opts.nextgenCents + opts.partnerCents;
    if (splitSum !== opts.totalCents) {
      throw new Error(`Split mismatch: ${opts.nextgenCents} + ${opts.partnerCents} = ${splitSum} != ${opts.totalCents}`);
    }

    return this.createCharge({
      correlationID: opts.correlationID,
      value: opts.totalCents,
      comment: opts.comment || `NextGen split ${opts.correlationID}`,
      customer: opts.customer,
      splits: [
        { pixKey: opts.nextgenPixKey, value: opts.nextgenCents },
        { pixKey: opts.partnerPixKey, value: opts.partnerCents }
      ]
    });
  }

  /**
   * Consulta uma cobrança pelo ID
   */
  async getCharge(chargeId: string): Promise<WooviCharge> {
    const r = await fetch(`${this.baseUrl}/api/v1/charge/${chargeId}`, {
      headers: this.headers()
    });
    if (!r.ok) throw new Error(`Woovi getCharge: ${r.status}`);
    const data = await r.json() as any;
    return data.charge || data;
  }

  /**
   * Lista cobranças (paginadas)
   */
  async listCharges(opts: { page?: number; pageSize?: number; status?: string } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (opts.page !== undefined) params.set('page', String(opts.page));
    if (opts.pageSize) params.set('pageSize', String(opts.pageSize));
    if (opts.status) params.set('status', opts.status);

    const r = await fetch(`${this.baseUrl}/api/v1/charge?${params}`, {
      headers: this.headers()
    });
    if (!r.ok) throw new Error(`Woovi listCharges: ${r.status}`);
    return r.json();
  }

  /**
   * PIX OUT (transferência) - requer request access na Woovi
   */
  async createTransfer(opts: {
    value: number;
    pixKey: string;
    correlationID: string;
  }): Promise<any> {
    const r = await fetch(`${this.baseUrl}/api/v1/transfer`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        value: opts.value,
        pixKey: opts.pixKey,
        correlationID: opts.correlationID
      })
    });
    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`Woovi transfer: ${r.status} - ${errText}`);
    }
    return r.json();
  }

  /**
   * Verifica assinatura HMAC do webhook
   * Woovi envia X-Webhook-Signature: sha256=<hex>
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!secret) return true; // sem secret = aceita
    const crypto = require('crypto');
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}
