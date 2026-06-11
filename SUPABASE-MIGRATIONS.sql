-- ============================================
--  SUPABASE MIGRATIONS - Todas migrations em 1 lugar
--  Aplicar manualmente em: Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
--  MIGRATION: add pixKey + commission to Partner
--  Data: 2026-06-11
-- ============================================

-- Adiciona colunas
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "pixKey" TEXT;
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "pixKeyType" "PixKeyType";
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "commissionRate" DECIMAL(5,4) DEFAULT 0.03;
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "totalCommissionEarnedBrl" DECIMAL(18,2) DEFAULT 0;

-- Cria o enum PixKeyType (se não existir)
DO $$ BEGIN
  CREATE TYPE "PixKeyType" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Verifica se foi criado
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'Partner'
  AND column_name IN ('pixKey', 'pixKeyType', 'commissionRate', 'totalCommissionEarnedBrl');
