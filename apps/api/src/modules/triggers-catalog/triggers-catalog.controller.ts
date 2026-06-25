// ============================================
//  TRIGGERS CATALOG CONTROLLER
//  GET /v1/triggers/catalog - Lista todos
//  POST /v1/triggers/create - Cria novo
//  POST /v1/triggers/evaluate/:id - Avalia
//  POST /v1/triggers/execute/:id - Executa
// ============================================

import { Controller, Get, Post, Body, Param, Logger, BadRequestException } from '@nestjs/common';
import { TriggersCatalogService } from './triggers-catalog.service';
import { PrismaClient } from '@prisma/client';

const logger = new Logger('TriggersCatalogCtrl');
const prisma = new PrismaClient();

@Controller('v1/triggers')
export class TriggersCatalogController {
  constructor(private readonly catalog: TriggersCatalogService) {}

  /**
   * GET /v1/triggers/catalog
   * Lista todos os 45 gatilhos disponíveis
   */
  @Get('catalog')
  listCatalog() {
    return this.catalog.getCatalog();
  }

  /**
   * POST /v1/triggers/create
   * Cria novo gatilho (qualquer um dos 45 tipos)
   */
  @Post('create')
  async create(@Body() body: any) {
    const { code, params, name, userId, partnerId } = body;
    
    if (!code || !params || !userId || !partnerId) {
      throw new BadRequestException('code, params, userId, partnerId são obrigatórios');
    }

    // Valida que code existe no catálogo
    const catalog = this.catalog.getCatalog();
    const allCodes = Object.values(catalog.categories).flat().map((t: any) => t.code);
    if (!allCodes.includes(code)) {
      throw new BadRequestException(`Código ${code} inválido. Válidos: ${allCodes.slice(0, 10).join(', ')}...`);
    }

    const trigger = await prisma.trigger.create({
      data: {
        code,
        name: name || code,
        userId,
        partnerId,
        params,
        status: 'ACTIVE' as any,
        nextEvaluationAt: new Date()
      } as any
    });

    logger.log(`✅ Trigger criado: ${trigger.id} (${code})`);
    
    return {
      success: true,
      trigger
    };
  }

  /**
   * POST /v1/triggers/evaluate/:id
   * Avalia um gatilho
   */
  @Post('evaluate/:id')
  async evaluate(@Param('id') id: string) {
    const trigger = await prisma.trigger.findUnique({ where: { id } });
    if (!trigger) throw new BadRequestException(`Trigger ${id} não encontrado`);
    
    const result = await this.catalog.evaluateTrigger(trigger);
    
    return {
      success: true,
      triggerId: id,
      code: trigger.code,
      ...result
    };
  }

  /**
   * POST /v1/triggers/execute/:id
   * Avalia E executa (se shouldFire=true)
   */
  @Post('execute/:id')
  async execute(@Param('id') id: string) {
    const trigger = await prisma.trigger.findUnique({ where: { id } });
    if (!trigger) throw new BadRequestException(`Trigger ${id} não encontrado`);
    
    const evalResult = await this.catalog.evaluateTrigger(trigger);
    
    if (!evalResult.shouldFire) {
      return {
        success: true,
        executed: false,
        reason: evalResult.reason
      };
    }
    
    const execResult = await this.catalog.executeTriggerAction(trigger, evalResult);
    
    // Atualiza trigger
    await prisma.trigger.update({
      where: { id },
      data: {
        lastEvaluatedAt: new Date(),
        lastExecutedAt: new Date(),
        executionCount: { increment: 1 },
        lastDataId: (evalResult.data as any)?.pixId || null,
        lastTotal: (evalResult.data as any)?.total || null
      } as any
    });
    
    // Loga
    await prisma.auditLog.create({
      data: {
        action: 'TRIGGER_EXECUTED',
        resource: 'trigger',
        resourceId: id,
        actor: 'trigger',
        metadata: { code: trigger.code, reason: evalResult.reason, ...execResult } as any
      } as any
    });
    
    return {
      success: true,
      executed: true,
      reason: evalResult.reason,
      ...execResult
    };
  }

