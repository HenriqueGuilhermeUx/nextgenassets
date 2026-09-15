import { Body, Controller, Get, Headers, HttpException, HttpStatus, Post } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash, timingSafeEqual } from 'crypto';
import { WooviPixAdapter } from './woovi-pix-adapter';

const prisma = new PrismaClient();

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

function clean(value: unknown, max: number) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);
}

function safeEqual(received: string, expected: string) {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function advisoryKey(value: string) {
  const digest = createHash('sha256').update(value).digest();
  return digest.readBigInt64BE(0);
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

  @Get('health')
  health(
    @Headers('x-nexoffice-key') key?: string,
    @Headers('x-nexoffice-workspace-id') workspaceId?: string,
  ) {
    const workspace = this.authorize(key, workspaceId);
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

    const resourceId = `${workspace}:${correlationId}`;
    const lockKey = advisoryKey(resourceId);

    const outcome = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1::bigint)', lockKey.toString());

      const existing = await tx.auditLog.findFirst({
        where: {
          resource: 'nexoffice_charge',
          resourceId,
          action: { in: ['NEXOFFICE_CHARGE_CREATED', 'NEXOFFICE_CHARGE_UNCERTAIN'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing?.action === 'NEXOFFICE_CHARGE_CREATED') {
        const meta = (existing.metadata || {}) as Record<string, any>;
        return {
          success: true,
          created: true,
          duplicate: true,
          correlationId,
          workspaceId: workspace,
          charge: meta.charge || null,
        };
      }

      if (existing?.action === 'NEXOFFICE_CHARGE_UNCERTAIN') {
        return {
          success: false,
          uncertain: true,
          duplicate: true,
          correlationId,
          workspaceId: workspace,
          error: 'previous_attempt_uncertain_manual_reconciliation_required',
        };
      }

      await tx.auditLog.create({
        data: {
          actor: `service:nexoffice:${workspace}`,
          action: 'NEXOFFICE_CHARGE_REQUESTED',
          resource: 'nexoffice_charge',
          resourceId,
          metadata: {
            workspaceId: workspace,
            correlationId,
            commandActionId,
            approvalId,
            amountMinor,
            humanApproved: true,
          },
        },
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

        await tx.auditLog.create({
          data: {
            actor: `service:nexoffice:${workspace}`,
            action: 'NEXOFFICE_CHARGE_CREATED',
            resource: 'nexoffice_charge',
            resourceId,
            metadata: {
              workspaceId: workspace,
              correlationId,
              commandActionId,
              approvalId,
              amountMinor,
              charge: receipt,
            },
          },
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
        await tx.auditLog.create({
          data: {
            actor: `service:nexoffice:${workspace}`,
            action: 'NEXOFFICE_CHARGE_UNCERTAIN',
            resource: 'nexoffice_charge',
            resourceId,
            metadata: {
              workspaceId: workspace,
              correlationId,
              commandActionId,
              approvalId,
              amountMinor,
              error: message.slice(0, 1000),
              reconciliationRequired: true,
            },
          },
        });
        return {
          success: false,
          uncertain: true,
          duplicate: false,
          correlationId,
          workspaceId: workspace,
          error: 'provider_result_uncertain_manual_reconciliation_required',
        };
      }
    }, { timeout: 30_000 });

    if (!outcome.success) {
      throw new HttpException(outcome, HttpStatus.CONFLICT);
    }
    return outcome;
  }
}
