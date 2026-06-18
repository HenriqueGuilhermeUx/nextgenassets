// ============================================
//  KLAVI WEBHOOK CONTROLLER
//  Recebe eventos: consent.completed, data.ready, etc
// ============================================

import { Controller, Post, Get, Body, Logger, Req, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { PrismaClient } from '@prisma/client';

const logger = new Logger('KlaviWebhook');
const prisma = new PrismaClient();

@Controller('v1/webhooks/klavi')
export class KlaviWebhookController {

  @Get('ping')
  async ping() {
    return { success: true, ts: Date.now() };
  }

  @Post()
  async handle(@Body() body: any, @Req() req: Request) {
    const event = body.event || body.type || 'unknown';
    logger.log(`📥 Klavi webhook: ${event}`);
    logger.log(`Body: ${JSON.stringify(body).substring(0, 500)}`);

    try {
      // Salva consent
      if (event.includes('consent') || event.includes('data')) {
        const personalTaxId = body.personalTaxId || body.taxId;
        const businessTaxId = body.businessTaxId;
        const linkId = body.linkId;
        const status = body.status || 'PENDING';
        
        if (personalTaxId || businessTaxId) {
          const user = await prisma.consumerUser.findFirst({
            where: { OR: [{ externalUserId: personalTaxId || businessTaxId }] }
          });
          
          if (user) {
            const consentId = `klavi-${linkId || (personalTaxId || businessTaxId)}`;
            await prisma.$executeRawUnsafe(
              `INSERT INTO "Consent" (id, "userId", "partnerId", provider, "providerUserId", "accessToken", scopes, status, "expiresAt", metadata, "createdAt", "updatedAt") 
               VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8::"ConsentStatus", $9, $10::jsonb, NOW(), NOW())
               ON CONFLICT (id) DO UPDATE SET status = $8::"ConsentStatus", metadata = $10::jsonb, "updatedAt" = NOW()`,
              consentId, user.id, user.partnerId, 'klavi', personalTaxId || businessTaxId,
              body.linkToken || '', '{accounts.read,transactions.read,investments.read}',
              status === 'COMPLETED' || status === 'ACTIVE' ? 'ACTIVE' : status,
              new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              JSON.stringify({ klaviLinkId: linkId, klaviStatus: status, event })
            );
            logger.log(`✅ Klavi consent saved: ${consentId}`);
          }
        }
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
