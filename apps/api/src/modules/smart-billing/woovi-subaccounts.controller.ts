import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
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
      service: 'nextgen-receiving-account-engine',
      status: 'ready',
      hasProviderKey: !!process.env.WOOVI_APP_ID,
      defaultNextgenRate: Number(process.env.NEXTGEN_PIX_COMMISSION_RATE || 0),
      expectedProviderFeeCents: Number(process.env.WOOVI_EXPECTED_FEE_CENTS || 51),
      directWithdrawLocked: true,
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

    const name = body.name || body.companyName || body.customerName || partner.name;
    const pixKey = body.pixKey || body.chavePix || body.receivingPixKey;
    if (!name) return { success: false, error: 'MISSING_NAME' };
    if (!pixKey) return { success: false, error: 'MISSING_PIX_KEY' };

    const customerId = await this.resolveCustomerId(partner.id, body.customerId, body.externalCustomerId);
    const payload = { name, pixKey };
    const result = await this.woovi('POST', '/api/v1/subaccount', payload);
    const providerSubaccountId = result.data?.subAccount?.id || result.data?.subaccount?.id || result.data?.id || null;
    const status = result.ok ? 'ACTIVE' : 'ERROR';
    const rawData = JSON.stringify({ request: this.mask(payload), response: result.data || result.text, status: result.status, providerSubaccountId, scope: customerId ? 'payer-specific' : 'merchant-receiving-account' });

    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_billing_woovi_subaccounts
      WHERE partner_id = ${partner.id}
        AND customer_id IS NOT DISTINCT FROM ${customerId || null}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (existing.length) {
      const updated = await prisma.$queryRaw<any[]>`
        UPDATE smart_billing_woovi_subaccounts
        SET provider_subaccount_id = ${providerSubaccountId || existing[0].provider_subaccount_id},
            pix_key = ${pixKey},
            name = ${name},
            pix_key_masked = ${this.maskText(pixKey)},
            status = ${status},
            raw_data = COALESCE(raw_data, '{}'::jsonb) || ${rawData}::jsonb,
            updated_at = now()
        WHERE id = ${existing[0].id}
        RETURNING *
      `;
      return {
        success: result.ok,
        action: 'updated',
        message: result.ok ? 'Conta de recebimento preparada.' : 'Conta salva localmente, mas houve erro no provedor.',
        receivingAccount: this.toSafeCamel(updated[0]),
        provider: { status: result.status, response: result.data || result.text }
      };
    }

    const localId = `wsa_${randomUUID().replace(/-/g, '')}`;
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_woovi_subaccounts (
        id, partner_id, customer_id, provider_subaccount_id, pix_key, name, pix_key_masked, status, raw_data
      ) VALUES (
        ${localId}, ${partner.id}, ${customerId || null}, ${providerSubaccountId || null}, ${pixKey}, ${name}, ${this.maskText(pixKey)}, ${status}, ${rawData}::jsonb
      ) RETURNING *
    `;

    return {
      success: result.ok,
      action: 'created',
      message: result.ok ? 'Conta de recebimento preparada.' : 'Erro ao preparar conta de recebimento.',
      receivingAccount: this.toSafeCamel(rows[0]),
      provider: { status: result.status, response: result.data || result.text }
    };
  }

  @Post('create-charge')
  async createCharge(@Body() body: any) {
    await this.ensureTables();
    const chargeId = body.chargeId || body.smartChargeId;
    if (!chargeId) return { success: false, error: 'MISSING_CHARGE_ID' };

    const chargeRows = await prisma.$queryRaw<any[]>`
      SELECT c.*, cu.name AS customer_name, cu.document AS customer_document, cu.email AS customer_email, cu.phone AS customer_phone
      FROM smart_billing_charges c
      JOIN smart_billing_customers cu ON cu.id = c.customer_id
      WHERE c.id = ${chargeId}
      LIMIT 1
    `;
    if (!chargeRows.length) return { success: false, error: 'CHARGE_NOT_FOUND' };
    const charge = chargeRows[0];

    const receivingPixKey = body.pixKey || body.subaccountPixKey || body.partnerPixKey || await this.findMerchantReceivingPixKey(charge.partner_id);
    if (!receivingPixKey) {
      return { success: false, error: 'MISSING_RECEIVING_PIX_KEY', message: 'Cadastre a chave Pix da subconta antes de gerar a cobrança.' };
    }

    const totalCents = Math.round(Number(charge.amount_brl || 0) * 100);
    const nextgenRate = Number(body.nextgenRate ?? body.commissionRate ?? process.env.NEXTGEN_PIX_COMMISSION_RATE ?? 0);
    const nextgenCents = Math.max(0, Math.floor(totalCents * nextgenRate));
    const providerFeeReserveCents = this.resolveProviderFeeReserveCents(body, totalCents);
    const partnerCents = Math.max(0, totalCents - nextgenCents - providerFeeReserveCents);

    if (partnerCents <= 0) {
      return {
        success: false,
        error: 'SPLIT_TOO_SMALL',
        message: 'Valor muito baixo para cobrir taxa estimada e split da subconta.',
        split: {
          total: this.formatBrl(totalCents),
          merchant: this.formatBrl(partnerCents),
          platform: this.formatBrl(nextgenCents),
          providerFeeReserve: this.formatBrl(providerFeeReserveCents)
        }
      };
    }

    const correlationID = body.correlationID || `ng-${charge.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 26)}`;

    const payload: any = {
      correlationID,
      value: totalCents,
      comment: body.comment || charge.title || 'NextGen Recebimento Inteligente',
      splits: [{ pixKey: receivingPixKey, value: partnerCents, splitType: 'SPLIT_SUB_ACCOUNT' }],
      expiresIn: Number(body.expiresIn || 86400)
    };

    const customer = this.buildProviderCustomer(charge);
    if (customer) payload.customer = customer;

    const result = await this.woovi('POST', '/api/v1/charge', payload);
    const payment = this.extractPayment(result.data);
    const link = payment.paymentLink || charge.payment_link;
    const rawMerge = JSON.stringify({
      paymentProvider: {
        correlationID,
        splitType: 'SPLIT_SUB_ACCOUNT',
        totalCents,
        merchantCents: partnerCents,
        platformCents: nextgenCents,
        providerFeeReserveCents,
        customerSent: !!customer,
        paymentLink: payment.paymentLink || null,
        createdAt: new Date().toISOString()
      }
    });

    await prisma.$executeRawUnsafe(
      `UPDATE smart_billing_charges
       SET provider = 'woovi', provider_ref = $1, payment_method = 'PIX_PROVIDER', payment_link = COALESCE($2, payment_link),
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
      message: result.ok ? 'Pix criado com split para subconta.' : 'Erro ao criar Pix.',
      chargeId: charge.id,
      correlationID,
      split: {
        total: this.formatBrl(totalCents),
        merchant: this.formatBrl(partnerCents),
        platform: this.formatBrl(nextgenCents),
        providerFeeReserve: this.formatBrl(providerFeeReserveCents)
      },
      payment,
      provider: { status: result.status, response: result.data || result.text }
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
    return { success: true, count: rows.length, receivingAccounts: rows.map((row) => this.toSafeCamel(row)) };
  }

  @Post('withdraw')
  async withdraw(@Body() body: any, @Query('secret') secret: string, @Headers() headers: any) {
    await this.ensureTables();

    const expected = process.env.NEXTGEN_WITHDRAW_SECRET || process.env.NEXTGEN_WOOVI_WITHDRAW_SECRET || '';
    const provided = secret || body?.secret || headers?.['x-nextgen-withdraw-secret'];

    if (!expected) {
      return {
        success: false,
        error: 'DIRECT_WITHDRAW_DISABLED',
        message: 'Saque direto da subconta bloqueado. Configure NEXTGEN_WITHDRAW_SECRET apenas quando a operação automática/lote estiver pronta.'
      };
    }

    if (provided !== expected) {
      return {
        success: false,
        error: 'INVALID_WITHDRAW_SECRET',
        message: 'Saque direto exige secret operacional.'
      };
    }

    if (body.confirmWithdraw !== true && body.confirm !== true) {
      return {
        success: false,
        error: 'MISSING_CONFIRMATION',
        message: 'Envie confirmWithdraw=true para confirmar saque real.'
      };
    }

    const pixKey = body.pixKey || body.chavePix || await this.findMerchantReceivingPixKeyByLocalId(body.subaccountId);
    if (!pixKey) return { success: false, error: 'MISSING_PIX_KEY' };

    const result = await this.woovi('POST', `/api/v1/subaccount/${encodeURIComponent(pixKey)}/withdraw`, {});
    return {
      success: result.ok,
      message: result.ok ? 'Repasse solicitado.' : 'Erro ao solicitar repasse.',
      provider: { status: result.status, response: result.data || result.text }
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

  private async findMerchantReceivingPixKey(partnerId: string) {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT pix_key, provider_subaccount_id
      FROM smart_billing_woovi_subaccounts
      WHERE partner_id = ${partnerId} AND customer_id IS NULL AND status = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rows[0]?.pix_key || rows[0]?.provider_subaccount_id || null;
  }

  private async findMerchantReceivingPixKeyByLocalId(subaccountId?: string) {
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

  private resolveProviderFeeReserveCents(body: any, totalCents: number) {
    const explicit = body.providerFeeReserveCents ?? body.estimatedProviderFeeCents ?? body.providerFeeCents;
    if (explicit !== undefined && explicit !== null && explicit !== '') return Math.max(0, Math.round(Number(explicit)));
    const env = Number(process.env.WOOVI_EXPECTED_FEE_CENTS || 51);
    const percentReserve = Math.ceil(totalCents * Number(process.env.WOOVI_EXPECTED_FEE_RATE || 0));
    return Math.max(0, Math.round(Math.max(env, percentReserve)));
  }

  private buildProviderCustomer(charge: any) {
    const taxID = this.onlyDigits(charge.customer_document);
    const email = String(charge.customer_email || '').trim();
    const phone = String(charge.customer_phone || '').trim();
    if (!taxID && !email && !phone) return null;

    const customer: any = { name: charge.customer_name || 'Cliente' };
    if (taxID) customer.taxID = taxID;
    if (email) customer.email = email;
    if (phone) customer.phone = phone;
    return customer;
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
      create: { slug, name: this.titleFromSlug(slug), type: 'FINTECH' as any, config: {}, commissionRate: 0, tier: 'STARTER' as any } as any
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

  private onlyDigits(value: any) {
    return String(value || '').replace(/\D/g, '') || null;
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
