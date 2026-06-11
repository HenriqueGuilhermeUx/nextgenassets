// ============================================
//  WEBHOOKS ADMIN — Registra e testa webhooks da Efí
// ============================================

import { Controller, Post, Body, Get, Param, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import * as https from 'https';
import { URL } from 'url';
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
    // txid Efi: padrao ^[a-zA-Z0-9]{26,35}$
    // Gera um txid valido de 32 chars: NGA + timestamp (13) + random
    const txid = body.txid || (
      'NGA' +
      Date.now().toString().padStart(13, '0') +
      Math.random().toString(36).substring(2, 16).replace(/[^a-zA-Z0-9]/g, 'X')
    ).slice(0, 35);

    this.logger.log(`🧪 Criando cobrança REAL de R$ ${amount} com txid=${txid} (${txid.length} chars)`);

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

  /**
   * GET /v1/admin/webhooks/efi/charge/:txid
   * Pega status + QR code de uma cobrança específica
   */
  @Get('efi/charge/:txid')
  async getCharge(@Param('txid') txid: string) {
    try {
      const status = await this.efiAdapter.getChargeStatus(txid);
      return {
        success: true,
        txid,
        status
      };
    } catch (err: any) {
      return {
        success: false,
        txid,
        error: err.message
      };
    }
  }

  /**
   * GET /v1/admin/webhooks/efi/qrcode/:txid
   * Retorna o QR Code como IMAGEM PNG (pra abrir no navegador e ler)
   */
  @Get('efi/qrcode/:txid')
  async getQrCode(@Param('txid') txid: string, @Res() res: Response) {
    try {
      const status = await this.efiAdapter.getChargeStatus(txid);
      const loc = status.loc;
      if (!loc?.location) {
        res.status(404).json({ error: 'QR code nao encontrado' });
        return;
      }

      // Efí QR fica em: https://qrcodespix.sejaefi.com.br/v2/{hash}
      const url = loc.location.startsWith('http')
        ? loc.location
        : `https://${loc.location}`;

      this.logger.log(`📸 Baixando QR code: ${url}`);

      // Faz download da imagem via https nativo (mTLS nao precisa aqui)
      // IMPORTANTE: precisa do header 'Accept: image/png' pra Efí retornar PNG
      // Sem isso, retorna JWT (token assinado) ao invés da imagem
      const chunks: Buffer[] = [];
      const parsedUrl = new URL(url);

      const request = https.request(
        {
          hostname: parsedUrl.hostname,
          port: 443,
          path: parsedUrl.pathname,
          method: 'GET',
          rejectUnauthorized: false,
          headers: {
            'Accept': 'image/png'
          }
        },
        (response) => {
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => {
            const image = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Content-Length', image.length.toString());
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.send(image);
          });
        }
      );
      request.on('error', (err) => {
        this.logger.error(`Erro ao baixar QR: ${err.message}`);
        res.status(500).json({ error: err.message });
      });
      request.end();
    } catch (err: any) {
      this.logger.error(`Erro no getQrCode: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }
}
