/**
 * Bridge between existing NextGen Smart Billing recurrence and Efí automatic
 * payment payloads. PURE FUNCTIONS ONLY: no API calls, no authorizations,
 * no DB reads/writes, no live banking side effects.
 *
 * Callers MUST derive tenant and receiving account from authenticated
 * server-side records and verify bank consent status independently.
 */
import { createHash } from 'crypto';

export type EfiAutomaticInterval = 'DIARIO' | 'SEMANAL' | 'MENSAL' | 'ANUAL';
export type NextgenRecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface NextgenRecurrenceSnapshot {
  id: string;
  tenantId: string;
  partnerId: string;
  customerId: string;
  title: string;
  amountCents: number;
  frequency: NextgenRecurrenceFrequency;
  dueDate: string; // YYYY-MM-DD
  startsOn: string;
  endsOn?: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
}

export interface EfiBankPayer {
  cpf?: string;
  cnpj?: string;
  name: string;
  participantId: string;
}

export interface ServerSideBeneficiary {
  name: string;
  document: string;
  bankCode: string;
  agency: string;
  account: string;
  accountType: 'TRAN' | 'CACC' | 'SVGS';
}

export interface VerifiedConsentSnapshot {
  recurrenceId: string;
  tenantId: string;
  status: 'AUTHORIZED' | 'PENDING' | 'REVOKED' | 'REJECTED' | 'EXPIRED';
  externalAdhesionId?: string;
  // Set only after verifying Efí status against provider API or authenticated webhook.
  verifiedAt?: string;
  maxPaymentCents: number;
  allowRetry: boolean;
}

const INTERVAL: Record<NextgenRecurrenceFrequency, EfiAutomaticInterval> = {
  DAILY: 'DIARIO',
  WEEKLY: 'SEMANAL',
  MONTHLY: 'MENSAL',
  YEARLY: 'ANUAL'
};

function isoDate(s: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))) {
    throw new Error('INVALID_DATE');
  }
  return s;
}
function centsToEfi(value: number): string {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('INVALID_AMOUNT_CENTS');
  return (value / 100).toFixed(2);
}
function requireBoundedRecurrence(r: NextgenRecurrenceSnapshot): void {
  if (!r.id || !r.tenantId || !r.partnerId || !r.customerId || !r.title?.trim()) {
    throw new Error('INVALID_RECURRENCE_IDENTITY');
  }
  if (r.status !== 'ACTIVE') throw new Error('RECURRENCE_NOT_ACTIVE');
  isoDate(r.dueDate);
  isoDate(r.startsOn);
  if (r.endsOn) {
    isoDate(r.endsOn);
    if (r.endsOn < r.startsOn) throw new Error('INVALID_RECURRENCE_PERIOD');
  }
  centsToEfi(r.amountCents);
}
function validateBeneficiary(b: ServerSideBeneficiary): void {
  if (!b.name?.trim() || !/^\d{11}$|^\d{14}$/.test(b.document) ||
      !/^\d{8}$/.test(b.bankCode) || !b.agency?.trim() ||
      !b.account?.trim() || !['TRAN','CACC','SVGS'].includes(b.accountType)) {
    throw new Error('SERVER_SIDE_BENEFICIARY_REQUIRED');
  }
}
export function toEfiOpenFinanceAdhesion(
  recurrence: NextgenRecurrenceSnapshot,
  payer: EfiBankPayer,
  beneficiary: ServerSideBeneficiary
) {
  requireBoundedRecurrence(recurrence);
  validateBeneficiary(beneficiary);
  if (!payer.name?.trim() || !payer.participantId?.trim() ||
      !(payer.cpf || payer.cnpj)) throw new Error('PAYER_INFORMATION_REQUIRED');
  return {
    pagador: { cpf: payer.cpf, cnpj: payer.cnpj, nome: payer.name, idParticipante: payer.participantId },
    favorecido: { contaBanco: {
      nome: beneficiary.name,
      documento: beneficiary.document,
      codigoBanco: beneficiary.bankCode,
      agencia: beneficiary.agency,
      conta: beneficiary.account,
      tipoConta: beneficiary.accountType
    } },
    assinatura: {
      expiracao: recurrence.endsOn || undefined,
      descricao: recurrence.title,
      idProprio: `nextgen-${recurrence.id}`,
      configuracao: { automatico: {
        valorFixo: centsToEfi(recurrence.amountCents),
        intervalo: INTERVAL[recurrence.frequency],
        dataInicio: recurrence.startsOn,
        permiteRetentativa: false
      } }
    }
  };
}

export function assertConsentEligibleForCycle(
  recurrence: NextgenRecurrenceSnapshot,
  consent: VerifiedConsentSnapshot
): void {
  requireBoundedRecurrence(recurrence);
  if (consent.tenantId !== recurrence.tenantId ||
      consent.recurrenceId !== recurrence.id) throw new Error('CONSENT_NOT_OWNED_BY_RECURRENCE');
  if (consent.status !== 'AUTHORIZED' || !consent.externalAdhesionId ||
      !consent.verifiedAt || Number.isNaN(Date.parse(consent.verifiedAt))) {
    throw new Error('BANK_CONSENT_NOT_VERIFIED');
  }
  if (recurrence.amountCents > consent.maxPaymentCents) throw new Error('CONSENT_AMOUNT_LIMIT_EXCEEDED');
  if (recurrence.dueDate < recurrence.startsOn ||
      (recurrence.endsOn && recurrence.dueDate > recurrence.endsOn)) {
    throw new Error('CYCLE_OUTSIDE_CONTRACT_PERIOD');
  }
}

export function toEfiOpenFinanceAutomaticPayment(
  recurrence: NextgenRecurrenceSnapshot,
  consent: VerifiedConsentSnapshot,
  cityIbge?: string
) {
  assertConsentEligibleForCycle(recurrence, consent);
  if (cityIbge && !/^\d{7}$/.test(cityIbge)) throw new Error('INVALID_IBGE_CODE');
  return {
    identificadorAdesao: consent.externalAdhesionId!,
    pagamento: {
      valor: centsToEfi(recurrence.amountCents),
      data: recurrence.dueDate,
      ...(cityIbge ? { codigoCidadeIBGE: cityIbge } : {}),
      infoPagador: recurrence.title
    }
  };
}

/** Stable key for DB uniqueness per due-date cycle. Actual idempotency requires a UNIQUE DB constraint + transaction lock. */
export function recurrenceCycleKey(r: NextgenRecurrenceSnapshot): string {
  requireBoundedRecurrence(r);
  const competence = r.dueDate;
  return createHash('sha256').update(`${r.tenantId}|efi-auto|${r.id}|${competence}`).digest('hex');
}
