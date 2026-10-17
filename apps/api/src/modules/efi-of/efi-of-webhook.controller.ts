// Legacy webhook alias retained for compatibility, but routed through the same
// fail-closed, HMAC-authenticated audit-only receiver used by the public OF URL.
import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { EfiOFWebhookReceiverController } from './efi-of-webhook-receiver.controller';

@Controller('webhooks/efi-of')
export class EfiOFWebhookController {
  private readonly receiver = new EfiOFWebhookReceiverController();

  @Get('ping')
  ping() { return { success: true, service: 'efi-of-webhook', ts: Date.now() }; }

  @Post()
  handle(@Body() body: any, @Req() req: Request) {
    return this.receiver.handle(body, req);
  }
}
