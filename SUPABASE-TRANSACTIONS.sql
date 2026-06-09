-- Cria tabela Transaction
CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amountBrl" DECIMAL(12,2) NOT NULL,
  "description" TEXT,
  "merchantName" TEXT,
  "category" TEXT,
  "endToEndId" TEXT,
  "roundUpAmount" DECIMAL(12,2),
  "roundUpTier" INTEGER,
  "roundUpMultiplier" DECIMAL(3,1) DEFAULT 1.0,
  "isProcessed" BOOLEAN NOT NULL DEFAULT false,
  "processedAt" TIMESTAMP,
  "triggerId" TEXT,
  "rawData" JSONB,
  "transactedAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "ConsumerUser"("id") ON DELETE CASCADE,
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE,
  FOREIGN KEY ("triggerId") REFERENCES "Trigger"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "Transaction_userId_isProcessed_idx" ON "Transaction"("userId", "isProcessed");
CREATE INDEX IF NOT EXISTS "Transaction_userId_transactedAt_idx" ON "Transaction"("userId", "transactedAt");
CREATE INDEX IF NOT EXISTS "Transaction_partnerId_idx" ON "Transaction"("partnerId");
CREATE INDEX IF NOT EXISTS "Transaction_triggerId_idx" ON "Transaction"("triggerId");

-- Seed: 5 transações de exemplo pra demo (do user demo)
INSERT INTO "Transaction" (
  "id", "userId", "partnerId", "type", "amountBrl", "description", "merchantName", "category", "transactedAt", "isProcessed"
) VALUES
('tx-001', 'demo-user-001', 'demo-partner-001', 'CARD', 37.00, 'Mercado Livre - Fone Sony', 'MERCADO LIVRE', 'varejo', CURRENT_TIMESTAMP - INTERVAL '2 hours', false),
('tx-002', 'demo-user-001', 'demo-partner-001', 'CARD', 6.40, 'Uber ride', 'UBER', 'transporte', CURRENT_TIMESTAMP - INTERVAL '4 hours', false),
('tx-003', 'demo-user-001', 'demo-partner-001', 'CARD', 102.10, 'Posto de gasolina', 'SHELL', 'transporte', CURRENT_TIMESTAMP - INTERVAL '6 hours', false),
('tx-004', 'demo-user-001', 'demo-partner-001', 'PIX_OUT', 25.50, 'Cafeteria', 'STARBUCKS', 'alimentacao', CURRENT_TIMESTAMP - INTERVAL '8 hours', false),
('tx-005', 'demo-user-001', 'demo-partner-001', 'CARD', 18.90, 'iFood pedido', 'IFOOD', 'delivery', CURRENT_TIMESTAMP - INTERVAL '10 hours', false)
ON CONFLICT (id) DO NOTHING;

SELECT 'Transacoes criadas: ' || count(*) FROM "Transaction";
SELECT 'Total de hoje: R$ ' || sum("amountBrl") FROM "Transaction" WHERE "isProcessed" = false;
