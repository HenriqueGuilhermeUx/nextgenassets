import { createHash } from 'crypto';
import { VerifiedAutomaticPaymentStatus } from './efi-automatic-payment-status';

export interface VerifiedBankIncomingPix {
  endToEndId:string; amountCents:number; bankSettledAt:string;
  receivingPixKeyFingerprint:string; bankEvidenceRef:string;
}

/** Input MUST originate from an authenticated Efí Pix GET /v2/pix/:e2eId,
 * never from a webhook or a client-submitted bank-shaped JSON. */
export function parseVerifiedIncomingPix(
  bank:unknown,
  expected:{endToEndId:string;amountCents:number;receivingPixKey:string},
  now=new Date()
):VerifiedBankIncomingPix {
  if (!/^[A-Za-z0-9]{32}$/.test(expected.endToEndId) ||
      !Number.isSafeInteger(expected.amountCents) || expected.amountCents<=0 ||
      !expected.receivingPixKey?.trim()) throw new Error('EFI_INCOMING_EXPECTATION_INVALID');
  const p=bank as Record<string,any>|null;
  if (!p || typeof p!=='object' || Array.isArray(p) ||
      p.endToEndId!==expected.endToEndId)
    throw new Error('EFI_INCOMING_E2E_MISMATCH');
  if (typeof p.valor!=='string' || !/^(0|[1-9]\d*)\.\d{2}$/.test(p.valor))
    throw new Error('EFI_INCOMING_AMOUNT_FORMAT_INVALID');
  const [reais,centavos]=p.valor.split('.');
  const cents=Number(reais)*100+Number(centavos);
  if (!Number.isSafeInteger(cents)||cents!==expected.amountCents)
    throw new Error('EFI_INCOMING_AMOUNT_MISMATCH');
  // Efí may omit 'chave' on GET. Never infer the receiving beneficiary.
  if (typeof p.chave!=='string' || p.chave!==expected.receivingPixKey)
    throw new Error('EFI_INCOMING_BENEFICIARY_KEY_UNVERIFIED');
  if (p.devolucoes!==undefined && (!Array.isArray(p.devolucoes)||p.devolucoes.length!==0))
    throw new Error('EFI_INCOMING_REFUND_REQUIRES_REVIEW');
  if (typeof p.horario!=='string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(p.horario))
    throw new Error('EFI_INCOMING_BANK_TIMESTAMP_INVALID');
  const time=new Date(p.horario);
  if (!Number.isFinite(time.getTime()) ||
      time.toISOString().slice(0,10)!==p.horario.slice(0,10) ||
      time.getTime()>now.getTime()+60000 ||
      time.getTime()<Date.UTC(2020,0,1))
    throw new Error('EFI_INCOMING_BANK_TIMESTAMP_INVALID');
  const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
  return {
    endToEndId:expected.endToEndId,amountCents:cents,
    bankSettledAt:time.toISOString(),
    receivingPixKeyFingerprint:hash('pix-key|'+expected.receivingPixKey),
    bankEvidenceRef:hash(['efi-get-pix-v2',p.endToEndId,p.valor,p.horario,
      expected.receivingPixKey,typeof p.txid==='string'?p.txid:''].join('|'))
  };
}

/** A second independent Open Finance GET must verify SAME E2E, amount and status.
 * Even both proofs do not determine fees, compliance or eligibility for D+1. */
export function assertIncomingPixMatchesAutomaticPayment(
  of:VerifiedAutomaticPaymentStatus,
  pix:VerifiedBankIncomingPix,
  expected:{endToEndId:string;amountCents:number}
):void {
  if (of.endToEndId!==expected.endToEndId ||
      pix.endToEndId!==expected.endToEndId ||
      pix.amountCents!==expected.amountCents ||
      of.status!=='aceito' || of.hasRefunds)
    throw new Error('EFI_BANK_TWO_SOURCE_RECONCILIATION_UNVERIFIED');
}
