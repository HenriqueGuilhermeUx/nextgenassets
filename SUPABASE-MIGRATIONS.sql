-- ============================================
--  SUPABASE MIGRATIONS
--  Rode no Supabase SQL Editor pra sincronizar com o Prisma schema
-- ============================================

-- 2026-06-09: Adiciona offerId em Transaction
-- (Prisma schema tem o campo, mas SQL inicial nao criou)
ALTER TABLE "Transaction" 
  ADD COLUMN IF NOT EXISTS "offerId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'Transaction_offerId_fkey'
  ) THEN
    ALTER TABLE "Transaction" 
      ADD CONSTRAINT "Transaction_offerId_fkey" 
      FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Transaction_offerId_idx" ON "Transaction"("offerId");

-- Verifica
-- SELECT count(*) FROM information_schema.columns WHERE table_name = 'Transaction';
-- Esperado: 20 colunas

-- 2026-06-09: Cria enum TransactionType
-- (Prisma schema tem o enum, mas SQL inicial nao criou o tipo)
CREATE TYPE "public"."TransactionType" AS ENUM (
  'DEBIT',
  'CREDIT',
  'PIX_IN',
  'PIX_OUT',
  'BOLETO',
  'CARD',
  'TRANSFER'
);

-- Verifica
-- SELECT enum_range(NULL::"public"."TransactionType");

-- 2026-06-10: Converte coluna type de TEXT pra enum
ALTER TABLE "Transaction" 
  ALTER COLUMN "type" TYPE "public"."TransactionType" 
  USING "type"::"public"."TransactionType";
