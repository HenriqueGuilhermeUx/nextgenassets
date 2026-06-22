// ============================================
//  NEXTGEN INTEGRATION SERVICE
//  Integração com smart-bot-staff (ou qualquer outro app)
//  Endpoint universal: /v1/integration/:action
// ============================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import * as https from 'https';

const logger = new Logger('NextGenIntegration');
const prisma = new PrismaClient();

interface IntegrationRequest {
  appId: string;          // 'smart-bot-staff' ou outro
  appSecret: string;      // secret compartilhado
  action: string;         // 'create_charge' | 'get_balance' | 'create_subscription' | 'connect_bank' | etc
  userId?: string;        // ID do user no app externo
  payload: any;           // dados específicos da ação
  webhookUrl?: string;    // URL pra receber callback
}

@Injectable()
export class NextGenIntegrationService {
  constructor(private cfg: ConfigService) {}

  /**
   * Processa requisição de integração de qualquer app
   * Roteia internamente para o serviço apropriado
   */
  async process(req: IntegrationRequest): Promise<any> {
    // 1. Validar autenticação do app
    await this.validateApp(req.appId, req.appSecret);

    // 2. Logar request
    await prisma.auditLog.create({
      data: {
        action: `INTEGRATION_${req.action.toUpperCase()}`,
        resource: 'integration',
        resourceId: `${req.appId}:${req.userId || 'anonymous'}`,
        actor: `app:${req.appId}`,
        metadata: req.payload as any
      } as any
    });

    // 3. Rotear para action
    switch (req.action) {
      case 'create_charge':
        return this.createCharge(req);

      case 'create_subscription':
        return this.createSubscription(req);

      case 'get_balance':
        return this.getBalance(req);

      case 'connect_bank':
        return this.connectBank(req);

      case 'list_charges':
        return this.listCharges(req);

      case 'cancel_subscription':
        return this.cancelSubscription(req);

      case 'get_user_info':
        return this.getUserInfo(req);

      case 'check_limit':
        return this.checkLimit(req);

      default:
        throw new BadRequestException(`Ação desconhecida: ${req.action}`);
    }
  }

  // ============== ACTIONS ==============

  private async createCharge(req: IntegrationRequest) {
    const { value, splits, customer, comment, correlationID } = req.payload;

    if (!value || value < 100) {
      throw new BadRequestException('value mínimo R$ 1,00 (100 centavos)');
    }

    // Calcula split se não informado
    let actualSplits = splits;
    if (!actualSplits || actualSplits.length === 0) {
      const split = this.calculateSplit(value);
      actualSplits = [
        { pixKey: process.env.NEXTGEN_DEFAULT_PIX_KEY, value: split.nextgenCents, splitType: 'SPLIT_SUB_ACCOUNT' },
        { pixKey: req.payload.sellerPixKey, value: split.partnerCents, splitType: 'SPLIT_SUB_ACCOUNT' }
      ];
    }

    // Chama Woovi
    const wooviRes = await this.callWoovi('/api/v1/charge', {
      value,
      correlationID: correlationID || `${req.appId}-${Date.now()}`,
      comment: comment || `Cobrança via ${req.appId}`,
      customer,
      splits: actualSplits
    });

    return {
      success: true,
      charge: {
        identifier: wooviRes.charge.identifier,
        brCode: wooviRes.charge.brCode,
        paymentLinkUrl: wooviRes.charge.paymentLinkUrl,
        qrCodeImage: wooviRes.charge.qrCodeImage,
        value: wooviRes.charge.value,
        status: wooviRes.charge.status,
        splits: actualSplits
      }
    };
  }

  private async createSubscription(req: IntegrationRequest) {
    const { taxID, value, dayGenerateCharge, description } = req.payload;

    if (!taxID || !value || !dayGenerateCharge) {
      throw new BadRequestException('taxID, value, dayGenerateCharge são obrigatórios');
    }

    const wooviRes = await this.callWoovi('/api/v1/subscriptions', {
      taxID: taxID.replace(/\D/g, ''),
      value,
      dayGenerateCharge,
      metadata: {
        appId: req.appId,
        userId: req.userId,
        description
      }
    });

    return {
      success: true,
      subscription: wooviRes.subscription
    };
  }

  private async getBalance(req: IntegrationRequest) {
    // Lê saldo via Open Finance
    const { cpf } = req.payload;
    if (!cpf) throw new BadRequestException('cpf obrigatório');

    // Tenta Klavi primeiro (mais barato)
    const klaviStatus = await this.callKlavi(`/data/v1/accounts?taxId=${cpf.replace(/\D/g, '')}`);
    if (klaviStatus?.accounts) {
      return {
        success: true,
        provider: 'klavi',
        accounts: klaviStatus.accounts
      };
    }

    // Fallback Pluggy
    const pluggyRes = await this.callPluggy(`/accounts?userId=${req.userId}`);
    return {
      success: true,
      provider: 'pluggy',
      accounts: pluggyRes.results || []
    };
  }

