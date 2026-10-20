import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Opt-in and strictly non-monetary diagnostic of the existing Efí PRODUCTION
 * Open Finance application. OAuth client_credentials is a token exchange;
 * the sole banking resource permitted here is GET /pagamentos-automaticos/adesao.
 *
 * Never set this flag in the public consumer/merchant client, staging connected
 * to third-party production data, or an environment running financial workers.
 */
export function assertEfiProductionReadOnly(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NEXTGEN_EFI_PRODUCTION_READ_ONLY_ENABLED !== 'true') {
    throw new ServiceUnavailableException('EFI_PRODUCTION_READ_ONLY_DISABLED');
  }
  if (
    env.NEXTGEN_EFI_AUTOMATIC_ENABLED === 'true' ||
    env.NEXTGEN_EFI_AUTOMATIC_SANDBOX_REQUESTS === 'true' ||
    env.NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS === 'true' ||
    env.NEXTGEN_CENTRALIZED_D1_ENABLED === 'true' ||
    env.NEXTGEN_DISABLE_BACKGROUND_WORKERS !== 'true'
  ) {
    throw new ServiceUnavailableException('EFI_PRODUCTION_READ_ONLY_REQUIRES_WORKER_AND_PAYMENT_SHUTDOWN');
  }
  const api = env.EFI_OF_API_URL;
  const oauth = env.EFI_OAUTH_URL;
  // Exact strings prevent lookalike hosts, embedded credentials, query suffixes
  // and fallbacks accidentally routing sensitive credentials elsewhere.
  if (api !== 'https://openfinance.api.efipay.com.br' ||
      oauth !== 'https://openfinance.api.efipay.com.br/v1/oauth/token') {
    throw new ServiceUnavailableException('EFI_PRODUCTION_READ_ONLY_HOST_INVALID');
  }
  const cert = env.EFI_CERTIFICATE_BASE64 || env.EFI_P12_BASE64 || '';
  if (!env.EFI_CLIENT_ID || !env.EFI_CLIENT_SECRET || cert.length < 256) {
    throw new ServiceUnavailableException('EFI_PRODUCTION_READ_ONLY_MTLS_CREDENTIALS_MISSING');
  }
}

export function efiProductionReadOnlyPreflight(env: NodeJS.ProcessEnv = process.env) {
  const movementOff =
    env.NEXTGEN_EFI_AUTOMATIC_ENABLED !== 'true' &&
    env.NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS !== 'true' &&
    env.NEXTGEN_CENTRALIZED_D1_ENABLED !== 'true';
  return {
    mode: 'OFFLINE_PRECHECK_ONLY',
    enabled: env.NEXTGEN_EFI_PRODUCTION_READ_ONLY_ENABLED === 'true',
    dedicatedProductionHost:
      env.EFI_OF_API_URL === 'https://openfinance.api.efipay.com.br' &&
      env.EFI_OAUTH_URL === 'https://openfinance.api.efipay.com.br/v1/oauth/token',
    mtlsMaterialPresent: Boolean(env.EFI_CLIENT_ID && env.EFI_CLIENT_SECRET &&
      (env.EFI_CERTIFICATE_BASE64 || env.EFI_P12_BASE64)),
    movementFeaturesDisabled: movementOff,
    legacyWorkersDisabled: env.NEXTGEN_DISABLE_BACKGROUND_WORKERS === 'true',
    authorizationVerified: false,
    bankingAccessExecuted: false
  };
}