  /**
   * POST /v1/triggers/from-natural-language
   * Cria gatilho a partir de linguagem natural
   */
  @Post('from-natural-language')
  async fromNL(@Body() body: any) {
    const { userInput, userId, partnerId } = body;
    
    // Detecção simples (em produção, usaria OpenAI)
    const input = userInput.toLowerCase();
    let code: string | null = null;
    let params: any = {};
    
    // PIX recebido
    if (/pix|recebeu|pagou/.test(input) && /cliente|usuário|user/.test(input)) {
      code = 'GATILHO_PIX_RECEBIDO';
      const cpfMatch = input.match(/\d{11}/);
      params = { senderTaxId: cpfMatch?.[0] };
    }
    // Subscription vencendo
    else if (/subscription|assinatura/.test(input) && /vence|vencendo|venc/.test(input)) {
      code = 'GATILHO_SUBSCRIPTION_VENCENDO';
      const diasMatch = input.match(/(\d+)\s*dias?/);
      params = { daysBefore: diasMatch ? parseInt(diasMatch[1]) : 3 };
    }
    // Meta vendas
    else if (/meta|vendas?/.test(input) && /\d+k|mil/.test(input)) {
      code = 'GATILHO_META_VENDAS';
      const valorMatch = input.match(/r?\$?\s*(\d+)/);
      params = { 
        metaMensalCents: valorMatch ? parseInt(valorMatch[1]) * 100 : 1000000,
        bonusCents: 50000
      };
    }
    // Cliente inativo
    else if (/cliente|usuário/.test(input) && /inativo|sumiu|volta/.test(input)) {
      code = 'GATILHO_CLIENTE_INATIVO';
      const diasMatch = input.match(/(\d+)\s*dias?/);
      params = { 
        diasInativo: diasMatch ? parseInt(diasMatch[1]) : 30,
        cupomDesconto: 10
      };
    }
    // NPS
    else if (/nps|satisfação|avaliação/.test(input)) {
      code = 'GATILHO_NPS_BAIXO';
      params = { npsMinimo: 6 };
    }
    // Carrinho abandonado
    else if (/carrinho/.test(input) && /abandon/.test(input)) {
      code = 'GATILHO_CARRINHO_ABANDONADO';
      const horasMatch = input.match(/(\d+)\s*h/);
      params = { 
        horasAbandonado: horasMatch ? parseInt(horasMatch[1]) : 1,
        cupomDesconto: 10
      };
    }
    // Estoque
    else if (/estoque|stock/.test(input)) {
      code = 'GATILHO_NIVEL_ESTOQUE';
      const minMatch = input.match(/(\d+)/);
      params = { minEstoque: minMatch ? parseInt(minMatch[1]) : 5 };
    }

    if (!code) {
      return {
        success: false,
        error: 'Não consegui identificar o gatilho. Exemplos válidos: ...',
        suggestions: [
          'PIX recebido do cliente 34198276870',
          'Subscription vencendo em 3 dias',
          'Meta de vendas R$ 10k',
          'Cliente inativo há 30 dias',
          'NPS baixo',
          'Carrinho abandonado há 1h',
          'Estoque abaixo de 5'
        ]
      };
    }

    const trigger = await prisma.trigger.create({
      data: {
        code,
        name: userInput,
        userId,
        partnerId,
        params,
        status: 'ACTIVE' as any,
        nextEvaluationAt: new Date()
      } as any
    });

    return {
      success: true,
      detectedCode: code,
      detectedParams: params,
      trigger
    };
  }

  /**
   * GET /v1/triggers/by-user/:userId
   * Lista gatilhos de um user
   */
  @Get('by-user/:userId')
  async byUser(@Param('userId') userId: string) {
    return prisma.trigger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }
}
