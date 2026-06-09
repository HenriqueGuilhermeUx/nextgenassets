-- ============================================
-- SQL APENAS DAS TABELAS NOVAS (Offer + Consent)
-- Roda no Supabase SQL Editor (sem re-criar as 8 existentes)
-- ============================================

-- Tipo enum: OfferType
DO $$ BEGIN
  CREATE TYPE "OfferType" AS ENUM (
    'PHYSICAL_PRODUCT', 'DIGITAL_PRODUCT', 'SERVICE', 'SUBSCRIPTION',
    'BILL', 'INSURANCE', 'INVESTMENT', 'TRAVEL', 'EVENT',
    'RECURRING_CHARGE', 'CUSTOM'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Tabela Offer
CREATE TABLE IF NOT EXISTS "Offer" (
  "id" TEXT PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "externalUrl" TEXT,
  "sku" TEXT,
  "type" "OfferType" NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "brand" TEXT,
  "priceBrl" DECIMAL(12,2) NOT NULL,
  "priceCurrency" TEXT NOT NULL DEFAULT 'BRL',
  "lastPriceUpdate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "inStock" BOOLEAN NOT NULL DEFAULT true,
  "stockQuantity" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("partnerId", "externalId"),
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Offer_partnerId_type_idx" ON "Offer"("partnerId", "type");
CREATE INDEX IF NOT EXISTS "Offer_category_idx" ON "Offer"("category");

-- offerId em Trigger
ALTER TABLE "Trigger" ADD COLUMN IF NOT EXISTS "offerId" TEXT;
DO $$ BEGIN
  ALTER TABLE "Trigger" ADD CONSTRAINT "Trigger_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "Trigger_offerId_idx" ON "Trigger"("offerId");

-- Tabela Consent (Open Finance)
-- Usa o enum ConsentStatus que JÁ EXISTE no schema (linha 144)
CREATE TABLE IF NOT EXISTS "Consent" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerUserId" TEXT,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMP,
  "scopes" TEXT[],
  "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
  "revokedAt" TIMESTAMP,
  "accounts" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "provider"),
  FOREIGN KEY ("userId") REFERENCES "ConsumerUser"("id") ON DELETE CASCADE,
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Consent_partnerId_idx" ON "Consent"("partnerId");

-- 2 ofertas demo
INSERT INTO "Offer" (
  "id", "partnerId", "externalId", "externalUrl", "type", "category",
  "title", "description", "imageUrl", "brand",
  "priceBrl", "inStock", "metadata"
) VALUES (
  'offer-demo-001',
  'demo-partner-001',
  'MLB123456789',
  'https://www.mercadolivre.com.br/p/MLB123456789',
  'PHYSICAL_PRODUCT',
  'eletronicos',
  'Fone Bluetooth Sony WH-1000XM5',
  'Fone de ouvido sem fio com cancelamento de ruído',
  'https://http2.mlstatic.com/D_NQ_NP_2X_987654-MLA123456789.jpg',
  'Sony',
  1899.99,
  true,
  '{"color":"preto","model":"WH-1000XM5","warranty":"12 meses"}'::jsonb
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Offer" (
  "id", "partnerId", "externalId", "externalUrl", "type", "category",
  "title", "description", "imageUrl", "brand",
  "priceBrl", "inStock", "metadata"
) VALUES (
  'offer-demo-002',
  'demo-partner-001',
  'SUB-NETFLIX-PREMIUM',
  'https://www.netflix.com/signup',
  'SUBSCRIPTION',
  'streaming',
  'Netflix Premium 4 Telas',
  'Plano Netflix com 4 telas simultâneas e qualidade 4K',
  'https://images.ctfassets.net/y2ske730sjqp/1aONibCke6niZhgPxuiilC/2c401b05a07951e6a8eaf8a0b0a3b3b7/BrandAssets_Logos_02-NSymbol.jpg',
  'Netflix',
  55.90,
  true,
  '{"plan":"premium","screens":4,"quality":"4K","billingCycle":"monthly"}'::jsonb
) ON CONFLICT ("id") DO NOTHING;

-- Confirma
SELECT 'Offer count: ' || count(*) FROM "Offer";
SELECT 'Consent count: ' || count(*) FROM "Consent";

-- ============================================
-- NOVOS GATILHOS (v1.1) — Catálogo expandido
-- ============================================

-- E-COMMERCE INTELIGENTE
INSERT INTO "TriggerCatalog" (id, code, name, description, category, "destinationType", "paramsSchema", "exampleParams", "exampleNaturalLanguage", "createdAt", "updatedAt") VALUES
('cat-024', 'OPPORTUNITY_BUY', 'Vantagem Matemática (Preço + CDI)', 'Compra se preco alvo E o CDI compensar o desconto', 'INVESTMENT', 'RETAILER',
'{"type":"object","properties":{"offerId":{"type":"string"},"targetPrice":{"type":"number"},"cdiAnnualPct":{"type":"number"},"opportunityMonths":{"type":"number"},"amountBrl":{"type":"number"}},"required":["targetPrice","opportunityMonths","amountBrl"]}'::jsonb,
'{"offerId":"offer-demo-001","targetPrice":3500,"cdiAnnualPct":13.5,"opportunityMonths":3,"amountBrl":4000}'::jsonb,
'Compra esse notebook de R$ 4.000 se cair pra R$ 3.500 E o CDI cobrir a diferença em menos de 3 meses',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-025', 'DETACHMENT_BUY', 'Desapego Concretizado', 'Compra item novo só se vender item antigo (via Open Finance)', 'CONSUMPTION', 'RETAILER',
'{"type":"object","properties":{"targetOfferId":{"type":"string"},"oldItemName":{"type":"string"},"oldItemMinValue":{"type":"number"},"amountBrl":{"type":"number"}},"required":["targetOfferId","oldItemName","amountBrl"]}'::jsonb,
'{"targetOfferId":"offer-demo-001","oldItemName":"camera antiga","oldItemMinValue":800,"amountBrl":1899.99}'::jsonb,
'Só compre a câmera nova se eu vender minha câmera antiga por pelo menos R$ 800',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-026', 'SCARCITY_BUY', 'Escassez com Margem de Segurança', 'Compra se estoque baixo E saldo acima do limite', 'CONSUMPTION', 'RETAILER',
'{"type":"object","properties":{"offerId":{"type":"string"},"minStockAlert":{"type":"number"},"safetyBalanceBrl":{"type":"number"},"amountBrl":{"type":"number"}},"required":["offerId","minStockAlert","safetyBalanceBrl","amountBrl"]}'::jsonb,
'{"offerId":"offer-demo-001","minStockAlert":2,"safetyBalanceBrl":2000,"amountBrl":1899.99}'::jsonb,
'Compra o fone Sony se restar menos de 2 em estoque E eu tiver mais de R$ 2.000 na conta',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- INVESTIMENTOS SEM ESFORCO
('cat-027', 'ROUND_UP_PIX', 'Arredondamento de PIX', 'Arredonda gastos pra R$5 ou R$10 e investe o troco', 'INVESTMENT', 'STOCK_BROKER',
'{"type":"object","properties":{"roundUpTo":{"type":"number"},"destinationAsset":{"type":"string"},"minAccumulatedBrl":{"type":"number"}},"required":["roundUpTo","destinationAsset"]}'::jsonb,
'{"roundUpTo":5,"destinationAsset":"HGLG11","minAccumulatedBrl":50}'::jsonb,
'Arredonda cada gasto pra cima de R$ 5 e joga o troco em HGLG11 quando acumular R$ 50',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-028', 'IMPULSE_REWARD', 'Recompensa de Impulso Retido', 'Não gastou em delivery = PIX automático pra ação pagadora', 'INVESTMENT', 'STOCK_BROKER',
'{"type":"object","properties":{"avgImpulseSpendBrl":{"type":"number"},"avoidedCategory":{"type":"string"},"rewardAsset":{"type":"number"},"triggerDayOfWeek":{"type":"number"}},"required":["avgImpulseSpendBrl","rewardAsset"]}'::jsonb,
'{"avgImpulseSpendBrl":80,"avoidedCategory":"delivery","rewardAsset":"BBSE3","triggerDayOfWeek":1}'::jsonb,
'Se eu não gastar em delivery no fim de semana, segunda-feira joga R$ 80 em BBSE3',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-029', 'VOLATILITY_HEDGE', 'Para-Raios de Volatilidade', 'Se Ibovespa/IFIX cair 3%+ E tiver caixa, compra', 'INVESTMENT', 'STOCK_BROKER',
'{"type":"object","properties":{"indexName":{"type":"string"},"dropPct":{"type":"number"},"opportunityBalanceBrl":{"type":"number"},"favoriteAsset":{"type":"string"},"amountBrl":{"type":"number"}},"required":["indexName","dropPct","amountBrl"]}'::jsonb,
'{"indexName":"IFIX","dropPct":3,"opportunityBalanceBrl":5000,"favoriteAsset":"HGLG11","amountBrl":1000}'::jsonb,
'Se o IFIX cair mais de 3% no dia E eu tiver mais de R$ 5.000 de reserva, compra R$ 1.000 de HGLG11',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- PESSOA FISICA / BANCOS
('cat-030', 'ACCOUNT_SWEEP', 'Conta Corrente Limpa', 'Varre sobra mensal pra caixinha/CDB dia 28', 'BANKING', 'FUND_DISTRIBUTOR',
'{"type":"object","properties":{"sweepDayOfMonth":{"type":"number"},"minAmountBrl":{"type":"number"},"destinationAsset":{"type":"string"},"keepMinimumBrl":{"type":"number"}},"required":["sweepDayOfMonth","minAmountBrl","destinationAsset"]}'::jsonb,
'{"sweepDayOfMonth":28,"minAmountBrl":50,"destinationAsset":"CDB-LIQUIDEZ","keepMinimumBrl":200}'::jsonb,
'Todo dia 28, varre qualquer valor acima de R$ 50 da conta corrente pra um CDB de liquidez, mantendo R$ 200 de reserva',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-031', 'CREDIT_SCORE_BOOST', 'Score de Crédito Turbinado', 'Transfere dinheiro pra pagar fatura antes do vencimento', 'BANKING', 'BILL_PAYER',
'{"type":"object","properties":{"creditCardStatementDay":{"type":"number"},"daysBeforeDue":{"type":"number"},"maxTransferBrl":{"type":"number"}},"required":["creditCardStatementDay","daysBeforeDue"]}'::jsonb,
'{"creditCardStatementDay":5,"daysBeforeDue":5,"maxTransferBrl":3000}'::jsonb,
'Antes da fatura fechar (5 dias antes), transfere até R$ 3.000 pra conta do cartão pra aumentar meu score',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-032', 'EMERGENCY_FUND', 'Reserva de Emergência Inteligente', 'Morde 30% de receitas extras até 6 meses de custo de vida', 'BANKING', 'FUND_DISTRIBUTOR',
'{"type":"object","properties":{"incomeKeywords":{"type":"array"},"reserveAsset":{"type":"string"},"targetMonths":{"type":"number"},"monthlyCostOfLifeBrl":{"type":"number"}},"required":["reserveAsset","targetMonths","monthlyCostOfLifeBrl"]}'::jsonb,
'{"incomeKeywords":["bonus","13º","reembolso"],"reserveAsset":"CDB-DI-6M","targetMonths":6,"monthlyCostOfLifeBrl":5000}'::jsonb,
'Toda vez que detectar receita extra (13º, bonus, reembolso), morde 30% e joga na reserva de emergência até atingir 6 meses de custo de vida (R$ 30.000)',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

SELECT 'Total gatilhos no catalogo: ' || count(*) FROM "TriggerCatalog";
