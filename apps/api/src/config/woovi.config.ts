// ============================================
//  WOOVI CONFIG — Single source of truth
//  Docs: https://developers.woovi.com/
//
//  Endpoints:
//   - Produção:    https://api.woovi.com
//   - Sandbox:     https://api.woovi-sandbox.com
//   - POST /api/v1/charge             (criar cobrança - suporta split nativo)
//   - GET  /api/v1/charge/:id         (consultar)
//   - POST /api/v1/transfer           (PIX OUT - requer request access)
//   - GET  /api/v1/transfer/:id       (consultar PIX OUT)
//   - GET  /api/v1/webhook            (listar webhooks)
//   - POST /api/v1/webhook            (registrar webhook)
//
//  Auth: Authorization: <AppID>  (AppID é base64 de ClientId:ClientSecret)
//
//  Features:
//   - Split nativo em /charge (uma chamada = cobra + divide)
//   - PIX OUT via /transfer
//   - Webhook: charge.paid, charge.failed, transfer.paid
//   - mTLS: NÃO precisa (é só Bearer AppID)
//
//  Split payload (no /charge):
//   {
//     "value": 100,                    // total em centavos
//     "correlationID": "...",
//     "splits": [
//       { "pixKey": "<chave1>", "value": 3 },    // 3% NextGen
//       { "pixKey": "<chave2>", "value": 97 }    // 97% Partner
//     ]
//   }
// ============================================

export interface WooviConfig {
  apiUrl: string;
  appId: string;
  fromPixKey: string;
  webhookSecret?: string;
  enabled: boolean;
}

export function buildWooviConfig(env: NodeJS.ProcessEnv = process.env): WooviConfig {
  return {
    apiUrl: env.WOOVI_API_URL || 'https://api.woovi.com',
    appId: env.WOOVI_APP_ID || '',
    fromPixKey: env.WOOVI_FROM_PIX_KEY || '',
    webhookSecret: env.WOOVI_WEBHOOK_SECRET || '',
    enabled: env.WOOVI_ENABLED !== 'false'  // Woovi é primary por default
  };
}
