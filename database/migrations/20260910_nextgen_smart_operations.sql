-- =====================================================
-- NextGen Smart Operations
-- Documents -> structured data -> confirmed operational actions
-- Safe to run multiple times.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
);

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
);

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
);

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
);

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
);

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
);

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
);

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
);

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
);

CREATE TABLE IF NOT EXISTS smart_ops_events (
  id text PRIMARY KEY,
  partner_id text NOT NULL,
  tenant_slug text NOT NULL,
  event_type text NOT NULL,
  entity_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_so_docs_partner_status ON smart_ops_documents(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_so_docs_hash ON smart_ops_documents(partner_id, tenant_slug, content_hash);
CREATE INDEX IF NOT EXISTS idx_so_products_partner_ean ON smart_ops_products(partner_id, ean);
CREATE INDEX IF NOT EXISTS idx_so_payables_partner_due ON smart_ops_accounts_payable(partner_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_so_events_partner_type ON smart_ops_events(partner_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_so_inventory_document_group ON smart_ops_inventory_movements(partner_id, source_document_id, movement_group);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_so_products_partner_ean_not_null ON smart_ops_products(partner_id, ean) WHERE ean IS NOT NULL;
