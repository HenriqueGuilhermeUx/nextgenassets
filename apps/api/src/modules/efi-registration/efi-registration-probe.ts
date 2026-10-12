import * as https from 'https';
import { loadEfiCaBundle } from '../efi-of/efi-ca-bundle';

export type EfiRegistrationProbeResult = {
  ok: boolean;
  status: number;
  tokenReceived: boolean;
  scopes: string[];
  registrationWrite: boolean;
  registrationRead: boolean;
  webhookWrite: boolean;
  webhookRead: boolean;
  errorCode?: string | null;
  errorDescription?: string | null;
};

export async function probeEfiRegistrationScopes(): Promise<EfiRegistrationProbeResult> {
  const clientId = String(process.env.EFI_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.EFI_CLIENT_SECRET || '').trim();
  const certBase64 = String(process.env.EFI_CERTIFICATE_BASE64 || process.env.EFI_P12_BASE64 || '').trim();
  const passphrase = String(
    process.env.EFI_CERT_PASSPHRASE ||
    process.env.EFI_CERT_PASSWORD ||
    process.env.EFI_CERTIFICATE_PASSWORD ||
    process.env.EFI_P12_PASSWORD ||
    ''
  ).trim();

  if (!clientId || !clientSecret || !certBase64) {
    return {
      ok: false,
      status: 0,
      tokenReceived: false,
      scopes: [],
      registrationWrite: false,
      registrationRead: false,
      webhookWrite: false,
      webhookRead: false,
      errorCode: 'MISSING_EFI_CONFIGURATION',
      errorDescription: 'EFI_CLIENT_ID, EFI_CLIENT_SECRET ou EFI_CERTIFICATE_BASE64 ausente.'
    };
  }

  const body = JSON.stringify({ grant_type: 'client_credentials' });
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const pfx = Buffer.from(certBase64.replace(/\s+/g, ''), 'base64');

  const agent = new https.Agent({
    pfx,
    passphrase,
    ca: loadEfiCaBundle(false),
    keepAlive: false,
    minVersion: 'TLSv1.2',
    secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT || 0,
    ciphers: 'DEFAULT:@SECLEVEL=0',
    // Mantém compatibilidade com a integração Efí atualmente em produção.
    // O objetivo deste probe é validar autorização/escopos, não alterar a política TLS existente.
    rejectUnauthorized: false
  });

  return new Promise((resolve) => {
    const req = https.request({
      method: 'POST',
      hostname: 'abrircontas.api.efipay.com.br',
      port: 443,
      path: '/v1/oauth/token',
      agent,
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed: any = {};
        try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = {}; }

        const scopes = String(parsed.scope || '')
          .split(/\s+/)
          .map((s: string) => s.trim())
          .filter(Boolean);

        resolve({
          ok: Number(res.statusCode || 0) >= 200 && Number(res.statusCode || 0) < 300,
          status: Number(res.statusCode || 0),
          tokenReceived: Boolean(parsed.access_token),
          scopes,
          registrationWrite: scopes.includes('gn.registration.write'),
          registrationRead: scopes.includes('gn.registration.read'),
          webhookWrite: scopes.includes('gn.registration.webhook.write'),
          webhookRead: scopes.includes('gn.registration.webhook.read'),
          errorCode: parsed.error || parsed.code || null,
          errorDescription: parsed.error_description || parsed.message || parsed.detail || null
        });
      });
    });

    req.on('error', (err: any) => resolve({
      ok: false,
      status: 0,
      tokenReceived: false,
      scopes: [],
      registrationWrite: false,
      registrationRead: false,
      webhookWrite: false,
      webhookRead: false,
      errorCode: 'NETWORK_OR_MTLS_ERROR',
      errorDescription: String(err?.message || err)
    }));

    req.setTimeout(30000, () => {
      req.destroy();
      resolve({
        ok: false,
        status: 0,
        tokenReceived: false,
        scopes: [],
        registrationWrite: false,
        registrationRead: false,
        webhookWrite: false,
        webhookRead: false,
        errorCode: 'TIMEOUT',
        errorDescription: 'Timeout ao consultar OAuth da API Abertura de Contas Efí.'
      });
    });

    req.write(body);
    req.end();
  });
}
