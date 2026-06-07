// Triggers controller — endpoints pra criar, listar, pausar, testar gatilhos
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { TriggerEngine } from './trigger-engine';

const prisma = new PrismaClient();

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

  // Cria gatilho a partir de parâmetros estruturados
  @Post()
  async create(@Body() body: { partnerId: string; userId: string; code: string; name?: string; params: any; safetyLimits?: any }) {
    return prisma.trigger.create({
      data: {
        partnerId: body.partnerId,
        userId: body.userId,
        code: body.code,
        name: body.name || body.code,
        params: body.params,
        status: 'ACTIVE',
        nextEvaluationAt: new Date()
      }
    });
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
}
