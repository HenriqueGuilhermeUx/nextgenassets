import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

@Controller('company-billing/recurrences')
export class SmartBillingRecurrencesController {
  @Get('health')
  async health() {
    await this.ensureTables();
    return {
      success: true,
      service: 'nextgen-smart-billing-recurrences',
      status: 'ready',
      model: 'agenda-based-recurrence',
      routes: [
        'POST /v1/company-billing/recurrences',
        'GET /v1/company-billing/recurrences?partnerSlug=nextgen-assets',
        'POST /v1/company-billing/recurrences/generate-due',
        'GET /v1/company-billing/recurrences/cron?partnerSlug=nextgen-assets&secret=...'
      ]
    };
  }

  @Post()
  async create(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets');

    const customer = await this.findCustomer(partner.id, body.customerId, body.externalCustomerId);
    if (!customer) {
      return { success: false, error: 'CUSTOMER_NOT_FOUND', message: 'Cliente não encontrado.' };
    }

    const amount = String(body.amount || body.amountBrl || body.valor || '').replace(',', '.');
    if (!amount || Number(amount) <= 0) {
      return { success: false, error: 'INVALID_AMOUNT', message: 'Informe um valor válido.' };
    }

    const dueDay = Math.min(Math.max(Number(body.dueDay || body.diaVencimento || 10), 1), 28);
    const startDate = body.startDate || new Date().toISOString().slice(0, 10);
    const nextChargeDate = body.nextChargeDate || this.nextDateFromDueDay(dueDay, startDate);
    const id = `rec_${randomUUID().replace(/-/g, '')}`;

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_recurrences (
        id, partner_id, customer_id, title, description, amount_brl, frequency,
        due_day, start_date, end_date, status, next_charge_date, provider, raw_data
      ) VALUES (
        ${id}, ${partner.id}, ${customer.id},
        ${body.title || body.titulo || 'Recebimento recorrente'},
        ${body.description || body.descricao || 'Recorrência NextGen'},
        ${amount}::numeric,
        ${body.frequency || body.frequencia || 'MONTHLY'},
        ${dueDay}, ${startDate}::date, ${body.endDate || null}, 'ACTIVE', ${nextChargeDate}::date,
        ${body.provider || 'WOOVI'}, ${JSON.stringify({ rawInput: this.sanitize(body) })}::jsonb
      ) RETURNING *
    `;

    return { success: true, message: 'Recorrência criada.', recurrence: this.toCamel(inserted[0]) };
  }

  @Get()
  async list(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT r.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
      FROM smart_billing_recurrences r
      JOIN smart_billing_customers c ON c.id = r.customer_id
      WHERE r.partner_id = ${partner.id}
      ORDER BY r.created_at DESC
      LIMIT 200
    `;
    return { success: true, count: rows.length, recurrences: rows.map((row) => this.toCamel(row)) };
  }

  @Post('generate-due')
  async generateDue(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets');
    const dryRun = body.dryRun ?? false;
    const today = body.today || new Date().toISOString().slice(0, 10);
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);

    const rows = await prisma.$queryRaw<any[]>`
      SELECT r.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
      FROM smart_billing_recurrences r
      JOIN smart_billing_customers c ON c.id = r.customer_id
      WHERE r.partner_id = ${partner.id}
        AND r.status = 'ACTIVE'
        AND r.next_charge_date <= ${today}::date
      ORDER BY r.next_charge_date ASC
      LIMIT ${limit}
    `;

    if (dryRun) {
      return {
        success: true,
        mode: 'dry-run',
        count: rows.length,
        due: rows.map((row) => this.toCamel(row))
      };
    }

    const generated: any[] = [];
    for (const recurrence of rows) {
      const chargeId = `chg_${randomUUID().replace(/-/g, '')}`;
      const dueDate = this.toDateString(recurrence.next_charge_date);
      const paymentLink = `https://nextgenassets.com.br/roteador-pagamentos?id=${chargeId}`;
      const title = `${recurrence.title} - ${dueDate.slice(0, 7)}`;

      const chargeRows = await prisma.$queryRaw<any[]>`
        INSERT INTO smart_billing_charges (
          id, partner_id, customer_id, title, description, amount_brl, due_date,
          charge_type, status, payment_method, payment_link, provider, raw_data
        ) VALUES (
          ${chargeId}, ${partner.id}, ${recurrence.customer_id}, ${title}, ${recurrence.description},
          ${recurrence.amount_brl}::numeric, ${dueDate}::date,
          'PIX', 'PENDING', 'PIX_LINK', ${paymentLink}, ${recurrence.provider || 'WOOVI'},
          ${JSON.stringify({ source: 'recurrence', recurrenceId: recurrence.id })}::jsonb
        ) RETURNING *
      `;

      await this.scheduleBasicEmailNotifications({
        partnerId: partner.id,
        customerId: recurrence.customer_id,
        chargeId,
        customerName: recurrence.customer_name,
        customerEmail: recurrence.customer_email,
        amountBrl: recurrence.amount_brl,
        dueDate,
        paymentLink
      });

      const nextDate = this.addMonthKeepingDueDay(dueDate, Number(recurrence.due_day || 10));
      await prisma.$executeRawUnsafe(
        `UPDATE smart_billing_recurrences
         SET last_charge_id = $1, last_generated_at = now(), next_charge_date = $2::date, updated_at = now()
         WHERE id = $3`,
        chargeId,
        nextDate,
        recurrence.id
      );

      generated.push({ recurrenceId: recurrence.id, charge: this.toCamel(chargeRows[0]), nextChargeDate: nextDate });
    }

