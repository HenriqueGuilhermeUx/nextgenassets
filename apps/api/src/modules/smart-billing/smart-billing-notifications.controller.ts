// ============================================
//  NEXTGEN SMART BILLING — NOTIFICATION ENGINE
//  Motor de avisos, lembretes, agenda e comunicação
//
//  Rotas reais com prefixo global:
//  GET  /v1/company-billing/notifications/health
//  POST /v1/company-billing/notifications/schedule-charge
//  GET  /v1/company-billing/notifications/pending
//  POST /v1/company-billing/notifications/run-due
//  POST /v1/company-billing/notifications/send-test
//  GET  /v1/company-billing/notifications/logs
// ============================================

import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

type NotificationStep = {
  type: string;
  offsetDays: number;
  title: string;
  audience: 'payer' | 'company' | 'finance';
  tone: 'friendly' | 'direct' | 'late' | 'finance';
};

const CHARGE_STEPS: NotificationStep[] = [
  { type: 'CHARGE_D_MINUS_3', offsetDays: -3, title: 'Lembrete amigavel', audience: 'payer', tone: 'friendly' },
  { type: 'CHARGE_D_MINUS_1', offsetDays: -1, title: 'Lembrete de vencimento', audience: 'payer', tone: 'friendly' },
  { type: 'CHARGE_D_DAY', offsetDays: 0, title: 'Vence hoje', audience: 'payer', tone: 'direct' },
  { type: 'CHARGE_D_PLUS_1', offsetDays: 1, title: 'Aviso de vencido', audience: 'payer', tone: 'late' },
  { type: 'CHARGE_D_PLUS_5', offsetDays: 5, title: 'Segunda tentativa', audience: 'payer', tone: 'late' },
  { type: 'CHARGE_D_PLUS_10', offsetDays: 10, title: 'Alerta financeiro', audience: 'finance', tone: 'finance' }
];

@Controller('company-billing/notifications')
export class SmartBillingNotificationsController {
  @Get('health')
  async health() {
    await this.ensureTables();
    return {
      success: true,
      service: 'nextgen-smart-billing-notifications',
      product: 'NextGen Alerts / Communication Engine',
      status: 'ready',
      purpose: [
        'Avisos de cobranca antes e depois do vencimento.',
        'Comunicacao de Pix recorrente e autorizacoes futuras.',
        'Alertas de pagamento recebido, repasse pendente e repasse feito.',
        'Base para WhatsApp, e-mail, webhook e comunicacao interna no painel.'
      ],
      providers: {
        email: {
          planned: 'Resend',
          hasResendApiKey: !!process.env.RESEND_API_KEY
        },
        whatsapp: {
          planned: 'Evolution API, Twilio ou Meta API',
          hasEvolutionUrl: !!process.env.EVOLUTION_API_URL,
          hasTwilioSid: !!process.env.TWILIO_ACCOUNT_SID,
          hasMetaToken: !!process.env.WHATSAPP_ACCESS_TOKEN
        },
        currentMode: 'mock/log-first'
      },
      routes: [
        'POST /v1/company-billing/notifications/schedule-charge',
        'GET /v1/company-billing/notifications/pending?partnerSlug=nextgen-assets',
        'POST /v1/company-billing/notifications/run-due',
        'POST /v1/company-billing/notifications/send-test',
        'GET /v1/company-billing/notifications/logs?partnerSlug=nextgen-assets'
      ]
    };
  }

