// @ts-nocheck
// ============================================
//  TRIGGER ENGINE — O Coração do Orkest
// ============================================
// Avalia gatilhos, executa ações, gerencia state machine.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, Trigger, ExecutionStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DestinationRegistry } from '../destinations/destination-registry';
import { DestinationAction, DestinationType } from '../destinations/destination.interface';
import { MarketDataService } from '../market-data/market-data.service';
import { BankTransferService } from '../open-finance/bank-transfer.service';

@Injectable()
export class TriggerEngine {
  private readonly logger = new Logger(TriggerEngine.name);
  private prisma = new PrismaClient();

  constructor(
    @InjectQueue('trigger-evaluation') private evaluationQueue: Queue,
    @InjectQueue('trigger-execution') private executionQueue: Queue,
    private destinations: DestinationRegistry,
    private marketData: MarketDataService,
    private bankService: BankTransferService
  ) {}

  // ============================================
  // 1. AVALIAÇÃO — verifica se gatilho deve disparar
  // ============================================

  async evaluateTrigger(triggerId: string): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const trigger = await this.prisma.trigger.findUnique({
      where: { id: triggerId },
      include: { user: true }
    });
    if (!trigger) return { shouldFire: false, reason: 'Trigger não encontrado' };
    if (trigger.status !== 'ACTIVE') return { shouldFire: false, reason: `Status: ${trigger.status}` };

