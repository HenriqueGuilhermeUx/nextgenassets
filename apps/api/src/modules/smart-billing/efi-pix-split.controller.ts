// ============================================
//  NEXTGEN SMART BILLING — EFÍ PIX SPLIT BRIDGE
//  Rotas reais com prefixo global:
//  GET    /v1/company-billing/efi-pix-split/health
//  POST   /v1/company-billing/efi-pix-split/config
//  PUT    /v1/company-billing/efi-pix-split/config/:id
//  PUT    /v1/company-billing/efi-pix-split/cob/:txid
//  PUT    /v1/company-billing/efi-pix-split/cob/:txid/vinculo/:splitConfigId
//  GET    /v1/company-billing/efi-pix-split/cob/:txid
//  DELETE /v1/company-billing/efi-pix-split/cob/:txid/vinculo
//  PUT    /v1/company-billing/efi-pix-split/cobv/:txid
//  PUT    /v1/company-billing/efi-pix-split/cobv/:txid/vinculo/:splitConfigId
//  GET    /v1/company-billing/efi-pix-split/cobv/:txid
//  DELETE /v1/company-billing/efi-pix-split/cobv/:txid/vinculo
//  PUT    /v1/company-billing/efi-pix-split/pix/:e2eid/devolucao/:id
// ============================================

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as https from 'https';
import { randomUUID } from 'crypto';
import { loadEfiCaBundle } from '../efi-of/efi-ca-bundle';

const prisma = new PrismaClient();

type EfiHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

@Controller('company-billing/efi-pix-split')
export class EfiPixSplitController {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  @Get('health')
  async health() {
    return {
      success: true,
      service: 'efi-pix-split-bridge',
      baseUrl: this.getPixApiUrl(),
      hasClientId: !!process.env.EFI_CLIENT_ID,
      hasClientSecret: !!process.env.EFI_CLIENT_SECRET,
      hasCertificate: !!(process.env.EFI_CERTIFICATE_BASE64 || process.env.EFI_P12_BASE64),
      importantRules: [
        'Split Pix Efí só pode ser realizado entre contas Efí.',
        'Limite máximo informado: 20 contas para repasse.',
        'Não é permitido fazer split para a própria conta.',
        'Para clientes B2B, usar conta Efí ou subconta Efí do cliente/parceiro.'
      ],
      routes: [
        'POST /v1/company-billing/efi-pix-split/config',
        'PUT /v1/company-billing/efi-pix-split/config/:id',
        'PUT /v1/company-billing/efi-pix-split/cob/:txid',
        'PUT /v1/company-billing/efi-pix-split/cob/:txid/vinculo/:splitConfigId',
        'GET /v1/company-billing/efi-pix-split/cob/:txid',
        'DELETE /v1/company-billing/efi-pix-split/cob/:txid/vinculo',
        'PUT /v1/company-billing/efi-pix-split/cobv/:txid',
        'PUT /v1/company-billing/efi-pix-split/cobv/:txid/vinculo/:splitConfigId',
        'GET /v1/company-billing/efi-pix-split/cobv/:txid',
        'DELETE /v1/company-billing/efi-pix-split/cobv/:txid/vinculo',
        'PUT /v1/company-billing/efi-pix-split/pix/:e2eid/devolucao/:id'
      ]
    };
  }

  @Post('config')
  async createSplitConfig(@Body() body: any) {
    const result = await this.efiRequest('POST', '/v2/gn/split/config', body);
    await this.saveSplitConfigLog({
      partnerSlug: body.partnerSlug || 'nextgen-assets',
      method: 'POST',
      path: '/v2/gn/split/config',
      requestBody: body,
      result
    });
    return this.wrapResult('create-split-config', result);
  }

  @Put('config/:id')
  async upsertSplitConfig(@Param('id') id: string, @Body() body: any) {
    const path = `/v2/gn/split/config/${encodeURIComponent(id)}`;
    const result = await this.efiRequest('PUT', path, body);
    await this.saveSplitConfigLog({
      partnerSlug: body.partnerSlug || 'nextgen-assets',
      splitConfigId: id,
      method: 'PUT',
      path,
      requestBody: body,
      result
    });
    return this.wrapResult('upsert-split-config', result);
  }

  @Put('cob/:txid')
  async createCob(@Param('txid') txid: string, @Body() body: any) {
    const path = `/v2/cob/${encodeURIComponent(txid)}`;
    const result = await this.efiRequest('PUT', path, body);
    return this.wrapResult('create-cob', result);
  }

