// ============================================
//  WEBHOOKS ADMIN — Registra e testa webhooks da Efí
// ============================================

import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { EfiWebhookRegistrar } from './efi-webhook-registrar.service';
import { EfiPixAdapter } from '../destinations/providers/efi-pix-adapter';

@Controller('admin/webhooks')
export class WebhooksAdminController {
  private readonly logger = new Logger(WebhooksAdminController.name);

  constructor(
    private registrar: EfiWebhookRegistrar,
    private efiAdapter: EfiPixAdapter
  ) {}

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

  /**
   * POST /v1/admin/webhooks/efi/test-charge
   * Cria uma cobrança PIX REAL na Efí (pra testar webhook)
   * Body: { amountBrl?: number, txid?: string }
   */
  @Post('efi/test-charge')
  async testCharge(@Body() body: { amountBrl?: number; txid?: string }) {
    const amount = body.amountBrl ?? 0.01;
    const txid = body.txid || `TEST${Date.now()}`.slice(0, 35);

    this.logger.log(`🧪 Criando cobrança REAL de R$ ${amount} com txid=${txid}`);

    const result = await this.efiAdapter.createPixCharge({
      userId: 'test-user',
      amountBrl: amount,
      txid,
      productInfo: { id: 'test-webhook' }
    } as any);

    return {
      success: result.status !== 'FAILED',
      result,
      txid,
      amount,
      message: result.status === 'PENDING'
        ? `Cobrança criada! Paga o QR code gerado pra testar o webhook. Txid: ${txid}`
        : `Falha: ${(result as any).errorMessage || 'desconhecido'}`
    };
  }
}
