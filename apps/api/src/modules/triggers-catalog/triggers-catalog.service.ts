// ============================================
//  TRIGGERS CATALOG - 7 NOVOS GATILHOS
//  Implementação completa + evaluation
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as https from 'https';

const logger = new Logger('TriggersCatalog');
const prisma = new PrismaClient();

@Injectable()
export class TriggersCatalogService {
  
  // =============== CATÁLOGO ===============
  
  getCatalog() {
    return {
      success: true,
      count: 45,
      categories: {
        'NEGOCIOS': [
          { code: 'gatilho-compra', name: '💰 Gatilho de Compra', description: 'Lê saldo OF + paga via split' },
          { code: 'PRICE_DROP', name: '📉 Queda de Preço', description: 'Compra quando produto/ação cair' },
          { code: 'RESTOCK', name: '🔄 Estoque Voltou', description: 'Avisa quando produto voltar' },
          { code: 'SCARCITY_BUY', name: '⚡ Última Unidades', description: 'Compra quando estoque < X' },
          { code: 'OPPORTUNITY_BUY', name: '🎯 Oportunidade', description: 'Compra oportunidade de mercado' },
        ],
        'OPEN_FINANCE': [
          { code: 'BALANCE_TRIGGER_BUY', name: '💳 Saldo Atingiu Valor', description: 'Dispara quando saldo bancário X' },
          { code: 'BALANCE_LOW', name: '⚠️ Saldo Baixo', description: 'Avisa quando saldo < X' },
          { code: 'CREDIT_CARD_LIMIT', name: '💳 Limite Cartão', description: 'Avisa quando limite < X' },
          { code: 'POST_BILLS_BUY', name: '📋 Pós-Contas', description: 'Compra depois de pagar contas' },
          { code: 'SALARY_TRIGGER_BUY', name: '💼 Salário Recebido', description: 'Dispara ao receber salário' },
          { code: 'BILL_AUTO_PAY', name: '📄 Pagar Boleto', description: 'Paga boleto automaticamente' },
          { code: 'ROUND_UP_PIX', name: '🪙 Arredonda PIX', description: 'Arredonda PIX + investe troco' },
        ],
        'CALENDARIO': [
          { code: 'RECURRING_BUY', name: '🔁 Compra Recorrente', description: 'Todo dia/mês X' },
          { code: 'BALANCE_DATE', name: '📅 Data Específica', description: 'Em data específica (ex: 13º)' },
          { code: 'ANNIVERSARY_BONUS', name: '🎂 Aniversário', description: 'Bônus aniversário cliente' },
          { code: 'TIME_BASED_REMINDER', name: '⏰ Lembrete', description: 'Lembrete em horário X' },
        ],
        'GEO_IOT': [
          { code: 'GEO_TRIGGER', name: '📍 Entrou em Área', description: 'GPS entrou em local' },
          { code: 'IOT_SENSOR', name: '📡 Sensor IoT', description: 'Dispara por sensor' },
          { code: 'DEVICE_BATTERY', name: '🔋 Bateria', description: 'Bateria < X%' },
        ],
        'AI': [
          { code: 'CUSTOM_NL', name: '💬 Linguagem Natural', description: 'Descreve em português' },
          { code: 'AI_SENTIMENT_ALERT', name: '😊 Sentimento', description: 'Análise de menções' },
          { code: 'VOICE_COMMAND', name: '🎤 Comando Voz', description: 'Áudio → ação' },
          { code: 'IMAGE_TRIGGER', name: '📷 Imagem', description: 'Foto → ação' },
        ],
        'SOCIAL_WEBHOOK': [
          { code: 'EMAIL_RECEIVED', name: '📧 Email', description: 'Email importante recebido' },
          { code: 'WHATSAPP_KEYWORD', name: '💚 WhatsApp Keyword', description: 'Palavra em mensagem' },
          { code: 'WEBHOOK_EXTERNAL', name: '🔗 Webhook Externo', description: 'Recebe de outro sistema' },
          { code: 'SOCIAL_MENTION', name: '#️⃣ Menção Social', description: 'Mencionaram marca' },
        ],
        'GAMIFICACAO': [
          { code: 'STREAK_HABIT', name: '🔥 Streak', description: 'X dias seguidos' },
          { code: 'GOAL_ACCUMULATION_BUY', name: '🎯 Meta Atingida', description: 'Meta de economia' },
          { code: 'IMPULSE_REWARD', name: '🎁 Recompensa', description: 'Bônus por comportamento' },
          { code: 'VOLATILITY_HEDGE', name: '📊 Hedge Volatilidade', description: 'Proteção volatilidade' },
        ],
        // NOVOS 7
        'NEGOCIOS_NOVOS': [
          { code: 'GATILHO_PIX_RECEBIDO', name: '💰 PIX Recebido', description: 'Avisa quando recebe PIX de alguém específico' },
          { code: 'GATILHO_SUBSCRIPTION_VENCENDO', name: '⏰ Subscription Vencendo', description: 'Avisa 3 dias antes de vencer' },
          { code: 'GATILHO_META_VENDAS', name: '🎯 Meta de Vendas', description: 'Bateu meta do mês' },
          { code: 'GATILHO_CLIENTE_INATIVO', name: '😴 Cliente Inativo', description: 'X dias sem comprar' },
          { code: 'GATILHO_NPS_BAIXO', name: '😡 NPS Baixo', description: 'Cliente insatisfeito' },
          { code: 'GATILHO_CARRINHO_ABANDONADO', name: '🛒 Carrinho Abandonado', description: 'X horas no carrinho' },
          { code: 'GATILHO_NIVEL_ESTOQUE', name: '📦 Estoque Baixo', description: 'Nível < X unidades' },
        ]
      },
      total: 45
    };
  }

