// ============================================
//  NEXTGEN SMART BILLING — WOOVI SPLIT
//  Rotas reais com prefixo global:
//  GET  /v1/company-billing/woovi-split/health
//  POST /v1/company-billing/woovi-split/calculate
//  POST /v1/company-billing/woovi-split/create-charge
// ============================================

import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { WooviPixAdapter } from './woovi-pix-adapter';

const prisma = new PrismaClient();

type SplitCalculation = {
  totalCents: number;
  nextgenCents: number;
  partnerCents: number;
  providerFeeCents: number;
  sumCents: number;
  splitSumCents: number;
  ok: boolean;
};

@Controller('company-billing/woovi-split')
export class WooviSmartBillingController {
  private adapter = new WooviPixAdapter();

  @Get('health')
  health() {
    return {
      success: true,
      service: 'woovi-smart-billing-split',
      apiUrl: process.env.WOOVI_API_URL || 'https://api.woovi.com',
      hasAppId: !!process.env.WOOVI_APP_ID,
      hasNextgenPixKey: !!(process.env.WOOVI_NEXTGEN_PIX_KEY || process.env.WOOVI_FROM_PIX_KEY),
      defaultRules: {
        nextgenRate: 0.03,
        providerFeeRate: 0.005,
        minimumChargeCents: 100,
        minimumProviderFeeCents: 1
      },
      strategy: [
        'Woovi fica como motor principal para Pix cobrança com split flexivel.',
        'Efi continua como motor de Open Finance, Pix Automatico e consentimento bancario.',
        'O split enviado para a Woovi inclui NextGen e parceiro; a taxa Woovi fica registrada como custo/retencao estimada.'
      ],
      routes: [
        'POST /v1/company-billing/woovi-split/calculate',
        'POST /v1/company-billing/woovi-split/create-charge'
      ]
    };
  }

  @Post('calculate')
  calculate(@Body() body: any) {
    const totalCents = this.toCents(body.valueCents ?? body.totalCents ?? body.value ?? body.amountCents);
    const calc = this.calculateSplit(totalCents, body);
    return {
      success: calc.ok,
      calculation: calc,
      brl: {
        total: this.formatBrl(calc.totalCents),
        nextgen: this.formatBrl(calc.nextgenCents),
        partner: this.formatBrl(calc.partnerCents),
        providerFee: this.formatBrl(calc.providerFeeCents)
      },
      formula: 'total = nextgen + partner + providerFee',
      warnings: this.validateCalculation(calc)
    };
  }

