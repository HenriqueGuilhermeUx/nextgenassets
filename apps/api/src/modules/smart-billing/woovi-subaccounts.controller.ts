import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

@Controller('company-billing/woovi-subaccounts')
export class WooviSubaccountsController {
  @Get('health')
  async health() {
    await this.ensureTables();
    return {
      success: true,
      service: 'nextgen-woovi-subaccounts',
      status: 'ready',
      hasWooviAppId: !!process.env.WOOVI_APP_ID,
      apiUrl: process.env.WOOVI_API_URL || 'https://api.woovi.com',
      routes: [
        'POST /v1/company-billing/woovi-subaccounts/create',
        'POST /v1/company-billing/woovi-subaccounts/create-charge',
        'GET /v1/company-billing/woovi-subaccounts?partnerSlug=nextgen-assets',
        'POST /v1/company-billing/woovi-subaccounts/withdraw'
      ]
    };
  }

  @Post('create')
  async create(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets');

    const name = body.name || body.companyName || body.customerName;
    const pixKey = body.pixKey || body.chavePix;
    if (!name) return { success: false, error: 'MISSING_NAME' };
    if (!pixKey) return { success: false, error: 'MISSING_PIX_KEY' };

    const customerId = await this.resolveCustomerId(partner.id, body.customerId, body.externalCustomerId);
    const payload = { name, pixKey };
    const result = await this.woovi('POST', '/api/v1/subaccount', payload);
    const providerSubaccountId = result.data?.subAccount?.id || result.data?.subaccount?.id || result.data?.id || null;
    const status = result.ok ? 'ACTIVE' : 'ERROR';

    const localId = `wsa_${randomUUID().replace(/-/g, '')}`;
    const rawData = JSON.stringify({ request: this.mask(payload), response: result.data || result.text, status: result.status, providerSubaccountId });

    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_woovi_subaccounts (
        id, partner_id, customer_id, provider_subaccount_id, pix_key, name, pix_key_masked, status, raw_data
      ) VALUES (
        ${localId}, ${partner.id}, ${customerId || null}, ${providerSubaccountId || null}, ${pixKey}, ${name}, ${this.maskText(pixKey)}, ${status}, ${rawData}::jsonb
      ) RETURNING *
    `;

    return {
      success: result.ok,
      message: result.ok ? 'Subconta Woovi criada/vinculada.' : 'Erro ao criar subconta Woovi.',
      subaccount: this.toSafeCamel(rows[0]),
      woovi: { status: result.status, response: result.data || result.text }
    };
  }

  @Post('create-charge')
  async createCharge(@Body() body: any) {
    await this.ensureTables();
    const chargeId = body.chargeId || body.smartChargeId;
    if (!chargeId) return { success: false, error: 'MISSING_CHARGE_ID' };

    const chargeRows = await prisma.$queryRaw<any[]>`
      SELECT c.*, cu.name AS customer_name, cu.email AS customer_email, cu.phone AS customer_phone
      FROM smart_billing_charges c
      JOIN smart_billing_customers cu ON cu.id = c.customer_id
      WHERE c.id = ${chargeId}
      LIMIT 1
    `;
    if (!chargeRows.length) return { success: false, error: 'CHARGE_NOT_FOUND' };
    const charge = chargeRows[0];

    const subPixKey = body.pixKey || body.subaccountPixKey || body.partnerPixKey || await this.findSavedPixKey(charge.partner_id, charge.customer_id);
    if (!subPixKey) {
      return { success: false, error: 'MISSING_SUBACCOUNT_PIX_KEY', message: 'Cadastre a chave Pix de recebimento do cliente antes de gerar o Pix Woovi.' };
    }

    const totalCents = Math.round(Number(charge.amount_brl || 0) * 100);
    const nextgenRate = Number(body.nextgenRate ?? body.commissionRate ?? 0.03);
    const nextgenCents = Math.max(0, Math.floor(totalCents * nextgenRate));
    const partnerCents = Math.max(0, totalCents - nextgenCents);
    const correlationID = body.correlationID || `ng-${charge.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 26)}`;

    const payload = {
      correlationID,
      value: totalCents,
      comment: body.comment || charge.title || 'NextGen Recebimento Inteligente',
      customer: {
        name: charge.customer_name,
        email: charge.customer_email || undefined,
        phone: charge.customer_phone || undefined
      },
      splits: [{ pixKey: subPixKey, value: partnerCents, splitType: 'SPLIT_SUB_ACCOUNT' }],
      expiresIn: Number(body.expiresIn || 86400)
    };

    const result = await this.woovi('POST', '/api/v1/charge', payload);
    const payment = this.extractPayment(result.data);
    const link = payment.paymentLink || charge.payment_link;
    const rawMerge = JSON.stringify({
      wooviSubaccountCharge: {
        correlationID,
        splitType: 'SPLIT_SUB_ACCOUNT',
        totalCents,
        partnerCents,
        nextgenCents,
        paymentLink: payment.paymentLink || null,
        createdAt: new Date().toISOString()
      }
    });

    await prisma.$executeRawUnsafe(
      `UPDATE smart_billing_charges
       SET provider = 'woovi', provider_ref = $1, payment_method = 'PIX_WOOVI', payment_link = COALESCE($2, payment_link),
           pix_payload = $3::jsonb, raw_data = COALESCE(raw_data, '{}'::jsonb) || $4::jsonb, updated_at = now()
       WHERE id = $5`,
      correlationID,
      link || null,
      JSON.stringify(result.data || result.text || {}),
      rawMerge,
      charge.id
    );

    await this.updateMessages(charge.id, link);

    return {
      success: result.ok,
      message: result.ok ? 'Cobrança Woovi criada com split para subconta.' : 'Erro ao criar cobrança Woovi.',
      chargeId: charge.id,
      correlationID,
      split: {
        total: this.formatBrl(totalCents),
        partner: this.formatBrl(partnerCents),
        nextgen: this.formatBrl(nextgenCents)
      },
      payment,
      woovi: { status: result.status, response: result.data || result.text }
    };
  }

  @Get()
  async list(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_billing_woovi_subaccounts
      WHERE partner_id = ${partner.id}
      ORDER BY created_at DESC
      LIMIT 200
    `;
    return { success: true, count: rows.length, subaccounts: rows.map((row) => this.toSafeCamel(row)) };
  }

  @Post('withdraw')
  async withdraw(@Body() body: any) {
    await this.ensureTables();
    const pixKey = body.pixKey || body.chavePix || await this.findSavedPixKeyByLocalId(body.subaccountId);
    if (!pixKey) return { success: false, error: 'MISSING_PIX_KEY' };

    const result = await this.woovi('POST', `/api/v1/subaccount/${encodeURIComponent(pixKey)}/withdraw`, {});
    return {
      success: result.ok,
      message: result.ok ? 'Saque da subconta solicitado.' : 'Erro ao solicitar saque da subconta.',
      woovi: { status: result.status, response: result.data || result.text }
    };
  }

  private async woovi(method: 'GET' | 'POST', path: string, body?: any) {
    const appId = process.env.WOOVI_APP_ID || '';
    if (!appId) return { ok: false, status: 0, data: { error: 'MISSING_WOOVI_APP_ID' }, text: 'MISSING_WOOVI_APP_ID' };

    const base = (process.env.WOOVI_API_URL || 'https://api.woovi.com').replace(/\/$/, '');
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: appId, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: method === 'POST' ? JSON.stringify(body || {}) : undefined
    });
    const text = await response.text();
    let data: any = text;
    try { data = JSON.parse(text); } catch {}
    return { ok: response.ok, status: response.status, data, text };
  }

  private async ensureTables() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_billing_woovi_subaccounts (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        customer_id text,
        provider_subaccount_id text,
        pix_key text,
        name text NOT NULL,
        pix_key_masked text NOT NULL,
        status text NOT NULL DEFAULT 'PENDING',
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE smart_billing_woovi_subaccounts ADD COLUMN IF NOT EXISTS pix_key text`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_wsa_partner_status ON smart_billing_woovi_subaccounts(partner_id, status)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_wsa_customer ON smart_billing_woovi_subaccounts(customer_id)`);
  }

  private async resolveCustomerId(partnerId: string, customerId?: string, externalCustomerId?: string) {
    if (customerId) return customerId;
    if (!externalCustomerId) return null;
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id FROM smart_billing_customers
      WHERE partner_id = ${partnerId} AND external_customer_id = ${externalCustomerId}
      LIMIT 1
    `;
    return rows[0]?.id || null;
  }

  private async findSavedPixKey(partnerId: string, customerId: string) {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT pix_key, provider_subaccount_id
      FROM smart_billing_woovi_subaccounts
      WHERE partner_id = ${partnerId} AND customer_id = ${customerId} AND status = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rows[0]?.pix_key || rows[0]?.provider_subaccount_id || null;
  }

  private async findSavedPixKeyByLocalId(subaccountId?: string) {
    if (!subaccountId) return null;
    const rows = await prisma.$queryRaw<any[]>`
      SELECT pix_key, provider_subaccount_id
      FROM smart_billing_woovi_subaccounts
      WHERE id = ${subaccountId}
      LIMIT 1
    `;
    return rows[0]?.pix_key || rows[0]?.provider_subaccount_id || null;
  }

  private async updateMessages(chargeId: string, link?: string | null) {
    if (!link) return;
    try {
      await prisma.$executeRawUnsafe(`UPDATE smart_billing_notifications SET message = regexp_replace(message, 'https://[^ ]+', $1, 'g'), updated_at = now() WHERE charge_id = $2 AND status = 'PENDING'`, link, chargeId);
      await prisma.$executeRawUnsafe(`UPDATE smart_billing_reminders SET message = regexp_replace(message, 'https://[^ ]+', $1, 'g'), updated_at = now() WHERE charge_id = $2 AND status = 'PENDING'`, link, chargeId);
    } catch {}
  }

  private extractPayment(data: any) {
    const root = data?.charge || data?.data?.charge || data?.data || data || {};
    return {
      providerChargeId: root.id || root.identifier || root.globalID || data?.id || null,
      paymentLink: root.paymentLinkUrl || root.paymentLink || root.checkoutUrl || root.url || data?.paymentLink || null,
      brCode: root.brCode || root.pixCode || root.qrCode || data?.brCode || null,
      qrCodeImage: root.qrCodeImage || root.qrCodeImageUrl || data?.qrCodeImage || null
    };
  }

  private async getOrCreatePartner(slug: string) {
    return prisma.partner.upsert({
      where: { slug },
      update: {},
      create: { slug, name: this.titleFromSlug(slug), type: 'FINTECH' as any, config: {}, commissionRate: 0.03, tier: 'STARTER' as any } as any
    });
  }

  private mask(value: any): any {
    if (Array.isArray(value)) return value.map((item) => this.mask(item));
    if (!value || typeof value !== 'object') return value;
    const out: any = {};
    for (const [key, val] of Object.entries(value)) out[key] = key.toLowerCase().includes('pix') ? this.maskText(String(val || '')) : this.mask(val);
    return out;
  }

  private maskText(value: string) {
    const str = String(value || '').trim();
    if (!str) return '';
    if (str.length <= 6) return '******';
    return `${str.slice(0, 3)}******${str.slice(-3)}`;
  }

  private formatBrl(cents: number) {
    return (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private toSafeCamel(row: any) {
    const out = this.toCamel(row);
    if (out?.pixKey) out.pixKey = this.maskText(out.pixKey);
    return out;
  }

  private toCamel(row: any) {
    if (!row) return row;
    const out: any = {};
    for (const [key, value] of Object.entries(row)) out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
    return out;
  }

  private titleFromSlug(slug: string) {
    return slug.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
}
