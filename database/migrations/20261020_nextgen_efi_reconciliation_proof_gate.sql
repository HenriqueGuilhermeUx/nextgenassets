-- Isolated staging guard: a status change to RECONCILED must reference a
-- completed Efí reconciliation report, account ownership, fees and refunds.
-- NO settlement, status update, bank call or D+1 activation occurs here.
-- Production migration requires an existing-data audit and deliberate approval.
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
   SELECT 1 FROM pg_constraint WHERE conname='ng_efi_reconciliation_evidence_required'
     AND conrelid='public.ng_efi_central_receipts'::regclass
 ) THEN
   ALTER TABLE ng_efi_central_receipts
     ADD CONSTRAINT ng_efi_reconciliation_evidence_required CHECK (
       reconciliation_status <> 'RECONCILED' OR (
         coalesce(statement_report_id ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}
         AND coalesce(statement_evidence_sha256 ~ '^[a-f0-9]{64}
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
   SELECT 1 FROM pg_constraint WHERE conname='ng_efi_compliance_release_evidence_required'
     AND conrelid='public.ng_efi_central_receipts'::regclass
 ) THEN
   ALTER TABLE ng_efi_central_receipts
     ADD CONSTRAINT ng_efi_compliance_release_evidence_required CHECK (
       reconciliation_status <> 'RECONCILED' OR compliance_hold = true OR (
         compliance_cleared_at IS NOT NULL AND
         coalesce(compliance_evidence_sha256 ~ '^[a-f0-9]{64}
       )
     );
 END IF;
END $$;

COMMIT;
, false)
         AND statement_evidence_sha256 ~ '^[a-f0-9]{64}$'
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
   SELECT 1 FROM pg_constraint WHERE conname='ng_efi_compliance_release_evidence_required'
     AND conrelid='public.ng_efi_central_receipts'::regclass
 ) THEN
   ALTER TABLE ng_efi_central_receipts
     ADD CONSTRAINT ng_efi_compliance_release_evidence_required CHECK (
       reconciliation_status <> 'RECONCILED' OR compliance_hold = true OR (
         compliance_cleared_at IS NOT NULL AND
         compliance_evidence_sha256 ~ '^[a-f0-9]{64}$'
       )
     );
 END IF;
END $$;

COMMIT;
, false)
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
   SELECT 1 FROM pg_constraint WHERE conname='ng_efi_compliance_release_evidence_required'
     AND conrelid='public.ng_efi_central_receipts'::regclass
 ) THEN
   ALTER TABLE ng_efi_central_receipts
     ADD CONSTRAINT ng_efi_compliance_release_evidence_required CHECK (
       reconciliation_status <> 'RECONCILED' OR compliance_hold = true OR (
         compliance_cleared_at IS NOT NULL AND
         compliance_evidence_sha256 ~ '^[a-f0-9]{64}$'
       )
     );
 END IF;
END $$;

COMMIT;
, false)
         AND statement_evidence_sha256 ~ '^[a-f0-9]{64}$'
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
   SELECT 1 FROM pg_constraint WHERE conname='ng_efi_compliance_release_evidence_required'
     AND conrelid='public.ng_efi_central_receipts'::regclass
 ) THEN
   ALTER TABLE ng_efi_central_receipts
     ADD CONSTRAINT ng_efi_compliance_release_evidence_required CHECK (
       reconciliation_status <> 'RECONCILED' OR compliance_hold = true OR (
         compliance_cleared_at IS NOT NULL AND
         compliance_evidence_sha256 ~ '^[a-f0-9]{64}$'
       )
     );
 END IF;
END $$;

COMMIT;
, false)
       )
     );
 END IF;
END $$;

COMMIT;
, false)
         AND statement_evidence_sha256 ~ '^[a-f0-9]{64}$'
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
   SELECT 1 FROM pg_constraint WHERE conname='ng_efi_compliance_release_evidence_required'
     AND conrelid='public.ng_efi_central_receipts'::regclass
 ) THEN
   ALTER TABLE ng_efi_central_receipts
     ADD CONSTRAINT ng_efi_compliance_release_evidence_required CHECK (
       reconciliation_status <> 'RECONCILED' OR compliance_hold = true OR (
         compliance_cleared_at IS NOT NULL AND
         compliance_evidence_sha256 ~ '^[a-f0-9]{64}$'
       )
     );
 END IF;
END $$;

COMMIT;
, false)
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
   SELECT 1 FROM pg_constraint WHERE conname='ng_efi_compliance_release_evidence_required'
     AND conrelid='public.ng_efi_central_receipts'::regclass
 ) THEN
   ALTER TABLE ng_efi_central_receipts
     ADD CONSTRAINT ng_efi_compliance_release_evidence_required CHECK (
       reconciliation_status <> 'RECONCILED' OR compliance_hold = true OR (
         compliance_cleared_at IS NOT NULL AND
         compliance_evidence_sha256 ~ '^[a-f0-9]{64}$'
       )
     );
 END IF;
END $$;

COMMIT;
, false)
         AND statement_evidence_sha256 ~ '^[a-f0-9]{64}$'
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
   SELECT 1 FROM pg_constraint WHERE conname='ng_efi_compliance_release_evidence_required'
     AND conrelid='public.ng_efi_central_receipts'::regclass
 ) THEN
   ALTER TABLE ng_efi_central_receipts
     ADD CONSTRAINT ng_efi_compliance_release_evidence_required CHECK (
       reconciliation_status <> 'RECONCILED' OR compliance_hold = true OR (
         compliance_cleared_at IS NOT NULL AND
         compliance_evidence_sha256 ~ '^[a-f0-9]{64}$'
       )
     );
 END IF;
END $$;

COMMIT;