    return { success: true, message: 'Cobranças recorrentes geradas.', count: generated.length, generated };
  }

  @Get('cron')
  async cron(@Query() query: any) {
    const expectedSecret = process.env.NEXTGEN_CRON_SECRET;
    if (!expectedSecret) return { success: false, error: 'MISSING_NEXTGEN_CRON_SECRET' };
    if (query.secret !== expectedSecret) return { success: false, error: 'INVALID_CRON_SECRET' };

    const result = await this.generateDue({
      partnerSlug: query.partnerSlug || 'nextgen-assets',
      dryRun: query.dryRun === 'true',
      limit: Number(query.limit) || 50,
      today: query.today
    });

    return { success: true, cron: true, service: 'nextgen-recurrences-cron', triggeredAt: new Date().toISOString(), result };
  }

  private async scheduleBasicEmailNotifications(input: any) {
    await this.ensureNotificationTable();
    if (!input.customerEmail) return [];

    const due = new Date(`${input.dueDate}T12:00:00.000Z`);
    const steps = [
      { type: 'RECURRENCE_D_MINUS_3', offset: -3, title: 'Lembrete de vencimento' },
      { type: 'RECURRENCE_D_DAY', offset: 0, title: 'Vence hoje' },
      { type: 'RECURRENCE_D_PLUS_1', offset: 1, title: 'Pagamento pendente' }
    ];

    const created: any[] = [];
    for (const step of steps) {
      const scheduledAt = new Date(due);
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() + step.offset);
      scheduledAt.setUTCHours(step.offset < 0 ? 12 : 13, 0, 0, 0);
      const id = `ntf_${randomUUID().replace(/-/g, '')}`;
      const value = Number(input.amountBrl || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const message = `Olá, ${String(input.customerName || 'cliente').split(' ')[0]}. Seu recebimento recorrente de ${value} vence em ${this.dateBR(input.dueDate)}. Pague pelo link: ${input.paymentLink}`;

      const row = await prisma.$queryRaw<any[]>`
        INSERT INTO smart_billing_notifications (
          id, partner_id, charge_id, customer_id, type, channel, status,
          scheduled_at, recipient_name, recipient_ref, template_key, title, message,
          provider, raw_data
        ) VALUES (
          ${id}, ${input.partnerId}, ${input.chargeId}, ${input.customerId}, ${step.type}, 'EMAIL', 'PENDING',
          ${scheduledAt}, ${input.customerName || 'Cliente'}, ${input.customerEmail}, ${step.type}, ${step.title}, ${message},
          'resend', ${JSON.stringify({ source: 'recurrence-basic-scheduler' })}::jsonb
        ) RETURNING *
      `;
      created.push(row[0]);
    }
    return created;
  }

  private async ensureTables() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_billing_recurrences (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        customer_id text NOT NULL,
        title text NOT NULL,
        description text,
        amount_brl numeric(18,2) NOT NULL,
        frequency text NOT NULL DEFAULT 'MONTHLY',
        due_day int NOT NULL DEFAULT 10,
        start_date date NOT NULL,
        end_date date,
        status text NOT NULL DEFAULT 'ACTIVE',
        next_charge_date date NOT NULL,
        last_charge_id text,
        last_generated_at timestamptz,
        provider text NOT NULL DEFAULT 'WOOVI',
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sbr_partner_status_next ON smart_billing_recurrences(partner_id, status, next_charge_date)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sbr_customer ON smart_billing_recurrences(customer_id)`);
  }

  private async ensureNotificationTable() {
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
  }

  private async findCustomer(partnerId: string, customerId?: string, externalCustomerId?: string) {
    if (customerId) {
      const rows = await prisma.$queryRaw<any[]>`SELECT * FROM smart_billing_customers WHERE partner_id = ${partnerId} AND id = ${customerId} LIMIT 1`;
      return rows[0] || null;
    }
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM smart_billing_customers WHERE partner_id = ${partnerId} AND external_customer_id = ${externalCustomerId} LIMIT 1`;
    return rows[0] || null;
  }

  private async getOrCreatePartner(slug: string) {
    return prisma.partner.upsert({
      where: { slug },
      update: {},
      create: { slug, name: this.titleFromSlug(slug), type: 'FINTECH' as any, config: {}, commissionRate: 0.03, tier: 'STARTER' as any } as any
    });
  }

  private nextDateFromDueDay(dueDay: number, startDate: string) {
    const base = new Date(`${startDate.slice(0, 10)}T12:00:00.000Z`);
    const candidate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), dueDay, 12, 0, 0));
    if (candidate < base) return this.addMonthKeepingDueDay(candidate.toISOString().slice(0, 10), dueDay);
    return candidate.toISOString().slice(0, 10);
  }

  private addMonthKeepingDueDay(date: string, dueDay: number) {
    const base = new Date(`${date.slice(0, 10)}T12:00:00.000Z`);
    return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, dueDay, 12, 0, 0)).toISOString().slice(0, 10);
  }

  private toDateString(value: any) {
    if (!value) return new Date().toISOString().slice(0, 10);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  private dateBR(value: string) {
    return new Date(`${value.slice(0, 10)}T12:00:00.000Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  private toCamel(row: any) {
    if (!row) return row;
    const out: any = {};
    for (const [key, value] of Object.entries(row)) out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
    return out;
  }

  private sanitize(body: any) {
    const clone = { ...body };
    delete clone.secret;
    return clone;
  }

  private titleFromSlug(slug: string) {
    return slug.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
}
