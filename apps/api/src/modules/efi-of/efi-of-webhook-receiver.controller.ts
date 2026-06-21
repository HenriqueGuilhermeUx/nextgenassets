// ============================================
//  EFI OPEN FINANCE WEBHOOK RECEIVER
//  Recebe: consent.authorized, consent.rejected, payment.completed
//  Salva no DB + trigga gatilhos
// ============================================

import { Controller, Post, Body, Logger, Req } from '@nestjs/common';
import { Request } from 'express';
import { PrismaClient } from '@prisma/client';

const logger = new Logger('EfiOFWebhookReceiver');
const prisma = new PrismaClient();

@Controller('v1/webhooks/efi-of-public')
export class EfiOFWebhookReceiverController {
  
  @Post()
  async handle(@Body() body: any, @Req() req: Request) {
    const event = body.event || body.type || 'unknown';
    const data = body.data || body;
    logger.log(`📥 Efi OF webhook: ${event}`);
    logger.log(`Body: ${JSON.stringify(body).substring(0, 500)}`);

    try {
      if (event.includes('consent.authorized') || event.includes('consent.granted')) {
        // Cliente autorizou! Salva consent ACTIVE
        const cpf = data.loggedUser?.document?.identification || data.cpf;
        const consentId = data.consentId;
        
        if (cpf && consentId) {
          const user = await prisma.consumerUser.findFirst({
            where: { externalUserId: cpf }
          });
          if (user) {
            await prisma.$executeRawUnsafe(
              `INSERT INTO "Consent" (id, "userId", "partnerId", provider, "providerUserId", scopes, status, "expiresAt", metadata, "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, $6::text[], $7::"ConsentStatus", $8, $9::jsonb, NOW(), NOW())
               ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE'::"ConsentStatus", "updatedAt" = NOW()`,
              `efi-of-${consentId}`,
              user.id,
              user.partnerId,
              'efi-of',
              cpf,
              '{accounts.read,transactions.read,payments.initiate}',
              'ACTIVE',
              new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              JSON.stringify({ efiConsentId: consentId, status: 'authorized', event })
            );
            logger.log(`✅ Consent ACTIVE salvo: efi-of-${consentId}`);
          }
        }
      }
      
      if (event.includes('payment.completed') || event.includes('payment.paid')) {
        // Pagamento PIX completado via OF
        const paymentId = data.paymentId;
        const endToEndId = data.endToEndId;
        const amount = data.payment?.amount || data.amount;
        logger.log(`💸 Payment completed: ${paymentId} R$ ${amount}`);
        
        // Loga audit
        await prisma.auditLog.create({
          data: {
            action: 'PAYMENT_INITIATED_OF',
            resource: 'payment',
            resourceId: paymentId,
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
      
      return { received: true, event };
    } catch (err: any) {
      logger.error(`Erro: ${err.message}`);
      return { received: true, error: err.message };
    } finally {
      await prisma.$disconnect();
    }
  }
}
