import { createHash } from 'crypto';
import { EfiCentralizedD1PayoutService } from './efi-centralized-d1-payout.service';

jest.mock('@prisma/client', () => {
  const prismaForTest = {
    partner: { findUnique: jest.fn() },
    $transaction: jest.fn()
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => prismaForTest),
    __mockPrisma: prismaForTest
  };
});

const envKeys = [
  'NEXTGEN_CENTRALIZED_D1_ENABLED','NEXTGEN_BANK_CALENDAR_SOURCE',
  'NEXTGEN_BANK_CALENDAR_VERIFIED_THROUGH','NEXTGEN_BANK_CALENDAR_VERSION',
  'NEXTGEN_BANK_HOLIDAY_DATES','EFI_OF_FAVORECIDO_DOCUMENTO',
  'EFI_OF_FAVORECIDO_CODIGO_BANCO','EFI_OF_FAVORECIDO_AGENCIA','EFI_OF_FAVORECIDO_CONTA'
] as const;
const originals: Record<string,string|undefined> = {};
const beneficiary = ['00000000000000','00000000','0001','123456-7'];
const fingerprint = createHash('sha256').update(beneficiary.join('|')).digest('hex');

describe('NextGen centralized D+1 payout service — non-movement safety', () => {
  let db: any;
  let tx: any;
  let service: EfiCentralizedD1PayoutService;
  const receipt = () => ({
    id:'receipt-001',partner_id:'partner-a',cycle_id:'cycle-a',
    incoming_e2e_id:'incoming-e2e-001',
    bank_account_fingerprint:fingerprint,
    bank_settled_at: new Date('2026-10-16T15:00:00.000Z'),
    bank_verified_at:new Date('2026-10-16T15:02:00.000Z'),
    reconciliation_verified_at:new Date('2026-10-16T15:10:00.000Z'),
    gross_amount_cents:10000,provider_fee_cents:51,retained_fee_cents:0,
    reconciliation_status:'RECONCILED',compliance_hold:false,
    bank_evidence_ref:'bank-proof-ref',reconciled_reference:'recon-ref'
  });
  beforeAll(() => {
    for(const k of envKeys) originals[k] = process.env[k];
  });
  beforeEach(() => {
    process.env.NEXTGEN_CENTRALIZED_D1_ENABLED='true';
    process.env.NEXTGEN_BANK_CALENDAR_SOURCE='VERIFIED_BANK_CALENDAR';
    process.env.NEXTGEN_BANK_CALENDAR_VERIFIED_THROUGH='2026-12-31';
    process.env.NEXTGEN_BANK_CALENDAR_VERSION='verified-test-fixture';
    process.env.NEXTGEN_BANK_HOLIDAY_DATES='2026-10-12,2026-12-25';
    process.env.EFI_OF_FAVORECIDO_DOCUMENTO=beneficiary[0];
    process.env.EFI_OF_FAVORECIDO_CODIGO_BANCO=beneficiary[1];
    process.env.EFI_OF_FAVORECIDO_AGENCIA=beneficiary[2];
    process.env.EFI_OF_FAVORECIDO_CONTA=beneficiary[3];

    db = (jest.requireMock('@prisma/client') as any).__mockPrisma;
    db.partner.findUnique.mockReset().mockResolvedValue({id:'partner-a',slug:'partner-demo'});
    db.$transaction.mockReset();
    tx = { $queryRaw: jest.fn(), $executeRaw: jest.fn().mockResolvedValue(1) };
    db.$transaction.mockImplementation(async (cb: any) => cb(tx));
    service = new EfiCentralizedD1PayoutService();
  });
  afterAll(() => {
    for(const k of envKeys){
      if(originals[k]===undefined) delete process.env[k];
      else process.env[k]=originals[k];
    }
  });

  it('creates a D+1 business-day schedule for verified incoming Pix without Pix OUT',async()=>{
    tx.$queryRaw
      .mockResolvedValueOnce([receipt()])
      .mockResolvedValueOnce([{id:'payout-001'}]);
    const result = await service.scheduleVerifiedReceipt('partner-demo','receipt-001');
    expect(result).toEqual({
      success:true,existing:false,payoutId:expect.stringMatching(/^d1p_/),status:'SCHEDULED',
      scheduledDate:'2026-10-19',amountCents:9949,bankTransferPerformed:false
    });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    // No payment provider or bank client is imported or called by this service.
  });

  it('returns the existing payout instead of creating a second one',async()=>{
    tx.$queryRaw
      .mockResolvedValueOnce([receipt()])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id:'previous-payout',status:'SCHEDULED',scheduled_business_date:'2026-10-19',
        amount_cents:9949
      }]);
    const result=await service.scheduleVerifiedReceipt('partner-demo','receipt-001');
    expect(result).toMatchObject({
      success:true,existing:true,payoutId:'previous-payout',
      amountCents:9949,bankTransferPerformed:false
    });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it.each([
    ['unverified bank receipt',{bank_verified_at:null}],
    ['unreconciled receipt',{reconciliation_status:'BANK_RECEIVED'}],
    ['missing reconciliation proof',{reconciled_reference:null}],
    ['missing reconciliation time',{reconciliation_verified_at:null}]
  ])('refuses %s',async(_name,changes)=>{
    tx.$queryRaw.mockResolvedValueOnce([{...receipt(),...changes}]);
    await expect(service.scheduleVerifiedReceipt('partner-demo','receipt-001'))
      .rejects.toThrow('BANK_RECEIPT_NOT_VERIFIED_AND_RECONCILED');
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('rejects a receiving account mismatch',async()=>{
    tx.$queryRaw.mockResolvedValueOnce([{
      ...receipt(),bank_account_fingerprint:'different-bank-account'
    }]);
    await expect(service.scheduleVerifiedReceipt('partner-demo','receipt-001'))
      .rejects.toThrow('BANK_RECEIVING_ACCOUNT_MISMATCH');
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('refuses to plan a payout when compliance freezes the receipt',async()=>{
    tx.$queryRaw.mockResolvedValueOnce([{...receipt(),compliance_hold:true}]);
    await expect(service.scheduleVerifiedReceipt('partner-demo','receipt-001'))
      .rejects.toThrow('BLOCKED_COMPLIANCE_HOLD');
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('blocks missing partner / tenant and disabled feature',async()=>{
    tx.$queryRaw.mockResolvedValueOnce([]);
    await expect(service.scheduleVerifiedReceipt('partner-demo','receipt-cross-tenant'))
      .rejects.toThrow('BANK_RECEIPT_NOT_FOUND_OR_NOT_MATCHED');
    process.env.NEXTGEN_CENTRALIZED_D1_ENABLED='false';
    const calls=db.$transaction.mock.calls.length;
    await expect(service.scheduleVerifiedReceipt('partner-demo','receipt-001'))
      .rejects.toThrow('NEXTGEN_CENTRALIZED_D1_DISABLED');
    expect(db.$transaction).toHaveBeenCalledTimes(calls);
  });

  it('requires a versioned and verified bank holiday calendar',async()=>{
    process.env.NEXTGEN_BANK_CALENDAR_VERSION='SUBSTITUA_PELO_REAL';
    await expect(service.scheduleVerifiedReceipt('partner-demo','receipt-001'))
      .rejects.toThrow('VERIFIED_BANK_CALENDAR_REQUIRED');
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
