// ============================================
//  NEXTGEN SMART BILLING — SETTLEMENT MVP
//  Rotas reais com prefixo global:
//  GET  /v1/company-billing/settlements
//  GET  /v1/company-billing/settlements/summary
//  POST /v1/company-billing/settlements/calculate
//  POST /v1/company-billing/settlements/mark-settled
// ============================================

import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

@Controller('company-billing/settlements')
export class SmartBillingSettlementsController {
  @Get()
  async list(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);

    const rows = await prisma.$queryRaw<any[]>`
      SELECT s.*, c.title AS charge_title, c.status AS charge_status, cu.name AS customer_name
      FROM smart_billing_settlements s
      LEFT JOIN smart_billing_charges c ON c.id = s.charge_id
      LEFT JOIN smart_billing_customers cu ON cu.id = c.customer_id
      WHERE s.partner_id = ${partner.id}
      ORDER BY s.created_at DESC
      LIMIT 200
    `;

    return {
      success: true,
      partner: { id: partner.id, slug: partner.slug, name: partner.name },
      settlements: rows.map((r) => this.toCamel(r))
    };
  }

  @Get('summary')
  async summary(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);

    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*)::int AS total_settlements,
        COALESCE(SUM(gross_amount_brl), 0)::text AS gross_amount,
        COALESCE(SUM(nextgen_fee_brl), 0)::text AS nextgen_fee_amount,
        COALESCE(SUM(partner_net_amount_brl), 0)::text AS partner_net_amount,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN partner_net_amount_brl ELSE 0 END), 0)::text AS pending_net_amount,
        COALESCE(SUM(CASE WHEN status = 'SETTLED' THEN partner_net_amount_brl ELSE 0 END), 0)::text AS settled_net_amount,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int AS pending_count,
        COUNT(CASE WHEN status = 'SETTLED' THEN 1 END)::int AS settled_count
      FROM smart_billing_settlements
      WHERE partner_id = ${partner.id}
    `;

    return {
      success: true,
      partner: { id: partner.id, slug: partner.slug, name: partner.name },
      summary: this.toCamel(rows[0])
    };
  }

  @Post('calculate')
  async calculate(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets');

    if (!body.chargeId) {
      return { success: false, error: 'MISSING_CHARGE_ID', message: 'Informe chargeId.' };
    }

    const chargeRows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_billing_charges
      WHERE id = ${body.chargeId} AND partner_id = ${partner.id}
      LIMIT 1
    `;

    const charge = chargeRows[0];
    if (!charge) {
      return { success: false, error: 'CHARGE_NOT_FOUND', message: 'Cobrança não encontrada para esta empresa.' };
    }

    const gross = Number(charge.amount_brl || 0);
    const feeRate = Number(body.feeRate ?? body.takeRate ?? 0);
    const feeFixed = Number(body.feeFixedBrl ?? body.feeFixed ?? 1.5);
    const calculatedFee = this.roundMoney(gross * feeRate + feeFixed);
    const nextgenFee = Math.max(0, Math.min(calculatedFee, gross));
    const partnerNet = this.roundMoney(gross - nextgenFee);
    const id = `set_${randomUUID().replace(/-/g, '')}`;
    const rawData = JSON.stringify({
      product: 'smart-billing',
      providerMode: body.providerMode || 'INTERNAL_LEDGER_FIRST',
      input: { feeRate, feeFixedBrl: feeFixed }
    });

    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_settlements (
        id, partner_id, charge_id, gross_amount_brl, nextgen_fee_brl, partner_net_amount_brl,
        fee_model, fee_rate, fee_fixed_brl, status, provider, provider_ref, raw_data
      ) VALUES (
        ${id}, ${partner.id}, ${charge.id}, ${gross}::numeric, ${nextgenFee}::numeric, ${partnerNet}::numeric,
        'FIXED_PLUS_RATE', ${feeRate}::numeric, ${feeFixed}::numeric, 'PENDING', 'internal-ledger', NULL, ${rawData}::jsonb
      )
      ON CONFLICT (charge_id)
      DO UPDATE SET
        gross_amount_brl = EXCLUDED.gross_amount_brl,
        nextgen_fee_brl = EXCLUDED.nextgen_fee_brl,
        partner_net_amount_brl = EXCLUDED.partner_net_amount_brl,
        fee_model = EXCLUDED.fee_model,
        fee_rate = EXCLUDED.fee_rate,
        fee_fixed_brl = EXCLUDED.fee_fixed_brl,
        raw_data = EXCLUDED.raw_data,
        updated_at = now()
      RETURNING *
    `;

    return {
      success: true,
      message: 'Repasse calculado. Próximo passo: conectar ao provedor de split/repasse.',
      settlement: this.toCamel(rows[0]),
      calculation: {
        grossAmountBrl: gross.toFixed(2),
        nextgenFeeBrl: nextgenFee.toFixed(2),
        partnerNetAmountBrl: partnerNet.toFixed(2),
        feeRate,
        feeFixedBrl: feeFixed.toFixed(2)
      }
    };
  }

  @Post('mark-settled')
  async markSettled(@Body() body: any) {
    await this.ensureTables();

    if (!body.settlementId && !body.chargeId) {
      return { success: false, error: 'MISSING_SETTLEMENT', message: 'Informe settlementId ou chargeId.' };
    }

    const rows = body.settlementId
      ? await prisma.$queryRaw<any[]>`
          UPDATE smart_billing_settlements
          SET status = 'SETTLED', provider_ref = ${body.providerRef || null}, settled_at = now(), updated_at = now()
          WHERE id = ${body.settlementId}
          RETURNING *
        `
      : await prisma.$queryRaw<any[]>`
          UPDATE smart_billing_settlements
          SET status = 'SETTLED', provider_ref = ${body.providerRef || null}, settled_at = now(), updated_at = now()
          WHERE charge_id = ${body.chargeId}
          RETURNING *
        `;

    if (!rows.length) {
      return { success: false, error: 'SETTLEMENT_NOT_FOUND', message: 'Repasse não encontrado.' };
    }

    return { success: true, message: 'Repasse marcado como liquidado.', settlement: this.toCamel(rows[0]) };
  }

  private async ensureTables() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_billing_settlements (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        charge_id text NOT NULL,
        gross_amount_brl numeric(18,2) NOT NULL,
        nextgen_fee_brl numeric(18,2) NOT NULL,
        partner_net_amount_brl numeric(18,2) NOT NULL,
        fee_model text NOT NULL DEFAULT 'FIXED_PLUS_RATE',
        fee_rate numeric(10,6) NOT NULL DEFAULT 0,
        fee_fixed_brl numeric(18,2) NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'PENDING',
        provider text NOT NULL DEFAULT 'internal-ledger',
        provider_ref text,
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        settled_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sbs_charge_unique ON smart_billing_settlements(charge_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sbs_partner_status ON smart_billing_settlements(partner_id, status)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sbs_created ON smart_billing_settlements(created_at)`);
  }

  private async getOrCreatePartner(slug: string, name?: string) {
    return prisma.partner.upsert({
      where: { slug },
      update: name ? { name } : {},
      create: {
        slug,
        name: name || this.titleFromSlug(slug),
        type: 'FINTECH' as any,
        config: {},
        commissionRate: 0.03,
        tier: 'STARTER' as any
      } as any
    });
  }

  private toCamel(row: any) {
    if (!row) return row;
    const out: any = {};
    for (const [key, value] of Object.entries(row)) {
      out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
    }
    return out;
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private titleFromSlug(slug: string) {
    return slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
