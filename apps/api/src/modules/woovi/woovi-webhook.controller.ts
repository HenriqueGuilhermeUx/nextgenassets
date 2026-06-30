// ============================================
//  WOOVI WEBHOOK CONTROLLER
//  Recebe eventos: charge.paid, charge.failed, transfer.paid
//  HMAC: X-Webhook-Signature
// ============================================

import { Controller, Post, Get, Body, Headers, Logger, Req, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { WooviPixAdapter } from './woovi-pix-adapter';

const logger = new Logger('WooviWebhook');
const prisma = new PrismaClient();

@Controller('v1/webhooks/woovi')
export class WooviWebhookController {
  private adapter: WooviPixAdapter;

  constructor() {
    this.adapter = new WooviPixAdapter();
  }

  @Get('ping')
  async ping() {
    const cfg = {
      enabled: process.env.WOOVI_ENABLED !== 'false',
      hasAppId: !!process.env.WOOVI_APP_ID,
      hasFromPixKey: !!process.env.WOOVI_FROM_PIX_KEY,
      hasNextgenPixKey: !!(process.env.WOOVI_NEXTGEN_PIX_KEY || process.env.WOOVI_FROM_PIX_KEY),
      apiUrl: process.env.WOOVI_API_URL || 'https://api.woovi.com'
    };
    return { success: true, ts: Date.now(), config: cfg };
  }

  @Get('smart-billing/health')
  async smartBillingHealth() {
    return {
      success: true,
      service: 'woovi-smart-billing-split',
      mountedUnder: '/v1/webhooks/woovi/smart-billing',
      hasAppId: !!process.env.WOOVI_APP_ID,
      hasNextgenPixKey: !!(process.env.WOOVI_NEXTGEN_PIX_KEY || process.env.WOOVI_FROM_PIX_KEY),
      defaultRules: {
        nextgenRate: 0.03,
        providerFeeRate: 0.005,
        minimumChargeCents: 100,
        minimumProviderFeeCents: 1
      },
      strategy: [
        'Woovi como motor principal para Pix cobrança com split flexivel.',
        'Efi como motor de Open Finance, Pix Automatico e consentimento bancario.'
      ],
      routes: [
        'POST /v1/webhooks/woovi/smart-billing/calculate',
        'POST /v1/webhooks/woovi/smart-billing/create-charge'
      ]
    };
  }

  @Post('smart-billing/calculate')
  async smartBillingCalculate(@Body() body: any) {
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

  @Post('smart-billing/create-charge')
  async smartBillingCreateCharge(@Body() body: any) {
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
    const splitType = body.splitType || 'FIXED';
    const splits = [
      { pixKey: nextgenPixKey, value: calc.nextgenCents, splitType },
      { pixKey: partnerPixKey, value: calc.partnerCents, splitType }
    ].filter((item) => item.value > 0);

    const payload: any = {
      correlationID,
      value: calc.totalCents,
      comment: body.comment || body.description || 'Cobrança Inteligente NextGen',
      customer: body.customer,
      splits,
      expiresIn: body.expiresIn || 3600
    };

    try {
      const charge = await this.adapter.createCharge(payload);
      await this.ensureWooviSplitTable();
      await this.saveWooviSplit({ correlationID, charge, calculation: calc, payload: this.maskPayload(payload) });
      return {
        success: true,
        provider: 'woovi',
        message: 'Cobrança Woovi com split criada.',
        correlationID,
        calculation: calc,
        splits: this.maskPayload({ splits }).splits,
        charge
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

  @Post()
  async handle(
    @Body() body: any,
    @Headers('x-webhook-signature') signature: string,
    @Req() req: Request
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(body);
    
    // Valida HMAC
    if (signature && process.env.WOOVI_WEBHOOK_SECRET) {
      const ok = this.adapter.verifyWebhookSignature(rawBody, signature, process.env.WOOVI_WEBHOOK_SECRET);
      if (!ok) {
        logger.warn('❌ Invalid Woovi webhook signature');
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }
    }

    // Eventos Woovi: { event: "charge.paid" | "charge.failed" | "transfer.paid", data: {...} }
    const event = body.event || body.type;
    const data = body.data || body.charge || body;

    logger.log(`📥 Woovi webhook: ${event} (charge=${data.identifier || data.id || '?'})`);

    try {
      if (event === 'charge.paid' || event === 'OPENPIX:CHARGE_PAID' || event === 'CHARGE_PAID') {
        await this.handleChargePaid(data);
      } else if (event === 'charge.failed' || event === 'CHARGE_FAILED') {
        await this.handleChargeFailed(data);
      } else if (event === 'transfer.paid' || event === 'TRANSFER_PAID') {
        logger.log(`✅ Woovi transfer.paid: ${data.id || data.identifier}`);
      } else {
        logger.warn(`Unknown Woovi event: ${event}`);
      }
      return { received: true, event };
    } catch (err: any) {
      logger.error(`Erro: ${err.message}`);
      return { received: true, error: err.message };
    } finally {
      await prisma.$disconnect();
    }
  }

  private async handleChargePaid(charge: any) {
    const correlationID = charge.correlationID;
    logger.log(`💰 charge.paid: correlationID=${correlationID} value=${charge.value}`);

    if (!correlationID) {
      logger.warn('charge.paid sem correlationID');
      return;
    }

    await this.markSmartBillingWooviPaid(correlationID, charge);

    // correlationID = nosso triggerId (ou orderId)
    // Encontra o Trigger (ou Order) correspondente
    const trigger = await prisma.trigger.findFirst({
      where: { id: correlationID },
      include: { partner: true }
    });

    if (!trigger) {
      logger.warn(`Trigger não encontrado: ${correlationID}`);
      return;
    }

    // Salva info do woovi payment no metadata
    const metadata = (trigger as any).metadata || {};
    metadata.wooviChargeId = charge.identifier || charge.id;
    metadata.wooviPaidAt = charge.paidAt || new Date().toISOString();
    metadata.wooviStatus = 'PAID';

    // Marca como PAID
    await prisma.trigger.update({
      where: { id: trigger.id },
      data: {
        status: 'COMPLETED' as any,
        paidAt: new Date(charge.paidAt || Date.now()),
        metadata: metadata as any
      } as any
    });

    // Cria audit log SPLIT_DISTRIBUTED (se houver splits)
    if (charge.splits && Array.isArray(charge.splits) && charge.splits.length > 0) {
      await prisma.auditLog.create({
        data: {
          action: 'COMMISSION_DISTRIBUTED',
          resource: 'trigger',
          resourceId: trigger.id,
          actor: 'webhook:woovi',
          metadata: {
            provider: 'woovi',
            chargeId: charge.identifier,
            totalCents: charge.value,
            splits: charge.splits,
            partnerId: trigger.partnerId
          } as any
        } as any
      });
      logger.log(`✅ Split logged: ${charge.splits.length} destinations, total R$ ${(charge.value / 100).toFixed(2)}`);
    }
  }

  private async handleChargeFailed(charge: any) {
    const correlationID = charge.correlationID;
    if (!correlationID) return;

    await prisma.trigger.updateMany({
      where: { id: correlationID },
      data: {
        status: 'FAILED' as any,
        metadata: {
          wooviFailedAt: new Date().toISOString()
        } as any
      } as any
    });
    logger.log(`❌ charge.failed: ${correlationID}`);
  }

  private calculateSplit(totalCents: number, body: any) {
    if (!Number.isFinite(totalCents)) totalCents = 0;
    const nextgenRate = Number(body.nextgenRate ?? body.commissionRate ?? 0.03);
    const providerFeeRate = Number(body.providerFeeRate ?? body.wooviFeeRate ?? 0.005);
    const minProviderFee = Number(body.minProviderFeeCents ?? 1);
    let nextgenCents = body.nextgenCents !== undefined ? Math.floor(Number(body.nextgenCents)) : Math.floor(totalCents * nextgenRate);
    let providerFeeCents = body.providerFeeCents !== undefined ? Math.ceil(Number(body.providerFeeCents)) : Math.max(Math.ceil(totalCents * providerFeeRate), minProviderFee);
    if (body.reserveProviderFee === false) providerFeeCents = 0;

    if (totalCents < 100) {
      return { totalCents, nextgenCents: 0, partnerCents: 0, providerFeeCents, splitSumCents: 0, sumCents: providerFeeCents, ok: false };
    }

    nextgenCents = Math.max(0, Math.min(nextgenCents, totalCents));
    providerFeeCents = Math.max(0, Math.min(providerFeeCents, totalCents - nextgenCents));
    const partnerCents = Math.max(0, totalCents - nextgenCents - providerFeeCents);
    const splitSumCents = nextgenCents + partnerCents;
    const sumCents = nextgenCents + partnerCents + providerFeeCents;
    return { totalCents, nextgenCents, partnerCents, providerFeeCents, splitSumCents, sumCents, ok: sumCents === totalCents && partnerCents >= 0 };
  }

  private validateCalculation(calc: any): string[] {
    const warnings: string[] = [];
    if (calc.totalCents < 100) warnings.push('Valor minimo recomendado: R$ 1,00.');
    if (calc.partnerCents < 0) warnings.push('Parceiro ficou negativo.');
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

  private async ensureWooviSplitTable() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_billing_woovi_splits (
        id text PRIMARY KEY,
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
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_woovi_splits_correlation ON smart_billing_woovi_splits(correlation_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_woovi_splits_charge ON smart_billing_woovi_splits(charge_id)`);
  }

  private async saveWooviSplit(opts: { correlationID: string; charge: any; calculation: any; payload: any }) {
    const id = `wsp_${randomUUID().replace(/-/g, '')}`;
    const rawData = JSON.stringify(opts);
    await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_woovi_splits (
        id, correlation_id, charge_id, total_cents, nextgen_cents, partner_cents,
        provider_fee_cents, split_sum_cents, status, raw_data
      ) VALUES (
        ${id}, ${opts.correlationID}, ${opts.charge?.id || opts.charge?.identifier || null},
        ${opts.calculation.totalCents}, ${opts.calculation.nextgenCents}, ${opts.calculation.partnerCents},
        ${opts.calculation.providerFeeCents}, ${opts.calculation.splitSumCents}, ${opts.charge?.status || 'CREATED'}, ${rawData}::jsonb
      )
    `;
  }

  private async markSmartBillingWooviPaid(correlationID: string, charge: any) {
    try {
      await this.ensureWooviSplitTable();
      await prisma.$executeRawUnsafe(
        `UPDATE smart_billing_woovi_splits SET status = 'PAID', raw_data = raw_data || $1::jsonb, updated_at = now() WHERE correlation_id = $2`,
        JSON.stringify({ paidWebhook: charge }),
        correlationID
      );
    } catch (err: any) {
      logger.warn(`Nao foi possivel atualizar smart_billing_woovi_splits: ${err.message}`);
    }
  }

  private maskPayload(payload: any) {
    return { ...payload, splits: (payload.splits || []).map((split: any) => ({ ...split, pixKey: this.maskKey(split.pixKey) })) };
  }

  private maskKey(key?: string) {
    if (!key) return key;
    if (key.length <= 6) return '******';
    return `${key.slice(0, 3)}******${key.slice(-3)}`;
  }

  private formatBrl(cents: number) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
