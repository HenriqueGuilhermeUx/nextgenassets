import { parseEfiPixStatementV5 } from './efi-statement-v5-parser';
const e2e='E090893562024101648554e991d24ccb';
const exp={date:'2026-10-18',bankCode:'364',agency:'1',account:'517613',endToEndId:e2e,amountCents:10000};
const ca='CA;Efí;364;1;517613;Cliente Exemplo;2026-10-19;2026-10-18;Extrato de Conciliação API Pix;1.0';
const pr='PR;123456;'+e2e+';someTxId;100.00;12345678908;;;2026-10-18T14:00:00.000Z;';
const fee='TPR;654321;'+e2e+';1.00;2026-10-18T14:02:00.000Z';
const families=[
  ['PR'],['PEC','PEB'],['PDE','PDR','SPDE'],['EPE'],
  ['TPR','TPE'],['ETPR','ETPE'],['TFR'],['TFE'],['TTFE'],['ETFE'],['ETTFE']
];
const make=(rows:string[])=>{
  const counts=families.map(types=>rows.filter(r=>types.some(t=>r.startsWith(t+';'))).length);
  return [ca,...rows,['T',rows.length,...counts].join(';')].join('\n');
};
describe('Official Efí Pix statement v5 CSV fail-closed parser, no live bank data',()=>{
  it('reads official PR and TPR blocks with a redacted proof and tentative fee',()=>{
    const proof=parseEfiPixStatementV5(make([pr,fee]),exp);
    expect(proof).toMatchObject({targetPresent:true,pixValueCents:10000,
      receivedFeeCents:100,feeRefundCents:0,tentativeNetCents:9900,
      verifiedForPayout:false,feesClearedForPayout:false,accountOwnershipConfirmed:false});
    expect(proof.reportSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(proof)).not.toContain('Cliente Exemplo');
    expect(JSON.stringify(proof)).not.toContain('12345678908');
  });
  it('rejects report for a different bank account',()=>{
    expect(()=>parseEfiPixStatementV5(make([pr]),{...exp,account:'999'}))
      .toThrow('EFI_STATEMENT_HEADER_OR_ACCOUNT_MISMATCH');
  });
  it('rejects malformed and missing trailers',()=>{
    expect(()=>parseEfiPixStatementV5(make([pr]).replace('T;1;','T;2;'),exp))
      .toThrow('EFI_STATEMENT_TRAILER_COUNT_MISMATCH');
    expect(()=>parseEfiPixStatementV5([ca,pr].join('\n'),exp))
      .toThrow('EFI_STATEMENT_TRAILER_MISSING');
    expect(()=>parseEfiPixStatementV5([ca,pr,'T;1;1'].join('\n'),exp))
      .toThrow('EFI_STATEMENT_TRAILER_MISSING');
  });
  it('rejects a forged family count even if overall T total is correct',()=>{
    const original=make([pr,fee]);
    const t=original.split('\n').at(-1)!;
    const bad=t.split(';');
    bad[2]='2';bad[6]='0';
    expect(()=>parseEfiPixStatementV5(original.replace(t,bad.join(';')),exp))
      .toThrow('EFI_STATEMENT_TRAILER_FAMILY_MISMATCH');
  });
  it('does not count SD0/SD1 balances among banking movement totals',()=>{
    const rows=[pr,'SD0;200.00;2026-10-17','SD1;300.00;2026-10-18'];
    const t=[ca,...rows,'T;1;1;0;0;0;0;0;0;0;0;0;0'].join('\n');
    expect(parseEfiPixStatementV5(t,exp).countPixReceipts).toBe(1);
  });
  it('rejects missing, duplicate and wrong-amount target Pix',()=>{
    expect(()=>parseEfiPixStatementV5(make([fee]),exp))
      .toThrow('EFI_STATEMENT_PIX_NOT_UNIQUE');
    expect(()=>parseEfiPixStatementV5(make([pr,pr]),exp))
      .toThrow('EFI_STATEMENT_PIX_NOT_UNIQUE');
    expect(()=>parseEfiPixStatementV5(make([pr.replace('100.00','101.00')]),exp))
      .toThrow('EFI_STATEMENT_PIX_AMOUNT_MISMATCH');
  });
  it('blocks Pix devolução, including split refunds',()=>{
    const refund='PDE;1;'+e2e+';txid;returned-001;D1234567890123456789012345678901;0.01;2026-10-18T14:20:00.000Z';
    expect(()=>parseEfiPixStatementV5(make([pr,refund]),exp))
      .toThrow('EFI_STATEMENT_REFUND_REQUIRES_REVIEW');
    const split='SPDE;1;'+e2e+';txid;returned-001;D1234567890123456789012345678901;0.01;abc;0;2026-10-18T14:20:00.000Z';
    expect(()=>parseEfiPixStatementV5(make([pr,split]),exp))
      .toThrow('EFI_STATEMENT_REFUND_REQUIRES_REVIEW');
  });
  it('blocks duplicated fee rows or fee refund',()=>{
    expect(()=>parseEfiPixStatementV5(make([pr,fee,fee]),exp))
      .toThrow('EFI_STATEMENT_FEE_AMBIGUOUS');
    const refund='ETPR;654322;'+e2e+';0.01;2026-10-18T14:03:00.000Z';
    expect(()=>parseEfiPixStatementV5(make([pr,fee,refund]),exp))
      .toThrow('EFI_STATEMENT_FEE_REFUND_REQUIRES_REVIEW');
  });
  it('blocks invalid monetary formatting, unknown record layouts and negative net',()=>{
    expect(()=>parseEfiPixStatementV5(make([pr.replace('100.00','100,00')]),exp))
      .toThrow('EFI_STATEMENT_AMOUNT_FORMAT_INVALID');
    expect(()=>parseEfiPixStatementV5(make([pr,'UNLISTED;raw;money']),exp))
      .toThrow('EFI_STATEMENT_UNKNOWN_BLOCK');
    expect(()=>parseEfiPixStatementV5(make([pr,fee.replace('1.00','101.00')]),exp))
      .toThrow('EFI_STATEMENT_NET_NONPOSITIVE');
  });
  it('refuses date drift and reports lacking the expected E2E',()=>{
    expect(()=>parseEfiPixStatementV5(make([pr]),{...exp,date:'2026-10-17'}))
      .toThrow('EFI_STATEMENT_HEADER_OR_ACCOUNT_MISMATCH');
    expect(()=>parseEfiPixStatementV5(make([pr.replace(e2e,'E'+'0'.repeat(31))]),exp))
      .toThrow('EFI_STATEMENT_PIX_NOT_UNIQUE');
  });
});
