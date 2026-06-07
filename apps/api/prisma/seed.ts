// @ts-nocheck
// Seed do catálogo de gatilhos
// 20+ gatilhos pré-formatados cobrindo: investimento, banco, consumo, utilidade, seguro

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TRIGGERS = [
  // ============================================
  // INVESTIMENTO — AÇÕES
  // ============================================
  {
    code: 'BUY_DIP_STOCK',
    name: 'Caçador de Ações na Queda',
    description: 'Compra ações automaticamente quando caem X% em uma janela de tempo',
    category: 'INVESTMENT_AUTO',
    destinationType: 'STOCK_BROKER',
    isPremium: false,
    exampleNarrative: 'Compra R$ 500 de ITUB4 se cair 2% em 7 dias, mas só se saldo > R$ 5.000',
    paramsSchema: {
      type: 'object',
      required: ['ticker', 'dipPct', 'windowDays', 'amountBrl'],
      properties: {
        ticker: { type: 'string', description: 'Código da ação (ex: ITUB4, PETR4)' },
        dipPct: { type: 'number', min: 0.1, max: 50, description: 'Queda percentual' },
        windowDays: { type: 'number', enum: [1, 7, 30, 90] },
        amountBrl: { type: 'number', min: 10 },
        minBalance: { type: 'number', default: 0, description: 'Saldo mínimo de segurança' },
        maxExecutionsPerMonth: { type: 'number', default: 4 }
      }
    },
    exampleParams: { ticker: 'ITUB4', dipPct: 2, windowDays: 7, amountBrl: 500, minBalance: 5000 }
  },
  {
    code: 'DCA_STOCK',
    name: 'Aporte Programado em Ação',
    description: 'Compra ação X todo dia D por R$ Y',
    category: 'INVESTMENT_PASSIVE',
    destinationType: 'STOCK_BROKER',
    isPremium: false,
    exampleNarrative: 'Todo dia 10, compra R$ 200 de PETR4',
    paramsSchema: {
      type: 'object',
      required: ['ticker', 'dayOfMonth', 'amountBrl'],
      properties: {
        ticker: { type: 'string' },
        dayOfMonth: { type: 'number', min: 1, max: 28 },
        amountBrl: { type: 'number', min: 10 },
        minBalance: { type: 'number', default: 0 }
      }
    },
    exampleParams: { ticker: 'PETR4', dayOfMonth: 10, amountBrl: 200, minBalance: 1000 }
  },
  {
    code: 'STOP_LOSS_STOCK',
    name: 'Stop-Loss de Ação',
    description: 'Vende ação se cair X% do preço de compra',
    category: 'INVESTMENT_AUTO',
    destinationType: 'STOCK_BROKER',
    isPremium: false,
    exampleNarrative: 'Se ITUB4 cair 10% do preço de compra, vende tudo',
    paramsSchema: {
      type: 'object',
      required: ['ticker', 'lossPct'],
      properties: {
        ticker: { type: 'string' },
        lossPct: { type: 'number', min: 1, max: 50 },
        referencePrice: { type: 'string', enum: ['avg_cost', 'last_buy', 'highest_30d'], default: 'avg_cost' }
      }
    },
    exampleParams: { ticker: 'ITUB4', lossPct: 10, referencePrice: 'avg_cost' }
  },
  {
    code: 'TAKE_PROFIT_STOCK',
    name: 'Take-Profit de Ação',
    description: 'Vende ação se subir X% (trava lucro)',
    category: 'INVESTMENT_AUTO',
    destinationType: 'STOCK_BROKER',
    isPremium: false,
    exampleNarrative: 'Se VALE3 subir 15% do preço de compra, vende 50% da posição',
    paramsSchema: {
      type: 'object',
      required: ['ticker', 'gainPct'],
      properties: {
        ticker: { type: 'string' },
        gainPct: { type: 'number', min: 1, max: 200 },
        sellPct: { type: 'number', min: 10, max: 100, default: 100 }
      }
    },
    exampleParams: { ticker: 'VALE3', gainPct: 15, sellPct: 100 }
  },

  // ============================================
  // INVESTIMENTO — FUNDOS
  // ============================================
  {
    code: 'DCA_FUND',
    name: 'Aporte Programado em Fundo',
    description: 'Aporta em fundo de investimento todo mês',
    category: 'INVESTMENT_PASSIVE',
    destinationType: 'FUND_DISTRIBUTOR',
    isPremium: false,
    exampleNarrative: 'Todo dia 10, aporta R$ 500 no Fundo XP Selection se saldo > R$ 1.000',
    paramsSchema: {
      type: 'object',
      required: ['fundId', 'dayOfMonth', 'amountBrl'],
      properties: {
        fundId: { type: 'string' },
        dayOfMonth: { type: 'number', min: 1, max: 28 },
        amountBrl: { type: 'number', min: 10 },
        minBalance: { type: 'number', default: 0 },
        autoAdjustIfLowBalance: { type: 'boolean', default: true }
      }
    },
    exampleParams: { fundId: 'XP_SELECTION', dayOfMonth: 10, amountBrl: 500, minBalance: 1000 }
  },
  {
    code: 'RASI_CAIXA_FUND',
    name: 'Raspa Caixa → Fundo DI',
    description: 'Move excedente de caixa para fundo de renda fixa',
    category: 'BANKING',
    destinationType: 'FUND_DISTRIBUTOR',
    isPremium: false,
    exampleNarrative: 'Todo dia 7, se saldo > R$ 3.000, move o excedente para fundo DI',
    paramsSchema: {
      type: 'object',
      required: ['fundId', 'minCashReserve', 'dayOfMonth'],
      properties: {
        fundId: { type: 'string', description: 'ID do fundo DI' },
        minCashReserve: { type: 'number', description: 'Saldo mínimo a manter na conta' },
        dayOfMonth: { type: 'number', min: 1, max: 28 },
        maxTransferBrl: { type: 'number', default: 5000 }
      }
    },
    exampleParams: { fundId: 'BTG_PACTUAL_YIELD', minCashReserve: 3000, dayOfMonth: 7, maxTransferBrl: 5000 }
  },
  {
    code: 'YIELD_MAX_FUND',
    name: 'Maximizador de Yield',
    description: 'Move recursos para o fundo com maior yield disponível',
    category: 'INVESTMENT_AUTO',
    destinationType: 'FUND_DISTRIBUTOR',
    isPremium: true,
    exampleNarrative: 'Se o Fundo X render mais que 110% do CDI por 30 dias, migra tudo',
    paramsSchema: {
      type: 'object',
      required: ['fundIds', 'minYieldRatio'],
      properties: {
        fundIds: { type: 'array', items: { type: 'string' } },
        minYieldRatio: { type: 'number', description: 'Rendimento mínimo em % do CDI' },
        rebalanceFreqDays: { type: 'number', default: 30 }
      }
    },
    exampleParams: { fundIds: ['XP_SELECTION', 'BTG_PACTUAL_YIELD', 'ITAU_PERSONALITE'], minYieldRatio: 110, rebalanceFreqDays: 30 }
  },

  // ============================================
  // INVESTIMENTO — CRIPTO
  // ============================================
  {
    code: 'BUY_DIP_CRYPTO',
    name: 'Caçador de Cripto na Queda',
    description: 'Compra cripto quando cai X%',
    category: 'INVESTMENT_AUTO',
    destinationType: 'CRYPTO_EXCHANGE',
    isPremium: false,
    exampleNarrative: 'Compra R$ 200 de USDC se cair 3% em 24h',
    paramsSchema: {
      type: 'object',
      required: ['asset', 'dipPct', 'windowHours', 'amountBrl'],
      properties: {
        asset: { type: 'string', enum: ['USDC', 'USDT', 'BTC', 'ETH', 'PAXG'] },
        dipPct: { type: 'number' },
        windowHours: { type: 'number', enum: [1, 24, 168, 720] },
        amountBrl: { type: 'number' },
        minBalance: { type: 'number', default: 0 }
      }
    },
    exampleParams: { asset: 'USDC', dipPct: 3, windowHours: 24, amountBrl: 200 }
  },
  {
    code: 'DCA_CRYPTO',
    name: 'Dolarização Programada',
    description: 'Compra USDC/USDY todo mês (proteção cambial)',
    category: 'INVESTMENT_PASSIVE',
    destinationType: 'CRYPTO_EXCHANGE',
    isPremium: false,
    exampleNarrative: 'Todo dia 5, compra R$ 500 de USDC',
    paramsSchema: {
      type: 'object',
      required: ['asset', 'dayOfMonth', 'amountBrl'],
      properties: {
        asset: { type: 'string', enum: ['USDC', 'USDT', 'USDY', 'BTC', 'ETH'] },
        dayOfMonth: { type: 'number' },
        amountBrl: { type: 'number' }
      }
    },
    exampleParams: { asset: 'USDC', dayOfMonth: 5, amountBrl: 500 }
  },
  {
    code: 'CRYPTO_PORTFOLIO_REBALANCE',
    name: 'Rebalanceamento Cripto',
    description: 'Mantém proporção alvo entre criptoativos',
    category: 'INVESTMENT_AUTO',
    destinationType: 'CRYPTO_EXCHANGE',
    isPremium: true,
    exampleNarrative: 'Mantém 60% USDC, 30% BTC, 10% ETH — rebalanceia todo dia 1',
    paramsSchema: {
      type: 'object',
      required: ['targetAllocations'],
      properties: {
        targetAllocations: { type: 'object', additionalProperties: { type: 'number' } },
        rebalanceDay: { type: 'number', default: 1 },
        tolerancePct: { type: 'number', default: 5 }
      }
    },
    exampleParams: { targetAllocations: { USDC: 60, BTC: 30, ETH: 10 }, rebalanceDay: 1, tolerancePct: 5 }
  },

  // ============================================
  // BANCÁRIO
  // ============================================
  {
    code: 'ROUND_UP_SAVINGS',
    name: 'Arredondamento de Gastos',
    description: 'Arredonda gastos do cartão e investe o troco',
    category: 'BANKING',
    destinationType: 'FUND_DISTRIBUTOR',
    isPremium: false,
    exampleNarrative: 'Cada compra no cartão é arredondada pra R$ 5, troco vai pro fundo DI',
    paramsSchema: {
      type: 'object',
      required: ['roundToBrl', 'destinationFundId'],
      properties: {
        roundToBrl: { type: 'number', enum: [1, 5, 10, 50, 100] },
        destinationFundId: { type: 'string' },
        maxWeeklyBrl: { type: 'number', default: 100 },
        minTransactionToRound: { type: 'number', default: 5 }
      }
    },
    exampleParams: { roundToBrl: 5, destinationFundId: 'BTG_PACTUAL_YIELD', maxWeeklyBrl: 100 }
  },
  {
    code: 'GOAL_SAVINGS',
    name: 'Guardar pra Meta',
    description: 'Aporta valor fixo até bater uma meta',
    category: 'BANKING',
    destinationType: 'FUND_DISTRIBUTOR',
    isPremium: false,
    exampleNarrative: 'Todo mês aporta R$ 300 na meta "Viagem 2027" até atingir R$ 10.000',
    paramsSchema: {
      type: 'object',
      required: ['goalAmountBrl', 'monthlyAmountBrl', 'destinationFundId'],
      properties: {
        goalName: { type: 'string' },
        goalAmountBrl: { type: 'number' },
        monthlyAmountBrl: { type: 'number' },
        destinationFundId: { type: 'string' },
        deadline: { type: 'string', format: 'date' }
      }
    },
    exampleParams: { goalName: 'Viagem 2027', goalAmountBrl: 10000, monthlyAmountBrl: 300, destinationFundId: 'XP_SELECTION' }
  },
  {
    code: 'SALARY_AUTO_ALLOCATE',
    name: 'Auto-Alocação pós-Salário',
    description: 'Quando cai salário, distribui automaticamente',
    category: 'BANKING',
    destinationType: 'FUND_DISTRIBUTOR',
    isPremium: false,
    exampleNarrative: 'Se receber Pix > R$ 3.000 do meu empregador, separa 20% pra investimento',
    paramsSchema: {
      type: 'object',
      required: ['employerPixKey', 'minSalaryBrl', 'allocationPct'],
      properties: {
        employerPixKey: { type: 'string' },
        minSalaryBrl: { type: 'number' },
        allocationPct: { type: 'number', min: 1, max: 80 },
        destinations: { type: 'array', items: { type: 'object' } }
      }
    },
    exampleParams: { employerPixKey: 'empresa@pix.com', minSalaryBrl: 3000, allocationPct: 20, destinations: [{ type: 'FUND', id: 'XP_SELECTION', pct: 70 }, { type: 'CRYPTO', id: 'USDC', pct: 30 }] }
  },
  {
    code: 'BILL_AUTO_PAY',
    name: 'Pagamento Automático de Conta',
    description: 'Paga conta se valor está dentro de um range',
    category: 'UTILITY',
    destinationType: 'BILL_PAYER',
    isPremium: false,
    exampleNarrative: 'Paga conta de luz se valor < R$ 350',
    paramsSchema: {
      type: 'object',
      required: ['billType', 'maxAmountBrl'],
      properties: {
        billType: { type: 'string', enum: ['ENERGY', 'WATER', 'INTERNET', 'PHONE', 'GAS'] },
        providerId: { type: 'string' },
        maxAmountBrl: { type: 'number' },
        expectedDayOfMonth: { type: 'number' }
      }
    },
    exampleParams: { billType: 'ENERGY', providerId: 'ENEL_SP', maxAmountBrl: 350, expectedDayOfMonth: 15 }
  },

  // ============================================
  // CONSUMO / VAREJO
  // ============================================
  {
    code: 'RECURRING_BUY',
    name: 'Compra Recorrente',
    description: 'Compra produto X a cada N dias se preço está no range',
    category: 'CONSUMPTION',
    destinationType: 'RETAILER',
    isPremium: false,
    exampleNarrative: 'A cada 30 dias compra Biscoito Z se preço entre R$ 5 e R$ 7',
    paramsSchema: {
      type: 'object',
      required: ['sku', 'frequencyDays', 'minPriceBrl', 'maxPriceBrl'],
      properties: {
        sku: { type: 'string' },
        retailerId: { type: 'string' },
        frequencyDays: { type: 'number', min: 1 },
        minPriceBrl: { type: 'number' },
        maxPriceBrl: { type: 'number' },
        quantity: { type: 'number', default: 1 }
      }
    },
    exampleParams: { sku: 'BISCOITO_Z_150G', retailerId: 'MERCADONA', frequencyDays: 30, minPriceBrl: 5, maxPriceBrl: 7, quantity: 2 }
  },
  {
    code: 'PRICE_ALERT_BUY',
    name: 'Alerta de Preço + Compra',
    description: 'Espera produto chegar no preço alvo e compra',
    category: 'CONSUMPTION',
    destinationType: 'RETAILER',
    isPremium: false,
    exampleNarrative: 'Se TV 50" 4K chegar em R$ 2.000, compra',
    paramsSchema: {
      type: 'object',
      required: ['sku', 'targetPriceBrl'],
      properties: {
        sku: { type: 'string' },
        retailerId: { type: 'string' },
        targetPriceBrl: { type: 'number' },
        currentPriceBrl: { type: 'number', description: 'Preço atual (pra calcular queda)' },
        checkFrequencyHours: { type: 'number', default: 6 }
      }
    },
    exampleParams: { sku: 'TV_50_4K_SAMSUNG', retailerId: 'MAGAZINE_LUIZA', targetPriceBrl: 2000, currentPriceBrl: 2499, checkFrequencyHours: 6 }
  },
  {
    code: 'GIFT_AUTO_BUY',
    name: 'Presente Automático',
    description: 'Compra presente automaticamente em datas especiais',
    category: 'CONSUMPTION',
    destinationType: 'RETAILER',
    isPremium: false,
    exampleNarrative: 'Compra presente de até R$ 100 pro João no dia 15/03 (aniversário)',
    paramsSchema: {
      type: 'object',
      required: ['recipientName', 'date', 'maxAmountBrl', 'sku'],
      properties: {
        recipientName: { type: 'string' },
        date: { type: 'string', format: 'date' },
        maxAmountBrl: { type: 'number' },
        sku: { type: 'string' },
        retailerId: { type: 'string' }
      }
    },
    exampleParams: { recipientName: 'João', date: '2027-03-15', maxAmountBrl: 100, sku: 'LIVRO_X', retailerId: 'AMAZON' }
  },
  // ============================================
  // CONSUMO CONTEXTUAL — Baseado em Contexto Financeiro Real
  // (Recuperação de carrinho abandonado + compra por gatilho do dia a dia)
  // ============================================
  {
    code: 'BALANCE_TRIGGER_BUY',
    name: 'Comprar Quando o Saldo Subir',
    description: 'Compra produto automaticamente quando o saldo da conta passar de X',
    category: 'CONSUMPTION',
    destinationType: 'RETAILER',
    isPremium: false,
    exampleNarrative: 'Compra o perfume quando meu saldo passar de R$ 3.000',
    paramsSchema: {
      type: 'object',
      required: ['sku', 'minBalance'],
      properties: {
        sku: { type: 'string' },
        minBalance: { type: 'number', description: 'Saldo mínimo pra disparar compra' },
        maxWaitDays: { type: 'number', default: 90, description: 'Desiste após X dias' }
      }
    },
    exampleParams: { sku: 'PERFUME_IMPORTADO_X', minBalance: 3000, maxWaitDays: 90 }
  },
  {
    code: 'GOAL_ACCUMULATION_BUY',
    name: 'Guardar Pra Comprar',
    description: 'Acumula valor semanal via Pix → subconta até bater o preço do produto, então compra',
    category: 'CONSUMPTION',
    destinationType: 'RETAILER',
    isPremium: false,
    exampleNarrative: 'Guarda R$ 50/semana até juntar R$ 500 e compra o perfume',
    paramsSchema: {
      type: 'object',
      required: ['sku', 'weeklyAmount', 'targetAmount'],
      properties: {
        sku: { type: 'string' },
        weeklyAmount: { type: 'number' },
        targetAmount: { type: 'number' },
        startDate: { type: 'string', format: 'date' }
      }
    },
    exampleParams: { sku: 'PERFUME_Y', weeklyAmount: 50, targetAmount: 500 }
  },
  {
    code: 'POST_BILLS_BUY',
    name: 'Comprar Depois das Contas',
    description: 'Dispara compra no dia X apenas se todas as contas fixas do mês já foram pagas E sobrar saldo mínimo',
    category: 'CONSUMPTION',
    destinationType: 'RETAILER',
    isPremium: false,
    exampleNarrative: 'No dia 20, se todas as contas foram pagas e sobrar R$ 1.000, compra o perfume',
    paramsSchema: {
      type: 'object',
      required: ['sku', 'dayOfMonth', 'minBalanceAfterBills'],
      properties: {
        sku: { type: 'string' },
        dayOfMonth: { type: 'number', min: 1, max: 28 },
        minBalanceAfterBills: { type: 'number' }
      }
    },
    exampleParams: { sku: 'PERFUME_Z', dayOfMonth: 20, minBalanceAfterBills: 1000 }
  },
  {
    code: 'SALARY_TRIGGER_BUY',
    name: 'Comprar Quando Cair Salário',
    description: 'Compra se detectar crédito salarial maior que X no mês corrente',
    category: 'CONSUMPTION',
    destinationType: 'RETAILER',
    isPremium: false,
    exampleNarrative: 'Se eu receber mais de R$ 4.000 de salário este mês, compra o perfume',
    paramsSchema: {
      type: 'object',
      required: ['sku', 'minSalary'],
      properties: {
        sku: { type: 'string' },
        minSalary: { type: 'number' },
        maxAmountBrl: { type: 'number' }
      }
    },
    exampleParams: { sku: 'PERFUME_W', minSalary: 4000, maxAmountBrl: 600 }
  },
  {
    code: 'AUTO_BUY_ON_RESTOCK',
    name: 'Comprar Quando Voltar ao Estoque',
    description: 'Espera produto voltar ao estoque e compra automaticamente',
    category: 'CONSUMPTION',
    destinationType: 'RETAILER',
    isPremium: false,
    exampleNarrative: 'Quando o perfume voltar disponível, compra (até R$ 550)',
    paramsSchema: {
      type: 'object',
      required: ['sku'],
      properties: {
        sku: { type: 'string' },
        maxPriceBrl: { type: 'number' }
      }
    },
    exampleParams: { sku: 'PERFUME_RARO_V', maxPriceBrl: 550 }
  },
  {
    code: 'GROCERY_REPLENISHMENT',
    name: 'Reposição de Mercado',
    description: 'Detecta quando item acaba e compra novamente',
    category: 'CONSUMPTION',
    destinationType: 'RETAILER',
    isPremium: true,
    exampleNarrative: 'Quando não comprar Leite Integral por 7 dias, adiciona ao carrinho',
    paramsSchema: {
      type: 'object',
      required: ['sku', 'daysSinceLastPurchase', 'retailerId'],
      properties: {
        sku: { type: 'string' },
        retailerId: { type: 'string' },
        daysSinceLastPurchase: { type: 'number' },
        quantity: { type: 'number', default: 1 }
      }
    },
    exampleParams: { sku: 'LEITE_INTEGRAL_1L', retailerId: 'MERCADONA', daysSinceLastPurchase: 7, quantity: 4 }
  },

  // ============================================
  // SEGURO
  // ============================================
  {
    code: 'AUTO_PAY_INSURANCE',
    name: 'Seguro em Dia',
    description: 'Paga prêmio de seguro automaticamente',
    category: 'INSURANCE',
    destinationType: 'INSURER',
    isPremium: false,
    exampleNarrative: 'Paga seguro do carro todo dia 25',
    paramsSchema: {
      type: 'object',
      required: ['policyId', 'dayOfMonth'],
      properties: {
        policyId: { type: 'string' },
        dayOfMonth: { type: 'number' },
        maxAmountBrl: { type: 'number' }
      }
    },
    exampleParams: { policyId: 'PORTO_AUTO_12345', dayOfMonth: 25, maxAmountBrl: 350 }
  },

  // ============================================
  // CUSTOM (IA)
  // ============================================
  {
    code: 'CUSTOM_NL',
    name: 'Regra em Linguagem Natural',
    description: 'Descreva a regra em português, a IA estrutura pra você',
    category: 'CUSTOM',
    destinationType: 'AUTO_DETECT',
    isPremium: true,
    exampleNarrative: '"Se eu receber mais de R$ 3.000 nos próximos 5 dias, compra 60% em fundo e 40% em USDC"',
    paramsSchema: {
      type: 'object',
      required: ['naturalLanguageRule'],
      properties: {
        naturalLanguageRule: { type: 'string', minLength: 10, maxLength: 500 },
        safetyLimitBrl: { type: 'number', description: 'Teto máximo por execução' }
      }
    },
    exampleParams: { naturalLanguageRule: 'Se eu receber mais de R$ 3.000 nos próximos 5 dias, compra 60% em fundo e 40% em USDC', safetyLimitBrl: 1000 }
  }
];

