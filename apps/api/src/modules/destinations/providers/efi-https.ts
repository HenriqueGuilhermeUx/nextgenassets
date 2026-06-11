// ============================================
//  EFI HTTPS REQUEST — mTLS nativo (Node 20 fetch não suporta agent)
// ============================================
// Esta é a única forma de fazer requisições HTTPS com mTLS (P12) no Node.js.
// O fetch nativo do Node 20 ignora o `agent` (problema conhecido).
// Segue redirects 301/302/303/307/308 manualmente (Node não segue sozinho).
// ============================================

import * as https from 'https';
import { URL } from 'url';

export interface HttpsRequestOptions {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  pfx?: Buffer;
  passphrase?: string;
  rejectUnauthorized?: boolean;
  maxRedirects?: number;
}

export interface HttpsRequestResult {
  status: number;
  body: string;
  headers: Record<string, string>;
}

/**
 * Faz requisição HTTPS com mTLS via Node nativo.
 * Segue redirects 301/302/303/307/308 manualmente.
 */
export function httpsRequestWithMtls(opts: HttpsRequestOptions): Promise<HttpsRequestResult> {
  return new Promise((resolve, reject) => {
    const maxRedirects = opts.maxRedirects ?? 3;
    makeRequest(opts, maxRedirects, resolve, reject);
  });
}

function makeRequest(
  opts: HttpsRequestOptions,
  redirectsLeft: number,
  resolve: (r: HttpsRequestResult) => void,
  reject: (e: Error) => void
): void {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(opts.url);
  } catch (e: any) {
    reject(new Error(`Invalid URL: ${opts.url}`));
    return;
  }

  const reqOpts: https.RequestOptions = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.pathname + (parsedUrl.search || ''),
    method: opts.method,
    headers: opts.headers,
    pfx: opts.pfx,
    passphrase: opts.passphrase || '',
    rejectUnauthorized: opts.rejectUnauthorized ?? false
  };

  const req = https.request(reqOpts, (res) => {
    const chunks: Buffer[] = [];

    res.on('data', (chunk: Buffer) => chunks.push(chunk));

    res.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf-8');
      const status = res.statusCode || 0;
      const headers: Record<string, string> = {};
      Object.entries(res.headers).forEach(([k, v]) => {
        if (typeof v === 'string') headers[k] = v;
        else if (Array.isArray(v)) headers[k] = v.join(',');
      });

      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(status) && headers.location && redirectsLeft > 0) {
        const newUrl = headers.location.startsWith('http')
          ? headers.location
          : `${parsedUrl.protocol}//${parsedUrl.host}${headers.location}`;

        // 303/307/308: mantém método. 301/302: pode virar GET.
        const newMethod = [303].includes(status) ? 'GET' : opts.method;
        const newBody = [303].includes(status) ? undefined : opts.body;

        // Atualiza Host header
        const newHeaders = { ...opts.headers };
        if (newBody) {
          newHeaders['Content-Length'] = Buffer.byteLength(newBody).toString();
        } else {
          delete newHeaders['Content-Length'];
        }

        makeRequest(
          { ...opts, url: newUrl, method: newMethod, body: newBody, headers: newHeaders },
          redirectsLeft - 1,
          resolve,
          reject
        );
        return;
      }

      resolve({ status, body, headers });
    });
  });

  req.on('error', (err) => reject(err));

  if (opts.body) {
    req.write(opts.body);
  }
  req.end();
}
