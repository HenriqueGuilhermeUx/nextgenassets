import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { MockAvDocumentProvider } from './providers/mock-av-document.provider';
import { MockProductLookupProvider } from './providers/mock-product-lookup.provider';
import { SmartOperationAction } from './smart-operations.types';

const prisma = new PrismaClient();

@Injectable()
export class SmartOperationsService {
  constructor(
    private readonly documentProvider: MockAvDocumentProvider,
    private readonly productProvider: MockProductLookupProvider
  ) {}

  async health() {
    await this.ensureTables();
    return {
      success: true,
      service: 'nextgen-smart-operations',
      product: 'NextGen Smart Operations',
      enabled: process.env.NEXTGEN_SMART_OPERATIONS_ENABLED !== 'false',
      providers: {
        document: process.env.AV_DOCUMENT_PROVIDER || this.documentProvider.name,
        productLookup: process.env.NEXTGEN_PRODUCT_PROVIDER || this.productProvider.name
      },
      principle: 'Documento recebido vira dado estruturado e sugestão de ação. Nada é executado sem confirmação humana.',
      routes: [
        'GET /v1/smart-operations/health',
        'GET /v1/smart-operations/templates',
        'POST /v1/smart-operations/inbox',
        'GET /v1/smart-operations/inbox?partnerSlug=nextgen-assets',
        'POST /v1/smart-operations/documents/:id/confirm-action',
        'GET /v1/smart-operations/products/lookup?code=789...',
        'POST /v1/smart-operations/products',
        'GET /v1/smart-operations/products?partnerSlug=nextgen-assets',
        'GET /v1/smart-operations/dashboard?partnerSlug=nextgen-assets',
        'POST /v1/smart-operations/ask'
      ]
    };
  }

  async templates() {
    return {
      success: true,
      templates: [
        {
          type: 'retail',
          label: 'Varejo / loja',
          fields: ['produto', 'EAN', 'fornecedor', 'custo', 'preço de venda', 'estoque mínimo'],
          actions: ['scan de produto', 'nota de compra', 'estoque', 'contas a pagar']
        },
        {
          type: 'services',
          label: 'Serviços recorrentes',
          fields: ['cliente', 'contrato', 'mensalidade', 'vencimento', 'centro de custo'],
          actions: ['despesas', 'comprovantes', 'contas a pagar', 'conciliação']
        },
        {
          type: 'clinic',
          label: 'Clínica / dentista',
          fields: ['paciente', 'tratamento', 'parcela', 'fornecedor', 'material'],
          actions: ['compras', 'despesas', 'estoque de material', 'recorrência']
        },
        {
          type: 'school',
          label: 'Escola / curso',
          fields: ['aluno', 'responsável', 'turma', 'mensalidade', 'fornecedor'],
          actions: ['recorrência', 'contas a pagar', 'recibos', 'prestação de contas']
        }
      ]
    };
  }

