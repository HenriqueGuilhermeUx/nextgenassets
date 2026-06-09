// Webhooks controller — recebe e envia webhooks (com HMAC + retry)
import { Controller, Post, Body, Headers, Get, Query, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { WebhooksOutService } from './webhooks-out.worker';
import { WebhookSigner } from './webhook-signer';

const prisma = new PrismaClient();

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private webhooksOut: WebhooksOutService) {}

  // Webhook de entrada — Efí/Woovi confirma Pix
  @Post('pix-received')
  async pixReceived(@Body() body: any) {
    // Efí envia: { pix: [{ endToEndId, txid, valor, horario, ... }] }
    if (body?.pix && Array.isArray(body.pix)) {
      for (const pix of body.pix) {
        this.logger.log(`Pix Efí recebido: txid=${pix.txid} valor=R$ ${pix.valor}`);
        // Marca a execução como COMPLETED
        await prisma.execution.updateMany({
          where: { externalId: pix.txid },
          data: {
            status: 'COMPLETED',
            result: { ...pix, paidAt: new Date() }
          }
        });
      }
      return { received: true, count: body.pix.length };
    }
    // Formato genérico (compat com testes)
    this.logger.log(`Pix received: ${body.endToEndId} R$ ${body.amount}`);
    return { received: true, endToEndId: body.endToEndId };
  }

  // Webhook de entrada — Destino final confirma execução
  @Post('destination-confirmed')
  async destinationConfirmed(@Body() body: { executionId: string; externalId: string; status: string; details: any }) {
    this.logger.log(`Destination confirmed: ${body.externalId} (${body.status})`);
    await prisma.execution.updateMany({
      where: { id: body.executionId },
      data: {
        status: body.status === 'FAILED' ? 'FAILED' : 'COMPLETED',
        externalId: body.externalId,
        result: body.details
      }
    });
    return { received: true };
  }

  // Endpoint de saída — Orkest notifica parceiro B2B (com HMAC + retry)
  @Post('out/notify-partner')
  async notifyPartner(@Body() body: { partnerId: string; event: string; data: any }) {
    return this.webhooksOut.enqueue({
      partnerId: body.partnerId,
      event: body.event,
      data: body.data
    });
  }

  // Lista histórico de webhooks enviados
  @Get('out/deliveries')
  async listDeliveries(@Query() q: { partnerId?: string }) {
    return this.webhooksOut.listDeliveries(q.partnerId);
  }

  // Estatísticas
  @Get('out/stats')
  async getStats(@Query() q: { partnerId?: string }) {
    return this.webhooksOut.getStats(q.partnerId);
  }

  // Reenviar DLQ
  @Post('out/retry-dead-letter')
  async retryDeadLetter(@Body() body: { partnerId?: string }) {
    return this.webhooksOut.retryDeadLetter(body.partnerId);
  }

  // Verifica assinatura de um webhook recebido (helper pra parceiros)
  @Post('verify-signature')
  verifySignature(@Body() body: { payload: string; signature: string; secret: string }) {
    const isValid = WebhookSigner.verify(body.payload, body.signature, body.secret);
    return { valid: isValid };
  }
}
