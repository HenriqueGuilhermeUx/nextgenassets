-- =====================================================================
-- NextGen Assets — Patch seguro de banco para MVP EMPRESAS
-- Data: 2026-06-28
--
-- IMPORTANTE:
-- - NÃO usa DROP TABLE.
-- - Pode rodar em produção com baixo risco.
-- - Serve para garantir colunas/índices necessários ao fluxo B2B:
--   API Key -> Partner -> ConsumerUser -> Trigger -> AuditLog.
-- =====================================================================

-- 1) UserPlan enum, se o banco ainda não tiver.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserPlan') THEN
    CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PREMIUM', 'EXPIRED', 'CANCELLED');
  END IF;
END $$;

-- 2) Campos de billing no ConsumerUser, se ainda não tiverem sido aplicados.
ALTER TABLE "ConsumerUser"
  ADD COLUMN IF NOT EXISTS "plan" "UserPlan" NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "planStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "triggerCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pixReceivedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "billingPeriodStart" TIMESTAMP(3);

-- 3) Campos de estado do Trigger usados por avaliação/execução comercial.
ALTER TABLE "Trigger"
  ADD COLUMN IF NOT EXISTS "lastEvaluatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastExecutedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nextEvaluationAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "executionCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "failureCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastDataId" TEXT,
  ADD COLUMN IF NOT EXISTS "lastTotal" INTEGER,
  ADD COLUMN IF NOT EXISTS "maxExecutions" INTEGER,
  ADD COLUMN IF NOT EXISTS "maxTotalSpendBrl" DECIMAL(18,2);

-- 4) Índices úteis para endpoints B2B/extension.
CREATE INDEX IF NOT EXISTS "Partner_slug_idx" ON "Partner"("slug");
CREATE INDEX IF NOT EXISTS "ApiKey_key_idx" ON "ApiKey"("key");
CREATE INDEX IF NOT EXISTS "Trigger_partnerId_status_idx" ON "Trigger"("partnerId", "status");
CREATE INDEX IF NOT EXISTS "Trigger_partnerId_code_idx" ON "Trigger"("partnerId", "code");
CREATE INDEX IF NOT EXISTS "Trigger_nextEvaluationAt_idx" ON "Trigger"("nextEvaluationAt");
CREATE INDEX IF NOT EXISTS "ConsumerUser_partnerId_externalUserId_idx" ON "ConsumerUser"("partnerId", "externalUserId");
CREATE INDEX IF NOT EXISTS "AuditLog_partnerId_action_idx" ON "AuditLog"("partnerId", "action");

-- 5) Observação:
-- O arquivo antigo SUPABASE-SETUP.sql contém DROP TABLE e deve ser usado apenas
-- em banco vazio/demo. Para produção, use patches como este.
