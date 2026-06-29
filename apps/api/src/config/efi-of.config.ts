// ============================================
//  EFI OPEN FINANCE CONFIG
//  PISP - Payment Initiation Service Provider
//  Docs: https://dev.efipay.com.br
//
//  URL CORRETA (atualizada 2026-06-25 via suporte Efi):
//  Produção    https://openfinance.api.efipay.com.br
//  Homologação https://openfinance-h.api.efipay.com.br
// ============================================

export interface EfiOFConfig {
  apiUrl: string;
  oauthUrl: string;
  clientId: string;
  clientSecret: string;
  certBase64: string;
  certPassphrase: string;
  enabled: boolean;
}

export function buildEfiOFConfig(env: NodeJS.ProcessEnv = process.env): EfiOFConfig {
  return {
    apiUrl: env.EFI_OF_API_URL || 'https://openfinance.api.efipay.com.br',
    oauthUrl: env.EFI_OAUTH_URL || 'https://openfinance.api.efipay.com.br/v1/oauth/token',
    clientId: env.EFI_CLIENT_ID || '',
    clientSecret: env.EFI_CLIENT_SECRET || '',
    certBase64: (env.EFI_CERTIFICATE_BASE64 || env.EFI_P12_BASE64 || '').trim(),
    certPassphrase: (
      env.EFI_CERT_PASSPHRASE ||
      env.EFI_CERT_PASSWORD ||
      env.EFI_CERTIFICATE_PASSWORD ||
      env.EFI_P12_PASSWORD ||
      ''
    ).trim(),
    enabled: env.EFI_OF_ENABLED !== 'false'
  };
}
