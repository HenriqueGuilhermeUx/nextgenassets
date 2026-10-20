import { parseEfiAutomaticPaymentQuery } from './efi-automatic-payment-status';

const reference={adhesionId:'urn:efi:example-adhesion',endToEndId:'E090893562022060954525a47762681g',amountCents:199};
const entry={
  identificadorAdesao:reference.adhesionId,
  idProprio:'nextgen-contract-1',
  status:'autorizado',
  pagamentos:[{
    endToEndId:reference.endToEndId, valor:'1.99', status:'aceito',
    dataCriacao:'2026-10-16T15:00:00.000Z', infoPagador:'Mensalidade 1'
  }]
};

describe('Official Efí Pix Automático payment lookup shape',()=>{
  it('parses documented single-object response without inferring settlement',()=>{
    expect(parseEfiAutomaticPaymentQuery(entry,reference)).toEqual({
      status:'aceito',endToEndId:reference.endToEndId,hasRefunds:false
    });
  });
  it('accepts a collection, matching only the exact external ID',()=>{
    const extra={...entry,identificadorAdesao:'urn:efi:other-adhesion'};
    expect(parseEfiAutomaticPaymentQuery([extra,entry],reference).status).toBe('aceito');
  });
  it('rejects different bank authorization and E2E IDs',()=>{
    expect(()=>parseEfiAutomaticPaymentQuery(
      {...entry,identificadorAdesao:'urn:efi:wrong'},reference
    )).toThrow('EFI_AUTOMATIC_PAYMENT_REFERENCE_NOT_UNIQUE');
    expect(()=>parseEfiAutomaticPaymentQuery({
      ...entry,pagamentos:[{...entry.pagamentos[0],endToEndId:'EOTHER'}]
    },reference)).toThrow('EFI_AUTOMATIC_PAYMENT_REFERENCE_NOT_UNIQUE');
  });
  it('blocks value mismatch even when the bank returned accepted',()=>{
    const changed={...entry,pagamentos:[{...entry.pagamentos[0],valor:'199.00'}]};
    expect(()=>parseEfiAutomaticPaymentQuery(changed,reference))
      .toThrow('EFI_AUTOMATIC_PAYMENT_AMOUNT_MISMATCH');
  });
  it('flags an accepted payment that has a bank refund',()=>{
    const refunded={...entry,pagamentos:[{
      ...entry.pagamentos[0],
      devolucoes:[{identificadorDevolucao:'DTEST',valor:'1.99',status:'aceito'}]
    }]};
    expect(parseEfiAutomaticPaymentQuery(refunded,reference).hasRefunds).toBe(true);
  });
  it('fails closed on incomplete or duplicate matching payments',()=>{
    expect(()=>parseEfiAutomaticPaymentQuery({...entry,pagamentos:[
      entry.pagamentos[0],entry.pagamentos[0]
    ]},reference)).toThrow('EFI_AUTOMATIC_PAYMENT_REFERENCE_NOT_UNIQUE');
    expect(()=>parseEfiAutomaticPaymentQuery({...entry,pagamentos:[
      {...entry.pagamentos[0],valor:undefined}
    ]},reference)).toThrow('EFI_AUTOMATIC_PAYMENT_STATUS_INCOMPLETE');
  });
});
