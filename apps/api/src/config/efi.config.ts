// ============================================
//  EFI CONFIG — Single source of truth
//  Todas URLs e flags da Efí em um lugar só
// ============================================
//
// URLS OFICIAIS CONFIRMADAS NA DOC (dev.efipay.com.br):
//
//   OAuth (access_token):
//     - Produção:     https://pix.api.efipay.com.br/oauth/token
//     - Homologação:  https://pix-h.api.efipay.com.br/oauth/token
//   (Domínio DIFERENTE da API Pix - pega token aqui)
//
//   API Pix (cob, pix, webhook):
//     - Produção:     https://api-pix.gerencianet.com.br
//     - Homologação:  https://api-pix-h.gerencianet.com.br
//   (Domínio legado gerencianet.com.br mantido pela Efí)
//
//   Endpoints v2 (versão atual - v1 está deprecated):
//     - POST /oauth/token               (OAuth - em pix.api.efipay.com.br)
//     - PUT  /v2/webhook/:chave         (registrar webhook)
//     - PUT  /v2/cob/:txid              (criar cobrança)
//     - GET  /v2/loc/:id/qrcode         (gerar QR)
//     - POST /v2/pix                    (enviar PIX)
//
// FLAGS:
//   EFI_SANDBOX=true  → usa homologação
//   EFI_DEMO_MODE !== 'false' → simula (nao chama API real)
// ============================================

export interface EfiConfig {
  // Ambiente
  sandbox: boolean;

  // URLs da Efí (separadas porque OAuth fica em domínio DIFERENTE)
  apiBaseUrl: string;      // API Pix (cob, pix, webhook)
  oauthBaseUrl: string;    // OAuth (access_token)
  webhookBaseUrl: string;  // URL da NOSSA API (que Efí vai chamar)

  // PIX key
  pixKey: string;

  // Modo de operacao
  demoMode: boolean;
}

// URLs OFICIAIS (confirmadas em dev.efipay.com.br/docs/api-pix/credenciais)
const DEFAULT_PRODUCTION = {
  apiBaseUrl: 'https://api-pix.gerencianet.com.br',
  oauthBaseUrl: 'https://pix.api.efipay.com.br',
  webhookBaseUrl: 'https://api.nextgenassets.com.br'
};

const DEFAULT_SANDBOX = {
  apiBaseUrl: 'https://api-pix-h.gerencianet.com.br',
  oauthBaseUrl: 'https://pix-h.api.efipay.com.br',
  webhookBaseUrl: 'https://api.nextgenassets.com.br'
};

/**
 * Constroi a config baseada em env vars.
 * Use isso em TODOS os serviços que falam com a Efí.
 */
export function buildEfiConfig(env: NodeJS.ProcessEnv): EfiConfig {
  const sandbox = env.EFI_SANDBOX === 'true' || env.EFI_SANDBOX === 'true';
  const demoMode = env.EFI_DEMO_MODE !== 'false';

  const defaults = sandbox ? DEFAULT_SANDBOX : DEFAULT_PRODUCTION;

  return {
    sandbox,
    apiBaseUrl: env.EFI_BASE_URL || defaults.apiBaseUrl,
    oauthBaseUrl: env.EFI_OAUTH_URL || defaults.oauthBaseUrl,
    pixKey: env.EFI_PIX_KEY || '',
    demoMode,
    webhookBaseUrl: env.NEXTGEN_BASE_URL || defaults.webhookBaseUrl
  };
}

// Manter compatibilidade com código antigo (deprecated alias)
export const EFI_CONFIG_LEGACY: any = null;
