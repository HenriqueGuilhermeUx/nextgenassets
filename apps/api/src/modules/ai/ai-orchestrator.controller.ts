// ============================================
//  AI ORCHESTRATOR CONTROLLER
// ============================================
// Endpoints públicos do cérebro:
//   - POST /v1/ai/orchestrate     (roteia + executa + valida)
//   - POST /v1/ai/stream          (SSE streaming)
//   - GET  /v1/ai/health          (status do orquestrador)
//   - GET  /v1/ai/cost            (custos do usuário)
//   - GET  /v1/ai/history         (últimas decisões)
// ============================================

import { Controller, Post, Body, Get, Query, Res, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AiOrchestrator, OrchestratorRequest, AgentType } from './ai-orchestrator.service';

@Controller('ai')
export class AiOrchestratorController {
  private readonly logger = new Logger(AiOrchestratorController.name);

  constructor(private orchestrator: AiOrchestrator) {}

  /**
   * Processa uma requisição do cérebro
   * POST /v1/ai/orchestrate
   */
  @Post('orchestrate')
  async orchestrate(@Body() body: OrchestratorRequest) {
    return this.orchestrator.process(body);
  }

  /**
   * Streaming (Server-Sent Events)
   * POST /v1/ai/stream
   */
  @Post('stream')
  async stream(@Body() body: OrchestratorRequest, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const chunk of this.orchestrator.stream(body)) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }

  /**
   * Health check
   * GET /v1/ai/health
   */
  @Get('health')
  async health() {
    return {
      status: 'ok',
      orchestrator: 'ready',
      agents: ['router', 'translator', 'risk', 'insight', 'sniper', 'staff'],
      timestamp: new Date().toISOString()
    };
  }
}
