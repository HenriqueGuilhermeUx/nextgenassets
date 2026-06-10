// ============================================
//  WEBHOOKS ADMIN — Registra e testa webhooks da Efí
// ============================================

import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { EfiWebhookRegistrar } from './efi-webhook-registrar.service';

@Controller('admin/webhooks')
export class WebhooksAdminController {
  private readonly logger = new Logger(WebhooksAdminController.name);

  constructor(private registrar: EfiWebhookRegistrar) {}

  /**
   * POST /v1/admin/webhooks/efi/register
   * Registra TODOS os webhooks da Efí automaticamente
   * Body: { baseUrl?: string, pixKey?: string }
   */
  @Post('efi/register')
  async registerEfiWebhooks(@Body() body: { baseUrl?: string; pixKey?: string }) {
    this.logger.log(`🔧 Registrando webhooks Efí (baseUrl=${body.baseUrl || 'default'})`);
    const result = await this.registrar.registerAllWebhooks(
      body.baseUrl,
      body.pixKey
    );
    return {
      success: true,
      ...result
    };
  }

  /**
   * GET /v1/admin/webhooks/efi/list
   * Lista os webhooks atualmente configurados (debug)
   */
  @Get('efi/list')
  async listEfiWebhooks() {
    return {
      webhooks: [
        { name: 'pix-received', url: 'https://api.nextgenassets.com.br/v1/webhooks/pix-received' },
        { name: 'pix-sent', url: 'https://api.nextgenassets.com.br/v1/webhooks/pix-sent' },
        { name: 'pix-refunded', url: 'https://api.nextgenassets.com.br/v1/webhooks/pix-refunded' }
      ],
      note: 'Use POST /v1/admin/webhooks/efi/register pra registrar via API da Efí'
    };
  }
}