    const result = await this.evaluateByCode(trigger);
    return result;
  }

  private async evaluateByCode(trigger: Trigger): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const params = trigger.params as any;
    const triggerCode = trigger.code;

    switch (triggerCode) {
      case 'BUY_DIP_STOCK':
        return this.evaluateBuyDipStock(trigger, params);

      case 'DCA_STOCK':
        return this.evaluateDcaStock(trigger, params);

      case 'DCA_FUND':
        return this.evaluateDcaFund(trigger, params);

      case 'RASI_CAIXA_FUND':
        return this.evaluateRasiCaixa(trigger, params);

      case 'BUY_DIP_CRYPTO':
        return this.evaluateBuyDipCrypto(trigger, params);

      case 'DCA_CRYPTO':
        return this.evaluateDcaCrypto(trigger, params);

      case 'RECURRING_BUY':
        return this.evaluateRecurringBuy(trigger, params);

      case 'PRICE_ALERT_BUY':
        return this.evaluatePriceAlertBuy(trigger, params);

      case 'BILL_AUTO_PAY':
        return this.evaluateBillAutoPay(trigger, params);

      // Multi-condição genérico (usado pelo widget)
      case 'PRICE_DROP':
      case 'BALANCE_DATE':
      case 'SALARY':
      case 'SAVINGS':
      case 'RESTOCK':
      case 'CUSTOM_NL':
        return this.evaluateMultiCondition(trigger, params);

      // E-COMMERCE INTELIGENTE
      case 'OPPORTUNITY_BUY':
        return this.evaluateOpportunityBuy(trigger, params);
      case 'DETACHMENT_BUY':
        return this.evaluateDetachmentBuy(trigger, params);
      case 'SCARCITY_BUY':
        return this.evaluateScarcityBuy(trigger, params);

      // INVESTIMENTOS SEM ESFORÇO
      case 'ROUND_UP_PIX':
        return this.evaluateRoundUpPix(trigger, params);
      case 'IMPULSE_REWARD':
        return this.evaluateImpulseReward(trigger, params);
      case 'VOLATILITY_HEDGE':
        return this.evaluateVolatilityHedge(trigger, params);

      // PESSOA FÍSICA / BANCOS
      case 'ACCOUNT_SWEEP':
        return this.evaluateAccountSweep(trigger, params);
      case 'CREDIT_SCORE_BOOST':
        return this.evaluateCreditScoreBoost(trigger, params);
      case 'EMERGENCY_FUND':
        return this.evaluateEmergencyFund(trigger, params);

      case 'BALANCE_TRIGGER_BUY':
        return this.evaluateBalanceTriggerBuy(trigger, params);

      case 'POST_BILLS_BUY':
        return this.evaluatePostBillsBuy(trigger, params);

      case 'SALARY_TRIGGER_BUY':
        return this.evaluateSalaryTriggerBuy(trigger, params);

      case 'AUTO_BUY_ON_RESTOCK':
        return this.evaluateAutoBuyOnRestock(trigger, params);

      case 'GOAL_ACCUMULATION_BUY':
        return this.evaluateGoalAccumulation(trigger, params);

      case 'CUSTOM_NL':
        return { shouldFire: false, reason: 'Regras custom NL requerem avaliação manual' };

      default:
        return { shouldFire: false, reason: `Tipo de gatilho ${triggerCode} ainda não implementado` };
    }
  }

  // ========== Evaluators específicos ==========

  private async evaluateBuyDipStock(trigger: Trigger, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    // 1. Busca cotação real
    const quote = await this.marketData.getStockQuote(params.ticker);
    if (!quote) return { shouldFire: false, reason: 'Sem cotação disponível' };

    // 2. Calcula variação no período
    const historical = await this.marketData.getStockHistory(params.ticker, params.windowDays);
    const maxPrice = Math.max(...historical.map(h => h.close));
    const dropPct = ((maxPrice - quote.price) / maxPrice) * 100;

    if (dropPct < params.dipPct) {
      return { shouldFire: false, reason: `Queda atual ${dropPct.toFixed(2)}% < gatilho ${params.dipPct}%` };
    }

    // 3. Verifica saldo
    const balance = await this.bankService.getBalance(trigger.userId);
    if (balance < (params.minBalance || 0)) {
      return { shouldFire: false, reason: `Saldo ${balance.toFixed(2)} < mínimo ${params.minBalance}` };
    }
    if (balance < params.amountBrl) {
      return { shouldFire: false, reason: `Saldo insuficiente pra operação de R$ ${params.amountBrl}` };
    }

    return {
      shouldFire: true,
      reason: `Queda de ${dropPct.toFixed(2)}% detectada`,
      data: { quote, dropPct }
    };
  }

  private async evaluateDcaStock(trigger: Trigger, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const today = new Date();
    if (today.getDate() !== params.dayOfMonth) {
      return { shouldFire: false, reason: `Hoje é dia ${today.getDate()}, gatilho roda dia ${params.dayOfMonth}` };
    }
    const balance = await this.bankService.getBalance(trigger.userId);
    if (balance < (params.minBalance || 0)) {
      return { shouldFire: false, reason: `Saldo ${balance.toFixed(2)} < mínimo ${params.minBalance}` };
    }
    if (balance < params.amountBrl) {
      return { shouldFire: false, reason: `Saldo insuficiente` };
    }
    return { shouldFire: true, reason: `Dia ${params.dayOfMonth} — aporte programado`, data: { balance } };
  }

  private async evaluateDcaFund(trigger: Trigger, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const today = new Date();
    if (today.getDate() !== params.dayOfMonth) {
      return { shouldFire: false, reason: `Hoje é dia ${today.getDate()}, gatilho roda dia ${params.dayOfMonth}` };
    }
    const balance = await this.bankService.getBalance(trigger.userId);
    if (balance < (params.minBalance || 0)) {
      return { shouldFire: false, reason: `Saldo ${balance.toFixed(2)} < mínimo ${params.minBalance}` };
    }
    if (balance < params.amountBrl) {
      return { shouldFire: false, reason: `Saldo insuficiente` };
    }
    return { shouldFire: true, reason: `Aporte programado em fundo`, data: { balance } };
  }

  private async evaluateRasiCaixa(trigger: Trigger, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const today = new Date();
    if (today.getDate() !== params.dayOfMonth) {
      return { shouldFire: false, reason: `Dia ${today.getDate()} ≠ ${params.dayOfMonth}` };
    }
    const balance = await this.bankService.getBalance(trigger.userId);
    if (balance <= params.minCashReserve) {
      return { shouldFire: false, reason: `Saldo ${balance.toFixed(2)} ≤ reserva ${params.minCashReserve}` };
    }
    const excess = balance - params.minCashReserve;
    const transferAmount = Math.min(excess, params.maxTransferBrl || excess);
    return {
      shouldFire: true,
      reason: `Excedente detectado: R$ ${transferAmount.toFixed(2)}`,
      data: { transferAmount, balance, excess }
    };
  }

  private async evaluateBuyDipCrypto(trigger: Trigger, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const quote = await this.marketData.getCryptoQuote(params.asset);
    if (!quote) return { shouldFire: false, reason: 'Sem cotação' };

    const historical = await this.marketData.getCryptoHistory(params.asset, params.windowHours);
    const maxPrice = Math.max(...historical.map(h => h.close));
    const dropPct = ((maxPrice - quote.price) / maxPrice) * 100;

    if (dropPct < params.dipPct) {
      return { shouldFire: false, reason: `Queda ${dropPct.toFixed(2)}% < ${params.dipPct}%` };
    }

    const balance = await this.bankService.getBalance(trigger.userId);
    if (balance < params.amountBrl) {
      return { shouldFire: false, reason: 'Saldo insuficiente' };
    }
    return { shouldFire: true, reason: `Cripto caiu ${dropPct.toFixed(2)}%`, data: { quote, dropPct } };
  }

  private async evaluateDcaCrypto(trigger: Trigger, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    return this.evaluateDcaStock(trigger, params);  // mesma lógica
  }

  private async evaluateRecurringBuy(trigger: Trigger, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const lastExecution = await this.prisma.execution.findFirst({
      where: { triggerId: trigger.id, status: 'COMPLETED' },
      orderBy: { executionCompletedAt: 'desc' }
    });
    const now = new Date();
    if (lastExecution?.executionCompletedAt) {
      const daysSince = (now.getTime() - lastExecution.executionCompletedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < params.frequencyDays) {
        return { shouldFire: false, reason: `Última compra há ${daysSince.toFixed(0)} dias, frequência é ${params.frequencyDays}` };
      }
    }
    const quote = await this.marketData.getProductQuote(params.sku);
    if (!quote) return { shouldFire: false, reason: 'Produto não encontrado' };
    if (quote.price < params.minPriceBrl || quote.price > params.maxPriceBrl) {
      return { shouldFire: false, reason: `Preço R$ ${quote.price.toFixed(2)} fora do range R$ ${params.minPriceBrl}-${params.maxPriceBrl}` };
    }
    return { shouldFire: true, reason: `Preço R$ ${quote.price.toFixed(2)} no range`, data: { quote } };
  }

  private async evaluatePriceAlertBuy(trigger: Trigger, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const quote = await this.marketData.getProductQuote(params.sku);
    if (!quote) return { shouldFire: false, reason: 'Produto não encontrado' };
    if (quote.price > params.targetPriceBrl) {
      return { shouldFire: false, reason: `Preço R$ ${quote.price.toFixed(2)} > alvo R$ ${params.targetPriceBrl}` };
    }
    return { shouldFire: true, reason: `Atingiu preço alvo!`, data: { quote } };
  }

  private async evaluateBillAutoPay(trigger: Trigger, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    // Mock — em produção consultaria API da concessionária
    const mockBillAmount = 280 + Math.random() * 200;
    if (mockBillAmount > params.maxAmountBrl) {
      return { shouldFire: false, reason: `Conta R$ ${mockBillAmount.toFixed(2)} > limite R$ ${params.maxAmountBrl}` };
    }
    const balance = await this.bankService.getBalance(trigger.userId);
    if (balance < mockBillAmount) {
      return { shouldFire: false, reason: 'Saldo insuficiente' };
    }
    return { shouldFire: true, reason: `Conta R$ ${mockBillAmount.toFixed(2)} dentro do limite`, data: { amount: mockBillAmount } };
  }

  // ========== NOVOS EVALUATORS — Contexto Financeiro ==========

  private async evaluateBalanceTriggerBuy(trigger: Trigger, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const balance = await this.bankService.getBalance(trigger.userId);
    if (balance < params.minBalance) {
      return { shouldFire: false, reason: `Saldo R$ ${balance.toFixed(2)} < gatilho R$ ${params.minBalance}` };
    }
    // Verifica timeout (maxWaitDays)
    if (params.maxWaitDays && trigger.createdAt) {
      const ageDays = (Date.now() - trigger.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > params.maxWaitDays) {
        return { shouldFire: false, reason: `Expirou após ${params.maxWaitDays} dias (${ageDays.toFixed(0)} dias desde criação)` };
      }
    }
    return {
      shouldFire: true,
      reason: `Saldo R$ ${balance.toFixed(2)} >= gatilho R$ ${params.minBalance}`,
      data: { balance, minBalance: params.minBalance }
    };
  }

  private async evaluatePostBillsBuy(trigger: Trigger, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const today = new Date();
    if (today.getDate() !== params.dayOfMonth) {
      return { shouldFire: false, reason: `Hoje é dia ${today.getDate()}, gatilho dispara dia ${params.dayOfMonth}` };
    }
    // Mock: em produção, consultaria o extrato via Open Finance pra confirmar pagamento das contas
    const mockBillsPaid = Math.random() > 0.3;  // 70% chance de contas terem sido pagas
    if (!mockBillsPaid) {
      return { shouldFire: false, reason: 'Ainda há contas fixas a pagar este mês' };
    }
    const balance = await this.bankService.getBalance(trigger.userId);
    if (balance < params.minBalanceAfterBills) {
      return { shouldFire: false, reason: `Saldo pós-contas R$ ${balance.toFixed(2)} < mínimo R$ ${params.minBalanceAfterBills}` };
    }
    return {
      shouldFire: true,
      reason: `Contas pagas + saldo R$ ${balance.toFixed(2)} >= R$ ${params.minBalanceAfterBills}`,
      data: { balance, billsPaid: true }
    };
  }

  private async evaluateSalaryTriggerBuy(trigger: Trigger, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    // Mock: 40% chance de ter recebido salário > X neste mês
    const salaryReceived = 1000 + Math.random() * 5000;
    if (salaryReceived < params.minSalary) {
      return { shouldFire: false, reason: `Salário simulado R$ ${salaryReceived.toFixed(2)} < gatilho R$ ${params.minSalary}` };
    }
    const balance = await this.bankService.getBalance(trigger.userId);
    const productPrice = await this.marketData.getProductQuote(params.sku);
    const totalCost = (productPrice?.price || 0) * (params.quantity || 1);
    if (balance < totalCost) {
      return { shouldFire: false, reason: 'Saldo insuficiente mesmo com salário detectado' };
    }
    if (params.maxAmountBrl && totalCost > params.maxAmountBrl) {
      return { shouldFire: false, reason: `Custo R$ ${totalCost.toFixed(2)} > teto R$ ${params.maxAmountBrl}` };
    }
    return {
      shouldFire: true,
      reason: `Salário R$ ${salaryReceived.toFixed(2)} detectado, dispara compra`,
      data: { salaryReceived, totalCost }
    };
  }

  private async evaluateAutoBuyOnRestock(trigger: Trigger, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const quote = await this.marketData.getProductQuote(params.sku);
    if (!quote) return { shouldFire: false, reason: 'Produto não encontrado' };
    // Em produção, verificaria estoque real via adapter
    // Aqui simulamos: se o produto está com restockDate no passado, volta ao estoque
    const restockData = (this.marketData as any).restockSchedule?.[params.sku];
    if (restockData && new Date(restockData) > new Date()) {
      return { shouldFire: false, reason: `Produto volta ao estoque em ${new Date(restockData).toLocaleDateString('pt-BR')}` };
    }
    if (params.maxPriceBrl && quote.price > params.maxPriceBrl) {
      return { shouldFire: false, reason: `Preço R$ ${quote.price.toFixed(2)} > máximo R$ ${params.maxPriceBrl}` };
    }
    const balance = await this.bankService.getBalance(trigger.userId);
    if (balance < quote.price) {
      return { shouldFire: false, reason: 'Saldo insuficiente' };
    }
    return {
      shouldFire: true,
      reason: `Produto voltou ao estoque por R$ ${quote.price.toFixed(2)}`,
      data: { quote }
    };
  }

  private async evaluateGoalAccumulation(trigger: Trigger, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    // Mock: verifica quantas semanas desde a criação e simula acúmulo
    const weeksElapsed = trigger.createdAt
      ? Math.floor((Date.now() - trigger.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 7))
      : 0;
    const accumulated = weeksElapsed * params.weeklyAmount;
    if (accumulated < params.targetAmount) {
      return { shouldFire: false, reason: `Acumulado R$ ${accumulated.toFixed(2)} < meta R$ ${params.targetAmount} (${weeksElapsed} semanas)` };
    }
    return {
      shouldFire: true,
      reason: `Meta atingida! R$ ${accumulated.toFixed(2)} = R$ ${params.targetAmount}`,
      data: { accumulated, weeksElapsed }
    };
  }

  // ============================================
  // 2. EXECUÇÃO — quando shouldFire=true
  // ============================================

  async executeTrigger(triggerId: string, evaluationData: any) {
    this.logger.log(`🚀 Executing trigger ${triggerId}`);

    const trigger = await this.prisma.trigger.findUnique({
      where: { id: triggerId },
      include: { partner: true, user: true }
    });
    if (!trigger) throw new Error('Trigger não encontrado');

    // Cria execution
    const execution = await this.prisma.execution.create({
      data: {
        partnerId: trigger.partnerId,
        user: { connect: { id: trigger.userId } },
        trigger: { connect: { id: trigger.id } },
        status: 'EVALUATING',
        intent: evaluationData as any,
        destination: this.resolveDestinationName(trigger.partner, trigger.code),
        amountBrl: trigger.params['amountBrl'] || 0
      }
    });

    try {
      // 1. Atualiza status
      await this.updateExecutionStatus(execution.id, 'INITIATING_PIX');

      // 2. Inicia Pix via Open Finance (mock bank)
      const bankAdapter = this.destinations.resolve(trigger.partnerId, 'BANK_ACCOUNT');
      const pixResult = await bankAdapter.execute({
        type: 'TRANSFER',
        destinationAccount: `DEST-${trigger.code}`,
        amountBrl: Number(execution.amountBrl),
        userId: trigger.user.externalUserId
      });

      if (pixResult.status === 'FAILED') {
        await this.failExecution(execution.id, 'PIX_FAILED', pixResult.errorMessage);
        return;
      }

      // 3. Atualiza status
      await this.updateExecutionStatus(execution.id, 'PIX_CONFIRMED', {
        pixEndToEndId: pixResult.details.pixEndToEndId
      });

      // 4. Chama o adapter do destino final
      const destinationType = this.resolveDestinationType(trigger.code);
      const destinationAdapter = this.destinations.resolve(trigger.partnerId, destinationType);
      const action = this.buildAction(trigger, evaluationData, trigger.user.externalUserId);

      await this.updateExecutionStatus(execution.id, 'EXECUTING_DESTINATION');
      const destResult = await destinationAdapter.execute(action);

      if (destResult.status === 'FAILED') {
        await this.failExecution(execution.id, destResult.errorCode, destResult.errorMessage);
        return;
      }

      // 5. Sucesso!
      await this.prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          externalId: destResult.externalId,
          result: destResult.details,
          executionCompletedAt: new Date()
        }
      });

      // 6. Atualiza trigger
      await this.prisma.trigger.update({
        where: { id: trigger.id },
        data: {
          lastExecutedAt: new Date(),
          executionCount: { increment: 1 },
          totalSpentBrl: { increment: Number(execution.amountBrl) }
        }
      });

      // 7. Audit log
      await this.prisma.auditLog.create({
        data: {
          partnerId: trigger.partnerId,
          userId: trigger.userId,
          triggerId: trigger.id,
          executionId: execution.id,
          actor: 'system',
          action: 'EXECUTION_COMPLETED',
          resource: 'execution',
          resourceId: execution.id,
          metadata: { externalId: destResult.externalId, amountBrl: Number(execution.amountBrl) }
        }
      });

      this.logger.log(`✅ Execution ${execution.id} completed: ${destResult.externalId}`);
    } catch (err) {
      this.logger.error(`❌ Execution ${execution.id} failed: ${err.message}`);
      await this.failExecution(execution.id, 'INTERNAL_ERROR', err.message);
    }
  }

  // ============================================
  // 3. SCHEDULER — enfileira gatilhos pra avaliação
  // ============================================

  async scheduleEvaluation(triggerId: string, delayMs = 0) {
    await this.evaluationQueue.add(
      'evaluate',
      { triggerId },
      { delay: delayMs, attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );
  }

  async scheduleAllActive() {
    const activeTriggers = await this.prisma.trigger.findMany({
      where: { status: 'ACTIVE' },
      take: 1000
    });
    for (const trigger of activeTriggers) {
      await this.scheduleEvaluation(trigger.id, Math.random() * 60000);  // jitter
    }
    this.logger.log(`📅 Scheduled ${activeTriggers.length} triggers for evaluation`);
  }

  // ========== Helpers ==========

  private async updateExecutionStatus(id: string, status: ExecutionStatus, metadata?: any) {
    await this.prisma.execution.update({
      where: { id },
      data: {
        status,
        state: { history: 'transition', ...metadata } as any
      }
    });
  }

  private async failExecution(id: string, code: string, message: string) {
    await this.prisma.execution.update({
      where: { id },
      data: { status: 'FAILED', errorCode: code, errorMessage: message, failedAt: new Date() }
    });
  }

  // ============================================
  //  E-COMMERCE INTELIGENTE (3 gatilhos)
  // ============================================

  /** OPPORTUNITY_BUY: Preço alvo + CDI compensando o desconto */
  private async evaluateOpportunityBuy(trigger: any, params: any) {
    const offer = await this.prisma.offer.findUnique({ where: { id: trigger.offerId } });
    if (!offer) return { shouldFire: false, reason: 'Oferta não encontrada' };
    const currentPrice = parseFloat(offer.priceBrl.toString());
    const targetPrice = params.targetPrice;
    if (currentPrice > targetPrice) {
      return { shouldFire: false, reason: `Preco atual R$${currentPrice} > alvo R$${targetPrice}` };
    }
    // Calcula rendimento CDI no período de oportunidade
    const cdiAnnual = (params.cdiAnnualPct || 13.5) / 100;
    const months = params.opportunityMonths || 3;
    const diff = currentPrice * 0.0; // diff entre preco original e atual
    const cdiEarn = currentPrice * cdiAnnual * (months / 12);
    // Heurística: se cdiEarn > diff, vale a pena
    const worthIt = cdiEarn > 0;
    return {
      shouldFire: true,
      reason: `Preco alvo atingido (R$${currentPrice}) + CDI rendendo R$${cdiEarn.toFixed(2)} em ${months} meses`,
      data: { currentPrice, targetPrice, cdiEarn }
    };
  }

  /** DETACHMENT_BUY: Compra novo SÓ se detectar venda do antigo */
  private async evaluateDetachmentBuy(trigger: any, params: any) {
    // TODO: integrar com Open Finance pra detectar Pix de entrada
    // Por enquanto, simula: a cada chamada retorna false (precisa de transação detectada)
    return {
      shouldFire: false,
      reason: `Aguardando venda de "${params.oldItemName}" por >= R$ ${params.oldItemMinValue}`,
      data: { required: 'Pix de venda detectado', keyword: params.oldItemName }
    };
  }

  /** SCARCITY_BUY: Estoque baixo E saldo acima do limite */
  private async evaluateScarcityBuy(trigger: any, params: any) {
    const offer = await this.prisma.offer.findUnique({ where: { id: trigger.offerId } });
    if (!offer) return { shouldFire: false, reason: 'Oferta não encontrada' };
    if (!offer.inStock) return { shouldFire: false, reason: 'Sem estoque' };
    // TODO: ler saldo real via Open Finance
    const fakeBalance = 10000;
    const ok = fakeBalance >= params.safetyBalanceBrl;
    return {
      shouldFire: ok,
      reason: ok
        ? `Estoque baixo + saldo OK (R$${fakeBalance})`
        : `Saldo abaixo do limite de segurança (R$${params.safetyBalanceBrl})`,
      data: { stock: offer.stockQuantity, balance: fakeBalance }
    };
  }

  // ============================================
  //  INVESTIMENTOS SEM ESFORÇO (3 gatilhos)
  // ============================================

  /** ROUND_UP_PIX: Arredonda gastos e investe o troco */
  private async evaluateRoundUpPix(trigger: any, params: any) {
    // TODO: detectar gastos via Open Finance ao longo do dia
    return {
      shouldFire: false,
      reason: 'Monitorando gastos para arredondar (em breve)',
      data: { roundUpTo: params.roundUpTo, destinationAsset: params.destinationAsset }
    };
  }

  /** IMPULSE_REWARD: Se não gastou em delivery, ganha ação na segunda */
  private async evaluateImpulseReward(trigger: any, params: any) {
    // TODO: verificar gastos na categoria "delivery" no fim de semana
    const now = new Date();
    if (now.getDay() !== 1) { // 1 = segunda
      return { shouldFire: false, reason: 'Executa apenas na segunda-feira' };
    }
    return {
      shouldFire: false,
      reason: 'Aguardando fim de semana sem gastos em delivery',
      data: { avgImpulseSpendBrl: params.avgImpulseSpendBrl }
    };
  }

  /** VOLATILITY_HEDGE: Ibovespa/IFIX caiu 3%+ E tem caixa */
  private async evaluateVolatilityHedge(trigger: any, params: any) {
    // TODO: pegar cotação do dia do índice (Yahoo Finance API)
    return {
      shouldFire: false,
      reason: `Monitorando ${params.indexName} (queda de ${params.dropPct}%)`,
      data: { index: params.indexName, dropPct: params.dropPct }
    };
  }

  // ============================================
  //  PESSOA FÍSICA / BANCOS (3 gatilhos)
  // ============================================

  /** ACCOUNT_SWEEP: Dia 28 varre sobra pra CDB */
  private async evaluateAccountSweep(trigger: any, params: any) {
    const now = new Date();
    if (now.getDate() !== params.sweepDayOfMonth) {
      return { shouldFire: false, reason: `Executa apenas dia ${params.sweepDayOfMonth}` };
    }
    // TODO: ler saldo via Open Finance
    const fakeBalance = 3500;
    const sweepAmount = Math.max(0, fakeBalance - params.keepMinimumBrl);
    if (sweepAmount < params.minAmountBrl) {
      return { shouldFire: false, reason: 'Sobra abaixo do mínimo' };
    }
    return {
      shouldFire: true,
      reason: `Varrendo R$ ${sweepAmount.toFixed(2)} para ${params.destinationAsset}`,
      data: { sweepAmount, destination: params.destinationAsset }
    };
  }

  /** CREDIT_SCORE_BOOST: Paga fatura antes do fechamento */
  private async evaluateCreditScoreBoost(trigger: any, params: any) {
    // TODO: checar data de fechamento da fatura
    return {
      shouldFire: false,
      reason: `Monitorando fechamento dia ${params.creditCardStatementDay}`,
      data: { daysBeforeDue: params.daysBeforeDue }
    };
  }

  /** EMERGENCY_FUND: Morde 30% de receitas extras pra reserva */
  private async evaluateEmergencyFund(trigger: any, params: any) {
    // TODO: detectar palavras-chave em transações (bônus, 13º, reembolso)
    return {
      shouldFire: false,
      reason: 'Monitorando receitas extras (bônus, 13º, reembolso)',
      data: {
        targetReserve: params.monthlyCostOfLifeBrl * params.targetMonths,
        incomeKeywords: params.incomeKeywords
      }
    };
  }

  // ============================================
  //  MULTI-CONDIÇÃO (widget)
  // ============================================
  private async evaluateMultiCondition(trigger: any, params: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const conditions = params.conditions || [];
    const logic = params.logic || 'AND';

    if (conditions.length === 0) {
      return { shouldFire: false, reason: 'Sem condições definidas' };
    }

    const results: { type: string; ok: boolean; detail: string }[] = [];

    for (const cond of conditions) {
      // PRICE_BELOW: verifica preço da oferta
      if (cond.type === 'PRICE_BELOW') {
        if (!trigger.offerId) {
          results.push({ type: cond.type, ok: false, detail: 'Sem offerId' });
          continue;
        }
        const offer = await this.prisma.offer.findUnique({ where: { id: trigger.offerId } });
        if (!offer) {
          results.push({ type: cond.type, ok: false, detail: 'Oferta não encontrada' });
          continue;
        }
        const currentPrice = parseFloat(offer.priceBrl.toString());
        const targetPrice = parseFloat(cond.value);
        const ok = currentPrice <= targetPrice;
        results.push({
          type: cond.type,
          ok,
          detail: `Preço atual: R$ ${currentPrice.toFixed(2)}, alvo: R$ ${targetPrice.toFixed(2)}`
        });
      }

      // BALANCE_ABOVE: verifica saldo via Open Finance
      if (cond.type === 'BALANCE_ABOVE') {
        const targetBalance = parseFloat(cond.value);
        // TODO: integrar com Efí Open Finance pra ler saldo real
        // Por enquanto, simula OK
        const fakeBalance = 5000;
        const ok = fakeBalance >= targetBalance;
        results.push({
          type: cond.type,
          ok,
          detail: `Saldo simulado: R$ ${fakeBalance.toFixed(2)}, alvo: R$ ${targetBalance.toFixed(2)}`
        });
      }

      // ON_DATE: verifica se a data alvo já chegou
      if (cond.type === 'ON_DATE') {
        const targetDate = new Date(cond.value);
        const now = new Date();
        const ok = now >= targetDate;
        results.push({
          type: cond.type,
          ok,
          detail: `Alvo: ${targetDate.toISOString().split('T')[0]}, hoje: ${now.toISOString().split('T')[0]}`
        });
      }

      // INCOME_ABOVE: verifica salário via Open Finance
      if (cond.type === 'INCOME_ABOVE') {
        const targetIncome = parseFloat(cond.value);
        // TODO: integrar com Efí Open Finance pra ler transações
        const fakeIncome = 6000;
        const ok = fakeIncome >= targetIncome;
        results.push({
          type: cond.type,
          ok,
          detail: `Salário simulado: R$ ${fakeIncome.toFixed(2)}, alvo: R$ ${targetIncome.toFixed(2)}`
        });
      }

      // ACCUMULATE_WEEKLY: simula acumulação
      if (cond.type === 'ACCUMULATE_WEEKLY') {
        // TODO: rastrear acumulação real
        results.push({ type: cond.type, ok: true, detail: 'Acumulação semanal (em breve)' });
      }

      // RESTOCK: verifica estoque
      if (cond.type === 'RESTOCK') {
        if (!trigger.offerId) {
          results.push({ type: cond.type, ok: false, detail: 'Sem offerId' });
          continue;
        }
        const offer = await this.prisma.offer.findUnique({ where: { id: trigger.offerId } });
        const ok = offer?.inStock === true;
        results.push({ type: cond.type, ok, detail: `Em estoque: ${ok ? 'sim' : 'não' }` });
      }
    }

    // Aplica lógica AND/OR
    const allOk = logic === 'AND'
      ? results.every(r => r.ok)
      : results.some(r => r.ok);

    return {
      shouldFire: allOk,
      reason: allOk
        ? `Todas condições OK (${logic}): ${results.map(r => r.detail).join(' | ')}`
        : `Nem todas condições OK: ${results.map(r => `[${r.ok ? '✓' : '✗'}] ${r.type}: ${r.detail}`).join(' | ')}`,
      data: { conditions: results, logic }
    };
  }

  private resolveDestinationType(triggerCode: string): DestinationType {
    if (triggerCode.includes('STOCK')) return 'STOCK_BROKER';
    if (triggerCode.includes('FUND') || triggerCode.includes('SAVINGS') || triggerCode.includes('CAIXA')) return 'FUND_DISTRIBUTOR';
    if (triggerCode.includes('CRYPTO')) return 'CRYPTO_EXCHANGE';
    if (triggerCode.includes('BILL')) return 'BILL_PAYER';
    if (triggerCode.includes('INSURANCE')) return 'INSURER';
    if (triggerCode.includes('BUY') || triggerCode.includes('RECURRING') || triggerCode.includes('GIFT') || triggerCode.includes('GROCERY')) return 'RETAILER';
    return 'BANK_ACCOUNT';
  }

  private resolveDestinationName(partner: any, triggerCode: string): string {
    const config = partner.config as any;
    const type = this.resolveDestinationType(triggerCode);
    switch (type) {
      case 'STOCK_BROKER': return config.stockAdapter || 'MOCK_STOCK_BROKER';
      case 'FUND_DISTRIBUTOR': return config.fundAdapter || 'MOCK_FUND_DISTRIBUTOR';
      case 'CRYPTO_EXCHANGE': return config.cryptoAdapter || 'MOCK_CRYPTO_EXCHANGE';
      case 'RETAILER': return config.retailerAdapter || 'MOCK_RETAILER';
      case 'BILL_PAYER': return config.billAdapter || 'MOCK_BANK_ACCOUNT';
      default: return 'MOCK_BANK_ACCOUNT';
    }
  }

  private buildAction(trigger: Trigger, evaluationData: any, userId: string): DestinationAction {
    const params = trigger.params as any;
    const code = trigger.code;

    if (code === 'BUY_DIP_STOCK' || code === 'DCA_STOCK') {
      return { type: 'BUY_STOCK', ticker: params.ticker, amountBrl: params.amountBrl, userId };
    }
    if (code === 'STOP_LOSS_STOCK' || code === 'TAKE_PROFIT_STOCK') {
      return { type: 'SELL_STOCK', ticker: params.ticker, quantity: params.quantity || 1, userId };
    }
    if (code === 'DCA_FUND' || code === 'RASI_CAIXA_FUND') {
      const amount = evaluationData?.transferAmount || params.amountBrl;
      return { type: 'SUBSCRIBE_FUND', fundId: params.fundId, amountBrl: amount, userId };
    }
    if (code === 'BUY_DIP_CRYPTO' || code === 'DCA_CRYPTO') {
      return { type: 'BUY_CRYPTO', asset: params.asset, amountBrl: params.amountBrl, userId };
    }
    if (code === 'RECURRING_BUY' || code === 'PRICE_ALERT_BUY' || code === 'GIFT_AUTO_BUY' || code === 'GROCERY_REPLENISHMENT' || code === 'BALANCE_TRIGGER_BUY' || code === 'GOAL_ACCUMULATION_BUY' || code === 'POST_BILLS_BUY' || code === 'SALARY_TRIGGER_BUY' || code === 'AUTO_BUY_ON_RESTOCK') {
      return { type: 'BUY_PRODUCT', sku: params.sku, quantity: params.quantity || 1, userId };
    }
    if (code === 'BILL_AUTO_PAY') {
      return { type: 'PAY_BILL', billType: params.billType, providerId: params.providerId, amountBrl: evaluationData.amount, userId };
    }
    if (code === 'AUTO_PAY_INSURANCE') {
      return { type: 'PAY_INSURANCE', policyId: params.policyId, amountBrl: params.amountBrl, userId };
    }
    return { type: 'TRANSFER', destinationAccount: 'UNKNOWN', amountBrl: 0, userId };
  }
}
