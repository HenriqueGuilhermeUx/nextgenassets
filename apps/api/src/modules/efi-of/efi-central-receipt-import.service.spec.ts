import { EfiCentralReceiptImportService } from './efi-central-receipt-import.service';
import { EfiOFService } from './efi-of.service';
import { EfiPixIncomingReadService } from './efi-pix-incoming-read.service';

jest.mock('@prisma/client',()=>{
  const db={partner:{findUnique:jest.fn()},$queryRaw:jest.fn(),$transaction:jest.fn()};
  return {PrismaClient:jest.fn().mockImplementation(()=>db),__mockPrisma:db};
});

const envKeys=[
  'NEXTGEN_EFI_PRODUCTION_READ_ONLY_ENABLED','NEXTGEN_EFI_RECEIPT_IMPORT_ENABLED',
  'NEXTGEN_EFI_RECEIPT_IMPORT_ENV','NEXTGEN_EFI_PIX_READ_ENABLED',
  'NEXTGEN_DISABLE_BACKGROUND_WORKERS','NEXTGEN_CENTRALIZED_D1_ENABLED',
  'NEXTGEN_EFI_AUTOMATIC_ENABLED','NEXTGEN_EFI_AUTOMATIC_SANDBOX_REQUESTS',
  'NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS','EFI_OF_API_URL','EFI_OAUTH_URL',
  'EFI_CLIENT_ID','EFI_CLIENT_SECRET','EFI_CERTIFICATE_BASE64',
  'EFI_PIX_RECEIVING_KEY','EFI_OF_FAVORECIDO_DOCUMENTO',
  'EFI_OF_FAVORECIDO_CODIGO_BANCO','EFI_OF_FAVORECIDO_AGENCIA',
  'EFI_OF_FAVORECIDO_CONTA'
] as const;
const saved=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
const ref='E090893562024101648554e991d24ccb',adhesion='urn:efi:49315a93-d39c-4564-9edb-9a73678dbdb1';
const cycle=()=>({
  id:'cycle-01',partner_id:'partner-a',recurrence_id:'recur-a',
  due_date:new Date('2026-10-19T00:00:00.000Z'),state:'SCHEDULED',
  amount_cents:10000n,payment_reference:ref,
  provider_adhesion_id:adhesion,authorization_status:'AUTHORIZED'
});
const bank=()=>({endToEndId:ref,valor:'100.00',horario:'2026-10-19T12:00:00.000Z',
  chave:'cashin@bank.test',txid:'test-cycle-01'});
const of=()=>({status:'aceito',endToEndId:ref,hasRefunds:false});

