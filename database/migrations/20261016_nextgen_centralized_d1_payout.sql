-- NextGen Pix Automático — centralized incoming receipt and D+1 payout ledger.
-- Draft staging migration; must NOT be applied in production until Efí bank
-- receipt confirmation and payout execution adapters are homologated.
-- Intentionally does not touch legacy Woovi payout schedules.
BEGIN;

CREATE TABLE IF NOT EXISTS ng_efi_central_receipts (
  id text PRIMARY KEY,
  partner_id text NOT NULL,
  cycle_id text NOT NULL,
  -- Incoming Pix to verified NextGen Efí bank account (never authorization/issuance id).
  incoming_e2e_id text NOT NULL UNIQUE,
  bank_account_fingerprint text NOT NULL,
  bank_settled_at timestamptz NOT NULL,
  bank_verified_at timestamptz NOT NULL,
  reconciliation_verified_at timestamptz,
  gross_amount_cents bigint NOT NULL CHECK(gross_amount_cents > 0),
  provider_fee_cents bigint NOT NULL DEFAULT 0 CHECK(provider_fee_cents >= 0),
  retained_fee_cents bigint NOT NULL DEFAULT 0 CHECK(retained_fee_cents >= 0),
  net_amount_cents bigint GENERATED ALWAYS AS
    (gross_amount_cents - provider_fee_cents - retained_fee_cents) STORED,
  -- Payout cannot be scheduled without independent bank confirmation AND reconciliation.
  reconciliation_status text NOT NULL DEFAULT 'BANK_RECEIVED',
  compliance_hold boolean NOT NULL DEFAULT false,
  bank_evidence_ref text NOT NULL,
  reconciled_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ng_efi_central_receipts_net_positive
    CHECK(gross_amount_cents > provider_fee_cents + retained_fee_cents),
  CONSTRAINT ng_efi_central_receipts_status_check
    CHECK(reconciliation_status IN ('BANK_RECEIVED','RECONCILED','HELD','DISPUTED')),
  CONSTRAINT ng_efi_receipts_cycle_tenant_fk FOREIGN KEY(cycle_id,partner_id)
    REFERENCES ng_efi_auto_cycles(id,partner_id),
  CONSTRAINT ng_efi_receipts_id_partner_unique UNIQUE(id,partner_id)
);

CREATE INDEX IF NOT EXISTS ng_efi_central_receipts_partner_status
  ON ng_efi_central_receipts(partner_id,reconciliation_status,bank_settled_at);

CREATE TABLE IF NOT EXISTS ng_efi_central_payouts (
  id text PRIMARY KEY,
  partner_id text NOT NULL,
  receipt_id text NOT NULL UNIQUE,
  -- Date calculated by a validated BR banking holiday calendar (São Paulo timezone).
  base_business_date date NOT NULL,
  scheduled_business_date date NOT NULL,
  calendar_source text NOT NULL,
  calendar_version text NOT NULL,
  amount_cents bigint NOT NULL CHECK(amount_cents > 0),
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'SCHEDULED',
  attempted_at timestamptz,
  bank_transfer_e2e_id text UNIQUE,
  bank_verified_at timestamptz,
  credited_at timestamptz,
  bank_transfer_evidence_ref text,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ng_efi_central_payout_status_check CHECK(
    status IN ('SCHEDULED','HELD','SUBMITTING','BANK_ACCEPTED','BANK_CONFIRMED','FAILED','REVIEW')
  ),
  CONSTRAINT ng_efi_central_payout_no_early_bank_confirm CHECK (
    status <> 'BANK_CONFIRMED'
    OR (bank_transfer_e2e_id IS NOT NULL AND bank_verified_at IS NOT NULL
        AND bank_transfer_evidence_ref IS NOT NULL AND credited_at IS NOT NULL)
  ),
  CONSTRAINT ng_efi_central_payout_business_date_check
    CHECK(scheduled_business_date > base_business_date),
  CONSTRAINT ng_efi_payout_receipt_tenant_fk FOREIGN KEY(receipt_id,partner_id)
    REFERENCES ng_efi_central_receipts(id,partner_id)
);

CREATE INDEX IF NOT EXISTS ng_efi_central_payouts_partner_due
  ON ng_efi_central_payouts(partner_id,status,scheduled_business_date);

CREATE TABLE IF NOT EXISTS ng_efi_central_payout_events (
  id text PRIMARY KEY,
  payout_id text NOT NULL REFERENCES ng_efi_central_payouts(id),
  event_type text NOT NULL,
  bank_reference_hash text,
  metadata_redacted jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Server-only access, do not expose direct database CRUD to web/PWA/mobile.
REVOKE ALL ON TABLE ng_efi_central_receipts, ng_efi_central_payouts,
  ng_efi_central_payout_events FROM PUBLIC;

COMMIT;
