// ============================================
//  EFI OPEN FINANCE DEBUG CONTROLLER
//  Rotas reais com prefixo global:
//  GET  /v1/admin/efi-of/health
//  GET  /v1/admin/efi-of/cert-check
//  GET  /v1/admin/efi-of/test-token
//  GET  /v1/admin/efi-of/participants
//  GET  /v1/admin/efi-of/participants-efi
//  POST /v1/admin/efi-of/test-token
//  POST /v1/admin/efi-of/test-consent
// ============================================

import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { createHash } from 'crypto';
import * as tls from 'tls';
import { EfiOFService } from './efi-of.service';
import { buildEfiOFConfig } from '../../config/efi-of.config';

@Controller('admin/efi-of')
export class EfiOFDebugController {
  constructor(private readonly efiOF: EfiOFService) {}

  @Get('health')
  health() {
    const cfg = buildEfiOFConfig(process.env);
    return {
      success: true,
      enabled: cfg.enabled,
      apiUrl: cfg.apiUrl,
      oauthUrl: cfg.oauthUrl,
      hasClientId: Boolean(cfg.clientId),
      hasClientSecret: Boolean(cfg.clientSecret),
      hasCertificateBase64: Boolean(cfg.certBase64),
      certificateBase64Length: cfg.certBase64?.length || 0,
      hasPassphrase: Boolean(cfg.certPassphrase),
      expectedWebhookUrls: {
        efiPublic: '/v1/webhooks/efi-public',
        efiPublicPix: '/v1/webhooks/efi-public/pix',
        efiOpenFinance: '/v1/webhooks/efi-of-public',
        efiOpenFinancePing: '/v1/webhooks/efi-of/ping'
      }
    };
  }

  @Get('cert-check')
  certCheck() {
    const cfg = buildEfiOFConfig(process.env);
    const rawBase64 = cfg.certBase64 || '';
    const compactBase64 = rawBase64.replace(/\s+/g, '');
    const pfx = Buffer.from(compactBase64, 'base64');
    const sha256 = createHash('sha256').update(pfx).digest('hex');

    const attempts = [
      { name: 'no-passphrase-field', options: { pfx } },
      { name: 'empty-string-passphrase', options: { pfx, passphrase: '' } },
      { name: 'configured-passphrase', options: { pfx, passphrase: cfg.certPassphrase } }
    ];

    const results = attempts.map((attempt) => {
      try {
        tls.createSecureContext(attempt.options as any);
        return { name: attempt.name, ok: true };
      } catch (err: any) {
        return { name: attempt.name, ok: false, error: err.message };
      }
    });

    const anyOk = results.some((r) => r.ok);

    return {
      success: anyOk,
      hasCertificateBase64: Boolean(rawBase64),
      originalBase64Length: rawBase64.length,
      compactBase64Length: compactBase64.length,
      decodedBytes: pfx.length,
      sha256Start: sha256.slice(0, 12),
      sha256End: sha256.slice(-12),
      hasPassphrase: Boolean(cfg.certPassphrase),
      results,
      diagnosis: anyOk
        ? 'O .p12 abre localmente. Se o token falhar, o problema provavelmente é credencial, app Efí, permissão Open Finance ou endpoint.'
        : 'O .p12 NÃO abre localmente. Se não tem senha, quase certo que EFI_CERTIFICATE_BASE64 não é o arquivo .p12 correto inteiro, ou foi convertido/colado errado.'
    };
  }

  @Get('test-token')
  async testTokenBrowser() {
    return this.efiOF.testConnection();
  }

  @Get('participants')
  async participants(@Query('nome') nome?: string) {
    try {
      const token = await this.efiOF.ensureToken();
      const query = nome ? `?nome=${encodeURIComponent(nome)}` : '';
      const result = await (this.efiOF as any).mTLSRequest({
        method: 'GET',
        path: `/v1/participantes${query}`,
        extraHeaders: { Authorization: `Bearer ${token}` }
      });
      return { success: result.status >= 200 && result.status < 300, status: result.status, data: result.data, text: result.text };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  @Get('participants-efi')
  async participantsEfi() {
    const nomes = ['efi', 'efipay', 'efi s.a', 'instituicao de pagamento'];
    const results: any[] = [];
    for (const nome of nomes) {
      try {
        const token = await this.efiOF.ensureToken();
        const result = await (this.efiOF as any).mTLSRequest({
          method: 'GET',
          path: `/v1/participantes?nome=${encodeURIComponent(nome)}`,
          extraHeaders: { Authorization: `Bearer ${token}` }
        });
        results.push({ nome, ok: result.status >= 200 && result.status < 300, status: result.status, data: result.data, text: result.text });
      } catch (err: any) {
        results.push({ nome, ok: false, error: err.message });
      }
    }
    return { success: true, message: 'Procure o identificador aceito em pagador.idParticipante.', results };
  }

  @Post('test-token')
  async testToken() {
    return this.efiOF.testConnection();
  }

  @Post('test-consent')
  async testConsent(@Body() body: any) {
    const required = ['idParticipante', 'favorecido', 'intervalo', 'dataInicio'];
    const missing = required.filter((key) => !body[key]);
    if (!body.cpf && !body.cnpj) missing.push('cpf ou cnpj');
    if (missing.length) {
      return {
        success: false,
        error: 'MISSING_FIELDS',
        missing,
        example: {
          cpf: '34198276870',
          nome: 'Cliente Teste',
          idParticipante: 'uuid-do-banco-pagador',
          favorecido: {
            nome: 'NextGen Assets',
            documento: '00000000000000',
            codigoBanco: '00000000',
            agencia: '0001',
            conta: '00000000',
            tipoConta: 'TRAN'
          },
          intervalo: 'MENSAL',
          dataInicio: '2026-07-05',
          descricao: 'Teste NextGen Assets'
        }
      };
    }

    try {
      const result = await this.efiOF.createConsent(body);
      return { success: true, result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
