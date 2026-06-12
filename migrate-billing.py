#!/usr/bin/env python3
import requests

API = "https://api.nextgenassets.com.br"

statements = [
    'ALTER TABLE "ConsumerUser" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT \'FREE\'',
    'ALTER TABLE "ConsumerUser" ADD COLUMN IF NOT EXISTS "planStartedAt" TIMESTAMP(3)',
    'ALTER TABLE "ConsumerUser" ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3)',
    'ALTER TABLE "ConsumerUser" ADD COLUMN IF NOT EXISTS "triggerCount" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE "ConsumerUser" ADD COLUMN IF NOT EXISTS "pixReceivedCount" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE "ConsumerUser" ADD COLUMN IF NOT EXISTS "billingPeriodStart" TIMESTAMP(3)',
    'CREATE INDEX IF NOT EXISTS "ConsumerUser_plan_idx" ON "ConsumerUser"("plan")',
]

for sql in statements:
    r = requests.post(f"{API}/v1/admin/webhooks/migrate", json={"sql": sql})
    print(f"{sql[:60]:60} -> {r.text[:120]}")
