// ============================================
//  NEXTGEN SMART BILLING MVP
//  Rotas reais com prefixo global:
//  POST /v1/company-billing/customers
//  GET  /v1/company-billing/customers
//  POST /v1/company-billing/charges
//  GET  /v1/company-billing/charges
//  GET  /v1/company-billing/dashboard
//  GET  /v1/company-billing/reminders/due
//  POST /v1/company-billing/reminders/run-due
// ============================================

import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

type ReminderStep = {
  key: string;
  offsetDays: number;
  title: string;
  tone: 'friendly' | 'direct' | 'late' | 'finance';
};

const REMINDER_STEPS: ReminderStep[] = [
  { key: 'D_MINUS_3', offsetDays: -3, title: 'Lembrete amigável', tone: 'friendly' },
  { key: 'D_MINUS_1', offsetDays: -1, title: 'Lembrete de vencimento', tone: 'friendly' },
  { key: 'D_DAY', offsetDays: 0, title: 'Cobrança do dia', tone: 'direct' },
  { key: 'D_PLUS_1', offsetDays: 1, title: 'Aviso de atraso', tone: 'late' },
  { key: 'D_PLUS_5', offsetDays: 5, title: 'Segunda cobrança', tone: 'late' },
  { key: 'D_PLUS_10', offsetDays: 10, title: 'Alerta para financeiro', tone: 'finance' }
];

@Controller('company-billing')
export class SmartBillingController {
  @Get('health')
  async health() {
    await this.ensureTables();
    return {
      success: true,
      service: 'nextgen-smart-billing',
      product: 'Cobrança Inteligente',
      routes: [
        'POST /v1/company-billing/customers',
        'GET /v1/company-billing/customers?partnerSlug=nextgen-assets',
        'POST /v1/company-billing/charges',
        'GET /v1/company-billing/charges?partnerSlug=nextgen-assets',
        'GET /v1/company-billing/dashboard?partnerSlug=nextgen-assets',
        'GET /v1/company-billing/reminders/due?partnerSlug=nextgen-assets',
        'POST /v1/company-billing/reminders/run-due'
      ]
    };
  }

  @Post('customers')
  async createCustomer(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets', body.partnerName);

    if (!body.name) {
      return { success: false, error: 'MISSING_NAME', message: 'Informe o nome do cliente/pagador.' };
    }

    const id = `sbc_${randomUUID().replace(/-/g, '')}`;
    const externalCustomerId = body.externalCustomerId || body.codigo || body.unidade || null;
    const metadata = {
      segment: body.segment || body.segmento || null,
      unit: body.unit || body.unidade || null,
      notes: body.notes || body.observacoes || null,
      rawInput: this.sanitize(body)
    };

    const existing = externalCustomerId
      ? await prisma.$queryRaw<any[]>`
          SELECT * FROM smart_billing_customers
          WHERE partner_id = ${partner.id} AND external_customer_id = ${externalCustomerId}
          LIMIT 1
        `
      : [];

    if (existing.length) {
      const updated = await prisma.$queryRaw<any[]>`
        UPDATE smart_billing_customers
        SET name = ${body.name},
            document = ${this.onlyDigits(body.document || body.cpf || body.cnpj)},
            email = ${body.email || null},
            phone = ${body.phone || body.whatsapp || null},
            customer_type = ${body.customerType || body.tipo || 'PF'},
            metadata = ${metadata}::jsonb,
            updated_at = now()
        WHERE id = ${existing[0].id}
        RETURNING *
      `;
      return { success: true, action: 'updated', customer: this.toCamel(updated[0]) };
    }

    const created = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_customers (
        id, partner_id, external_customer_id, name, document, email, phone, customer_type, status, metadata
      ) VALUES (
        ${id}, ${partner.id}, ${externalCustomerId}, ${body.name},
        ${this.onlyDigits(body.document || body.cpf || body.cnpj)},
        ${body.email || null}, ${body.phone || body.whatsapp || null},
        ${body.customerType || body.tipo || 'PF'}, 'ACTIVE', ${metadata}::jsonb
      ) RETURNING *
    `;

    return { success: true, action: 'created', customer: this.toCamel(created[0]) };
  }

  @Get('customers')
  async listCustomers(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_billing_customers
      WHERE partner_id = ${partner.id}
      ORDER BY created_at DESC
      LIMIT 200
    `;
    return { success: true, partner: { id: partner.id, slug: partner.slug, name: partner.name }, customers: rows.map((r) => this.toCamel(r)) };
  }

