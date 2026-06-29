// ============================================
//  EFI OPEN FINANCE ADMIN FLOW
//  Rotas reais com prefixo global:
//  GET  /v1/admin/efi-of/favored-check
//  POST /v1/admin/efi-of/create-adhesion
//  GET  /v1/admin/efi-of/adhesion/:identificadorAdesao
// ============================================

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
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

  /**
   * Cria adesão Open Finance/Pagamento Automático na Efí.
   *
   * Body mínimo:
   * {
   *   "cpf": "34198276870",
   *   "nome": "Cliente Teste",
   *   "idParticipante": "uuid-do-banco-pagador",
   *   "intervalo": "MENSAL",
   *   "dataInicio": "2026-07-05"
   * }
   */
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
          cpf: '34198276870',
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

  @Get('adhesion/:identificadorAdesao')
  async getAdhesion(@Param('identificadorAdesao') identificadorAdesao: string) {
    try {
      const data = await this.efiOF.getAdesao(identificadorAdesao);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
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
      create: {
        slug,
        name: 'NextGen Assets',
        type: 'FINTECH' as any,
        config: {},
        commissionRate: 0.03,
        tier: 'STARTER' as any
      } as any
    });
  }

  private async getOrCreateConsumerUser(opts: { partnerId: string; externalUserId: string; name?: string; email?: string; phone?: string }) {
    return prisma.consumerUser.upsert({
      where: { partnerId_externalUserId: { partnerId: opts.partnerId, externalUserId: opts.externalUserId } },
      update: { name: opts.name, email: opts.email, phone: opts.phone },
      create: {
        partnerId: opts.partnerId,
        externalUserId: opts.externalUserId,
        name: opts.name,
        email: opts.email,
        phone: opts.phone,
        notifyChannels: ['IN_APP'] as any
      } as any
    });
  }

  private maskFavored(fav: any) {
    return {
      nome: fav.nome,
      documento: this.maskDoc(fav.documento),
      codigoBanco: fav.codigoBanco,
      agencia: fav.agencia,
      conta: this.maskAccount(fav.conta),
      tipoConta: fav.tipoConta
    };
  }

  private maskInput(body: any) {
    return {
      ...body,
      cpf: body.cpf ? this.maskDoc(body.cpf) : undefined,
      cnpj: body.cnpj ? this.maskDoc(body.cnpj) : undefined,
      favorecido: body.favorecido ? this.maskFavored(body.favorecido) : undefined
    };
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
}
