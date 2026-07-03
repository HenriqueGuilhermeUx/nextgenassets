import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

@Controller('company-billing/receiving-accounts')
export class ReceivingAccountsController {
  @Get('health')
  async health() {
    await this.ensureTables();
    return {
      success: true,
      service: 'nextgen-receiving-accounts',
      status: 'ready',
      routes: [
        'POST /v1/company-billing/receiving-accounts/link',
        'GET /v1/company-billing/receiving-accounts?partnerSlug=nextgen-assets',
        'POST /v1/company-billing/receiving-accounts/withdraw'
      ]
    };
  }

  @Post('link')
  async link(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets', body.companyName);
    const pixKey = body.receivingPixKey || body.pixKey || body.chavePix;
    const name = body.companyName || body.name || partner.name || 'Conta NextGen';

    if (!pixKey) return { success: false, error: 'MISSING_PIX_KEY', message: 'Informe a chave Pix de repasse.' };

    const rawData = JSON.stringify({
      source: 'receiving-account-link',
      mode: 'existing-provider-account',
      linkedAt: new Date().toISOString()
    });

    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_billing_woovi_subaccounts
      WHERE partner_id = ${partner.id}
        AND customer_id IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (existing.length) {
      const updated = await prisma.$queryRaw<any[]>`
        UPDATE smart_billing_woovi_subaccounts
        SET name = ${name},
            pix_key = ${pixKey},
            pix_key_masked = ${this.maskText(pixKey)},
            status = 'ACTIVE',
            raw_data = COALESCE(raw_data, '{}'::jsonb) || ${rawData}::jsonb,
            updated_at = now()
        WHERE id = ${existing[0].id}
        RETURNING *
      `;
      return { success: true, action: 'updated', message: 'Conta de repasse vinculada.', receivingAccount: this.toSafeCamel(updated[0]) };
    }

    const id = `rac_${randomUUID().replace(/-/g, '')}`;
    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_woovi_subaccounts (
        id, partner_id, customer_id, provider_subaccount_id, pix_key, name, pix_key_masked, status, raw_data
      ) VALUES (
        ${id}, ${partner.id}, null, null, ${pixKey}, ${name}, ${this.maskText(pixKey)}, 'ACTIVE', ${rawData}::jsonb
      ) RETURNING *
    `;

    return { success: true, action: 'created', message: 'Conta de repasse vinculada.', receivingAccount: this.toSafeCamel(inserted[0]) };
  }

  @Get()
  async list(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_billing_woovi_subaccounts
      WHERE partner_id = ${partner.id}
        AND customer_id IS NULL
      ORDER BY created_at DESC
      LIMIT 20
    `;
    return { success: true, count: rows.length, receivingAccounts: rows.map((row) => this.toSafeCamel(row)) };
  }

  @Post('withdraw')
  async withdraw(@Body() body: any) {
    await this.ensureTables();
    const pixKey = body.receivingPixKey || body.pixKey || await this.findLinkedPixKey(body.partnerSlug || 'nextgen-assets');
    if (!pixKey) return { success: false, error: 'MISSING_PIX_KEY', message: 'Não encontrei uma chave Pix de repasse vinculada.' };

    const result = await this.provider('POST', `/api/v1/subaccount/${encodeURIComponent(pixKey)}/withdraw`, {});
    return {
      success: result.ok,
      message: result.ok ? 'Solicitação de repasse enviada.' : 'Erro ao solicitar repasse.',
      provider: { status: result.status, response: result.data || result.text }
    };
  }

  private async findLinkedPixKey(partnerSlug: string) {
    const partner = await this.getOrCreatePartner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT pix_key
      FROM smart_billing_woovi_subaccounts
      WHERE partner_id = ${partner.id}
        AND customer_id IS NULL
        AND status = 'ACTIVE'
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    return rows[0]?.pix_key || null;
  }

  private async provider(method: 'POST', path: string, body: any) {
    const appId = process.env.WOOVI_APP_ID || '';
    if (!appId) return { ok: false, status: 0, data: { error: 'MISSING_PROVIDER_KEY' }, text: 'MISSING_PROVIDER_KEY' };

    const base = (process.env.WOOVI_API_URL || 'https://api.woovi.com').replace(/\/$/, '');
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: appId, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body || {})
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
  }

  private async getOrCreatePartner(slug: string, name?: string) {
    return prisma.partner.upsert({
      where: { slug },
      update: name ? { name } : {},
      create: { slug, name: name || this.titleFromSlug(slug), type: 'FINTECH' as any, config: {}, commissionRate: 0.03, tier: 'STARTER' as any } as any
    });
  }

  private maskText(value: string) {
    const str = String(value || '').trim();
    if (!str) return '';
    if (str.length <= 6) return '******';
    return `${str.slice(0, 3)}******${str.slice(-3)}`;
  }

  private toSafeCamel(row: any) {
    if (!row) return row;
    const out: any = {};
    for (const [key, value] of Object.entries(row)) out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
    if (out.pixKey) out.pixKey = this.maskText(out.pixKey);
    return out;
  }

  private titleFromSlug(slug: string) {
    return slug.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
}
