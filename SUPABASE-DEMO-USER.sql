-- Cria user demo pra o widget funcionar
INSERT INTO "ConsumerUser" (
  "id", "partnerId", "externalUserId", "name", "email", "phone", "consentStatus"
) VALUES (
  'demo-user-001',
  'demo-partner-001',
  'demo-user-001',
  'Demo User (Widget)',
  'demo@nextgenassets.com.br',
  '11999998888',
  'PENDING'
) ON CONFLICT (id) DO NOTHING;

SELECT id, name, email FROM "ConsumerUser";
