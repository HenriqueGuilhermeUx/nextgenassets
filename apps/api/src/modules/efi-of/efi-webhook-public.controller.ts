// ============================================
//  EFI WEBHOOK PUBLIC (mTLS)
//  Recebe webhooks Efi (Pix, Pix Automático, Open Finance)
//  Rota real com prefixo global: /v1/webhooks/efi-public?ignorar=
//  Suporta ambos: webhook PIX + webhook OF
// ============================================

import { Controller, Post, Body, Logger, Req, Get } from '@nestjs/common';
import { Request } from 'express';
import { PrismaClient } from '@prisma/client';

const logger = new Logger('EfiWebhookPublic');
const prisma = new PrismaClient();

@Controller('webhooks/efi-public')
export class EfiWebhookPublicController {
  
  // Aceita POST em vários paths (Efi manda em /pix, /rec, /cobr)
  @Post(['pix', 'rec', 'cobr', ''])
  async handle(@Body() body: any, @Req() req: Request) {
    const event = body.evento || body.event || body.type || 'pix';
    const txid = body.txid || body.pix?.[0]?.txid;
    logger.log(`📥 Efi webhook: ${event} | txid: ${txid || '-'}`);
    logger.log(`Body: ${JSON.stringify(body).substring(0, 300)}`);

    try {
      // PIX RECEBIDO (webhook /pix)
      if (body.pix && Array.isArray(body.pix)) {
        for (const pix of body.pix) {
          await prisma.auditLog.create({
            data: {
              action: 'EFI_PIX_RECEIVED',
              resource: 'pix',
              resourceId: pix.txid || pix.endToEndId || `pix-${Date.now()}`,
              actor: 'webhook:efi',
              metadata: {
                provider: 'efi',
                txid: pix.txid,
                valor: pix.valor,
                horario: pix.horario,
                endToEndId: pix.endToEndId,
                chave: pix.chave
              } as any
            } as any
          });
          logger.log(`💰 Pix received: txid=${pix.txid} R$ ${pix.valor}`);
        }
      }

      // OPEN FINANCE (consent / payment)
      if (body.event && (body.event.includes('consent') || body.event.includes('payment'))) {
        await prisma.auditLog.create({
          data: {
            action: `EFI_OF_${body.event.toUpperCase()}`,
            resource: 'open-finance',
            resourceId: body.data?.consentId || body.data?.paymentId || body.data?.identificadorAdesao || `efi-of-${Date.now()}`,
            actor: 'webhook:efi-of',
            metadata: body.data as any
          } as any
        });
        logger.log(`🏦 OF event: ${body.event}`);
      }

      return { status: 200, received: true };
    } catch (err: any) {
      logger.error(`Erro: ${err.message}`);
      return { status: 200, error: err.message };
    } finally {
      await prisma.$disconnect();
    }
  }
  
  // Health check
  @Get()
  health() {
    return { status: 'ok', service: 'efi-webhook-public' };
  }
}
