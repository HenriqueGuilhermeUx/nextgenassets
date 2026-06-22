// ============================================
//  HTTPS SERVER COM mTLS (PRODUÇÃO)
//  Recebe webhooks Efi com mTLS reverso
//  (Efi valida nosso cert, nós validamos cert da Efi)
// ============================================

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import * as https from 'https';
import * as fs from 'fs';

const logger = new Logger('HttpsMtls');

async function bootstrapHttps() {
  // Carrega certs do .env (em base64) ou filesystem
  const sslKeyBase64 = process.env.SSL_PRIVATE_KEY_BASE64;
  const sslCertBase64 = process.env.SSL_CERTIFICATE_BASE64;
  const efiChainPath = process.env.EFI_CHAIN_PATH || './src/certs/efi-chain-prod.crt';
  const port = parseInt(process.env.HTTPS_MTLS_PORT || '3443');

  // SEM certs do Render configurados -> não inicia
  if (!sslKeyBase64 || !sslCertBase64) {
    logger.warn('⚠️ SSL_PRIVATE_KEY_BASE64/SSL_CERTIFICATE_BASE64 não configurados.');
    logger.warn('   HTTPS mTLS server NÃO será iniciado. Webhooks Efi usarão HTTP normal.');
    return null;
  }

  try {
    const sslKey = Buffer.from(sslKeyBase64, 'base64');
    const sslCert = Buffer.from(sslCertBase64, 'base64');
    const efiCa = fs.readFileSync(efiChainPath);

    const credentials: https.ServerOptions = {
      key: sslKey,
      cert: sslCert,
      ca: efiCa,
      requestCert: true,    // Exige cert do cliente
      rejectUnauthorized: true  // Rejeita se cert Efi não for válido
    };

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      httpsOptions: credentials as any
    });

    await app.listen(port);
    logger.log(`🔐 HTTPS mTLS server rodando na porta ${port} (webhook Efi)`);
    return app;
  } catch (err: any) {
    logger.error(`❌ Erro ao iniciar HTTPS mTLS: ${err.message}`);
    logger.error('   Continuando apenas com HTTP normal.');
    return null;
  }
}

export { bootstrapHttps };