  @Post('schedule-charge')
  async scheduleCharge(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets', body.partnerName);

    const chargeContext = await this.resolveChargeContext(partner.id, body);
    if (!chargeContext.success) return chargeContext;

    const channels = this.normalizeChannels(body.channels || body.channel || ['whatsapp', 'email']);
    const steps = body.steps?.length
      ? CHARGE_STEPS.filter((step) => body.steps.includes(step.type) || body.steps.includes(step.type.replace('CHARGE_', '')))
      : CHARGE_STEPS;

    const created: any[] = [];
    for (const step of steps) {
      for (const channel of channels) {
        if (step.audience === 'finance' && channel === 'whatsapp' && body.skipFinanceWhatsApp !== false) {
          continue;
        }

        const scheduledAt = this.scheduleDate(chargeContext.dueDate, step.offsetDays, body.scheduleHour);
        const message = this.buildChargeMessage({ ...chargeContext, step, channel });
        const recipient = this.resolveRecipient(chargeContext, step, channel);
        const id = `ntf_${randomUUID().replace(/-/g, '')}`;
        const rawData = JSON.stringify({
          source: body.source || 'nextgen-smart-billing',
          rule: 'charge-dunning',
          step,
          channel,
          chargeContext: this.sanitizeContext(chargeContext),
          rawInput: this.sanitize(body)
        });

        const inserted = await prisma.$queryRaw<any[]>`
          INSERT INTO smart_billing_notifications (
            id, partner_id, charge_id, customer_id, type, channel, status,
            scheduled_at, recipient_name, recipient_ref, template_key, title, message,
            provider, raw_data
          ) VALUES (
            ${id}, ${partner.id}, ${chargeContext.chargeId || null}, ${chargeContext.customerId || null},
            ${step.type}, ${channel.toUpperCase()}, 'PENDING', ${scheduledAt},
            ${recipient.name}, ${recipient.ref}, ${step.type}, ${step.title}, ${message},
            'mock', ${rawData}::jsonb
          ) RETURNING *
        `;
        created.push(inserted[0]);
      }
    }

    return {
      success: true,
      message: 'Notificacoes da cobranca agendadas.',
      partner: { id: partner.id, slug: partner.slug, name: partner.name },
      charge: {
        id: chargeContext.chargeId,
        title: chargeContext.title,
        dueDate: chargeContext.dueDate,
        amountBrl: chargeContext.amountBrl,
        paymentLink: chargeContext.paymentLink
      },
      count: created.length,
      notifications: created.map((row) => this.toCamel(row))
    };
  }

  @Get('pending')
  async pending(
    @Query('partnerSlug') partnerSlug = 'nextgen-assets',
    @Query('channel') channel?: string,
    @Query('limit') limit = '100'
  ) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const channelUpper = channel ? channel.toUpperCase() : null;

    const rows = channelUpper
      ? await prisma.$queryRaw<any[]>`
          SELECT * FROM smart_billing_notifications
          WHERE partner_id = ${partner.id}
            AND status = 'PENDING'
            AND channel = ${channelUpper}
            AND scheduled_at <= now()
          ORDER BY scheduled_at ASC
          LIMIT ${safeLimit}
        `
      : await prisma.$queryRaw<any[]>`
          SELECT * FROM smart_billing_notifications
          WHERE partner_id = ${partner.id}
            AND status = 'PENDING'
            AND scheduled_at <= now()
          ORDER BY scheduled_at ASC
          LIMIT ${safeLimit}
        `;

