import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

@Controller('company-billing/bulk')
export class SmartBillingBulkController {
  @Get('health')
  async health() {
    await this.ensureTables();
    return {
      success: true,
      service: 'nextgen-bulk-import',
      status: 'ready',
      routes: [
        'GET /v1/company-billing/bulk/sample',
        'POST /v1/company-billing/bulk/preview',
        'POST /v1/company-billing/bulk/import'
      ]
    };
  }

  @Get('sample')
  sample() {
    return {
      success: true,
      separator: ';',
      requiredColumns: ['nome', 'valor', 'vencimento'],
      optionalColumns: ['codigo', 'email', 'whatsapp', 'documento', 'descricao', 'titulo', 'recorrente', 'dia_vencimento'],
      example: [
        'codigo;nome;email;whatsapp;documento;valor;vencimento;descricao',
        'cli-001;Joao Silva;joao@email.com;11999999999;12345678900;49,90;2026-07-10;Mensalidade julho',
        'cli-002;Maria Souza;maria@email.com;11888888888;98765432100;79,90;2026-07-15;Plano mensal'
      ].join('\n')
    };
  }

  @Post('preview')
  async preview(@Body() body: any) {
    const parsed = this.parseCsv(body.csv || body.text || body.data || '');
    return {
      success: parsed.errors.length === 0,
      count: parsed.rows.length,
      headers: parsed.headers,
      preview: parsed.rows.slice(0, 20),
      errors: parsed.errors
    };
  }

  @Post('import')
  async importRows(@Body() body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets', body.partnerName);
    const parsed = this.parseCsv(body.csv || body.text || body.data || '');

    if (parsed.errors.length) {
      return { success: false, error: 'INVALID_CSV', errors: parsed.errors, preview: parsed.rows.slice(0, 10) };
    }

    const dryRun = body.dryRun === true;
    const imported: any[] = [];
    const failed: any[] = [];

    for (let index = 0; index < parsed.rows.length; index++) {
      const row = parsed.rows[index];
      try {
        const normalized = this.normalizeRow(row, index + 2);
        if (!normalized.name) throw new Error('Nome obrigatório.');
        if (!normalized.amount) throw new Error('Valor obrigatório.');
        if (!normalized.dueDate) throw new Error('Vencimento obrigatório.');

        if (dryRun) {
          imported.push({ line: index + 2, action: 'dry-run', customer: normalized.name, amount: normalized.amount, dueDate: normalized.dueDate });
          continue;
        }

        const customer = await this.upsertCustomer(partner.id, normalized);
        const charge = await this.createCharge(partner.id, customer, normalized, body.source || 'BULK_IMPORT');
        imported.push({ line: index + 2, customer: this.toCamel(customer), charge: this.toCamel(charge) });
      } catch (err: any) {
        failed.push({ line: index + 2, error: err.message, row });
      }
    }

    return {
      success: failed.length === 0,
      dryRun,
      partner: { id: partner.id, slug: partner.slug, name: partner.name },
      totalRows: parsed.rows.length,
      importedCount: imported.length,
      failedCount: failed.length,
      imported,
      failed
    };
  }

  private parseCsv(input: string) {
    const text = String(input || '').trim();
    if (!text) return { headers: [], rows: [], errors: ['Cole ou envie o conteúdo CSV.'] };

    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return { headers: [], rows: [], errors: ['CSV precisa ter cabeçalho e pelo menos uma linha.'] };

    const separator = this.detectSeparator(lines[0]);
    const headers = this.splitLine(lines[0], separator).map((h) => this.key(h));
    const rows: any[] = [];
    const errors: string[] = [];

    if (!headers.includes('nome') && !headers.includes('name')) errors.push('Cabeçalho precisa ter coluna nome.');
    if (!headers.includes('valor') && !headers.includes('amount')) errors.push('Cabeçalho precisa ter coluna valor.');
    if (!headers.includes('vencimento') && !headers.includes('due_date') && !headers.includes('dueDate')) errors.push('Cabeçalho precisa ter coluna vencimento.');

    for (let i = 1; i < lines.length; i++) {
      const values = this.splitLine(lines[i], separator);
      const row: any = {};
      headers.forEach((header, idx) => row[header] = values[idx] ?? '');
      rows.push(row);
    }

    return { headers, rows, errors };
  }

  private splitLine(line: string, separator: string) {
    const result: string[] = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        quoted = !quoted;
        continue;
      }
      if (char === separator && !quoted) {
        result.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    result.push(current.trim());
    return result;
  }

  private detectSeparator(header: string) {
    if (header.includes(';')) return ';';
    if (header.includes('\t')) return '\t';
    return ',';
  }

