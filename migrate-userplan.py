#!/usr/bin/env python3
import requests

API = "https://api.nextgenassets.com.br"

statements = [
    "DO $$ BEGIN CREATE TYPE \"UserPlan\" AS ENUM ('FREE', 'PREMIUM', 'EXPIRED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
    "ALTER TABLE \"ConsumerUser\" ALTER COLUMN \"plan\" DROP DEFAULT;",
    "ALTER TABLE \"ConsumerUser\" ALTER COLUMN \"plan\" TYPE \"UserPlan\" USING \"plan\"::\"UserPlan\";",
    "ALTER TABLE \"ConsumerUser\" ALTER COLUMN \"plan\" SET DEFAULT 'FREE';",
]

for sql in statements:
    r = requests.post(f"{API}/v1/admin/webhooks/migrate", json={"sql": sql})
    print(f"{sql[:80]:80} -> {r.text[:120]}")
