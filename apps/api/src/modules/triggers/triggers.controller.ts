// Triggers controller — endpoints pra criar, listar, pausar, testar gatilhos
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { TriggerEngine } from './trigger-engine';

const prisma = new PrismaClient();
const FREE_LIMIT = 3;

type IncomingHeaders = Record<string, string | string[] | undefined>;

@Controller('triggers')
export class TriggersController {
  constructor(
    private aiService: AiService,
    private triggerEngine: TriggerEngine
  ) {}

  // Lista gatilhos com filtros
  @Get()
  async list(@Query() query: { partnerId?: string; userId?: string; status?: string; code?: string }) {
    return prisma.trigger.findMany({
      where: {
        partnerId: query.partnerId,
        userId: query.userId,
        status: query.status as any,
        code: query.code
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  // Busca um gatilho
  @Get(':id')
  async get(@Param('id') id: string) {
    return prisma.trigger.findUnique({
      where: { id },
      include: { executions: { take: 20, orderBy: { createdAt: 'desc' } } }
    });
  }

  /**
   * POST /v1/triggers
   *
   * Aceita 2 formatos:
   * 1) Interno/legado:
   *    { partnerId, userId, code, name, params }
   *
   * 2) Público B2B / extensão:
   *    Headers: Authorization: Bearer <token> ou X-API-Key: <key> ou X-Partner-Slug: demo-marketplace
   *    Body: { catalogCode, naturalLanguageRule, source, sourceMetadata, externalUserId? }
   */
  @Post()
  async create(@Body() body: any, @Headers() headers: IncomingHeaders) {
    const partner = await this.resolvePartner(body, headers);
    const user = await this.resolveConsumerUser(body, partner.id);
    const normalized = this.normalizeTriggerPayload(body);

    // B2C billing: checa limite FREE de 3 triggers quando o usuário é real.
    const freshUser = await prisma.consumerUser.findUnique({ where: { id: user.id } });
    if (freshUser) {
      const isPremium = freshUser.plan === 'PREMIUM' && (!freshUser.planExpiresAt || freshUser.planExpiresAt > new Date());
      if (!isPremium && freshUser.triggerCount >= FREE_LIMIT) {
        return {
          success: false,
          error: 'LIMIT_REACHED',
          message: `Limite do plano FREE atingido (${freshUser.triggerCount}/${FREE_LIMIT} triggers). Faça upgrade para Premium por R$ 19,90/mês.`,
          plan: freshUser.plan,
          currentUsage: freshUser.triggerCount,
          limit: FREE_LIMIT,
          upgradeUrl: '/billing/upgrade',
          upgradePriceBrl: 19.90
        };
      }
    }

    const trigger = await prisma.trigger.create({
      data: {
        partnerId: partner.id,
        userId: user.id,
        code: normalized.code,
        name: normalized.name,
        description: normalized.description,
        params: normalized.params,
        status: 'ACTIVE',
        nextEvaluationAt: new Date(),
        maxExecutions: normalized.maxExecutions,
        maxTotalSpendBrl: normalized.maxTotalSpendBrl
      } as any
    });

    await prisma.consumerUser.update({
      where: { id: user.id },
      data: { triggerCount: { increment: 1 } }
    });

    await prisma.auditLog.create({
      data: {
        partnerId: partner.id,
        userId: user.id,
        triggerId: trigger.id,
        actor: `partner:${partner.slug}`,
        action: 'TRIGGER_CREATED',
        resource: 'trigger',
        resourceId: trigger.id,
        metadata: {
          inputSource: body.source || 'API',
          catalogCode: body.catalogCode || body.code,
          naturalLanguageRule: body.naturalLanguageRule,
          sourceMetadata: body.sourceMetadata
        }
      } as any
    });

    return {
      success: true,
      trigger,
      partner: { id: partner.id, slug: partner.slug, name: partner.name },
      user: { id: user.id, externalUserId: user.externalUserId }
    };
  }

  /**
   * POST /v1/triggers/create
   * Alias compatível com docs antigas e TriggersCatalogController.
   */
  @Post('create')
  async createAlias(@Body() body: any, @Headers() headers: IncomingHeaders) {
    return this.create(body, headers);
  }

  // Cria gatilho a partir de LINGUAGEM NATURAL (IA)
  @Post('from-natural-language')
  async createFromNL(@Body() body: { partnerId: string; userId: string; naturalLanguage: string; context?: any }) {
    // 1. IA traduz
    const aiResult = await this.aiService.translateRule(body.naturalLanguage, body.context);

    // 2. Cria gatilho
    const trigger = await prisma.trigger.create({
      data: {
        partnerId: body.partnerId,
        userId: body.userId,
        code: aiResult.ruleType,
        name: `IA: ${body.naturalLanguage.slice(0, 50)}...`,
        params: aiResult.params,
        status: aiResult.safetyLimits?.requiresConfirmation ? 'PAUSED' : 'ACTIVE',
        pauseReason: aiResult.warnings?.join('; ') || null
      }
    });

    return { trigger, aiInterpretation: aiResult };
  }

  // Pausa/reativa gatilho
  @Put(':id/pause')
  async pause(@Param('id') id: string, @Body() body: { reason?: string }) {
    return prisma.trigger.update({
      where: { id },
      data: { status: 'PAUSED', pauseReason: body.reason, isPaused: true }
    });
  }

  @Put(':id/resume')
  async resume(@Param('id') id: string) {
    return prisma.trigger.update({
      where: { id },
      data: { status: 'ACTIVE', isPaused: false, pauseReason: null }
    });
  }

  // Testa avaliação de um gatilho (sem executar)
  @Post(':id/test-evaluation')
  async testEvaluation(@Param('id') id: string) {
    const result = await this.triggerEngine.evaluateTrigger(id);
    return { triggerId: id, ...result };
  }

  // Força execução manual (pra demo)
  @Post(':id/force-execute')
  async forceExecute(@Param('id') id: string) {
    const evaluation = await this.triggerEngine.evaluateTrigger(id);
    if (!evaluation.shouldFire) {
      return { executed: false, reason: evaluation.reason };
    }
    await this.triggerEngine.executeTrigger(id, evaluation.data);
    return { executed: true, evaluation };
  }

  // Deleta
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return prisma.trigger.update({
      where: { id },
      data: { status: 'CANCELED' }
    });
  }

  private normalizeTriggerPayload(body: any) {
    const metadata = body.sourceMetadata || {};
    const naturalLanguageRule = body.naturalLanguageRule || body.userInput || body.name || '';
    const rawCode = body.code || body.catalogCode || body.ruleType || this.inferCodeFromNaturalLanguage(naturalLanguageRule);
    const code = this.normalizeCatalogCode(rawCode);

    const params = body.params || {
      naturalLanguageRule,
      source: body.source || 'API',
      sourceMetadata: metadata,
      marketplace: metadata.marketplace,
      productUrl: metadata.url,
      productTitle: metadata.productTitle,
      productPriceBrl: metadata.productPriceBrl,
      targetPriceBrl: metadata.productPriceBrl ? Number((Number(metadata.productPriceBrl) * 0.85).toFixed(2)) : undefined,
      dropPct: 15,
      action: 'CREATE_COMMERCIAL_TRIGGER'
    };

    return {
      code,
      name: body.name || naturalLanguageRule || `${code}${metadata.productTitle ? ` - ${metadata.productTitle}` : ''}`,
      description: body.description || naturalLanguageRule || metadata.productTitle || 'Gatilho comercial criado via API NextGen',
      params,
      maxExecutions: body.maxExecutions,
      maxTotalSpendBrl: body.safetyLimits?.maxTotalSpendBrl || body.maxTotalSpendBrl
    };
  }

  private normalizeCatalogCode(code?: string) {
    const value = (code || '').trim();
    const aliases: Record<string, string> = {
      PRICE_ALERT_BUY: 'PRICE_DROP',
      BUY_DIP_PRODUCT: 'PRICE_DROP',
      BUY_DIP_STOCK: 'PRICE_DROP',
      ROUND_UP_SAVINGS: 'ROUND_UP_PIX',
      RASI_CAIXA_FUND: 'BALANCE_TRIGGER_BUY',
      GOAL_SAVINGS: 'GOAL_ACCUMULATION_BUY'
    };
    return aliases[value] || value || 'PRICE_DROP';
  }

  private inferCodeFromNaturalLanguage(input?: string) {
    const text = (input || '').toLowerCase();
    if (/carrinho/.test(text) && /abandon/.test(text)) return 'GATILHO_CARRINHO_ABANDONADO';
    if (/cliente|usuário|usuario/.test(text) && /inativo|sumiu|volta/.test(text)) return 'GATILHO_CLIENTE_INATIVO';
    if (/nps|satisfação|satisfacao|avaliação|avaliacao/.test(text)) return 'GATILHO_NPS_BAIXO';
    if (/estoque|stock/.test(text)) return 'GATILHO_NIVEL_ESTOQUE';
    if (/subscription|assinatura/.test(text) && /vence|vencendo|venc/.test(text)) return 'GATILHO_SUBSCRIPTION_VENCENDO';
    if (/pix|recebeu|pagou/.test(text)) return 'GATILHO_PIX_RECEBIDO';
    if (/preço|preco|cair|queda|desconto/.test(text)) return 'PRICE_DROP';
    return 'PRICE_DROP';
  }

  private async resolvePartner(body: any, headers: IncomingHeaders) {
    if (body.partnerId) {
      const partner = await prisma.partner.findUnique({ where: { id: body.partnerId } });
      if (partner) return partner;
    }

    const apiKey = this.readHeader(headers, 'x-api-key') || this.extractBearerToken(this.readHeader(headers, 'authorization'));
    if (apiKey) {
      const key = await prisma.apiKey.findUnique({ where: { key: apiKey }, include: { partner: true } });
      if (key && (!key.expiresAt || key.expiresAt > new Date())) {
        await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
        return key.partner;
      }
    }

    const partnerSlug = body.partnerSlug || this.readHeader(headers, 'x-partner-slug') || 'demo-marketplace';
    const partner = await prisma.partner.findUnique({ where: { slug: partnerSlug } });
    if (!partner) {
      throw new BadRequestException(`Partner não encontrado. Envie X-API-Key válido, partnerId ou X-Partner-Slug. Slug tentado: ${partnerSlug}`);
    }
    return partner;
  }

  private async resolveConsumerUser(body: any, partnerId: string) {
    if (body.userId) {
      const existing = await prisma.consumerUser.findUnique({ where: { id: body.userId } });
      if (existing) return existing;
    }

    const metadata = body.sourceMetadata || {};
    const externalUserId = String(
      body.externalUserId ||
      body.user?.externalUserId ||
      metadata.customerId ||
      metadata.userId ||
      metadata.url ||
      'browser-extension-demo-user'
    ).slice(0, 500);

    return prisma.consumerUser.upsert({
      where: { partnerId_externalUserId: { partnerId, externalUserId } },
      update: {
        email: body.user?.email,
        name: body.user?.name,
        phone: body.user?.phone
      },
      create: {
        partnerId,
        externalUserId,
        email: body.user?.email,
        name: body.user?.name || 'Cliente capturado pela NextGen',
        phone: body.user?.phone,
        notifyChannels: ['IN_APP'] as any
      } as any
    });
  }

  private readHeader(headers: IncomingHeaders, name: string): string | undefined {
    const value = headers[name] || headers[name.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value;
  }

  private extractBearerToken(authorization?: string) {
    if (!authorization) return undefined;
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim();
  }
}
