// ============================================
//  AI SUGGESTIONS SERVICE — Gatilhos personalizados
// ============================================
// Analisa o perfil financeiro do consumidor e sugere gatilhos relevantes

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { BankTransferService } from '../open-finance/bank-transfer.service';

const prisma = new PrismaClient();

export interface FinancialProfile {
  userId: string;
  avgBalance: number;
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  incomeVariability: 'STABLE' | 'VARIABLE';
  hasRecurringSalary: boolean;
  topSpendingCategories: { category: string; monthlyAvg: number }[];
  savingsRate: number;
  currentInvestments: { type: string; valueBrl: number }[];
  riskProfile: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  financialGoals?: string[];
}

@Injectable()
export class AiSuggestionsService {
  private readonly logger = new Logger(AiSuggestionsService.name);
  private openai: OpenAI | null = null;

  constructor(private bankService: BankTransferService) {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  /**
   * Analisa perfil financeiro de um usuário
   */
  async buildProfile(userId: string): Promise<FinancialProfile> {
    const balance = await this.bankService.getBalance(userId);
    // Em produção, leria do Open Finance
    return {
      userId,
      avgBalance: balance,
      avgMonthlyIncome: balance * 0.6,  // simulado
      avgMonthlyExpenses: balance * 0.5,
      incomeVariability: 'STABLE',
      hasRecurringSalary: true,
      topSpendingCategories: [
        { category: 'Alimentação', monthlyAvg: 800 },
        { category: 'Transporte', monthlyAvg: 400 },
        { category: 'Lazer', monthlyAvg: 300 }
      ],
      savingsRate: 0.15,
      currentInvestments: [],
      riskProfile: 'MODERATE'
    };
  }

  /**
   * Gera sugestões de gatilhos baseadas no perfil
   */
  async suggestTriggers(userId: string, maxSuggestions = 5): Promise<any[]> {
    const profile = await this.buildProfile(userId);

    if (this.openai) {
      try {
        return await this.suggestWithAI(profile, maxSuggestions);
      } catch (err) {
        this.logger.warn(`OpenAI falhou, usando regras: ${err.message}`);
      }
    }

    return this.suggestWithRules(profile, maxSuggestions);
  }

  private async suggestWithAI(profile: FinancialProfile, maxSuggestions: number): Promise<any[]> {
    const prompt = `Você é o assistente financeiro Orkest. Analise o perfil financeiro deste usuário e sugira até ${maxSuggestions} gatilhos personalizados que fariam sentido pra vida financeira dele.

Perfil:
${JSON.stringify(profile, null, 2)}

Catálogo de gatilhos disponíveis:
- DCA_STOCK: Aporte mensal em ação
- DCA_FUND: Aporte mensal em fundo
- DCA_CRYPTO: Dolarização mensal
- ROUND_UP_SAVINGS: Arredondamento de gastos
- RASI_CAIXA_FUND: Move excedente pra fundo DI
- GOAL_SAVINGS: Poupança pra objetivo
- RECURRING_BUY: Compra recorrente
- BUY_DIP_STOCK: Compra na queda
- SALARY_AUTO_ALLOCATE: Separa % do salário

Retorne JSON estrito:
{
  "suggestions": [
    {
      "triggerCode": "DCA_FUND",
      "title": "Aporte mensal automático",
      "rationale": "Por que esse gatilho faz sentido",
      "suggestedParams": { ... },
      "expectedImpact": "Impacto esperado em 12 meses",
      "confidence": 0.0-1.0,
      "priority": 1-5
    }
  ]
}`;

    const response = await this.openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.suggestions;
  }

  /**
   * Fallback com regras heurísticas
   */
  private suggestWithRules(profile: FinancialProfile, maxSuggestions: number): any[] {
    const suggestions: any[] = [];

    // 1. Se tem saldo alto e estabilidade, sugere aporte programado
    if (profile.avgBalance > 2000 && profile.incomeVariability === 'STABLE') {
      suggestions.push({
        triggerCode: 'DCA_FUND',
        title: 'Aporte mensal automático em fundo',
        rationale: 'Seu saldo médio de R$ ' + profile.avgBalance.toFixed(0) + ' e salário fixo permitem aporte mensal consistente',
        suggestedParams: { fundId: 'XP_SELECTION', dayOfMonth: 10, amountBrl: Math.min(profile.avgBalance * 0.1, 500), minBalance: 1000 },
        expectedImpact: `R$ ${(Math.min(profile.avgBalance * 0.1, 500) * 12).toFixed(0)}/ano investidos automaticamente`,
        confidence: 0.85,
        priority: 1
      });
    }

    // 2. Raspa Caixa pra quem tem saldo alto parado
    if (profile.avgBalance > 5000) {
      suggestions.push({
        triggerCode: 'RASI_CAIXA_FUND',
        title: 'Move excedente de caixa pro fundo DI',
        rationale: `Você mantém em média R$ ${profile.avgBalance.toFixed(0)} parado. Pode render 100%+ do CDI automaticamente`,
        suggestedParams: { fundId: 'BTG_PACTUAL_YIELD', minCashReserve: 3000, dayOfMonth: 5, maxTransferBrl: 3000 },
        expectedImpact: `~R$ ${(profile.avgBalance * 0.11).toFixed(0)}/ano de rendimento`,
        confidence: 0.90,
        priority: 1
      });
    }

    // 3. Dolarização pra reserva de emergência
    suggestions.push({
      triggerCode: 'DCA_CRYPTO',
      title: 'Dolarização mensal (USDC)',
      rationale: 'Diversificar em dólar protege contra oscilação do real',
      suggestedParams: { asset: 'USDC', dayOfMonth: 5, amountBrl: 200 },
      expectedImpact: 'Proteção cambial automática',
      confidence: 0.75,
      priority: 2
    });

    // 4. Compra na queda pra perfil moderado-agressivo
    if (profile.riskProfile !== 'CONSERVATIVE') {
      suggestions.push({
        triggerCode: 'BUY_DIP_STOCK',
        title: 'Caçador de ações na queda',
        rationale: 'Mercado oscila ~15% ao ano. Aproveitar quedas aumenta retorno médio',
        suggestedParams: { ticker: 'ITUB4', dipPct: 3, windowDays: 7, amountBrl: 300, minBalance: 2000 },
        expectedImpact: 'Captura oportunidades 24/7 sem você precisar olhar gráfico',
        confidence: 0.70,
        priority: 3
      });
    }

    // 5. Arredondamento pra todo mundo (engajamento)
    suggestions.push({
      triggerCode: 'ROUND_UP_SAVINGS',
      title: 'Arredondamento de gastos',
      rationale: 'Cada compra no cartão vira micro-investimento. Indolor.',
      suggestedParams: { roundToBrl: 5, destinationFundId: 'XP_SELECTION', maxWeeklyBrl: 50 },
      expectedImpact: '~R$ 100-200/mês investidos sem perceber',
      confidence: 0.95,
      priority: 2
    });

    return suggestions.slice(0, maxSuggestions);
  }

  /**
   * Calcula "perfil de investidor" baseado no saldo + padrão
   */
  detectRiskProfile(profile: FinancialProfile): 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' {
    if (profile.savingsRate < 0.05) return 'CONSERVATIVE';
    if (profile.savingsRate > 0.20 && profile.incomeVariability === 'STABLE') return 'AGGRESSIVE';
    return 'MODERATE';
  }
}
