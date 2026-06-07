// ============================================
//  CENÁRIOS DE TESTE — End-to-End
// ============================================
// Roda 8 cenários que exercitam o sistema completo.

import { PrismaClient } from '@prisma/client';
import { TriggerEngine } from '../modules/triggers/trigger-engine';
import { AiService } from '../modules/ai/ai.service';
import { MarketDataService } from '../modules/market-data/market-data.service';
import { BankTransferService } from '../modules/open-finance/bank-transfer.service';
import { DestinationRegistry } from '../modules/destinations/destination-registry';
import { MockStockBroker } from '../modules/destinations/mock-providers/mock-stock-broker';
import { MockFundDistributor } from '../modules/destinations/mock-providers/mock-fund-distributor';
import { MockCryptoExchange } from '../modules/destinations/mock-providers/mock-crypto-exchange';
import { MockBankTransfer } from '../modules/destinations/mock-providers/mock-bank-transfer';
import { MockRetailer } from '../modules/destinations/mock-providers/mock-retailer';
import { ShopifyAdapter } from '../modules/destinations/providers/shopify-adapter';
import { WooCommerceAdapter } from '../modules/destinations/providers/woocommerce-adapter';
import { MercadoLivreAdapter } from '../modules/destinations/providers/mercado-livre-adapter';
import { MagaluAdapter } from '../modules/destinations/providers/magalu-adapter';
import { NubankOpenFinanceAdapter } from '../modules/destinations/providers/nubank-openfinance-adapter';
import { VtexAdapter } from '../modules/destinations/providers/vtex-adapter';
import { IFoodAdapter } from '../modules/destinations/providers/ifood-adapter';
import { RappiAdapter } from '../modules/destinations/providers/rappi-adapter';

const prisma = new PrismaClient();
const marketData = new MarketDataService();
const mockBank = new MockBankTransfer();
const mockStock = new MockStockBroker();
const mockFund = new MockFundDistributor();
const mockCrypto = new MockCryptoExchange();
const mockRetailer = new MockRetailer();
const shopify = new ShopifyAdapter();
const woocommerce = new WooCommerceAdapter();
const mercadoLivre = new MercadoLivreAdapter();
const magalu = new MagaluAdapter();
const nubank = new NubankOpenFinanceAdapter();
const vtex = new VtexAdapter();
const ifood = new IFoodAdapter();
const rappi = new RappiAdapter();
const destinations = new DestinationRegistry(
  mockStock, mockFund, mockCrypto, mockBank, mockRetailer,
  shopify, woocommerce, mercadoLivre, magalu, nubank, vtex,
  ifood, rappi
);
const bankService = new BankTransferService(destinations);
const aiService = new AiService();
const triggerEngine = new TriggerEngine(
  { add: async () => {} } as any,  // queues mockadas
  { add: async () => {} } as any,
  destinations,
  marketData,
  bankService
);

const log = (emoji: string, msg: string) => console.log(`${emoji}  ${msg}`);

async function setup() {
  log('🔧', 'Configurando dados de teste...');
  const partner = await prisma.partner.findUnique({ where: { slug: 'corretora-demo' } });
  const user = await prisma.consumerUser.findFirst({ where: { partnerId: partner.id } });
  return { partner, user };
}

async function scenario1_happyPath() {
  log('\n📋', 'Cenário 1: Happy Path — Buy the Dip dispara e executa');
  const { partner, user } = await setup();

  const trigger = await prisma.trigger.create({
    data: {
      partnerId: partner.id,
      userId: user.id,
      code: 'BUY_DIP_STOCK',
      name: 'Teste cenário 1',
      params: { ticker: 'ITUB4', dipPct: 0.5, windowDays: 7, amountBrl: 200, minBalance: 1000 },
      status: 'ACTIVE'
    }
  });

  const result = await triggerEngine.evaluateTrigger(trigger.id);
  log('   ', `Avaliação: ${result.shouldFire ? '✅ FIRE' : '❌ SKIP'} — ${result.reason}`);

  if (result.shouldFire) {
    await triggerEngine.executeTrigger(trigger.id, result.data);
    const exec = await prisma.execution.findFirst({ where: { triggerId: trigger.id }, orderBy: { createdAt: 'desc' } });
    log('   ', `Execução: ${exec.status} (${exec.externalId || 'pendente'})`);
  }
}

async function scenario2_balanceGate() {
  log('\n📋', 'Cenário 2: Gate de saldo bloqueia');
  const { partner, user } = await setup();

  const trigger = await prisma.trigger.create({
    data: {
      partnerId: partner.id,
      userId: user.id,
      code: 'BUY_DIP_STOCK',
      name: 'Teste cenário 2',
      params: { ticker: 'PETR4', dipPct: 0.5, windowDays: 7, amountBrl: 5000, minBalance: 50000 }, // impossível
      status: 'ACTIVE'
    }
  });

  const result = await triggerEngine.evaluateTrigger(trigger.id);
  log('   ', `Resultado: ${result.shouldFire ? 'FIRE' : '❌ BLOQUEADO'} — ${result.reason}`);
}

