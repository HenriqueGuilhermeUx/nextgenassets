// ============================================
//  EFI OPEN FINANCE WEBHOOK CONTROLLER
//  Recebe: consent.authorized, payment.completed
//  Rota real com prefixo global: /v1/webhooks/efi-of
// ============================================

import { Controller, Post, Get, Body, Logger, Req } from '@nestjs/common';
import { Request } from 'express';

const logger = new Logger('EfiOFWebhook');

@Controller('webhooks/efi-of')
export class EfiOFWebhookController {

  @Get('ping')
  ping() {
    return { success: true, service: 'efi-of-webhook', ts: Date.now() };
  }

  @Post()
  async handle(@Body() body: any, @Req() req: Request) {
    logger.log(`📥 Efi OF webhook: ${JSON.stringify(body).substring(0, 500)}`);
    return { received: true };
  }
}