async function main() {
  console.log('🌱 Seeding trigger catalog...');

  for (const trigger of TRIGGERS) {
    await prisma.triggerCatalog.upsert({
      where: { code: trigger.code },
      update: trigger,
      create: trigger
    });
    console.log(`  ✓ ${trigger.code} — ${trigger.name}`);
  }

  // Seed de parceiros demo
  console.log('\n🌱 Seeding demo partners...');
  
  await prisma.partner.upsert({
    where: { slug: 'corretora-demo' },
    update: {},
    create: {
      slug: 'corretora-demo',
      name: 'Corretora Demo',
      type: 'BROKER',
      status: 'ACTIVE',
      tier: 'GROWTH',
      config: {
        stockAdapter: 'MOCK_STOCK_BROKER',
        openFinanceProvider: 'EFI_MOCK',
        enabledTriggers: ['BUY_DIP_STOCK', 'DCA_STOCK', 'STOP_LOSS_STOCK', 'TAKE_PROFIT_STOCK'],
        commissionRate: 0.005
      },
      webhookUrl: 'https://webhook.site/demo-corretora',
      monthlyFeeBrl: 8000,
      takeRateBrl: 0.12,
      maxMau: 10000
    }
  });

  await prisma.partner.upsert({
    where: { slug: 'fundo-demo' },
    update: {},
    create: {
      slug: 'fundo-demo',
      name: 'Distribuidora Demo',
      type: 'FUND_DISTRIBUTOR',
      status: 'ACTIVE',
      tier: 'GROWTH',
      config: {
        fundAdapter: 'MOCK_FUND_DISTRIBUTOR',
        openFinanceProvider: 'EFI_MOCK',
        enabledTriggers: ['DCA_FUND', 'RASI_CAIXA_FUND', 'ROUND_UP_SAVINGS', 'GOAL_SAVINGS']
      },
      monthlyFeeBrl: 8000,
      takeRateBrl: 0.20
    }
  });

  await prisma.partner.upsert({
    where: { slug: 'varejo-demo' },
    update: {},
    create: {
      slug: 'varejo-demo',
      name: 'Varejo Demo',
      type: 'RETAILER',
      status: 'ACTIVE',
      tier: 'STARTER',
      config: {
        retailerAdapter: 'MOCK_RETAILER',
        openFinanceProvider: 'EFI_MOCK',
        enabledTriggers: ['RECURRING_BUY', 'PRICE_ALERT_BUY', 'GIFT_AUTO_BUY']
      },
      monthlyFeeBrl: 2500,
      takeRateBrl: 0.30
    }
  });

  // Seed de usuários fake
  console.log('\n🌱 Seeding demo consumers...');
  
  const partner = await prisma.partner.findUnique({ where: { slug: 'corretora-demo' } });
  if (partner) {
    for (let i = 1; i <= 3; i++) {
      const user = await prisma.consumerUser.upsert({
        where: { partnerId_externalUserId: { partnerId: partner.id, externalUserId: `demo-user-${i}` } },
        update: {},
        create: {
          partnerId: partner.id,
          externalUserId: `demo-user-${i}`,
          email: `user${i}@demo.com`,
          name: `Usuário Demo ${i}`,
          consentStatus: 'ACTIVE',
          bankName: 'Itaú',
          bankAccountMask: '0001-9 / 12345-6',
          notifyChannels: ['PUSH', 'EMAIL']
        }
      });

      // Criar 2 gatilhos por usuário
      await prisma.trigger.create({
        data: {
          partnerId: partner.id,
          userId: user.id,
          code: 'BUY_DIP_STOCK',
          name: 'ITUB4 na queda',
          description: 'Compra ITUB4 quando cair 2%',
          status: 'ACTIVE',
          params: { ticker: 'ITUB4', dipPct: 2, windowDays: 7, amountBrl: 500, minBalance: 5000 },
          nextEvaluationAt: new Date()
        }
      });

      await prisma.trigger.create({
        data: {
          partnerId: partner.id,
          userId: user.id,
          code: 'DCA_STOCK',
          name: 'Aporte mensal PETR4',
          status: 'ACTIVE',
          params: { ticker: 'PETR4', dayOfMonth: 10, amountBrl: 200, minBalance: 1000 }
        }
      });
    }
  }

  console.log('\n✅ Seed completo!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
