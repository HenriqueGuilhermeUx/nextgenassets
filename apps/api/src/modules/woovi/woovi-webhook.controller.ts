// ============================================
//  WOOVI WEBHOOK CONTROLLER
//  Recebe eventos: charge.paid, charge.failed, transfer.paid
//  HMAC: X-Webhook-Signature
// ============================================

import { Controller, Post, Get, Body, Headers, Logger, Req, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { PrismaClient } from '@prisma/client';
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
      apiUrl: process.env.WOOVI_API_URL || 'https://api.woovi.com'
    };
    return { success: true, ts: Date.now(), config: cfg };
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
}
