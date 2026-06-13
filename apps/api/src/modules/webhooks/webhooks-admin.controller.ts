// PLUGGY_FIX: v3 - provider + scope[]

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
  private DEBUG_LOGS: any[] = [];
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
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const eventType = body.event || body.type || '';
      // Pluggy manda estrutura variavel: {event, id, clientUserId, ...} OU {event, data: {...}}
      const item = body.data || body.item || { id: body.itemId || body.id, clientUserId: body.clientUserId, connectorId: body.connectorId, accessToken: body.accessToken };
      this.DEBUG_LOGS.push({ ts: new Date().toISOString(), event: eventType, item: item?.id, clientUserId: item?.clientUserId, payload: body });
      if (this.DEBUG_LOGS.length > 50) this.DEBUG_LOGS.shift();

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
              // DEBUG: log in-memory de webhooks recebidos
// Bypass Prisma Client cache: usa SQL raw direto
              const scopesArr = '{accounts.read,transactions.read,investments.read,pix.send}';
              await prisma.$executeRawUnsafe(
                `INSERT INTO "Consent" (id, "userId", "partnerId", provider, "providerUserId", "accessToken", scopes, status, "expiresAt", metadata, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8::"ConsentStatus", $9, $10::jsonb, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE'::"ConsentStatus", "updatedAt" = NOW()`,
                `pluggy-${item.id}`,
                user.id,
                user.partnerId,
                'pluggy',
                externalUserId,
                item.accessToken || '',
                scopesArr,
                'ACTIVE',
                new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                JSON.stringify({ pluggyItemId: item.id, connectorId: item.connectorId, type: 'PLUGGY_OPEN_FINANCE' })
              );
              this.logger.log(`✅ Consent saved (raw SQL): pluggy-${item.id}`);
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

  /**
   * GET /v1/admin/webhooks/consents
   * Lista consents Pluggy (debug)
   */
  @Get('consents')
  async listConsents() {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const result: any = await prisma.$queryRawUnsafe("SELECT id, provider, status, metadata, \"providerUserId\", \"createdAt\" FROM \"Consent\" WHERE id LIKE 'pluggy-%' ORDER BY \"createdAt\" DESC LIMIT 10");
      await prisma.$disconnect();
      return { success: true, count: result.length, consents: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * GET /v1/admin/webhooks/debug-logs
   * Mostra ultimos payloads recebidos
   */
  @Get('debug-logs')
  async debugLogs() {
    return { success: true, count: this.DEBUG_LOGS.length, logs: this.DEBUG_LOGS.slice().reverse() };
  }


  /**
   * GET /v1/admin/webhooks/trace
   * Lista webhooks recebidos (tabela WebhookTrace)
   */
  @Get('trace')
  async listTrace() {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      // Cria tabela se nao existir
      await prisma.$executeRawUnsafe("CREATE TABLE IF NOT EXISTS \"WebhookTrace\" (id SERIAL PRIMARY KEY, ts TIMESTAMPTZ NOT NULL DEFAULT NOW(), method TEXT NOT NULL, route TEXT NOT NULL, data JSONB NOT NULL)");
      const result: any = await prisma.$queryRawUnsafe("SELECT id, ts, method, route, data FROM \"WebhookTrace\" ORDER BY id DESC LIMIT 20");
      await prisma.$disconnect();
      return { success: true, count: result.length, traces: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * GET /v1/admin/webhooks/list-users
   * Lista ConsumerUsers (debug)
   */
  @Get('list-users')
  async listUsers() {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const result: any = await prisma.$queryRawUnsafe("SELECT id, \"externalUserId\", email, plan, \"createdAt\" FROM \"ConsumerUser\" ORDER BY \"createdAt\" DESC LIMIT 20");
      await prisma.$disconnect();
      return { success: true, count: result.length, users: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * POST /v1/admin/webhooks/sync-pluggy
   * Salva o consent com base no clientUserId OU fallback
   */
  @Post('sync-pluggy')
  async syncPluggy(@Body() body: any) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const externalUserId = body.clientUserId || 'demo-user-001';  // fallback
      const itemId = body.itemId || body.id;
      const connectorId = body.connectorId || null;
      
      if (!itemId) {
        return { success: false, error: 'itemId required' };
      }
      
      const user = await prisma.consumerUser.findFirst({ where: { externalUserId } });
      if (!user) {
        return { success: false, error: 'User not found: ' + externalUserId };
      }
      
      const scopesArr = '{accounts.read,transactions.read,investments.read,pix.send}';
      const metadata = JSON.stringify({ pluggyItemId: itemId, connectorId, type: 'PLUGGY_OPEN_FINANCE' });
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Consent" (id, "userId", "partnerId", provider, "providerUserId", "accessToken", scopes, status, "expiresAt", metadata, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8::"ConsentStatus", $9, $10::jsonb, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE'::"ConsentStatus", "updatedAt" = NOW()`,
        `pluggy-${itemId}`, user.id, user.partnerId, 'pluggy', externalUserId,
        body.accessToken || '', scopesArr, 'ACTIVE', expiresAt, metadata
      );
      
      await prisma.$disconnect();
      return { success: true, consentId: `pluggy-${itemId}`, user: externalUserId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * POST /v1/admin/webhooks/pluggy-test
   * Testa Pluggy: cria Connect Token + lista items
   */
  @Post('pluggy-test')
  async pluggyTest(@Body() body: any) {
    const clientId = process.env.PLUGGY_CLIENT_ID;
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return { success: false, error: 'PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET nao configurados' };
    }
    
    try {
      // 1) Auth
      const authRes = await fetch('https://api.pluggy.ai/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });
      if (!authRes.ok) {
        return { success: false, step: 'auth', status: authRes.status, body: await authRes.text() };
      }
      const { apiKey } = await authRes.json();
      
      // 2) Connect Token
      const tokenRes = await fetch('https://api.pluggy.ai/connect_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
        body: JSON.stringify({
          clientUserId: body.clientUserId || 'demo-user-001',
          webhookUrl: process.env.PLUGGY_WEBHOOK_URL || 'https://api.nextgenassets.com.br/v1/admin/webhooks/pluggy-alias',
          country: 'BR',
          language: 'pt-BR'
        })
      });
      if (!tokenRes.ok) {
        return { success: false, step: 'connect_token', status: tokenRes.status, body: await tokenRes.text() };
      }
      const { accessToken } = await tokenRes.json();
      
      // 3) Lista items
      const itemsRes = await fetch('https://api.pluggy.ai/items?page=0&pageSize=10', {
        headers: { 'X-API-KEY': apiKey }
      });
      const items = itemsRes.ok ? await itemsRes.json() : null;
      
      return {
        success: true,
        apiKeyPreview: apiKey.substring(0, 50) + '...',
        connectTokenPreview: accessToken.substring(0, 50) + '...',
        items: items ? { count: items.total, results: items.results.map((i: any) => ({ id: i.id, connector: i.connector?.name, status: i.status, createdAt: i.createdAt })) } : null
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * POST /v1/admin/webhooks/pluggy-connect-token
   * Gera Connect Token Pluggy (chamado pelo Consumer UI)
   */
  @Post('pluggy-connect-token')
  async pluggyConnectToken(@Body() body: any) {
    const clientUserId = body.clientUserId || 'demo-user-001';
    const clientId = process.env.PLUGGY_CLIENT_ID;
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return { success: false, error: 'PLUGGY_CLIENT_ID/SECRET nao configurados' };
    }
    
    try {
      const authRes = await fetch('https://api.pluggy.ai/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });
      if (!authRes.ok) return { success: false, step: 'auth', status: authRes.status, body: await authRes.text() };
      const { apiKey } = await authRes.json();
      
      const tokenRes = await fetch('https://api.pluggy.ai/connect_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
        body: JSON.stringify({
          clientUserId,
          webhookUrl: process.env.PLUGGY_WEBHOOK_URL || 'https://api.nextgenassets.com.br/v1/admin/webhooks/pluggy-alias',
          country: 'BR',
          language: 'pt-BR'
        })
      });
      if (!tokenRes.ok) return { success: false, step: 'connect_token', status: tokenRes.status, body: await tokenRes.text() };
      const { accessToken } = await tokenRes.json();
      
      return { success: true, connectToken: accessToken, clientUserId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * POST /v1/admin/webhooks/woovi-test
   * Testa Woovi: cria charge com split
   */
  @Post('woovi-test')
  async wooviTest(@Body() body: any) {
    const appId = process.env.WOOVI_APP_ID;
    const apiUrl = process.env.WOOVI_API_URL || 'https://api.woovi.com';
    const fromPixKey = process.env.WOOVI_FROM_PIX_KEY;

    if (!appId) {
      return { success: false, error: 'WOOVI_APP_ID nao configurado' };
    }

    const totalCents = body.totalCents || 100;  // R$ 1,00
    const nextgenCents = body.nextgenCents || 3; // 3% NextGen
    const partnerCents = body.partnerCents || 97; // 97% Partner
    const correlationID = body.correlationID || `test-${Date.now()}`;

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': appId
      };

      // 1) Verifica config
      const cfgRes = await {
        success: true,
        apiUrl,
        fromPixKey: fromPixKey || 'NÃO CONFIGURADO',
        hasAppId: !!appId
      };

      // 2) Cria charge com split
      const chargePayload: any = {
        correlationID,
        value: totalCents,
        comment: body.comment || `NextGen test ${correlationID}`,
        expiresIn: 3600
      };
      if (body.nextgenPixKey && body.partnerPixKey) {
        chargePayload.splits = [
          { pixKey: body.nextgenPixKey, value: nextgenCents },
          { pixKey: body.partnerPixKey, value: partnerCents }
        ];
      }
      if (body.customer) chargePayload.customer = body.customer;

      const chargeRes = await fetch(`${apiUrl}/api/v1/charge`, {
        method: 'POST',
        headers,
        body: JSON.stringify(chargePayload)
      });
      const chargeData = await chargeRes.json();

      return {
        success: chargeRes.ok,
        status: chargeRes.status,
        config: cfgRes,
        charge: chargeData.charge || chargeData,
        splitsRequested: chargePayload.splits,
        correlationID
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * GET /v1/admin/webhooks/woovi-config
   * Mostra config Woovi atual
   */
  @Get('woovi-config')
  async wooviConfig() {
    return {
      success: true,
      enabled: process.env.WOOVI_ENABLED !== 'false',
      hasAppId: !!process.env.WOOVI_APP_ID,
      hasFromPixKey: !!process.env.WOOVI_FROM_PIX_KEY,
      apiUrl: process.env.WOOVI_API_URL || 'https://api.woovi.com',
      fromPixKey: process.env.WOOVI_FROM_PIX_KEY || null,
      hasWebhookSecret: !!process.env.WOOVI_WEBHOOK_SECRET,
      webhookUrl: 'https://api.nextgenassets.com.br/v1/webhooks/woovi'
    };
  }


  /**
   * POST /v1/admin/webhooks/woovi-register
   * Registra o webhook NextGen na Woovi
   */
  @Post('woovi-register')
  async wooviRegister(@Body() body: any) {
    const appId = process.env.WOOVI_APP_ID;
    const apiUrl = process.env.WOOVI_API_URL || 'https://api.woovi.com';
    
    if (!appId) {
      return { success: false, error: 'WOOVI_APP_ID nao configurado' };
    }

    const url = body.url || 'https://api.nextgenassets.com.br/v1/webhooks/woovi';
    const event = body.event || 'OPENPIX:CHARGE_PAID';
    const name = body.name || 'NextGen Charge Webhook';

    try {
      // Lista webhooks existentes
      const listRes = await fetch(`${apiUrl}/api/v1/webhook`, {
        headers: { 'Authorization': appId }
      });
      const list = await listRes.json();
      const existing = (list.webhooks || []).find((w: any) => w.actionPayload?.url === url);

      if (existing && !body.force) {
        return { success: true, status: 'already_exists', webhook: existing };
      }

      // Cria webhook
      const res = await fetch(`${apiUrl}/api/v1/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': appId },
        body: JSON.stringify({
          name,
          url,
          event,
          isActive: true
        })
      });
      const data = await res.json();
      return { success: res.ok, status: res.status, webhook: data.webhook || data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * POST /v1/admin/webhooks/woovi-simulate
   * Simula um webhook charge.paid da Woovi (executa a lógica diretamente)
   */
  @Post('woovi-simulate')
  async wooviSimulate(@Body() body: any) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const event = body.event || 'OPENPIX:CHARGE_PAID';
      const charge = body.data || body.charge || {
        identifier: '30e46ba2f1774cd6a9569b9a86487e3e',
        correlationID: body.correlationID || 'test-woovi-nosplit-1781311000',
        value: 1000,
        status: 'COMPLETED',
        paidAt: new Date().toISOString(),
        splits: body.splits || []
      };
      
      const correlationID = charge.correlationID;
      this.logger.log(`🧪 Simulated Woovi event: ${event} correlationID=${correlationID}`);
      
      // Tenta achar o trigger
      const trigger = await prisma.trigger.findFirst({ where: { id: correlationID }, include: { partner: true } });
      
      if (trigger) {
        // Atualiza trigger
        const metadata = (trigger as any).metadata || {};
        metadata.wooviChargeId = charge.identifier;
        metadata.wooviPaidAt = charge.paidAt || new Date().toISOString();
        metadata.wooviStatus = 'PAID';
        metadata.simulated = true;
        
        await prisma.trigger.update({
          where: { id: trigger.id },
          data: {
            status: 'COMPLETED' as any,
            paidAt: new Date(charge.paidAt || Date.now()),
            metadata: metadata as any
          } as any
        });
        
        // Audit log
        if (charge.splits && charge.splits.length > 0) {
          await prisma.auditLog.create({
            data: {
              action: 'COMMISSION_DISTRIBUTED',
              resource: 'trigger',
              resourceId: trigger.id,
              actor: 'webhook:woovi:simulated',
              metadata: {
                provider: 'woovi',
                simulated: true,
                chargeId: charge.identifier,
                totalCents: charge.value,
                splits: charge.splits,
                partnerId: trigger.partnerId
              } as any
            } as any
          });
        }
        
        await prisma.$disconnect();
        return { success: true, triggerId: trigger.id, status: 'COMPLETED', splits: charge.splits };
      } else {
        // Trigger nao existe - cria um ficticio
        await prisma.$disconnect();
        return { success: true, note: 'Trigger nao encontrado, webhook simulado sem persistir', correlationID, charge };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * POST /v1/admin/webhooks/woovi-receiver
   * Receiver do webhook Woovi (workaround: Render nao deploya novo controller)
   */
  @Post('woovi-receiver')
  async wooviReceiver(@Body() body: any) {
    const event = body.event || body.type || '';
    const charge = body.data || body.charge || body;
    const correlationID = charge.correlationID;
    
    this.logger.log(`📥 Woovi webhook: ${event} correlationID=${correlationID} value=${charge.value}`);
    this.DEBUG_LOGS.push({ ts: new Date().toISOString(), event, item: charge.identifier, clientUserId: correlationID, payload: body });
    if (this.DEBUG_LOGS.length > 50) this.DEBUG_LOGS.shift();
    
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      // Lista todos os eventos que significam pagamento
      const isPaid = ['OPENPIX:CHARGE_COMPLETED', 'OPENPIX:CHARGE_PAID', 'CHARGE_PAID', 'charge.paid', 'charge.completed', 'COMPLETED'].includes(event) || charge.status === 'COMPLETED' || charge.status === 'PAID';
      const isFailed = event.includes('FAILED') || event.includes('EXPIRED') || charge.status === 'FAILED' || charge.status === 'EXPIRED';
      
      if (isPaid) {
        const trigger = await prisma.trigger.findFirst({ where: { id: correlationID }, include: { partner: true } });
        if (trigger) {
          // Trigger nao tem metadata field - vamos apenas atualizar status + lastExecutedAt
          await prisma.trigger.update({
            where: { id: trigger.id },
            data: {
              status: 'EXHAUSTED' as any,
              lastExecutedAt: new Date(charge.paidAt || Date.now())
            } as any
          });
          
          // Salvar info do woovi via Transaction (que tem metadata)
          // Primeiro tenta achar um catalog de transacao
          this.logger.log(`Woovi paid: triggerId=${trigger.id} chargeId=${charge.identifier} value=${charge.value}`);
          
          if (charge.splits && Array.isArray(charge.splits) && charge.splits.length > 0) {
            await prisma.auditLog.create({
              data: {
                action: 'COMMISSION_DISTRIBUTED',
                resource: 'trigger',
                resourceId: trigger.id,
                actor: 'webhook:woovi',
                metadata: {
                  provider: 'woovi',
                  chargeId: charge.identifier,
                  totalCents: charge.value,
                  splits: charge.splits,
                  partnerId: trigger.partnerId
                } as any
              } as any
            });
          }
          
          await prisma.$disconnect();
          return { received: true, event, triggerId: trigger.id, status: 'COMPLETED', splits: charge.splits?.length || 0 };
        }
        await prisma.$disconnect();
        return { received: true, event, correlationID, note: 'Trigger nao encontrado (correlationID nao bate com trigger.id)' };
      }
      
      if (isFailed) {
        await prisma.trigger.updateMany({
          where: { id: correlationID },
          data: { status: 'FAILED' as any } as any
        });
        await prisma.$disconnect();
        return { received: true, event, status: 'FAILED' };
      }
      
      await prisma.$disconnect();
      return { received: true, event, note: 'evento nao tratado' };
    } catch (err: any) {
      this.logger.error(`Erro: ${err.message}`);
      return { received: true, error: err.message };
    }
  }


  /**
   * POST /v1/admin/webhooks/select
   * Executa SELECT e retorna rows
   */
  @Post('select')
  async select(@Body() body: any) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const result: any = await prisma.$queryRawUnsafe(body.sql);
      await prisma.$disconnect();
      return { success: true, rows: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * POST /v1/admin/webhooks/woovi-pixout
   * Testa PIX OUT (transferência) da Woovi
   */
  @Post('woovi-pixout')
  async wooviPixOut(@Body() body: any) {
    const appId = process.env.WOOVI_APP_ID;
    const apiUrl = process.env.WOOVI_API_URL || 'https://api.woovi.com';

    if (!appId) return { success: false, error: 'WOOVI_APP_ID nao configurado' };

    const value = body.value || 30; // 30 centavos = R$ 0,30
    const pixKey = body.pixKey || process.env.WOOVI_FROM_PIX_KEY;
    const correlationID = body.correlationID || `pixout-test-${Date.now()}`;

    try {
      const r = await fetch(`${apiUrl}/api/v1/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': appId },
        body: JSON.stringify({ value, pixKey, correlationID })
      });
      const data = await r.json();
      return { success: r.ok, status: r.status, request: { value, pixKey, correlationID }, response: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

}
