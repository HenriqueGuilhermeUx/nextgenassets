// ============================================
//  COMMISSION SERVICE — Split 3% NextGen + 97% Vendedor
// ============================================
// FLUXO:
//   1. Webhook pix-received chega (R$ 100,00)
//   2. CommissionService.distribute() é chamado
//   3. Busca Partner do Execution
//   4. Calcula: nextgen=3%, partner=97%
//   5. Cria PIX OUT de R$ 97,00 pra chave PIX do parceiro
//   6. Atualiza Partner.totalCommissionEarnedBrl com R$ 3,00
//   7. Log de auditoria
//
// A Efí NÃO faz split entre contas diferentes. Por isso fazemos
// 2 transações separadas: recebe 100%, envia 97%.
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { httpsRequestWithMtls } from '../destinations/providers/efi-https';
import { buildEfiConfig } from '../../config/efi.config';

const prisma = new PrismaClient();
const EFI_CONFIG = buildEfiConfig(process.env);

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  /**
   * Distribui o split quando um pagamento é recebido.
   * Chamado pelo WebhooksController quando pix-received chega.
   */
  async distribute(opts: {
    executionId: string;
    amountBrl: number;
    txid: string;
    pix?: any;
  }): Promise<{
    success: boolean;
    nextgenCommissionBrl: number;
    partnerPayoutBrl: number;
    pixOutTxid?: string;
    errorMessage?: string;
  }> {
    const startTime = Date.now();
    this.logger.log(
      `💰 CommissionService.distribute: execution=${opts.executionId} amount=R$ ${opts.amountBrl} txid=${opts.txid}`
    );

    // 1. Buscar a Execution pra saber qual Partner
    const execution = await prisma.execution.findUnique({
      where: { id: opts.executionId },
      include: { trigger: { include: { partner: true } } }
    });

    if (!execution) {
      return {
        success: false,
        nextgenCommissionBrl: 0,
        partnerPayoutBrl: 0,
        errorMessage: `Execution ${opts.executionId} nao encontrada`
      };
    }

    const partner = execution.trigger?.partner;

    if (!partner) {
      this.logger.warn(`Execution ${opts.executionId} sem Partner vinculado - split nao aplicado`);
      // SEMPRE cria audit log pra debug
      try {
        await prisma.auditLog.create({
          data: {
            actor: 'system',
            executionId: execution.id,
            action: 'COMMISSION_SKIPPED_NO_PARTNER',
            resource: 'execution',
            resourceId: execution.id,
            metadata: {
              executionId: execution.id,
              txid: opts.txid,
              amountBrl: opts.amountBrl,
              reason: 'execution.trigger.partner is null',
              triggerId: execution.triggerId,
              executionPartnerId: execution.partnerId,
              hasExecutionPartner: !!execution.partner
            }
          }
        });
      } catch (e: any) {
        this.logger.error(`Falha ao criar audit log: ${e.message}`);
      }
      return {
        success: true,
        nextgenCommissionBrl: opts.amountBrl,
        partnerPayoutBrl: 0
      };
    }

    if (!partner.pixKey) {
      this.logger.warn(
        `Partner ${partner.id} (${partner.name}) sem pixKey cadastrada - NextGen fica com 100%`
      );
      await this.updateCommissionEarned(partner.id, opts.amountBrl);
      return {
        success: true,
        nextgenCommissionBrl: opts.amountBrl,
        partnerPayoutBrl: 0
      };
    }

    // 2. Calcular o split
    const commissionRate = Number(partner.commissionRate); // ex: 0.03
    const nextgenCommissionBrl = Number((opts.amountBrl * commissionRate).toFixed(2));
    const partnerPayoutBrl = Number((opts.amountBrl - nextgenCommissionBrl).toFixed(2));

    this.logger.log(
      `💸 Split: NextGen=R$ ${nextgenCommissionBrl} (${commissionRate * 100}%) | Partner=${partner.name} R$ ${partnerPayoutBrl}`
    );

    // 3. Criar PIX OUT pro parceiro
    let pixOutTxid: string | undefined;
    try {
      this.logger.log(`🔥 CALLING_SEND_PIX: amount=${partnerPayoutBrl} pixKey=${partner.pixKey} demoMode=${process.env.EFI_DEMO_MODE}`);
      pixOutTxid = await this.sendPixToPartner({
        amountBrl: partnerPayoutBrl,
        pixKey: partner.pixKey,
        partnerName: partner.name,
        originalTxid: opts.txid
      });

      this.logger.log(`✅ PIX OUT enviado: txid=${pixOutTxid} R$ ${partnerPayoutBrl} → ${partner.name}`);

      // 4. Atualizar saldo de comissões do Partner
      await this.updateCommissionEarned(partner.id, nextgenCommissionBrl);

      // 5. Criar registro de payout (pra histórico)
      await prisma.auditLog.create({
        data: {
          actor: 'system',
          partnerId: partner.id,
          executionId: execution.id,
          action: 'COMMISSION_DISTRIBUTED',
          resource: 'execution',
          resourceId: execution.id,
          metadata: {
            executionId: execution.id,
            originalTxid: opts.txid,
            pixOutTxid,
            amountBrl: opts.amountBrl,
            nextgenCommissionBrl,
            partnerPayoutBrl,
            partnerId: partner.id,
            partnerName: partner.name,
            elapsedMs: Date.now() - startTime
          }
        }
      });

      return {
        success: true,
        nextgenCommissionBrl,
        partnerPayoutBrl,
        pixOutTxid
      };
    } catch (err: any) {
      this.logger.error(
        `❌ Erro ao enviar PIX OUT pro parceiro ${partner.name}: ${err.message}`
      );

      // Audit log do erro
      await prisma.auditLog.create({
        data: {
          actor: 'system',
          partnerId: partner.id,
          executionId: execution.id,
          action: 'COMMISSION_PAYOUT_FAILED',
          resource: 'execution',
          resourceId: execution.id,
          metadata: {
            executionId: execution.id,
            amountBrl: opts.amountBrl,
            nextgenCommissionBrl,
            partnerPayoutBrl,
            partnerId: partner.id,
            errorMessage: err.message,
            elapsedMs: Date.now() - startTime
          }
        }
      });

      return {
        success: false,
        nextgenCommissionBrl,
        partnerPayoutBrl,
        errorMessage: err.message
      };
    }
  }

  /**
   * Envia PIX pra chave do parceiro via API Efí (POST /v2/pix)
   */
  private async sendPixToPartner(opts: {
    amountBrl: number;
    pixKey: string;
    partnerName: string;
    originalTxid: string;
  }): Promise<string> {
    if (process.env.EFI_DEMO_MODE !== 'false') {
      this.logger.warn(`⚠️  DEMO_MODE - PIX OUT SIMULADO pra ${opts.pixKey}`);
      return `DEMO-OUT-${Date.now()}`;
    }

    const token = await this.getAccessToken();
    const txid = `NGAOUT${Date.now()}`.slice(0, 35);

    const body = JSON.stringify({
      valor: opts.amountBrl.toFixed(2),
      pagador: {
        chave: EFI_CONFIG.pixKey // nossa chave Efí (quem paga)
      },
      favorecido: {
        chave: opts.pixKey // chave do parceiro
      }
    });

    const result = await httpsRequestWithMtls({
      url: `${EFI_CONFIG.apiBaseUrl}/v2/pix`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-skip-mtls-checking': 'true',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body).toString()
      },
      body
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`EFI send pix failed: ${result.status} - ${result.body.substring(0, 300)}`);
    }

    const data = JSON.parse(result.body);
    return data.txid || txid;
  }

  /**
   * OAuth2 (mesmo do webhook registrar)
   */
  private async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(
      `${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`
    ).toString('base64');

    const body = 'grant_type=client_credentials';
    const result = await httpsRequestWithMtls({
      url: `${EFI_CONFIG.oauthBaseUrl}/oauth/token`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body).toString()
      },
      body
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`EFI auth failed: ${result.status} - ${result.body.substring(0, 200)}`);
    }

    const data = JSON.parse(result.body);
    return data.access_token;
  }

  /**
   * Atualiza saldo de comissões do Partner
   */
  private async updateCommissionEarned(partnerId: string, commissionBrl: number): Promise<void> {
    await prisma.partner.update({
      where: { id: partnerId },
      data: {
        totalCommissionEarnedBrl: {
          increment: commissionBrl
        }
      }
    });
  }

  /**
   * Busca estatísticas de comissão por Partner
   */
  async getStats(partnerId: string): Promise<{
    partnerId: string;
    totalCommissionEarnedBrl: number;
    commissionRate: number;
    pixKey: string | null;
  } | null> {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId }
    });

    if (!partner) return null;

    return {
      partnerId: partner.id,
      totalCommissionEarnedBrl: Number(partner.totalCommissionEarnedBrl),
      commissionRate: Number(partner.commissionRate),
      pixKey: partner.pixKey
    };
  }
}