describe('Atomic bank receipt QUARANTINE (no real banking calls)',()=>{
  const efi={getAutomaticProductionPaymentStatus:jest.fn(),createConsent:jest.fn(),initiatePayment:jest.fn()};
  const pix={getReceivedPix:jest.fn()};
  let db:any;let tx:any;let service:EfiCentralReceiptImportService;
  function configure(){
    Object.assign(process.env,{
      NEXTGEN_EFI_PRODUCTION_READ_ONLY_ENABLED:'true',
      NEXTGEN_EFI_RECEIPT_IMPORT_ENABLED:'true',
      NEXTGEN_EFI_RECEIPT_IMPORT_ENV:'isolated-homolog',
      NEXTGEN_EFI_PIX_READ_ENABLED:'true',
      NEXTGEN_DISABLE_BACKGROUND_WORKERS:'true',
      EFI_OF_API_URL:'https://openfinance.api.efipay.com.br',
      EFI_OAUTH_URL:'https://openfinance.api.efipay.com.br/v1/oauth/token',
      EFI_CLIENT_ID:'test-only-of',EFI_CLIENT_SECRET:'test-only-of-secret',
      EFI_CERTIFICATE_BASE64:'X'.repeat(280),
      EFI_PIX_RECEIVING_KEY:'cashin@bank.test',
      EFI_OF_FAVORECIDO_DOCUMENTO:'00000000000100',
      EFI_OF_FAVORECIDO_CODIGO_BANCO:'09089356',
      EFI_OF_FAVORECIDO_AGENCIA:'0001',
      EFI_OF_FAVORECIDO_CONTA:'00010000'
    });
  }
  beforeEach(()=>{
    for(const k of envKeys)delete process.env[k];
    jest.clearAllMocks();
    db=(jest.requireMock('@prisma/client') as any).__mockPrisma;
    db.partner.findUnique.mockReset().mockResolvedValue({id:'partner-a'});
    db.$queryRaw.mockReset().mockResolvedValue([cycle()]);
    tx={$queryRaw:jest.fn(),$executeRaw:jest.fn().mockResolvedValue(1)};
    db.$transaction.mockReset().mockImplementation(async(cb:any)=>cb(tx));
    tx.$queryRaw.mockResolvedValueOnce([cycle()]).mockResolvedValueOnce([])
      .mockResolvedValueOnce([{id:'ecr-test'}]);
    efi.getAutomaticProductionPaymentStatus.mockResolvedValue(of());
    pix.getReceivedPix.mockResolvedValue(bank());
    service=new EfiCentralReceiptImportService(efi as unknown as EfiOFService,
      pix as unknown as EfiPixIncomingReadService);
  });
  afterAll(()=>{
    for(const k of envKeys){
      if(saved[k]===undefined)delete process.env[k];
      else process.env[k]=saved[k];
    }
  });

  it('denies import with all flags at default, without querying database or bank',async()=>{
    await expect(service.importVerifiedCycle('partner-demo','cycle-01'))
      .rejects.toThrow('EFI_PRODUCTION_READ_ONLY_DISABLED');
    expect(db.partner.findUnique).not.toHaveBeenCalled();
    expect(pix.getReceivedPix).not.toHaveBeenCalled();
  });
  it('rejects worker-on, D+1 enabled, wrong environment or absent import flag',async()=>{
    configure();
    process.env.NEXTGEN_CENTRALIZED_D1_ENABLED='true';
    await expect(service.importVerifiedCycle('partner-demo','cycle-01')).rejects.toThrow();
    process.env.NEXTGEN_CENTRALIZED_D1_ENABLED='false';
    process.env.NEXTGEN_EFI_RECEIPT_IMPORT_ENV='production';
    await expect(service.importVerifiedCycle('partner-demo','cycle-01'))
      .rejects.toThrow('EFI_BANK_RECEIPT_IMPORT_DISABLED');
    process.env.NEXTGEN_EFI_RECEIPT_IMPORT_ENV='isolated-homolog';
    process.env.NEXTGEN_EFI_RECEIPT_IMPORT_ENABLED='false';
    await expect(service.importVerifiedCycle('partner-demo','cycle-01'))
      .rejects.toThrow('EFI_BANK_RECEIPT_IMPORT_DISABLED');
    expect(db.partner.findUnique).not.toHaveBeenCalled();
  });
  it('rejects malformed partner and cycle references before any database access',async()=>{
    configure();
    await expect(service.importVerifiedCycle('partner/other','cycle-01'))
      .rejects.toThrow('EFI_RECEIPT_IMPORT_REFERENCE_INVALID');
    await expect(service.importVerifiedCycle('partner-demo','..'))
      .rejects.toThrow('EFI_RECEIPT_IMPORT_REFERENCE_INVALID');
  });
  it('blocks unknown partner and mismatched cycle ownership',async()=>{
    configure();
    db.partner.findUnique.mockResolvedValueOnce(null);
    await expect(service.importVerifiedCycle('partner-demo','cycle-01'))
      .rejects.toThrow('EFI_RECEIPT_IMPORT_PARTNER_NOT_FOUND');
    db.$queryRaw.mockResolvedValueOnce([]);
    await expect(service.importVerifiedCycle('partner-demo','cycle-01'))
      .rejects.toThrow('EFI_CYCLE_NOT_READY_FOR_RECEIPT_IMPORT');
    expect(pix.getReceivedPix).not.toHaveBeenCalled();
  });
  it('will not fetch bank data for an unauthorized or unsubmitted cycle',async()=>{
    configure();
    db.$queryRaw.mockResolvedValueOnce([{...cycle(),authorization_status:'REVOKED'}]);
    await expect(service.importVerifiedCycle('partner-demo','cycle-01')).rejects.toThrow('EFI_CYCLE_NOT_READY_FOR_RECEIPT_IMPORT');
    expect(pix.getReceivedPix).not.toHaveBeenCalled();
  });
  it('fails on an unverified beneficiary, bank refund or mismatched OF status',async()=>{
    configure();
    pix.getReceivedPix.mockResolvedValueOnce({...bank(),chave:'attacker@example.invalid'});
    await expect(service.importVerifiedCycle('partner-demo','cycle-01'))
      .rejects.toThrow('EFI_INCOMING_BENEFICIARY_KEY_UNVERIFIED');
    pix.getReceivedPix.mockResolvedValueOnce({...bank(),devolucoes:[{valor:'0.01'}]});
    await expect(service.importVerifiedCycle('partner-demo','cycle-01'))
      .rejects.toThrow('EFI_INCOMING_REFUND_REQUIRES_REVIEW');
    efi.getAutomaticProductionPaymentStatus.mockResolvedValueOnce({...of(),status:'pendente'});
    await expect(service.importVerifiedCycle('partner-demo','cycle-01'))
      .rejects.toThrow('EFI_BANK_TWO_SOURCE_RECONCILIATION_UNVERIFIED');
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('atomically creates a held BANK_RECEIVED proof, never a D+1 payout',async()=>{
    configure();
    const result=await service.importVerifiedCycle('partner-demo','cycle-01');
    expect(result).toEqual({
      success:true,existing:false,receiptId:expect.stringMatching(/^ecr_/),
      reconciliationStatus:'BANK_RECEIVED',complianceHold:true,
      feesVerified:false,payoutPerformed:false
    });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(3);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(efi.initiatePayment).not.toHaveBeenCalled();
    expect(efi.createConsent).not.toHaveBeenCalled();
  });
  it('returns identical prior evidence without inserting a second receipt',async()=>{
    configure();
    tx.$queryRaw.mockReset().mockResolvedValueOnce([cycle()])
      .mockResolvedValueOnce([{
        id:'existing',partner_id:'partner-a',cycle_id:'cycle-01',
        incoming_e2e_id:ref,bank_evidence_ref:expect.anything(),
        gross_amount_cents:10000,reconciliation_status:'BANK_RECEIVED',
        compliance_hold:true
      }]);
    // Derive stable proof hash from a prior independent readback fixture.
    const proof=(await import('./efi-incoming-pix-proof')).parseVerifiedIncomingPix(
      bank(),{endToEndId:ref,amountCents:10000,receivingPixKey:'cashin@bank.test'});
    const existing={id:'existing',partner_id:'partner-a',cycle_id:'cycle-01',
      incoming_e2e_id:ref,bank_evidence_ref:proof.bankEvidenceRef,
      gross_amount_cents:10000,reconciliation_status:'BANK_RECEIVED',
      compliance_hold:true};
    tx.$queryRaw.mockReset().mockResolvedValueOnce([cycle()])
      .mockResolvedValueOnce([existing]);
    const result=await service.importVerifiedCycle('partner-demo','cycle-01');
    expect(result).toMatchObject({success:true,existing:true,
      receiptId:'existing',payoutPerformed:false,complianceHold:true});
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it('rejects conflicting E2E, amount or evidence for an existing receipt',async()=>{
    configure();
    tx.$queryRaw.mockReset().mockResolvedValueOnce([cycle()])
      .mockResolvedValueOnce([{
        id:'other',partner_id:'partner-a',cycle_id:'cycle-01',
        incoming_e2e_id:'EOTHER',bank_evidence_ref:'DIFFERENT',
        gross_amount_cents:10000,reconciliation_status:'BANK_RECEIVED',
        compliance_hold:true
      }]);
    await expect(service.importVerifiedCycle('partner-demo','cycle-01'))
      .rejects.toThrow('EFI_INCOMING_RECEIPT_CONFLICT_MANUAL_REVIEW');
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it('blocks changed cycle after bank readback, before any insert',async()=>{
    configure();
    tx.$queryRaw.mockReset().mockResolvedValueOnce([{...cycle(),payment_reference:'E'+ '0'.repeat(31)}]);
    await expect(service.importVerifiedCycle('partner-demo','cycle-01'))
      .rejects.toThrow('EFI_CYCLE_CHANGED_DURING_RECONCILIATION');
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it('handles concurrent DB unique conflict without retrying bank debit',async()=>{
    configure();
    tx.$queryRaw.mockReset().mockResolvedValueOnce([cycle()])
      .mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(service.importVerifiedCycle('partner-demo','cycle-01'))
      .rejects.toThrow('EFI_INCOMING_RECEIPT_CONFLICT_MANUAL_REVIEW');
    expect(efi.initiatePayment).not.toHaveBeenCalled();
  });
  it('blocks bad receiving account metadata before touching bank',async()=>{
    configure();
    delete process.env.EFI_OF_FAVORECIDO_DOCUMENTO;
    await expect(service.importVerifiedCycle('partner-demo','cycle-01'))
      .rejects.toThrow('EFI_RECEIVING_ACCOUNT_NOT_VERIFIED');
    expect(pix.getReceivedPix).not.toHaveBeenCalled();
  });
});
