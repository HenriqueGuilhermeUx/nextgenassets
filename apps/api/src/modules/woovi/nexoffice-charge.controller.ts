import { Body, Controller, Get, Headers, HttpException, HttpStatus, Param, Post } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { timingSafeEqual } from 'crypto';
import { WooviPixAdapter } from './woovi-pix-adapter';

const prisma = new PrismaClient();
let ensureTablesPromise: Promise<unknown> | null = null;

type Customer = { name?: string; email?: string; phone?: string; taxID?: string };
type ChargeBody = {
  correlationId?: string;
  commandActionId?: string;
  approvalId?: string | null;
  humanApproved?: boolean;
  amountMinor?: number;
  valueMinor?: number;
  description?: string;
  customer?: Customer;
};
type SubscriptionBody = {
  correlationId?: string;
  commandActionId?: string;
  approvalId?: string | null;
  humanApproved?: boolean;
  amountMinor?: number;
  valueMinor?: number;
  dayGenerateCharge?: number;
  periodicity?: 'MONTHLY' | 'WEEKLY';
  customer?: Customer;
};
type ChargeReservation = {
  workspace_id: string;
  correlation_id: string;
  command_action_id: string;
  approval_id: string | null;
  amount_minor: bigint | number | string;
  status: string;
  provider: string;
  provider_charge_id: string | null;
  receipt: any;
  last_error: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};
type SubscriptionReservation = {
  workspace_id: string;
  correlation_id: string;
  command_action_id: string;
  approval_id: string | null;
  amount_minor: bigint | number | string;
  status: string;
  provider: string;
  provider_subscription_id: string | null;
  receipt: any;
  last_error: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function clean(value: unknown, max: number) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);
}
function safeEqual(received: string, expected: string) {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function sanitizeCustomer(customer?: Customer) {
  if (!customer) return undefined;
  const result = {
    name: clean(customer.name, 140) || undefined,
    email: clean(customer.email, 180) || undefined,
    phone: clean(customer.phone, 40) || undefined,
    taxID: clean(customer.taxID, 32) || undefined,
  };
  return Object.values(result).some(Boolean) ? result : undefined;
}
function prismaJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
function safeChargeReceipt(charge: any) {
  if (!charge) return null;
  return {
    id: clean(charge.id, 180),
    identifier: clean(charge.identifier, 180),
    correlationID: clean(charge.correlationID, 220),
    status: clean(charge.status, 40),
    value: Number(charge.value || 0),
    qrCodeImage: typeof charge.qrCodeImage === 'string' ? charge.qrCodeImage : undefined,
    brCode: typeof charge.brCode === 'string' ? charge.brCode : undefined,
    paymentLinkID: clean(charge.paymentLinkID, 180) || undefined,
    paymentLinkUrl: typeof charge.paymentLinkUrl === 'string' ? charge.paymentLinkUrl : undefined,
    createdAt: charge.createdAt || null,
    paidAt: charge.paidAt || null,
  };
}
function safeSubscriptionReceipt(value: any) {
  if (!value) return null;
  return {
    id: clean(value.globalID || value.id, 180),
    status: clean(value.status, 60) || 'CREATED',
    value: Number(value.value || 0),
    dayGenerateCharge: Number(value.dayGenerateCharge || 0) || null,
    periodicity: clean(value.periodicity, 40) || null,
    correlationID: clean(value.correlationID, 220) || null,
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || null,
  };
}
function normalizedChargeStatus(status: unknown) {
  const value = clean(status, 40).toUpperCase();
  if (['PAID', 'COMPLETED'].includes(value)) return 'PAID';
  if (['EXPIRED'].includes(value)) return 'EXPIRED';
  if (['CANCELED', 'CANCELLED'].includes(value)) return 'CANCELED';
  if (['FAILED', 'ERROR'].includes(value)) return 'FAILED';
  return 'CREATED';
}

async function ensureTables() {
  if (!ensureTablesPromise) {
    ensureTablesPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS nexoffice_charge_receipts (
          id BIGSERIAL PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          correlation_id TEXT NOT NULL,
          command_action_id TEXT NOT NULL,
          approval_id TEXT,
          amount_minor BIGINT NOT NULL,
          status TEXT NOT NULL,
          provider TEXT NOT NULL DEFAULT 'woovi',
          provider_charge_id TEXT,
          receipt JSONB,
          last_error TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(workspace_id, correlation_id)
        )
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_nexoffice_charge_receipts_action ON nexoffice_charge_receipts(command_action_id)`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_nexoffice_charge_receipts_status ON nexoffice_charge_receipts(status, updated_at DESC)`);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS nexoffice_subscription_receipts (
          id BIGSERIAL PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          correlation_id TEXT NOT NULL,
          command_action_id TEXT NOT NULL,
          approval_id TEXT,
          amount_minor BIGINT NOT NULL,
          status TEXT NOT NULL,
          provider TEXT NOT NULL DEFAULT 'woovi',
          provider_subscription_id TEXT,
          receipt JSONB,
          last_error TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(workspace_id, correlation_id)
        )
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_nexoffice_subscription_receipts_action ON nexoffice_subscription_receipts(command_action_id)`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_nexoffice_subscription_receipts_status ON nexoffice_subscription_receipts(status, updated_at DESC)`);
    })().catch(error => {
      ensureTablesPromise = null;
      throw error;
    });
  }
  return ensureTablesPromise;
}

