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
   * Lista os webhooks atualmente configurados NA EFÍ (consulta a API real)
   */
  @Get('efi/list')
  async listEfiWebhooks() {
    const result = await this.registrar.listWebhooks({});
    return {
      success: result.success,
      status: result.status,
      efiResponse: result.body,
      note: result.success
        ? '✅ Webhooks cadastrados na Efí'
        : '❌ Erro ao consultar Efí - veja efiResponse'
    };
  }

  /**
   * POST /v1/admin/migrate
   * Aplica migrations pendentes no Supabase (uso único, depois desabilitar)
   * Body: { sql: string }
   */
  @Post('migrate')
  async runMigration(@Body() body: { sql: string }) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      // Executa SQL bruto
      const result = await prisma.$executeRawUnsafe(body.sql);
      return {
        success: true,
        rowsAffected: result,
        message: 'Migration executada'
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        code: err.code
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * POST /v1/admin/partners/setup-demo
   * Cria/atualiza Partner demo com pixKey pra testar split
   * Body: { pixKey: string, pixKeyType?: 'CPF'|'CNPJ'|'EMAIL'|'PHONE'|'EVP', commissionRate?: number }
   */
  @Post('partners/setup-demo')
  async setupDemoPartner(@Body() body: { pixKey: string; pixKeyType?: string; commissionRate?: number }) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const partner = await prisma.partner.upsert({
      where: { slug: 'demo-marketplace' },
      update: {
        pixKey: body.pixKey,
        pixKeyType: body.pixKeyType as any || 'EVP',
        commissionRate: body.commissionRate || 0.03
      },
      create: {
        slug: 'demo-marketplace',
        name: 'Demo Marketplace',
        type: 'RETAILER',
        config: {},
        pixKey: body.pixKey,
        pixKeyType: body.pixKeyType as any || 'EVP',
        commissionRate: body.commissionRate || 0.03
      }
    });

    return {
      success: true,
      partner: {
        id: partner.id,
        name: partner.name,
        slug: partner.slug,
        pixKey: partner.pixKey,
        pixKeyType: partner.pixKeyType,
        commissionRate: Number(partner.commissionRate),
        totalCommissionEarnedBrl: Number(partner.totalCommissionEarnedBrl)
      }
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
    // txid precisa ter 26-35 chars alfanumericos (Efi exige)
    const randomPart = Array.from({ length: 10 }, () =>
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]
    ).join('');
    const txid = body.txid || ('NGA' + Date.now().toString() + randomPart).slice(0, 35);

    this.logger.log(`🧪 Criando cobrança REAL de R$ ${amount} com txid=${txid} (${txid.length} chars)`);

    // 1. Cria Execution no Prisma (vinculada ao Partner demo)
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    let execution;
    try {
      const partner = await prisma.partner.findUnique({ where: { slug: 'demo-marketplace' } });

      // Cria ou pega um ConsumerUser demo
      const demoUser = await prisma.consumerUser.upsert({
        where: { partnerId_externalUserId: { partnerId: partner?.id || 'demo-partner', externalUserId: 'demo-user-001' } },
        update: {},
        create: {
          id: 'demo-user-001',
          email: 'demo@nextgenassets.com.br',
          name: 'Demo User',
          partnerId: partner?.id || 'demo-partner',
          externalUserId: 'demo-user-001'
        } as any
      });

      execution = await prisma.execution.create({
        data: {
          externalId: txid,
          amountBrl: amount,
          status: 'PENDING',
          destination: 'efi-pix',
          intent: 'TEST_CHARGE',
          state: 'BRAZIL',
          user: { connect: { id: demoUser.id } },
          ...(partner && { partner: { connect: { id: partner.id } } })
        } as any
      });
      this.logger.log(`✅ Execution criada: ${execution.id} | user=${demoUser.id} | partner=${partner?.name || 'none'}`);
    } catch (err: any) {
      this.logger.error(`Erro ao criar Execution: ${err.message}`);
    } finally {
      await prisma.$disconnect();
    }

    // 2. Cria cobranca na Efi
    const result = await this.efiAdapter.createPixCharge({
      userId: 'test-user',
      amountBrl: amount,
      txid,
      productInfo: { id: 'test-webhook' }
    } as any);

    return {
      success: result.status !== 'FAILED',
      result,
      executionId: execution?.id,
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
   * Gera QR Code localmente a partir do BR Code (pixCopiaECola)
   * Retorna como IMAGEM PNG (pra abrir no navegador e ler com app)
   */
  @Get('efi/qrcode/:txid')
  async getQrCode(@Param('txid') txid: string, @Res() res: Response) {
    try {
      const status = await this.efiAdapter.getChargeStatus(txid);
      const brCode = status.pixCopiaECola;

      if (!brCode) {
        res.status(404).json({ error: 'pixCopiaECola nao encontrado pra esse txid' });
        return;
      }

      this.logger.log(`📸 Gerando QR code local do BR Code: ${brCode.substring(0, 50)}...`);

      // Gera QR code como PNG (lib qrcode já instalada no monorepo)
      const QRCode = require('qrcode');
      const png = await QRCode.toBuffer(brCode, {
        type: 'png',
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', png.length.toString());
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(png);
    } catch (err: any) {
      this.logger.error(`Erro no getQrCode: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }
}
