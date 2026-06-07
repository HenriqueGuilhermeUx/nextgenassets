// ============================================
//  WHATSAPP SERVICE
// ============================================
// Integração com WhatsApp Business API (ou Z-API, WPPConnect, Twilio)
// Templates aprovados pela Meta pra evitar bloqueio

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WhatsAppTemplate {
  title: string;
  body: string;
  emoji?: string;
  cta?: { label: string; url: string };
  buttons?: Array<{ id: string; label: string }>;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private provider: 'MOCK' | 'ZAPI' | 'TWILIO' | 'META_OFFICIAL';

  constructor(private config: ConfigService) {
    this.provider = (this.config.get('WHATSAPP_PROVIDER') || 'MOCK') as any;
  }

  async send(phone: string | null | undefined, template: WhatsAppTemplate): Promise<any> {
    if (!phone) return { skipped: 'no phone number' };

    // Formata telefone (+55 + DDD + número)
    const formattedPhone = this.formatPhone(phone);

    // Monta mensagem formatada (com emojis)
    const message = this.formatMessage(template);

    switch (this.provider) {
      case 'META_OFFICIAL':
        return this.sendViaMetaApi(formattedPhone, message, template);
      case 'ZAPI':
        return this.sendViaZApi(formattedPhone, message, template);
      case 'TWILIO':
        return this.sendViaTwilio(formattedPhone, message, template);
      case 'MOCK':
      default:
        return this.sendMock(formattedPhone, message, template);
    }
  }

  private formatPhone(phone: string): string {
    // Remove tudo que não é número
    let clean = phone.replace(/\D/g, '');
    // Adiciona código do Brasil se necessário
    if (clean.length === 11) clean = '55' + clean;
    if (clean.length === 10) clean = '55' + clean;  // fixo sem 9
    return '+' + clean;
  }

  private formatMessage(template: WhatsAppTemplate): string {
    let msg = '';
    if (template.emoji) msg += `${template.emoji} `;
    msg += `*${template.title}*\n\n`;
    msg += template.body;
    if (template.cta) msg += `\n\n👉 ${template.cta.label}: ${template.cta.url}`;
    msg += '\n\n— Orkest';
    return msg;
  }

  // ====== PROVIDERS ======

  private async sendMock(phone: string, message: string, template: WhatsAppTemplate): Promise<any> {
    this.logger.log(`💬 WHATSAPP (MOCK) → ${phone}`);
    this.logger.log(`   ${message.split('\n')[0]}`);
    return {
      provider: 'mock',
      to: phone,
      messagePreview: message.slice(0, 100),
      sentAt: new Date().toISOString()
    };
  }

  private async sendViaMetaApi(phone: string, message: string, template: WhatsAppTemplate): Promise<any> {
    // Meta WhatsApp Business API oficial
    // https://developers.facebook.com/docs/whatsapp/cloud-api
    const phoneNumberId = this.config.get('META_WA_PHONE_ID');
    const accessToken = this.config.get('META_WA_TOKEN');

    if (!phoneNumberId || !accessToken) {
      this.logger.warn('META_WA_PHONE_ID ou META_WA_TOKEN não configurados, caindo pra MOCK');
      return this.sendMock(phone, message, template);
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: message }
          })
        }
      );
      const data = await response.json();
      return { provider: 'meta', messageId: data.messages?.[0]?.id, to: phone };
    } catch (err) {
      this.logger.error(`Meta WA falhou: ${err.message}`);
      throw err;
    }
  }

  private async sendViaZApi(phone: string, message: string, template: WhatsAppTemplate): Promise<any> {
    // Z-API (mais simples e popular no BR)
    const zapiInstance = this.config.get('ZAPI_INSTANCE');
    const zapiToken = this.config.get('ZAPI_TOKEN');

    if (!zapiInstance || !zapiToken) {
      return this.sendMock(phone, message, template);
    }

    try {
      const response = await fetch(
        `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/send-text`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message })
        }
      );
      return { provider: 'z-api', status: response.status };
    } catch (err) {
      throw err;
    }
  }

  private async sendViaTwilio(phone: string, message: string, template: WhatsAppTemplate): Promise<any> {
    // Twilio (internacional)
    const accountSid = this.config.get('TWILIO_SID');
    const authToken = this.config.get('TWILIO_TOKEN');
    const fromNumber = this.config.get('TWILIO_WA_FROM');

    if (!accountSid || !authToken) {
      return this.sendMock(phone, message, template);
    }

    // Twilio usa Basic Auth
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            To: `whatsapp:${phone}`,
            From: `whatsapp:${fromNumber}`,
            Body: message
          }).toString()
        }
      );
      return { provider: 'twilio', status: response.status };
    } catch (err) {
      throw err;
    }
  }
}
