import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const PLAN_DAYS: Record<string, number> = {
  starter: 3,
  growth: 2,
  pro: 1,
  enterprise: 1
};

@Controller('company-billing/payout-requests')
export class SmartBillingPayoutRequestsController {
  @Get('health')
  async health() {
    await this.ensureTables();
    return {
      success: true,
      service: 'nextgen-payout-requests',
      status: 'ready',
      model: 'scheduled_subaccount_balance_requests',
      plans: { starter: 'D+3', growth: 'D+2', pro: 'D+1' },
      routes: [
        'GET /v1/company-billing/payout-requests/balance?partnerSlug=nextgen-assets',
        'POST /v1/company-billing/payout-requests/request',
        'GET /v1/company-billing/payout-requests/pending?partnerSlug=nextgen-assets',
        'POST /v1/company-billing/payout-requests/mark-processed'
      ]
    };
  }

  @Get('balance')
  async balance(@Query('partnerSlug') partnerSlug = 'nextgen-assets', @Query('plan') plan = 'starter') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const receiving = await this.findReceivingAccount(partner.id);
    const stats = await this.computeBalance(partner.id);
    const availableCents = Math.max(0, stats.confirmedCents - stats.reservedCents);

    return {
      success: true,
      partner: { id: partner.id, slug: partner.slug, name: partner.name },
      plan,
      scheduledPayout: `D+${PLAN_DAYS[String(plan).toLowerCase()] || 3}`,
      receivingAccount: receiving ? this.toSafeCamel(receiving) : null,
      balance: {
        confirmed: this.money(stats.confirmedCents),
        reserved: this.money(stats.reservedCents),
        available: this.money(availableCents),
        paidCharges: stats.paidCharges,
        note: 'Saldo estimado por cobranças marcadas como pagas no sistema.'
      }
    };
  }

  @Get('pending')
  async pending(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_billing_payout_requests
      WHERE partner_id = ${partner.id}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return { success: true, count: rows.length, requests: rows.map((row) => this.toCamel(row)) };
  }

  @Post('request')
  async request(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets');
    const plan = String(body.plan || 'starter').toLowerCase();
    const type = body.type || body.kind || 'SCHEDULED';
    const stats = await this.computeBalance(partner.id);
    const availableCents = Math.max(0, stats.confirmedCents - stats.reservedCents);
    const requestedCents = Math.max(0, Math.round(Number(body.amountCents || 0))) || availableCents;

    if (requestedCents <= 0) {
      return { success: false, error: 'NO_AVAILABLE_BALANCE', message: 'Não há saldo confirmado disponível.' };
    }

    const delayDays = type === 'EARLY' ? 0 : (PLAN_DAYS[plan] || 3);
    const scheduledFor = new Date();
    scheduledFor.setUTCDate(scheduledFor.getUTCDate() + delayDays);

    const id = `pyr_${randomUUID().replace(/-/g, '')}`;
    const rawData = JSON.stringify({ source: body.source || 'dashboard', plan, type, requestedAt: new Date().toISOString() });

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_payout_requests (
        id, partner_id, type, status, amount_cents, plan, scheduled_for, raw_data
      ) VALUES (
        ${id}, ${partner.id}, ${type}, ${type === 'EARLY' ? 'REQUESTED' : 'SCHEDULED'}, ${requestedCents}, ${plan}, ${scheduledFor}, ${rawData}::jsonb
      ) RETURNING *
    `;

    return {
      success: true,
      message: type === 'EARLY' ? 'Pedido de repasse antecipado criado.' : 'Repasse programado criado.',
      amount: this.money(requestedCents),
      request: this.toCamel(inserted[0])
    };
  }

  @Post('mark-processed')
  async markProcessed(@Body() body: any) {
    await this.ensureTables();
    const requestId = body.requestId || body.id;
    if (!requestId) return { success: false, error: 'MISSING_REQUEST_ID' };

    const rawMerge = JSON.stringify({ processedBy: body.processedBy || 'operator', providerReference: body.providerReference || null, note: body.note || null, processedAt: new Date().toISOString() });
    const rows = await prisma.$queryRaw<any[]>`
      UPDATE smart_billing_payout_requests
      SET status = ${body.status || 'PROCESSED'}, processed_at = now(), raw_data = COALESCE(raw_data, '{}'::jsonb) || ${rawMerge}::jsonb, updated_at = now()
      WHERE id = ${requestId}
      RETURNING *
    `;

    if (!rows.length) return { success: false, error: 'REQUEST_NOT_FOUND' };
    return { success: true, message: 'Pedido de repasse atualizado.', request: this.toCamel(rows[0]) };
  }

  private async computeBalance(partnerId: string) {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*)::int AS paid_charges,
        COALESCE(SUM(((raw_data->'paymentProvider'->>'merchantCents')::int)),0)::int AS confirmed_cents
      FROM smart_billing_charges
      WHERE partner_id = ${partnerId}
        AND status = 'PAID'
        AND raw_data ? 'paymentProvider'
    `;
    const requests = await prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(amount_cents),0)::int AS reserved_cents
      FROM smart_billing_payout_requests
      WHERE partner_id = ${partnerId} AND status IN ('REQUESTED','SCHEDULED','PROCESSING','PROCESSED')
    `;
    return {
      paidCharges: Number(rows[0]?.paid_charges || 0),
      confirmedCents: Number(rows[0]?.confirmed_cents || 0),
      reservedCents: Number(requests[0]?.reserved_cents || 0)
    };
  }

  private async findReceivingAccount(partnerId: string) {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_billing_woovi_subaccounts
      WHERE partner_id = ${partnerId} AND customer_id IS NULL AND status = 'ACTIVE'
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `;
    return rows[0] || null;
  }

  private async ensureTables() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_billing_payout_requests (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        type text NOT NULL DEFAULT 'SCHEDULED',
        status text NOT NULL DEFAULT 'REQUESTED',
        amount_cents int NOT NULL DEFAULT 0,
        plan text,
        scheduled_for timestamptz NOT NULL DEFAULT now(),
        processed_at timestamptz,
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_payout_req_partner_status ON smart_billing_payout_requests(partner_id, status)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_payout_req_due ON smart_billing_payout_requests(status, scheduled_for)`);
  }

  private async getOrCreatePartner(slug: string, name?: string) {
    return prisma.partner.upsert({
      where: { slug },
      update: name ? { name } : {},
      create: { slug, name: name || this.titleFromSlug(slug), type: 'FINTECH' as any, config: {}, commissionRate: 0.03, tier: 'STARTER' as any } as any
    });
  }

  private money(cents: number) {
    return (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
