-- Isolated staging D+1 guard. Never apply to production without an audit.
-- Do not infer settled funds or fee reconciliation from an OF Pix "aceito".
BEGIN;

ALTER TABLE ng_efi_central_receipts
 ADD COLUMN IF NOT EXISTS statement_report_id text,
 ADD COLUMN IF NOT EXISTS statement_evidence_sha256 text,
 ADD COLUMN IF NOT EXISTS statement_verified_at timestamptz,
 ADD COLUMN IF NOT EXISTS provider_fee_verified_at timestamptz,
 ADD COLUMN IF NOT EXISTS account_ownership_verified_at timestamptz,
 ADD COLUMN IF NOT EXISTS refund_checked_at timestamptz,
 ADD COLUMN IF NOT EXISTS compliance_cleared_at timestamptz,
 ADD COLUMN IF NOT EXISTS compliance_evidence_sha256 text;

DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint
   WHERE conname='ng_efi_reconciliation_evidence_required'
     AND conrelid='public.ng_efi_central_receipts'::regclass
 ) THEN
   ALTER TABLE ng_efi_central_receipts
     ADD CONSTRAINT ng_efi_reconciliation_evidence_required CHECK (
       reconciliation_status <> 'RECONCILED' OR (
         coalesce(statement_report_id ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$', false)
         AND coalesce(statement_evidence_sha256 ~ '^[a-f0-9]{64}$', false)
         AND statement_verified_at IS NOT NULL
         AND provider_fee_verified_at IS NOT NULL
         AND account_ownership_verified_at IS NOT NULL
         AND refund_checked_at IS NOT NULL
         AND reconciliation_verified_at IS NOT NULL
         AND reconciled_reference IS NOT NULL
         AND length(btrim(reconciled_reference)) >= 12
       )
     );
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint
   WHERE conname='ng_efi_compliance_release_evidence_required'
     AND conrelid='public.ng_efi_central_receipts'::regclass
 ) THEN
   ALTER TABLE ng_efi_central_receipts
     ADD CONSTRAINT ng_efi_compliance_release_evidence_required CHECK (
       reconciliation_status <> 'RECONCILED' OR compliance_hold = true OR (
         compliance_cleared_at IS NOT NULL
         AND coalesce(compliance_evidence_sha256 ~ '^[a-f0-9]{64}$', false)
       )
     );
 END IF;
END $$;

COMMIT;
