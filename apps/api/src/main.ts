// ============================================
//  ORKEST API — Bootstrap
// ============================================

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('v1');

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 Orkest API rodando em http://localhost:${port}`);
  logger.log(`📊 Health check: http://localhost:${port}/v1/health`);
  logger.log(`📚 Endpoints: /v1/partners, /v1/users, /v1/triggers, /v1/executions, /v1/reports`);
}

bootstrap();