  private async connectBank(req: IntegrationRequest) {
    const { cpf, userId } = req.payload;

    // Cria link Klavi
    const klaviAuth = await this.callKlavi('/data/v1/auth', { accessKey: process.env.KLAVI_ACCESS_KEY, secretKey: process.env.KLAVI_SECRET_KEY });
    const klaviLink = await this.callKlavi('/data/v1/links', {
      personalTaxId: cpf.replace(/\D/g, ''),
      redirectUrl: req.webhookUrl || `https://${req.appId}.com/oauth/callback`
    }, klaviAuth.accessToken);

    return {
      success: true,
      provider: 'klavi',
      linkUrl: klaviLink.linkUrl,
      linkToken: klaviLink.linkToken
    };
  }

  private async listCharges(req: IntegrationRequest) {
    const { partnerId, limit = 50 } = req.payload;
    const charges = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Charge" WHERE "partnerId" = $1 ORDER BY "createdAt" DESC LIMIT $2`,
      partnerId || '',
      limit
    );
    return { success: true, count: charges.length, charges };
  }

  private async cancelSubscription(req: IntegrationRequest) {
    const { taxID } = req.payload;
    if (!taxID) throw new BadRequestException('taxID obrigatório');

    const wooviRes = await this.callWoovi(`/api/v1/subscriptions/${taxID.replace(/\D/g, '')}`, {}, 'DELETE');
    return { success: true, subscription: wooviRes };
  }

  private async getUserInfo(req: IntegrationRequest) {
    const { userId, cpf } = req.payload;
    const user = await prisma.consumerUser.findFirst({
      where: { externalUserId: userId || cpf }
    });
    if (!user) throw new BadRequestException('User não encontrado');
    return { success: true, user };
  }

  private async checkLimit(req: IntegrationRequest) {
    const { userId, action } = req.payload;
    const user = await prisma.consumerUser.findFirst({
      where: { externalUserId: userId }
    });
    if (!user) throw new BadRequestException('User não encontrado');

    // Verifica plano
    const limits: any = { FREE: 5, PREMIUM: 100, ENTERPRISE: 999999 };
    const planLimits = limits[user.plan] || 5;

    // Conta triggers do mês
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const countResult = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int as count FROM "Charge" WHERE "userId" = $1 AND "createdAt" >= $2`,
      user.id,
      startOfMonth
    );
    const count = countResult[0]?.count || 0;

    return {
      success: true,
      allowed: count < planLimits,
      used: count,
      limit: planLimits,
      plan: user.plan
    };
  }

  // ============== HELPERS ==============

  private calculateSplit(valueCents: number) {
    const nextgenCents = Math.floor(valueCents * 0.03);
    const wooviFeeCents = Math.max(Math.ceil(valueCents * 0.005), 1);
    const partnerCents = valueCents - nextgenCents - wooviFeeCents;
    return { nextgenCents, partnerCents, wooviFeeCents };
  }

  private async validateApp(appId: string, appSecret: string) {
    // Apps registrados (em produção, vir do DB)
    const allowedApps: Record<string, string> = {
      'smart-bot-staff': process.env.INTEGRATION_SMARTBOT_SECRET || 'demo-secret',
      'demo-app': 'demo-secret'
    };

    if (!allowedApps[appId] || allowedApps[appId] !== appSecret) {
      throw new BadRequestException(`App ${appId} não autorizado ou secret inválido`);
    }
  }

  private async callWoovi(path: string, body: any, method = 'POST'): Promise<any> {
    const url = `${process.env.WOOVI_API_URL}${path}`;
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = https.request({
        method,
        hostname: new URL(url).hostname,
        port: 443,
        path: new URL(url).pathname,
        headers: {
          'Authorization': process.env.WOOVI_APP_ID,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      }, (res) => {
        let d = '';
        res.on('data', (c) => d += c);
        res.on('end', () => {
          try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); }
        });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  private async callKlavi(path: string, body?: any, token?: string): Promise<any> {
    const url = `${process.env.KLAVI_API_URL}${path}`;
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : undefined;
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (data) headers['Content-Length'] = Buffer.byteLength(data);

      const req = https.request({
        method: data ? 'POST' : 'GET',
        hostname: new URL(url).hostname,
        port: 443,
        path: new URL(url).pathname,
        headers
      }, (res) => {
        let d = '';
        res.on('data', (c) => d += c);
        res.on('end', () => {
          try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); }
        });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  private async callPluggy(path: string): Promise<any> {
    // Similar ao Klavi
    return { results: [] };
  }
}
