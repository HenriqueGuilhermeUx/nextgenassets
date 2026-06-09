// ============================================
//  CONSENTS CONTROLLER — Open Finance consent flow
//  Compliance BACEN: limites claros de movimentação
// ============================================

import { Controller, Get, Post, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

interface ConsentRequest {
  userId: string;
  partnerId: string;
  provider: string;
  scopes?: string[];
  // Compliance BACEN
  maxPerTransactionBrl?: number;
  maxPerDayBrl?: number;
  maxPerMonthBrl?: number;
  expiresAt?: Date;
}

@Controller('consents')
export class ConsentsController {
  private readonly logger = new Logger(ConsentsController.name);

  constructor(private config: ConfigService) {}

  // ============================================
  //  INICIA CONSENT (com limites claros)
  // ============================================
  @Post()
  async initiate(@Body() body: ConsentRequest) {
    const consentId = randomUUID();
    const scopes = body.scopes || ['accounts.read', 'transactions.read', 'pix.send'];

    // Defaults regulatórios (BACEN exige limites)
    const limits = {
      maxPerTransactionBrl: body.maxPerTransactionBrl || 1000.00,  // R$ 1k por transação
      maxPerDayBrl: body.maxPerDayBrl || 3000.00,                  // R$ 3k por dia
      maxPerMonthBrl: body.maxPerMonthBrl || 15000.00,              // R$ 15k por mês
      expiresAt: body.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 ano
    };

    // Validação regulatória
    if (limits.maxPerTransactionBrl > 50000) {
      return { error: 'Limite máximo por transação: R$ 50.000 (regulamento BACEN)' };
    }

    // Gera URL de autorização do provider
    let authorizationUrl: string;
    if (body.provider === 'efi') {
      const baseUrl = this.config.get('EFI_SANDBOX') === 'true' || this.config.get('EFI_SANDBOX') === true
        ? 'https://sandbox.efipay.com.br'
        : 'https://api.efipay.com.br';
      const params = new URLSearchParams({
        client_id: this.config.get('EFI_CLIENT_ID') || '',
        scope: scopes.join(' '),
        state: consentId,
        redirect_uri: `https://api.nextgenassets.com.br/v1/consents/callback`,
        // Parâmetros regulatórios Efí
        'consentimento.maxTransacao': limits.maxPerTransactionBrl.toFixed(2),
        'consentimento.maxDia': limits.maxPerDayBrl.toFixed(2)
      });
      authorizationUrl = `${baseUrl}/oauth/authorize?${params.toString()}`;
    } else {
      authorizationUrl = `https://example.com/oauth?state=${consentId}`;
    }

    // Salva consent pendente com limites
    await prisma.consent.create({
      data: {
        id: consentId,
        userId: body.userId,
        partnerId: body.partnerId,
        provider: body.provider,
        scopes,
        status: 'PENDING',
        accounts: limits as any // armazena os limites no campo JSONB
      }
    });

    this.logger.log(`🔐 Consent iniciado: ${consentId} (limites: R$${limits.maxPerTransactionBrl}/trans, R$${limits.maxPerDayBrl}/dia)`);

    return {
      consentId,
      authorizationUrl,
      provider: body.provider,
      scopes,
      limits,  // retorna os limites pra UI mostrar pro cliente
      status: 'PENDING',
      message: 'Redirecione o usuário para authorizationUrl',
      // Explicação regulatória
      regulatoryNotice: {
        authority: 'Banco Central do Brasil',
        type: 'Iniciação de Pagamento',
        duration: 'longa duração (até 1 ano)',
        revocable: 'sim, a qualquer momento',
        limits: `R$ ${limits.maxPerTransactionBrl}/transação · R$ ${limits.maxPerDayBrl}/dia · R$ ${limits.maxPerMonthBrl}/mês`
      }
    };
  }

  // ============================================
  //  CALLBACK — recebe o code do banco
  // ============================================
  @Get('callback')
  async callback(@Query() q: { code?: string; state?: string; error?: string }) {
    if (q.error) {
      this.logger.warn(`Consent error: ${q.error}`);
      return { success: false, error: q.error };
    }
    if (!q.code || !q.state) {
      return { success: false, error: 'code e state obrigatórios' };
    }

    const consent = await prisma.consent.findUnique({ where: { id: q.state } });
    if (!consent) {
      return { success: false, error: 'Consent não encontrado' };
    }

    let tokens: any = {};
    try {
      if (consent.provider === 'efi') {
        // Troca code por access_token (Efí OAuth2)
        // Em produção: POST /v1/oauth/token com client_id, client_secret, code
        tokens = {
          accessToken: 'efi_at_' + Date.now(),
          refreshToken: 'efi_rt_' + Date.now(),
          expiresIn: 3600
        };
      } else {
        tokens = { accessToken: 'at_' + Date.now(), refreshToken: 'rt_' + Date.now(), expiresIn: 3600 };
      }
    } catch (err: any) {
      this.logger.error(`Token exchange failed: ${err.message}`);
      await prisma.consent.update({ where: { id: consent.id }, data: { status: 'FAILED' } });
      return { success: false, error: 'Falha ao trocar code por token' };
    }

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

  @Delete(':id')
  async revoke(@Param('id') id: string) {
    await prisma.consent.update({
      where: { id },
      data: { status: 'REVOKED', revokedAt: new Date() }
    });
    return { revoked: true };
  }

  async getAccountBalance(userId: string, provider: string = 'efi'): Promise<number> {
    const consent = await prisma.consent.findUnique({
      where: { userId_provider: { userId, provider } }
    });
    if (!consent || consent.status !== 'ACTIVE') return 0;
    const accounts = (consent.accounts as any[]) || [];
    return accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  }
}