  @Put('cob/:txid/vinculo/:splitConfigId')
  async linkCob(@Param('txid') txid: string, @Param('splitConfigId') splitConfigId: string) {
    const path = `/v2/gn/split/cob/${encodeURIComponent(txid)}/vinculo/${encodeURIComponent(splitConfigId)}`;
    const result = await this.efiRequest('PUT', path, {});
    return this.wrapResult('link-cob-split', result);
  }

  @Get('cob/:txid')
  async getCob(@Param('txid') txid: string) {
    const path = `/v2/gn/split/cob/${encodeURIComponent(txid)}`;
    const result = await this.efiRequest('GET', path);
    return this.wrapResult('get-cob-split', result);
  }

  @Delete('cob/:txid/vinculo')
  async unlinkCob(@Param('txid') txid: string) {
    const path = `/v2/gn/split/cob/${encodeURIComponent(txid)}/vinculo`;
    const result = await this.efiRequest('DELETE', path);
    return this.wrapResult('unlink-cob-split', result);
  }

  @Put('cobv/:txid')
  async createCobv(@Param('txid') txid: string, @Body() body: any) {
    const path = `/v2/cobv/${encodeURIComponent(txid)}`;
    const result = await this.efiRequest('PUT', path, body);
    return this.wrapResult('create-cobv', result);
  }

  @Put('cobv/:txid/vinculo/:splitConfigId')
  async linkCobv(@Param('txid') txid: string, @Param('splitConfigId') splitConfigId: string) {
    const path = `/v2/gn/split/cobv/${encodeURIComponent(txid)}/vinculo/${encodeURIComponent(splitConfigId)}`;
    const result = await this.efiRequest('PUT', path, {});
    return this.wrapResult('link-cobv-split', result);
  }

  @Get('cobv/:txid')
  async getCobv(@Param('txid') txid: string) {
    const path = `/v2/gn/split/cobv/${encodeURIComponent(txid)}`;
    const result = await this.efiRequest('GET', path);
    return this.wrapResult('get-cobv-split', result);
  }

  @Delete('cobv/:txid/vinculo')
  async unlinkCobv(@Param('txid') txid: string) {
    const path = `/v2/gn/split/cobv/${encodeURIComponent(txid)}/vinculo`;
    const result = await this.efiRequest('DELETE', path);
    return this.wrapResult('unlink-cobv-split', result);
  }

  @Put('pix/:e2eid/devolucao/:id')
  async refundSplitPix(@Param('e2eid') e2eid: string, @Param('id') id: string, @Body() body: any) {
    const path = `/v2/gn/split/pix/${encodeURIComponent(e2eid)}/devolucao/${encodeURIComponent(id)}`;
    const result = await this.efiRequest('PUT', path, body);
    return this.wrapResult('refund-split-pix', result);
  }

  @Get('local-configs')
  async localConfigs(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.ensureLocalTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_billing_split_configs
      WHERE partner_id = ${partner.id}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return { success: true, configs: rows.map((r) => this.toCamel(r)) };
  }

  private async efiRequest(method: EfiHttpMethod, path: string, body?: any): Promise<{ status: number; data: any; text: string; path: string }> {
    const token = await this.ensurePixToken();
    const result = await this.mTLSRequest(method, path, body, { Authorization: `Bearer ${token}` });
    return { ...result, path };
  }

