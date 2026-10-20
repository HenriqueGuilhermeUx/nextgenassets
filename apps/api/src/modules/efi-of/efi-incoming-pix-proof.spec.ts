import { parseVerifiedIncomingPix,assertIncomingPixMatchesAutomaticPayment } from './efi-incoming-pix-proof';
const exp={endToEndId:'E090893562024101648554e991d24ccb',amountCents:10000,receivingPixKey:'staging@example.invalid'};
const bank={endToEndId:exp.endToEndId,valor:'100.00',chave:exp.receivingPixKey,horario:'2026-10-19T12:00:00.000Z',txid:'txid-test'};
const run=(p:any,ex=exp)=>parseVerifiedIncomingPix(p,ex,new Date('2026-10-19T13:00:00.000Z'));
describe('Efí verified incoming Pix proof - offline, no bank requests',()=>{
  it('accepts exact proof but redacts the Pix key',()=>{
    const p=run(bank);
    expect(p.amountCents).toBe(10000);
    expect(p.bankEvidenceRef).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(p)).not.toContain(exp.receivingPixKey);
  });
  it('blocks wrong E2E',()=>expect(()=>run({...bank,endToEndId:'EOTHER'})).toThrow('EFI_INCOMING_E2E_MISMATCH'));
  it('blocks wrong amounts',()=>expect(()=>run({...bank,valor:'100.01'})).toThrow('EFI_INCOMING_AMOUNT_MISMATCH'));
  it('blocks invalid amounts',()=>expect(()=>run({...bank,valor:'R$100'})).toThrow('EFI_INCOMING_AMOUNT_FORMAT_INVALID'));
  it('blocks mismatched Pix recipient',()=>expect(()=>run({...bank,chave:'other@example.invalid'})).toThrow('EFI_INCOMING_BENEFICIARY_KEY_UNVERIFIED'));
  it('blocks omitted bank recipient key',()=>{const {chave,...rest}=bank;expect(()=>run(rest)).toThrow('EFI_INCOMING_BENEFICIARY_KEY_UNVERIFIED');});
  it('blocks refunds even when only 1 cent',()=>expect(()=>run({...bank,devolucoes:[{valor:'0.01'}]})).toThrow('EFI_INCOMING_REFUND_REQUIRES_REVIEW'));
  it('blocks malformed refund payload',()=>expect(()=>run({...bank,devolucoes:{}})).toThrow('EFI_INCOMING_REFUND_REQUIRES_REVIEW'));
  it('blocks invalid or future timestamp',()=>{
    expect(()=>run({...bank,horario:'2026-02-30T00:00:00Z'})).toThrow('EFI_INCOMING_BANK_TIMESTAMP_INVALID');
    expect(()=>run({...bank,horario:'2026-10-21T00:00:00Z'})).toThrow('EFI_INCOMING_BANK_TIMESTAMP_INVALID');
  });
  it('refuses invalid expected ids and cents',()=>{
    expect(()=>run(bank,{...exp,endToEndId:'fake'})).toThrow('EFI_INCOMING_EXPECTATION_INVALID');
    expect(()=>run(bank,{...exp,amountCents:-1})).toThrow('EFI_INCOMING_EXPECTATION_INVALID');
  });
  it('requires both official bank sources and no refunds',()=>{
    const p=run(bank);
    const of={status:'aceito',endToEndId:exp.endToEndId,hasRefunds:false};
    expect(()=>assertIncomingPixMatchesAutomaticPayment(of,p,exp)).not.toThrow();
    for(const status of ['pendente','agendado','rejeitado'])
      expect(()=>assertIncomingPixMatchesAutomaticPayment({...of,status},p,exp)).toThrow('EFI_BANK_TWO_SOURCE_RECONCILIATION_UNVERIFIED');
    expect(()=>assertIncomingPixMatchesAutomaticPayment({...of,hasRefunds:true},p,exp)).toThrow('EFI_BANK_TWO_SOURCE_RECONCILIATION_UNVERIFIED');
    expect(()=>assertIncomingPixMatchesAutomaticPayment({...of,endToEndId:'EOTHER'},p,exp)).toThrow('EFI_BANK_TWO_SOURCE_RECONCILIATION_UNVERIFIED');
  });
});
