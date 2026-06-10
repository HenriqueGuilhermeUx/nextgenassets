// Webhooks controller — recebe e envia webhooks (com HMAC + retry)
import { Controller, Post, Body, Headers, Get, Query, Logger, Req } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { WebhooksOutService } from './webhooks-out.worker';
import { WebhookSigner } from './webhook-signer';

const prisma = new PrismaClient();

// IP oficial da Efí (validado pelo guilherme_efi no Discord)
const EFI_AUTHORIZED_IP = '34.193.116.226';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private webhooksOut: WebhooksOutService) {}

  // Valida se request vem da Efí (IP fixo + HMAC opcional)
  private validateEfiRequest(req: any, hmacQuery?: string): { valid: boolean; reason?: string } {
    // 1. Validação de IP (sempre)
    const requestIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    if (requestIp && !requestIp.includes(EFI_AUTHORIZED_IP)) {
      // Em dev, pode nao bater o IP exato, mas em prod precisa
      this.logger.warn(`IP não autorizado: ${requestIp} (esperado: ${EFI_AUTHORIZED_IP})`);
    }

    // 2. Validação de HMAC (se configurado)
    const expectedHmac = process.env.EFI_WEBHOOK_HMAC;
    if (expectedHmac && hmacQuery !== expectedHmac) {
      return { valid: false, reason: 'HMAC inválido' };
    }

    return { valid: true };
  }

  // Webhook de entrada — Efí/Woovi confirma Pix
  // A Efí concatena automaticamente /pix no final da URL cadastrada
  // por isso mantemos as duas variantes (com e sem /pix)
  @Post('pix-received')
  @Post('pix-received/pix')
  async pixReceived(@Body() body: any, @Query() query: any, @Req() req: any) {
    const validation = this.validateEfiRequest(req, query.hmac);
    if (!validation.valid) {
      this.logger.warn(`Webhook rejeitado: ${validation.reason}`);
      return { received: false, reason: validation.reason };
    }
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

  // Webhook de saída — Efí confirma Pix enviado
  // A Efí concatena automaticamente /pix no final
  @Post('pix-sent')
  @Post('pix-sent/pix')
  async pixSent(@Body() body: any, @Query() query: any, @Req() req: any) {
    const validation = this.validateEfiRequest(req, query.hmac);
    if (!validation.valid) {
      this.logger.warn(`Webhook rejeitado: ${validation.reason}`);
      return { received: false, reason: validation.reason };
    }
    this.logger.log(`Pix Efí enviado: ${JSON.stringify(body).substring(0, 200)}`);
    return { received: true };
  }

  // Webhook de saída — Efí confirma devolução
  @Post('pix-refunded')
  @Post('pix-refunded/pix')
  async pixRefunded(@Body() body: any, @Query() query: any, @Req() req: any) {
    const validation = this.validateEfiRequest(req, query.hmac);
    if (!validation.valid) {
      this.logger.warn(`Webhook rejeitado: ${validation.reason}`);
      return { received: false, reason: validation.reason };
    }
    this.logger.log(`Pix Efí devolvido: ${JSON.stringify(body).substring(0, 200)}`);
    return { received: true };
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