  private async ensurePixToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const clientId = process.env.EFI_CLIENT_ID || '';
    const clientSecret = process.env.EFI_CLIENT_SECRET || '';
    if (!clientId || !clientSecret) {
      throw new Error('EFI_CLIENT_ID / EFI_CLIENT_SECRET nao configurados');
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const oauthPath = process.env.EFI_PIX_OAUTH_PATH || '/oauth/token';
    const res = await this.mTLSRequest('POST', oauthPath, { grant_type: 'client_credentials' }, { Authorization: `Basic ${credentials}` });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Efi Pix OAuth error: ${res.status} - ${res.text}`);
    }

    this.accessToken = res.data?.access_token;
    this.tokenExpiresAt = Date.now() + Number(res.data?.expires_in || 300) * 1000;
    return this.accessToken!;
  }

  private mTLSRequest(method: EfiHttpMethod, path: string, body?: any, extraHeaders?: Record<string, string>): Promise<{ status: number; data: any; text: string }> {
    const certBase64 = (process.env.EFI_CERTIFICATE_BASE64 || process.env.EFI_P12_BASE64 || '').trim();
    if (!certBase64) throw new Error('EFI_CERTIFICATE_BASE64 nao configurado');

    const pfx = Buffer.from(certBase64, 'base64');
    const passphrase = (process.env.EFI_CERT_PASSPHRASE || process.env.EFI_CERT_PASSWORD || process.env.EFI_CERTIFICATE_PASSWORD || process.env.EFI_P12_PASSWORD || '').trim();
    const baseUrl = this.getPixApiUrl();
    const fullUrl = baseUrl.endsWith(path) ? baseUrl : `${baseUrl}${path}`;
    const url = new URL(fullUrl);
    const requestBody = body && method !== 'GET' && method !== 'DELETE' ? JSON.stringify(this.stripInternalFields(body)) : '';

    let ca: Buffer | Buffer[] | undefined;
    try {
      ca = loadEfiCaBundle(url.hostname.includes('-h.'));
    } catch {
      ca = undefined;
    }

    const agent = new https.Agent({
      pfx,
      passphrase,
      ca,
      keepAlive: true,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: false
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        method,
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        agent,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
          ...(extraHeaders || {})
        }
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8');
          try {
            resolve({ status: res.statusCode || 0, data: JSON.parse(text), text });
          } catch {
            resolve({ status: res.statusCode || 0, data: null, text });
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error('timeout 60s'));
      });
      if (requestBody) req.write(requestBody);
      req.end();
    });
  }

  private wrapResult(action: string, result: { status: number; data: any; text: string; path: string }) {
    return {
      success: result.status >= 200 && result.status < 300,
      action,
      status: result.status,
      path: result.path,
      response: result.data || result.text,
      text: result.text
    };
  }

  private getPixApiUrl() {
    return (process.env.EFI_PIX_API_URL || 'https://pix.api.efipay.com.br').replace(/\/$/, '');
  }

  private stripInternalFields(body: any) {
    if (!body || typeof body !== 'object') return body;
    const { partnerSlug, partnerName, saveLocal, ...rest } = body;
    return rest;
  }

  private async saveSplitConfigLog(opts: { partnerSlug: string; splitConfigId?: string; method: string; path: string; requestBody: any; result: any }) {
    await this.ensureLocalTables();
    const partner = await this.getOrCreatePartner(opts.partnerSlug);
    const splitConfigId = opts.splitConfigId || opts.result?.data?.id || opts.result?.data?.splitConfigId || opts.result?.data?.configuracaoSplit?.id || `pending-${randomUUID()}`;
    const id = `spc_${randomUUID().replace(/-/g, '')}`;
    const rawData = JSON.stringify({
      method: opts.method,
      path: opts.path,
      request: this.maskSensitive(opts.requestBody),
      response: opts.result?.data || opts.result?.text,
      status: opts.result?.status
    });

    await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_split_configs (id, partner_id, split_config_id, provider, status, raw_data)
      VALUES (${id}, ${partner.id}, ${splitConfigId}, 'efi-pix', ${opts.result?.status >= 200 && opts.result?.status < 300 ? 'ACTIVE' : 'ERROR'}, ${rawData}::jsonb)
      ON CONFLICT (partner_id, split_config_id)
      DO UPDATE SET status = EXCLUDED.status, raw_data = EXCLUDED.raw_data, updated_at = now()
      RETURNING *
    `;
  }

  private async ensureLocalTables() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_billing_split_configs (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        split_config_id text NOT NULL,
        provider text NOT NULL DEFAULT 'efi-pix',
        status text NOT NULL DEFAULT 'PENDING',
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sbsc_partner_config ON smart_billing_split_configs(partner_id, split_config_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sbsc_partner_status ON smart_billing_split_configs(partner_id, status)`);
  }

  private async getOrCreatePartner(slug: string, name?: string) {
    return prisma.partner.upsert({
      where: { slug },
      update: name ? { name } : {},
      create: { slug, name: name || this.titleFromSlug(slug), type: 'FINTECH' as any, config: {}, commissionRate: 0.03, tier: 'STARTER' as any } as any
    });
  }

  private maskSensitive(value: any): any {
    if (Array.isArray(value)) return value.map((item) => this.maskSensitive(item));
    if (!value || typeof value !== 'object') return value;
    const out: any = {};
    for (const [key, val] of Object.entries(value)) {
      const k = key.toLowerCase();
      if (k.includes('document') || k.includes('cpf') || k.includes('cnpj') || k.includes('conta') || k.includes('chave')) {
        out[key] = typeof val === 'string' ? this.maskString(val) : '[masked]';
      } else {
        out[key] = this.maskSensitive(val);
      }
    }
    return out;
  }

  private maskString(value: string) {
    if (!value) return value;
    if (value.length <= 6) return '******';
    return `${value.slice(0, 3)}******${value.slice(-3)}`;
  }

  private toCamel(row: any) {
    if (!row) return row;
    const out: any = {};
    for (const [key, value] of Object.entries(row)) {
      out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
    }
    return out;
  }

  private titleFromSlug(slug: string) {
    return slug.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
}