  @Post('charges')
  async createCharge(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets', body.partnerName);

    if (!body.customerId && !body.externalCustomerId) {
      return { success: false, error: 'MISSING_CUSTOMER', message: 'Informe customerId ou externalCustomerId.' };
    }
    if (!body.amount && !body.valor) {
      return { success: false, error: 'MISSING_AMOUNT', message: 'Informe o valor da cobrança.' };
    }
    if (!body.dueDate && !body.vencimento) {
      return { success: false, error: 'MISSING_DUE_DATE', message: 'Informe o vencimento no formato YYYY-MM-DD.' };
    }

    const customer = await this.findCustomer(partner.id, body.customerId, body.externalCustomerId);
    if (!customer) {
      return { success: false, error: 'CUSTOMER_NOT_FOUND', message: 'Cliente não encontrado para este parceiro.' };
    }

    const id = `chg_${randomUUID().replace(/-/g, '')}`;
    const amount = String(body.amount || body.valor).replace(',', '.');
    const dueDate = body.dueDate || body.vencimento;
    const title = body.title || body.titulo || `Cobrança ${dueDate}`;
    const description = body.description || body.descricao || 'Cobrança inteligente NextGen';
    const chargeType = body.chargeType || body.tipoCobranca || 'PIX';
    const paymentMethod = body.paymentMethod || body.metodoPagamento || 'PIX_LINK';
    const paymentLink = body.paymentLink || `https://nextgenassets.com.br/pagar/${id}`;

    const rawData = {
      product: 'smart-billing',
      source: body.source || 'DASHBOARD',
      createdBy: body.createdBy || 'company-admin',
      rawInput: this.sanitize(body)
    };

    const created = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_charges (
        id, partner_id, customer_id, title, description, amount_brl, due_date,
        charge_type, status, payment_method, payment_link, raw_data
      ) VALUES (
        ${id}, ${partner.id}, ${customer.id}, ${title}, ${description}, ${amount}::numeric,
        ${dueDate}::date, ${chargeType}, 'PENDING', ${paymentMethod}, ${paymentLink}, ${rawData}::jsonb
      ) RETURNING *
    `;

    const reminders = await this.scheduleReminders({
      partnerId: partner.id,
      customer,
      charge: created[0],
      paymentLink
    });

    return {
      success: true,
      message: 'Cobrança criada e régua de lembretes agendada.',
      charge: this.toCamel(created[0]),
      reminders: reminders.map((r) => this.toCamel(r))
    };
  }

  @Get('charges')
  async listCharges(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT c.*, cu.name AS customer_name, cu.phone AS customer_phone, cu.email AS customer_email
      FROM smart_billing_charges c
      JOIN smart_billing_customers cu ON cu.id = c.customer_id
      WHERE c.partner_id = ${partner.id}
      ORDER BY c.created_at DESC
      LIMIT 200
    `;
    return { success: true, partner: { id: partner.id, slug: partner.slug, name: partner.name }, charges: rows.map((r) => this.toCamel(r)) };
  }

