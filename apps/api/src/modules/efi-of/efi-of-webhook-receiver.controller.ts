// ============================================
//  EFI OPEN FINANCE WEBHOOK RECEIVER
//  Recebe: consent.authorized, consent.rejected, payment.completed
//  Salva no DB + trigga gatilhos
//  Rota real com prefixo global: /v1/webhooks/efi-of-public
// ============================================

import { Controller, Get, Post, Body, Logger, Req, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { PrismaClient } from '@prisma/client';

const logger = new Logger('EfiOFWebhookReceiver');
const prisma = new PrismaClient();

@Controller('webhooks/efi-of-public')
export class EfiOFWebhookReceiverController {
  /**
   * Efí Open Finance supports HMAC carried as URL query parameter.
   * This must be configured in BOTH Efí application webhook and Render env.
   * For mTLS-only callbacks, provide a trusted proxy validation mechanism
   * before deployment; this implementation intentionally fails closed.
   */
  private assertHmac(req: Request) {
    const expected = process.env.EFI_OF_WEBHOOK_HMAC;
    if (!expected || expected.length < 32 || /SUBSTITUA|PLACEHOLDER|TROCAR|EXAMPLE|XXXXX/i.test(expected)) {
      throw new ServiceUnavailableException('EFI_WEBHOOK_AUTH_NOT_CONFIGURED');
    }
    const hmac = req.query?.hmac;
    if (typeof hmac !== 'string' || hmac.length !== expected.length ||
        !timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) {
      throw new UnauthorizedException('INVALID_EFI_WEBHOOK_AUTH');
    }
  }


  @Get()
  health() {
    return {
      success: true,
      received: true,
      service: 'efi-of-public-webhook',
      type: 'webhook-validation',
      event: 'webhook.validation',
      ts: Date.now()
    };
  }
  
  @Post()
  async handle(@Body() body: any = {}, @Req() req: Request) {
    this.assertHmac(req);
    const payload = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const eventRaw = payload.event || payload.type || payload.evento;
    // Callback metadata is untrusted: never reflect arbitrary text into logs or the response.
    const event = typeof eventRaw === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(eventRaw)
      ? eventRaw : 'unknown';
    const data = payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
      ? payload.data : payload;
    logger.log('Efí OF webhook received');
    // Never log webhook bodies, PII, tokens or consent metadata.

    try {
      if (event.includes('consent.authorized') || event.includes('consent.granted') || event.includes('adesao.autorizada')) {
        const cpf = data.loggedUser?.document?.identification || data.cpf || data.documento || data.pagador?.cpf;
        const consentId = data.consentId || data.identificadorAdesao || data.idAdesao;
        
        if (cpf && consentId) {
          const user = await prisma.consumerUser.findFirst({
            where: { externalUserId: String(cpf) }
          });

          if (user) {
            const consent = await prisma.consent.upsert({
              where: { userId_provider: { userId: user.id, provider: 'efi-of' } },
              update: {
                status: 'ACTIVE' as any,
                providerUserId: String(cpf),
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                metadata: {
                  efiConsentId: consentId,
                  efiIdentificadorAdesao: consentId,
                  status: 'authorized',
                  event,
                  webhookVerified: true, webhookReceivedAt: new Date().toISOString()
                } as any
              },
              create: {
                userId: user.id,
                partnerId: user.partnerId,
                provider: 'efi-of',
                providerUserId: String(cpf),
                scopes: ['accounts.read', 'transactions.read', 'payments.initiate'],
                status: 'ACTIVE' as any,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                metadata: {
                  efiConsentId: consentId,
                  efiIdentificadorAdesao: consentId,
                  status: 'authorized',
                  event,
                  webhookVerified: true, webhookReceivedAt: new Date().toISOString()
                } as any
              } as any
            });

            await prisma.auditLog.create({
              data: {
                partnerId: user.partnerId,
                userId: user.id,
                actor: 'webhook:efi-of',
                action: 'EFI_OF_CONSENT_ACTIVE',
                resource: 'consent',
                resourceId: consent.id,
                metadata: { consentId, event } as any
              } as any
            });
            logger.log(`✅ Consent ACTIVE atualizado: ${consent.id}`);
          } else {
            logger.warn('Webhook pagador não associado a usuário conhecido');
          }
        } else {
          logger.warn(`⚠️ Webhook de consentimento sem cpf ou consentId`);
        }
      }

      if (event.includes('consent.rejected') || event.includes('consent.revoked') || event.includes('adesao.rejeitada')) {
        const cpf = data.loggedUser?.document?.identification || data.cpf || data.documento || data.pagador?.cpf;
        const consentId = data.consentId || data.identificadorAdesao || data.idAdesao;
        if (cpf) {
          const user = await prisma.consumerUser.findFirst({ where: { externalUserId: String(cpf) } });
          if (user) {
            await prisma.consent.updateMany({
              where: { userId: user.id, provider: 'efi-of' },
              data: {
                status: event.includes('revoked') ? 'REVOKED' as any : 'FAILED' as any,
                revokedAt: event.includes('revoked') ? new Date() : undefined,
                metadata: { efiConsentId: consentId, status: 'not_authorized', event, webhookVerified: true, webhookReceivedAt: new Date().toISOString() } as any
              } as any
            });
          }
        }
      }
      
      if (event.includes('payment.completed') || event.includes('payment.paid') || event.includes('pagamento.concluido')) {
        const paymentId = data.paymentId || data.identificadorPagamento || data.idPagamento;
        const endToEndId = data.endToEndId;
        const amount = data.payment?.amount || data.amount || data.valor;
        logger.log('Efí payment callback received; settlement not verified');
        
        await prisma.auditLog.create({
          data: {
            action: 'PAYMENT_INITIATED_OF',
            resource: 'payment',
            resourceId: paymentId || `efi-of-payment-${Date.now()}`,
            actor: 'webhook:efi-of',
            metadata: {
              provider: 'efi-of',
              paymentId,
              endToEndId,
              amount: amount ? parseFloat(amount) : null,
              event
            } as any
          } as any
        });
      }
      
      return {
        success: true,
        received: true,
        service: 'efi-of-public-webhook',
        type: event,
        event,
        ts: Date.now()
      };
    } catch (_err: unknown) {
      // Do not acknowledge an event that failed to persist: the bank must see a non-2xx.
      // Never return or log provider payloads, identifiers, or DB error messages.
      logger.error('EFI_OF_WEBHOOK_PROCESSING_FAILED');
      throw new ServiceUnavailableException('EFI_OF_WEBHOOK_PROCESSING_FAILED');
    }
  }
}
