import { Body, Controller, Headers, Post, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

@Controller('company-billing/woovi')
export class WooviPaymentWebhookController {
  @Post('webhook')
  async webhook(@Query('secret') secret: string, @Headers() headers: any, @Body() body: any) {
    await this.ensureTables();

    const expected = process.env.NEXTGEN_WOOVI_WEBHOOK_SECRET || process.env.WOOVI_WEBHOOK_SECRET || '';
    if (expected) {
      const headerSecret = headers?.['x-nextgen-secret'] || headers?.['x-webhook-secret'] || headers?.['x-openpix-signature'];
      if (secret !== expected && headerSecret !== expected) {
        return { success: false, error: 'INVALID_WEBHOOK_SECRET' };
      }
    }

    const normalized = this.normalize(body);
    const paid = this.isPaid(normalized, body);
    if (!paid) return { success: true, action: 'ignored_not_paid', normalized };

    const charge = await this.findCharge(normalized);
    if (!charge) return { success: false, error: 'CHARGE_NOT_FOUND', normalized };

    const grossCents = normalized.valueCents || Math.round(Number(charge.amount_brl || 0) * 100);
    const providerFeeCents = normalized.feeCents || 0;
    const merchantCents = normalized.splitCents || this.readRawMerchantCents(charge) || Math.max(0, grossCents - providerFeeCents);
    const platformCents = this.readRawPlatformCents(charge);
    const providerReference = normalized.transactionID || normalized.identifier || normalized.correlationID || `woovi-${Date.now()}`;

    const paymentMerge = JSON.stringify({
      wooviWebhook: {
        status: normalized.status,
        event: normalized.event,
        providerReference,
        correlationID: normalized.correlationID,
        transactionID: normalized.transactionID,
        identifier: normalized.identifier,
        feeCents: providerFeeCents,
        valueCents: grossCents,
        splitCents: merchantCents,
        receivedAt: new Date().toISOString()
      }
    });

    await prisma.$executeRawUnsafe(
      `UPDATE smart_billing_charges
       SET status='PAID', paid_at=COALESCE(paid_at, now()), end_to_end_id=COALESCE(end_to_end_id, $1), raw_data=COALESCE(raw_data,'{}'::jsonb) || $2::jsonb, updated_at=now()
       WHERE id=$3`,
      providerReference,
      paymentMerge,
      charge.id
    );

    await this.stopPendingMessages(charge.id);
    const settlement = await this.upsertSettlement({ charge, grossCents, providerFeeCents, merchantCents, platformCents, providerReference, body, normalized });

    return {
      success: true,
      action: 'charge_marked_paid_by_woovi',
      chargeId: charge.id,
      providerReference,
      settlement,
      amounts: {
        gross: this.money(grossCents),
        fee: this.money(providerFeeCents),
        merchant: this.money(merchantCents),
        platform: this.money(platformCents)
      }
    };
  }

  @Post('webhook-test')
  async webhookTest(@Query('secret') secret: string, @Body() body: any) {
    const expected = process.env.NEXTGEN_WOOVI_WEBHOOK_SECRET || process.env.WOOVI_WEBHOOK_SECRET || '';
    if (expected && secret !== expected) return { success: false, error: 'INVALID_WEBHOOK_SECRET' };
    const normalized = this.normalize(body);
    return {
      success: true,
      paidDetected: this.isPaid(normalized, body),
      normalized,
      hint: 'Use esta rota para testar se o payload seria reconhecido antes de processar pagamento real.'
    };
  }

  private normalize(body: any) {
    const charge = body?.charge || body?.data?.charge || body?.pixQrCode || body?.data?.pixQrCode || body?.data || body || {};
    const transaction = body?.transaction || body?.data?.transaction || charge?.transaction || body?.pixTransaction || body?.data?.pixTransaction || {};
    const splits = Array.isArray(charge?.splits) ? charge.splits : Array.isArray(transaction?.splits) ? transaction.splits : [];
    const splitCents = splits.reduce((sum: number, item: any) => sum + Math.round(Number(item?.value || 0)), 0);

    return {
      event: body?.event || body?.type || body?.eventType || body?.name || null,
      status: charge?.status || transaction?.status || body?.status || null,
      correlationID: charge?.correlationID || body?.correlationID || transaction?.correlationID || transaction?.charge?.correlationID || null,
      identifier: charge?.identifier || charge?.transactionID || body?.identifier || body?.transactionID || transaction?.identifier || transaction?.charge?.identifier || null,
      transactionID: charge?.transactionID || transaction?.transactionID || transaction?.id || body?.transactionID || null,
      valueCents: Math.round(Number(charge?.value || transaction?.value || body?.value || 0)),
      feeCents: Math.round(Number(charge?.fee || transaction?.fee || body?.fee || 0)),
      splitCents
    };
  }

  private isPaid(normalized: any, body: any) {
    const text = JSON.stringify({ event: normalized.event, status: normalized.status, body }).toLowerCase();
    return text.includes('paid')
      || text.includes('completed')
      || text.includes('confirmed')
      || text.includes('liquidado')
      || text.includes('recebido')
      || text.includes('recebida')
      || text.includes('received')
      || text.includes('transaction_received')
      || text.includes('pix_received')
      || text.includes('charge_completed');
  }

  private async findCharge(normalized: any) {
    const keys = [normalized.correlationID, normalized.identifier, normalized.transactionID].filter(Boolean);
    for (const key of keys) {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT * FROM smart_billing_charges
        WHERE provider_ref = ${key}
           OR end_to_end_id = ${key}
           OR pix_payload::text ILIKE ${`%${key}%`}
           OR raw_data::text ILIKE ${`%${key}%`}
        ORDER BY created_at DESC
        LIMIT 1
      `;
      if (rows.length) return rows[0];
    }
    return null;
  }

  private readRawMerchantCents(charge: any) {
    try { return Number(charge?.raw_data?.paymentProvider?.merchantCents || 0); } catch { return 0; }
  }

  private readRawPlatformCents(charge: any) {
    try { return Number(charge?.raw_data?.paymentProvider?.platformCents || 0); } catch { return 0; }
  }

  private async stopPendingMessages(chargeId: string) {
    try {
      await prisma.$executeRawUnsafe(`UPDATE smart_billing_notifications SET status='CANCELED', updated_at=now() WHERE charge_id=$1 AND status='PENDING'`, chargeId);
      await prisma.$executeRawUnsafe(`UPDATE smart_billing_reminders SET status='CANCELED', updated_at=now() WHERE charge_id=$1 AND status='PENDING'`, chargeId);
    } catch {}
  }

  private async upsertSettlement(opts: any) {
    const exists = await prisma.$queryRaw<any[]>`SELECT * FROM smart_billing_manual_settlements WHERE charge_id=${opts.charge.id} LIMIT 1`;
    if (exists.length) {
      const updated = await prisma.$queryRaw<any[]>`
        UPDATE smart_billing_manual_settlements
        SET status='REPASS_PENDING', received_at=COALESCE(received_at, now()), provider_reference=${opts.providerReference}, provider_fee_cents=${opts.providerFeeCents}, partner_net_cents=${opts.merchantCents}, raw_data=COALESCE(raw_data,'{}'::jsonb) || ${JSON.stringify({ wooviWebhook: opts.normalized })}::jsonb, updated_at=now()
        WHERE id=${exists[0].id}
        RETURNING *
      `;
      return this.toCamel(updated[0]);
    }

    const id = `mst_${randomUUID().replace(/-/g, '')}`;
    const rawData = JSON.stringify({ source: 'woovi-webhook', providerReference: opts.providerReference, wooviWebhook: opts.normalized });
    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_manual_settlements (
        id, partner_id, charge_id, source_provider, gross_cents, nextgen_cents, provider_fee_cents,
        partner_net_cents, status, recipient_name, recipient_ref_masked, description, provider_reference, raw_data, received_at
      ) VALUES (
        ${id}, ${opts.charge.partner_id}, ${opts.charge.id}, 'woovi', ${opts.grossCents}, ${opts.platformCents}, ${opts.providerFeeCents},
        ${opts.merchantCents}, 'REPASS_PENDING', null, null, ${opts.charge.title || null}, ${opts.providerReference}, ${rawData}::jsonb, now()
      ) RETURNING *
    `;
    return this.toCamel(inserted[0]);
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
  }

  private money(cents: number) {
    return (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private toCamel(row: any) {
    if (!row) return row;
    const out: any = {};
    for (const [key, value] of Object.entries(row)) out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
    return out;
  }
}
