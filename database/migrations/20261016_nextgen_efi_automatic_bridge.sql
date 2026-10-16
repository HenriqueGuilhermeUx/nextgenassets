-- NextGen recurring payments -> Efí Open Finance Pix Automático bridge.
-- Offline schema only. NO callbacks, debits or changes to existing billing tables.
-- Apply in staging before enabling NEXTGEN_EFI_AUTOMATIC_ENABLED.
BEGIN;

CREATE TABLE IF NOT EXISTS ng_efi_auto_authorizations (
  id text PRIMARY KEY,
  partner_id text NOT NULL,
  recurrence_id text NOT NULL,
  customer_id text NOT NULL,
  provider text NOT NULL DEFAULT 'EFI_OF',
  provider_adhesion_id text,
  redirect_uri text,
  requested_at timestamptz,
  consented_first_due_on date,
  consented_expires_on date,
  consented_interval text,
  status text NOT NULL DEFAULT 'DRAFT',
  amount_cap_cents bigint NOT NULL CHECK (amount_cap_cents > 0),
  retry_allowed boolean NOT NULL DEFAULT false,
  beneficiary_fingerprint text,
  verified_at timestamptz,
  provider_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ng_efi_auto_auth_status_check CHECK (
    status IN ('DRAFT','REQUESTING','AUTHORIZATION_PENDING','AUTHORIZED','REJECTED','REVOKED','EXPIRED','SUSPENDED','PROVIDER_ERROR')
  ),
  CONSTRAINT ng_efi_auto_auth_provider_unique UNIQUE (partner_id, provider_adhesion_id),
  CONSTRAINT ng_efi_auto_auth_recurrence_unique UNIQUE (partner_id, recurrence_id)
);

CREATE INDEX IF NOT EXISTS idx_ng_efi_authorizations_partner_status
  ON ng_efi_auto_authorizations(partner_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS ng_efi_auto_cycles (
  id text PRIMARY KEY,
  partner_id text NOT NULL,
  recurrence_id text NOT NULL,
  authorization_id text NOT NULL REFERENCES ng_efi_auto_authorizations(id),
  due_date date NOT NULL,
  amount_cents bigint NOT NULL CHECK(amount_cents > 0),
  state text NOT NULL DEFAULT 'PLANNED',
  idempotency_key text NOT NULL,
  charge_id text,
  payment_reference text,
  settlement_reference text,
  attempted_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ng_efi_auto_cycles_state_check CHECK (
    state IN ('PLANNED','ELIGIBLE','SUBMITTING','SCHEDULED','SETTLED','FAILED','CANCELLED','REVIEW')
  ),
  CONSTRAINT ng_efi_auto_cycle_unique UNIQUE (partner_id,recurrence_id,due_date),
  CONSTRAINT ng_efi_auto_cycle_idem_unique UNIQUE (idempotency_key),
  CONSTRAINT ng_efi_auto_cycles_id_partner_unique UNIQUE(id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_ng_efi_cycles_partner_state
  ON ng_efi_auto_cycles(partner_id,state,due_date);

CREATE TABLE IF NOT EXISTS ng_efi_auto_attempts (
  id text PRIMARY KEY,
  cycle_id text NOT NULL REFERENCES ng_efi_auto_cycles(id),
  attempt_no integer NOT NULL CHECK (attempt_no >= 1 AND attempt_no <= 4),
  idempotency_key text NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'PLANNED',
  provider_reference text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ng_efi_auto_attempt_unique UNIQUE(cycle_id,attempt_no)
);

CREATE TABLE IF NOT EXISTS ng_efi_auto_audit (
  id text PRIMARY KEY,
  partner_id text NOT NULL,
  recurrence_id text,
  entity_id text NOT NULL,
  event_type text NOT NULL,
  actor_type text NOT NULL,
  metadata_redacted jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ng_efi_audit_partner_date
  ON ng_efi_auto_audit(partner_id,created_at DESC);

CREATE TABLE IF NOT EXISTS ng_efi_auto_provider_events (
  id text PRIMARY KEY,
  event_source text NOT NULL,
  provider_event_id text NOT NULL,
  signature_verified_at timestamptz,
  processed_at timestamptz,
  event_type text NOT NULL,
  state text NOT NULL DEFAULT 'RECEIVED',
  metadata_redacted jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ng_efi_auto_provider_event_unique UNIQUE(event_source,provider_event_id)
);

-- Defensive default: no privileges to PUBLIC.
REVOKE ALL ON TABLE ng_efi_auto_authorizations, ng_efi_auto_cycles,
  ng_efi_auto_attempts, ng_efi_auto_audit, ng_efi_auto_provider_events FROM PUBLIC;
-- IMPORTANT: Do not enable unrestricted client access through database roles.
-- Access to these tables is intended through authenticated server-only APIs.

COMMIT;