@Controller('internal/nexoffice')
export class NexOfficeChargeController {
  constructor(private readonly woovi: WooviPixAdapter) {}

  private authorize(key: string | undefined, workspaceId: string | undefined) {
    const expected = String(process.env.NEXOFFICE_SERVICE_KEY || '').trim();
    if (!expected) throw new HttpException({ success: false, error: 'bridge_not_configured' }, HttpStatus.SERVICE_UNAVAILABLE);
    if (!safeEqual(String(key || ''), expected)) throw new HttpException({ success: false, error: 'unauthorized' }, HttpStatus.UNAUTHORIZED);
    const workspace = clean(workspaceId, 120);
    if (!workspace) throw new HttpException({ success: false, error: 'workspace_required' }, HttpStatus.BAD_REQUEST);
    return workspace;
  }

  private requireActionEnabled() {
    if (String(process.env.NEXOFFICE_FINANCIAL_ACTIONS_ENABLED || 'false').toLowerCase() !== 'true') {
      throw new HttpException({ success: false, error: 'financial_actions_disabled' }, HttpStatus.CONFLICT);
    }
  }

  private requireHumanApproval(value: unknown) {
    if (value !== true) throw new HttpException({ success: false, error: 'human_approval_required' }, HttpStatus.CONFLICT);
  }

  private async audit(action: string, resource: string, resourceId: string, metadata: Record<string, unknown>) {
    try {
      await prisma.auditLog.create({ data: { actor: 'service:nexoffice', action, resource, resourceId, metadata: prismaJson(metadata) } });
    } catch {
      // Recibos idempotentes são a fonte de verdade; AuditLog é trilha adicional.
    }
  }

  @Get('health')
  async health(@Headers('x-nexoffice-key') key?: string, @Headers('x-nexoffice-workspace-id') workspaceId?: string) {
    const workspace = this.authorize(key, workspaceId);
    await ensureTables();
    return {
      success: true,
      status: 'online',
      service: 'nextgen-financial-engine',
      workspaceId: workspace,
      capabilities: [
        'pix.charge.create.approved',
        'pix.charge.status.read',
        'pix.charge.reconcile.read',
        'pix.recurring.create.approved',
        'pix.recurring.status.read',
        'pix.recurring.cancel.approved',
      ],
      provider: 'woovi',
      actionsEnabled: String(process.env.NEXOFFICE_FINANCIAL_ACTIONS_ENABLED || 'false').toLowerCase() === 'true',
      requiresHumanApproval: true,
      idempotent: true,
      ambiguousResultPolicy: 'block_retry_until_reconciled',
      openFinanceRead: false,
      externalEffect: false,
    };
  }

