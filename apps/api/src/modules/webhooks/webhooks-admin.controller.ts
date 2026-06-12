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
    console.log('🔥 DEPLOY_MARKER_2f4a5b6c_v8_NEWCODE');
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
      const partnerId = partner?.id || 'demo-partner';
      let demoUser = await prisma.consumerUser.findUnique({
        where: { partnerId_externalUserId: { partnerId, externalUserId: 'demo-user-001' } }
      });
      if (!demoUser) {
        demoUser = await prisma.consumerUser.create({
          data: {
            email: 'demo@nextgenassets.com.br',
            name: 'Demo User',
            partnerId,
            externalUserId: 'demo-user-001'
          } as any
        });
      }

      // Pega ou cria um Trigger demo (Execution precisa de trigger)
      let demoTrigger = await prisma.trigger.findFirst({ where: { userId: demoUser.id, code: 'TEST_CHARGE' } });
      if (!demoTrigger) {
        demoTrigger = await prisma.trigger.create({
          data: {
            userId: demoUser.id,
            partnerId: partnerId,
            code: 'TEST_CHARGE',
            name: 'TEST_CHARGE_TRIGGER',
            description: 'Cobranca de teste via Efi',
            status: 'ACTIVE',
            params: { type: 'TEST_CHARGE', note: 'demo trigger for split testing' }
          } as any
        });
        this.logger.log(`✅ Trigger demo criado: ${demoTrigger.id}`);
      }

      execution = await prisma.execution.create({
        data: {
          externalId: txid,
          amountBrl: amount,
          status: 'PENDING',
          destination: 'efi-pix',
          intent: { type: 'TEST_CHARGE' },
          state: { phase: 'INITIATED' },
          user: { connect: { id: demoUser.id } },
          ...(partner && { partner: { connect: { id: partner.id } } }),
          trigger: { connect: { id: demoTrigger.id } }
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
   * GET /v1/admin/webhooks/efi/split-status/:txid
   * Retorna o status do split/comissao pra uma Execution
   */
  @Get('efi/split-status/:txid')
  async getSplitStatus(@Param('txid') txid: string) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const execution = await prisma.execution.findFirst({
        where: { externalId: txid },
        include: { partner: true, user: true, trigger: { include: { partner: true } } }
      });
      const triggerInfo = await prisma.trigger.findUnique({
        where: { id: execution?.triggerId || '' },
        include: { partner: true }
      });
      if (!execution) {
        return { success: false, error: `Execution nao encontrada pro txid ${txid}` };
      }
      const auditLogs = await prisma.auditLog.findMany({
        where: { resourceId: execution.id },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      return {
        success: true,
        execution: {
          id: execution.id,
          externalId: execution.externalId,
          amountBrl: Number(execution.amountBrl),
          status: execution.status,
          createdAt: execution.createdAt,
          result: execution.result,
          partner: execution.partner?.name,
          partnerPixKey: execution.partner?.pixKey,
          partnerCommissionRate: execution.partner?.commissionRate?.toString()
        },
        trigger: triggerInfo ? {
          id: triggerInfo.id,
          code: triggerInfo.code,
          name: triggerInfo.name,
          partnerId: triggerInfo.partnerId,
          partnerName: triggerInfo.partner?.name,
          partnerPixKey: triggerInfo.partner?.pixKey
        } : null,
        splitAuditLogs: auditLogs.map((l: any) => ({
          action: l.action,
          actor: l.actor,
          metadata: l.metadata,
          createdAt: l.createdAt
        }))
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * GET /v1/admin/webhooks/efi/recent-splits
   * Lista os ultimos audit logs relacionados a split (pra debug)
   */
  @Get('efi/recent-splits')
  async getRecentSplits() {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const logs = await prisma.auditLog.findMany({
        where: { action: { contains: 'COMMISSION' } },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
      return {
        success: true,
        count: logs.length,
        logs: logs.map((l: any) => ({
          id: l.id,
          action: l.action,
          resourceId: l.resourceId,
          metadata: l.metadata,
          createdAt: l.createdAt
        }))
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * POST /v1/admin/webhooks/efi/test-payout
   * Testa envio de PIX OUT pra uma chave (debug)
   * Body: { amountBrl: 0.10, pixKey: "...", pixKeyType: "EVP" }
   */
  @Post('efi/test-payout')
  async testPayout(@Body() body: { amountBrl: number; pixKey: string; pixKeyType?: string }) {
    const amount = body.amountBrl || 0.10;
    const pixKey = body.pixKey;
    if (!pixKey) {
      return { success: false, error: 'pixKey obrigatorio' };
    }
    try {
      const txid = `NGATESTOUT${Date.now()}`.slice(0, 35);
      const pixOut = await this.efiAdapter.sendPixOut({
        amountBrl: amount,
        recipientPixKey: pixKey,
        recipientPixKeyType: (body.pixKeyType as any) || 'EVP',
        txid
      });
      return { success: true, txid: pixOut, amount, pixKey, message: 'PIX OUT enviado' };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        stack: err.stack?.substring(0, 500)
      };
    }
  }

  /**
   * POST /v1/admin/webhooks/efi/probe-of
   * Testa endpoints Open Finance da Efi (debug)
   * Body: { endpoint: "participantes" | "pix" | "pagamentos" }
   */
  @Post('efi/probe-of')
  async probeOf(@Body() body: { endpoint: string }) {
    // Vou tentar os endpoints OF com mTLS e ver qual responde
    const { httpsRequestWithMtls } = require('../destinations/providers/efi-https');
    const { buildEfiConfig } = require('../../config/efi.config');
    const EFI_CONFIG = buildEfiConfig(process.env);

    const token = await (async () => {
      const credentials = Buffer.from(
        `${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`
      ).toString('base64');
      const result = await httpsRequestWithMtls({
        url: `${EFI_CONFIG.oauthBaseUrl}/oauth/token`,
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': '29'
        },
        body: 'grant_type=client_credentials'
      });
      return JSON.parse(result.body).access_token;
    })();

    const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
    const pfx = certBase64 ? Buffer.from(certBase64, 'base64') : undefined;

    // Possíveis URLs OF (em ordem de tentativa)
    const candidates = [
      `https://api.efipay.com.br/v1/of/${body.endpoint || 'participantes'}`,
      `https://api.efipay.com.br/v1/open-finance/${body.endpoint || 'participantes'}`,
      `https://api.efipay.com.br/open-finance/v1/${body.endpoint || 'participantes'}`,
      `https://api-pix.gerencianet.com.br/v1/of/${body.endpoint || 'participantes'}`,
      `https://api.efipay.com.br/v1/openFinance/${body.endpoint || 'participantes'}`,
    ];

    const results = [];
    for (const url of candidates) {
      try {
        const r = await httpsRequestWithMtls({
          url,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-skip-mtls-checking': 'true'
          },
          pfx,
          passphrase: ''
        });
        results.push({ url, status: r.status, bodyPreview: r.body.substring(0, 200) });
      } catch (e: any) {
        results.push({ url, error: e.message });
      }
    }

    return { success: true, results };
  }

  /**
   * GET /v1/admin/webhooks/efi/balance
   * Retorna o saldo Efí (debug pra ver se tem grana pra fazer PIX OUT)
   */
  @Get('efi/balance')
  async getBalance() {
    try {
      const balance = await this.efiAdapter.getBalance();
      return { success: true, balance };
    } catch (err: any) {
      return { success: false, error: err.message, stack: err.stack?.substring(0, 500) };
    }
  }

  /**
   * POST /v1/admin/webhooks/pluggy-alias
   * Endpoint publico do Pluggy (funciona mesmo se o controller dedicado nao deployou)
   */
  @Post('pluggy-alias')
  async pluggyWebhookAlias(@Body() body: any) {
    this.logger.log(`Pluggy webhook: ${body.event || body.type || 'unknown'}`);
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const eventType = body.event || body.type || '';
      const item = body.data || body.item || body;

      if (eventType.startsWith('item/') || eventType.startsWith('item.')) {
        if (eventType === 'item/deleted' || eventType === 'item.deleted') {
          await prisma.consent.updateMany({
            where: { id: `pluggy-${item.id}` },
            data: { status: 'REVOKED', updatedAt: new Date() } as any
          });
        } else {
          const externalUserId = item.clientUserId || item.userId;
          if (externalUserId && item.id) {
            const user = await prisma.consumerUser.findFirst({ where: { externalUserId } });
            if (user) {
              await prisma.consent.upsert({
                where: { id: `pluggy-${item.id}` },
                update: { status: 'ACTIVE', updatedAt: new Date() } as any,
                create: {
                  id: `pluggy-${item.id}`,
                  userId: user.id,
                  partnerId: user.partnerId,
                  type: 'PLUGGY_OPEN_FINANCE',
                  status: 'ACTIVE',
                  scope: 'ACCOUNTS,TRANSACTIONS,INVESTMENTS,PAYMENTS',
                  consentToken: item.accessToken || '',
                  expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                  metadata: { pluggyItemId: item.id, connectorId: item.connectorId }
                } as any
              });
            }
          }
        }
      }
      await prisma.$disconnect();
      return { received: true, event: eventType };
    } catch (err: any) {
      this.logger.error(`Erro: ${err.message}`);
      return { received: true, error: err.message };
    }
  }

  /**
   * POST /v1/admin/webhooks/billing/activate
   * Ativa Premium de um user (manual, sem PIX OUT)
   * Body: { userId: "demo-user-001", durationDays?: 30 }
   */
  @Post('billing/activate')
  async activateBilling(@Body() body: { userId: string; durationDays?: number }) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (body.durationDays || 30) * 24 * 60 * 60 * 1000);
      const user = await prisma.consumerUser.update({
        where: { id: body.userId },
        data: {
          plan: 'PREMIUM',
          planStartedAt: now,
          planExpiresAt: expiresAt,
          billingPeriodStart: now
        }
      });
      return {
        success: true,
        message: `Premium ativado por ${body.durationDays || 30} dias`,
        user: {
          id: user.id,
          name: user.name,
          plan: user.plan,
          planStartedAt: user.planStartedAt,
          planExpiresAt: user.planExpiresAt
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      await prisma.$disconnect();
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
