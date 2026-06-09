-- ============================================
-- NextGen Assets — Schema SQL Completo
-- ============================================
-- Cole este SQL no Supabase SQL Editor:
-- 1. Vá em https://supabase.com/dashboard
-- 2. Clique no seu projeto
-- 3. Menu lateral > SQL Editor
-- 4. + New query
-- 5. Cole TUDO abaixo
-- 6. Clique em RUN (ou Ctrl+Enter)
-- ============================================

-- Limpa tudo (caso esteja rodando de novo)
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "TriggerCatalog" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "Execution" CASCADE;
DROP TABLE IF EXISTS "Trigger" CASCADE;
DROP TABLE IF EXISTS "ConsumerUser" CASCADE;
DROP TABLE IF EXISTS "ApiKey" CASCADE;
DROP TABLE IF EXISTS "Partner" CASCADE;

DROP TYPE IF EXISTS "NotificationStatus" CASCADE;
DROP TYPE IF EXISTS "NotifyChannel" CASCADE;
DROP TYPE IF EXISTS "ConsentStatus" CASCADE;
DROP TYPE IF EXISTS "ExecutionStatus" CASCADE;
DROP TYPE IF EXISTS "TriggerCategory" CASCADE;
DROP TYPE IF EXISTS "TriggerStatus" CASCADE;
DROP TYPE IF EXISTS "PlanTier" CASCADE;
DROP TYPE IF EXISTS "PartnerStatus" CASCADE;
DROP TYPE IF EXISTS "PartnerType" CASCADE;

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE "PartnerType" AS ENUM (
  'BROKER',
  'FUND_DISTRIBUTOR',
  'BANK',
  'RETAILER',
  'NEOBANK',
  'FINTECH',
  'UTILITY',
  'INSURER'
);

CREATE TYPE "PartnerStatus" AS ENUM (
  'TRIAL',
  'ACTIVE',
  'SUSPENDED',
  'CHURNED'
);

CREATE TYPE "PlanTier" AS ENUM (
  'STARTER',
  'GROWTH',
  'SCALE',
  'ENTERPRISE'
);

CREATE TYPE "ConsentStatus" AS ENUM (
  'PENDING',
  'ACTIVE',
  'REVOKED',
  'EXPIRED',
  'FAILED'
);

CREATE TYPE "NotifyChannel" AS ENUM (
  'PUSH',
  'EMAIL',
  'SMS',
  'WHATSAPP',
  'IN_APP'
);

CREATE TYPE "TriggerStatus" AS ENUM (
  'ACTIVE',
  'PAUSED',
  'EXHAUSTED',
  'BUDGET_EXCEEDED',
  'FAILED',
  'CANCELED'
);

CREATE TYPE "ExecutionStatus" AS ENUM (
  'PENDING',
  'EVALUATING',
  'EVALUATION_PASSED',
  'EVALUATION_FAILED',
  'INITIATING_PIX',
  'PIX_PENDING',
  'PIX_CONFIRMED',
  'EXECUTING_DESTINATION',
  'COMPLETED',
  'FAILED',
  'CANCELED',
  'RETRYING'
);

CREATE TYPE "TriggerCategory" AS ENUM (
  'INVESTMENT_AUTO',
  'INVESTMENT_PASSIVE',
  'BANKING',
  'CONSUMPTION',
  'UTILITY',
  'INSURANCE',
  'CUSTOM'
);

CREATE TYPE "NotificationStatus" AS ENUM (
  'PENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED'
);

-- ============================================
-- TABELAS
-- ============================================

CREATE TABLE "Partner" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "type" "PartnerType" NOT NULL,
  "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE',
  "config" JSONB NOT NULL,
  "efiClientId" TEXT,
  "efiClientSecret" TEXT,
  "webhookUrl" TEXT,
  "webhookSecret" TEXT,
  "tier" "PlanTier" NOT NULL DEFAULT 'STARTER',
  "monthlyFeeBrl" DECIMAL(10,2) NOT NULL DEFAULT 2500.00,
  "takeRateBrl" DECIMAL(10,2) NOT NULL DEFAULT 0.15,
  "maxMau" INTEGER NOT NULL DEFAULT 1000,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Partner_type_idx" ON "Partner"("type");