async function scenario3_dcaOnDate() {
  log('\n📋', 'Cenário 3: DCA com gate de dia do mês');
  const { partner, user } = await setup();
  const today = new Date();

  const trigger = await prisma.trigger.create({
    data: {
      partnerId: partner.id,
      userId: user.id,
      code: 'DCA_STOCK',
      name: 'Teste cenário 3',
      params: { ticker: 'VALE3', dayOfMonth: today.getDate(), amountBrl: 100, minBalance: 0 },
      status: 'ACTIVE'
    }
  });

  const result = await triggerEngine.evaluateTrigger(trigger.id);
  log('   ', `Resultado: ${result.shouldFire ? '✅ FIRE (dia correto)' : '❌ SKIP'} — ${result.reason}`);
}

async function scenario4_aiTranslation() {
  log('\n📋', 'Cenário 4: IA traduz linguagem natural');
  const result = await aiService.translateRule(
    'Compra R$ 500 de ITUB4 se cair 2% em 7 dias, mas só se eu tiver mais de R$ 3.000 na conta'
  );
  log('   ', `Tipo identificado: ${result.ruleType}`);
  log('   ', `Confiança: ${(result.confidence * 100).toFixed(0)}%`);
  log('   ', `Explicação: ${result.explanation}`);
  if (result.warnings?.length) {
    log('   ', `Avisos: ${result.warnings.join(', ')}`);
  }
}

async function scenario5_recurringBuy() {
  log('\n📋', 'Cenário 5: Compra recorrente de produto (varejo)');
  const { partner, user } = await setup();

  const trigger = await prisma.trigger.create({
    data: {
      partnerId: partner.id,
      userId: user.id,
      code: 'RECURRING_BUY',
      name: 'Teste cenário 5',
      params: { sku: 'BISCOITO_Z_150G', retailerId: 'MERCADONA', frequencyDays: 30, minPriceBrl: 5, maxPriceBrl: 7, quantity: 2 },
      status: 'ACTIVE'
    }
  });

  const result = await triggerEngine.evaluateTrigger(trigger.id);
  log('   ', `Resultado: ${result.shouldFire ? '✅ FIRE' : '❌ SKIP'} — ${result.reason}`);
}

async function scenario6_creditAndReEvaluate() {
  log('\n📋', 'Cenário 6: Credita saldo + reavalia gatilho');
  const { partner, user } = await setup();
  log('   ', `Saldo antes: R$ ${(await bankService.getBalance(user.externalUserId)).toFixed(2)}`);

  await bankService.creditMockAccount(user.externalUserId, 10000, 'empresa@exemplo.com');
  log('   ', `Saldo depois: R$ ${(await bankService.getBalance(user.externalUserId)).toFixed(2)}`);
}

async function scenario7_executionFlow() {
  log('\n📋', 'Cenário 7: Fluxo completo de execução (Pix + destino)');
  const { partner, user } = await setup();

  // Cria gatilho com configuração que vai disparar
  const trigger = await prisma.trigger.create({
    data: {
      partnerId: partner.id,
      userId: user.id,
      code: 'DCA_FUND',
      name: 'Teste cenário 7',
      params: { fundId: 'XP_SELECTION', dayOfMonth: new Date().getDate(), amountBrl: 200, minBalance: 0 },
      status: 'ACTIVE'
    }
  });

  const evaluation = await triggerEngine.evaluateTrigger(trigger.id);
  if (evaluation.shouldFire) {
    await triggerEngine.executeTrigger(trigger.id, evaluation.data);
    const exec = await prisma.execution.findFirst({ where: { triggerId: trigger.id }, orderBy: { createdAt: 'desc' } });
    log('   ', `Status final: ${exec.status}`);
    if (exec.result) {
      log('   ', `Detalhes: ${JSON.stringify(exec.result, null, 2).slice(0, 200)}...`);
    }
  } else {
    log('   ', `Não disparou: ${evaluation.reason}`);
  }
}

async function scenario8_reportGeneration() {
  log('\n📋', 'Cenário 8: Geração de relatórios');
  const { partner, user } = await setup();

  const consumerReport = await fetch(`http://localhost:3001/v1/reports/consumer/${user.id}`).then(r => r.json());
  log('   ', `Relatório consumer: ${consumerReport.summary?.activeTriggers} gatilhos ativos`);

  const partnerReport = await fetch(`http://localhost:3001/v1/reports/partner/${partner.id}`).then(r => r.json());
  log('   ', `Relatório partner: R$ ${partnerReport.kpis?.totalVolumeBrl?.toFixed(2)} de volume`);
}

async function main() {
  console.log('\n🧪 Orkest — 8 Cenários de Teste\n');
  console.log('━'.repeat(60));

  await scenario1_happyPath();
  await scenario2_balanceGate();
  await scenario3_dcaOnDate();
  await scenario4_aiTranslation();
  await scenario5_recurringBuy();
  await scenario6_creditAndReEvaluate();
  await scenario7_executionFlow();
  await scenario8_reportGeneration();

  console.log('\n━'.repeat(60));
  console.log('\n✅ Todos os cenários executados!\n');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