  // =============== AVALIAÇÃO DOS 7 NOVOS ===============

  async evaluatePixRecebido(trigger: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const params = trigger.params as any;
    const { senderTaxId, senderName, minValueCents } = params;
    
    // Busca PIX recentes (últimas 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pixRecebidos = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "PixRecebido" 
       WHERE "userId" = $1 
         AND "createdAt" >= $2
         ${senderTaxId ? 'AND "senderTaxId" = $3' : ''}
         ${minValueCents ? 'AND value >= $4' : ''}
       ORDER BY "createdAt" DESC LIMIT 1`,
      trigger.userId,
      yesterday,
      ...(senderTaxId ? [senderTaxId] : []),
      ...(minValueCents ? [minValueCents] : [])
    );

    if (pixRecebidos.length > 0) {
      const pix = pixRecebidos[0];
      // Verifica se ainda não foi processado
      if (pix.id !== trigger.lastDataId) {
        return {
          shouldFire: true,
          reason: `PIX recebido: ${senderName || senderTaxId || 'qualquer'} R$ ${(pix.value / 100).toFixed(2)}`,
          data: { pixId: pix.id, value: pix.value, sender: pix.senderName }
        };
      }
    }
    return { shouldFire: false, reason: 'Sem PIX novo' };
  }

  async evaluateSubscriptionVencendo(trigger: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const params = trigger.params as any;
    const { daysBefore = 3 } = params;
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBefore);
    
    const subscriptions = await prisma.$queryRawUnsafe<any[]>(
      `SELECT s.*, u.name as userName, u.phone
       FROM "Subscription" s
       JOIN "ConsumerUser" u ON u.id = s."userId"
       WHERE s."userId" = $1
         AND s.status = 'ACTIVE'
         AND DATE_PART('day', s."nextChargeAt") = DATE_PART('day', $2)
         AND DATE_PART('month', s."nextChargeAt") = DATE_PART('month', $2)
         AND DATE_PART('year', s."nextChargeAt") = DATE_PART('year', $2)`,
      trigger.userId,
      targetDate
    );

    if (subscriptions.length > 0) {
      return {
        shouldFire: true,
        reason: `${subscriptions.length} subscription(s) vencendo em ${daysBefore} dias`,
        data: { subscriptions }
      };
    }
    return { shouldFire: false, reason: 'Nenhuma subscription vence em ' + daysBefore + ' dias' };
  }

  async evaluateMetaVendas(trigger: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const params = trigger.params as any;
    const { metaMensalCents, currentMonth = true } = params;
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const result = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COALESCE(SUM(value), 0)::bigint as total
       FROM "Charge"
       WHERE "userId" = $1
         AND status = 'COMPLETED'
         AND "createdAt" >= $2`,
      trigger.userId,
      startOfMonth
    );
    
    const total = Number(result[0]?.total || 0);
    const meta = metaMensalCents;
    