  async receiveDocument(body: any) {
    await this.ensureTables();
    this.assertEnabled();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets', body.partnerName);
    const tenantSlug = body.tenantSlug || body.partnerSlug || partner.slug;
    const contentHash = this.hash([body.documentText, body.documentUrl, body.barcode, body.fileName, body.externalId].filter(Boolean).join('|'));

    const duplicate = await this.findDuplicate(partner.id, tenantSlug, contentHash);
    const extracted = await this.documentProvider.extract({
      tenantSlug,
      documentType: body.documentType,
      fileName: body.fileName,
      mimeType: body.mimeType,
      documentUrl: body.documentUrl,
      documentText: body.documentText,
      barcode: body.barcode,
      rawData: body.rawData || body
    });

    const id = `doc_${randomUUID().replace(/-/g, '')}`;
    const status = duplicate ? 'DUPLICATE_REVIEW' : 'EXTRACTED_REVIEW';
    const rawData = this.sanitize({
      source: body.source || 'SMART_INBOX',
      externalId: body.externalId || null,
      duplicateOf: duplicate?.id || null,
      provider: extracted.rawData || {},
      input: {
        fileName: body.fileName || null,
        mimeType: body.mimeType || null,
        hasDocumentUrl: Boolean(body.documentUrl),
        hasDocumentText: Boolean(body.documentText),
        hasBarcode: Boolean(body.barcode)
      }
    });

    const created = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_ops_documents (
        id, partner_id, tenant_slug, source, document_type, status, file_name, mime_type,
        document_url, storage_key, external_hash, content_hash, extracted_data, suggested_actions,
        duplicate_of, raw_data, processed_at
      ) VALUES (
        ${id}, ${partner.id}, ${tenantSlug}, ${body.source || 'SMART_INBOX'}, ${extracted.documentType},
        ${status}, ${body.fileName || null}, ${body.mimeType || null}, ${body.documentUrl || null},
        ${body.storageKey || null}, ${body.externalId || null}, ${contentHash}, ${extracted}::jsonb,
        ${extracted.suggestedActions}::jsonb, ${duplicate?.id || null}, ${rawData}::jsonb, now()
      ) RETURNING *
    `;

    await this.recordEvent(partner.id, tenantSlug, 'document.received', id, { documentType: extracted.documentType, duplicate: Boolean(duplicate) });
    await this.recordEvent(partner.id, tenantSlug, 'purchase.extracted', id, { documentType: extracted.documentType, actions: extracted.suggestedActions });

    return {
      success: true,
      document: this.toCamel(created[0]),
      duplicate: duplicate ? this.toCamel(duplicate) : null,
      extracted,
      message: duplicate
        ? 'Possível documento duplicado. Revise antes de confirmar qualquer ação.'
        : 'Documento recebido, classificado e pronto para confirmação humana.'
    };
  }

  async inbox(partnerSlug = 'nextgen-assets', status?: string) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const rows = status
      ? await prisma.$queryRaw<any[]>`
          SELECT * FROM smart_ops_documents
          WHERE partner_id = ${partner.id} AND status = ${status}
          ORDER BY created_at DESC
          LIMIT 200
        `
      : await prisma.$queryRaw<any[]>`
          SELECT * FROM smart_ops_documents
          WHERE partner_id = ${partner.id}
          ORDER BY created_at DESC
          LIMIT 200
        `;
    return { success: true, partner: { id: partner.id, slug: partner.slug }, documents: rows.map((r) => this.toCamel(r)) };
  }

  async confirmAction(documentId: string, body: any) {
    await this.ensureTables();
    this.assertEnabled();
    if (!body.confirm) {
      return { success: false, error: 'CONFIRMATION_REQUIRED', message: 'Envie confirm=true para executar a ação.' };
    }

    const action = String(body.action || '').toUpperCase() as SmartOperationAction;
    if (!action) return { success: false, error: 'MISSING_ACTION', message: 'Informe a ação a confirmar.' };

    const docs = await prisma.$queryRaw<any[]>`SELECT * FROM smart_ops_documents WHERE id = ${documentId} LIMIT 1`;
    const doc = docs[0];
    if (!doc) return { success: false, error: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' };
    if (doc.duplicate_of && ['REGISTER_PURCHASE', 'UPDATE_INVENTORY', 'CREATE_EXPENSE', 'CREATE_ACCOUNT_PAYABLE'].includes(action)) {
      return { success: false, error: 'DUPLICATE_REVIEW_REQUIRED', message: 'Documento marcado como possível duplicado. Revise antes de lançar.' };
    }

    let result: any;
    if (action === 'REGISTER_PURCHASE') result = await this.registerPurchase(doc, body);
    else if (action === 'UPDATE_INVENTORY') result = await this.updateInventoryFromDocument(doc, body);
    else if (action === 'CREATE_EXPENSE') result = await this.createExpense(doc, body);
    else if (action === 'CREATE_ACCOUNT_PAYABLE') result = await this.createPayable(doc, body);
    else if (action === 'ARCHIVE_DOCUMENT') result = await this.archiveDocument(doc, body);
    else if (action === 'CREATE_PRODUCT') result = await this.createProduct({ ...body, partnerId: doc.partner_id, tenantSlug: doc.tenant_slug });
    else if (action === 'RECONCILE_DOCUMENT') result = await this.reconcileDocument(doc, body);
    else result = { success: false, error: 'UNSUPPORTED_ACTION', message: `Ação ainda não suportada: ${action}` };

    if (result?.success !== false) {
      await prisma.$executeRaw<any>`
        UPDATE smart_ops_documents
        SET status = ${action === 'ARCHIVE_DOCUMENT' ? 'ARCHIVED' : 'ACTION_CONFIRMED'}, updated_at = now()
        WHERE id = ${documentId}
      `;
      await this.recordEvent(doc.partner_id, doc.tenant_slug, this.eventForAction(action), documentId, { action, result });
    }

    return { success: result?.success !== false, action, result };
  }

  async lookupProduct(code: string) {
    await this.ensureTables();
    const result = await this.productProvider.lookupByCode(code);
    return { success: true, product: result };
  }

  async createProduct(body: any) {
    await this.ensureTables();
    this.assertEnabled();
    const partner = body.partnerId ? { id: body.partnerId, slug: body.tenantSlug || body.partnerSlug || 'nextgen-assets', name: body.partnerName || '' } : await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets', body.partnerName);
    const tenantSlug = body.tenantSlug || body.partnerSlug || partner.slug;
    const id = `prd_${randomUUID().replace(/-/g, '')}`;
    const ean = this.onlyDigits(body.ean || body.code || body.codigoBarras) || null;
    const existing = ean
      ? await prisma.$queryRaw<any[]>`SELECT * FROM smart_ops_products WHERE partner_id = ${partner.id} AND ean = ${ean} LIMIT 1`
      : [];

    if (existing.length) {
      const updated = await prisma.$queryRaw<any[]>`
        UPDATE smart_ops_products
        SET name = ${body.name || body.nome || existing[0].name},
            brand = ${body.brand || body.marca || existing[0].brand},
            category = ${body.category || body.categoria || existing[0].category},
            packaging = ${body.packaging || body.embalagem || existing[0].packaging},
            weight = ${body.weight || body.peso || existing[0].weight},
            cost_price = COALESCE(${this.numberOrNull(body.costPrice || body.precoCusto)}::numeric, cost_price),
            sale_price = COALESCE(${this.numberOrNull(body.salePrice || body.precoVenda)}::numeric, sale_price),
            stock_quantity = COALESCE(${this.numberOrNull(body.initialStock || body.estoqueInicial)}::numeric, stock_quantity),
            min_stock = COALESCE(${this.numberOrNull(body.minStock || body.estoqueMinimo)}::numeric, min_stock),
            raw_data = raw_data || ${this.sanitize(body)}::jsonb,
            updated_at = now()
        WHERE id = ${existing[0].id}
        RETURNING *
      `;
      await this.recordEvent(partner.id, tenantSlug, 'product.created', updated[0].id, { action: 'updated', ean });
      return { success: true, action: 'updated', product: this.toCamel(updated[0]) };
    }

    const created = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_ops_products (
        id, partner_id, tenant_slug, ean, sku, name, brand, category, packaging, weight,
        image_url, cost_price, sale_price, stock_quantity, min_stock, raw_data
      ) VALUES (
        ${id}, ${partner.id}, ${tenantSlug}, ${ean}, ${body.sku || null}, ${body.name || body.nome || 'Produto sem nome'},
        ${body.brand || body.marca || null}, ${body.category || body.categoria || null},
        ${body.packaging || body.embalagem || null}, ${body.weight || body.peso || null}, ${body.imageUrl || null},
        ${this.numberOrNull(body.costPrice || body.precoCusto)}::numeric,
        ${this.numberOrNull(body.salePrice || body.precoVenda)}::numeric,
        ${this.numberOrNull(body.initialStock || body.estoqueInicial) || 0}::numeric,
        ${this.numberOrNull(body.minStock || body.estoqueMinimo) || 0}::numeric,
        ${this.sanitize(body)}::jsonb
      ) RETURNING *
    `;

    await this.recordEvent(partner.id, tenantSlug, 'product.created', created[0].id, { action: 'created', ean });
    return { success: true, action: 'created', product: this.toCamel(created[0]) };
  }

