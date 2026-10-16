/**
 * NextGen native Pix Automático — pure domain rules, NO bank/API calls.
 * NOT production-enabled. A VERIFIED consent must come from an independently
 * authenticated bank/Open Finance event handled by a future regulated adapter.
 */
export type MandateStatus =
  | 'DRAFT'
  | 'AUTHORIZATION_PENDING'
  | 'AUTHORIZED'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'REVOKED'
  | 'EXPIRED';

export type MandateFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'ANNUALLY';

export type MandateEvent =
  | 'REQUEST_AUTHORIZATION'
  | 'BANK_AUTHORIZATION_CONFIRMED'
  | 'BANK_AUTHORIZATION_REJECTED'
  | 'SUSPEND'
  | 'RESUME'
  | 'BANK_REVOKED'
  | 'EXPIRE';

export interface NativeMandate {
  id: string;
  tenantId: string;
  status: MandateStatus;
  frequency: MandateFrequency;
  amountCapCents: number;
  startsOn: string;  // YYYY-MM-DD
  endsOn?: string | null;
  bankAuthorizationRef?: string | null;
}

export interface VerifiedBankAuthorization {
  /** Must ONLY be constructed by the future verified bank event adapter. */
  verified: true;
  externalAuthorizationId: string;
  verifiedAt: string;
}

const transitions: Record<MandateStatus, Partial<Record<MandateEvent, MandateStatus>>> = {
  DRAFT: { REQUEST_AUTHORIZATION: 'AUTHORIZATION_PENDING' },
  AUTHORIZATION_PENDING: {
    BANK_AUTHORIZATION_CONFIRMED: 'AUTHORIZED',
    BANK_AUTHORIZATION_REJECTED: 'REJECTED',
    BANK_REVOKED: 'REVOKED',
    EXPIRE: 'EXPIRED'
  },
  AUTHORIZED: { SUSPEND: 'SUSPENDED', BANK_REVOKED: 'REVOKED', EXPIRE: 'EXPIRED' },
  SUSPENDED: { RESUME: 'AUTHORIZED', BANK_REVOKED: 'REVOKED', EXPIRE: 'EXPIRED' },
  REJECTED: {},
  REVOKED: {},
  EXPIRED: {}
};

export function transitionMandate(
  mandate: NativeMandate,
  event: MandateEvent,
  bankEvidence?: VerifiedBankAuthorization
): NativeMandate {
  const next = transitions[mandate.status]?.[event];
  if (!next) throw new Error(`INVALID_MANDATE_TRANSITION:${mandate.status}:${event}`);

  if (event === 'BANK_AUTHORIZATION_CONFIRMED') {
    if (bankEvidence?.verified !== true || !bankEvidence.externalAuthorizationId?.trim() ||
        !Number.isFinite(Date.parse(bankEvidence.verifiedAt))) {
      throw new Error('VERIFIED_BANK_AUTHORIZATION_REQUIRED');
    }
  }

  if (event === 'RESUME' && !mandate.bankAuthorizationRef) {
    throw new Error('BANK_AUTHORIZATION_REFERENCE_REQUIRED');
  }
  return {
    ...mandate,
    status: next,
    bankAuthorizationRef: event === 'BANK_AUTHORIZATION_CONFIRMED'
      ? bankEvidence!.externalAuthorizationId
      : mandate.bankAuthorizationRef
  };
}

export function assertCycleEligible(
  mandate: NativeMandate,
  amountCents: number,
  dueOn: string
): void {
  if (mandate.status !== 'AUTHORIZED' || !mandate.bankAuthorizationRef) {
    throw new Error('ACTIVE_VERIFIED_MANDATE_REQUIRED');
  }
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > mandate.amountCapCents) {
    throw new Error('INVALID_OR_EXCEEDING_CYCLE_AMOUNT');
  }
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(dueOn) || !iso.test(mandate.startsOn) ||
      dueOn < mandate.startsOn || (mandate.endsOn && dueOn > mandate.endsOn)) {
    throw new Error('CYCLE_OUTSIDE_MANDATE_PERIOD');
  }
  // Frequency/settlement calendars and legal payment windows belong to the
  // regulated scheduler; this guard is necessary but not sufficient.
}

export function recurrenceCycleKey(tenantId: string, mandateId: string, period: string): string {
  if (!tenantId || !mandateId || !/^\d{4}-\d{2}$/.test(period)) {
    throw new Error('INVALID_CYCLE_KEY');
  }
  return [tenantId, mandateId, period].map((part) => encodeURIComponent(part)).join(':');
}
