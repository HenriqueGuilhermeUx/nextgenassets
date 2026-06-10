// ============================================
//  EFI CONFIG — Single source of truth
//  Todas URLs e flags da Efí em um lugar só
// ============================================
//
// AMBIENTES (URLs oficiais confirmadas):
//   - Sandbox/Homologação: https://api-pix-h.gerencianet.com.br
//   - Produção:            https://api-pix.gerencianet.com.br
//   (A Efí mantém o domínio legado gerencianet.com.br
//    para Pix mesmo após rebranding pra efipay)
//
// AUTENTICAÇÃO:
//   POST /v1/authorization  (Basic Auth com Client ID:Secret)
//   Retorna access_token
//
// PIX OPERATIONS:
//   PUT  /v2/cob/:txid     (criar cobranca)
//   GET  /v2/loc/:id/qrcode (gerar QR)
//   POST /v2/pix           (enviar PIX)
//
// WEBHOOKS:
//   PUT  /v1/wh/:chave     (cadastrar URL webhook)
//
// FLAGS:
//   EFI_SANDBOX=true  → usa sandbox
//   EFI_DEMO_MODE !== 'false' → simula (nao chama API real)
// ============================================

export interface EfiConfig {
  // Ambiente
  sandbox: boolean;
  baseUrl: string;        // URL da API Efí (sandbox ou prod)

  // PIX key
  pixKey: string;

  // Modo de operacao
  demoMode: boolean;       // true = simula tudo (sem chamar API)

  // URLs que a gente EXPÕE (que a Efí vai chamar)
  webhookBaseUrl: string;  // onde a nossa API ta rodando
}

// Defaults de produção (caso nada seja passado)
// IMPORTANTE: a Efí mantém api-pix.gerencianet.com.br como URL oficial
// de produção pra Pix, mesmo após rebranding pra Efí Bank.
const DEFAULT_PRODUCTION = {
  baseUrl: 'https://api-pix.gerencianet.com.br',
  webhookBaseUrl: 'https://api.nextgenassets.com.br'
};

const DEFAULT_SANDBOX = {
  baseUrl: 'https://api-pix-h.gerencianet.com.br',
  webhookBaseUrl: 'https://api.nextgenassets.com.br'  // ainda produção (nossa API)
};

/**
 * Constroi a config baseada em env vars.
 * Use isso em TODOS os serviços que falam com a Efí.
 */
export function buildEfiConfig(env: NodeJS.ProcessEnv): EfiConfig {
  const sandbox = env.EFI_SANDBOX === 'true' || env.EFI_SANDBOX === true;
  const demoMode = env.EFI_DEMO_MODE !== 'false';

  const defaults = sandbox ? DEFAULT_SANDBOX : DEFAULT_PRODUCTION;

  return {
    sandbox,
    baseUrl: env.EFI_BASE_URL || defaults.baseUrl,
    pixKey: env.EFI_PIX_KEY || '',
    demoMode,
    webhookBaseUrl: env.NEXTGEN_BASE_URL || defaults.webhookBaseUrl
  };
}
