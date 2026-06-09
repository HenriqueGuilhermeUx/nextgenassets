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
