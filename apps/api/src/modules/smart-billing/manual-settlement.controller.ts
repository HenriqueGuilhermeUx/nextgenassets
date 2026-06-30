// ============================================
//  NEXTGEN SMART BILLING — MANUAL SETTLEMENT
//  Rotas reais com prefixo global:
//  POST /v1/company-billing/manual-settlements
//  GET  /v1/company-billing/manual-settlements/pending
//  GET  /v1/company-billing/manual-settlements/summary
//  POST /v1/company-billing/manual-settlements/:id/mark-received
//  POST /v1/company-billing/manual-settlements/:id/mark-repassed
//  POST /v1/company-billing/manual-settlements/:id/cancel
// ============================================

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

@Controller('company-billing/manual-settlements')
export class ManualSettlementController {
  @Post()
  async create(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets', body.partnerName);

    const grossCents = this.toCents(body.grossCents ?? body.valueCents ?? body.amountCents ?? body.value ?? body.amount);
    if (grossCents < 100) {
      return { success: false, error: 'MIN_VALUE', message: 'Valor minimo recomendado: R$ 1,00.' };
    }

    const nextgenRate = Number(body.nextgenRate ?? body.commissionRate ?? 0.03);
    const providerFeeCents = Math.max(0, Math.round(Number(body.providerFeeCents ?? body.gatewayFeeCents ?? 0)));
    const fixedFeeCents = Math.max(0, Math.round(Number(body.fixedFeeCents ?? body.nextgenFixedFeeCents ?? 0)));
    const nextgenCents = Math.min(grossCents, Math.floor(grossCents * nextgenRate) + fixedFeeCents);
    const partnerNetCents = Math.max(0, grossCents - nextgenCents - providerFeeCents);

    if (partnerNetCents < 0 || nextgenCents + providerFeeCents > grossCents) {
      return { success: false, error: 'INVALID_SPLIT', message: 'Taxas maiores que o valor recebido.' };
    }

    const id = `mst_${randomUUID().replace(/-/g, '')}`;
    const status = body.received === true ? 'REPASS_PENDING' : 'EXPECTED';
    const recipientRef = this.maskRef(body.recipientRef || body.recipientPixKey || body.recipientAccount || '');
    const rawData = JSON.stringify({
      source: body.source || 'manual-start',
      chargeId: body.chargeId || null,
      customerName: body.customerName || null,
      description: body.description || null,
      calculation: { grossCents, nextgenCents, providerFeeCents, partnerNetCents, nextgenRate, fixedFeeCents },
      input: this.sanitizeInput(body)
    });

    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_manual_settlements (
        id, partner_id, charge_id, source_provider, gross_cents, nextgen_cents, provider_fee_cents,
        partner_net_cents, status, recipient_name, recipient_ref_masked, description, raw_data,
        received_at
      ) VALUES (
        ${id}, ${partner.id}, ${body.chargeId || null}, ${body.sourceProvider || body.provider || 'manual'},
        ${grossCents}, ${nextgenCents}, ${providerFeeCents}, ${partnerNetCents}, ${status},
        ${body.recipientName || body.companyName || null}, ${recipientRef || null}, ${body.description || null}, ${rawData}::jsonb,
        ${body.received === true ? new Date() : null}
      ) RETURNING *
    `;

    await this.audit('MANUAL_SETTLEMENT_CREATED', id, { partnerId: partner.id, grossCents, partnerNetCents, status });

    return {
      success: true,
      message: status === 'REPASS_PENDING'
        ? 'Recebimento registrado. Repasse manual pendente.'
        : 'Repasse manual previsto criado. Marque como recebido quando o dinheiro cair.',
      settlement: this.toCamel(rows[0]),
      brl: this.moneyBlock(rows[0])
    };
  }

  @Get('pending')
  async pending(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_billing_manual_settlements
      WHERE partner_id = ${partner.id}
        AND status IN ('EXPECTED', 'REPASS_PENDING')
      ORDER BY created_at ASC
      LIMIT 200
    `;

    return {
      success: true,
      partner: { id: partner.id, slug: partner.slug, name: partner.name },
      count: rows.length,
      settlements: rows.map((r) => ({ ...this.toCamel(r), brl: this.moneyBlock(r) }))
    };
  }

