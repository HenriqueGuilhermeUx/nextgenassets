// ============================================
//  NEXTGEN SMART BILLING — PAYMENT ROUTER
//  Rotas reais com prefixo global:
//  GET  /v1/company-billing/payment-router/health
//  POST /v1/company-billing/payment-router/calculate
//  POST /v1/company-billing/payment-router/create-woovi-charge
// ============================================

import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

@Controller('company-billing/payment-router')
export class PaymentRouterController {
  @Get('health')
  health() {
    return {
      success: true,
      service: 'nextgen-payment-router',
      strategy: {
        manual: 'liberado para vender agora e controlar repasse manual',
        woovi: 'motor preferencial para Pix cobranca e split flexivel',
        efi: 'motor para Open Finance, Pix Automatico e consentimento bancario'
      },
      woovi: {
        enabled: process.env.WOOVI_ENABLED !== 'false',
        hasAppId: !!process.env.WOOVI_APP_ID,
        hasNextgenPixKey: !!(process.env.WOOVI_NEXTGEN_PIX_KEY || process.env.WOOVI_FROM_PIX_KEY),
        apiUrl: process.env.WOOVI_API_URL || 'https://api.woovi.com'
      },
      routes: [
        'POST /v1/company-billing/payment-router/calculate',
        'POST /v1/company-billing/payment-router/create-woovi-charge'
      ]
    };
  }

  @Post('calculate')
  calculate(@Body() body: any) {
    const valueCents = this.toCents(body.valueCents ?? body.totalCents ?? body.value ?? body.amountCents);
    const calc = this.calculateCommercialSplit(valueCents, body);
    return {
      success: calc.ok,
      provider: body.provider || 'woovi',
      calculation: calc,
      brl: {
        total: this.formatBrl(calc.totalCents),
        nextgen: this.formatBrl(calc.nextgenCents),
        partner: this.formatBrl(calc.partnerCents),
        providerFee: this.formatBrl(calc.providerFeeCents)
      },
      warnings: this.validateCalculation(calc)
    };
  }

  @Post('create-woovi-charge')
  async createWooviCharge(@Body() body: any) {
    await this.ensureTables();

    const totalCents = this.toCents(body.valueCents ?? body.totalCents ?? body.value ?? body.amountCents);
    const calc = this.calculateCommercialSplit(totalCents, body);
    const warnings = this.validateCalculation(calc);
    if (!calc.ok || warnings.length) {
      return { success: false, error: 'INVALID_SPLIT', calculation: calc, warnings };
    }

    const appId = process.env.WOOVI_APP_ID || '';
    if (!appId) {
      return { success: false, error: 'MISSING_WOOVI_APP_ID', message: 'Configure WOOVI_APP_ID no Render.' };
    }

    const partnerPixKey = body.partnerPixKey || body.vendorPixKey || body.pixKey;
    if (!partnerPixKey) {
      return { success: false, error: 'MISSING_PARTNER_PIX_KEY', message: 'Informe a chave Pix da empresa/parceiro.' };
    }

    const nextgenPixKey = body.nextgenPixKey || process.env.WOOVI_NEXTGEN_PIX_KEY || process.env.WOOVI_FROM_PIX_KEY;
    if (!nextgenPixKey) {
      return { success: false, error: 'MISSING_NEXTGEN_PIX_KEY', message: 'Configure WOOVI_NEXTGEN_PIX_KEY ou WOOVI_FROM_PIX_KEY no Render.' };
    }

    const correlationID = body.correlationID || `ngr-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const splitType = body.splitType || 'FIXED';
    const reserveProviderFee = body.reserveProviderFee !== false;

    const splits = reserveProviderFee
      ? [
          { pixKey: nextgenPixKey, value: calc.nextgenCents, splitType },
          { pixKey: partnerPixKey, value: calc.partnerCents, splitType }
        ].filter((s) => s.value > 0)
      : [
          { pixKey: nextgenPixKey, value: calc.nextgenCents, splitType },
          { pixKey: partnerPixKey, value: calc.totalCents - calc.nextgenCents, splitType }
        ].filter((s) => s.value > 0);

    const payload: any = {
      correlationID,
      value: calc.totalCents,
      comment: body.comment || body.description || 'NextGen Cobranca Inteligente',
      customer: body.customer,
      splits,
      expiresIn: body.expiresIn || 3600
    };

    const apiUrl = (process.env.WOOVI_API_URL || 'https://api.woovi.com').replace(/\/$/, '');

    try {
      const response = await fetch(`${apiUrl}/api/v1/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: appId
        },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      let data: any = text;
      try { data = JSON.parse(text); } catch {}

