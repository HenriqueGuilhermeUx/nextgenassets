import { Controller, Post, Body, Logger, Get, All, Req } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const logger = new Logger('PluggyTrace');
const prisma = new PrismaClient();

/**
 * Endpoint de captura GENÉRICO - recebe QUALQUER método
 * Salva TUDO no DB pra debug
 */
@Controller('v1')
export class PluggyTraceController {

  @All('pluggy-trace')
  async trace(@Req() req: Request, @Body() body: any) {
    const ts = new Date().toISOString();
    logger.log(`📥 [${ts}] ${req.method} /v1/pluggy-trace`);
    logger.log(`Headers: ${JSON.stringify(req.headers).substring(0, 500)}`);
    logger.log(`Body: ${JSON.stringify(body).substring(0, 500)}`);

    try {
      // Salva tudo numa tabela simples via raw SQL
      const data = JSON.stringify({ headers: req.headers, body });
      const route = req.originalUrl || req.url;
      const method = req.method;
      
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "WebhookTrace" (
          id SERIAL PRIMARY KEY,
          ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          method TEXT NOT NULL,
          route TEXT NOT NULL,
          data JSONB NOT NULL
        )`
      );
      await prisma.$executeRawUnsafe(
        `INSERT INTO "WebhookTrace" (method, route, data) VALUES ($1, $2, $3::jsonb)`,
        method, route, data
      );
      logger.log(`✅ Saved to WebhookTrace`);
    } catch (err: any) {
      logger.error(`Erro save trace: ${err.message}`);
    } finally {
      await prisma.$disconnect();
    }

    return { received: true, ts, trace: 'pluggy-trace' };
  }
}
