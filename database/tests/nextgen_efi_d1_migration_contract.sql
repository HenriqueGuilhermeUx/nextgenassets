-- NextGen Efí Pix Automático — STRICT EPHEMERAL POSTGRES CONTRACT TEST
-- Test data only. Never run against production.
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF to_regclass('public.ng_efi_auto_authorizations') IS NULL OR
     to_regclass('public.ng_efi_auto_cycles') IS NULL OR
     to_regclass('public.ng_efi_central_receipts') IS NULL OR
     to_regclass('public.ng_efi_central_payouts') IS NULL THEN
    RAISE EXCEPTION 'D1_MIGRATION_TABLE_MISSING';
  END IF;
END $$;

BEGIN;
INSERT INTO ng_efi_auto_authorizations
(id,partner_id,recurrence_id,customer_id,amount_cap_cents,status,provider_adhesion_id,
 verified_at,consented_first_due_on,consented_expires_on,consented_interval,
 beneficiary_fingerprint)
VALUES
('a1','merchant-alpha','recur-1','cust-1',35000,'AUTHORIZED','urn:efi:test-1',
 now(),'2026-10-16','2027-09-16','MENSAL','receiver-fingerprint');

INSERT INTO ng_efi_auto_cycles
(id,partner_id,recurrence_id,authorization_id,due_date,amount_cents,state,idempotency_key)
VALUES
('cycle-1','merchant-alpha','recur-1','a1','2026-10-16',35000,'PLANNED','cycle-idem-1');

-- Import must begin quarantined; a fake reconciliation may NOT be asserted.
INSERT INTO ng_efi_central_receipts
(id,partner_id,cycle_id,incoming_e2e_id,bank_account_fingerprint,bank_settled_at,
 bank_verified_at,gross_amount_cents,provider_fee_cents,
 retained_fee_cents,reconciliation_status,compliance_hold,bank_evidence_ref)
VALUES
('receipt-1','merchant-alpha','cycle-1','bank-e2e-unique-1','receiver-fingerprint',
 '2026-10-16 15:00:00+00',now(),35000,0,0,'BANK_RECEIVED',true,'bank-ledger-ref');

DO $
BEGIN
  BEGIN
    UPDATE ng_efi_central_receipts
       SET reconciliation_status='RECONCILED'
     WHERE id='receipt-1';
    RAISE EXCEPTION 'FAILED_TO_REQUIRE_BANK_STATEMENT_PROOF';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $;

-- Test fixtures below represent *completed, authenticated* evidence only.
-- The application has NO route that can generate these assertions by itself.
UPDATE ng_efi_central_receipts
  SET reconciliation_status='RECONCILED',
      reconciliation_verified_at=now(),
      reconciled_reference='bank-statement-verified-reference',
      provider_fee_cents=51,
      statement_report_id='abc12345-1234-4abc-8abc-123456789abc',
      statement_evidence_sha256=repeat('a',64),
      statement_verified_at=now(),provider_fee_verified_at=now(),
      account_ownership_verified_at=now(),refund_checked_at=now(),
      compliance_hold=true
 WHERE id='receipt-1';

DO $
BEGIN
  BEGIN
    UPDATE ng_efi_central_receipts
      SET compliance_hold=false
    WHERE id='receipt-1';
    RAISE EXCEPTION 'FAILED_TO_REQUIRE_COMPLIANCE_RELEASE';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $;

UPDATE ng_efi_central_receipts
 SET compliance_hold=false,compliance_cleared_at=now(),
     compliance_evidence_sha256=repeat('b',64)
 WHERE id='receipt-1';

DO $$
DECLARE net bigint;
BEGIN
  SELECT net_amount_cents INTO net FROM ng_efi_central_receipts WHERE id='receipt-1';
  IF net <> 34949 THEN RAISE EXCEPTION 'INCORRECT_NET_AMOUNT: %', net; END IF;
END $$;

-- Verify the partner ownership FK BEFORE inserting the legitimate payout.
-- Otherwise UNIQUE(receipt_id) may fail first and mask tenant isolation.
DO $$
BEGIN
  -- A payout owned by merchant-beta may not use merchant-alpha's receipt.
  BEGIN
    INSERT INTO ng_efi_central_payouts
      (id,partner_id,receipt_id,base_business_date,scheduled_business_date,
       calendar_source,calendar_version,amount_cents,idempotency_key,status)
    VALUES
      ('payout-cross-tenant','merchant-beta','receipt-1','2026-10-16','2026-10-19',
       'VERIFIED_BANK_CALENDAR','test-calendar',34949,'payout-cross-idem','SCHEDULED');
    RAISE EXCEPTION 'FAILED_TO_BLOCK_CROSS_TENANT_PAYOUT';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;