  @Post('create-charge')
  async createCharge(@Body() body: any) {
    await this.ensureTables();

    const totalCents = this.toCents(body.valueCents ?? body.totalCents ?? body.value ?? body.amountCents);
    const calc = this.calculateSplit(totalCents, body);
    const warnings = this.validateCalculation(calc);
    if (!calc.ok || warnings.length) {
      return { success: false, error: 'INVALID_SPLIT', calculation: calc, warnings };
    }

    const partnerPixKey = body.partnerPixKey || body.vendorPixKey || body.pixKey;
    if (!partnerPixKey) {
      return { success: false, error: 'MISSING_PARTNER_PIX_KEY', message: 'Informe partnerPixKey, vendorPixKey ou pixKey.' };
    }

    const nextgenPixKey = body.nextgenPixKey || process.env.WOOVI_NEXTGEN_PIX_KEY || process.env.WOOVI_FROM_PIX_KEY;
    if (!nextgenPixKey) {
      return { success: false, error: 'MISSING_NEXTGEN_PIX_KEY', message: 'Configure WOOVI_NEXTGEN_PIX_KEY ou WOOVI_FROM_PIX_KEY.' };
    }

    const correlationID = body.correlationID || `ngw-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const comment = body.comment || body.description || 'Cobrança Inteligente NextGen';
    const splitType = body.splitType || 'FIXED';

    const splits = [
      { pixKey: nextgenPixKey, value: calc.nextgenCents, splitType },
      { pixKey: partnerPixKey, value: calc.partnerCents, splitType }
    ].filter((item) => item.value > 0);

    const payload: any = {
      correlationID,
      value: calc.totalCents,
      comment,
      customer: body.customer,
      splits,
      expiresIn: body.expiresIn || 3600
    };

    try {
      const charge = await this.adapter.createCharge(payload);
      const saved = await this.saveWooviCharge({
        partnerSlug: body.partnerSlug || 'nextgen-assets',
        correlationID,
        charge,
        payload: this.maskPayload(payload),
        calculation: calc,
        providerFeeMode: body.providerFeeMode || 'RESERVED_FROM_PARTNER_NET'
      });

      return {
        success: true,
        message: 'Cobrança Woovi com split criada.',
        provider: 'woovi',
        correlationID,
        calculation: calc,
        splits,
        charge,
        local: saved
      };
    } catch (err: any) {
      return {
        success: false,
        error: 'WOOVI_CREATE_CHARGE_ERROR',
        message: err.message,
        payload: this.maskPayload(payload),
        calculation: calc
      };
    }
  }

  private calculateSplit(totalCents: number, body: any): SplitCalculation {
    if (!Number.isFinite(totalCents)) totalCents = 0;

    const nextgenRate = Number(body.nextgenRate ?? body.commissionRate ?? 0.03);
    const providerFeeRate = Number(body.providerFeeRate ?? body.wooviFeeRate ?? 0.005);
    const minProviderFee = Number(body.minProviderFeeCents ?? 1);

    let nextgenCents = body.nextgenCents !== undefined
      ? Math.floor(Number(body.nextgenCents))
      : Math.floor(totalCents * nextgenRate);

    let providerFeeCents = body.providerFeeCents !== undefined
      ? Math.ceil(Number(body.providerFeeCents))
      : Math.max(Math.ceil(totalCents * providerFeeRate), minProviderFee);

    if (body.reserveProviderFee === false) {
      providerFeeCents = 0;
    }

    if (totalCents < 100) {
      return {
        totalCents,
        nextgenCents: 0,
        partnerCents: 0,
        providerFeeCents,
        splitSumCents: 0,
        sumCents: providerFeeCents,
        ok: false
      };
    }

    nextgenCents = Math.max(0, Math.min(nextgenCents, totalCents));
    providerFeeCents = Math.max(0, Math.min(providerFeeCents, totalCents - nextgenCents));
    const partnerCents = Math.max(0, totalCents - nextgenCents - providerFeeCents);
    const splitSumCents = nextgenCents + partnerCents;
    const sumCents = nextgenCents + partnerCents + providerFeeCents;

    return {
      totalCents,
      nextgenCents,
      partnerCents,
      providerFeeCents,
      splitSumCents,
      sumCents,
      ok: sumCents === totalCents && partnerCents >= 0 && nextgenCents >= 0
    };
  }

  private validateCalculation(calc: SplitCalculation): string[] {
    const warnings: string[] = [];
    if (calc.totalCents < 100) warnings.push('Valor minimo recomendado: R$ 1,00.');
    if (calc.partnerCents < 0) warnings.push('Parceiro ficou negativo. Reduza taxa ou aumente o valor.');
    if (calc.sumCents !== calc.totalCents) warnings.push('Soma NextGen + parceiro + taxa estimada nao fecha com o total.');
    if (calc.splitSumCents > calc.totalCents) warnings.push('Split enviado para Woovi nao pode ser maior que o total.');
    return warnings;
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

  private async saveWooviCharge(opts: { partnerSlug: string; correlationID: string; charge: any; payload: any; calculation: SplitCalculation; providerFeeMode: string }) {
    const partner = await this.getOrCreatePartner(opts.partnerSlug);
    const id = `wsp_${randomUUID().replace(/-/g, '')}`;
    const rawData = JSON.stringify({
      correlationID: opts.correlationID,
      payload: opts.payload,
      charge: opts.charge,
      calculation: opts.calculation,
      providerFeeMode: opts.providerFeeMode
    });

    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_woovi_splits (
        id, partner_id, correlation_id, charge_id, total_cents, nextgen_cents, partner_cents,
        provider_fee_cents, split_sum_cents, status, raw_data
      ) VALUES (
        ${id}, ${partner.id}, ${opts.correlationID}, ${opts.charge?.id || opts.charge?.identifier || null},
        ${opts.calculation.totalCents}, ${opts.calculation.nextgenCents}, ${opts.calculation.partnerCents},
        ${opts.calculation.providerFeeCents}, ${opts.calculation.splitSumCents}, ${opts.charge?.status || 'CREATED'}, ${rawData}::jsonb
      )
      RETURNING *
    `;
    return this.toCamel(rows[0]);
  }

  private async ensureTables() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_billing_woovi_splits (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        correlation_id text NOT NULL,
        charge_id text,
        total_cents int NOT NULL,
        nextgen_cents int NOT NULL,
        partner_cents int NOT NULL,
        provider_fee_cents int NOT NULL DEFAULT 0,
        split_sum_cents int NOT NULL,
        status text NOT NULL DEFAULT 'CREATED',
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_wsp_partner ON smart_billing_woovi_splits(partner_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_wsp_correlation ON smart_billing_woovi_splits(correlation_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_wsp_charge ON smart_billing_woovi_splits(charge_id)`);
  }

  private async getOrCreatePartner(slug: string, name?: string) {
    return prisma.partner.upsert({
      where: { slug },
      update: name ? { name } : {},
      create: { slug, name: name || this.titleFromSlug(slug), type: 'FINTECH' as any, config: {}, commissionRate: 0.03, tier: 'STARTER' as any } as any
    });
  }

  private maskPayload(payload: any) {
    return {
      ...payload,
      splits: (payload.splits || []).map((split: any) => ({ ...split, pixKey: this.maskKey(split.pixKey) }))
    };
  }

  private maskKey(key?: string) {
    if (!key) return key;
    if (key.length <= 6) return '******';
    return `${key.slice(0, 3)}******${key.slice(-3)}`;
  }

  private formatBrl(cents: number) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