  async products(partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_ops_products
      WHERE partner_id = ${partner.id}
      ORDER BY updated_at DESC
      LIMIT 300
    `;
    return { success: true, products: rows.map((r) => this.toCamel(r)) };
  }

  async dashboard(partnerSlug = 'nextgen-assets') {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(partnerSlug);
    const docs = await prisma.$queryRaw<any[]>`
      SELECT status, document_type, COUNT(*)::int AS count
      FROM smart_ops_documents
      WHERE partner_id = ${partner.id}
      GROUP BY status, document_type
    `;
    const totals = await prisma.$queryRaw<any[]>`
      SELECT
        (SELECT COUNT(*)::int FROM smart_ops_products WHERE partner_id = ${partner.id}) AS products,
        (SELECT COUNT(*)::int FROM smart_ops_purchases WHERE partner_id = ${partner.id}) AS purchases,
        (SELECT COUNT(*)::int FROM smart_ops_expenses WHERE partner_id = ${partner.id}) AS expenses,
        (SELECT COUNT(*)::int FROM smart_ops_accounts_payable WHERE partner_id = ${partner.id} AND status IN ('OPEN','SCHEDULED')) AS open_payables,
        (SELECT COUNT(*)::int FROM smart_ops_events WHERE partner_id = ${partner.id}) AS events
    `;
    return { success: true, partner: { id: partner.id, slug: partner.slug }, totals: this.toCamel(totals[0]), documents: docs.map((r) => this.toCamel(r)) };
  }

  async ask(body: any) {
    await this.ensureTables();
    const partner = await this.getOrCreatePartner(body.partnerSlug || 'nextgen-assets');
    const question = String(body.question || '').toLowerCase();

    if (question.includes('fornecedor') || question.includes('compramos')) {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT supplier_name, COUNT(*)::int AS purchases, COALESCE(SUM(total_amount),0)::text AS total
        FROM smart_ops_purchases
        WHERE partner_id = ${partner.id}
          AND created_at >= date_trunc('month', now())
        GROUP BY supplier_name
        ORDER BY SUM(total_amount) DESC
        LIMIT 20
      `;
      return { success: true, question: body.question, answerType: 'supplier_month_purchases', rows: rows.map((r) => this.toCamel(r)) };
    }

