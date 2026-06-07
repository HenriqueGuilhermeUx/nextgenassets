// ============================================
//  NOTIFICATIONS SERVICE — Multi-canal
// ============================================
// Suporta: Push, Email, SMS, WhatsApp, In-App
// Templates por tipo de evento

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { WhatsAppService } from './whatsapp.service';

const prisma = new PrismaClient();

export type NotificationEvent =
  | 'TRIGGER_EXECUTED'
  | 'TRIGGER_FAILED'
  | 'TRIGGER_PAUSED'
  | 'TRIGGER_CREATED'
  | 'BUDGET_WARNING'
  | 'PRE_ORDER_CREATED'
  | 'PRE_ORDER_CONFIRMED'
  | 'PRE_ORDER_SHIPPED'
  | 'RESTOCK_AVAILABLE'
  | 'MONTHLY_INSIGHT';

export interface NotificationPayload {
  userId: string;
  event: NotificationEvent;
  channels?: ('PUSH' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP')[];
  data: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private whatsApp: WhatsAppService) {}

  async send(payload: NotificationPayload): Promise<any[]> {
    const user = await prisma.consumerUser.findUnique({ where: { id: payload.userId } });
    if (!user) {
      this.logger.warn(`Usuário ${payload.userId} não encontrado`);
      return [];
    }

    const channels = payload.channels || (user.notifyChannels as any[]) || ['PUSH', 'EMAIL'];
    const template = this.getTemplate(payload.event, payload.data);

    const results: any[] = [];

    for (const channel of channels) {
      try {
        let result: any;
        switch (channel) {
          case 'WHATSAPP':
            result = await this.whatsApp.send(user.phone || payload.data.phone, template);
            break;
          case 'EMAIL':
            result = await this.sendEmail(user.email, template);
            break;
          case 'PUSH':
            result = await this.sendPush(user.id, template);
            break;
          case 'SMS':
            result = await this.sendSMS(user.phone, template);
            break;
          case 'IN_APP':
            result = await this.saveInApp(user.id, template, payload);
            break;
        }
        results.push({ channel, status: 'sent', result });
      } catch (err) {
        this.logger.error(`Falha ao enviar ${channel}: ${err.message}`);
        results.push({ channel, status: 'failed', error: err.message });
      }
    }

    // Salva no banco
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: payload.event,
        channel: 'IN_APP',
        title: template.title,
        body: template.body,
        metadata: { ...payload.data, results },
        status: 'SENT'
      }
    });

    return results;
  }

  private getTemplate(event: NotificationEvent, data: any) {
    switch (event) {
      case 'TRIGGER_EXECUTED':
        return {
          title: '✅ Gatilho executado!',
          body: `Seu gatilho "${data.triggerName || 'seu gatilho'}" foi executado. ${data.amount ? `Movimentado: R$ ${data.amount.toFixed(2)}.` : ''} ${data.details || ''}`,
          emoji: '✅',
          cta: data.trackingCode ? { label: 'Rastrear pedido', url: `https://example.com/track/${data.trackingCode}` } : undefined
        };
      case 'TRIGGER_FAILED':
        return {
          title: '❌ Gatilho falhou',
          body: `Seu gatilho "${data.triggerName}" não pôde ser executado. Motivo: ${data.reason || 'erro desconhecido'}. ${data.actionable ? 'Recomendamos revisar os parâmetros.' : ''}`,
          emoji: '❌'
        };
      case 'TRIGGER_PAUSED':
        return {
          title: '⏸ Gatilho pausado',
          body: `Seu gatilho "${data.triggerName}" foi pausado${data.reason ? ` (${data.reason})` : ''}. Reative quando quiser.`,
          emoji: '⏸'
        };
      case 'PRE_ORDER_CREATED':
        return {
          title: '📋 Reserva criada',
          body: `Reservamos ${data.productName || 'seu produto'} pra você. A compra vai disparar ${data.scheduledFor ? `em ${new Date(data.scheduledFor).toLocaleDateString('pt-BR')}` : 'em breve'}.`,
          emoji: '📋'
        };
      case 'PRE_ORDER_CONFIRMED':
        return {
          title: '🎉 Compra confirmada!',
          body: `Pagamento confirmado: ${data.productName || 'produto'} por R$ ${data.amount?.toFixed(2) || '0.00'}. O lojista vai separar seu pedido.`,
          emoji: '🎉'
        };
      case 'PRE_ORDER_SHIPPED':
        return {
          title: '🚚 Pedido a caminho!',
          body: `${data.productName || 'Seu pedido'} foi despachado! Previsão: ${data.deliveryDays || 3} dias úteis. Rastreio: ${data.trackingCode || 'em breve'}.`,
          emoji: '🚚',
          cta: { label: 'Rastrear', url: `https://example.com/track/${data.trackingCode}` }
        };
      case 'RESTOCK_AVAILABLE':
        return {
          title: '📦 Voltou ao estoque!',
          body: `${data.productName || 'O produto'} voltou disponível por R$ ${data.price?.toFixed(2)}. Seu gatilho vai disparar automaticamente.`,
          emoji: '📦'
        };
      case 'BUDGET_WARNING':
        return {
          title: '⚠️ Atenção: limite próximo',
          body: `Você já gastou R$ ${data.spent?.toFixed(2)} de R$ ${data.budget?.toFixed(2)} este mês em automações. ${data.recommendation || 'Considere revisar.'}`,
          emoji: '⚠️'
        };
      case 'MONTHLY_INSIGHT':
        return {
          title: '📊 Resumo do mês',
          body: data.insight || 'Confira como foram suas automações este mês.',
          emoji: '📊'
        };
      default:
        return { title: 'Notificação Orkest', body: 'Você tem uma nova notificação.' };
    }
  }

  private async sendEmail(email: string | null | undefined, template: any): Promise<any> {
    if (!email) return { skipped: 'no email' };
    // Em produção: SendGrid, AWS SES, Mailgun
    this.logger.log(`📧 EMAIL → ${email}: ${template.title}`);
    return { provider: 'mock', to: email, subject: template.title };
  }

  private async sendSMS(phone: string | null | undefined, template: any): Promise<any> {
    if (!phone) return { skipped: 'no phone' };
    this.logger.log(`📱 SMS → ${phone}: ${template.title}`);
    return { provider: 'mock', to: phone };
  }

  private async sendPush(userId: string, template: any): Promise<any> {
    this.logger.log(`🔔 PUSH → user ${userId}: ${template.title}`);
    return { provider: 'mock', userId };
  }

  private async saveInApp(userId: string, template: any, payload: NotificationPayload): Promise<any> {
    return { saved: true, userId, event: payload.event };
  }
}
