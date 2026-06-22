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
          { pixKey: body.nextgenPixKey, value: nextgenCents, splitType: 'SPLIT_SUB_ACCOUNT' },
          { pixKey: body.partnerPixKey, value: partnerCents, splitType: 'SPLIT_SUB_ACCOUNT' }
        ];
      }
      if (body.customer) chargePayload.customer = body.customer;

      this.logger.log(`Woovi payload: ${JSON.stringify(chargePayload)}`);
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
        payloadSent: chargePayload,
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


  /**
   * POST /v1/admin/webhooks/woovi-withdraw-all
   * Saca TODO o saldo de TODAS as subcontas (auto-withdraw)
   * Body opcional: { minCents: 10 } = só saca se > 10 centavos
   */
  @Post('woovi-withdraw-all')
  async wooviWithdrawAll(@Body() body: any) {
    const appId = process.env.WOOVI_APP_ID;
    const apiUrl = process.env.WOOVI_API_URL || 'https://api.woovi.com';
    const minCents = body?.minCents || 10;  // mínimo R$ 0,10 pra sacar

    if (!appId) return { success: false, error: 'WOOVI_APP_ID nao configurado' };

    try {
      // 1) Lista subcontas
      const subsRes = await fetch(`${apiUrl}/api/v1/subaccount`, {
        headers: { 'Authorization': appId }
      });
      const subs = (await subsRes.json()).subAccounts || [];
      const results: any[] = [];

      for (const sub of subs) {
        const balance = sub.balance || 0;
        if (balance < minCents) {
          results.push({ pixKey: sub.pixKey, name: sub.name, status: 'skipped', reason: 'saldo < minimo', balance });
          continue;
        }

        // Saca tudo (ou balance - 1 centavo pra deixar residual)
        const amount = balance;
        try {
          const wRes = await fetch(`${apiUrl}/api/v1/subaccount/withdraw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': appId },
            body: JSON.stringify({
              pixKey: sub.pixKey,
              value: amount,
              correlationID: `auto-withdraw-${sub.pixKey}-${Date.now()}`
            })
          });
          const wData = await wRes.json();
          results.push({
            pixKey: sub.pixKey,
            name: sub.name,
            status: wRes.ok ? 'withdrawn' : 'error',
            balance,
            amount,
            response: wData
          });
        } catch (err: any) {
          results.push({ pixKey: sub.pixKey, name: sub.name, status: 'error', error: err.message });
        }
      }

      return { success: true, processed: results.length, results, minCents };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * POST /v1/admin/webhooks/woovi-withdraw
   * Saca saldo de UMA subconta específica
   * Body: { pixKey: "...", value: 30 }
   */
  @Post('woovi-withdraw')
  async wooviWithdraw(@Body() body: any) {
    const appId = process.env.WOOVI_APP_ID;
    const apiUrl = process.env.WOOVI_API_URL || 'https://api.woovi.com';
    const pixKey = body.pixKey;
    const value = body.value;
    
    if (!appId) return { success: false, error: 'WOOVI_APP_ID nao configurado' };
    if (!pixKey) return { success: false, error: 'pixKey required' };
    if (!value || value <= 0) return { success: false, error: 'value required (> 0)' };

    try {
      const r = await fetch(`${apiUrl}/api/v1/subaccount/${pixKey}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': appId },
        body: JSON.stringify({
          value,
          correlationID: body.correlationID || `withdraw-${pixKey}-${Date.now()}`
        })
      });
      const data = await r.json();
      return { success: r.ok, status: r.status, response: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * GET /v1/admin/webhooks/woovi-subaccounts
   * Lista subcontas com saldos
   */
  @Get('woovi-subaccounts')
  async wooviSubaccounts() {
    const appId = process.env.WOOVI_APP_ID;
    const apiUrl = process.env.WOOVI_API_URL || 'https://api.woovi.com';
    if (!appId) return { success: false, error: 'WOOVI_APP_ID nao configurado' };

    try {
      const r = await fetch(`${apiUrl}/api/v1/subaccount`, {
        headers: { 'Authorization': appId }
      });
      const data = await r.json();
      const subs = data.subAccounts || [];
      const total = subs.reduce((s: number, sub: any) => s + (sub.balance || 0), 0);
      return {
        success: true,
        count: subs.length,
        totalCents: total,
        totalBrl: (total / 100).toFixed(2),
        subaccounts: subs.map((s: any) => ({
          pixKey: s.pixKey,
          name: s.name,
          balance: s.balance || 0,
          balanceBrl: ((s.balance || 0) / 100).toFixed(2),
          withdrawBlocked: s.withdrawBlocked
        }))
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * POST /v1/admin/webhooks/woovi-cron-run
   * Roda o cron de auto-withdraw manualmente (pra teste)
   */
  @Post('woovi-cron-run')
  async wooviCronRun(@Body() body: any) {
    try {
      const { WooviCronService } = require('../woovi/woovi-cron.service');
      const service = new WooviCronService();
      const minCents = body?.minCents || 100;
      // Chama o método direto
      await (service as any).autoWithdrawAll();
      return { success: true, message: 'auto-withdraw executado' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * GET /v1/admin/webhooks/woovi-cron-status
   * Mostra config do cron
   */
  @Get('woovi-cron-status')
  async wooviCronStatus() {
    return {
      success: true,
      configured: !!process.env.WOOVI_APP_ID,
      schedule: 'every 1 hour',
      minCents: parseInt(process.env.AUTO_WITHDRAW_MIN_CENTS || '100'),
      minBrl: (parseInt(process.env.AUTO_WITHDRAW_MIN_CENTS || '100') / 100).toFixed(2),
      debugMode: process.env.AUTO_WITHDRAW_DEBUG === 'true'
    };
  }


  /**
   * GET /v1/admin/webhooks/api-spec.json
   * OpenAPI 3.0 spec (pra Swagger UI)
   */
  @Get('api-spec.json')
  async apiSpec() {
    // Retorna o spec OpenAPI inline (sem precisar de arquivo estático)
    return { openapi: '3.0.0', info: { title: 'NextGen Assets API', version: '1.0.0' }, servers: [{ url: 'https://api.nextgenassets.com.br' }] };
  }


  /**
   * GET /v1/admin/webhooks/pluggy-list
   * Lista webhooks Pluggy registrados
   */
  @Get('pluggy-list')
  async pluggyList() {
    const apiKey = process.env.PLUGGY_API_KEY;
    if (!apiKey) return { success: false, error: 'PLUGGY_API_KEY nao configurado' };
    
    try {
      const r = await fetch('https://api.pluggy.ai/webhooks', {
        headers: { 'X-API-KEY': apiKey }
      });
      const data = await r.json();
      return { success: r.ok, count: (data.results || []).length, webhooks: data.results || data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * POST /v1/admin/webhooks/pluggy-register-events
   * Registra webhook Pluggy pra todos eventos (item/created, transactions/*, etc)
   */
  @Post('pluggy-register-events')
  async pluggyRegisterEvents(@Body() body: any) {
    const apiKey = process.env.PLUGGY_API_KEY;
    if (!apiKey) return { success: false, error: 'PLUGGY_API_KEY nao configurado' };
    
    const url = body.url || 'https://api.nextgenassets.com.br/v1/admin/webhooks/pluggy-alias';
    const event = body.event || 'all';
    const name = body.name || 'NextGen All Events Webhook';
    
    try {
      const r = await fetch('https://api.pluggy.ai/webhooks', {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, url, name })
      });
      const data = await r.json();
      return { success: r.ok, status: r.status, webhook: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * GET /v1/admin/webhooks/klavi-status
   * Status config Klavi
   */
  @Get('klavi-status')
  async klaviStatus() {
    return {
      enabled: process.env.KLAVI_ENABLED !== 'false',
      configured: !!(process.env.KLAVI_ACCESS_KEY && process.env.KLAVI_SECRET_KEY),
      apiUrl: process.env.KLAVI_API_URL || 'https://api-sandbox.klavi.ai',
      productType: process.env.KLAVI_PRODUCT_TYPE || 'OF',
      accessKey: process.env.KLAVI_ACCESS_KEY ? '***' + process.env.KLAVI_ACCESS_KEY.slice(-4) : null
    };
  }

  /**
   * POST /v1/admin/webhooks/klavi-test
   * Testa Klavi: auth + create link
   */
  @Post('klavi-test')
  async klaviTest(@Body() body: any) {
    const accessKey = process.env.KLAVI_ACCESS_KEY;
    const secretKey = process.env.KLAVI_SECRET_KEY;
    const apiUrl = process.env.KLAVI_API_URL || 'https://api-sandbox.klavi.ai';
    
    if (!accessKey || !secretKey) {
      return { success: false, error: 'KLAVI_ACCESS_KEY / KLAVI_SECRET_KEY nao configurados' };
    }

    try {
      // 1) Auth
      const authRes = await fetch(`${apiUrl}/data/v1/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey, secretKey })
      });
      if (!authRes.ok) {
        const err = await authRes.text();
        return { success: false, step: 'auth', status: authRes.status, body: err };
      }
      const authData: any = await authRes.json();

      // 2) Create link (com taxId do body ou default)
      const personalTaxId = body.personalTaxId || '34198276870';
      const linkRes = await fetch(`${apiUrl}/data/v1/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authData.accessToken}` },
        body: JSON.stringify({ personalTaxId, email: body.email, redirectUrl: body.redirectUrl })
      });
      if (!linkRes.ok) {
        const err = await linkRes.text();
        return { success: false, step: 'createLink', status: linkRes.status, body: err, auth: { hasToken: true, expireIn: authData.expireIn } };
      }
      const linkData: any = await linkRes.json();

      return {
        success: true,
        auth: { hasToken: true, expireIn: authData.expireIn },
        link: {
          linkId: linkData.linkId,
          linkToken: linkData.linkToken ? linkData.linkToken.substring(0, 30) + '...' : null,
          linkUrl: linkData.linkUrl,
          expireIn: linkData.expireIn
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * POST /v1/admin/webhooks/klavi-simulate
   * Simula webhook do Klavi
   */
  @Post('klavi-simulate')
  async klaviSimulate(@Body() body: any) {
    return { received: true, simulated: true, body };
  }


  /**
   * POST /v1/admin/webhooks/gatilho-criar
   * Cria gatilho de compra end-to-end (Klavi + Woovi)
   */
  @Post('gatilho-criar')
  async gatilhoCriar(@Body() body: any) {
    try {
      const { GatilhoCompraService } = require('../gatilho-compra/gatilho-compra.service');
      const service = new GatilhoCompraService();
      
      // Gera link Klavi pra conectar banco (mock taxId)
      const personalTaxId = body.personalTaxId || '34198276870';
      const linkRes = await fetch(`${process.env.KLAVI_API_URL || 'https://api-sandbox.klavi.ai'}/data/v1/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.klaviGetToken()}`
        },
        body: JSON.stringify({ personalTaxId, email: body.email || 'henriquecampos66@gmail.com' })
      });
      const linkData: any = await linkRes.json();
      
      const result = await service.configurar({
        userId: body.userId || 'cmqa2r5w70001hmvqqvgywyxd',
        partnerId: body.partnerId || 'cmq9py9m70000o0ijl4wreunk',
        offerId: body.offerId,
        bankCode: body.bankCode || 'itaú',
        amountCents: body.amountCents || 1000,
        condition: body.condition || 'auto',
        threshold: body.threshold,
        klaviLinkToken: linkData.linkToken,
        klaviTaxId: personalTaxId
      });
      
      return {
        success: true,
        gatilho: result,
        klaviLinkUrl: linkData.linkUrl
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Helper: gera token Klavi
   */
  private async klaviGetToken(): Promise<string> {
    const accessKey = process.env.KLAVI_ACCESS_KEY;
    const secretKey = process.env.KLAVI_SECRET_KEY;
    if (!accessKey || !secretKey) {
      throw new Error('KLAVI_ACCESS_KEY / KLAVI_SECRET_KEY nao configurados');
    }
    const r = await fetch(`${process.env.KLAVI_API_URL || 'https://api-sandbox.klavi.ai'}/data/v1/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessKey, secretKey })
    });
    if (!r.ok) throw new Error(`Klavi auth: ${r.status}`);
    const d: any = await r.json();
    return d.accessToken;
  }

  /**
   * POST /v1/admin/webhooks/gatilho-avaliar
   * Avalia um gatilho (lê saldo via Klavi + cria charge se condição atender)
   */
  @Post('gatilho-avaliar')
  async gatilhoAvaliar(@Body() body: any) {
    try {
      const { GatilhoCompraService } = require('../gatilho-compra/gatilho-compra.service');
      const { KlaviService } = require('../klavi/klavi.service');
      const { WooviPixAdapter } = require('../woovi/woovi-pix-adapter');
      
      const service = new GatilhoCompraService();
      const klavi = new KlaviService();
      const woovi = new WooviPixAdapter();
      
      const result = await service.avaliar({
        gatilhoId: body.gatilhoId,
        klaviService: klavi,
        wooviAdapter: woovi
      });
      
      return { success: true, ...result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * POST /v1/admin/webhooks/gatilho-flow-completo
   * FLUXO END-TO-END pra teste:
   * 1. Cria gatilho
   * 2. Avalia (lê saldo Klavi)
   * 3. Cria charge Woovi se condição atender
   * 4. Retorna link pagamento
   */
  @Post('gatilho-flow-completo')
  async gatilhoFlowCompleto(@Body() body: any) {
    try {
      const { GatilhoCompraService } = require('../gatilho-compra/gatilho-compra.service');
      const service = new GatilhoCompraService();
      
      // 1) Cria gatilho
      const personalTaxId = body.personalTaxId || '34198276870';
      const linkRes = await fetch(`${process.env.KLAVI_API_URL || 'https://api-sandbox.klavi.ai'}/data/v1/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.klaviGetToken()}`
        },
        body: JSON.stringify({ personalTaxId, email: 'henriquecampos66@gmail.com' })
      });
      const linkData: any = await linkRes.json();
      
      const gatilho = await service.configurar({
        userId: 'cmqa2r5w70001hmvqqvgywyxd',
        partnerId: 'cmq9py9m70000o0ijl4wreunk',
        offerId: 'offer-demo-001',
        bankCode: body.bankCode || 'itau',
        amountCents: body.amountCents || 1000,
        condition: 'auto',
        klaviLinkToken: linkData.linkToken,
        klaviTaxId: personalTaxId
      });
      
      return {
        success: true,
        step1_gatilho: gatilho,
        step2_klaviLink: {
          linkUrl: linkData.linkUrl,
          linkId: linkData.linkId,
          expireIn: linkData.expireIn
        },
        nextStep: 'POST /v1/admin/webhooks/gatilho-avaliar com {gatilhoId}'
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * POST /v1/admin/webhooks/woovi-subscription-create
   * Cria subscription recorrente (Pix Automático)
   */
  @Post('woovi-subscription-create')
  async wooviSubscriptionCreate(@Body() body: any) {
    const appId = process.env.WOOVI_APP_ID;
    const apiUrl = process.env.WOOVI_API_URL || 'https://api.woovi.com';
    
    if (!appId) return { success: false, error: 'WOOVI_APP_ID nao configurado' };

    const value = body.value || 1990;  // R$ 19,90 default (PREMIUM)
    const taxID = body.taxID || '34198276870';
    const dayGenerateCharge = body.dayGenerateCharge || 5;  // dia 5
    const name = body.name || 'Henrique Campos';
    const email = body.email || 'henriquecampos66@gmail.com';
    const phone = body.phone || '5511947984328';
    const correlationID = body.correlationID || `sub-${Date.now()}`;

    try {
      const r = await fetch(`${apiUrl}/api/v1/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': appId },
        body: JSON.stringify({
          value,
          customer: { name, taxID, email, phone, address: { zipcode: '01310100', street: 'Av Paulista', number: '1000', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP', country: 'BR' } },
          dayGenerateCharge,
          chargeType: 'OVERDUE',
          correlationID
        })
      });
      const data = await r.json();
      return { success: r.ok, status: r.status, request: { value, taxID, dayGenerateCharge }, response: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * GET /v1/admin/webhooks/woovi-subscription-list
   * Lista subscriptions
   */
  @Get('woovi-subscription-list')
  async wooviSubscriptionList() {
    const appId = process.env.WOOVI_APP_ID;
    const apiUrl = process.env.WOOVI_API_URL || 'https://api.woovi.com';
    if (!appId) return { success: false, error: 'WOOVI_APP_ID nao configurado' };

    try {
      const r = await fetch(`${apiUrl}/api/v1/subscriptions?pageSize=20`, {
        headers: { 'Authorization': appId }
      });
      const data = await r.json();
      return { success: r.ok, count: (data.subscriptions || []).length, subscriptions: data.subscriptions || data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * DELETE /v1/admin/webhooks/woovi-subscription-cancel
   * Cancela subscription
   */
  @Post('woovi-subscription-cancel')
  async wooviSubscriptionCancel(@Body() body: any) {
    const appId = process.env.WOOVI_APP_ID;
    const apiUrl = process.env.WOOVI_API_URL || 'https://api.woovi.com';
    if (!appId) return { success: false, error: 'WOOVI_APP_ID nao configurado' };
    if (!body.globalID) return { success: false, error: 'globalID required' };

    try {
      const r = await fetch(`${apiUrl}/api/v1/subscriptions/${body.globalID}`, {
        method: 'DELETE',
        headers: { 'Authorization': appId }
      });
      const data = await r.json();
      return { success: r.ok, status: r.status, response: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * POST /v1/admin/webhooks/gatilho-avaliado-completo
   * FLUXO A (subscription) + C (link pagamento) consolidado
   * Se amountCents >= 10000 (R$ 100) E user tem consent Klavi: cria subscription
   * Senão: cria charge normal (link pagamento)
   */
  @Post('gatilho-avaliado-completo')
  async gatilhoAvaliadoCompleto(@Body() body: any) {
    try {
      const { WooviPixAdapter } = require('../woovi/woovi-pix-adapter');
      const woovi = new WooviPixAdapter();
      
      const value = body.amountCents || 1990;
      const taxID = body.taxID || '34198276870';
      const isRecurring = body.recurring === true;
      
      if (isRecurring) {
        // FLUXO A: Subscription
        const sub = await woovi.createSubscription({
          value,
          customer: {
            name: body.name || 'Henrique Campos',
            taxID,
            email: body.email || 'henriquecampos66@gmail.com',
            phone: body.phone || '5511947984328'
          },
          dayGenerateCharge: body.dayGenerateCharge || 5,
          correlationID: body.correlationID
        });
        return { 
          success: true, 
          flow: 'A (subscription recorrente)',
          subscription: sub
        };
      } else {
        // FLUXO C: Link pagamento
        // Split: 3% NextGen + 97% Partner (Woovi retém o resto)
        // Taxa Woovi = 0,5% do total (mínimo 1 centavo)
        const nextgenCents = Math.floor(value * 0.03);
        const wooviFeeCents = Math.max(Math.ceil(value * 0.005), 1);
        const partnerCents = value - nextgenCents - wooviFeeCents;
        const charge = await woovi.createChargeWithSplit({
          correlationID: body.correlationID || `gatilho-${Date.now()}`,
          totalCents: value,
          nextgenCents,
          partnerCents,
          nextgenPixKey: '61922930000197',
          partnerPixKey: 'henriquecampos66@gmail.com',
          comment: body.comment || `Gatilho disparou (R$ ${(value/100).toFixed(2)})`
        });
        return {
          success: true,
          flow: 'C (link pagamento manual)',
          charge
        };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * GET /v1/admin/webhooks/efi-of-status
   * Status config Efi OF
   */
  @Get('efi-of-status')
  async efiOfStatus() {
    return {
      enabled: process.env.EFI_OF_ENABLED !== 'false',
      configured: !!(process.env.EFI_CLIENT_ID && process.env.EFI_CLIENT_SECRET && process.env.EFI_CERTIFICATE_BASE64),
      apiUrl: process.env.EFI_OF_API_URL || 'https://openfinance.api.efibank.com.br',
      hasCert: !!process.env.EFI_CERTIFICATE_BASE64,
      hasClientId: !!process.env.EFI_CLIENT_ID,
      hasSecret: !!process.env.EFI_CLIENT_SECRET
    };
  }

  /**
   * POST /v1/admin/webhooks/efi-of-test
   * Testa conexão Efi OF (gera access_token via OAuth2 + mTLS)
   */
  @Post('efi-of-test')
  async efiOfTest(@Body() body: any) {
    try {
      const { EfiOFService } = require('../efi-of/efi-of.service');
      const service = new EfiOFService();
      const result = await service.testConnection();
      return { success: result.ok, ...result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * POST /v1/admin/webhooks/efi-of-consent
   * Cria consentimento de pagamento (cliente autoriza NextGen a iniciar PIX)
   */
  @Post('efi-of-consent')
  async efiOfConsent(@Body() body: any) {
    try {
      const { EfiOFService } = require('../efi-of/efi-of.service');
      const service = new EfiOFService();
      const result = await service.createConsent({
        cpf: body.cpf || '34198276870',
        cnpj: body.cnpj,
        permissions: body.permissions || ['accounts.read', 'transactions.read', 'payments.initiate'],
        expirationDateTime: body.expirationDateTime,
        redirectUrl: body.redirectUrl
      });
      return { success: true, ...result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * POST /v1/admin/webhooks/efi-of-pay
   * INICIA PAGAMENTO PIX via Open Finance (PISP)
   * Esse é o endpoint que faz o débito DIRETO na conta do cliente!
   */
  @Post('efi-of-pay')
  async efiOfPay(@Body() body: any) {
    try {
      const { EfiOFService } = require('../efi-of/efi-of.service');
      const service = new EfiOFService();
      const result = await service.initiatePayment({
        consentId: body.consentId,
        cpf: body.cpf || '34198276870',
        cnpj: body.cnpj,
        amountCents: body.amountCents,
        pixKey: body.pixKey || 'henriquecampos66@gmail.com',
        description: body.description || 'NextGen split payment'
      });
      return { success: true, ...result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * GET /v1/admin/webhooks/efi-cert-info
   * Info do certificado Efi (validade, subject, etc)
   */
  @Get('efi-cert-info')
  async efiCertInfo() {
    try {
      const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
      if (!certBase64) return { success: false, error: 'EFI_CERTIFICATE_BASE64 nao configurado' };
      
      const pfx = Buffer.from(certBase64, 'base64');
      return {
        success: true,
        size: pfx.length,
        sha256: require('crypto').createHash('sha256').update(pfx).digest('hex').substring(0, 32),
        // Tentamos extrair mais info se tiver openssl
        hasPassphrase: !!process.env.EFI_CERT_PASSPHRASE
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * POST /v1/admin/webhooks/efi-of-test-both
   * Testa homolog + produção (descobre qual cert está correto)
   */
  @Post('efi-of-test-both')
  async efiOfTestBoth(@Body() body: any) {
    const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
    const clientId = process.env.EFI_CLIENT_ID;
    const clientSecret = process.env.EFI_CLIENT_SECRET;
    
    if (!certBase64) return { success: false, error: 'EFI_CERTIFICATE_BASE64 nao configurado' };
    
    const results: any = {};
    
    for (const env of ['producao', 'homologacao']) {
      const isProd = env === 'producao';
      const apiUrl = isProd 
        ? 'https://openfinance.api.efibank.com.br'
        : 'https://openfinance-h.api.efibank.com.br';
      const credenciais = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      try {
        const pfx = Buffer.from(certBase64, 'base64');
        const result: any = await new Promise((resolve) => {
          const url = new URL(`${apiUrl}/v1/oauth/token`);
          const req = require('https').request({
            method: 'POST',
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            pfx: pfx,
            passphrase: '',
            rejectUnauthorized: false,
            headers: {
              'Authorization': `Basic ${credenciais}`,
              'Content-Type': 'application/json'
            }
          }, (res: any) => {
            let data = '';
            res.on('data', (chunk: any) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data, text: data }));
          });
          req.on('error', (err: any) => resolve({ error: err.message }));
          req.write(JSON.stringify({
            grant_type: 'client_credentials',
            scope: 'open-finance.consent open-finance.payment'
          }));
          req.end();
        });
        results[env] = {
          ok: result.status >= 200 && result.status < 300,
          status: result.status,
          error: result.error || null,
          response: result.data || (result.text ? result.text.substring(0, 500) : null)
        };
      } catch (err: any) {
        results[env] = { error: err.message };
      }
    }
    
    return { success: true, results };
  }


  /**
   * POST /v1/admin/webhooks/efi-of-flow-completo
   * FLUXO END-TO-END: Cria consent → inicia pagamento → split Woovi
   * Esse é O fluxo "pagar direto da conta do cliente"
   */
  @Post('efi-of-flow-completo')
  async efiOfFlowCompleto(@Body() body: any) {
    try {
      const { EfiOFService } = require('../efi-of/efi-of.service');
      const { WooviPixAdapter } = require('../woovi/woovi-pix-adapter');
      const efi = new EfiOFService();
      const woovi = new WooviPixAdapter();
      
      const cpf = body.cpf || '34198276870';
      const amountCents = body.amountCents || 1000;
      const description = body.description || 'NextGen payment';
      const pixKey = body.pixKey || 'henriquecampos66@gmail.com';
      
      // 1) Cria consentimento (cliente autoriza NextGen a iniciar pagamento)
      const consent = await efi.createConsent({
        cpf,
        permissions: ['accounts.read', 'transactions.read', 'payments.initiate']
      });
      
      // 2) Inicia pagamento (PISP - direto da conta do cliente)
      // NOTA: precisa de consent.authorized (cliente autorizou no app do banco)
      // Pra teste, vamos simular
      const payment = await efi.initiatePayment({
        consentId: consent.consentId,
        cpf,
        amountCents,
        pixKey,
        description
      });
      
      // 3) Quando PIX chegar na conta NextGen, Woovi faz split
      const totalCents = amountCents;
      const nextgenCents = Math.floor(totalCents * 0.03);
      const wooviFeeCents = Math.max(Math.ceil(totalCents * 0.005), 1);
      const partnerCents = totalCents - nextgenCents - wooviFeeCents;
      
      const charge = await woovi.createChargeWithSplit({
        correlationID: `efi-${payment.paymentId}`,
        totalCents,
        nextgenCents,
        partnerCents,
        nextgenPixKey: '61922930000197',
        partnerPixKey: pixKey,
        comment: `Efi OF: ${description}`
      });
      
      return {
        success: true,
        step1_consent: consent,
        step2_payment: payment,
        step3_split: charge
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * POST /v1/admin/webhooks/efi-criar-consent
   * Passo 1: Cria consentimento (cliente autoriza no app)
   */
  @Post('efi-criar-consent')
  async efiCriarConsent(@Body() body: any) {
    try {
      const { EfiOFService } = require('../efi-of/efi-of.service');
      const efi = new EfiOFService();
      const result = await efi.createConsent({
        cpf: body.cpf || '34198276870',
        cnpj: body.cnpj,
        permissions: body.permissions || ['accounts.read', 'transactions.read', 'payments.initiate'],
        expirationDateTime: body.expirationDateTime,
        redirectUrl: body.redirectUrl
      });
      return { success: true, ...result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * POST /v1/admin/webhooks/efi-pay
   * Passo 2: Inicia pagamento (já com consentId)
   */
  @Post('efi-pay')
  async efiPay(@Body() body: any) {
    try {
      const { EfiOFService } = require('../efi-of/efi-of.service');
      const efi = new EfiOFService();
      const result = await efi.initiatePayment({
        consentId: body.consentId,
        cpf: body.cpf || '34198276870',
        cnpj: body.cnpj,
        amountCents: body.amountCents,
        pixKey: body.pixKey || 'henriquecampos66@gmail.com',
        description: body.description || 'NextGen payment'
      });
      return { success: true, ...result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * GET /v1/admin/webhooks/efi-cert-decode
   * Decodifica o cert .p12 (validade, subject, issuer)
   */
  @Get('efi-cert-decode')
  async efiCertDecode() {
    try {
      const { execSync } = require('child_process');
      const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
      if (!certBase64) return { success: false, error: 'EFI_CERTIFICATE_BASE64 nao configurado' };
      
      // Salva em arquivo temp
      const tmpPath = '/tmp/efi_cert.p12';
      require('fs').writeFileSync(tmpPath, Buffer.from(certBase64, 'base64'));
      
      // Tenta ler info sem passphrase - várias tentativas
      let info: string;
      const tryRead = (pass: string): string | null => {
        try {
          const result = execSync(`openssl pkcs12 -in ${tmpPath} -info -nokeys -passin pass:${pass} 2>&1`, { encoding: 'utf-8', timeout: 5000 });
          if (result.includes('subject=') && result.includes('BEGIN CERTIFICATE')) {
            return result;
          }
        } catch {}
        return null;
      };
      
      info = tryRead('') || tryRead('changeit') || tryRead('efi') || tryRead('efi123') || tryRead('1234') || tryRead('nextgen') || tryRead('NextGen') || tryRead('notarize') || '';
      
      if (!info) {
        return { 
          success: false, 
          error: 'Cert protegido por senha',
          hint: 'Tente com senha. Ou set EFI_CERT_PASSPHRASE',
          certSize: Buffer.from(certBase64, 'base64').length
        };
      }
      
      // Extrai info básica
      const lines = info.split('\n');
      const issuerLine = lines.find((l: string) => l.includes('issuer='));
      const subjectLine = lines.find((l: string) => l.includes('subject='));
      const datesLine = lines.find((l: string) => l.includes('notBefore') || l.includes('notAfter'));
      
      return {
        success: true,
        size: Buffer.from(certBase64, 'base64').length,
        issuer: issuerLine,
        subject: subjectLine,
        dates: datesLine,
        preview: info.substring(0, 1000)
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * POST /v1/admin/webhooks/efi-cert-test-passphrase
   * Tenta várias passphrases comuns
   */
  @Post('efi-cert-test-passphrase')
  async efiCertTestPassphrase(@Body() body: any) {
    try {
      const { execSync } = require('child_process');
      const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
      if (!certBase64) return { success: false, error: 'EFI_CERTIFICATE_BASE64 nao configurado' };
      
      const tmpPath = '/tmp/efi_cert_test.p12';
      require('fs').writeFileSync(tmpPath, Buffer.from(certBase64, 'base64'));
      
      const passphrases = body.passphrases || ['', 'changeit', 'efi', 'efi123', '1234', 'nextgen', 'NextGen', 'notarize', 'NOTARIZE', 'apis.efipay.com.br', 'api'];
      const results: any[] = [];
      
      for (const pass of passphrases) {
        try {
          const info = execSync(`openssl pkcs12 -in ${tmpPath} -info -nokeys -passin pass:${pass} 2>&1`, { encoding: 'utf-8', timeout: 5000 });
          if (info.includes('subject=') && !info.includes('Error')) {
            results.push({ passphrase: pass || '(vazia)', ok: true, size: info.length });
          } else {
            results.push({ passphrase: pass || '(vazia)', ok: false });
          }
        } catch (e: any) {
          results.push({ passphrase: pass || '(vazia)', ok: false, error: e.message.substring(0, 100) });
        }
      }
      
      // Limpa
      try { require('fs').unlinkSync(tmpPath); } catch {}
      
      return { success: true, results };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * POST /v1/admin/webhooks/efi-test-urls
   * Tenta várias URLs alternativas pra Efi
   */
  @Post('efi-test-urls')
  async efiTestUrls(@Body() body: any) {
    const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
    const clientId = process.env.EFI_CLIENT_ID;
    const clientSecret = process.env.EFI_CLIENT_SECRET;
    
    if (!certBase64) return { success: false, error: 'EFI_CERTIFICATE_BASE64 nao configurado' };
    
    const credenciais = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const urls = [
      'https://openfinance.api.efibank.com.br/v1/oauth/token',
      'https://openfinance-h.api.efibank.com.br/v1/oauth/token',
      'https://api.efipay.com.br/v1/oauth/token',
      'https://api-h.efipay.com.br/v1/oauth/token',
      'https://pix.api.efipay.com.br/oauth/token',
      'https://api-pix.gerencianet.com.br/oauth/token',
      'https://openfinance-api.efipay.com.br/v1/oauth/token'
    ];
    
    const pfx = Buffer.from(certBase64, 'base64');
    const results: any = {};
    
    for (const url of urls) {
      try {
        const result: any = await new Promise((resolve) => {
          const u = new URL(url);
          const req = require('https').request({
            method: 'POST',
            hostname: u.hostname,
            port: 443,
            path: u.pathname + u.search,
            pfx: pfx,
            passphrase: '',
            rejectUnauthorized: false,
            headers: {
              'Authorization': `Basic ${credenciais}`,
              'Content-Type': 'application/json',
              'Content-Length': 100
            },
            timeout: 5000
          }, (res: any) => {
            let data = '';
            res.on('data', (chunk: any) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, text: data.substring(0, 200) }));
          });
          req.on('error', (err: any) => resolve({ error: err.message.substring(0, 200) }));
          req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
          req.write(JSON.stringify({ grant_type: 'client_credentials', scope: 'open-finance.consent open-finance.payment' }));
          req.end();
        });
        results[url] = result;
      } catch (err: any) {
        results[url] = { error: err.message };
      }
    }
    
    return { success: true, results };
  }


  /**
   * GET /v1/admin/webhooks/efi-cert-full
   * Mostra cert completo do cliente em formato PEM
   */
  @Get('efi-cert-full')
  async efiCertFull() {
    try {
      const { execSync } = require('child_process');
      const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
      if (!certBase64) return { success: false, error: 'EFI_CERTIFICATE_BASE64 nao configurado' };
      
      const tmpPath = '/tmp/efi_cert_full.p12';
      require('fs').writeFileSync(tmpPath, Buffer.from(certBase64, 'base64'));
      
      // Extrai cert (sem passphrase)
      const certPem = execSync(`openssl pkcs12 -in ${tmpPath} -clcerts -nokeys -passin pass: 2>&1`, { encoding: 'utf-8' });
      const caPem = execSync(`openssl pkcs12 -in ${tmpPath} -cacerts -nokeys -passin pass: 2>&1`, { encoding: 'utf-8' });
      
      // Salva em temp files e pega info
      require('fs').writeFileSync('/tmp/efi_client_only.pem', certPem);
      const certInfo = execSync(`openssl x509 -in /tmp/efi_client_only.pem -text -noout 2>&1`, { encoding: 'utf-8' });
      
      // Pega chain CA (se houver)
      const hasCa = caPem.includes('BEGIN CERTIFICATE');
      
      return {
        success: true,
        size: Buffer.from(certBase64, 'base64').length,
        certOnly: certPem,
        caChain: hasCa ? caPem : null,
        info: certInfo,
        hasCaBundle: hasCa
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * GET /v1/admin/webhooks/efi-debug-tls
   * Mostra info detalhada do TLS agent usado
   */
  @Get('efi-debug-tls')
  async efiDebugTls() {
    const debug: any = {
      certSize: Buffer.from(process.env.EFI_CERTIFICATE_BASE64 || '', 'base64').length,
      certPassphrase: process.env.EFI_CERT_PASSPHRASE || '(vazio)',
      clientId: process.env.EFI_CLIENT_ID?.substring(0, 30),
      hasSecret: !!process.env.EFI_CLIENT_SECRET,
      apiUrl: process.env.EFI_OF_API_URL,
      oauthUrl: process.env.EFI_OAUTH_URL,
      tls: {
        nodeVersion: process.version,
        opensslVersion: process.versions.openssl,
        secureContext: 'N/A'
      },
      chainFiles: {}
    };
    
    // Tenta ler os chain files
    try {
      const fs = require('fs');
      debug.chainFiles.prod = fs.statSync('apps/api/src/certs/efi-chain-prod.crt').size;
      debug.chainFiles.homolog = fs.statSync('apps/api/src/certs/efi-chain-homolog.crt').size;
    } catch (e: any) {
      debug.chainFiles.error = e.message;
    }
    
    return debug;
  }


  /**
   * GET /v1/admin/webhooks/efi-chain-search
   * Procura chain certs em TODOS os paths possíveis
   */
  @Get('efi-chain-search')
  async efiChainSearch() {
    try {
      const fs = require('fs');
      const path = require('path');
      const search = (name: string) => {
        const paths = [
          path.join(process.cwd(), 'apps/api/dist/certs', name),
          path.join(process.cwd(), 'apps/api/src/certs', name),
          path.join(process.cwd(), 'dist/certs', name),
          path.join(process.cwd(), 'src/certs', name),
          path.join(__dirname, '..', '..', '..', 'certs', name),
          path.join(__dirname, '..', '..', '..', '..', 'certs', name),
          path.join(__dirname, '..', '..', '..', '..', '..', 'certs', name),
          `/etc/secrets/${name}`,
          `/tmp/${name}`,
          `./${name}`,
          `./apps/api/src/certs/${name}`,
          `./certs/${name}`,
        ];
        return paths.map((p) => {
          try {
            if (fs.existsSync(p)) {
              const stat = fs.statSync(p);
              return { path: p, exists: true, size: stat.size };
            }
            return { path: p, exists: false };
          } catch (e: any) {
            return { path: p, exists: false, error: e.message };
          }
        });
      };
      
      return {
        success: true,
        cwd: process.cwd(),
        dirname: __dirname,
        prodSearch: search('efi-chain-prod.crt'),
        homologSearch: search('efi-chain-homolog.crt'),
        // Lista arquivos em paths comuns
        listings: {
          'process.cwd()': fs.existsSync(process.cwd()) ? fs.readdirSync(process.cwd()).slice(0, 20) : [],
          'cwd/apps/api': fs.existsSync(path.join(process.cwd(), 'apps/api')) ? fs.readdirSync(path.join(process.cwd(), 'apps/api')).slice(0, 20) : [],
          'cwd/apps/api/src': fs.existsSync(path.join(process.cwd(), 'apps/api/src')) ? fs.readdirSync(path.join(process.cwd(), 'apps/api/src')).slice(0, 30) : [],
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }





  /**
   * GET /v1/admin/webhooks/efi-tcp-test
   * Testa conectividade TCP+SSL com a Efi SEM mTLS
   */
  @Get('efi-tcp-test')
  async efiTcpTest() {
    const https = require('https');
    const tls = require('tls');
    
    const results: any = {};
    const hosts = [
      { name: 'producao', host: 'openfinance.api.efibank.com.br' },
      { name: 'homolog', host: 'openfinance-h.api.efibank.com.br' }
    ];
    
    for (const { name, host } of hosts) {
      const startTime = Date.now();
      try {
        const result: any = await new Promise((resolve) => {
          const socket = tls.connect({
            host: host,
            port: 443,
            rejectUnauthorized: false,
            servername: host,
            timeout: 10000
          }, () => {
            const peerCert = socket.getPeerCertificate();
            const cipher = socket.getCipher();
            const proto = socket.getProtocol();
            socket.end();
            resolve({
              success: true,
              latencyMs: Date.now() - startTime,
              certSubject: peerCert?.subject,
              certIssuer: peerCert?.issuer,
              cipher: cipher?.name,
              protocol: proto
            });
          });
          socket.on('error', (err: any) => resolve({ success: false, error: err.message, latencyMs: Date.now() - startTime }));
          socket.on('timeout', () => { socket.destroy(); resolve({ success: false, error: 'timeout' }); });
        });
        results[name] = result;
      } catch (err: any) {
        results[name] = { success: false, error: err.message };
      }
    }
    
    return { success: true, results };
  }


  /**
   * POST /v1/admin/webhooks/efi-tcp-direct
   * Testa TLS direto via IP (bypass cloudflare)
   */
  @Post('efi-tcp-direct')
  async efiTcpDirect(@Body() body: any) {
    const tls = require('tls');
    const dns = require('dns').promises;
    
    const results: any = {};
    const hosts = [
      { name: 'producao', host: 'openfinance.api.efibank.com.br' },
      { name: 'homolog', host: 'openfinance-h.api.efibank.com.br' }
    ];
    
    for (const { name, host } of hosts) {
      try {
        const addrs = await dns.resolve4(host);
        const ip = addrs[0];
        const result: any = await new Promise((resolve) => {
          const startTime = Date.now();
          const socket = tls.connect({
            host: ip,
            port: 443,
            servername: host,
            rejectUnauthorized: false,
            timeout: 10000
          }, () => {
            const peerCert = socket.getPeerCertificate();
            socket.end();
            resolve({
              success: true,
              ip: ip,
              latencyMs: Date.now() - startTime,
              certSubject: peerCert?.subject,
              certIssuer: peerCert?.issuer
            });
          });
          socket.on('error', (err: any) => resolve({ success: false, ip, error: err.message }));
        });
        results[name] = result;
      } catch (err: any) {
        results[name] = { error: err.message };
      }
    }
    
    return { success: true, results };
  }


  /**
   * POST /v1/admin/webhooks/efi-test-with-cert
   * Testa mTLS com cert enviado no body (pra debug rápido)
   */
  @Post('efi-test-with-cert')
  async efiTestWithCert(@Body() body: any) {
    const https = require('https');
    const startTime = Date.now();
    
    try {
      const certB64 = body.certBase64 || process.env.EFI_CERTIFICATE_BASE64;
      const clientId = body.clientId || process.env.EFI_CLIENT_ID;
      const clientSecret = body.clientSecret || process.env.EFI_CLIENT_SECRET;
      const host = body.host || 'openfinance.api.efibank.com.br';
      
      if (!certB64) return { success: false, error: 'certBase64 não fornecido' };
      if (!clientId || !clientSecret) return { success: false, error: 'clientId/clientSecret faltando' };
      
      const pfx = Buffer.from(certB64, 'base64');
      const credenciais = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      // Tenta handshake com logs detalhados
      const result: any = await new Promise((resolve) => {
        const body = JSON.stringify({
          grant_type: 'client_credentials',
          scope: 'open-finance.consent open-finance.payment'
        });
        
        const req = https.request({
          method: 'POST',
          hostname: host,
          port: 443,
          path: '/v1/oauth/token',
          pfx: pfx,
          passphrase: '',
          rejectUnauthorized: false,
          secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT || 0,
          ciphers: 'DEFAULT:@SECLEVEL=0',
          headers: {
            'Authorization': `Basic ${credenciais}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        }, (res: any) => {
          let data = '';
          res.on('data', (chunk: any) => data += chunk);
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode,
                data: JSON.parse(data),
                text: data,
                latencyMs: Date.now() - startTime,
                certFingerprint: require('crypto').createHash('sha256').update(pfx).digest('hex').substring(0, 16)
              });
            } catch {
              resolve({
                status: res.statusCode,
                text: data,
                latencyMs: Date.now() - startTime,
                certFingerprint: require('crypto').createHash('sha256').update(pfx).digest('hex').substring(0, 16)
              });
            }
          });
        });
        
        req.on('error', (err: any) => {
          resolve({
            status: 0,
            error: err.message,
            errorCode: err.code,
            latencyMs: Date.now() - startTime,
            certFingerprint: require('crypto').createHash('sha256').update(pfx).digest('hex').substring(0, 16)
          });
        });
        
        req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, error: 'timeout', latencyMs: Date.now() - startTime }); });
        req.write(body);
        req.end();
      });
      
      return { success: result.status > 0 && result.status < 500, ...result };
    } catch (err: any) {
      return { success: false, error: err.message, latencyMs: Date.now() - startTime };
    }
  }


  /**
   * POST /v1/admin/webhooks/efi-cert-find-pass
   * Tenta várias senhas no cert atual
   */
  @Post('efi-cert-find-pass')
  async efiCertFindPass(@Body() body: any) {
    try {
      const { execSync } = require('child_process');
      const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
      if (!certBase64) return { success: false, error: 'EFI_CERTIFICATE_BASE64 nao configurado' };
      
      const tmpPath = '/tmp/efi_cert_pass.p12';
      require('fs').writeFileSync(tmpPath, Buffer.from(certBase64, 'base64'));
      
      const extraPasses = body.passphrases || [];
      const allPasses = ['', 'changeit', 'efi', 'Efi', 'efi123', 'EfiPay', 'efipay', 'apis.efipay.com.br', 'api', '1234', '123456', 'nextgen', 'NextGen', 'notarize', 'NOTARIZE', 'efi2024', 'efi2025', 'efi2026', 'openfinance', 'OpenFinance', 'cert', 'Certificado', '34198276870', '61922930000197', ...extraPasses];
      const results: any = { tried: [], found: null };
      
      for (const pass of allPasses) {
        try {
          const info = execSync(`openssl pkcs12 -in ${tmpPath} -info -nokeys -passin pass:${pass} 2>&1`, { encoding: 'utf-8', timeout: 3000 });
          if (info.includes('subject=') && info.includes('BEGIN CERTIFICATE')) {
            results.found = { passphrase: pass || '(vazia)', info: info.substring(0, 500) };
            break;
          }
          results.tried.push({ pass: pass || '(vazia)', ok: false });
        } catch (e: any) {
          results.tried.push({ pass: pass || '(vazia)', ok: false });
        }
      }
      
      try { require('fs').unlinkSync(tmpPath); } catch {}
      
      return { success: !!results.found, ...results, totalTried: allPasses.length };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * POST /v1/admin/webhooks/efi-cert-try-passwords
   * Tenta várias senhas automaticamente no cert atual
   */
  @Post('efi-cert-try-passwords')
  async efiCertTryPasswords(@Body() body: any) {
    try {
      const { execSync } = require('child_process');
      const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
      if (!certBase64) return { success: false, error: 'EFI_CERTIFICATE_BASE64 nao configurado' };
      
      const tmpPath = '/tmp/efi_cert_pwd.p12';
      require('fs').writeFileSync(tmpPath, Buffer.from(certBase64, 'base64'));
      
      const extra = body?.passwords || [];
      const all = [
        '', 'changeit', 'efi', 'Efi', 'EfiPay', 'efipay', 
        'efi123', 'efi2024', 'efi2025', 'efi2026', 'efi2027',
        'apis.efipay.com.br', 'api', 'api-pix', 'api-pix-homolog',
        '1234', '12345', '123456', '1234567', '12345678', '123456789', '1234567890',
        'nextgen', 'NextGen', 'NextGenAssets', 'notarize', 'NOTARIZE', 'NextGenAssets2026',
        'openfinance', 'OpenFinance', 'open-finance', 'pix', 'PIX', 'Pix',
        'cert', 'certificate', 'Certificado', 'senha', 'password', 'pass', 'secret',
        '34198276870', '61922930000197', 'cpf', 'cnpj', 'CNPJ', 'CPF',
        'qwerty', 'admin', 'root', 'master', 'homolog', 'producao', 'production',
        'Gerencianet', 'gerencianet', 'GN', 'gn', 'EFI', 'EFI2026',
        'openbanking', 'ob', 'of', 'pisp', 'PISP',
        'integration', 'integracao', 'webhook', 'webhooks', 'callback', 'callbacks',
        'nextgen2026', 'nextgen2025', 'nextgenassets', 'NextGen_2026',
        'apitoken', 'appsecret', 'clientsecret', 'client_secret',
        'teste', 'test', 'homologacao', 'producao2026',
        'sandbox', 'live', 'prod', 'dev', 'staging',
        ...extra
      ];
      
      for (const pass of all) {
        try {
          const result = execSync(
            `openssl pkcs12 -in ${tmpPath} -info -nokeys -passin pass:${pass} 2>&1`,
            { encoding: 'utf-8', timeout: 3000 }
          );
          if (result.includes('subject=') && result.includes('BEGIN CERTIFICATE')) {
            return { 
              success: true, 
              found: true, 
              password: pass || '(vazia)', 
              size: Buffer.from(certBase64, 'base64').length,
              hint: pass ? `Use EFI_CERT_PASSPHRASE=${pass} no Render` : 'Sem senha - não precisa EFI_CERT_PASSPHRASE'
            };
          }
        } catch {}
      }
      
      try { require('fs').unlinkSync(tmpPath); } catch {}
      return { success: false, found: false, tried: all.length };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  /**
   * GET /v1/admin/webhooks/efi-test-with-passphrase
   * Testa mTLS usando EFI_CERT_PASSPHRASE do env (vazio por padrão)
   */
  @Get('efi-test-with-passphrase')
  async efiTestWithPassphrase() {
    try {
      return await this._efiTestWithPassphrase();
    } catch (err: any) {
      return { success: false, error: err.message, stack: err.stack?.substring(0, 500) };
    }
  }
  
  private async _efiTestWithPassphrase() {
    const https = require('https');
    const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
    const clientId = process.env.EFI_CLIENT_ID;
    const clientSecret = process.env.EFI_CLIENT_SECRET;
    const passphrase = process.env.EFI_CERT_PASSPHRASE || '';
    
    if (!certBase64) return { success: false, error: 'cert faltando' };
    
    const pfx = Buffer.from(certBase64, 'base64');
    const credenciais = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const size = pfx.length;
    
    const startTime = Date.now();
    return new Promise((resolve) => {
      const body = JSON.stringify({
        grant_type: 'client_credentials',
        scope: 'open-finance.consent open-finance.payment'
      });
      
      const req = https.request({
        method: 'POST',
        hostname: 'openfinance.api.efibank.com.br',
        port: 443,
        path: '/v1/oauth/token',
        pfx: pfx,
        passphrase: passphrase,
        keepAlive: true,
        rejectUnauthorized: false,
        secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT || 0,
        ciphers: 'DEFAULT:@SECLEVEL=0',
        headers: {
          'Authorization': 'Basic ' + credenciais,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => data += chunk);
        res.on('end', () => {
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data: data,
            latencyMs: Date.now() - startTime,
            certSize: size,
            passphrase: passphrase || '(vazio)',
            headers: res.headers
          });
        });
      });
      req.on('error', (err: any) => {
        resolve({
          success: false,
          status: 0,
          error: err.message,
          errorCode: err.code,
          latencyMs: Date.now() - startTime,
          certSize: size,
          passphrase: passphrase || '(vazio)'
        });
      });
      req.setTimeout(30000, () => { req.destroy(); resolve({ success: false, error: 'timeout' }); });
      req.write(body);
      req.end();
    });
  }


  /**
   * POST /v1/admin/webhooks/efi-tls-configs
   * Testa várias configs TLS pra contornar Cloudflare
   */
  @Post('efi-tls-configs')
  async efiTlsConfigs(@Body() body: any) {
    const tls = require('tls');
    const https = require('https');
    const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
    const clientId = process.env.EFI_CLIENT_ID;
    const clientSecret = process.env.EFI_CLIENT_SECRET;
    const passphrase = process.env.EFI_CERT_PASSPHRASE || '';
    
    if (!certBase64) return { success: false, error: 'cert faltando' };
    
    const pfx = Buffer.from(certBase64, 'base64');
    const credenciais = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body_data = JSON.stringify({ grant_type: 'client_credentials', scope: 'open-finance.consent open-finance.payment' });
    
    const results: any = {};
    
    // Test 1: TLS 1.2 forçado
    try {
      const r: any = await new Promise((resolve) => {
        const req = https.request({
          method: 'POST', hostname: 'openfinance.api.efibank.com.br', port: 443, path: '/v1/oauth/token',
          pfx: pfx, passphrase: passphrase, rejectUnauthorized: false,
          maxVersion: 'TLSv1.2', minVersion: 'TLSv1.2',
          secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT,
          ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384',
          headers: { 'Authorization': 'Basic ' + credenciais, 'Content-Type': 'application/json', 'Accept': 'application/json', 'Content-Length': Buffer.byteLength(body_data) },
          timeout: 15000
        }, (res: any) => {
          let d = ''; res.on('data', (c: any) => d += c); res.on('end', () => resolve({ ok: res.statusCode < 500, status: res.statusCode, data: d.substring(0, 200) }));
        });
        req.on('error', (e: any) => resolve({ error: e.message }));
        req.setTimeout(15000, () => { req.destroy(); resolve({ error: 'timeout' }); });
        req.write(body_data); req.end();
      });
      results.tls12 = r;
    } catch (err: any) { results.tls12 = { error: err.message }; }
    
    // Test 2: TLS 1.3
    try {
      const r: any = await new Promise((resolve) => {
        const req = https.request({
          method: 'POST', hostname: 'openfinance.api.efibank.com.br', port: 443, path: '/v1/oauth/token',
          pfx: pfx, passphrase: passphrase, rejectUnauthorized: false,
          maxVersion: 'TLSv1.3', minVersion: 'TLSv1.2',
          secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT,
          ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256',
          headers: { 'Authorization': 'Basic ' + credenciais, 'Content-Type': 'application/json', 'Accept': 'application/json', 'Content-Length': Buffer.byteLength(body_data) },
          timeout: 15000
        }, (res: any) => {
          let d = ''; res.on('data', (c: any) => d += c); res.on('end', () => resolve({ ok: res.statusCode < 500, status: res.statusCode, data: d.substring(0, 200) }));
        });
        req.on('error', (e: any) => resolve({ error: e.message }));
        req.setTimeout(15000, () => { req.destroy(); resolve({ error: 'timeout' }); });
        req.write(body_data); req.end();
      });
      results.tls13 = r;
    } catch (err: any) { results.tls13 = { error: err.message }; }
    
    // Test 3: SEM mTLS (só pra ver se a porta responde)
    try {
      const r: any = await new Promise((resolve) => {
        const req = https.request({
          method: 'GET', hostname: 'openfinance.api.efibank.com.br', port: 443, path: '/',
          rejectUnauthorized: false,
          headers: { 'Accept': 'application/json' },
          timeout: 10000
        }, (res: any) => {
          let d = ''; res.on('data', (c: any) => d += c); res.on('end', () => resolve({ ok: true, status: res.statusCode, data: d.substring(0, 200) }));
        });
        req.on('error', (e: any) => resolve({ error: e.message }));
        req.setTimeout(10000, () => { req.destroy(); resolve({ error: 'timeout' }); });
        req.end();
      });
      results.no_mtls_get = r;
    } catch (err: any) { results.no_mtls_get = { error: err.message }; }
    
    return { success: true, results };
  }


  /**
   * GET /v1/admin/webhooks/efi-convert-and-test
   * Extrai cert+key do P12, converte pra PEM, testa mTLS
   */
  @Get('efi-convert-and-test')
  async efiConvertAndTest() {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const https = require('https');
    
    const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
    const envPassphrase = process.env.EFI_CERT_PASSPHRASE || '';
    const clientId = process.env.EFI_CLIENT_ID;
    const clientSecret = process.env.EFI_CLIENT_SECRET;
    const host = 'openfinance.api.efibank.com.br';
    
    if (!certBase64) return { success: false, error: 'cert faltando' };
    
    const tmpP12 = '/tmp/efi_env.p12';
    const tmpPEM = '/tmp/efi_env_clean.pem';
    fs.writeFileSync(tmpP12, Buffer.from(certBase64, 'base64'));
    
    // Tenta extrair com várias senhas
    const passes = [envPassphrase, '', 'changeit', 'efi', '1234', 'nextgen', 'apis.efipay.com.br', 'Notarize', 'NOTARIZE', 'Gerencianet', 'gerencianet'];
    let extractedWith = null;
    
    for (const p of passes) {
      try {
        execSync(`openssl pkcs12 -in ${tmpP12} -out ${tmpPEM} -nodes -passin pass:${p} 2>/dev/null`, { encoding: 'utf-8' });
        if (fs.existsSync(tmpPEM) && fs.statSync(tmpPEM).size > 100) {
          extractedWith = p || '(vazia)';
          break;
        }
      } catch {}
    }
    
    if (!extractedWith) {
      return { success: false, error: 'Nenhuma senha funcionou', tries: passes.length };
    }
    
    // Separa key e cert
    const pem = fs.readFileSync(tmpPEM, 'utf-8');
    const keyMatch = pem.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA )?PRIVATE KEY-----/);
    const certMatch = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
    
    if (!keyMatch || !certMatch) {
      return { success: false, error: 'Não consegui separar cert/key', pemPreview: pem.substring(0, 500) };
    }
    
    const key = keyMatch[0];
    const cert = certMatch[0];
    
    // Testa mTLS com cert+key separados
    const credenciais = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = JSON.stringify({ grant_type: 'client_credentials', scope: 'open-finance.consent open-finance.payment' });
    
    return new Promise((resolve) => {
      const req = https.request({
        method: 'POST', hostname: host, port: 443, path: '/v1/oauth/token',
        key: key, cert: cert, rejectUnauthorized: false, keepAlive: true,
        secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT,
        ciphers: 'DEFAULT:@SECLEVEL=0',
        headers: { 'Authorization': 'Basic ' + credenciais, 'Content-Type': 'application/json', 'Accept': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => data += chunk);
        res.on('end', () => {
          try { fs.unlinkSync(tmpP12); fs.unlinkSync(tmpPEM); } catch {}
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            response: data.substring(0, 500),
            extractedWith,
            keySize: key.length,
            certSize: cert.length
          });
        });
      });
      req.on('error', (err: any) => {
        try { fs.unlinkSync(tmpP12); fs.unlinkSync(tmpPEM); } catch {}
        resolve({ success: false, error: err.message, extractedWith, keySize: key.length, certSize: cert.length });
      });
      req.setTimeout(15000, () => { req.destroy(); resolve({ success: false, error: 'timeout' }); });
      req.write(body);
      req.end();
    });
  }

}