  @Get('dashboard')
  async dashboard(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const stats = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*)::int AS total_charges,
        COALESCE(SUM(amount_brl), 0)::text AS total_amount,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount_brl ELSE 0 END), 0)::text AS paid_amount,
        COALESCE(SUM(CASE WHEN status IN ('PENDING','SENT') THEN amount_brl ELSE 0 END), 0)::text AS pending_amount,
        COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN amount_brl ELSE 0 END), 0)::text AS overdue_amount,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END)::int AS paid_count,
        COUNT(CASE WHEN status IN ('PENDING','SENT') THEN 1 END)::int AS pending_count,
        COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END)::int AS overdue_count
      FROM smart_billing_charges
      WHERE partner_id = ${partner.id}
    `;

    const dueReminders = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int AS due_count
      FROM smart_billing_reminders
      WHERE partner_id = ${partner.id}
        AND status = 'PENDING'
        AND scheduled_at <= now()
    `;

    const latest = await prisma.$queryRaw<any[]>`
      SELECT c.*, cu.name AS customer_name
      FROM smart_billing_charges c
      JOIN smart_billing_customers cu ON cu.id = c.customer_id
      WHERE c.partner_id = ${partner.id}
      ORDER BY c.created_at DESC
      LIMIT 10
    `;

    return {
      success: true,
      partner: { id: partner.id, slug: partner.slug, name: partner.name },
      dashboard: {
        ...this.toCamel(stats[0]),
        dueReminders: dueReminders[0]?.due_count || 0
      },
      latestCharges: latest.map((r) => this.toCamel(r))
    };
  }

  @Get('reminders/due')
  async dueReminders(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT r.*, cu.name AS customer_name, cu.phone AS customer_phone, cu.email AS customer_email,
             c.amount_brl, c.due_date, c.payment_link, c.status AS charge_status
      FROM smart_billing_reminders r
      JOIN smart_billing_customers cu ON cu.id = r.customer_id
      JOIN smart_billing_charges c ON c.id = r.charge_id
      WHERE r.partner_id = ${partner.id}
        AND r.status = 'PENDING'
        AND r.scheduled_at <= now()
      ORDER BY r.scheduled_at ASC
      LIMIT 100
    `;

    return { success: true, count: rows.length, reminders: rows.map((r) => this.toCamel(r)) };
  }

  @Post('reminders/run-due')
  async runDueReminders(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets');
    const dryRun = body.dryRun ?? true;

    const rows = await prisma.$queryRaw<any[]>`
      SELECT r.*, cu.name AS customer_name, cu.phone AS customer_phone, cu.email AS customer_email,
             c.amount_brl, c.due_date, c.payment_link, c.status AS charge_status
      FROM smart_billing_reminders r
      JOIN smart_billing_customers cu ON cu.id = r.customer_id
      JOIN smart_billing_charges c ON c.id = r.charge_id
      WHERE r.partner_id = ${partner.id}
        AND r.status = 'PENDING'
        AND r.scheduled_at <= now()
      ORDER BY r.scheduled_at ASC
      LIMIT 100
    `;

    if (!dryRun && rows.length) {
      const ids = rows.map((r) => r.id);
      await prisma.$executeRawUnsafe(
        `UPDATE smart_billing_reminders SET status = 'SENT', sent_at = now(), updated_at = now() WHERE id = ANY($1)`,
        ids
      );
    }

    return {
      success: true,
      dryRun,
      message: dryRun
        ? 'Simulação: lembretes prontos para envio. Envie dryRun=false para marcar como enviados.'
        : 'Lembretes marcados como enviados. Próximo passo: plugar WhatsApp/e-mail real.',
      count: rows.length,
      reminders: rows.map((r) => this.toCamel(r))
    };
  }

  private async scheduleReminders(opts: { partnerId: string; customer: any; charge: any; paymentLink: string }) {
    const result: any[] = [];
    const due = new Date(`${opts.charge.due_date.toISOString ? opts.charge.due_date.toISOString().slice(0, 10) : opts.charge.due_date}T12:00:00.000Z`);

    for (const step of REMINDER_STEPS) {
      const scheduledAt = new Date(due);
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() + step.offsetDays);
      scheduledAt.setUTCHours(step.offsetDays < 0 ? 12 : 13, 0, 0, 0);

      const id = `rem_${randomUUID().replace(/-/g, '')}`;
      const message = this.buildReminderMessage({ customer: opts.customer, charge: opts.charge, step, paymentLink: opts.paymentLink });
      const inserted = await prisma.$queryRaw<any[]>`
        INSERT INTO smart_billing_reminders (
          id, partner_id, customer_id, charge_id, channel, step_key, scheduled_at, status, title, message, raw_data
        ) VALUES (
          ${id}, ${opts.partnerId}, ${opts.customer.id}, ${opts.charge.id}, 'WHATSAPP', ${step.key},
          ${scheduledAt}, 'PENDING', ${step.title}, ${message}, ${JSON.stringify({ tone: step.tone, offsetDays: step.offsetDays })}::jsonb
        ) RETURNING *
      `;
      result.push(inserted[0]);
    }

    return result;
  }

  private buildReminderMessage(opts: { customer: any; charge: any; step: ReminderStep; paymentLink: string }) {
    const name = String(opts.customer.name || 'cliente').split(' ')[0];
    const amount = Number(opts.charge.amount_brl || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const dueDate = new Date(opts.charge.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

    if (opts.step.key === 'D_MINUS_3') {
      return `Olá, ${name}. Passando para lembrar que sua cobrança de ${amount} vence em ${dueDate}. Você pode pagar pelo link: ${opts.paymentLink}`;
    }
    if (opts.step.key === 'D_MINUS_1') {
      return `Olá, ${name}. Sua cobrança de ${amount} vence amanhã (${dueDate}). Para facilitar, segue o link de pagamento: ${opts.paymentLink}`;
    }
    if (opts.step.key === 'D_DAY') {
      return `Olá, ${name}. Sua cobrança de ${amount} vence hoje. Pague com Pix pelo link: ${opts.paymentLink}`;
    }
    if (opts.step.key === 'D_PLUS_1') {
      return `Olá, ${name}. Identificamos que a cobrança de ${amount}, vencida em ${dueDate}, ainda está pendente. Regularize pelo link: ${opts.paymentLink}`;
    }
    if (opts.step.key === 'D_PLUS_5') {
      return `Olá, ${name}. Sua cobrança de ${amount} segue em aberto. Evite restrições/juros adicionais regularizando aqui: ${opts.paymentLink}`;
    }
    return `Alerta financeiro: cobrança de ${amount} do cliente ${opts.customer.name} segue pendente desde ${dueDate}. Link: ${opts.paymentLink}`;
  }

  private async findCustomer(partnerId: string, customerId?: string, externalCustomerId?: string) {
    if (customerId) {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT * FROM smart_billing_customers WHERE partner_id = ${partnerId} AND id = ${customerId} LIMIT 1
      `;
      return rows[0] || null;
    }
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_billing_customers WHERE partner_id = ${partnerId} AND external_customer_id = ${externalCustomerId} LIMIT 1
    `;
    return rows[0] || null;
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

  private async ensureTables() {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_billing_customers (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        external_customer_id text,
        name text NOT NULL,
        document text,
        email text,
        phone text,
        customer_type text NOT NULL DEFAULT 'PF',
        status text NOT NULL DEFAULT 'ACTIVE',
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_billing_charges (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        customer_id text NOT NULL,
        title text NOT NULL,
        description text,
        amount_brl numeric(18,2) NOT NULL,
        due_date date NOT NULL,
        charge_type text NOT NULL DEFAULT 'PIX',
        status text NOT NULL DEFAULT 'PENDING',
        payment_method text NOT NULL DEFAULT 'PIX_LINK',
        payment_link text,
        pix_payload jsonb,
        provider text,
        provider_ref text,
        end_to_end_id text,
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        paid_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_billing_reminders (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        customer_id text NOT NULL,
        charge_id text NOT NULL,
        channel text NOT NULL DEFAULT 'WHATSAPP',
        step_key text NOT NULL,
        scheduled_at timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'PENDING',
        title text NOT NULL,
        message text NOT NULL,
        sent_at timestamptz,
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sbc_partner ON smart_billing_customers(partner_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sbc_partner_external ON smart_billing_customers(partner_id, external_customer_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sbc_phone ON smart_billing_customers(phone)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_chg_partner_status ON smart_billing_charges(partner_id, status)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_chg_customer ON smart_billing_charges(customer_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_chg_due_date ON smart_billing_charges(due_date)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_rem_partner_due ON smart_billing_reminders(partner_id, status, scheduled_at)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_rem_charge ON smart_billing_reminders(charge_id)`);
  }

  private toCamel(row: any) {
    if (!row) return row;
    const out: any = {};
    for (const [key, value] of Object.entries(row)) {
      out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
    }
    return out;
  }

  private sanitize(body: any) {
    const clone = { ...body };
    if (clone.document) clone.document = this.maskDoc(clone.document);
    if (clone.cpf) clone.cpf = this.maskDoc(clone.cpf);
    if (clone.cnpj) clone.cnpj = this.maskDoc(clone.cnpj);
    return clone;
  }

  private onlyDigits(value?: string) {
    return String(value || '').replace(/\D/g, '') || null;
  }

  private maskDoc(doc?: string) {
    const clean = this.onlyDigits(doc) || '';
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