CREATE INDEX "Partner_status_idx" ON "Partner"("status");

CREATE TABLE "ApiKey" (
  "id" TEXT PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "key" TEXT NOT NULL UNIQUE,
  "secretHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "scopes" TEXT[],
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiKey_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE
);

CREATE INDEX "ApiKey_partnerId_idx" ON "ApiKey"("partnerId");

CREATE TABLE "ConsumerUser" (
  "id" TEXT PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "externalUserId" TEXT NOT NULL,
  "email" TEXT,
  "name" TEXT,
  "phone" TEXT,
  "consentStatus" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
  "consentToken" TEXT,
  "consentExpiresAt" TIMESTAMP(3),
  "bankName" TEXT,
  "bankAccountMask" TEXT,
  "notifyChannels" "NotifyChannel"[],
  "locale" TEXT NOT NULL DEFAULT 'pt-BR',
  "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsumerUser_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "ConsumerUser_partnerId_externalUserId_key" ON "ConsumerUser"("partnerId", "externalUserId");
CREATE INDEX "ConsumerUser_email_idx" ON "ConsumerUser"("email");

CREATE TABLE "Trigger" (
  "id" TEXT PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "TriggerStatus" NOT NULL DEFAULT 'ACTIVE',
  "isPaused" BOOLEAN NOT NULL DEFAULT false,
  "pauseReason" TEXT,
  "params" JSONB NOT NULL,
  "lastEvaluatedAt" TIMESTAMP(3),
  "lastExecutedAt" TIMESTAMP(3),
  "nextEvaluationAt" TIMESTAMP(3),
  "executionCount" INTEGER NOT NULL DEFAULT 0,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "maxExecutions" INTEGER,
  "totalSpentBrl" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "maxTotalSpendBrl" DECIMAL(10,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Trigger_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE,
  CONSTRAINT "Trigger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ConsumerUser"("id") ON DELETE CASCADE
);

CREATE INDEX "Trigger_partnerId_idx" ON "Trigger"("partnerId");
CREATE INDEX "Trigger_userId_idx" ON "Trigger"("userId");
CREATE INDEX "Trigger_status_idx" ON "Trigger"("status");
CREATE INDEX "Trigger_nextEvaluationAt_idx" ON "Trigger"("nextEvaluationAt");

CREATE TABLE "Execution" (
  "id" TEXT PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "triggerId" TEXT NOT NULL,
  "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
  "state" JSONB NOT NULL,
  "intent" JSONB NOT NULL,
  "destination" TEXT NOT NULL,
  "externalId" TEXT,
  "result" JSONB,
  "amountBrl" DECIMAL(10,2),
  "amountTokens" DECIMAL(20,8),
  "pricePerUnit" DECIMAL(20,8),
  "quantity" DECIMAL(20,8),
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "evaluatedAt" TIMESTAMP(3),
  "pixInitiatedAt" TIMESTAMP(3),
  "pixConfirmedAt" TIMESTAMP(3),
  "executionCompletedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  CONSTRAINT "Execution_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE,
  CONSTRAINT "Execution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ConsumerUser"("id") ON DELETE CASCADE,
  CONSTRAINT "Execution_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "Trigger"("id") ON DELETE CASCADE
);

CREATE INDEX "Execution_partnerId_idx" ON "Execution"("partnerId");
CREATE INDEX "Execution_userId_idx" ON "Execution"("userId");
CREATE INDEX "Execution_triggerId_idx" ON "Execution"("triggerId");
CREATE INDEX "Execution_status_idx" ON "Execution"("status");
CREATE INDEX "Execution_createdAt_idx" ON "Execution"("createdAt");

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "partnerId" TEXT,
  "userId" TEXT,
  "triggerId" TEXT,
  "executionId" TEXT,
  "actor" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AuditLog_partnerId_idx" ON "AuditLog"("partnerId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE TABLE "TriggerCatalog" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" "TriggerCategory" NOT NULL,
  "destinationType" TEXT NOT NULL,
  "paramsSchema" JSONB NOT NULL,
  "iconUrl" TEXT,
  "isPremium" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "minPlanTier" "PlanTier" NOT NULL DEFAULT 'STARTER',
  "exampleParams" JSONB NOT NULL,
  "exampleNarrative" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "TriggerCatalog_category_idx" ON "TriggerCatalog"("category");
CREATE INDEX "TriggerCatalog_destinationType_idx" ON "TriggerCatalog"("destinationType");

CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "channel" "NotifyChannel" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_status_idx" ON "Notification"("status");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- ============================================
-- DADOS INICIAIS (Seed)
-- ============================================

-- Parceiro de demonstração
INSERT INTO "Partner" ("id", "slug", "name", "type", "status", "config", "tier", "monthlyFeeBrl", "takeRateBrl", "maxMau", "createdAt", "updatedAt")
VALUES (
  'demo-partner-001',
  'demo-corretora',
  'Corretora Demo (NextGen Assets)',
  'BROKER',
  'ACTIVE',
  '{"adapters":["MOCK_STOCK_BROKER","MOCK_FUND_DISTRIBUTOR"],"themeColor":"#5B6CFF","webhookUrl":null}'::jsonb,
  'GROWTH',
  8000.00,
  0.15,
  10000,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- 23 Gatilhos do catálogo
INSERT INTO "TriggerCatalog" ("id", "code", "name", "description", "category", "destinationType", "paramsSchema", "exampleParams", "exampleNarrative", "createdAt", "updatedAt") VALUES
-- CONSUMO CONTEXTUAL
('cat-001', 'BALANCE_TRIGGER_BUY', 'Saldo Subiu', 'Compra quando saldo bancário passar de X', 'CONSUMPTION', 'RETAILER',
'{"type":"object","properties":{"productId":{"type":"string"},"minBalance":{"type":"number"},"amountBrl":{"type":"number"}},"required":["minBalance","amountBrl"]}'::jsonb,
'{"productId":"perfume-001","minBalance":1000,"amountBrl":489}'::jsonb,
'Compra R$ 489 do perfume quando meu saldo passar de R$ 1.000',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-002', 'POST_BILLS_BUY', 'Pós-Contas', 'Compra no dia X se sobrar Y', 'CONSUMPTION', 'RETAILER',
'{"type":"object","properties":{"productId":{"type":"string"},"dayOfMonth":{"type":"integer"},"minBalance":{"type":"number"}},"required":["dayOfMonth","minBalance"]}'::jsonb,
'{"productId":"perfume-001","dayOfMonth":20,"minBalance":1000}'::jsonb,
'Compra o perfume no dia 20 se meu saldo for maior que R$ 1.000',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-003', 'SALARY_TRIGGER_BUY', 'Salário Caiu', 'Detecta crédito salarial', 'CONSUMPTION', 'RETAILER',
'{"type":"object","properties":{"productId":{"type":"string"},"minSalaryAmount":{"type":"number"}},"required":["minSalaryAmount"]}'::jsonb,
'{"productId":"perfume-001","minSalaryAmount":4000}'::jsonb,
'Compra o perfume quando cair meu salário se for &gt; R$ 4.000',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-004', 'AUTO_BUY_ON_RESTOCK', 'Voltou ao Estoque', 'Compra quando produto voltar ao estoque', 'CONSUMPTION', 'RETAILER',
'{"type":"object","properties":{"productId":{"type":"string"},"maxPrice":{"type":"number"}},"required":["productId"]}'::jsonb,
'{"productId":"perfume-001","maxPrice":500}'::jsonb,
'Compra o perfume se voltar ao estoque até R$ 500',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-005', 'GOAL_ACCUMULATION_BUY', 'Meta Acumulada', 'Guarda aos poucos até valor alvo', 'CONSUMPTION', 'RETAILER',
'{"type":"object","properties":{"productId":{"type":"string"},"targetAmount":{"type":"number"},"weeklyAmount":{"type":"number"}},"required":["targetAmount","weeklyAmount"]}'::jsonb,
'{"productId":"perfume-001","targetAmount":489,"weeklyAmount":50}'::jsonb,
'Guarda R$ 50 por semana até acumular R$ 489 e compra o perfume',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- COMPRA RECORRENTE
('cat-006', 'RECURRING_BUY', 'Recorrência', 'A cada N dias se preço no range', 'CONSUMPTION', 'RETAILER',
'{"type":"object","properties":{"productId":{"type":"string"},"intervalDays":{"type":"integer"},"minPrice":{"type":"number"},"maxPrice":{"type":"number"}},"required":["intervalDays"]}'::jsonb,
'{"productId":"leite-1l","intervalDays":7,"minPrice":4,"maxPrice":6}'::jsonb,
'Compra leite toda semana se preço entre R$ 4 e R$ 6',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-007', 'PRICE_ALERT_BUY', 'Alerta de Preço', 'Compra se atingir preço-alvo', 'CONSUMPTION', 'RETAILER',
'{"type":"object","properties":{"productId":{"type":"string"},"targetPrice":{"type":"number"}},"required":["targetPrice"]}'::jsonb,
'{"productId":"tv-55","targetPrice":2500}'::jsonb,
'Compra a TV quando baixar pra R$ 2.500',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-008', 'GIFT_AUTO_BUY', 'Presente Automático', 'Presenteia em datas', 'CONSUMPTION', 'RETAILER',
'{"type":"object","properties":{"productId":{"type":"string"},"occasionDate":{"type":"string"},"recurringYearly":{"type":"boolean"}},"required":["occasionDate"]}'::jsonb,
'{"productId":"presente-mae","occasionDate":"2026-05-11","recurringYearly":true}'::jsonb,
'Todo Dia das Mães compra aquele presente pra minha mãe',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- INVESTIMENTO AUTO
('cat-009', 'BUY_DIP_STOCK', 'Caçador de Ações', 'Compra ação quando cai X%', 'INVESTMENT_AUTO', 'STOCK_BROKER',
'{"type":"object","properties":{"ticker":{"type":"string"},"dipPct":{"type":"number"},"windowDays":{"type":"integer"},"amountBrl":{"type":"number"},"minBalance":{"type":"number"}},"required":["ticker","dipPct","windowDays","amountBrl"]}'::jsonb,
'{"ticker":"ITUB4","dipPct":2,"windowDays":7,"amountBrl":500,"minBalance":5000}'::jsonb,
'Compra R$ 500 de ITUB4 se cair 2% em 7 dias, se saldo &gt; R$ 5.000',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-010', 'STOP_LOSS_STOCK', 'Stop-Loss', 'Vende se cair X% do preço', 'INVESTMENT_AUTO', 'STOCK_BROKER',
'{"type":"object","properties":{"ticker":{"type":"string"},"stopLossPct":{"type":"number"},"quantity":{"type":"number"}},"required":["ticker","stopLossPct","quantity"]}'::jsonb,
'{"ticker":"PETR4","stopLossPct":8,"quantity":100}'::jsonb,
'Vende 100 PETR4 se cair 8% do preço de compra',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-011', 'BUY_DIP_CRYPTO', 'Caçador de Cripto', 'Compra cripto quando cai X%', 'INVESTMENT_AUTO', 'CRYPTO_EXCHANGE',
'{"type":"object","properties":{"symbol":{"type":"string"},"dipPct":{"type":"number"},"amountBrl":{"type":"number"}},"required":["symbol","dipPct","amountBrl"]}'::jsonb,
'{"symbol":"BTC","dipPct":5,"amountBrl":1000}'::jsonb,
'Compra R$ 1.000 de BTC se cair 5%',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-012', 'TRAILING_STOP_STOCK', 'Stop Móvel', 'Vende se cair X% do pico', 'INVESTMENT_AUTO', 'STOCK_BROKER',
'{"type":"object","properties":{"ticker":{"type":"string"},"trailPct":{"type":"number"},"quantity":{"type":"number"}},"required":["ticker","trailPct","quantity"]}'::jsonb,
'{"ticker":"VALE3","trailPct":5,"quantity":50}'::jsonb,
'Vende 50 VALE3 se cair 5% do preço mais alto',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- INVESTIMENTO PASSIVO
('cat-013', 'DCA_STOCK', 'DCA Ação', 'Aporte mensal em ação', 'INVESTMENT_PASSIVE', 'STOCK_BROKER',
'{"type":"object","properties":{"ticker":{"type":"string"},"monthlyAmount":{"type":"number"},"dayOfMonth":{"type":"integer"}},"required":["ticker","monthlyAmount","dayOfMonth"]}'::jsonb,
'{"ticker":"ITUB4","monthlyAmount":500,"dayOfMonth":5}'::jsonb,
'Todo dia 5 aporta R$ 500 em ITUB4',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-014', 'DCA_FUND', 'DCA Fundo', 'Aporte mensal em fundo', 'INVESTMENT_PASSIVE', 'FUND_DISTRIBUTOR',
'{"type":"object","properties":{"fundCode":{"type":"string"},"monthlyAmount":{"type":"number"},"dayOfMonth":{"type":"integer"}},"required":["fundCode","monthlyAmount","dayOfMonth"]}'::jsonb,
'{"fundCode":"TESOURO_SELIC_2029","monthlyAmount":1000,"dayOfMonth":5}'::jsonb,
'Todo dia 5 aporta R$ 1.000 no Tesouro Selic',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-015', 'DCA_CRYPTO', 'DCA Cripto', 'Aporte mensal em cripto', 'INVESTMENT_PASSIVE', 'CRYPTO_EXCHANGE',
'{"type":"object","properties":{"symbol":{"type":"string"},"monthlyAmount":{"type":"number"},"dayOfMonth":{"type":"integer"}},"required":["symbol","monthlyAmount","dayOfMonth"]}'::jsonb,
'{"symbol":"BTC","monthlyAmount":500,"dayOfMonth":10}'::jsonb,
'Todo dia 10 compro R$ 500 em BTC',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- BANCÁRIO
('cat-016', 'ROUND_UP_SAVINGS', 'Arredondamento', 'Troco de compras vira investimento', 'BANKING', 'FUND_DISTRIBUTOR',
'{"type":"object","properties":{"fundCode":{"type":"string"}},"required":["fundCode"]}'::jsonb,
'{"fundCode":"TESOURO_SELIC_2029"}'::jsonb,
'Arredonda todas as minhas compras e joga no fundo',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-017', 'RASI_CAIXA_FUND', 'Raspa Caixa', 'Move excedente da conta pra fundo DI', 'BANKING', 'FUND_DISTRIBUTOR',
'{"type":"object","properties":{"fundCode":{"type":"string"},"minKeepBalance":{"type":"number"}},"required":["fundCode","minKeepBalance"]}'::jsonb,
'{"fundCode":"TESOURO_SELIC_2029","minKeepBalance":2000}'::jsonb,
'Todo começo de mês, deixa R$ 2.000 na conta e joga o resto no fundo',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-018', 'GOAL_SAVINGS', 'Meta de Economia', 'Guarda pra objetivo', 'BANKING', 'FUND_DISTRIBUTOR',
'{"type":"object","properties":{"goalName":{"type":"string"},"targetAmount":{"type":"number"},"deadline":{"type":"string"},"monthlyAmount":{"type":"number"}},"required":["goalName","targetAmount","monthlyAmount"]}'::jsonb,
'{"goalName":"Viagem Europa","targetAmount":20000,"deadline":"2027-12-01","monthlyAmount":1000}'::jsonb,
'Guarda R$ 1.000/mês pra uma viagem de R$ 20.000 até dez/2027',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-019', 'AUTO_INVEST_SALARY', 'Auto Investe Salário', 'X% do salário vai pro investimento', 'BANKING', 'FUND_DISTRIBUTOR',
'{"type":"object","properties":{"fundCode":{"type":"string"},"percentOfSalary":{"type":"number"}},"required":["fundCode","percentOfSalary"]}'::jsonb,
'{"fundCode":"TESOURO_SELIC_2029","percentOfSalary":10}'::jsonb,
'Quando cair meu salário, investe 10% automaticamente',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- UTILIDADE
('cat-020', 'BILL_AUTO_PAY', 'Conta Automática', 'Paga conta se saldo &lt; limite', 'UTILITY', 'BANK_ACCOUNT',
'{"type":"object","properties":{"billType":{"type":"string"},"maxAmount":{"type":"number"},"dueDay":{"type":"integer"}},"required":["billType","maxAmount","dueDay"]}'::jsonb,
'{"billType":"energia","maxAmount":350,"dueDay":15}'::jsonb,
'Todo dia 15 paga minha conta de energia se for &lt; R$ 350',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-021', 'AUTO_PAY_INSURANCE', 'Seguro em Dia', 'Paga prêmio automaticamente', 'UTILITY', 'BANK_ACCOUNT',
'{"type":"object","properties":{"insuranceType":{"type":"string"},"amount":{"type":"number"},"dueDay":{"type":"integer"}},"required":["insuranceType","amount","dueDay"]}'::jsonb,
'{"insuranceType":"auto","amount":280,"dueDay":10}'::jsonb,
'Todo dia 10 paga o seguro do carro (R$ 280)',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('cat-022', 'AUTO_RECHARGE', 'Recarga Automática', 'Recarrega celular se &lt; X', 'UTILITY', 'BANK_ACCOUNT',
'{"type":"object","properties":{"phoneNumber":{"type":"string"},"rechargeAmount":{"type":"number"},"minBalance":{"type":"number"}},"required":["phoneNumber","rechargeAmount","minBalance"]}'::jsonb,
'{"phoneNumber":"11999998888","rechargeAmount":30,"minBalance":10}'::jsonb,
'Recarrega R$ 30 no meu celular se saldo for &lt; R$ 10',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- CUSTOM
('cat-023', 'CUSTOM_NL', 'Regra Custom (IA)', 'Cliente dita em linguagem natural', 'CUSTOM', 'AUTO',
'{"type":"object","properties":{"naturalLanguageRule":{"type":"string"}},"required":["naturalLanguageRule"]}'::jsonb,
'{"naturalLanguageRule":"Se eu receber mais de R$ 3.000 nos próximos 5 dias, aplica 60% em fundo DI e 40% em USDC"}'::jsonb,
'Se eu receber mais de R$ 3.000 nos próximos 5 dias, aplica 60% em fundo e 40% em USDC',
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Confirma que tudo foi criado
SELECT 'Partner criado: ' || count(*) as msg FROM "Partner";
SELECT 'TriggerCatalog criado: ' || count(*) as msg FROM "TriggerCatalog";
SELECT 'Tabelas criadas: ' || count(*) as msg FROM information_schema.tables WHERE table_schema = 'public';

-- ============================================
-- NOVAS TABELAS (v1.1) — Ofertas + Open Finance Consent
-- ============================================

-- Tipo enum: OfferType
DO $$ BEGIN
  CREATE TYPE "OfferType" AS ENUM (
    'PHYSICAL_PRODUCT', 'DIGITAL_PRODUCT', 'SERVICE', 'SUBSCRIPTION',
    'BILL', 'INSURANCE', 'INVESTMENT', 'TRAVEL', 'EVENT',
    'RECURRING_CHARGE', 'CUSTOM'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo enum: ConsentStatus
DO $$ BEGIN
  CREATE TYPE "ConsentStatus" AS ENUM (
    'PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
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

-- Adicionar offerId em Trigger (se nao existir)
ALTER TABLE "Trigger" ADD COLUMN IF NOT EXISTS "offerId" TEXT;
DO $$ BEGIN
  ALTER TABLE "Trigger" ADD CONSTRAINT "Trigger_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "Trigger_offerId_idx" ON "Trigger"("offerId");

-- Tabela Consent (Open Finance)
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

-- Insere uma oferta de exemplo (Mercado Livre simulado)
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
SELECT 'Offer criadas: ' || count(*) as msg FROM "Offer";
SELECT 'Consent criadas: ' || count(*) as msg FROM "Consent";