END $$;

INSERT INTO ng_efi_central_payouts
(id,partner_id,receipt_id,base_business_date,scheduled_business_date,calendar_source,
 calendar_version,amount_cents,idempotency_key,status)
VALUES
('payout-1','merchant-alpha','receipt-1','2026-10-16','2026-10-19',
 'VERIFIED_BANK_CALENDAR','test-calendar','34949','payout-idem-1','SCHEDULED');

DO $$
BEGIN
  -- Cannot create a second cycle for the same partner and due date.
  BEGIN
    INSERT INTO ng_efi_auto_cycles
      (id,partner_id,recurrence_id,authorization_id,due_date,amount_cents,state,idempotency_key)
    VALUES
      ('cycle-duplicate','merchant-alpha','recur-1','a1','2026-10-16',35000,'PLANNED','cycle-idem-2');
    RAISE EXCEPTION 'FAILED_TO_BLOCK_DUPLICATE_CYCLE';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- Cannot double-credit the same incoming bank payment.
  BEGIN
    INSERT INTO ng_efi_central_receipts
      (id,partner_id,cycle_id,incoming_e2e_id,bank_account_fingerprint,bank_settled_at,
       bank_verified_at,gross_amount_cents,reconciliation_status,bank_evidence_ref)
    VALUES
      ('receipt-duplicate','merchant-alpha','cycle-1','bank-e2e-unique-1',
       'receiver-fingerprint',now(),now(),35000,'BANK_RECEIVED','bank-ledger-ref');
    RAISE EXCEPTION 'FAILED_TO_BLOCK_DUPLICATE_BANK_RECEIPT';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- A different incoming bank E2E may NOT be credited to the same cycle.
  BEGIN
    INSERT INTO ng_efi_central_receipts
      (id,partner_id,cycle_id,incoming_e2e_id,bank_account_fingerprint,
       bank_settled_at,bank_verified_at,gross_amount_cents,reconciliation_status,bank_evidence_ref)
    VALUES
      ('receipt-same-cycle-second-e2e','merchant-alpha','cycle-1','SECOND-BANK-E2E',
       'receiver-fingerprint',now(),now(),35000,'BANK_RECEIVED','bank-proof-2');
    RAISE EXCEPTION 'DUPLICATE_CYCLE_RECEIPT_WAS_ACCEPTED';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- Cannot schedule two payouts for one receipt.
  BEGIN
    INSERT INTO ng_efi_central_payouts
      (id,partner_id,receipt_id,base_business_date,scheduled_business_date,
       calendar_source,calendar_version,amount_cents,idempotency_key,status)
    VALUES
      ('payout-duplicate','merchant-alpha','receipt-1','2026-10-16','2026-10-19',
       'VERIFIED_BANK_CALENDAR','test-calendar',34949,'payout-idem-2','SCHEDULED');
    RAISE EXCEPTION 'FAILED_TO_BLOCK_DUPLICATE_PAYOUT';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- A payment owned by merchant-alpha must not be allocatable to merchant-beta.
  BEGIN
    INSERT INTO ng_efi_central_receipts
      (id,partner_id,cycle_id,incoming_e2e_id,bank_account_fingerprint,
       bank_settled_at,bank_verified_at,gross_amount_cents,reconciliation_status,bank_evidence_ref)
    VALUES
      ('receipt-cross-tenant','merchant-beta','cycle-1','bank-e2e-cross',
       'receiver-fingerprint',now(),now(),35000,'BANK_RECEIVED','bank-ledger-ref');
    RAISE EXCEPTION 'FAILED_TO_BLOCK_CROSS_TENANT_RECEIPT';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;

  -- Bank confirmation cannot be asserted without verified outgoing evidence.
  BEGIN
    UPDATE ng_efi_central_payouts SET status='BANK_CONFIRMED'
    WHERE id='payout-1';
    RAISE EXCEPTION 'FAILED_TO_REQUIRE_OUTGOING_BANK_PROOF';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

-- Fixtures intentionally discarded, migrations remain present only in test DB.
ROLLBACK;
