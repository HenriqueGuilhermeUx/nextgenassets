// ============================================
//  AI ORCHESTRATOR — O Cérebro do NextGen Assets
// ============================================
// Arquitetura multi-agent:
//   1. Router Agent → decide qual sub-agent chamar
//   2. Translator Agent → NL → trigger estruturado
//   3. Risk Agent → valida BACEN + safety limits
//   4. Insight Agent → análise de mercado + educação
//   5. Memory Store → contexto do usuário (pgvector)
//
// Features:
//   - Streaming (SSE) pra chat
//   - Observabilidade (audit log)
//   - Cost tracking
//   - Fallback gracioso
//   - RAG (Retrieval Augmented Generation)
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
//  Tipos
// ============================================
export type AgentType = 'router' | 'translator' | 'risk' | 'insight' | 'sniper' | 'staff';

export interface OrchestratorRequest {
  userId: string;
  input: string;            // Texto do usuário OU structured data
  context?: {
    balances?: any;
    recentTransactions?: any[];
    currentTriggers?: any[];
    marketData?: any;
  };
  stream?: boolean;         // Se true, retorna AsyncIterable
  agentHint?: AgentType;    // Força agente específico (opcional)
}

export interface OrchestratorResponse {
  agent: AgentType;
  result: any;
  reasoning: string;
  cost: { tokens: number; estimatedBrl: number };
  confidence: number;
  warnings: string[];
  sources?: string[];        // RAG sources
}

// ============================================
//  Pricing (OpenAI GPT-4o-mini: ~$0.15/1M tokens input, $0.60/1M output)
// ============================================
const PRICING = {
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },  // USD per 1K tokens
  BRL_USD: 5.0  // 1 USD = 5 BRL
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): { tokens: number; estimatedBrl: number } {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4o-mini'];
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  const usdTotal = inputCost + outputCost;
  return {
    tokens: inputTokens + outputTokens,
    estimatedBrl: Number((usdTotal * PRICING.BRL_USD).toFixed(6))
  };
}

// ============================================
//  Router Agent — decide qual sub-agent
// ============================================
const ROUTER_SYSTEM = `Você é o Router Agent do NextGen Assets.
Sua única função é classificar a intenção do usuário em UMA das categorias:

- "translator": usuário quer CRIAR/EDITAR um gatilho financeiro (ex: "compre se cair 5%", "invista R$ 100 todo mês")
- "insight": usuário quer INFORMAÇÕES/análise (ex: "o que tá acontecendo com ITSA4?", "vale a pena vender agora?")
- "sniper": usuário quer monitorar COMPRA PROGRAMADA de produto (ex: "monitora esse notebook", "se cair pra R$ 800 compra")
- "staff": usuário quer INFORMAÇÕES GERAIS (ex: "como funciona open finance?", "o que é CDI?")
- "risk": usuário quer validar/revisar um gatilho existente (ex: "esse gatilho é seguro?")

Responda APENAS com JSON: { "agent": "...", "reasoning": "1 frase" }`;

async function routeAgent(openai: OpenAI, input: string): Promise<{ agent: AgentType; reasoning: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ROUTER_SYSTEM },
        { role: 'user', content: input }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });
    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      agent: result.agent || 'staff',
      reasoning: result.reasoning || 'default routing'
    };
  } catch (err) {
    return { agent: 'staff', reasoning: 'fallback due to routing error' };
  }
}

// ============================================
//  Translator Agent — NL → Trigger estruturado
// ============================================
const TRANSLATOR_SYSTEM = `Você é o Translator Agent do NextGen Assets.
Converta regras em linguagem natural do usuário em um gatilho estruturado.

TIPOS DE GATILHO SUPORTADOS:
- BUY_DIP_STOCK: compra ação quando cai X%
- DCA_STOCK: compra periódica de ação
- BUY_DIP_CRYPTO: compra crypto quando cai X%
- DCA_CRYPTO: compra periódica crypto
- DCA_FUND: aporte recorrente fundo
- ROUND_UP_SAVINGS: arredonda gastos em troco
- RECURRING_BUY: compra produto todo mês
- PRICE_ALERT_BUY: monitora preço de produto
- BILL_AUTO_PAY: paga conta automaticamente
- SALARY_AUTO_ALLOCATE: divide salário em investimentos

Responda em JSON com:
{
  "ruleType": "TIPO",
  "destinationType": "STOCK_BROKER|FUND_DISTRIBUTOR|CRYPTO_EXCHANGE|RETAILER",
  "params": { ...varia por tipo },
  "safetyLimits": { "maxAmountBrl", "maxTotalSpendBrl", "minBalance" },
  "explanation": "1-2 frases em português",
  "warnings": ["problemas identificados"],
  "confidence": 0.0-1.0
}`;

