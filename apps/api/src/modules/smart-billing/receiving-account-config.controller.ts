import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

@Controller('company-billing/receiving-account-config')
export class ReceivingAccountConfigController {
  @Get('health')
  async health() {
    await this.ensureTables();
    return {
      success: true,
      service: 'nextgen-receiving-account-config',
      routes: [
        'GET /v1/company-billing/receiving-account-config?partnerSlug=nextgen-assets',
        'POST /v1/company-billing/receiving-account-config/save'
      ]
    };
  }

  @Get()
  async current(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);

    const rows = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM smart_billing_woovi_subaccounts
      WHERE partner_id = ${partner.id}
        AND customer_id IS NULL
      ORDER BY
        CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END,
        updated_at DESC,
        created_at DESC
      LIMIT 1
    `;

    return {
      success: true,
      partner: { id: partner.id, slug: partner.slug, name: partner.name },
      configured: rows.length > 0,
      receivingAccount: rows[0] ? this.toSafeCamel(rows[0]) : null
    };
  }

  @Post('save')
  async save(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets', body.partnerName || body.companyName);

    const name = body.name || body.companyName || partner.name;
    const pixKey = body.pixKey || body.chavePix || body.receivingPixKey || body.subaccountPixKey;

    if (!name) return { success: false, error: 'MISSING_NAME', message: 'Informe o nome da empresa/conta recebedora.' };
    if (!pixKey) return { success: false, error: 'MISSING_PIX_KEY', message: 'Informe a chave Pix da subconta recebedora.' };

    const rawData = JSON.stringify({
      source: body.source || 'receiving-account-config',
      configuredAt: new Date().toISOString(),
      mode: 'LOCAL_LINK',
      note: 'Chave Pix de subconta vinculada localmente. Não chama saque e não movimenta dinheiro.'
    });

    const existing = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM smart_billing_woovi_subaccounts
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

      return {
        success: true,
        action: 'updated',
        message: 'Conta recebedora configurada localmente.',
        partner: { id: partner.id, slug: partner.slug, name: partner.name },
        receivingAccount: this.toSafeCamel(updated[0])
      };
    }

    const id = `wsa_${randomUUID().replace(/-/g, '')}`;
    const created = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_woovi_subaccounts (
        id, partner_id, customer_id, provider_subaccount_id, pix_key, name, pix_key_masked, status, raw_data
      ) VALUES (
        ${id}, ${partner.id}, NULL, NULL, ${pixKey}, ${name}, ${this.maskText(pixKey)}, 'ACTIVE', ${rawData}::jsonb
      ) RETURNING *
    `;

    return {
      success: true,
      action: 'created',
      message: 'Conta recebedora configurada localmente.',
      partner: { id: partner.id, slug: partner.slug, name: partner.name },
      receivingAccount: this.toSafeCamel(created[0])
    };
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

  private async getOrCreatePartner(slug: string, name?: string) {
    return prisma.partner.upsert({
      where: { slug },
      update: name ? { name } : {},
      create: { slug, name: name || this.titleFromSlug(slug), type: 'FINTECH' as any, config: {}, commissionRate: 0, tier: 'STARTER' as any } as any
    });
  }

  private maskText(value: string) {
    const str = String(value || '').trim();
    if (!str) return '';
    if (str.length <= 6) return '******';
    return `${str.slice(0, 3)}******${str.slice(-3)}`;
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