  @Post('charges')
  async createCharge(
    @Headers('x-nexoffice-key') key: string | undefined,
    @Headers('x-nexoffice-workspace-id') workspaceId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: ChargeBody,
  ) {
    const workspace = this.authorize(key, workspaceId);
    this.requireActionEnabled();
    this.requireHumanApproval(body?.humanApproved);

    const commandActionId = clean(body?.commandActionId, 120);
    const correlationId = clean(idempotencyKey || body?.correlationId, 220);
    const approvalId = clean(body?.approvalId, 120) || null;
    const amountMinor = Number(body?.amountMinor ?? body?.valueMinor ?? 0);
    const description = clean(body?.description || 'Cobrança NexOffice', 240);
    const customer = sanitizeCustomer(body?.customer);
    if (!commandActionId) throw new HttpException({ success: false, error: 'command_action_required' }, HttpStatus.BAD_REQUEST);
    if (!correlationId) throw new HttpException({ success: false, error: 'correlation_required' }, HttpStatus.BAD_REQUEST);
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 100_000_000) throw new HttpException({ success: false, error: 'invalid_amount_minor' }, HttpStatus.UNPROCESSABLE_ENTITY);

    await ensureTables();
    const inserted = await prisma.$queryRawUnsafe<ChargeReservation[]>(`
      INSERT INTO nexoffice_charge_receipts (workspace_id, correlation_id, command_action_id, approval_id, amount_minor, status, provider)
      VALUES ($1, $2, $3, $4, $5, 'CREATING', 'woovi')
      ON CONFLICT (workspace_id, correlation_id) DO NOTHING RETURNING *
    `, workspace, correlationId, commandActionId, approvalId, amountMinor);

    if (!inserted.length) {
      const existing = (await prisma.$queryRawUnsafe<ChargeReservation[]>(`SELECT * FROM nexoffice_charge_receipts WHERE workspace_id=$1 AND correlation_id=$2 LIMIT 1`, workspace, correlationId))[0];
      if (existing && ['CREATED', 'PAID', 'EXPIRED', 'CANCELED'].includes(existing.status)) {
        return { success: true, created: true, duplicate: true, correlationId, workspaceId: workspace, provider: existing.provider, status: existing.status, charge: existing.receipt || null, externalEffect: false };
      }
      throw new HttpException({ success: false, duplicate: true, uncertain: existing?.status === 'UNCERTAIN' || existing?.status === 'CREATING', status: existing?.status || 'UNKNOWN', correlationId, workspaceId: workspace, error: existing?.status === 'CREATING' ? 'charge_creation_in_progress_or_interrupted_reconciliation_required' : 'previous_attempt_uncertain_manual_reconciliation_required' }, HttpStatus.CONFLICT);
    }

    const resourceId = `${workspace}:${correlationId}`;
    await this.audit('NEXOFFICE_CHARGE_REQUESTED', 'nexoffice_charge', resourceId, { workspaceId: workspace, correlationId, commandActionId, approvalId, amountMinor, humanApproved: true });
    try {
      const charge = await this.woovi.createCharge({ correlationID: correlationId, value: amountMinor, comment: description, customer, expiresIn: 3600 });
      const receipt = safeChargeReceipt(charge);
      await prisma.$executeRawUnsafe(`UPDATE nexoffice_charge_receipts SET status='CREATED',provider_charge_id=$3,receipt=$4::jsonb,last_error=NULL,updated_at=NOW() WHERE workspace_id=$1 AND correlation_id=$2 AND status='CREATING'`, workspace, correlationId, String(charge.id || charge.identifier || ''), JSON.stringify(receipt));
      await this.audit('NEXOFFICE_CHARGE_CREATED', 'nexoffice_charge', resourceId, { workspaceId: workspace, correlationId, commandActionId, approvalId, amountMinor, providerChargeId: charge.id });
      return { success: true, created: true, duplicate: false, correlationId, workspaceId: workspace, provider: 'woovi', status: 'CREATED', charge: receipt, externalEffect: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try { await prisma.$executeRawUnsafe(`UPDATE nexoffice_charge_receipts SET status='UNCERTAIN',last_error=$3,updated_at=NOW() WHERE workspace_id=$1 AND correlation_id=$2 AND status='CREATING'`, workspace, correlationId, message.slice(0, 2000)); } catch {}
      await this.audit('NEXOFFICE_CHARGE_UNCERTAIN', 'nexoffice_charge', resourceId, { workspaceId: workspace, correlationId, commandActionId, approvalId, amountMinor, reconciliationRequired: true, error: message.slice(0, 1000) });
      throw new HttpException({ success: false, uncertain: true, duplicate: false, correlationId, workspaceId: workspace, error: 'provider_result_uncertain_manual_reconciliation_required' }, HttpStatus.CONFLICT);
    }
  }

