// ============================================
//  EFI OPEN FINANCE ADMIN FLOW
//  Rotas reais com prefixo global:
//  GET  /v1/admin/efi-of/favored-check
//  POST /v1/admin/efi-of/create-adhesion
//  POST /v1/admin/efi-of/create-immediate-pix
//  POST /v1/admin/efi-of/create-automatic-pix
//  GET  /v1/admin/efi-of/automatic-pix/:endToEndId
//  GET  /v1/admin/efi-of/adhesion/:identificadorAdesao
// ============================================

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { EfiOFService } from './efi-of.service';

const prisma = new PrismaClient();

type AccountType = 'TRAN' | 'CACC' | 'SVGS';

@Controller('admin/efi-of')
export class EfiOFAdminController {
  constructor(private readonly efiOF: EfiOFService) {}

  @Get('favored-check')
  favoredCheck() {
    const favored = this.getFavoredFromEnv();
    return {
      success: favored.ok,
      missing: favored.missing,
      favorecido: favored.ok ? this.maskFavored(favored.value) : null,
      requiredEnv: [
        'EFI_OF_FAVORECIDO_NOME',
        'EFI_OF_FAVORECIDO_DOCUMENTO',
        'EFI_OF_FAVORECIDO_CODIGO_BANCO',
        'EFI_OF_FAVORECIDO_AGENCIA',
        'EFI_OF_FAVORECIDO_CONTA',
        'EFI_OF_FAVORECIDO_TIPO_CONTA'
      ]
    };
  }

  @Post('create-adhesion')
  async createAdhesion(@Body() body: any) {
    const favored = this.getFavoredFromEnv(body.favorecido);
    if (!favored.ok) {
      return {
        success: false,
        error: 'MISSING_FAVORED_ENV',
        message: 'Configure os dados da conta favorecida no Render antes de criar adesão.',
        missing: favored.missing,
        requiredEnv: [
          'EFI_OF_FAVORECIDO_NOME',
          'EFI_OF_FAVORECIDO_DOCUMENTO',
          'EFI_OF_FAVORECIDO_CODIGO_BANCO',
          'EFI_OF_FAVORECIDO_AGENCIA',
          'EFI_OF_FAVORECIDO_CONTA',
          'EFI_OF_FAVORECIDO_TIPO_CONTA'
        ]
      };
    }

    const missing = this.validateAdhesionBody(body);
    if (missing.length) {
      return {
        success: false,
        error: 'MISSING_FIELDS',
        missing,
        example: {
          cpf: '00000000000',
          nome: 'Cliente Teste',
          idParticipante: 'uuid-do-banco-pagador',
          intervalo: 'MENSAL',
          dataInicio: '2026-07-05',
          descricao: 'Teste NextGen Assets'
        }
      };
    }

    try {
      const partner = await this.getOrCreatePartner(body.partnerSlug || process.env.NEXTGEN_DEFAULT_PARTNER_SLUG || 'nextgen-assets');
      const user = await this.getOrCreateConsumerUser({
        partnerId: partner.id,
        externalUserId: body.cpf || body.cnpj,
        name: body.nome,
        email: body.email,
        phone: body.phone
      });

      const result = await this.efiOF.createConsent({
        cpf: body.cpf,
        cnpj: body.cnpj,
        nome: body.nome,
        idParticipante: body.idParticipante,
        favorecido: favored.value,
        valorFixo: body.valorFixo,
        valorMinimo: body.valorMinimo,
        valorMaximo: body.valorMaximo,
        intervalo: body.intervalo || 'MENSAL',
        dataInicio: body.dataInicio,
        expiracao: body.expiracao,
        descricao: body.descricao || 'NextGen Assets - Adesão Open Finance',
        permiteRetentativa: body.permiteRetentativa ?? false
      });

      const consent = await prisma.consent.upsert({
        where: { userId_provider: { userId: user.id, provider: 'efi-of' } },
        update: {
          status: 'PENDING' as any,
          providerUserId: body.cpf || body.cnpj,
          scopes: ['accounts.read', 'transactions.read', 'payments.initiate'],
          expiresAt: body.expiracao ? new Date(body.expiracao) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          metadata: {
            efiIdentificadorAdesao: result.identificadorAdesao,
            redirectURI: result.redirectURI,
            idParticipante: body.idParticipante,
            favorecido: this.maskFavored(favored.value),
            rawInput: this.maskInput(body)
          } as any
        },
        create: {
          userId: user.id,
          partnerId: partner.id,
          provider: 'efi-of',
          providerUserId: body.cpf || body.cnpj,
          scopes: ['accounts.read', 'transactions.read', 'payments.initiate'],
          status: 'PENDING' as any,
          expiresAt: body.expiracao ? new Date(body.expiracao) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          metadata: {
            efiIdentificadorAdesao: result.identificadorAdesao,
            redirectURI: result.redirectURI,
            idParticipante: body.idParticipante,
            favorecido: this.maskFavored(favored.value),
            rawInput: this.maskInput(body)
          } as any
        } as any
      });

      await prisma.auditLog.create({
        data: {
          partnerId: partner.id,
          userId: user.id,
          actor: 'admin:efi-of',
          action: 'EFI_OF_ADHESION_CREATED',
          resource: 'consent',
          resourceId: consent.id,
          metadata: {
            identificadorAdesao: result.identificadorAdesao,
            redirectURI: result.redirectURI,
            provider: 'efi-of'
          } as any
        } as any
      });

      return {
        success: true,
        message: 'Adesão criada. Abra redirectURI para o cliente autorizar no banco pagador.',
        partner: { id: partner.id, slug: partner.slug, name: partner.name },
        user: { id: user.id, externalUserId: user.externalUserId, name: user.name },
        consent: { id: consent.id, status: consent.status },
        result
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        hint: 'Se o token já funcionou, esse erro provavelmente é payload da adesão: idParticipante, conta favorecida, CPF/CNPJ ou permissões do app Efí.'
      };
    }
  }

