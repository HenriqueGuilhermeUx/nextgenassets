// ============================================
//  NextGen Assets API — Bootstrap
// ============================================

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // CORS — lê das env vars
  // Aceita lista separada por virgula OU '*' pra liberar todos
  const corsOriginsRaw = process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3002,http://localhost:3003,http://localhost:3004';
  const corsOrigins = corsOriginsRaw === '*'
    ? true
    : corsOriginsRaw.split(',').map(s => s.trim()).filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-NGA-Signature', 'X-API-Key', 'Accept'],
  });

  // Validation global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  }));

  // Health check SEM prefixo (pra Render detectar)
  app.getHttpAdapter().get('/health', (req: any, res: any) => {
    res.json({
      status: 'ok',
      service: 'nextgen-assets-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    });
  });

  // Prefixo global pra API
  app.setGlobalPrefix('v1', {
    exclude: ['health', 'health/ready', 'health/live'],
  });

  // Swagger (apenas em dev)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
      const config = new DocumentBuilder()
        .setTitle('NextGen Assets API')
        .setDescription('API da plataforma de IA Agêntica + Open Finance')
        .setVersion('1.0.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document);
      logger.log(`📚 Swagger: /api/docs`);
    } catch (e) {
      logger.warn('Swagger não disponível');
    }
  }

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 NextGen Assets API rodando em http://0.0.0.0:${port}`);
  logger.log(`💚 Health check: /health`);
  logger.log(`📡 CORS liberado para: ${corsOrigins === true ? '* (todos)' : corsOrigins.join(', ')}`);
  logger.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((err) => {
  console.error('❌ Falha ao iniciar API:', err);
  process.exit(1);
});


// Build: 8fb4553
