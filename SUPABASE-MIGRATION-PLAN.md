-- ============================================
-- MIGRATION: Plan B2C + usage tracking
-- ============================================
-- Aplica via POST /v1/admin/webhooks/migrate
-- Ou direto no SQL Editor do Supabase

ALTER TABLE "ConsumerUser" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "ConsumerUser" ADD COLUMN IF NOT EXISTS "planStartedAt" TIMESTAMP(3);
ALTER TABLE "ConsumerUser" ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3);
ALTER TABLE "ConsumerUser" ADD COLUMN IF NOT EXISTS "triggerCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ConsumerUser" ADD COLUMN IF NOT EXISTS "pixReceivedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ConsumerUser" ADD COLUMN IF NOT EXISTS "billingPeriodStart" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ConsumerUser_plan_idx" ON "ConsumerUser"("plan");