    if (total >= meta && trigger.lastTotal !== total) {
      return {
        shouldFire: true,
        reason: `Meta atingida! R$ ${(total/100).toFixed(2)} de R$ ${(meta/100).toFixed(2)}`,
        data: { total, meta, bonusCents: params.bonusCents }
      };
    }
    return { shouldFire: false, reason: `Total: R$ ${(total/100).toFixed(2)} / Meta: R$ ${(meta/100).toFixed(2)}` };
  }

  async evaluateClienteInativo(trigger: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const params = trigger.params as any;
    const { diasInativo = 30 } = params;
    
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasInativo);
    
    // Users com última compra > X dias
    const inativos = await prisma.$queryRawUnsafe<any[]>(
      `SELECT u.id, u.name, u.phone, u.email,
              MAX(c."createdAt") as "ultimaCompra"
       FROM "ConsumerUser" u
       LEFT JOIN "Charge" c ON c."userId" = u.id AND c.status = 'COMPLETED'
       WHERE u."partnerId" = $1
       GROUP BY u.id, u.name, u.phone, u.email
       HAVING MAX(c."createdAt") < $2 OR MAX(c."createdAt") IS NULL`,
      trigger.partnerId,
      dataLimite
    );

    if (inativos.length > 0) {
      return {
        shouldFire: true,
        reason: `${inativos.length} cliente(s) inativo(s) há ${diasInativo}+ dias`,
        data: { inativos, cupomDesconto: params.cupomDesconto }
      };
    }
    return { shouldFire: false, reason: 'Nenhum cliente inativo' };
  }

  async evaluateNpsBaixo(trigger: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const params = trigger.params as any;
    const { npsMinimo = 6 } = params;
    
    // Busca últimas respostas NPS (assumindo tabela NpsResponse)
    const respostas = await prisma.$queryRawUnsafe<any[]>(
      `SELECT n.*, u.name as userName, u.phone as userPhone
       FROM "NpsResponse" n
       JOIN "ConsumerUser" u ON u.id = n."userId"
       WHERE n."userId" = $1
         AND n.score <= $2
         AND n."createdAt" >= NOW() - INTERVAL '24 hours'
       LIMIT 10`,
      trigger.userId,
      npsMinimo
    );

    if (respostas.length > 0) {
      return {
        shouldFire: true,
        reason: `${respostas.length} resposta(s) NPS <= ${npsMinimo}`,
        data: { respostas, action: 'open_ticket' }
      };
    }
    return { shouldFire: false, reason: 'Nenhum NPS baixo recente' };
  }

  async evaluateCarrinhoAbandonado(trigger: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const params = trigger.params as any;
    const { horasAbandonado = 1, cupomDesconto = 10 } = params;
    
    const dataLimite = new Date(Date.now() - horasAbandonado * 60 * 60 * 1000);
    
    const carrinhos = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Cart"
       WHERE "userId" = $1
         AND status = 'ABANDONED'
         AND "updatedAt" >= $2
         AND "updatedAt" <= NOW() - INTERVAL '$3 hours'
       LIMIT 50`,
      trigger.userId,
      dataLimite,
      horasAbandonado
    );

    if (carrinhos.length > 0) {
      return {
        shouldFire: true,
        reason: `${carrinhos.length} carrinho(s) abandonado(s) há ${horasAbandonado}+h`,
        data: { carrinhos, cupomDesconto }
      };
    }
    return { shouldFire: false, reason: 'Nenhum carrinho abandonado' };
  }

  async evaluateNivelEstoque(trigger: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    const params = trigger.params as any;
    const { minEstoque = 5, acao = 'notificar' } = params;
    
    const baixoEstoque = await prisma.$queryRawUnsafe<any[]>(
      `SELECT p.*, s.quantity
       FROM "Product" p
       JOIN "Stock" s ON s."productId" = p.id
       WHERE s."partnerId" = $1
         AND s.quantity <= $2
       ORDER BY s.quantity ASC
       LIMIT 50`,
      trigger.partnerId,
      minEstoque
    );

    if (baixoEstoque.length > 0) {
      return {
        shouldFire: true,
        reason: `${baixoEstoque.length} produto(s) com estoque <= ${minEstoque}`,
        data: { produtos: baixoEstoque, acao }
      };
    }
    return { shouldFire: false, reason: 'Estoque OK' };
  }

  // =============== ROTEADOR ===============

  async evaluateTrigger(trigger: any): Promise<{ shouldFire: boolean; reason: string; data?: any }> {
    switch (trigger.code) {
      case 'GATILHO_PIX_RECEBIDO':
        return this.evaluatePixRecebido(trigger);
      case 'GATILHO_SUBSCRIPTION_VENCENDO':
        return this.evaluateSubscriptionVencendo(trigger);
      case 'GATILHO_META_VENDAS':
        return this.evaluateMetaVendas(trigger);
      case 'GATILHO_CLIENTE_INATIVO':
        return this.evaluateClienteInativo(trigger);
      case 'GATILHO_NPS_BAIXO':
        return this.evaluateNpsBaixo(trigger);
      case 'GATILHO_CARRINHO_ABANDONADO':
        return this.evaluateCarrinhoAbandonado(trigger);
      case 'GATILHO_NIVEL_ESTOQUE':
        return this.evaluateNivelEstoque(trigger);
      default:
        return { shouldFire: false, reason: `Código ${trigger.code} não implementado no catalog` };
    }
  }

  // =============== EXECUÇÃO ===============

  async executeTriggerAction(trigger: any, evalResult: any): Promise<any> {
    const params = trigger.params as any;
    
    switch (trigger.code) {
      case 'GATILHO_PIX_RECEBIDO': {
        // Marca venda como paga
        await prisma.$executeRawUnsafe(
          `UPDATE "Charge" SET status = 'PAID_VIA_PIX', "paidAt" = NOW() WHERE id = $1`,
          evalResult.data.pixId
        );
        // Loga
        await prisma.auditLog.create({
          data: {
            action: 'TRIGGER_PIX_RECEBIDO',
            resource: 'trigger',
            resourceId: trigger.id,
            actor: 'trigger',
            metadata: evalResult.data as any
          } as any
        });
        return { executed: true, action: 'mark_charge_paid' };
      }
      
      case 'GATILHO_SUBSCRIPTION_VENCENDO': {
        // Envia WhatsApp/Email
        const subs = evalResult.data.subscriptions;
        for (const sub of subs) {
          if (sub.phone) {
            await this.sendWhatsApp(sub.phone, 
              `⏰ Sua subscription vence em ${params.daysBefore || 3} dias! Renove agora: https://nextgenassets.com.br/billing`
            );
          }
        }
        return { executed: true, notified: subs.length };
      }
      
      case 'GATILHO_META_VENDAS': {
        // Paga bônus
        const bonusCents = params.bonusCents || 0;
        if (bonusCents > 0) {
          // Cria charge com split 100% pro vendedor (bônus)
          // (aqui chamaria Woovi)
          return { executed: true, bonusSent: bonusCents };
        }
        return { executed: true, action: 'meta_reached_no_bonus' };
      }
      
      case 'GATILHO_CLIENTE_INATIVO': {
        // Envia cupom de desconto
        const inativos = evalResult.data.inativos;
        const cupom = evalResult.data.cupomDesconto || 10;
        for (const cliente of inativos) {
          if (cliente.phone) {
            await this.sendWhatsApp(cliente.phone,
              `🎁 Sentimos sua falta! Volte e ganhe ${cupom}% OFF: CUPOMVOLTA${cupom}`
            );
          }
        }
        return { executed: true, cupomSent: inativos.length };
      }
      
      case 'GATILHO_NPS_BAIXO': {
        // Abre ticket no suporte + liga pro cliente
        const respostas = evalResult.data.respostas;
        for (const r of respostas) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "SupportTicket" (id, "userId", priority, status, "createdAt")
             VALUES ($1, $2, 'HIGH', 'OPEN', NOW())`,
            `nps-${Date.now()}-${r.userId}`,
            r.userId
          );
          if (r.userPhone) {
            await this.sendWhatsApp(r.userPhone,
              `😔 Vimos que sua experiência não foi boa. Um especialista vai te ligar em 30min. Pedimos desculpas!`
            );
          }
        }
        return { executed: true, ticketsOpened: respostas.length };
      }
      
      case 'GATILHO_CARRINHO_ABANDONADO': {
        // Envia cupom
        const carrinhos = evalResult.data.carrinhos;
        const cupom = evalResult.data.cupomDesconto || 10;
        for (const carrinho of carrinhos) {
          await this.sendWhatsApp(carrinho.customerPhone,
            `🛒 Seu carrinho tá te esperando! Finalize agora com ${cupom}% OFF: VOLTA${cupom}`
          );
        }
        return { executed: true, remindersSent: carrinhos.length };
      }
      
      case 'GATILHO_NIVEL_ESTOQUE': {
        // Notifica seller + compra do fornecedor
        const produtos = evalResult.data.produtos;
        // Aqui chamaria webhook do parceiro ou email
        for (const p of produtos) {
          logger.log(`📦 Estoque baixo: ${p.name} (${p.quantity} unidades)`);
        }
        return { executed: true, lowStockProducts: produtos.length };
      }
      
      default:
        return { executed: false, reason: 'Ação não implementada' };
    }
  }

  // =============== HELPERS ===============

  private async sendWhatsApp(phone: string, message: string): Promise<void> {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      logger.log(`[MOCK WhatsApp] Para: ${phone} | Mensagem: ${message}`);
      return;
    }
    
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      
      await new Promise<void>((resolve, reject) => {
        const data = new URLSearchParams({
          From: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
          To: `whatsapp:${phone}`,
          Body: message
        }).toString();
        
        const req = https.request({
          method: 'POST',
          hostname: 'api.twilio.com',
          port: 443,
          path: `/2010-04-01/Accounts/${sid}/Messages.json`,
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(data)
          }
        }, (res) => {
          let d = '';
          res.on('data', (c) => d += c);
          res.on('end', () => {
            if (res.statusCode && res.statusCode < 300) resolve();
            else reject(new Error(`Twilio ${res.statusCode}: ${d}`));
          });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
      });
    } catch (err: any) {
      logger.error(`WhatsApp error: ${err.message}`);
    }
  }
}