  @Get('charges/:correlationId')
  async getChargeStatus(
    @Headers('x-nexoffice-key') key: string | undefined,
    @Headers('x-nexoffice-workspace-id') workspaceId: string | undefined,
    @Param('correlationId') rawCorrelationId: string,
  ) {
    const workspace = this.authorize(key, workspaceId);
    const correlationId = clean(rawCorrelationId, 220);
    await ensureTables();
    const receipt = (await prisma.$queryRawUnsafe<ChargeReservation[]>(`SELECT * FROM nexoffice_charge_receipts WHERE workspace_id=$1 AND correlation_id=$2 LIMIT 1`, workspace, correlationId))[0];
    if (!receipt) throw new HttpException({ success: false, error: 'charge_not_found' }, HttpStatus.NOT_FOUND);
    return { success: true, workspaceId: workspace, correlationId, status: receipt.status, provider: receipt.provider, charge: receipt.receipt || null, uncertain: receipt.status === 'UNCERTAIN' || receipt.status === 'CREATING', externalEffect: false };
  }

  @Post('charges/:correlationId/reconcile')
  async reconcileCharge(
    @Headers('x-nexoffice-key') key: string | undefined,
    @Headers('x-nexoffice-workspace-id') workspaceId: string | undefined,
    @Param('correlationId') rawCorrelationId: string,
  ) {
    const workspace = this.authorize(key, workspaceId);
    const correlationId = clean(rawCorrelationId, 220);
    await ensureTables();
    const receipt = (await prisma.$queryRawUnsafe<ChargeReservation[]>(`SELECT * FROM nexoffice_charge_receipts WHERE workspace_id=$1 AND correlation_id=$2 LIMIT 1`, workspace, correlationId))[0];
    if (!receipt) throw new HttpException({ success: false, error: 'charge_not_found' }, HttpStatus.NOT_FOUND);
    if (!receipt.provider_charge_id) return { success: true, reconciled: false, correlationId, status: receipt.status, reason: 'provider_charge_id_missing', externalEffect: false };
    try {
      const providerCharge = await this.woovi.getCharge(receipt.provider_charge_id);
      const status = normalizedChargeStatus(providerCharge.status);
      const safe = safeChargeReceipt(providerCharge);
      await prisma.$executeRawUnsafe(`UPDATE nexoffice_charge_receipts SET status=$3,receipt=$4::jsonb,last_error=NULL,updated_at=NOW() WHERE workspace_id=$1 AND correlation_id=$2`, workspace, correlationId, status, JSON.stringify(safe));
      await this.audit('NEXOFFICE_CHARGE_RECONCILED', 'nexoffice_charge', `${workspace}:${correlationId}`, { workspaceId: workspace, correlationId, status, providerChargeId: receipt.provider_charge_id });
      return { success: true, reconciled: true, workspaceId: workspace, correlationId, status, provider: 'woovi', charge: safe, externalEffect: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, reconciled: false, workspaceId: workspace, correlationId, status: receipt.status, error: 'provider_reconciliation_unavailable', detail: message.slice(0, 300), externalEffect: false };
    }
  }

