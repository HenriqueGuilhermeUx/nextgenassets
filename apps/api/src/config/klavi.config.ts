// ============================================
//  KLAVI CONFIG — Single source of truth
//  Docs: https://docs.klavi.ai/
//
//  Endpoints:
//   - Sandbox:  https://api-sandbox.klavi.ai
//   - Produção: https://api.klavi.ai
//   - POST   /data/v1/auth                       (criar accessToken)
//   - POST   /data/v1/links                      (criar link whitelabel)
//   - GET    /data/v1/links/{linkId}            (consultar link)
//   - GET    /data/v1/institutions               (listar bancos - requer linkToken)
//   - POST   /data/v1/consents                   (criar consentimento)
//   - GET    /data/v1/personal/user-data         (relatório pessoal)
//   - GET    /data/v1/business/user-data         (relatório empresarial)
//
//  Auth: accessKey + secretKey → accessToken (JWT 30min)
//
//  VANTAGEM vs Pluggy: MAIS BARATO (preço sob consulta, sandbox grátis)
// ============================================

export interface KlaviConfig {
  apiUrl: string;
  accessKey: string;
  secretKey: string;
  productType: 'OF' | 'OD';
  enabled: boolean;
}

export function buildKlaviConfig(env: NodeJS.ProcessEnv = process.env): KlaviConfig {
  return {
    apiUrl: env.KLAVI_API_URL || 'https://api-sandbox.klavi.ai',
    accessKey: env.KLAVI_ACCESS_KEY || '',
    secretKey: env.KLAVI_SECRET_KEY || '',
    productType: (env.KLAVI_PRODUCT_TYPE as 'OF' | 'OD') || 'OF',
    enabled: env.KLAVI_ENABLED !== 'false'  // Klavi é primary por default
  };
}
