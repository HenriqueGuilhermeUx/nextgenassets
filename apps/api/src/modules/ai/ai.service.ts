// ============================================
//  AI SERVICE — Tradução de Linguagem Natural → Regra Estruturada
// ============================================
// Usa OpenAI Structured Outputs (JSON Mode) pra converter texto do usuário
// em JSON determinístico que alimenta o motor de regras.

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

const RULE_SCHEMA = {
  type: 'object',
  properties: {
    ruleType: {
      type: 'string',
      enum: [
        'BUY_DIP_STOCK', 'DCA_STOCK', 'STOP_LOSS_STOCK', 'TAKE_PROFIT_STOCK',
        'DCA_FUND', 'RASI_CAIXA_FUND', 'YIELD_MAX_FUND',
        'BUY_DIP_CRYPTO', 'DCA_CRYPTO', 'CRYPTO_PORTFOLIO_REBALANCE',
        'ROUND_UP_SAVINGS', 'GOAL_SAVINGS', 'SALARY_AUTO_ALLOCATE',
        'BILL_AUTO_PAY', 'RECURRING_BUY', 'PRICE_ALERT_BUY',
        'GIFT_AUTO_BUY', 'GROCERY_REPLENISHMENT', 'AUTO_PAY_INSURANCE'
      ],
      description: 'Tipo do gatilho identificado'
    },
    destinationType: {
      type: 'string',
      enum: ['STOCK_BROKER', 'FUND_DISTRIBUTOR', 'CRYPTO_EXCHANGE', 'RETAILER', 'BILL_PAYER', 'INSURER', 'BANK_ACCOUNT']
    },
    params: {
      type: 'object',
      description: 'Parâmetros da regra (varia por tipo)',
      additionalProperties: true
    },
    safetyLimits: {
      type: 'object',
      properties: {
        maxAmountBrl: { type: 'number', description: 'Teto por execução' },
        maxTotalSpendBrl: { type: 'number', description: 'Teto total' },
        minBalance: { type: 'number', description: 'Saldo mínimo de segurança' },
        requiresConfirmation: { type: 'boolean', description: 'Se deve pedir confirmação antes de executar' }
      }
    },
    explanation: {
      type: 'string',
      description: 'Resumo em português do que a IA entendeu (1-2 frases)'
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
      description: 'Possíveis problemas identificados (ex: valor muito alto)'
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confiança da IA na interpretação (0-1)'
    }
  },
  required: ['ruleType', 'destinationType', 'params', 'explanation', 'confidence']
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.logger.log('✅ OpenAI client initialized');
    } else {
      this.logger.warn('⚠️  OPENAI_API_KEY not set — AI features will return mock responses');
    }
  }

  /**
   * Traduz uma regra em linguagem natural pra JSON estruturado.
   */
  async translateRule(naturalLanguage: string, context?: { userBalance?: number; recentTransactions?: any[] }): Promise<any> {
    if (!this.openai) {
      return this.mockTranslation(naturalLanguage);
    }

    const systemPrompt = `Você é o assistente de finanças do Orkest. Sua função é interpretar regras financeiras em português brasileiro e traduzi-las para JSON estruturado que será executado automaticamente.

Você é EXTREMAMENTE conservador com valores. Sempre que o usuário mencionar um valor, você extrai. Quando não mencionar, você pergunta ou usa defaults sensatos.

Se a regra for ambígua, perigosa ou ilegal, você marca requiresConfirmation=true e adiciona warnings.

Contexto do usuário: ${JSON.stringify(context || {})}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Interprete esta regra financeira: "${naturalLanguage}"` }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'financial_rule',
            schema: RULE_SCHEMA,
            strict: true
          }
        },
        temperature: 0.2  // baixa criatividade = mais determinístico
      });

      const result = JSON.parse(response.choices[0].message.content);
      this.logger.log(`✅ Translated NL rule: ${result.ruleType} (confidence: ${result.confidence})`);
      return result;
    } catch (err) {
      this.logger.error(`OpenAI failed: ${err.message}`);
      return this.mockTranslation(naturalLanguage);
    }
  }

  /**
   * Gera insights de gastos do consumidor (relatório mensal).
   */
  async generateMonthlyInsights(data: {
    userId: string;
    month: string;
    totalSpent: number;
    totalInvested: number;
    triggersExecuted: number;
    topCategories: { category: string; amount: number }[];
  }): Promise<string> {
    if (!this.openai) {
      return `Você gastou R$ ${data.totalSpent.toFixed(2)} e investiu R$ ${data.totalInvested.toFixed(2)} em ${data.triggersExecuted} gatilhos automáticos este mês. Continue assim!`;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você gera insights financeiros personalizados em português brasileiro. Seja conciso (2-3 frases), positivo mas realista.' },
          { role: 'user', content: `Gere insight pra este mês: ${JSON.stringify(data)}` }
        ],
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch {
      return `Você investiu R$ ${data.totalInvested.toFixed(2)} automaticamente em ${data.triggersExecuted} gatilhos este mês.`;
    }
  }

  /**
   * Fallback de tradução quando OpenAI não está disponível.
   * Usa regex simples pra extrair o básico.
   */
  private mockTranslation(nl: string): any {
    const lower = nl.toLowerCase();

    // Detecção simples
    if (lower.includes('queda') || lower.includes('cair') || lower.includes('dip')) {
      const dipMatch = lower.match(/(\d+)\s*%/);
      const amountMatch = lower.match(/r\$\s*(\d+)/i);
      return {
        ruleType: 'BUY_DIP_STOCK',
        destinationType: 'STOCK_BROKER',
        params: { dipPct: dipMatch ? parseFloat(dipMatch[1]) : 2 },
        safetyLimits: { maxAmountBrl: amountMatch ? parseFloat(amountMatch[1]) : 500 },
        explanation: 'Comprar ação na queda detectada.',
        warnings: ['Tradução automática — verifique os parâmetros antes de ativar'],
        confidence: 0.6
      };
    }

    if (lower.includes('todo dia') || lower.includes('todo mês') || lower.includes('mensal')) {
      const amountMatch = lower.match(/r\$\s*(\d+)/i);
      return {
        ruleType: 'DCA_STOCK',
        destinationType: 'STOCK_BROKER',
        params: { dayOfMonth: 10 },
        safetyLimits: { maxAmountBrl: amountMatch ? parseFloat(amountMatch[1]) : 200 },
        explanation: 'Aporte programado detectado.',
        warnings: ['Tradução automática — verifique os parâmetros antes de ativar'],
        confidence: 0.5
      };
    }

    return {
      ruleType: 'CUSTOM_NL',
      destinationType: 'AUTO_DETECT',
      params: { naturalLanguageRule: nl },
      explanation: 'Não conseguimos identificar o tipo de gatilho automaticamente. Configuração manual necessária.',
      warnings: ['Requer revisão manual'],
      confidence: 0.2
    };
  }
}
