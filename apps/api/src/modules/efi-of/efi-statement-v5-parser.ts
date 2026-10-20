import { createHash } from 'crypto';

/** Efí "Extrato de Conciliação API Pix", official CSV manual v5.0 (May 2026).
 * No incoming HTTP/webhook JSON can be treated as a bank-issued CSV.
 * This pure parser NEVER changes ledger, consent, compliance or payout state.
 */
export type EfiStatementPreview = {
  reportSha256: string;
  accountFingerprint: string;
  movementDate: string;
  targetPresent: boolean;
  pixValueCents: number;
  receivedFeeCents: number;
  feeRefundCents: number;
  tentativeNetCents: number;
  countPixReceipts: number;
  matchedFeeEntries: number;
  otherBankMovements: number;
  hasRefundOrAmbiguity: boolean;
  verifiedForPayout: false;
  feesClearedForPayout: false;
  accountOwnershipConfirmed: false;
};

export function parseEfiPixStatementV5(
  data: string,
  expected: {
    date: string; bankCode: string; agency: string; account: string;
    endToEndId: string; amountCents: number;
  }
): EfiStatementPreview {
  if (typeof data !== 'string' || Buffer.byteLength(data,'utf8') > 1_000_000 ||
      data.length < 25 || data.includes('\u0000') ||
      !/^\d{4}-\d{2}-\d{2}$/.test(expected.date) ||
      !/^[A-Za-z0-9]{32}$/.test(expected.endToEndId) ||
      !Number.isSafeInteger(expected.amountCents) || expected.amountCents <= 0 ||
      ![expected.bankCode,expected.agency,expected.account].every(
        value => typeof value === 'string' && /^[0-9]{1,20}$/.test(value))) {
    throw new Error('EFI_STATEMENT_INPUT_INVALID');
  }

  const parseMoney=(money:string):number=>{
    if(!/^(?:0|[1-9]\d{0,11})\.\d{2}$/.test(money))
      throw new Error('EFI_STATEMENT_AMOUNT_FORMAT_INVALID');
    const parts=money.split('.');
    const cents=Number(parts[0])*100+Number(parts[1]);
    if(!Number.isSafeInteger(cents) || cents<0)
      throw new Error('EFI_STATEMENT_AMOUNT_INVALID');
    return cents;
  };
  const lines=data.replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.length>0);
  if(lines.length<2 || lines.length>5000 || lines.some(s=>s.length>22000))
    throw new Error('EFI_STATEMENT_FILE_BOUNDS_INVALID');

  const rows=lines.map(line=>line.split(';'));
  const header=rows[0], trailer=rows[rows.length-1];
  if(header.length!==10 || header[0]!=='CA' ||
     header[2]!==expected.bankCode || header[3]!==expected.agency ||
     header[4]!==expected.account ||
     header[7]!==expected.date ||
     header[8]!=='Extrato de Conciliação API Pix' ||
     header[9]!=='1.0') {
    throw new Error('EFI_STATEMENT_HEADER_OR_ACCOUNT_MISMATCH');
  }
  if(trailer[0]!=='T' || trailer.length<2 || !/^\d{1,10}$/.test(trailer[1]))
    throw new Error('EFI_STATEMENT_TRAILER_MISSING');

  const allowed=new Set(['PR','PEC','PEB','EPE','PDE','PDR','SPDE',
    'TPR','TPE','ETPR','ETPE','SD0','SD1','TFE','TFR','ETFE','TTFE','ETTFE']);
  let receipts=0, chargeRows=0, feeRefundRows=0, pixValue=0, receivedFees=0,
    returnedFees=0, otherMovements=0, hasRefund=false, counted=0;
  for (const fields of rows.slice(1,-1)) {
    const type=fields[0];
    if(!allowed.has(type))throw new Error('EFI_STATEMENT_UNKNOWN_BLOCK');
    if(type!=='SD0'&&type!=='SD1') counted++;
    if(type==='PR') {
      if(fields.length!==9&&fields.length!==10) throw new Error('EFI_STATEMENT_PIX_ROW_INVALID');
      if(fields[2]!==expected.endToEndId) {otherMovements++;continue;}
      if(!/^.{1,35}$/.test(fields[1]||''))
        throw new Error('EFI_STATEMENT_PIX_ROW_INVALID');
      receipts++;
      pixValue=parseMoney(fields[4]);
      if(pixValue!==expected.amountCents)throw new Error('EFI_STATEMENT_PIX_AMOUNT_MISMATCH');
    } else if(type==='TPR'||type==='ETPR') {
      if(fields.length!==5)throw new Error('EFI_STATEMENT_FEE_ROW_INVALID');
      if(fields[2]!==expected.endToEndId){otherMovements++;continue;}
      if(type==='TPR'){chargeRows++;receivedFees+=parseMoney(fields[3]);}
      else {feeRefundRows++;returnedFees+=parseMoney(fields[3]);}
    } else if(['PDE','PDR','SPDE'].includes(type)) {
      if(fields.length<(type==='SPDE'?10:type==='PDE'?8:6))
        throw new Error('EFI_STATEMENT_REFUND_ROW_INVALID');
      if(fields[2]===expected.endToEndId)hasRefund=true;
      else otherMovements++;
    } else {
      otherMovements++;
    }
  }
  if(Number(trailer[1])!==counted)throw new Error('EFI_STATEMENT_TRAILER_COUNT_MISMATCH');
  if(receipts!==1)throw new Error('EFI_STATEMENT_PIX_NOT_UNIQUE');
  if(chargeRows>1 || feeRefundRows>1 || returnedFees>receivedFees)
    throw new Error('EFI_STATEMENT_FEE_AMBIGUOUS');
  if(hasRefund)throw new Error('EFI_STATEMENT_REFUND_REQUIRES_REVIEW');
  if(feeRefundRows>0)throw new Error('EFI_STATEMENT_FEE_REFUND_REQUIRES_REVIEW');
  const tentativeNet=pixValue-receivedFees;
  if(tentativeNet<=0)throw new Error('EFI_STATEMENT_NET_NONPOSITIVE');
  const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
  return {
    reportSha256:hash(data),
    accountFingerprint:hash([expected.bankCode,expected.agency,expected.account].join('|')),
    movementDate:expected.date,
    targetPresent:true,
    pixValueCents:pixValue,
    receivedFeeCents:receivedFees,
    feeRefundCents:returnedFees,
    tentativeNetCents:tentativeNet,
    countPixReceipts:receipts,
    matchedFeeEntries:chargeRows,
    otherBankMovements:otherMovements,
    hasRefundOrAmbiguity:false,
    verifiedForPayout:false,feesClearedForPayout:false,
    accountOwnershipConfirmed:false
  };
}