    if (question.includes('não foram pagas') || question.includes('nao foram pagas') || question.includes('pagar')) {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT * FROM smart_ops_accounts_payable
        WHERE partner_id = ${partner.id} AND status IN ('OPEN','SCHEDULED')
        ORDER BY due_date ASC NULLS LAST
        LIMIT 50
      `;
      return { success: true, question: body.question, answerType: 'open_payables', rows: rows.map((r) => this.toCamel(r)) };
    }

    if (question.includes('duplicad')) {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT id, document_type, status, duplicate_of, file_name, created_at
        FROM smart_ops_documents
        WHERE partner_id = ${partner.id} AND duplicate_of IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 50
      `;
      return { success: true, question: body.question, answerType: 'duplicates', rows: rows.map((r) => this.toCamel(r)) };
    }

    return { success: true, question: body.question, answerType: 'not_ready', message: 'Pergunta recebida. MVP responde fornecedores do mês, contas abertas e duplicidades.' };
  }

  private async registerPurchase(doc: any, body: any) {
    const data = doc.extracted_data || {};
    const id = `pur_${randomUUID().replace(/-/g, '')}`;
    const purchase = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_ops_purchases (
        id, partner_id, tenant_slug, document_id, supplier_name, supplier_cnpj, invoice_number,
        invoice_date, total_amount, payment_method, status, raw_data
      ) VALUES (
        ${id}, ${doc.partner_id}, ${doc.tenant_slug}, ${doc.id}, ${data.supplier?.name || body.supplierName || null},
        ${data.supplier?.cnpj || body.supplierCnpj || null}, ${data.number || body.invoiceNumber || null},
        ${data.date || body.invoiceDate || null}::date, ${this.numberOrNull(data.total || body.totalAmount) || 0}::numeric,
        ${data.paymentMethod || body.paymentMethod || null}, 'CONFIRMED', ${this.sanitize({ extracted: data, confirmation: body })}::jsonb
      ) RETURNING *
    `;

    for (const item of data.items || []) {
      await prisma.$executeRaw`
        INSERT INTO smart_ops_purchase_items (
          id, partner_id, tenant_slug, purchase_id, product_id, ean, sku, name, quantity, unit_price, discount, taxes, total
        ) VALUES (
          ${`pit_${randomUUID().replace(/-/g, '')}`}, ${doc.partner_id}, ${doc.tenant_slug}, ${id}, null,
          ${item.ean || null}, ${item.sku || null}, ${item.name || 'Item'}, ${item.quantity || 1}::numeric,
          ${item.unitPrice || 0}::numeric, ${item.discount || 0}::numeric, ${item.taxes || 0}::numeric, ${item.total || 0}::numeric
        )
      `;
    }

    return { purchase: this.toCamel(purchase[0]) };
  }

  private async updateInventoryFromDocument(doc: any, body: any) {
    const data = doc.extracted_data || {};
    const movementGroup = doc.id;
    const already = await prisma.$queryRaw<any[]>`
      SELECT id FROM smart_ops_inventory_movements
      WHERE partner_id = ${doc.partner_id} AND source_document_id = ${doc.id} AND movement_group = ${movementGroup}
      LIMIT 1
    `;
    if (already.length) return { success: false, error: 'INVENTORY_ALREADY_UPDATED', message: 'Estoque já atualizado para este documento.' };

    const movements: any[] = [];
    for (const item of data.items || []) {
      let product = null;
      if (item.ean) {
        const existing = await prisma.$queryRaw<any[]>`SELECT * FROM smart_ops_products WHERE partner_id = ${doc.partner_id} AND ean = ${item.ean} LIMIT 1`;
        product = existing[0];
        if (!product) {
          const created = await this.createProduct({
            partnerId: doc.partner_id,
            tenantSlug: doc.tenant_slug,
            ean: item.ean,
            name: item.name,
            costPrice: item.unitPrice,
            salePrice: item.unitPrice,
            initialStock: 0,
            source: 'purchase-document'
          });
          product = created.product;
        }
      }

      const movement = await prisma.$queryRaw<any[]>`
        INSERT INTO smart_ops_inventory_movements (
          id, partner_id, tenant_slug, product_id, movement_type, quantity, unit_cost,
          source_document_id, movement_group, raw_data
        ) VALUES (
          ${`mov_${randomUUID().replace(/-/g, '')}`}, ${doc.partner_id}, ${doc.tenant_slug}, ${product?.id || null},
          'PURCHASE_IN', ${item.quantity || 1}::numeric, ${item.unitPrice || 0}::numeric,
          ${doc.id}, ${movementGroup}, ${this.sanitize({ item, confirmation: body })}::jsonb
        ) RETURNING *
      `;
      movements.push(this.toCamel(movement[0]));

      if (product?.id) {
        await prisma.$executeRaw`
          UPDATE smart_ops_products
          SET stock_quantity = COALESCE(stock_quantity, 0) + ${item.quantity || 1}::numeric,
              cost_price = ${item.unitPrice || 0}::numeric,
              updated_at = now()
          WHERE id = ${product.id}
        `;
      }
    }

    return { movements };
  }

  private async createExpense(doc: any, body: any) {
    const data = doc.extracted_data || {};
    const id = `exp_${randomUUID().replace(/-/g, '')}`;
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_ops_expenses (
        id, partner_id, tenant_slug, document_id, supplier_name, description, amount, expense_date,
        category, cost_center, payment_method, status, raw_data
      ) VALUES (
        ${id}, ${doc.partner_id}, ${doc.tenant_slug}, ${doc.id}, ${data.supplier?.name || body.supplierName || null},
        ${body.description || data.description || 'Despesa identificada'}, ${this.numberOrNull(data.total || body.amount) || 0}::numeric,
        ${data.date || body.date || null}::date, ${body.category || data.category || null}, ${body.costCenter || null},
        ${data.paymentMethod || body.paymentMethod || null}, 'CREATED', ${this.sanitize({ extracted: data, confirmation: body })}::jsonb
      ) RETURNING *
    `;
    return { expense: this.toCamel(rows[0]) };
  }

  private async createPayable(doc: any, body: any) {
    const data = doc.extracted_data || {};
    const dueDate = body.dueDate || data.dueDates?.[0] || data.date || null;
    const id = `pay_${randomUUID().replace(/-/g, '')}`;
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_ops_accounts_payable (
        id, partner_id, tenant_slug, document_id, supplier_name, description, amount, due_date,
        status, barcode, payment_method, raw_data
      ) VALUES (
        ${id}, ${doc.partner_id}, ${doc.tenant_slug}, ${doc.id}, ${data.supplier?.name || body.supplierName || null},
        ${body.description || data.description || 'Conta a pagar'}, ${this.numberOrNull(data.total || body.amount) || 0}::numeric,
        ${dueDate}::date, 'OPEN', ${data.barcode || body.barcode || null}, ${data.paymentMethod || body.paymentMethod || null},
        ${this.sanitize({ extracted: data, confirmation: body })}::jsonb
      ) RETURNING *
    `;
    return { payable: this.toCamel(rows[0]) };
  }

  private async archiveDocument(doc: any, body: any) {
    return { documentId: doc.id, archived: true, note: body.note || null };
  }

  private async reconcileDocument(doc: any, body: any) {
    const id = `rec_${randomUUID().replace(/-/g, '')}`;
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO smart_ops_reconciliations (
        id, partner_id, tenant_slug, document_id, purchase_id, payable_id, payment_ref, status, raw_data
      ) VALUES (
        ${id}, ${doc.partner_id}, ${doc.tenant_slug}, ${doc.id}, ${body.purchaseId || null}, ${body.payableId || null},
        ${body.paymentRef || body.endToEndId || null}, 'LINKED', ${this.sanitize(body)}::jsonb
      ) RETURNING *
    `;
    return { reconciliation: this.toCamel(rows[0]) };
  }

  private eventForAction(action: SmartOperationAction) {
    const map: Record<string, string> = {
      REGISTER_PURCHASE: 'purchase.confirmed',
      UPDATE_INVENTORY: 'inventory.updated',
      CREATE_SUPPLIER: 'supplier.created',
      CREATE_ACCOUNT_PAYABLE: 'payable.created',
      CREATE_EXPENSE: 'expense.created',
      ARCHIVE_DOCUMENT: 'document.archived',
      CREATE_PRODUCT: 'product.created',
      RECONCILE_DOCUMENT: 'document.reconciled'
    };
    return map[action] || 'smart_operation.confirmed';
  }

  private async recordEvent(partnerId: string, tenantSlug: string, eventType: string, entityId: string, payload: any) {
    await prisma.$executeRaw`
      INSERT INTO smart_ops_events (id, partner_id, tenant_slug, event_type, entity_id, payload)
      VALUES (${`evt_${randomUUID().replace(/-/g, '')}`}, ${partnerId}, ${tenantSlug}, ${eventType}, ${entityId}, ${this.sanitize(payload)}::jsonb)
    `;
  }

  private async findDuplicate(partnerId: string, tenantSlug: string, contentHash: string) {
    if (!contentHash) return null;
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_ops_documents
      WHERE partner_id = ${partnerId} AND tenant_slug = ${tenantSlug} AND content_hash = ${contentHash}
      ORDER BY created_at ASC
      LIMIT 1
    `;
    return rows[0] || null;
  }

  private assertEnabled() {
    if (process.env.NEXTGEN_SMART_OPERATIONS_ENABLED === 'false') {
      throw new Error('NEXTGEN_SMART_OPERATIONS_DISABLED');
    }
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
        commissionRate: 0,
        tier: 'STARTER' as any
      } as any
    });
  }

  async ensureTables() {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_ops_documents (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        tenant_slug text NOT NULL,
        source text NOT NULL DEFAULT 'SMART_INBOX',
        document_type text NOT NULL DEFAULT 'UNKNOWN',
        status text NOT NULL DEFAULT 'RECEIVED',
        file_name text,
        mime_type text,
        document_url text,
        storage_key text,
        external_hash text,
        content_hash text,
        extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        suggested_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
        duplicate_of text,
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        received_at timestamptz NOT NULL DEFAULT now(),
        processed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_ops_products (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        tenant_slug text NOT NULL,
        ean text,
        sku text,
        name text NOT NULL,
        brand text,
        category text,
        packaging text,
        weight text,
        image_url text,
        cost_price numeric(18,2),
        sale_price numeric(18,2),
        stock_quantity numeric(18,3) NOT NULL DEFAULT 0,
        min_stock numeric(18,3) NOT NULL DEFAULT 0,
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_ops_purchases (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        tenant_slug text NOT NULL,
        document_id text,
        supplier_name text,
        supplier_cnpj text,
        invoice_number text,
        invoice_date date,
        total_amount numeric(18,2) NOT NULL DEFAULT 0,
        payment_method text,
        status text NOT NULL DEFAULT 'DRAFT',
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_ops_purchase_items (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        tenant_slug text NOT NULL,
        purchase_id text NOT NULL,
        product_id text,
        ean text,
        sku text,
        name text NOT NULL,
        quantity numeric(18,3) NOT NULL DEFAULT 1,
        unit_price numeric(18,2) NOT NULL DEFAULT 0,
        discount numeric(18,2) NOT NULL DEFAULT 0,
        taxes numeric(18,2) NOT NULL DEFAULT 0,
        total numeric(18,2) NOT NULL DEFAULT 0,
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_ops_expenses (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        tenant_slug text NOT NULL,
        document_id text,
        supplier_name text,
        description text NOT NULL,
        amount numeric(18,2) NOT NULL DEFAULT 0,
        expense_date date,
        category text,
        cost_center text,
        payment_method text,
        status text NOT NULL DEFAULT 'CREATED',
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_ops_accounts_payable (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        tenant_slug text NOT NULL,
        document_id text,
        supplier_name text,
        description text NOT NULL,
        amount numeric(18,2) NOT NULL DEFAULT 0,
        due_date date,
        status text NOT NULL DEFAULT 'OPEN',
        barcode text,
        payment_method text,
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_ops_inventory_movements (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        tenant_slug text NOT NULL,
        product_id text,
        movement_type text NOT NULL,
        quantity numeric(18,3) NOT NULL DEFAULT 0,
        unit_cost numeric(18,2),
        source_document_id text,
        movement_group text,
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_ops_reconciliations (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        tenant_slug text NOT NULL,
        document_id text,
        purchase_id text,
        payable_id text,
        payment_ref text,
        status text NOT NULL DEFAULT 'LINKED',
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_ops_expense_reports (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        tenant_slug text NOT NULL,
        employee_name text,
        project text,
        cost_center text,
        status text NOT NULL DEFAULT 'DRAFT',
        total_amount numeric(18,2) NOT NULL DEFAULT 0,
        raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS smart_ops_events (
        id text PRIMARY KEY,
        partner_id text NOT NULL,
        tenant_slug text NOT NULL,
        event_type text NOT NULL,
        entity_id text,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_so_docs_partner_status ON smart_ops_documents(partner_id, status)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_so_docs_hash ON smart_ops_documents(partner_id, tenant_slug, content_hash)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_so_products_partner_ean ON smart_ops_products(partner_id, ean)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_so_payables_partner_due ON smart_ops_accounts_payable(partner_id, status, due_date)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_so_events_partner_type ON smart_ops_events(partner_id, event_type, created_at)`);
  }

  private sanitize(value: any) {
    const text = JSON.stringify(value || {});
    return JSON.parse(text, (_key, val) => {
      if (typeof val !== 'string') return val;
      if (val.length > 1200) return `${val.slice(0, 1200)}...[truncated]`;
      return val;
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

  private titleFromSlug(slug: string) {
    return slug.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  private hash(value: string) {
    return createHash('sha256').update(value || randomUUID()).digest('hex');
  }

  private onlyDigits(value?: string) {
    return String(value || '').replace(/\D/g, '') || null;
  }

  private numberOrNull(value: any) {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
}
