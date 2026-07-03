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
    const providerSubaccountId = result.data?.subAccount?.id || result.data?.subaccount?.id || result.data?.id || result.data?.subAccount?.pixKey || pixKey;
    const status = result.ok ? 'ACTIVE' : 'ERROR';

    const localId = `wsa_${randomUUID().replace(/-/g, '')}`;
    const rawData = JSON.stringify({ request: this.mask(payload), response: result.data || result.text, status: result.status });

    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_woovi_subaccounts (
        id, partner_id, customer_id, provider_subaccount_id, name, pix_key_masked, status, raw_data
      ) VALUES (
        ${localId}, ${partner.id}, ${customerId || null}, ${providerSubaccountId || null}, ${name}, ${this.maskText(pixKey)}, ${status}, ${rawData}::jsonb
      ) RETURNING *
    `;

    return {
      success: result.ok,
      message: result.ok ? 'Subconta Woovi criada/vinculada.' : 'Erro ao criar subconta Woovi.',
      subaccount: this.toCamel(rows[0]),
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
    return { success: true, count: rows.length, subaccounts: rows.map((row) => this.toCamel(row)) };
  }

  @Post('withdraw')
  async withdraw(@Body() body: any) {
    await this.ensureTables();
    const pixKey = body.pixKey || body.chavePix || body.providerSubaccountId;
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
        name text NOT NULL,
        pix_key_masked text NOT NULL,
        status text NOT NULL DEFAULT 'PENDING',
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
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
    for (const [key, val] of Object.entries(value)) {
      out[key] = key.toLowerCase().includes('pix') ? this.maskText(String(val || '')) : this.mask(val);
    }
    return out;
  }

  private maskText(value: string) {
    const str = String(value || '').trim();
    if (!str) return '';
    if (str.length <= 6) return '******';
    return `${str.slice(0, 3)}******${str.slice(-3)}`;
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
