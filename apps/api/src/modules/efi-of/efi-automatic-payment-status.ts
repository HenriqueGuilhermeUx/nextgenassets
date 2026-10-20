/**
 * Efí Open Finance Automatic Pix status contract.
 * Accepts the public documented GET /v1/pagamentos-automaticos/pix payload
 * (one adhesion with a pagamentos array). Never infer bank settlement.
 */
export interface VerifiedAutomaticPaymentStatus {
  status: string;
  endToEndId: string;
  hasRefunds: boolean;
}
export function parseEfiAutomaticPaymentQuery(
  payload: unknown,
  expected: { adhesionId: string; endToEndId: string; amountCents: number }
): VerifiedAutomaticPaymentStatus {
  if (!expected.adhesionId || !expected.endToEndId ||
      !Number.isSafeInteger(expected.amountCents) || expected.amountCents <= 0) {
    throw new Error('EFI_AUTOMATIC_STATUS_LOOKUP_INVALID');
  }
  const data = payload as any;
  const roots = Array.isArray(data) ? data : [data];
  const matches = roots.filter(x=>x?.identificadorAdesao===expected.adhesionId &&
    Array.isArray(x?.pagamentos))
    .flatMap(x=>x.pagamentos)
    .filter(p=>p?.endToEndId===expected.endToEndId);
  if (matches.length!==1) throw new Error('EFI_AUTOMATIC_PAYMENT_REFERENCE_NOT_UNIQUE');
  const p=matches[0];
  if (typeof p.status!=='string' || !p.status.trim() ||
      typeof p.valor!=='string' || !/^\d+\.\d{2}$/.test(p.valor)) {
    throw new Error('EFI_AUTOMATIC_PAYMENT_STATUS_INCOMPLETE');
  }
  const actualCents=Math.round(Number(p.valor)*100);
  if (!Number.isSafeInteger(actualCents) || actualCents!==expected.amountCents) {
    throw new Error('EFI_AUTOMATIC_PAYMENT_AMOUNT_MISMATCH');
  }
  return {
    status:p.status.trim().toLowerCase(),
    endToEndId:expected.endToEndId,
    hasRefunds:Array.isArray(p.devolucoes)&&p.devolucoes.length>0
  };
}