    return {
      success: true,
      partner: { id: partner.id, slug: partner.slug, name: partner.name },
      count: rows.length,
      notifications: rows.map((row) => this.toCamel(row))
    };
  }

  @Post('run-due')
  async runDue(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets');
    const dryRun = body.dryRun ?? true;
    const channelUpper = body.channel ? String(body.channel).toUpperCase() : null;
    const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 500);

    const rows = channelUpper
      ? await prisma.$queryRaw<any[]>`
          SELECT * FROM smart_billing_notifications
          WHERE partner_id = ${partner.id}
            AND status = 'PENDING'
            AND channel = ${channelUpper}
            AND scheduled_at <= now()
          ORDER BY scheduled_at ASC
          LIMIT ${limit}
        `
      : await prisma.$queryRaw<any[]>`
          SELECT * FROM smart_billing_notifications
          WHERE partner_id = ${partner.id}
            AND status = 'PENDING'
            AND scheduled_at <= now()
          ORDER BY scheduled_at ASC
          LIMIT ${limit}
        `;

    const prepared = rows.map((row) => ({
      id: row.id,
      channel: row.channel,
      type: row.type,
      recipientName: row.recipient_name,
      recipientRef: row.recipient_ref,
      message: row.message,
      provider: this.providerForChannel(row.channel),
      providerMessageId: dryRun ? null : `mock_${randomUUID().replace(/-/g, '').slice(0, 16)}`
    }));

    if (!dryRun) {
      for (const item of prepared) {
        const deliveryLog = JSON.stringify({
          sentBy: 'nextgen-notification-engine',
          mode: 'mock/log-first',
          provider: item.provider,
          providerMessageId: item.providerMessageId,
          sentAt: new Date().toISOString()
        });
        await prisma.$executeRawUnsafe(
          `UPDATE smart_billing_notifications
           SET status = 'SENT', sent_at = now(), provider = $1, provider_message_id = $2,
               raw_data = raw_data || $3::jsonb, updated_at = now()
           WHERE id = $4`,
          item.provider,
          item.providerMessageId,
          deliveryLog,
          item.id
        );
      }
    }

    return {
      success: true,
      dryRun,
      mode: 'mock/log-first',
      message: dryRun
        ? 'Simulacao: notificacoes prontas para envio. Envie dryRun=false para marcar como enviadas.'
        : 'Notificacoes marcadas como enviadas no modo mock/log. Proximo passo: plugar Resend/WhatsApp real.',
      count: rows.length,
      notifications: prepared
    };
  }

  @Post('send-test')
  async sendTest(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets', body.partnerName);
    const channel = String(body.channel || 'whatsapp').toUpperCase();
    const recipientName = body.recipientName || body.name || 'Cliente Teste';
    const recipientRef = body.recipientRef || body.phone || body.email || 'destino-nao-informado';
    const amountBrl = this.moneyFromAny(body.amountBrl || body.amount || body.valor || 100);
    const dueDate = body.dueDate || new Date().toISOString().slice(0, 10);
    const paymentLink = body.paymentLink || 'https://nextgenassets.com.br/pagar/teste';
    const type = body.type || 'CHARGE_D_DAY';
    const id = `ntf_${randomUUID().replace(/-/g, '')}`;
    const message = body.message || `Olá, ${String(recipientName).split(' ')[0]}. Sua cobrança de ${this.formatBrl(amountBrl)} vence em ${this.formatDate(dueDate)}. Pague via Pix: ${paymentLink}`;
    const saveLog = body.saveLog ?? true;

    let row: any = null;
    if (saveLog) {
      const rawData = JSON.stringify({ source: 'send-test', rawInput: this.sanitize(body) });
      const inserted = await prisma.$queryRaw<any[]>`
        INSERT INTO smart_billing_notifications (
          id, partner_id, type, channel, status, scheduled_at,
          recipient_name, recipient_ref, template_key, title, message, provider, raw_data, sent_at, provider_message_id
        ) VALUES (
          ${id}, ${partner.id}, ${type}, ${channel}, 'SENT', now(),
          ${recipientName}, ${recipientRef}, ${type}, 'Teste de notificacao', ${message},
          'mock', ${rawData}::jsonb, now(), ${`mock_${randomUUID().replace(/-/g, '').slice(0, 16)}`}
        ) RETURNING *
      `;
      row = inserted[0];
    }

    return {
      success: true,
      mode: 'mock/log-first',
      message: 'Teste preparado/registrado. Envio real sera plugado no proximo passo.',
      prepared: {
        channel,
        recipientName,
        recipientRef,
        message
      },
      notification: row ? this.toCamel(row) : null
    };
  }

  @Get('logs')
  async logs(
    @Query('partnerSlug') partnerSlug = 'nextgen-assets',
    @Query('status') status?: string,
    @Query('limit') limit = '100'
  ) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const statusUpper = status ? status.toUpperCase() : null;

    const rows = statusUpper
      ? await prisma.$queryRaw<any[]>`
          SELECT * FROM smart_billing_notifications
          WHERE partner_id = ${partner.id}
            AND status = ${statusUpper}
          ORDER BY created_at DESC
          LIMIT ${safeLimit}
        `
      : await prisma.$queryRaw<any[]>`
          SELECT * FROM smart_billing_notifications
          WHERE partner_id = ${partner.id}
          ORDER BY created_at DESC
          LIMIT ${safeLimit}
        `;

    return {
      success: true,
      partner: { id: partner.id, slug: partner.slug, name: partner.name },
      count: rows.length,
      logs: rows.map((row) => this.toCamel(row))
    };
  }

  private async resolveChargeContext(partnerId: string, body: any): Promise<any> {
    if (body.chargeId) {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT c.*, cu.name AS customer_name, cu.email AS customer_email, cu.phone AS customer_phone
        FROM smart_billing_charges c
        LEFT JOIN smart_billing_customers cu ON cu.id = c.customer_id
        WHERE c.partner_id = ${partnerId} AND c.id = ${body.chargeId}
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return { success: false, error: 'CHARGE_NOT_FOUND', message: 'Cobrança não encontrada para este parceiro.' };
      return {
        success: true,
        chargeId: row.id,
        customerId: row.customer_id,
        customerName: row.customer_name || body.customerName || 'Cliente',
        customerEmail: row.customer_email || body.customerEmail || null,
        customerPhone: row.customer_phone || body.customerPhone || body.customerWhatsapp || null,
        companyName: body.companyName || body.partnerName || 'sua empresa',
        financeEmail: body.financeEmail || body.companyEmail || null,
        financePhone: body.financePhone || body.companyWhatsapp || null,
        title: row.title,
        amountBrl: Number(row.amount_brl || 0),
        dueDate: this.dateOnly(row.due_date),
        paymentLink: row.payment_link || body.paymentLink || `https://nextgenassets.com.br/pagar/${row.id}`
      };
    }

    if (!body.dueDate && !body.vencimento) {
      return { success: false, error: 'MISSING_DUE_DATE', message: 'Informe dueDate/vencimento ou chargeId.' };
    }
    if (!body.amountBrl && !body.amount && !body.amountCents && !body.valor) {
      return { success: false, error: 'MISSING_AMOUNT', message: 'Informe amountBrl/amount/amountCents/valor ou chargeId.' };
    }

    return {
      success: true,
      chargeId: body.chargeId || null,
      customerId: body.customerId || null,
      customerName: body.customerName || body.name || 'Cliente',
      customerEmail: body.customerEmail || body.email || null,
      customerPhone: body.customerPhone || body.customerWhatsapp || body.phone || body.whatsapp || null,
      companyName: body.companyName || body.partnerName || 'sua empresa',
      financeEmail: body.financeEmail || body.companyEmail || null,
      financePhone: body.financePhone || body.companyWhatsapp || null,
      title: body.title || body.description || 'Cobrança NextGen',
      amountBrl: this.moneyFromAny(body.amountBrl || body.amount || body.valor || Number(body.amountCents || 0) / 100),
      dueDate: body.dueDate || body.vencimento,
      paymentLink: body.paymentLink || body.pixLink || 'https://nextgenassets.com.br/pagar'
    };
  }

  private normalizeChannels(input: any): string[] {
    const arr = Array.isArray(input) ? input : [input];
    const normalized = arr
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean)
      .map((item) => {
        if (item === 'zap') return 'whatsapp';
        if (item === 'mail') return 'email';
        return item;
      })
      .filter((item) => ['whatsapp', 'email', 'internal', 'webhook'].includes(item));
    return Array.from(new Set(normalized.length ? normalized : ['whatsapp']));
  }

  private resolveRecipient(ctx: any, step: NotificationStep, channel: string) {
    if (step.audience === 'finance') {
      return {
        name: ctx.companyName || 'Financeiro',
        ref: channel === 'email' ? ctx.financeEmail || ctx.customerEmail || null : ctx.financePhone || ctx.customerPhone || null
      };
    }
    return {
      name: ctx.customerName || 'Cliente',
      ref: channel === 'email' ? ctx.customerEmail || null : channel === 'whatsapp' ? ctx.customerPhone || null : ctx.customerId || ctx.chargeId || null
    };
  }

  private scheduleDate(dateInput: string, offsetDays: number, scheduleHour?: number) {
    const due = new Date(`${this.dateOnly(dateInput)}T12:00:00.000Z`);
    due.setUTCDate(due.getUTCDate() + offsetDays);
    const hour = Number.isFinite(Number(scheduleHour)) ? Number(scheduleHour) : offsetDays < 0 ? 12 : 13;
    due.setUTCHours(hour, 0, 0, 0);
    return due;
  }

  private buildChargeMessage(ctx: any) {
    const firstName = String(ctx.customerName || 'cliente').split(' ')[0];
    const amount = this.formatBrl(ctx.amountBrl);
    const dueDate = this.formatDate(ctx.dueDate);
    const link = ctx.paymentLink;

    if (ctx.step.type === 'CHARGE_D_MINUS_3') {
      return `Olá, ${firstName}. Passando para lembrar que sua cobrança de ${amount} vence em ${dueDate}. Você pode pagar pelo link Pix: ${link}`;
    }
    if (ctx.step.type === 'CHARGE_D_MINUS_1') {
      return `Olá, ${firstName}. Sua cobrança de ${amount} vence amanhã (${dueDate}). Para facilitar, segue o link Pix: ${link}`;
    }
    if (ctx.step.type === 'CHARGE_D_DAY') {
      return `Olá, ${firstName}. Sua cobrança de ${amount} vence hoje. Pague via Pix pelo link: ${link}`;
    }
    if (ctx.step.type === 'CHARGE_D_PLUS_1') {
      return `Olá, ${firstName}. Identificamos que a cobrança de ${amount}, vencida em ${dueDate}, ainda está pendente. Regularize pelo link: ${link}`;
    }
    if (ctx.step.type === 'CHARGE_D_PLUS_5') {
      return `Olá, ${firstName}. Sua cobrança de ${amount} segue em aberto. Para regularizar, use o link Pix: ${link}`;
    }
    return `Alerta financeiro NextGen: cobrança de ${amount} do cliente ${ctx.customerName || 'Cliente'} segue pendente desde ${dueDate}. Link: ${link}`;
  }

  private providerForChannel(channel: string) {
    const normalized = String(channel || '').toUpperCase();
    if (normalized === 'EMAIL') return process.env.RESEND_API_KEY ? 'resend-ready' : 'mock-email';
    if (normalized === 'WHATSAPP') {
      if (process.env.WHATSAPP_ACCESS_TOKEN) return 'meta-ready';
      if (process.env.TWILIO_ACCOUNT_SID) return 'twilio-ready';
      if (process.env.EVOLUTION_API_URL) return 'evolution-ready';
      return 'mock-whatsapp';
    }
    if (normalized === 'WEBHOOK') return 'webhook-ready';
    return 'internal-log';
  }

  private async ensureTables() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_billing_notifications (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        charge_id text,
        customer_id text,
        type text NOT NULL,
        channel text NOT NULL,
        status text NOT NULL DEFAULT 'PENDING',
        scheduled_at timestamptz NOT NULL,
        sent_at timestamptz,
        recipient_name text,
        recipient_ref text,
        template_key text,
        title text,
        message text NOT NULL,
        provider text,
        provider_message_id text,
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sbn_partner_status_due ON smart_billing_notifications(partner_id, status, scheduled_at)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sbn_charge ON smart_billing_notifications(charge_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sbn_customer ON smart_billing_notifications(customer_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sbn_channel ON smart_billing_notifications(channel)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sbn_type ON smart_billing_notifications(type)`);
  }

  private async getOrCreatePartner(slug: string, name?: string) {
    return prisma.partner.upsert({
      where: { slug },
      update: name ? { name } : {},
      create: {
        slug,
        name: name || this.titleFromSlug(slug),
        type: 'FINTECH' as any,
        config: {},
        commissionRate: 0.03,
        tier: 'STARTER' as any
      } as any
    });
  }

  private toCamel(row: any) {
    if (!row) return row;
    const out: any = {};
    for (const [key, value] of Object.entries(row)) {
      out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
    }
    return out;
  }

  private dateOnly(input: any) {
    if (!input) return new Date().toISOString().slice(0, 10);
    if (input instanceof Date) return input.toISOString().slice(0, 10);
    return String(input).slice(0, 10);
  }

  private moneyFromAny(value: any) {
    if (typeof value === 'number') return value;
    const text = String(value || '0').replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatBrl(value: number) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private formatDate(input: any) {
    return new Date(`${this.dateOnly(input)}T12:00:00.000Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  private sanitizeContext(ctx: any) {
    return {
      ...ctx,
      customerEmail: ctx.customerEmail ? this.maskEmail(ctx.customerEmail) : null,
      customerPhone: ctx.customerPhone ? this.maskPhone(ctx.customerPhone) : null,
      financeEmail: ctx.financeEmail ? this.maskEmail(ctx.financeEmail) : null,
      financePhone: ctx.financePhone ? this.maskPhone(ctx.financePhone) : null
    };
  }

  private sanitize(body: any) {
    const clone = { ...body };
    for (const key of Object.keys(clone)) {
      if (/email/i.test(key)) clone[key] = this.maskEmail(clone[key]);
      if (/phone|whatsapp|telefone/i.test(key)) clone[key] = this.maskPhone(clone[key]);
      if (/document|cpf|cnpj/i.test(key)) clone[key] = this.maskDoc(clone[key]);
    }
    return clone;
  }

  private maskEmail(email?: string) {
    const value = String(email || '');
    const [user, domain] = value.split('@');
    if (!user || !domain) return value ? '***' : null;
    return `${user.slice(0, 2)}***@${domain}`;
  }

  private maskPhone(phone?: string) {
    const clean = String(phone || '').replace(/\D/g, '');
    if (!clean) return null;
    return `${clean.slice(0, 4)}******${clean.slice(-2)}`;
  }

  private maskDoc(doc?: string) {
    const clean = String(doc || '').replace(/\D/g, '');
    if (!clean) return undefined;
    if (clean.length <= 4) return '****';
    return `${clean.slice(0, 3)}******${clean.slice(-2)}`;
  }

  private titleFromSlug(slug: string) {
    return slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