  @Post('subscriptions')
  async createSubscription(
    @Headers('x-nexoffice-key') key: string | undefined,
    @Headers('x-nexoffice-workspace-id') workspaceId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: SubscriptionBody,
  ) {
    const workspace = this.authorize(key, workspaceId);
    this.requireActionEnabled();
    this.requireHumanApproval(body?.humanApproved);
    const commandActionId = clean(body?.commandActionId, 120);
    const correlationId = clean(idempotencyKey || body?.correlationId, 220);
    const approvalId = clean(body?.approvalId, 120) || null;
    const amountMinor = Number(body?.amountMinor ?? body?.valueMinor ?? 0);
    const dayGenerateCharge = Number(body?.dayGenerateCharge || 0);
    const customer = sanitizeCustomer(body?.customer);
    if (!commandActionId) throw new HttpException({ success: false, error: 'command_action_required' }, HttpStatus.BAD_REQUEST);
    if (!correlationId) throw new HttpException({ success: false, error: 'correlation_required' }, HttpStatus.BAD_REQUEST);
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 100_000_000) throw new HttpException({ success: false, error: 'invalid_amount_minor' }, HttpStatus.UNPROCESSABLE_ENTITY);
    if (!Number.isInteger(dayGenerateCharge) || dayGenerateCharge < 1 || dayGenerateCharge > 27) throw new HttpException({ success: false, error: 'invalid_day_generate_charge' }, HttpStatus.UNPROCESSABLE_ENTITY);
    if (!customer?.name || !customer?.taxID) throw new HttpException({ success: false, error: 'customer_name_and_taxid_required' }, HttpStatus.UNPROCESSABLE_ENTITY);

    await ensureTables();
    const inserted = await prisma.$queryRawUnsafe<SubscriptionReservation[]>(`
      INSERT INTO nexoffice_subscription_receipts (workspace_id,correlation_id,command_action_id,approval_id,amount_minor,status,provider)
      VALUES ($1,$2,$3,$4,$5,'CREATING','woovi') ON CONFLICT (workspace_id,correlation_id) DO NOTHING RETURNING *
    `, workspace, correlationId, commandActionId, approvalId, amountMinor);
    if (!inserted.length) {
      const existing = (await prisma.$queryRawUnsafe<SubscriptionReservation[]>(`SELECT * FROM nexoffice_subscription_receipts WHERE workspace_id=$1 AND correlation_id=$2 LIMIT 1`, workspace, correlationId))[0];
      if (existing && ['ACTIVE', 'CREATED', 'CANCELED'].includes(existing.status)) return { success: true, created: true, duplicate: true, correlationId, workspaceId: workspace, status: existing.status, subscription: existing.receipt || null, externalEffect: false };
      throw new HttpException({ success: false, duplicate: true, uncertain: existing?.status === 'CREATING' || existing?.status === 'UNCERTAIN', status: existing?.status || 'UNKNOWN', error: 'previous_subscription_attempt_requires_reconciliation' }, HttpStatus.CONFLICT);
    }

    const resourceId = `${workspace}:${correlationId}`;
    await this.audit('NEXOFFICE_SUBSCRIPTION_REQUESTED', 'nexoffice_subscription', resourceId, { workspaceId: workspace, correlationId, commandActionId, approvalId, amountMinor, dayGenerateCharge, periodicity: body.periodicity || 'MONTHLY', humanApproved: true });
    try {
      const subscription = await this.woovi.createSubscription({ value: amountMinor, customer: { name: customer.name, taxID: customer.taxID, email: customer.email, phone: customer.phone }, dayGenerateCharge, periodicity: body.periodicity || 'MONTHLY', correlationID: correlationId });
      const receipt = safeSubscriptionReceipt(subscription);
      const providerId = clean(subscription?.globalID || subscription?.id, 180);
      await prisma.$executeRawUnsafe(`UPDATE nexoffice_subscription_receipts SET status='ACTIVE',provider_subscription_id=$3,receipt=$4::jsonb,last_error=NULL,updated_at=NOW() WHERE workspace_id=$1 AND correlation_id=$2 AND status='CREATING'`, workspace, correlationId, providerId, JSON.stringify(receipt));
      await this.audit('NEXOFFICE_SUBSCRIPTION_CREATED', 'nexoffice_subscription', resourceId, { workspaceId: workspace, correlationId, providerSubscriptionId: providerId, amountMinor, dayGenerateCharge });
      return { success: true, created: true, duplicate: false, workspaceId: workspace, correlationId, provider: 'woovi', status: 'ACTIVE', subscription: receipt, externalEffect: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try { await prisma.$executeRawUnsafe(`UPDATE nexoffice_subscription_receipts SET status='UNCERTAIN',last_error=$3,updated_at=NOW() WHERE workspace_id=$1 AND correlation_id=$2 AND status='CREATING'`, workspace, correlationId, message.slice(0, 2000)); } catch {}
      await this.audit('NEXOFFICE_SUBSCRIPTION_UNCERTAIN', 'nexoffice_subscription', resourceId, { workspaceId: workspace, correlationId, reconciliationRequired: true, error: message.slice(0, 1000) });
      throw new HttpException({ success: false, uncertain: true, correlationId, error: 'provider_result_uncertain_manual_reconciliation_required' }, HttpStatus.CONFLICT);
    }
  }

