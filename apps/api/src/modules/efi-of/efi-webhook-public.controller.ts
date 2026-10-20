import { Body, Controller, Get, Logger, Post, Req, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID, timingSafeEqual } from 'crypto';
import { Request } from 'express';

const logger = new Logger('EfiWebhookPublic');
const prisma = new PrismaClient();

@Controller('webhooks/efi-public')
export class EfiWebhookPublicController {
  private assertHmac(req: Request): void {
    const expected = process.env.EFI_PIX_WEBHOOK_HMAC;
    if (!expected || expected.length < 32 || /SUBSTITUA|PLACEHOLDER|TROCAR|EXAMPLE|XXXXX/i.test(expected)) {
      throw new ServiceUnavailableException('EFI_PIX_CALLBACK_SECRET_NOT_CONFIGURED');
    }
    const supplied = req.query?.hmac;
    if (typeof supplied !== 'string' || supplied.length !== expected.length ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
      throw new UnauthorizedException('EFI_PIX_CALLBACK_UNAUTHORIZED');
    }
  }

  @Post(['pix', 'rec', 'cobr', ''])
  async handle(@Body() body: any = {}, @Req() req: Request) {
    this.assertHmac(req);
    const payload = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const eventRaw = payload.evento ?? payload.event ?? payload.type ?? (Array.isArray(payload.pix) ? 'pix' : 'unknown');
    const event = typeof eventRaw === 'string' && /^[a-zA-Z0-9._-]{1,80}$/.test(eventRaw) ? eventRaw : 'unknown';
    // Never trust incoming callbacks to credit balances without independent bank verification.
    try {
      await prisma.auditLog.create({ data: {
        actor: 'webhook:efi', action: 'EFI_PIX_CALLBACK_RECONCILIATION_PENDING',
        resource: 'efi-pix-callback', resourceId: randomUUID(),
        metadata: { provider: 'efi', event, bankVerified: false, mutationApplied: false }
      } as any });
      logger.log('Efí Pix callback pending bank verification');
      return { received: true, event, bankPaymentConfirmed: false };
    } catch (_error: unknown) {
      logger.error('EFI_PIX_CALLBACK_AUDIT_UNAVAILABLE');
      throw new ServiceUnavailableException('EFI_PIX_CALLBACK_PERSIST_FAILED');
    }
  }
  @Get()
  health() { return { status: 'ok', service: 'efi-webhook-public' }; }
}
