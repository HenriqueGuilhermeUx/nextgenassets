import { Body, Controller, Get, Logger, Post, Req, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { timingSafeEqual, randomUUID } from 'crypto';
import { Request } from 'express';

const logger = new Logger('EfiOFWebhookReceiver');
const prisma = new PrismaClient();

@Controller('webhooks/efi-of-public')
export class EfiOFWebhookReceiverController {
  private assertHmac(req: Request): void {
    const expected = process.env.EFI_OF_WEBHOOK_HMAC;
    if (!expected || expected.length < 32 || /SUBSTITUA|PLACEHOLDER|TROCAR|EXAMPLE|XXXXX/i.test(expected)) {
      throw new ServiceUnavailableException('EFI_OF_CALLBACK_SECRET_NOT_CONFIGURED');
    }
    const supplied = req.query?.hmac;
    if (typeof supplied !== 'string' || supplied.length !== expected.length ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
      throw new UnauthorizedException('EFI_OF_CALLBACK_UNAUTHORIZED');
    }
  }
  @Get()
  health() { return { service: 'efi-of-public-webhook', status: 'ready', bankAuthorizationConfirmed: false }; }

  @Post()
  async handle(@Body() body: any = {}, @Req() req: Request) {
    this.assertHmac(req);
    const payload = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const eventRaw = payload.event ?? payload.type ?? payload.evento;
    const event = typeof eventRaw === 'string' && /^[a-zA-Z0-9._-]{1,80}$/.test(eventRaw) ? eventRaw : 'unknown';
    // A callback is not evidence of bank settlement or a customer authorization.
    // Persist a non-PII audit receipt until a separate authenticated read-back
    // reconciler validates mandate, tenant, amount and beneficiary.
    try {
      await prisma.auditLog.create({ data: {
        actor: 'webhook:efi-of', action: 'EFI_OF_CALLBACK_RECONCILIATION_PENDING',
        resource: 'efi-of-callback', resourceId: randomUUID(),
        metadata: { provider: 'efi-of', event, bankVerified: false, mutationApplied: false }
      } as any });
      logger.log('Efí OF callback pending bank verification');
      return { received: true, event, consentConfirmed: false, bankPaymentConfirmed: false };
    } catch (_error: unknown) {
      logger.error('EFI_OF_CALLBACK_AUDIT_UNAVAILABLE');
      throw new ServiceUnavailableException('EFI_OF_CALLBACK_PERSIST_FAILED');
    }
  }
}
