// ============================================
//  EFÍ PIX SPLIT — PAYLOAD BUILDER
//  Rotas reais com prefixo global:
//  GET  /v1/company-billing/efi-pix-split/payload/template
//  POST /v1/company-billing/efi-pix-split/payload/config
// ============================================

import { Body, Controller, Get, Post } from '@nestjs/common';

type SplitType = 'porcentagem' | 'fixo';

type SplitRecipientInput = {
  tipo?: SplitType;
  valor?: string | number;
  documento?: string;
  cpf?: string;
  cnpj?: string;
  conta?: string;
};

@Controller('company-billing/efi-pix-split/payload')
export class EfiPixSplitPayloadController {
  @Get('template')
  template() {
    return {
      success: true,
      message: 'Modelo de payload para POST /v2/gn/split/config na API Pix Efi.',
      payload: {
        descricao: 'Split NextGen - Empresa Cliente',
        lancamento: {
          imediato: true
        },
        split: {
          divisaoTarifa: 'assumir_total',
          minhaParte: {
            tipo: 'porcentagem',
            valor: '1.50'
          },
          repasses: [
            {
              tipo: 'porcentagem',
              valor: '98.50',
              favorecido: {
                cpf: 'DOCUMENTO_DA_CONTA_EFI_DESTINO',
                conta: 'CONTA_EFI_DESTINO'
              }
            }
          ]
        }
      },
      notes: [
        'minhaParte representa a parte da conta integradora/principal.',
        'repasses representa uma ou mais contas Efi destino.',
        'Split Pix Efi exige contas Efi no repasse.',
        'Limite operacional informado: ate 20 repasses.'
      ]
    };
  }

  @Post('config')
  buildConfig(@Body() body: any) {
    const minhaParteTipo: SplitType = body.minhaParte?.tipo || body.nextgenTipo || 'porcentagem';
    const minhaParteValor = this.moneyString(body.minhaParte?.valor || body.nextgenValor || body.nextgenPercent || '1.50');
    const divisaoTarifa = body.divisaoTarifa || 'assumir_total';
    const repassesInput: SplitRecipientInput[] = Array.isArray(body.repasses)
      ? body.repasses
      : [
          {
            tipo: body.repasseTipo || body.empresaTipo || 'porcentagem',
            valor: body.repasseValor || body.empresaValor || '98.50',
            documento: body.documento,
            cpf: body.cpf,
            cnpj: body.cnpj,
            conta: body.conta
          }
        ];

    const warnings: string[] = [];
    if (repassesInput.length > 20) {
      warnings.push('A Efi informa limite maximo de 20 contas para repasse. Reduza a lista de repasses.');
    }

    const repasses = repassesInput.slice(0, 20).map((repasse) => this.buildRepasse(repasse, warnings));

    const payload = {
      descricao: body.descricao || body.description || 'Split NextGen Cobrança Inteligente',
      lancamento: {
        imediato: body.imediato !== false
      },
      split: {
        divisaoTarifa,
        minhaParte: {
          tipo: minhaParteTipo,
          valor: minhaParteValor
        },
        repasses
      }
    };

    const percentageTotal = this.sumPercentages(payload);
    if (percentageTotal !== null && Math.abs(percentageTotal - 100) > 0.001) {
      warnings.push(`A soma das porcentagens esta em ${percentageTotal.toFixed(2)}%. Em geral, minhaParte + repasses deve fechar 100%.`);
    }

    return {
      success: warnings.length === 0,
      message: warnings.length ? 'Payload gerado com avisos. Revise antes de enviar para a Efi.' : 'Payload pronto para enviar em POST /v1/company-billing/efi-pix-split/config.',
      efiEndpoint: 'POST /v2/gn/split/config',
      nextgenEndpoint: 'POST /v1/company-billing/efi-pix-split/config',
      payload,
      warnings
    };
  }

  private buildRepasse(input: SplitRecipientInput, warnings: string[]) {
    const documento = this.onlyDigits(input.documento || input.cpf || input.cnpj || '');
    const conta = String(input.conta || '').trim();

    if (!documento) warnings.push('Repasse sem documento. Informe cpf ou cnpj da conta Efi destino.');
    if (!conta) warnings.push('Repasse sem conta. Informe a conta Efi destino.');

    const favorecido: any = { conta };
    if (documento.length === 14) favorecido.cnpj = documento;
    else favorecido.cpf = documento;

    return {
      tipo: input.tipo || 'porcentagem',
      valor: this.moneyString(input.valor || '98.50'),
      favorecido
    };
  }

  private sumPercentages(payload: any): number | null {
    const parts: number[] = [];
    if (payload.split?.minhaParte?.tipo === 'porcentagem') {
      parts.push(Number(payload.split.minhaParte.valor));
    }
    for (const repasse of payload.split?.repasses || []) {
      if (repasse.tipo === 'porcentagem') parts.push(Number(repasse.valor));
    }
    if (!parts.length) return null;
    return parts.reduce((sum, value) => sum + value, 0);
  }

  private moneyString(value: any) {
    const normalized = String(value).replace(',', '.');
    const n = Number(normalized);
    if (!Number.isFinite(n)) return String(value);
    return n.toFixed(2);
  }

  private onlyDigits(value: string) {
    return String(value || '').replace(/\D/g, '');
  }
}