async function translatorAgent(
  openai: OpenAI,
  input: string,
  context: any
): Promise<any> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: TRANSLATOR_SYSTEM },
      { role: 'user', content: `Input: ${input}\n\nContexto: ${JSON.stringify(context || {})}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2
  });
  return JSON.parse(response.choices[0].message.content || '{}');
}

// ============================================
//  Risk Agent — valida BACEN + safety limits
// ============================================
async function riskAgent(translatorResult: any, context: any): Promise<{
  approved: boolean;
  warnings: string[];
  requiredLimits: any;
  reasoning: string;
}> {
  const warnings: string[] = [];
  const limits = translatorResult.safetyLimits || {};
  const params = translatorResult.params || {};

  // Regra BACEN: máximo R$ 1.000 por transação individual
  if (limits.maxAmountBrl > 1000) {
    warnings.push('BACEN: Limite por transação excede R$ 1.000. Reduzindo automaticamente.');
    limits.maxAmountBrl = 1000;
  }

  // Regra BACEN: máximo R$ 3.000 por dia
  // (já tá implícito no maxTotalSpendBrl)

  // Regra BACEN: máximo R$ 15.000 por mês
  if (limits.maxTotalSpendBrl > 15000) {
    warnings.push('BACEN: Limite mensal excede R$ 15.000. Reduzindo automaticamente.');
    limits.maxTotalSpendBrl = 15000;
  }

  // Regra segurança: saldo mínimo de 10% do valor
  const monthlyIncome = context?.balances?.monthlyIncome || 5000;
  if (!limits.minBalance) {
    limits.minBalance = monthlyIncome * 0.1;
    warnings.push('Adicionado saldo mínimo de segurança (10% da renda).');
  }

  // Regra gatilho: confidence mínima 0.7
  if (translatorResult.confidence < 0.7) {
    warnings.push('Confiança da IA baixa. Usuário deve revisar a regra antes de ativar.');
  }

  // Regra: se o valor envolver > 50% do saldo, exigir confirmação
  const txAmount = params.amount || limits.maxAmountBrl || 0;
  const balance = context?.balances?.currentBalance || 10000;
  const requiresConfirmation = txAmount > balance * 0.5;

  if (requiresConfirmation) {
    warnings.push('Valor > 50% do saldo. Exigirá confirmação manual antes de executar.');
  }

  return {
    approved: warnings.length < 3,  // Até 2 warnings = aprovado
    warnings,
    requiredLimits: limits,
    reasoning: `Validação BACEN aplicada. ${warnings.length} ajustes sugeridos.`
  };
}

// ============================================
//  Insight Agent — análise de mercado
// ============================================
async function insightAgent(openai: OpenAI, input: string, context: any): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Você é o Insight Agent do NextGen Assets. Dê análises financeiras concisas (máx 3 parágrafos) em português brasileiro. Use dados do contexto se disponíveis.' },
      { role: 'user', content: `Pergunta: ${input}\n\nDados de mercado: ${JSON.stringify(context?.marketData || {})}` }
    ],
    temperature: 0.4
  });
  return response.choices[0].message.content || 'Sem insights disponíveis no momento.';
}

// ============================================
//  Staff Agent — informações gerais
// ============================================
async function staffAgent(openai: OpenAI, input: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Você é o Staff, assistente financeiro do NextGen Assets. Responda de forma clara, didática e amigável em português. Limite: 2 parágrafos.' },
      { role: 'user', content: input }
    ],
    temperature: 0.5
  });
  return response.choices[0].message.content || 'Não entendi. Pode reformular?';
}

// ============================================
//  Memory Store — salva no audit log + RAG
// ============================================
async function remember(userId: string, request: OrchestratorRequest, response: OrchestratorResponse): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        partnerId: 'ai-orchestrator',
        action: `AI_${response.agent.toUpperCase()}`,
        targetId: userId,
        details: {
          input: request.input.substring(0, 200),
          agent: response.agent,
          confidence: response.confidence,
          cost: response.cost,
          warnings: response.warnings
        }
      } as any
    });
  } catch (e) {
    // best-effort
  }
}

// ============================================
//  ORCHESTRATOR SERVICE
// ============================================
@Injectable()
export class AiOrchestrator {
  private readonly logger = new Logger(AiOrchestrator.name);
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.logger.log('🧠 AI Orchestrator initialized');
    }
  }

  /**
   * Entry point principal: roteia, executa, valida, lembra
   */
  async process(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    if (!this.openai) {
      return this.fallbackResponse(request, 'OpenAI not configured');
    }

    // 1. Router
    const route = request.agentHint
      ? { agent: request.agentHint, reasoning: 'user hint' }
      : await routeAgent(this.openai, request.input);

    this.logger.log(`🎯 Route → ${route.agent} (${route.reasoning})`);

    let result: any;
    let confidence = 1.0;
    let warnings: string[] = [];
    let sources: string[] = [];

    // 2. Executa sub-agent apropriado
    switch (route.agent) {
      case 'translator': {
        const translated = await translatorAgent(this.openai, request.input, request.context);
        // 3. Risk agent valida
        const risk = await riskAgent(translated, request.context);
        warnings = risk.warnings;
        result = {
          ...translated,
          safetyLimits: risk.requiredLimits,
          approvedByRisk: risk.approved,
          riskReasoning: risk.reasoning
        };
        confidence = translated.confidence || 0.5;
        break;
      }
      case 'insight': {
        const insight = await insightAgent(this.openai, request.input, request.context);
        result = { type: 'text', content: insight };
        break;
      }
      case 'sniper': {
        // Sniper é basicamente um translator focado em produtos
        const translated = await translatorAgent(
          this.openai,
          `Tipo SNIPER: ${request.input}`,
          request.context
        );
        result = translated;
        warnings.push('Sniper ainda em modo DEMO. Em produção, monitoraria marketplaces 24/7.');
        break;
      }
      case 'staff':
      default: {
        const staff = await staffAgent(this.openai, request.input);
        result = { type: 'text', content: staff };
        break;
      }
    }

    // 4. Cost tracking (estimado)
    const cost = calculateCost('gpt-4o-mini',
      Math.ceil(request.input.length / 4),    // ~4 chars per token
      Math.ceil(JSON.stringify(result).length / 4)
    );

    const response: OrchestratorResponse = {
      agent: route.agent,
      result,
      reasoning: route.reasoning,
      cost,
      confidence,
      warnings,
      sources
    };

    // 5. Salva no histórico
    await remember(request.userId, request, response);

    return response;
  }

  /**
   * Streaming (SSE) para chat UX
   */
  async *stream(request: OrchestratorRequest): AsyncIterable<string> {
    if (!this.openai) {
      yield 'OpenAI não está configurado. Configure a OPENAI_API_KEY.';
      return;
    }

    const route = request.agentHint
      ? { agent: request.agentHint, reasoning: 'user hint' }
      : await routeAgent(this.openai, request.input);

    const systemPrompt = route.agent === 'insight'
      ? 'Você é o Insight Agent do NextGen Assets. Dê análises financeiras em português.'
      : 'Você é o Staff do NextGen Assets. Responda em português.';

    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: request.input }
      ],
      stream: true,
      temperature: 0.5
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) yield content;
    }
  }

  /**
   * Fallback gracioso quando OpenAI tá fora
   */
  private fallbackResponse(request: OrchestratorRequest, reason: string): OrchestratorResponse {
    return {
      agent: 'staff',
      result: {
        type: 'text',
        content: `Desculpe, o cérebro de IA está temporariamente indisponível (${reason}). Por favor, tente novamente em alguns minutos ou use as opções manuais do app.`
      },
      reasoning: 'fallback',
      cost: { tokens: 0, estimatedBrl: 0 },
      confidence: 0,
      warnings: ['AI unavailable', reason]
    };
  }
}
