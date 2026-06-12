// ============================================
//  BILLING SERVICE — Plano B2C FREE + PREMIUM
// ============================================
//
// FREE: até 3 triggers no total OU 3 PIX recebidos no mês
// PREMIUM: R$ 19,90/mês (ilimitado)
//
// Fluxo de upgrade (manual por enquanto, Stripe depois):
// 1. User free atinge limite (3 triggers OU 3 PIX no mês)
// 2. POST /v1/billing/checkout cria um PIX de R$ 19,90 (via Efi)
// 3. User paga
// 4. Webhook Efi → service atualiza plan=PREMIUM
// 5. User agora tem acesso ilimitado até planExpiresAt
//
// IMPORTANTE: como ainda não temos PIX OUT funcional,
// a ativação do PREMIUM por enquanto é MANUAL via endpoint admin.
// Quando resolver o PIX OUT Efi, o webhook ativa sozinho.
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const PLAN_LIMITS = {
  FREE: {
    maxTriggers: 3,
    maxPixPerMonth: 3,
    priceBrl: 0,
    label: 'Free'
  },
  PREMIUM: {
    maxTriggers: Infinity,
    maxPixPerMonth: Infinity,
    priceBrl: 19.90,
    label: 'Premium'
  }
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  /**
   * Verifica se o user pode executar uma ação (criar trigger / receber PIX).
   * Retorna { allowed, reason, currentUsage, limit }
   */
  async checkLimit(userId: string, action: 'create_trigger' | 'receive_pix'): Promise<{
    allowed: boolean;
    reason?: string;
    plan: string;
    currentUsage: number;
    limit: number;
    upgradeUrl?: string;
  }> {
    const user = await prisma.consumerUser.findUnique({ where: { id: userId } });
    if (!user) {
      return { allowed: false, reason: 'User nao encontrado', plan: 'UNKNOWN', currentUsage: 0, limit: 0 };
    }

    // Premium = sempre permitido (até expirar)
    if (user.plan === 'PREMIUM' && (!user.planExpiresAt || user.planExpiresAt > new Date())) {
      return { allowed: true, plan: 'PREMIUM', currentUsage: 0, limit: Infinity };
    }

    // Expirado → FREE
    if (user.plan === 'EXPIRED' || (user.plan === 'PREMIUM' && user.planExpiresAt && user.planExpiresAt < new Date())) {
      await prisma.consumerUser.update({
        where: { id: userId },
        data: { plan: 'FREE' }
      });
      user.plan = 'FREE';
    }

    // Free = verificar limite
    const freeLimits = PLAN_LIMITS.FREE;
    let currentUsage = 0;
    let limit = 0;
    let limitType = '';

    if (action === 'create_trigger') {
      currentUsage = user.triggerCount;
      limit = freeLimits.maxTriggers;
      limitType = 'triggers';
    } else if (action === 'receive_pix') {
      // Reset mensal se necessário
      const now = new Date();
      const periodStart = user.billingPeriodStart || user.createdAt;
      const daysSincePeriodStart = (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePeriodStart > 30) {
        // Reset
        await prisma.consumerUser.update({
          where: { id: userId },
          data: { pixReceivedCount: 0, billingPeriodStart: now }
        });
        currentUsage = 0;
      } else {
        currentUsage = user.pixReceivedCount;
      }
      limit = freeLimits.maxPixPerMonth;
      limitType = 'PIX no mês';
    }

    if (currentUsage >= limit) {
      return {
        allowed: false,
        reason: `Limite do plano FREE atingido: ${currentUsage}/${limit} ${limitType}`,
        plan: 'FREE',
        currentUsage,
        limit,
        upgradeUrl: '/billing/upgrade'
      };
    }

    return { allowed: true, plan: 'FREE', currentUsage, limit };
  }

  /**
   * Incrementa o contador após uma ação ser completada com sucesso.
   */
  async recordUsage(userId: string, action: 'trigger_created' | 'pix_received'): Promise<void> {
    if (action === 'trigger_created') {
      await prisma.consumerUser.update({
        where: { id: userId },
        data: { triggerCount: { increment: 1 } }
      });
    } else if (action === 'pix_received') {
      await prisma.consumerUser.update({
        where: { id: userId },
        data: { pixReceivedCount: { increment: 1 } }
      });
    }
  }

  /**
   * Ativa PREMIUM (chamado pelo webhook Efi ou manualmente pelo admin)
   */
  async activatePremium(userId: string, durationDays: number = 30): Promise<any> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    return prisma.consumerUser.update({
      where: { id: userId },
      data: {
        plan: 'PREMIUM',
        planStartedAt: now,
        planExpiresAt: expiresAt,
        billingPeriodStart: now
      }
    });
  }

  /**
   * Cancela premium
   */
  async cancelPremium(userId: string): Promise<any> {
    return prisma.consumerUser.update({
      where: { id: userId },
      data: { plan: 'CANCELLED', planExpiresAt: new Date() }
    });
  }

  /**
   * Retorna info do plano do user
   */
  async getPlanInfo(userId: string): Promise<any> {
    const user = await prisma.consumerUser.findUnique({ where: { id: userId } });
    if (!user) return null;

    const isPremium = user.plan === 'PREMIUM' && user.planExpiresAt && user.planExpiresAt > new Date();
    const plan = isPremium ? 'PREMIUM' : (user.plan === 'CANCELLED' || user.plan === 'EXPIRED' ? 'FREE' : user.plan);

    return {
      plan,
      isPremium,
      priceBrl: isPremium ? PLAN_LIMITS.PREMIUM.priceBrl : 0,
      planStartedAt: user.planStartedAt,
      planExpiresAt: user.planExpiresAt,
      daysUntilExpiry: user.planExpiresAt ? Math.max(0, Math.ceil((user.planExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null,
      usage: {
        triggers: {
          current: user.triggerCount,
          limit: isPremium ? 'Ilimitado' : PLAN_LIMITS.FREE.maxTriggers
        },
        pixThisMonth: {
          current: user.pixReceivedCount,
          limit: isPremium ? 'Ilimitado' : PLAN_LIMITS.FREE.maxPixPerMonth,
          resetAt: new Date((user.billingPeriodStart?.getTime() || Date.now()) + 30 * 24 * 60 * 60 * 1000)
        }
      },
      upgradeUrl: isPremium ? null : '/billing/upgrade',
      upgradePriceBrl: PLAN_LIMITS.PREMIUM.priceBrl
    };
  }
}