  private normalizeRow(row: any, line: number) {
    const name = row.nome || row.name || row.cliente || row.customer || '';
    const externalCustomerId = row.codigo || row.cod || row.id || row.external_customer_id || row.externalCustomerId || this.slugFromName(name, line);
    const amount = this.normalizeAmount(row.valor || row.amount || row.valor_cobranca || row.value);
    const dueDate = this.normalizeDate(row.vencimento || row.due_date || row.dueDate || row.data_vencimento);
    return {
      externalCustomerId,
      name,
      email: row.email || row.e_mail || '',
      phone: row.whatsapp || row.telefone || row.phone || row.celular || '',
      document: this.onlyDigits(row.documento || row.cpf || row.cnpj || ''),
      amount,
      dueDate,
      title: row.titulo || row.title || `Cobrança ${dueDate}`,
      description: row.descricao || row.description || row.observacao || 'Cobrança importada',
      recurring: String(row.recorrente || row.recurring || '').toLowerCase() === 'sim' || String(row.recorrente || row.recurring || '').toLowerCase() === 'true',
      dueDay: Number(row.dia_vencimento || row.due_day || 0) || null
    };
  }

  private async upsertCustomer(partnerId: string, row: any) {
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_billing_customers
      WHERE partner_id = ${partnerId} AND external_customer_id = ${row.externalCustomerId}
      LIMIT 1
    `;

    const metadata = JSON.stringify({ source: 'BULK_IMPORT', importedAt: new Date().toISOString() });

    if (existing.length) {
      const updated = await prisma.$queryRaw<any[]>`
        UPDATE smart_billing_customers
        SET name = ${row.name}, document = ${row.document || null}, email = ${row.email || null}, phone = ${row.phone || null}, metadata = COALESCE(metadata, '{}'::jsonb) || ${metadata}::jsonb, updated_at = now()
        WHERE id = ${existing[0].id}
        RETURNING *
      `;
      return updated[0];
    }

    const id = `sbc_${randomUUID().replace(/-/g, '')}`;
    const created = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_customers (id, partner_id, external_customer_id, name, document, email, phone, customer_type, status, metadata)
      VALUES (${id}, ${partnerId}, ${row.externalCustomerId}, ${row.name}, ${row.document || null}, ${row.email || null}, ${row.phone || null}, 'PF', 'ACTIVE', ${metadata}::jsonb)
      RETURNING *
    `;
    return created[0];
  }

  private async createCharge(partnerId: string, customer: any, row: any, source: string) {
    const id = `chg_${randomUUID().replace(/-/g, '')}`;
    const paymentLink = `https://nextgenassets.com.br/pagar/${id}`;
    const rawData = JSON.stringify({ product: 'receivables', source, importedAt: new Date().toISOString(), row });

    const created = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_billing_charges (
        id, partner_id, customer_id, title, description, amount_brl, due_date,
        charge_type, status, payment_method, payment_link, raw_data
      ) VALUES (
        ${id}, ${partnerId}, ${customer.id}, ${row.title}, ${row.description}, ${row.amount}::numeric,
        ${row.dueDate}::date, 'PIX', 'PENDING', 'PIX_LINK', ${paymentLink}, ${rawData}::jsonb
      ) RETURNING *
    `;

    return created[0];
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
  }

  private async getOrCreatePartner(slug: string, name?: string) {
    return prisma.partner.upsert({
      where: { slug },
      update: name ? { name } : {},
      create: { slug, name: name || this.titleFromSlug(slug), type: 'FINTECH' as any, config: {}, commissionRate: 0.03, tier: 'STARTER' as any } as any
    });
  }

  private key(value: string) {
    return String(value || '').trim().replace(/^\uFEFF/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s-]+/g, '_').toLowerCase();
  }

  private normalizeAmount(value: any) {
    const text = String(value || '').trim().replace('R$', '').replace(/\./g, '').replace(',', '.');
    const n = Number(text);
    if (!Number.isFinite(n) || n <= 0) return '';
    return n.toFixed(2);
  }

  private normalizeDate(value: any) {
    const text = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    return '';
  }

  private slugFromName(name: string, line: number) {
    const base = String(name || 'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    return `${base || 'cliente'}-${line}`;
  }

  private onlyDigits(value: any) {
    return String(value || '').replace(/\D/g, '') || null;
  }

  private toCamel(row: any) {
    if (!row) return row;
    const out: any = {};
    for (const [key, value] of Object.entries(row)) out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
    return out;
  }

  private titleFromSlug(slug: string) {
    return slug.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
}