  @Post('create-immediate-pix')
  async createImmediatePix(@Body() body: any) {
    const favored = this.getFavoredFromEnv(body.favorecido);
    if (!favored.ok) {
      return { success: false, error: 'MISSING_FAVORED_ENV', missing: favored.missing };
    }

    const missing: string[] = [];
    if (!body.cpf && !body.cnpj) missing.push('cpf ou cnpj do pagador');
    if (!body.nome) missing.push('nome do pagador');
    if (!body.idParticipante) missing.push('idParticipante do banco pagador');
    if (!body.valor) missing.push('valor');
    if (missing.length) return { success: false, error: 'MISSING_FIELDS', missing };

    const valor = String(body.valor).replace(',', '.');
    const token = await this.efiOF.ensureToken();
    const idProprio = body.idProprio || `nextgen-pix-${Date.now()}`;
    const idempotencyKey = randomUUID();

    const payload = {
      pagador: {
        cpf: body.cpf ? this.onlyDigits(body.cpf) : undefined,
        cnpj: body.cnpj ? this.onlyDigits(body.cnpj) : undefined,
        nome: body.nome,
        idParticipante: body.idParticipante
      },
      favorecido: {
        contaBanco: {
          nome: favored.value.nome,
          documento: this.onlyDigits(favored.value.documento),
          codigoBanco: favored.value.codigoBanco,
          agencia: favored.value.agencia,
          conta: favored.value.conta,
          tipoConta: favored.value.tipoConta || 'TRAN'
        }
      },
      valor,
      idProprio,
      descricao: body.descricao || 'Teste NextGen Assets - Pix imediato'
    };

    try {
      const result = await (this.efiOF as any).mTLSRequest({
        method: 'POST',
        path: '/v1/pagamentos/pix',
        body: payload,
        extraHeaders: { Authorization: `Bearer ${token}`, 'x-idempotency-key': idempotencyKey }
      });

      return {
        success: result.status >= 200 && result.status < 300,
        status: result.status,
        message: result.status >= 200 && result.status < 300
          ? 'Pix imediato criado. Procure redirectURI/url na resposta para autorizar no banco.'
          : 'Efí recusou o payload. A resposta abaixo mostra o próximo campo a ajustar.',
        request: {
          pagador: {
            cpf: body.cpf ? this.maskDoc(body.cpf) : undefined,
            cnpj: body.cnpj ? this.maskDoc(body.cnpj) : undefined,
            nome: body.nome,
            idParticipante: body.idParticipante
          },
          favorecido: this.maskFavored(favored.value),
          valor,
          idProprio
        },
        response: result.data || result.text
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  @Post('create-automatic-pix')
  async createAutomaticPix(@Body() body: any) {
    const missing: string[] = [];
    if (!body.identificadorAdesao) missing.push('identificadorAdesao');
    if (!body.valor) missing.push('valor');
    if (missing.length) {
      return {
        success: false,
        error: 'MISSING_FIELDS',
        missing,
        example: {
          identificadorAdesao: 'urn:banco:exemplo',
          valor: '0.01',
          data: '2026-07-05'
        }
      };
    }

    const token = await this.efiOF.ensureToken();
    const valor = String(body.valor).replace(',', '.');
    const data = body.data || body.dataPagamento || body.paymentDate || new Date().toISOString().split('T')[0];
    const identificadorAdesao = body.identificadorAdesao;
    const variant = body.variant || 'pagamentoDataOnly';
    const idempotencyKey = randomUUID();

    const base = { identificadorAdesao, valor, data };
    const payload = this.buildAutomaticPixPayload(variant, base);

    try {
      const result = await (this.efiOF as any).mTLSRequest({
        method: 'POST',
        path: body.path || '/v1/pagamentos-automaticos/pix',
        body: payload,
        extraHeaders: { Authorization: `Bearer ${token}`, 'x-idempotency-key': idempotencyKey }
      });

      let transaction: any = null;
      if (result.status >= 200 && result.status < 300) {
        transaction = await this.persistAutomaticPix(identificadorAdesao, result.data || result.text, {
          valor,
          data,
          variant,
          sent: payload,
          idempotencyKey
        });
      }

      return {
        success: result.status >= 200 && result.status < 300,
        status: result.status,
        variant,
        message: result.status >= 200 && result.status < 300
          ? 'Pix automático criado/enviado com sucesso.'
          : 'Efí recusou o payload. Use a resposta para ajustar o próximo campo.',
        transaction,
        sent: payload,
        response: result.data || result.text,
        text: result.text
      };
    } catch (err: any) {
      return { success: false, error: err.message, variant, sent: payload };
    }
  }

  @Get('automatic-pix/:endToEndId')
  async getAutomaticPix(@Param('endToEndId') endToEndId: string) {
    const tx = await prisma.transaction.findFirst({
      where: { endToEndId },
      orderBy: { createdAt: 'desc' }
    });

    if (!tx) {
      return {
        success: false,
        error: 'AUTOMATIC_PIX_NOT_FOUND',
        message: 'Nenhum Pix automático local foi encontrado com esse endToEndId.'
      };
    }

    const raw = tx.rawData as any;
    return {
      success: true,
      payment: {
        id: tx.id,
        endToEndId: tx.endToEndId,
        status: raw?.efiResponse?.status || raw?.status || 'unknown',
        amountBrl: String(tx.amountBrl),
        data: raw?.efiResponse?.data || raw?.data,
        type: tx.type,
        description: tx.description,
        transactedAt: tx.transactedAt,
        createdAt: tx.createdAt
      },
      rawData: tx.rawData
    };
  }

  @Get('adhesion/:identificadorAdesao')
  async getAdhesion(@Param('identificadorAdesao') identificadorAdesao: string) {
    try {
      const data = await this.efiOF.getAdesao(identificadorAdesao);
      const localSync = await this.syncAdhesionStatus(identificadorAdesao, data);
      return { success: true, data, localSync };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private buildAutomaticPixPayload(variant: string, base: any) {
    if (variant === 'pagamentoData') {
      return {
        identificadorAdesao: base.identificadorAdesao,
        pagamento: { data: base.data, valor: base.valor }
      };
    }

    if (variant === 'pagamentoDataOnly') {
      return {
        identificadorAdesao: base.identificadorAdesao,
        pagamento: { data: base.data, valor: base.valor }
      };
    }

    if (variant === 'pagamentoNestedValue') {
      return {
        identificadorAdesao: base.identificadorAdesao,
        pagamento: { data: base.data, valor: { original: base.valor } }
      };
    }

    return {
      identificadorAdesao: base.identificadorAdesao,
      pagamento: { data: base.data, valor: base.valor }
    };
  }

  private async persistAutomaticPix(identificadorAdesao: string, efiResponse: any, input: any) {
    const consent = await this.findConsentByAdhesionId(identificadorAdesao);
    const endToEndId = efiResponse?.endToEndId || null;
    const amount = String(input.valor || '0').replace(',', '.');
    const paymentDate = efiResponse?.data || input.data || new Date().toISOString().split('T')[0];

    if (!consent) {
      await prisma.auditLog.create({
        data: {
          actor: 'admin:efi-of',
          action: 'EFI_OF_AUTOMATIC_PIX_CREATED_NO_LOCAL_CONSENT',
          resource: 'payment',
          resourceId: endToEndId || `automatic-pix-${Date.now()}`,
          metadata: { identificadorAdesao, input, efiResponse } as any
        } as any
      });
      return { saved: false, reason: 'LOCAL_CONSENT_NOT_FOUND', endToEndId };
    }

    const existing = endToEndId
      ? await prisma.transaction.findFirst({ where: { endToEndId } })
      : null;

    const data = {
      userId: consent.userId,
      partnerId: consent.partnerId,
      type: 'PIX_OUT' as any,
      amountBrl: amount as any,
      description: 'Pix automático Open Finance Efí',
      endToEndId,
      isProcessed: false,
      rawData: {
        provider: 'efi-of',
        flow: 'automatic-pix',
        identificadorAdesao,
        input,
        efiResponse,
        status: efiResponse?.status || 'unknown'
      } as any,
      transactedAt: new Date(`${paymentDate}T12:00:00.000Z`)
    };

    const transaction = existing
      ? await prisma.transaction.update({ where: { id: existing.id }, data })
      : await prisma.transaction.create({ data });

    await prisma.auditLog.create({
      data: {
        partnerId: consent.partnerId,
        userId: consent.userId,
        actor: 'admin:efi-of',
        action: 'EFI_OF_AUTOMATIC_PIX_CREATED',
        resource: 'transaction',
        resourceId: transaction.id,
        metadata: { identificadorAdesao, endToEndId, input, efiResponse } as any
      } as any
    });

    return {
      saved: true,
      transactionId: transaction.id,
      endToEndId: transaction.endToEndId,
      status: (transaction.rawData as any)?.status || efiResponse?.status,
      amountBrl: String(transaction.amountBrl),
      transactedAt: transaction.transactedAt
    };
  }

  private async syncAdhesionStatus(identificadorAdesao: string, efiData: any) {
    const adesao = efiData?.data?.adesoes?.[0] || efiData?.adesoes?.[0] || efiData?.data || efiData;
    const efiStatus = String(adesao?.status || '').toLowerCase();
    const nextStatus = ['autorizado', 'ativa', 'ativo', 'active', 'authorized'].includes(efiStatus)
      ? 'ACTIVE'
      : ['rejeitado', 'cancelado', 'revogado', 'failed', 'rejected'].includes(efiStatus)
        ? 'FAILED'
        : undefined;

    const consent = await this.findConsentByAdhesionId(identificadorAdesao);
    if (!consent) return { updated: false, reason: 'LOCAL_CONSENT_NOT_FOUND', efiStatus };
    if (!nextStatus) return { updated: false, reason: 'EFI_STATUS_NOT_MAPPED', consentId: consent.id, efiStatus };

    const previousMetadata = (consent.metadata || {}) as any;
    const updated = await prisma.consent.update({
      where: { id: consent.id },
      data: {
        status: nextStatus as any,
        metadata: { ...previousMetadata, efiStatus, efiAdesaoData: adesao, lastSyncedAt: new Date().toISOString() } as any
      }
    });

    await prisma.auditLog.create({
      data: {
        partnerId: consent.partnerId,
        userId: consent.userId,
        actor: 'admin:efi-of',
        action: 'EFI_OF_ADHESION_STATUS_SYNCED',
        resource: 'consent',
        resourceId: consent.id,
        metadata: { identificadorAdesao, efiStatus, localStatus: nextStatus } as any
      } as any
    });

    return { updated: true, consentId: updated.id, status: updated.status, efiStatus };
  }

  private async findConsentByAdhesionId(identificadorAdesao: string) {
    const consents = await prisma.consent.findMany({ where: { provider: 'efi-of' } });
    return consents.find((item: any) => {
      const metadata = item.metadata as any;
      return String(metadata?.efiIdentificadorAdesao || '') === identificadorAdesao;
    });
  }

  private validateAdhesionBody(body: any) {
    const missing: string[] = [];
    if (!body.cpf && !body.cnpj) missing.push('cpf ou cnpj');
    if (!body.nome) missing.push('nome');
    if (!body.idParticipante) missing.push('idParticipante');
    if (!body.dataInicio) missing.push('dataInicio');
    return missing;
  }

  private getFavoredFromEnv(override?: any):
    | { ok: true; missing: string[]; value: { nome: string; documento: string; codigoBanco: string; agencia: string; conta: string; tipoConta: AccountType } }
    | { ok: false; missing: string[]; value: any } {
    const value = {
      nome: override?.nome || process.env.EFI_OF_FAVORECIDO_NOME,
      documento: override?.documento || process.env.EFI_OF_FAVORECIDO_DOCUMENTO,
      codigoBanco: override?.codigoBanco || process.env.EFI_OF_FAVORECIDO_CODIGO_BANCO,
      agencia: override?.agencia || process.env.EFI_OF_FAVORECIDO_AGENCIA,
      conta: override?.conta || process.env.EFI_OF_FAVORECIDO_CONTA,
      tipoConta: (override?.tipoConta || process.env.EFI_OF_FAVORECIDO_TIPO_CONTA || 'TRAN') as AccountType
    };

    const missing = Object.entries(value)
      .filter(([key, val]) => key !== 'tipoConta' && !val)
      .map(([key]) => `favorecido.${key}`);

    return missing.length ? { ok: false, missing, value } : { ok: true, missing: [], value: value as any };
  }

  private async getOrCreatePartner(slug: string) {
    return prisma.partner.upsert({
      where: { slug },
      update: {},
      create: { slug, name: 'NextGen Assets', type: 'FINTECH' as any, config: {}, commissionRate: 0.03, tier: 'STARTER' as any } as any
    });
  }

  private async getOrCreateConsumerUser(opts: { partnerId: string; externalUserId: string; name?: string; email?: string; phone?: string }) {
    return prisma.consumerUser.upsert({
      where: { partnerId_externalUserId: { partnerId: opts.partnerId, externalUserId: opts.externalUserId } },
      update: { name: opts.name, email: opts.email, phone: opts.phone },
      create: { partnerId: opts.partnerId, externalUserId: opts.externalUserId, name: opts.name, email: opts.email, phone: opts.phone, notifyChannels: ['IN_APP'] as any } as any
    });
  }

  private maskFavored(fav: any) {
    return { nome: fav.nome, documento: this.maskDoc(fav.documento), codigoBanco: fav.codigoBanco, agencia: fav.agencia, conta: this.maskAccount(fav.conta), tipoConta: fav.tipoConta };
  }

  private maskInput(body: any) {
    return { ...body, cpf: body.cpf ? this.maskDoc(body.cpf) : undefined, cnpj: body.cnpj ? this.maskDoc(body.cnpj) : undefined, favorecido: body.favorecido ? this.maskFavored(body.favorecido) : undefined };
  }

  private maskDoc(doc?: string) {
    if (!doc) return doc;
    const clean = String(doc).replace(/\D/g, '');
    if (clean.length <= 4) return '****';
    return `${clean.slice(0, 3)}******${clean.slice(-2)}`;
  }

  private maskAccount(account?: string) {
    if (!account) return account;
    const str = String(account);
    if (str.length <= 4) return '****';
    return `****${str.slice(-4)}`;
  }

  private onlyDigits(value?: string) {
    return String(value || '').replace(/\D/g, '');
  }
}