  @Get('summary')
  async summary(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*)::int AS total_count,
        COALESCE(SUM(gross_cents),0)::int AS gross_cents,
        COALESCE(SUM(nextgen_cents),0)::int AS nextgen_cents,
        COALESCE(SUM(provider_fee_cents),0)::int AS provider_fee_cents,
        COALESCE(SUM(partner_net_cents),0)::int AS partner_net_cents,
        COALESCE(SUM(CASE WHEN status = 'EXPECTED' THEN gross_cents ELSE 0 END),0)::int AS expected_cents,
        COALESCE(SUM(CASE WHEN status = 'REPASS_PENDING' THEN partner_net_cents ELSE 0 END),0)::int AS repass_pending_cents,
        COALESCE(SUM(CASE WHEN status = 'REPASSED' THEN partner_net_cents ELSE 0 END),0)::int AS repassed_cents,
        COUNT(CASE WHEN status = 'EXPECTED' THEN 1 END)::int AS expected_count,
        COUNT(CASE WHEN status = 'REPASS_PENDING' THEN 1 END)::int AS repass_pending_count,
        COUNT(CASE WHEN status = 'REPASSED' THEN 1 END)::int AS repassed_count
      FROM smart_billing_manual_settlements
      WHERE partner_id = ${partner.id}
    `;
    const s = rows[0] || {};
    return {
      success: true,
      partner: { id: partner.id, slug: partner.slug, name: partner.name },
      summary: this.toCamel(s),
      brl: {
        gross: this.formatBrl(s.gross_cents),
        nextgen: this.formatBrl(s.nextgen_cents),
        providerFee: this.formatBrl(s.provider_fee_cents),
        partnerNet: this.formatBrl(s.partner_net_cents),
        expected: this.formatBrl(s.expected_cents),
        repassPending: this.formatBrl(s.repass_pending_cents),
        repassed: this.formatBrl(s.repassed_cents)
      }
    };
  }

  @Post(':id/mark-received')
  async markReceived(@Param('id') id: string, @Body() body: any) {
    await this.ensureTables();
    const rows = await prisma.$queryRaw<any[]>`
      UPDATE smart_billing_manual_settlements
      SET status = 'REPASS_PENDING',
          received_at = now(),
          provider_reference = ${body.providerReference || body.paymentReference || body.endToEndId || null},
          notes = COALESCE(notes, '') || ${body.notes ? `\n${body.notes}` : ''},
          updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!rows.length) return { success: false, error: 'NOT_FOUND' };
    await this.audit('MANUAL_SETTLEMENT_RECEIVED', id, { providerReference: body.providerReference || body.paymentReference || body.endToEndId || null });
    return { success: true, message: 'Recebimento confirmado. Repasse manual pendente.', settlement: this.toCamel(rows[0]), brl: this.moneyBlock(rows[0]) };
  }

  @Post(':id/mark-repassed')
  async markRepassed(@Param('id') id: string, @Body() body: any) {
    await this.ensureTables();
    const rows = await prisma.$queryRaw<any[]>`
      UPDATE smart_billing_manual_settlements
      SET status = 'REPASSED',
          repassed_at = now(),
          repass_reference = ${body.repassReference || body.proofReference || body.comprovante || null},
          notes = COALESCE(notes, '') || ${body.notes ? `\n${body.notes}` : ''},
          updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!rows.length) return { success: false, error: 'NOT_FOUND' };
    await this.audit('MANUAL_SETTLEMENT_REPASSED', id, { repassReference: body.repassReference || body.proofReference || body.comprovante || null });
    return { success: true, message: 'Repasse manual marcado como realizado.', settlement: this.toCamel(rows[0]), brl: this.moneyBlock(rows[0]) };
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body() body: any) {
    await this.ensureTables();
    const rows = await prisma.$queryRaw<any[]>`
      UPDATE smart_billing_manual_settlements
      SET status = 'CANCELED',
          notes = COALESCE(notes, '') || ${body.reason ? `\nCancelado: ${body.reason}` : '\nCancelado'},
          updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!rows.length) return { success: false, error: 'NOT_FOUND' };
    await this.audit('MANUAL_SETTLEMENT_CANCELED', id, { reason: body.reason || null });
    return { success: true, message: 'Repasse cancelado.', settlement: this.toCamel(rows[0]) };
  }

  private async ensureTables() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_billing_manual_settlements (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        charge_id text,
        source_provider text NOT NULL DEFAULT 'manual',
        gross_cents int NOT NULL,
        nextgen_cents int NOT NULL,
        provider_fee_cents int NOT NULL DEFAULT 0,
        partner_net_cents int NOT NULL,
        status text NOT NULL DEFAULT 'EXPECTED',
        recipient_name text,
        recipient_ref_masked text,
        description text,
        provider_reference text,
        repass_reference text,
        notes text,
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        received_at timestamptz,
        repassed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_mst_partner_status ON smart_billing_manual_settlements(partner_id, status)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_mst_charge ON smart_billing_manual_settlements(charge_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_mst_created ON smart_billing_manual_settlements(created_at)`);
  }

  private async getOrCreatePartner(slug: string, name?: string) {
    return prisma.partner.upsert({
      where: { slug },
      update: name ? { name } : {},
      create: { slug, name: name || this.titleFromSlug(slug), type: 'FINTECH' as any, config: {}, commissionRate: 0.03, tier: 'STARTER' as any } as any
    });
  }

  private async audit(action: string, resourceId: string, metadata: any) {
    try {
      await prisma.auditLog.create({ data: { action, resource: 'manual_settlement', resourceId, actor: 'system:smart-billing', metadata } as any });
    } catch {
      // AuditLog pode variar por ambiente. Não bloqueia a operação principal.
    }
  }

  private toCents(value: any): number {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return Math.round(value);
    const text = String(value).trim().replace('R$', '').replace(/\./g, '').replace(',', '.');
    const asNumber = Number(text);
    if (!Number.isFinite(asNumber)) return 0;
    if (asNumber > 0 && asNumber < 100 && String(value).includes(',')) return Math.round(asNumber * 100);
    return Math.round(asNumber);
  }

  private sanitizeInput(body: any) {
    const clone = { ...body };
    if (clone.recipientPixKey) clone.recipientPixKey = this.maskRef(clone.recipientPixKey);
    if (clone.recipientAccount) clone.recipientAccount = this.maskRef(clone.recipientAccount);
    if (clone.recipientRef) clone.recipientRef = this.maskRef(clone.recipientRef);
    return clone;
  }

  private maskRef(value: string) {
    const str = String(value || '').trim();
    if (!str) return '';
    if (str.length <= 6) return '******';
    return `${str.slice(0, 3)}******${str.slice(-3)}`;
  }

  private moneyBlock(row: any) {
    return {
      gross: this.formatBrl(row.gross_cents),
      nextgen: this.formatBrl(row.nextgen_cents),
      providerFee: this.formatBrl(row.provider_fee_cents),
      partnerNet: this.formatBrl(row.partner_net_cents)
    };
  }

  private formatBrl(cents: any) {
    return (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private toCamel(row: any) {
    if (!row) return row;
    const out: any = {};
    for (const [key, value] of Object.entries(row)) {
      out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
    }
    return out;
  }

  private titleFromSlug(slug: string) {
    return slug.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
}
