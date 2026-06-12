// ============================================
//  BILLING CONTROLLER
// ============================================
import { Controller, Get, Post, Body, Headers, BadRequestException, NotFoundException } from '@nestjs/common';
import { BillingService, PLAN_LIMITS } from './billing.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('v1/billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  /**
   * GET /v1/billing/me
   * Retorna info do plano do user autenticado
   */
  @Get('me')
  async getMyPlan(@Headers('x-user-id') userId: string) {
    if (!userId) throw new BadRequestException('Header x-user-id obrigatorio');
    const info = await this.billing.getPlanInfo(userId);
    if (!info) throw new NotFoundException('User nao encontrado');
    return { success: true, ...info };
  }

  /**
   * POST /v1/billing/check-limit
   * Body: { action: 'create_trigger' | 'receive_pix' }
   * Verifica se o user pode executar a ação (chamado antes de criar trigger)
   */
  @Post('check-limit')
  async checkLimit(@Headers('x-user-id') userId: string, @Body() body: { action: string }) {
    if (!userId) throw new BadRequestException('Header x-user-id obrigatorio');
    if (!body.action || !['create_trigger', 'receive_pix'].includes(body.action)) {
      throw new BadRequestException('action deve ser create_trigger ou receive_pix');
    }
    const result = await this.billing.checkLimit(userId, body.action as any);
    return { success: true, ...result };
  }

  /**
   * POST /v1/billing/activate-premium
   * Body: { userId, paymentTxid }
   * Ativa premium (chamado pelo webhook Efi ou manualmente)
   */
  @Post('activate-premium')
  async activatePremium(@Body() body: { userId: string; paymentTxid?: string; durationDays?: number }) {
    if (!body.userId) throw new BadRequestException('userId obrigatorio');
    const user = await prisma.consumerUser.update({
      where: { id: body.userId },
      data: {
        plan: 'PREMIUM',
        planStartedAt: new Date(),
        planExpiresAt: new Date(Date.now() + (body.durationDays || 30) * 24 * 60 * 60 * 1000),
        billingPeriodStart: new Date()
      }
    });
    return {
      success: true,
      message: 'Premium ativado!',
      user: {
        id: user.id,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt
      },
      paymentTxid: body.paymentTxid
    };
  }

  /**
   * GET /v1/billing/plans
   * Lista planos disponiveis (publico)
   */
  @Get('plans')
  async listPlans() {
    return {
      success: true,
      plans: [
        {
          code: 'FREE',
          name: 'Free',
          priceBrl: 0,
          features: [
            'Ate 3 gatilhos',
            'Ate 3 PIX recebidos por mes',
            'Suporte por email',
            'Marketplace basico'
          ],
          limits: PLAN_LIMITS.FREE
        },
        {
          code: 'PREMIUM',
          name: 'Premium',
          priceBrl: 19.90,
          features: [
            'Gatilhos ilimitados',
            'PIX recebidos ilimitados',
            'AI insights mensais',
            'Suporte prioritario',
            'Marketplace avancado',
            'Round-up consolidado',
            'Volatility Hunter (sniper)'
          ],
          limits: PLAN_LIMITS.PREMIUM,
          popular: true
        }
      ]
    };
  }

  /**
   * POST /v1/billing/cancel
   * Cancela premium
   */
  @Post('cancel')
  async cancel(@Headers('x-user-id') userId: string) {
    if (!userId) throw new BadRequestException('Header x-user-id obrigatorio');
    const user = await this.billing.cancelPremium(userId);
    return { success: true, message: 'Premium cancelado', plan: user.plan };
  }
}