  @Get('subscriptions/:correlationId')
  async getSubscriptionStatus(
    @Headers('x-nexoffice-key') key: string | undefined,
    @Headers('x-nexoffice-workspace-id') workspaceId: string | undefined,
    @Param('correlationId') rawCorrelationId: string,
  ) {
    const workspace = this.authorize(key, workspaceId);
    const correlationId = clean(rawCorrelationId, 220);
    await ensureTables();
    const receipt = (await prisma.$queryRawUnsafe<SubscriptionReservation[]>(`SELECT * FROM nexoffice_subscription_receipts WHERE workspace_id=$1 AND correlation_id=$2 LIMIT 1`, workspace, correlationId))[0];
    if (!receipt) throw new HttpException({ success: false, error: 'subscription_not_found' }, HttpStatus.NOT_FOUND);
    return { success: true, workspaceId: workspace, correlationId, status: receipt.status, provider: receipt.provider, subscription: receipt.receipt || null, uncertain: receipt.status === 'UNCERTAIN' || receipt.status === 'CREATING', externalEffect: false };
  }

  @Post('subscriptions/:correlationId/cancel')
  async cancelSubscription(
    @Headers('x-nexoffice-key') key: string | undefined,
    @Headers('x-nexoffice-workspace-id') workspaceId: string | undefined,
    @Param('correlationId') rawCorrelationId: string,
    @Body() body: { humanApproved?: boolean; approvalId?: string | null },
  ) {
    const workspace = this.authorize(key, workspaceId);
    this.requireActionEnabled();
    this.requireHumanApproval(body?.humanApproved);
    const correlationId = clean(rawCorrelationId, 220);
    await ensureTables();
    const receipt = (await prisma.$queryRawUnsafe<SubscriptionReservation[]>(`SELECT * FROM nexoffice_subscription_receipts WHERE workspace_id=$1 AND correlation_id=$2 LIMIT 1`, workspace, correlationId))[0];
    if (!receipt) throw new HttpException({ success: false, error: 'subscription_not_found' }, HttpStatus.NOT_FOUND);
    if (!receipt.provider_subscription_id) throw new HttpException({ success: false, error: 'provider_subscription_id_missing' }, HttpStatus.CONFLICT);
    if (receipt.status === 'CANCELED') return { success: true, duplicate: true, workspaceId: workspace, correlationId, status: 'CANCELED', externalEffect: false };
    await this.woovi.cancelSubscription(receipt.provider_subscription_id);
    await prisma.$executeRawUnsafe(`UPDATE nexoffice_subscription_receipts SET status='CANCELED',updated_at=NOW() WHERE workspace_id=$1 AND correlation_id=$2`, workspace, correlationId);
    await this.audit('NEXOFFICE_SUBSCRIPTION_CANCELED', 'nexoffice_subscription', `${workspace}:${correlationId}`, { workspaceId: workspace, correlationId, providerSubscriptionId: receipt.provider_subscription_id, approvalId: clean(body?.approvalId, 120) || null, humanApproved: true });
    return { success: true, workspaceId: workspace, correlationId, status: 'CANCELED', externalEffect: true };
  }
}
