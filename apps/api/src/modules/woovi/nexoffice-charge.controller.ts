import { Body, Controller, Get, Headers, HttpException, HttpStatus, Post } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { timingSafeEqual } from 'crypto';
import { WooviPixAdapter } from './woovi-pix-adapter';

const prisma = new PrismaClient();
let ensureTablePromise: Promise<unknown> | null = null;

type ChargeBody = {
  correlationId?: string;
  commandActionId?: string;
  approvalId?: string | null;
  humanApproved?: boolean;
  amountMinor?: number;
  valueMinor?: number;
  description?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    taxID?: string;
  };
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

function clean(value: unknown, max: number) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);
}

function safeEqual(received: string, expected: string) {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sanitizeCustomer(customer: ChargeBody['customer']) {
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

async function ensureReceiptTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
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
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_nexoffice_charge_receipts_action
        ON nexoffice_charge_receipts(command_action_id)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_nexoffice_charge_receipts_status
        ON nexoffice_charge_receipts(status, updated_at DESC)
      `);
    })().catch(error => {
      ensureTablePromise = null;
      throw error;
    });
  }
  return ensureTablePromise;
}

@Controller('internal/nexoffice')
export class NexOfficeChargeController {
  constructor(private readonly woovi: WooviPixAdapter) {}

  private authorize(key: string | undefined, workspaceId: string | undefined) {
    const expected = String(process.env.NEXOFFICE_SERVICE_KEY || '').trim();
    if (!expected) {
      throw new HttpException({ success: false, error: 'bridge_not_configured' }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    if (!safeEqual(String(key || ''), expected)) {
      throw new HttpException({ success: false, error: 'unauthorized' }, HttpStatus.UNAUTHORIZED);
    }
    const workspace = clean(workspaceId, 120);
    if (!workspace) {
      throw new HttpException({ success: false, error: 'workspace_required' }, HttpStatus.BAD_REQUEST);
    }
    return workspace;
  }

  private async audit(action: string, resourceId: string, metadata: Record<string, unknown>) {
    try {
      await prisma.auditLog.create({
        data: {
          actor: 'service:nexoffice',
          action,
          resource: 'nexoffice_charge',
          resourceId,
          metadata: prismaJson(metadata),
        },
      });
    } catch {
      // O recibo idempotente é a fonte de verdade. AuditLog é trilha adicional.
    }
  }

  @Get('health')
  async health(
    @Headers('x-nexoffice-key') key?: string,
    @Headers('x-nexoffice-workspace-id') workspaceId?: string,
  ) {
    const workspace = this.authorize(key, workspaceId);
    await ensureReceiptTable();
    return {
      success: true,
      status: 'online',
      service: 'nextgen-nexoffice-bridge',
      workspaceId: workspace,
      capabilities: ['pix.charge.create.approved'],
      provider: 'woovi',
      externalEffects: true,
      requiresHumanApproval: true,
      idempotent: true,
      ambiguousResultPolicy: 'block_retry_until_reconciled',
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
    if (body?.humanApproved !== true) {
      throw new HttpException({ success: false, error: 'human_approval_required' }, HttpStatus.CONFLICT);
    }

    const commandActionId = clean(body?.commandActionId, 120);
    const correlationId = clean(idempotencyKey || body?.correlationId, 220);
    const approvalId = clean(body?.approvalId, 120) || null;
    const amountMinor = Number(body?.amountMinor ?? body?.valueMinor ?? 0);
    const description = clean(body?.description || 'Cobrança NexOffice', 240);
    const customer = sanitizeCustomer(body?.customer);

    if (!commandActionId) {
      throw new HttpException({ success: false, error: 'command_action_required' }, HttpStatus.BAD_REQUEST);
    }
    if (!correlationId) {
      throw new HttpException({ success: false, error: 'correlation_required' }, HttpStatus.BAD_REQUEST);
    }
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 100_000_000) {
      throw new HttpException({ success: false, error: 'invalid_amount_minor' }, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    await ensureReceiptTable();

    const inserted = await prisma.$queryRawUnsafe<ChargeReservation[]>(`
      INSERT INTO nexoffice_charge_receipts (
        workspace_id, correlation_id, command_action_id, approval_id, amount_minor, status, provider
      ) VALUES ($1, $2, $3, $4, $5, 'CREATING', 'woovi')
      ON CONFLICT (workspace_id, correlation_id) DO NOTHING
      RETURNING *
    `, workspace, correlationId, commandActionId, approvalId, amountMinor);

    if (!inserted.length) {
      const rows = await prisma.$queryRawUnsafe<ChargeReservation[]>(`
        SELECT * FROM nexoffice_charge_receipts
        WHERE workspace_id = $1 AND correlation_id = $2
        LIMIT 1
      `, workspace, correlationId);
      const existing = rows[0];

      if (existing?.status === 'CREATED') {
        return {
          success: true,
          created: true,
          duplicate: true,
          correlationId,
          workspaceId: workspace,
          provider: existing.provider,
          charge: existing.receipt || null,
        };
      }

      throw new HttpException({
        success: false,
        duplicate: true,
        uncertain: existing?.status === 'UNCERTAIN' || existing?.status === 'CREATING',
        status: existing?.status || 'UNKNOWN',
        correlationId,
        workspaceId: workspace,
        error: existing?.status === 'CREATING'
          ? 'charge_creation_in_progress_or_interrupted_reconciliation_required'
          : 'previous_attempt_uncertain_manual_reconciliation_required',
      }, HttpStatus.CONFLICT);
    }

    const resourceId = `${workspace}:${correlationId}`;
    await this.audit('NEXOFFICE_CHARGE_REQUESTED', resourceId, {
      workspaceId: workspace,
      correlationId,
      commandActionId,
      approvalId,
      amountMinor,
      humanApproved: true,
    });

    try {
      const charge = await this.woovi.createCharge({
        correlationID: correlationId,
        value: amountMinor,
        comment: description,
        customer,
        expiresIn: 3600,
      });

      const receipt = {
        id: charge.id,
        identifier: charge.identifier,
        correlationID: charge.correlationID,
        status: charge.status,
        value: charge.value,
        qrCodeImage: charge.qrCodeImage,
        brCode: charge.brCode,
        paymentLinkID: charge.paymentLinkID,
        paymentLinkUrl: charge.paymentLinkUrl,
        createdAt: charge.createdAt,
      };

      await prisma.$executeRawUnsafe(`
        UPDATE nexoffice_charge_receipts
        SET status = 'CREATED', provider_charge_id = $3, receipt = $4::jsonb,
            last_error = NULL, updated_at = NOW()
        WHERE workspace_id = $1 AND correlation_id = $2 AND status = 'CREATING'
      `, workspace, correlationId, String(charge.id || ''), JSON.stringify(receipt));

      await this.audit('NEXOFFICE_CHARGE_CREATED', resourceId, {
        workspaceId: workspace,
        correlationId,
        commandActionId,
        approvalId,
        amountMinor,
        providerChargeId: charge.id,
      });

      return {
        success: true,
        created: true,
        duplicate: false,
        correlationId,
        workspaceId: workspace,
        provider: 'woovi',
        charge: receipt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        await prisma.$executeRawUnsafe(`
          UPDATE nexoffice_charge_receipts
          SET status = 'UNCERTAIN', last_error = $3, updated_at = NOW()
          WHERE workspace_id = $1 AND correlation_id = $2 AND status = 'CREATING'
        `, workspace, correlationId, message.slice(0, 2000));
      } catch {
        // Se até a marcação falhar, a reserva CREATING continua bloqueando retry automático.
      }

      await this.audit('NEXOFFICE_CHARGE_UNCERTAIN', resourceId, {
        workspaceId: workspace,
        correlationId,
        commandActionId,
        approvalId,
        amountMinor,
        reconciliationRequired: true,
        error: message.slice(0, 1000),
      });

      throw new HttpException({
        success: false,
        uncertain: true,
        duplicate: false,
        correlationId,
        workspaceId: workspace,
        error: 'provider_result_uncertain_manual_reconciliation_required',
      }, HttpStatus.CONFLICT);
    }
  }
}