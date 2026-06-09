// ============================================
//  CONSENTS CONTROLLER — Open Finance consent flow
// ============================================
// Fluxo:
// 1. POST /v1/consents — inicia consent (gera URL de redirecionamento)
// 2. Usuário autoriza no banco
// 3. Banco redireciona pra /v1/consents/callback?code=xxx
// 4. Troca code por access_token + refresh_token
// 5. Salva no DB criptografado
// 6. GET /v1/consents/me — vê status
// 7. DELETE /v1/consents/:id — revoga

import { Controller, Get, Post, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

@Controller('consents')
export class ConsentsController {
  private readonly logger = new Logger(ConsentsController.name);

  constructor(private config: ConfigService) {}

  // Inicia consentimento Open Finance
  @Post()
  async initiate(@Body() body: {
    userId: string;
    partnerId: string;
    provider: string; // 'efi' | 'plugbank' | 'belvo' | 'tmp'
    scopes?: string[];
  }) {
    const consentId = randomUUID();
    const scopes = body.scopes || [
      'accounts.read',
      'transactions.read',
      'pix.send'
    ];

    // Gera URL de autorização do provider
    let authorizationUrl: string;

    if (body.provider === 'efi') {
      // Efí usa um endpoint /v1/authorization com mTLS pra criar consent
      // Aqui simulamos a URL de redirecionamento pro usuário
      authorizationUrl = `https://api.efipay.com.br/oauth/authorize?client_id=${this.config.get('EFI_CLIENT_ID')}&scope=${scopes.join('+')}&state=${consentId}`;
    } else if (body.provider === 'plugbank') {
      authorizationUrl = `https://api.plugbank.com.br/v1/consents/authorize?state=${consentId}`;
    } else {
      authorizationUrl = `https://example.com/oauth?state=${consentId}`;
    }

    // Salva consent pendente
    await prisma.consent.create({
      data: {
        id: consentId,
        userId: body.userId,
        partnerId: body.partnerId,
        provider: body.provider,
        scopes,
        status: 'PENDING',
        accounts: undefined
      }
    });

    return {
      consentId,
      authorizationUrl,
      provider: body.provider,
      scopes,
      status: 'PENDING',
      message: 'Redirecione o usuário para authorizationUrl'
    };
  }

  // Callback após usuário autorizar
  @Get('callback')
  async callback(@Query() q: { code?: string; state?: string; error?: string }) {
    if (q.error) {
      this.logger.warn(`Consent error: ${q.error}`);
      return { success: false, error: q.error };
    }

    if (!q.code || !q.state) {
      return { success: false, error: 'code e state obrigatórios' };
    }

    // Troca code por tokens
    const consent = await prisma.consent.findUnique({ where: { id: q.state } });
    if (!consent) {
      return { success: false, error: 'Consent não encontrado' };
    }

    let tokens: any = {};
    try {
      if (consent.provider === 'efi') {
        // Em produção: chamar /v1/authorization com mTLS + code pra pegar token
        // Por agora simulamos
        tokens = {
          accessToken: 'efi_at_' + Date.now(),
          refreshToken: 'efi_rt_' + Date.now(),
          expiresIn: 3600
        };
      } else {
        tokens = {
          accessToken: 'at_' + Date.now(),
          refreshToken: 'rt_' + Date.now(),
          expiresIn: 3600
        };
      }
    } catch (err: any) {
      this.logger.error(`Token exchange failed: ${err.message}`);
      await prisma.consent.update({
        where: { id: consent.id },
        data: { status: 'FAILED' }
      });
      return { success: false, error: 'Falha ao trocar code por token' };
    }

    // Atualiza consent com tokens (em prod, criptografar)
    await prisma.consent.update({
      where: { id: consent.id },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        status: 'ACTIVE',
        accounts: [
          { accountId: 'acc-' + Date.now(), type: 'CHECKING', balance: 0 }
        ]
      }
    });

    return {
      success: true,
      consentId: consent.id,
      status: 'ACTIVE',
      message: 'Open Finance autorizado com sucesso'
    };
  }

  // Status do consent do usuário
  @Get('me')
  async myConsents(@Query('userId') userId: string) {
    return prisma.consent.findMany({
      where: { userId },
      select: {
        id: true, provider: true, status: true, scopes: true,
        accounts: true, expiresAt: true, createdAt: true
      }
    });
  }

  // Revoga consent
  @Delete(':id')
  async revoke(@Param('id') id: string) {
    await prisma.consent.update({
      where: { id },
      data: { status: 'REVOKED', revokedAt: new Date() }
    });
    return { revoked: true };
  }

  // Helper: lê saldo (usado pelo trigger-engine)
  async getAccountBalance(userId: string, provider: string = 'efi'): Promise<number> {
    const consent = await prisma.consent.findUnique({
      where: { userId_provider: { userId, provider } }
    });
    if (!consent || consent.status !== 'ACTIVE') return 0;
    const accounts = (consent.accounts as any[]) || [];
    return accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  }
}
