import { createHash } from 'crypto';

export interface VerifiedAdhesionTerms {
  status: string;
  providerId: string;
  localReference: string;
  amountCents: number;
  interval: string;
  startsOn: string;
  expiresOn: string;
  beneficiaryFingerprint: string;
}

/**
 * Verify the bank-retrieved terms of an Efí automatic Pix authorization.
 * Never accept these fields from the browser or a non-verified callback.
 * Return only a fingerprint of the beneficiary, no account details.
 */
export function parseVerifiedEfiAdhesion(source: any): VerifiedAdhesionTerms {
  const beneficiary = source?.favorecido?.contaBanco;
  const terms = source?.assinatura?.configuracao?.automatico;
  const beneficiaryParts = [
    beneficiary?.documento, beneficiary?.codigoBanco,
    beneficiary?.agencia, beneficiary?.conta
  ];
  if (!source?.identificadorAdesao || !source?.assinatura?.idProprio ||
      !beneficiaryParts.every(x => typeof x === 'string' && x.length > 0) ||
      !terms || typeof terms.valorFixo !== 'string' ||
      !/^\d+\.\d{2}$/.test(terms.valorFixo) ||
      !terms.intervalo || !terms.dataInicio || !source.assinatura.expiracao) {
    throw new Error('EFI_VERIFIED_ADHESION_TERMS_INCOMPLETE');
  }
  const value = Number(terms.valorFixo);
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0 ||
      Math.abs(value * 100 - cents) > 0.000001) {
    throw new Error('EFI_VERIFIED_ADHESION_INVALID_AMOUNT');
  }
  return {
    status: String(source.status || '').toLowerCase(),
    providerId: String(source.identificadorAdesao),
    localReference: String(source.assinatura.idProprio),
    amountCents: cents,
    interval: String(terms.intervalo),
    startsOn: String(terms.dataInicio),
    expiresOn: String(source.assinatura.expiracao),
    beneficiaryFingerprint: createHash('sha256').update(beneficiaryParts.join('|')).digest('hex')
  };
}

export function assertVerifiedEfiAdhesionMatches(
  verified: VerifiedAdhesionTerms,
  expected: {
    providerId: string;
    localReference: string;
    amountCents: number;
    interval: string;
    startsOn: string;
    expiresOn: string;
    beneficiaryFingerprint: string;
  }
): void {
  if (verified.providerId !== expected.providerId ||
      verified.localReference !== expected.localReference ||
      verified.amountCents !== expected.amountCents ||
      verified.interval !== expected.interval ||
      verified.startsOn !== expected.startsOn ||
      verified.expiresOn !== expected.expiresOn ||
      verified.beneficiaryFingerprint !== expected.beneficiaryFingerprint) {
    throw new Error('EFI_BANK_AUTHORIZATION_TERMS_MISMATCH');
  }
}