      await this.savePaymentAttempt({
        provider: 'woovi',
        correlationID,
        status: response.ok ? 'CREATED' : 'ERROR',
        calculation: calc,
        payload: this.maskPayload(payload),
        response: data,
        httpStatus: response.status
      });

      return {
        success: response.ok,
        provider: 'woovi',
        correlationID,
        status: response.status,
        message: response.ok ? 'Cobranca Woovi criada.' : 'Erro ao criar cobranca Woovi.',
        calculation: calc,
        splits: this.maskPayload({ splits }).splits,
        response: data
      };
    } catch (err: any) {
      await this.savePaymentAttempt({
        provider: 'woovi',
        correlationID,
        status: 'ERROR',
        calculation: calc,
        payload: this.maskPayload(payload),
        response: { error: err.message },
        httpStatus: 0
      });
      return { success: false, error: 'WOOVI_REQUEST_ERROR', message: err.message, calculation: calc };
    }
  }

  private calculateCommercialSplit(totalCents: number, body: any) {
    if (!Number.isFinite(totalCents)) totalCents = 0;
    const nextgenRate = Number(body.nextgenRate ?? body.commissionRate ?? 0.03);
    const providerFeeRate = Number(body.providerFeeRate ?? body.wooviFeeRate ?? 0.005);
    const minProviderFeeCents = Number(body.minProviderFeeCents ?? 1);

    if (totalCents < 100) {
      return { totalCents, nextgenCents: 0, partnerCents: 0, providerFeeCents: 0, sumCents: 0, splitSumCents: 0, ok: false };
    }

    const nextgenCents = Math.max(0, Math.floor(totalCents * nextgenRate));
    const providerFeeCents = body.reserveProviderFee === false
      ? 0
      : Math.max(Math.ceil(totalCents * providerFeeRate), minProviderFeeCents);
    const partnerCents = Math.max(0, totalCents - nextgenCents - providerFeeCents);
    const sumCents = nextgenCents + partnerCents + providerFeeCents;
    const splitSumCents = nextgenCents + partnerCents;

    return {
      totalCents,
      nextgenCents,
      partnerCents,
      providerFeeCents,
      sumCents,
      splitSumCents,
      ok: sumCents === totalCents && splitSumCents <= totalCents
    };
  }

  private validateCalculation(calc: any) {
    const warnings: string[] = [];
    if (calc.totalCents < 100) warnings.push('Valor minimo recomendado: R$ 1,00.');
    if (calc.sumCents !== calc.totalCents) warnings.push('A soma total nao fecha com o valor cobrado.');
    if (calc.splitSumCents > calc.totalCents) warnings.push('O split enviado ao provedor nao pode superar o total.');
    return warnings;
  }

  private async ensureTables() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_billing_payment_attempts (
        id text PRIMARY KEY,
        provider text NOT NULL,
        correlation_id text NOT NULL,
        status text NOT NULL,
        http_status int NOT NULL DEFAULT 0,
        total_cents int NOT NULL DEFAULT 0,
        nextgen_cents int NOT NULL DEFAULT 0,
        partner_cents int NOT NULL DEFAULT 0,
        provider_fee_cents int NOT NULL DEFAULT 0,
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_payment_attempts_provider ON smart_billing_payment_attempts(provider)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_payment_attempts_correlation ON smart_billing_payment_attempts(correlation_id)`);
  }

  private async savePaymentAttempt(opts: any) {
    await this.ensureTables();
    const id = `pay_${randomUUID().replace(/-/g, '')}`;
    const rawData = JSON.stringify({ payload: opts.payload, response: opts.response, calculation: opts.calculation });
    await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_payment_attempts (
        id, provider, correlation_id, status, http_status, total_cents, nextgen_cents,
        partner_cents, provider_fee_cents, raw_data
      ) VALUES (
        ${id}, ${opts.provider}, ${opts.correlationID}, ${opts.status}, ${opts.httpStatus || 0},
        ${opts.calculation.totalCents}, ${opts.calculation.nextgenCents}, ${opts.calculation.partnerCents},
        ${opts.calculation.providerFeeCents}, ${rawData}::jsonb
      )
    `;
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

  private maskPayload(payload: any) {
    return { ...payload, splits: (payload.splits || []).map((s: any) => ({ ...s, pixKey: this.maskKey(s.pixKey) })) };
  }

  private maskKey(key?: string) {
    if (!key) return key;
    if (key.length <= 6) return '******';
    return `${key.slice(0, 3)}******${key.slice(-3)}`;
  }

  private formatBrl(cents: number) {
    return (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
