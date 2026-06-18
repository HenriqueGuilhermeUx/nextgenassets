// ============================================
//  GATILHO DE COMPRA END-TO-END
//  Klavi (lê saldo OF) + Woovi (paga com split)
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { KlaviService } from '../klavi/klavi.service';
import { WooviPixAdapter } from '../woovi/woovi-pix-adapter';

const prisma = new PrismaClient();
const logger = new Logger('GatilhoCompra');

interface GatilhoCompra {
  id: string;
  userId: string;
  partnerId: string;
  offerId?: string;
  bankCode: string;       // banco conectado (Klavi institutionCode)
  amountCents: number;    // valor a pagar
  condition: 'price_drops' | 'saldo_above' | 'saldo_below' | 'auto';
  threshold?: number;     // % ou valor da condição
  status: 'ACTIVE' | 'TRIGGERED' | 'PAID' | 'FAILED' | 'CANCELED';
  klaviLinkToken?: string;
  klaviTaxId?: string;
  lastEvaluatedAt?: Date;
  lastTriggeredAt?: Date;
  metadata?: any;
}

@Injectable()
export class GatilhoCompraService {
  
  /**
   * Cliente configura um gatilho de compra
   */
  async configurar(opts: {
    userId: string;
    partnerId: string;
    offerId?: string;
    bankCode: string;
    amountCents: number;
    condition: 'price_drops' | 'saldo_above' | 'saldo_below' | 'auto';
    threshold?: number;
    klaviLinkToken: string;
    klaviTaxId: string;
  }): Promise<GatilhoCompra> {
    const id = `gatilho-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Trigger" (id, code, name, description, status, "userId", "partnerId", "offerId", params, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, $8::jsonb, NOW(), NOW())
       RETURNING id`,
      id,
      'GATILHO_COMPRA',
      `Comprar R$ ${(opts.amountCents/100).toFixed(2)} se condição`,
      `Gatilho configurado: ${opts.condition} ${opts.threshold || ''}`,
      opts.userId,
      opts.partnerId,
      opts.offerId,
      JSON.stringify({
        type: 'gatilho_compra',
        bankCode: opts.bankCode,
        amountCents: opts.amountCents,
        condition: opts.condition,
        threshold: opts.threshold,
        klaviLinkToken: opts.klaviLinkToken,
        klaviTaxId: opts.klaviTaxId
      })
    );
    
    logger.log(`✅ Gatilho criado: ${id} - R$ ${(opts.amountCents/100).toFixed(2)} se ${opts.condition} ${opts.threshold || ''}`);
    return { id, ...opts, status: 'ACTIVE' };
  }

  /**
   * Avalia gatilho: lê saldo via Klavi, vê se condição é atendida
   * Se sim, cria charge Woovi com split
   */
  async avaliar(opts: {
    gatilhoId: string;
    klaviService: KlaviService;
    wooviAdapter: WooviPixAdapter;
  }): Promise<{ triggered: boolean; reason: string; chargeId?: string }> {
    
    // 1) Busca gatilho
    const gatilho: any = await prisma.trigger.findUnique({
      where: { id: opts.gatilhoId }
    });
    
    if (!gatilho || gatilho.status !== 'ACTIVE') {
      return { triggered: false, reason: 'gatilho nao encontrado ou inativo' };
    }
    
    const params = typeof gatilho.params === 'string' ? JSON.parse(gatilho.params) : gatilho.params;
    
    // 2) Lê saldo via Klavi
    let saldoCents = 0;
    try {
      const data = await opts.klaviService.getPersonalData(params.klaviLinkToken, params.klaviTaxId);
      // Klavi retorna accounts[].balance
      const accounts = data.accounts || data.data?.accounts || [];
      saldoCents = accounts.reduce((s: number, a: any) => s + (a.balance || 0), 0);
      logger.log(`💰 Saldo via Klavi: R$ ${(saldoCents/100).toFixed(2)}`);
    } catch (err: any) {
      logger.error(`Erro lendo saldo: ${err.message}`);
      return { triggered: false, reason: 'erro ao ler saldo: ' + err.message };
    }
    
    // 3) Avalia condição
    let triggered = false;
    let reason = '';
    
    if (params.condition === 'auto') {
      triggered = true;
      reason = 'auto (sempre executa)';
    } else if (params.condition === 'saldo_above') {
      triggered = saldoCents >= (params.threshold || 0);
      reason = `saldo R$ ${(saldoCents/100).toFixed(2)} >= R$ ${((params.threshold || 0)/100).toFixed(2)}`;
    } else if (params.condition === 'saldo_below') {
      triggered = saldoCents < (params.threshold || 0);
      reason = `saldo R$ ${(saldoCents/100).toFixed(2)} < R$ ${((params.threshold || 0)/100).toFixed(2)}`;
    } else {
      // price_drops: precisa de cotação (futuro)
      triggered = false;
      reason = `price_drops: precisa de cotação`;
    }
    
    if (!triggered) {
      logger.log(`⏭️ Gatilho ${opts.gatilhoId} não disparou: ${reason}`);
      await prisma.trigger.update({
        where: { id: opts.gatilhoId },
        data: { lastEvaluatedAt: new Date() }
      });
      return { triggered: false, reason };
    }
    
    // 4) Condição ATENDE → criar charge Woovi com split
    logger.log(`🎯 Gatilho ${opts.gatilhoId} disparou! ${reason}`);
    
    const totalCents = params.amountCents;
    const nextgenCents = Math.floor(totalCents * 0.03);  // 3% NextGen
    const partnerCents = totalCents - nextgenCents - Math.ceil(totalCents * 0.005);  // 97% Partner - 0,5% Woovi
    
    try {
      const charge = await opts.wooviAdapter.createChargeWithSplit({
        correlationID: `gatilho-${opts.gatilhoId}-${Date.now()}`,
        totalCents,
        nextgenCents,
        partnerCents,
        nextgenPixKey: process.env.WOOVI_NEXTGEN_PIX_KEY || '61922930000197',
        partnerPixKey: 'henriquecampos66@gmail.com',  // demo
        comment: `Gatilho ${opts.gatilhoId} - ${reason}`
      });
      
      // 5) Atualiza gatilho: status TRIGGERED
      await prisma.trigger.update({
        where: { id: opts.gatilhoId },
        data: {
          lastEvaluatedAt: new Date(),
          lastTriggeredAt: new Date(),
          status: 'TRIGGERED' as any,
          params: { ...params, wooviChargeId: charge.id, paymentLinkUrl: charge.paymentLinkUrl } as any
        } as any
      });
      
      logger.log(`💰 Charge Woovi criada: ${charge.id}`);
      logger.log(`🔗 Link pagamento: ${charge.paymentLinkUrl}`);
      
      return { triggered: true, reason, chargeId: charge.id };
    } catch (err: any) {
      logger.error(`Erro criando charge: ${err.message}`);
      return { triggered: false, reason: 'erro ao criar charge: ' + err.message };
    } finally {
      await prisma.$disconnect();
    }
  }
}
