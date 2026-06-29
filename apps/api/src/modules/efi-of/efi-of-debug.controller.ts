// ============================================
//  EFI OPEN FINANCE DEBUG CONTROLLER
//  Rotas reais com prefixo global:
//  GET  /v1/admin/efi-of/health
//  POST /v1/admin/efi-of/test-token
//  POST /v1/admin/efi-of/test-consent
// ============================================

import { Body, Controller, Get, Post } from '@nestjs/common';
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
