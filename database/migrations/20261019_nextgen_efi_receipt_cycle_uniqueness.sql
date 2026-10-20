-- Stage-only additional protection: one received-bank Pix allocation per cycle.
-- Do not apply to production before verifying existing ledger duplicates.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS ng_efi_central_receipts_cycle_once
  ON ng_efi_central_receipts(partner_id,cycle_id);
COMMIT;
