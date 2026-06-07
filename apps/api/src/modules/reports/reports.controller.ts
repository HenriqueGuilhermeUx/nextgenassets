// Reports controller — 3 visões: consumer, partner, internal
import { Controller, Get, Param, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('reports')
export class ReportsController {
  // Relatório do consumidor (o que ele vê no app)
  @Get('consumer/:userId')
  async consumerReport(@Param('userId') userId: string, @Query() q: { month?: string }) {
    const month = q.month || new Date().toISOString().slice(0, 7);
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const [triggers, executions, user] = await Promise.all([
      prisma.trigger.findMany({ where: { userId } }),
      prisma.execution.findMany({
        where: { userId, createdAt: { gte: startDate, lt: endDate } },
        include: { trigger: true }
      }),
      prisma.consumerUser.findUnique({ where: { id: userId } })
    ]);

    const totalSpent = executions
      .filter(e => e.status === 'COMPLETED')
      .reduce((sum, e) => sum + Number(e.amountBrl || 0), 0);

    return {
      user: { name: user?.name, bankAccount: user?.bankAccountMask },
      month,
      summary: {
        activeTriggers: triggers.filter(t => t.status === 'ACTIVE').length,
        totalTriggers: triggers.length,
        executionsThisMonth: executions.length,
        successfulExecutions: executions.filter(e => e.status === 'COMPLETED').length,
        totalSpentBrl: totalSpent
      },
      recentExecutions: executions.slice(0, 20).map(e => ({
        id: e.id,
        date: e.createdAt,
        trigger: e.trigger.name,
        code: e.trigger.code,
        status: e.status,
        amount: e.amountBrl,
        details: e.result
      })),
      activeTriggers: triggers.filter(t => t.status === 'ACTIVE').map(t => ({
        id: t.id,
        name: t.name,
        code: t.code,
        params: t.params,
        lastExecuted: t.lastExecutedAt,
        executionCount: t.executionCount
      }))
    };
  }

  // Relatório do parceiro B2B (o que a corretora/fundo/varejo vê)
  @Get('partner/:partnerId')
  async partnerReport(@Param('partnerId') partnerId: string, @Query() q: { month?: string }) {
    const month = q.month || new Date().toISOString().slice(0, 7);
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const [partner, users, triggers, executions] = await Promise.all([
      prisma.partner.findUnique({ where: { id: partnerId } }),
      prisma.consumerUser.count({ where: { partnerId } }),
      prisma.trigger.findMany({ where: { partnerId } }),
      prisma.execution.findMany({
        where: { partnerId, createdAt: { gte: startDate, lt: endDate } },
        include: { trigger: true }
      })
    ]);

    const totalBrl = executions
      .filter(e => e.status === 'COMPLETED')
      .reduce((sum, e) => sum + Number(e.amountBrl || 0), 0);

    // Top gatilhos
    const triggerStats = new Map();
    executions.forEach(e => {
      const key = e.triggerId;
      if (!triggerStats.has(key)) {
        triggerStats.set(key, { name: e.trigger.name, code: e.trigger.code, count: 0, totalBrl: 0 });
      }
      const stat = triggerStats.get(key);
      stat.count++;
      if (e.status === 'COMPLETED') stat.totalBrl += Number(e.amountBrl || 0);
    });
    const topTriggers = Array.from(triggerStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      partner: { name: partner?.name, type: partner?.type, tier: partner?.tier },
      month,
      kpis: {
        totalUsers: users,
        activeUsers: new Set(executions.map(e => e.userId)).size,
        activeTriggers: triggers.filter(t => t.status === 'ACTIVE').length,
        executionsThisMonth: executions.length,
        successfulExecutions: executions.filter(e => e.status === 'COMPLETED').length,
        successRate: executions.length > 0 ? (executions.filter(e => e.status === 'COMPLETED').length / executions.length) * 100 : 0,
        totalVolumeBrl: totalBrl,
        estimatedRevenueBrl: executions.filter(e => e.status === 'COMPLETED').length * Number(partner?.takeRateBrl || 0)
      },
      topTriggers
    };
  }

  // Relatório interno Orkest (margem, falhas, churn)
  @Get('internal/profitability')
  async internalReport(@Query() q: { month?: string }) {
    const month = q.month || new Date().toISOString().slice(0, 7);
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const [partners, executions] = await Promise.all([
      prisma.partner.findMany({ where: { status: 'ACTIVE' } }),
      prisma.execution.findMany({
        where: { createdAt: { gte: startDate, lt: endDate } },
        include: { partner: true }
      })
    ]);

    const revenueByPartner = partners.map(p => {
      const partnerExecs = executions.filter(e => e.partnerId === p.id && e.status === 'COMPLETED');
      const takeRateRevenue = partnerExecs.length * Number(p.takeRateBrl);
      const monthlyRevenue = Number(p.monthlyFeeBrl);
      return {
        partner: p.name,
        type: p.type,
        tier: p.tier,
        monthlyFee: monthlyRevenue,
        takeRateRevenue,
        totalRevenue: monthlyRevenue + takeRateRevenue,
        executions: partnerExecs.length,
        volumeBrl: partnerExecs.reduce((sum, e) => sum + Number(e.amountBrl || 0), 0)
      };
    });

    const totalRevenue = revenueByPartner.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalExecutions = executions.filter(e => e.status === 'COMPLETED').length;
    const failedExecutions = executions.filter(e => e.status === 'FAILED').length;

    return {
      month,
      summary: {
        totalPartners: partners.length,
        totalExecutions: executions.length,
        successfulExecutions: totalExecutions,
        failedExecutions,
        successRate: executions.length > 0 ? (totalExecutions / executions.length) * 100 : 0,
        totalRevenueBrl: totalRevenue,
        totalVolumeBrl: revenueByPartner.reduce((sum, p) => sum + p.volumeBrl, 0)
      },
      revenueByPartner
    };
  }

  // ========== NOVOS REPORTS — Contexto Financeiro & Varejo ==========

  // Relatório de Recuperação de Carrinho Abandonado (showpiece pra varejistas)
  @Get('partner/:partnerId/abandoned-cart-recovery')
  async abandonedCartRecovery(@Param('partnerId') partnerId: string, @Query() q: { month?: string }) {
    const month = q.month || new Date().toISOString().slice(0, 7);
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Gatilhos de CONSUMO do tipo retailer
    const triggers = await prisma.trigger.findMany({
      where: {
        partnerId,
        code: { in: ['RECURRING_BUY', 'PRICE_ALERT_BUY', 'BALANCE_TRIGGER_BUY', 'GOAL_ACCUMULATION_BUY', 'POST_BILLS_BUY', 'SALARY_TRIGGER_BUY', 'AUTO_BUY_ON_RESTOCK', 'GIFT_AUTO_BUY', 'GROCERY_REPLENISHMENT'] }
      }
    });

    const executions = await prisma.execution.findMany({
      where: { partnerId, createdAt: { gte: startDate, lt: endDate } },
      include: { trigger: true, user: true }
    });

    const pendingTriggers = triggers.filter(t => t.status === 'ACTIVE');
    const completedExecutions = executions.filter(e => e.status === 'COMPLETED' && e.trigger.code !== 'DCA_STOCK' && e.trigger.code !== 'DCA_FUND');

    // Calcula KPIs de recuperação
    const totalPendingValueBrl = pendingTriggers.reduce((sum, t) => {
      const params = t.params as any;
      return sum + (params.targetAmount || params.amountBrl || params.maxPriceBrl || 0);
    }, 0);

    const recoveredRevenueBrl = completedExecutions.reduce((sum, e) => sum + Number(e.amountBrl || 0), 0);

    // Top produtos no pipeline
    const productStats = new Map<string, { sku: string; name: string; count: number; value: number }>();
    pendingTriggers.forEach(t => {
      const params = t.params as any;
      const sku = params.sku || 'unknown';
      const value = params.targetAmount || params.amountBrl || params.maxPriceBrl || 0;
      const existing = productStats.get(sku);
      if (existing) {
        existing.count++;
        existing.value += value;
      } else {
        productStats.set(sku, { sku, name: this.getProductName(sku), count: 1, value });
      }
    });
    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Distribuição por tipo de gatilho
    const byTriggerType = new Map<string, { type: string; count: number; value: number }>();
    pendingTriggers.forEach(t => {
      const params = t.params as any;
      const value = params.targetAmount || params.amountBrl || params.maxPriceBrl || 0;
      const existing = byTriggerType.get(t.code);
      if (existing) {
        existing.count++;
        existing.value += value;
      } else {
        byTriggerType.set(t.code, { type: t.code, count: 1, value });
      }
    });

    return {
      month,
      partner: partnerId,
      kpis: {
        abandonedCartsRecovered: completedExecutions.length,
        pipelineValueBrl: totalPendingValueBrl,
        recoveredRevenueBrl,
        conversionRate: pendingTriggers.length > 0 ? (completedExecutions.length / pendingTriggers.length) * 100 : 0,
        avgOrderValue: completedExecutions.length > 0 ? recoveredRevenueBrl / completedExecutions.length : 0
      },
      insight: {
        headline: `Você recuperou R$ ${recoveredRevenueBrl.toFixed(2)} de carrinhos que seriam perdidos`,
        detail: `${pendingTriggers.length} clientes têm gatilhos ativos esperando R$ ${totalPendingValueBrl.toFixed(2)} em compras`,
        projection: `Se 30% dos gatilhos dispararem nos próximos 30 dias = R$ ${(totalPendingValueBrl * 0.3).toFixed(2)} de receita`
      },
      topProducts,
      byTriggerType: Array.from(byTriggerType.values())
    };
  }

  // Relatório do pipeline de vendas (previsão de receita futura)
  @Get('partner/:partnerId/pipeline-forecast')
  async pipelineForecast(@Param('partnerId') partnerId: string) {
    const triggers = await prisma.trigger.findMany({
      where: {
        partnerId,
        status: 'ACTIVE',
        code: { in: ['BALANCE_TRIGGER_BUY', 'GOAL_ACCUMULATION_BUY', 'POST_BILLS_BUY', 'SALARY_TRIGGER_BUY', 'AUTO_BUY_ON_RESTOCK', 'PRICE_ALERT_BUY', 'RECURRING_BUY'] }
      },
      include: { user: true }
    });

    // Agrupa por horizonte temporal
    const today = new Date();
    const next7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next90 = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const buckets = {
      next7Days: { count: 0, valueBrl: 0, triggers: [] as any[] },
      next30Days: { count: 0, valueBrl: 0, triggers: [] as any[] },
      next90Days: { count: 0, valueBrl: 0, triggers: [] as any[] },
      beyond: { count: 0, valueBrl: 0, triggers: [] as any[] }
    };

    for (const trigger of triggers) {
      const params = trigger.params as any;
      const value = params.targetAmount || params.amountBrl || params.maxPriceBrl || 0;

      // Estimativa de quando vai disparar baseada no tipo
      let estimatedDate: Date;
      switch (trigger.code) {
        case 'POST_BILLS_BUY':
          estimatedDate = new Date(today.getFullYear(), today.getMonth(), params.dayOfMonth || 20);
          if (estimatedDate < today) estimatedDate.setMonth(estimatedDate.getMonth() + 1);
          break;
        case 'RECURRING_BUY':
          estimatedDate = new Date(today.getTime() + (params.frequencyDays || 30) * 24 * 60 * 60 * 1000);
          break;
        case 'GOAL_ACCUMULATION_BUY':
          const weeksNeeded = Math.ceil((params.targetAmount || 0) / (params.weeklyAmount || 50));
          estimatedDate = new Date(today.getTime() + weeksNeeded * 7 * 24 * 60 * 60 * 1000);
          break;
        case 'AUTO_BUY_ON_RESTOCK':
          estimatedDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);  // média 15 dias
          break;
        default:
          estimatedDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      }

      const bucket = estimatedDate <= next7 ? buckets.next7Days :
                     estimatedDate <= next30 ? buckets.next30Days :
                     estimatedDate <= next90 ? buckets.next90Days :
                     buckets.beyond;

      bucket.count++;
      bucket.valueBrl += value;
      bucket.triggers.push({
        id: trigger.id,
        code: trigger.code,
        customer: trigger.user.name,
        value,
        estimatedDate: estimatedDate.toISOString(),
        product: params.sku
      });
    }

    const totalValueBrl = Object.values(buckets).reduce((sum, b) => sum + b.valueBrl, 0);

    return {
      generatedAt: new Date().toISOString(),
      partner: partnerId,
      summary: {
        totalScheduledValueBrl: totalValueBrl,
        totalScheduledCount: triggers.length,
        probabilityAdjustedValueBrl: totalValueBrl * 0.4,  // 40% de chance histórica de conversão
        next7DaysValueBrl: buckets.next7Days.valueBrl,
        next30DaysValueBrl: buckets.next30Days.valueBrl,
        next90DaysValueBrl: buckets.next90Days.valueBrl
      },
      buckets: {
        next7Days: { count: buckets.next7Days.count, valueBrl: buckets.next7Days.valueBrl, top5: buckets.next7Days.triggers.slice(0, 5) },
        next30Days: { count: buckets.next30Days.count, valueBrl: buckets.next30Days.valueBrl, top5: buckets.next30Days.triggers.slice(0, 5) },
        next90Days: { count: buckets.next90Days.count, valueBrl: buckets.next90Days.valueBrl, top5: buckets.next90Days.triggers.slice(0, 5) }
      }
    };
  }

  private getProductName(sku: string): string {
    const productNames: Record<string, string> = {
      'BISCOITO_Z_150G': 'Biscoito Z 150g',
      'CAFE_X_500G': 'Café X 500g',
      'LEITE_INTEGRAL_1L': 'Leite Integral 1L',
      'TV_50_4K_SAMSUNG': 'TV Samsung 50" 4K',
      'NOTEBOOK_GAMER_X': 'Notebook Gamer X',
      'LIVRO_X': 'Livro "X" Bestseller',
      'PERFUME_IMPORTADO_X': 'Perfume Importado X',
      'PERFUME_Y': 'Perfume Y Eau de Toilette',
      'PERFUME_Z': 'Perfume Z Premium',
      'PERFUME_RARO_V': 'Perfume Raro V Edição Limitada'
    };
    return productNames[sku] || sku;
  }
}
