/**
 * NextGen central receipt -> D+1 bank-business-day payout policy.
 * PURE FUNCTIONS ONLY. Does not execute a transfer, credit a balance or
 * claim a Pix payment is settled.
 *
 * IMPORTANT: caller must supply a trusted bank holiday calendar with
 * coverage through the chosen payout date; never silently ignore holidays.
 */
export interface BankBusinessCalendar {
  coverageThrough: string; // inclusive YYYY-MM-DD
  holidayDates: readonly string[]; // São Paulo / Brazilian bank holidays
  source: 'BANK' | 'VERIFIED_BANK_CALENDAR';
}

export interface ConfirmedCentralReceipt {
  partnerId: string;
  sourcePaymentId: string;
  grossAmountCents: number;
  providerFeesCents: number;
  retainedFeesCents: number;
  /** Actual incoming Pix bank settlement proof, NOT an HTTP 'accepted' status. */
  bankIncomingPixVerified: boolean;
  /** Independently verified incoming-bank settlement instant. */
  bankSettledAt?: string | null;
  /** Timestamp when the bank receipt was allocated to this partner in ledger. */
  reconciledAt?: string | null;
  /** A hold means no payout even when the scheduled date is reached. */
  complianceHold: boolean;
}

export interface PayoutSchedule {
  status: 'BLOCKED_NO_BANK_RECEIPT' | 'BLOCKED_NOT_RECONCILED' |
    'BLOCKED_COMPLIANCE_HOLD' | 'BLOCKED_BANK_CALENDAR' | 'ELIGIBLE_FOR_SCHEDULING';
  amountCents?: number;
  baseBusinessDate?: string;
  scheduledBusinessDate?: string;
  explanation: string;
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
function parseCalendarDate(s: string): void {
  if (!isoDate.test(s) || new Date(s + 'T12:00:00.000Z').toISOString().slice(0, 10) !== s) {
    throw new Error('INVALID_BANK_CALENDAR_DATE');
  }
}
export function dateInSaoPaulo(timestamp: string): string {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) throw new Error('INVALID_EVENT_TIMESTAMP');
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}
function nextDate(day: string): string {
  const atNoonUTC = new Date(day + 'T12:00:00.000Z');
  atNoonUTC.setUTCDate(atNoonUTC.getUTCDate() + 1);
  return atNoonUTC.toISOString().slice(0, 10);
}
function business(day: string, holidays: Set<string>): boolean {
  const weekday = new Date(day + 'T12:00:00.000Z').getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.has(day);
}
/** A date outside verified calendar coverage is NOT assumed to be a banking day. */
export function nextVerifiedBankBusinessDay(
  day: string,
  calendar: BankBusinessCalendar,
  includeDay = false
): string | null {
  parseCalendarDate(day);
  parseCalendarDate(calendar.coverageThrough);
  if (!['BANK','VERIFIED_BANK_CALENDAR'].includes(calendar.source)) {
    throw new Error('UNTRUSTED_BANK_CALENDAR');
  }
  const holidays = new Set(calendar.holidayDates);
  for (const h of holidays) parseCalendarDate(h);
  let current = includeDay ? day : nextDate(day);
  for (let attempts=0; attempts<370 && current<=calendar.coverageThrough; attempts++) {
    if (business(current, holidays)) return current;
    current=nextDate(current);
  }
  return null;
}

/**
 * D is the first *bank business day* on/after both bank settlement and
 * operational reconciliation. D+1 is the following bank business day.
 * This determines a payout PLAN ONLY, not evidence of credited transfer.
 */
export function scheduleCentralizedD1(
  receipt: ConfirmedCentralReceipt,
  calendar: BankBusinessCalendar
): PayoutSchedule {
  if (!receipt.partnerId || !receipt.sourcePaymentId ||
      !Number.isSafeInteger(receipt.grossAmountCents) || receipt.grossAmountCents <= 0 ||
      !Number.isSafeInteger(receipt.providerFeesCents) || receipt.providerFeesCents < 0 ||
      !Number.isSafeInteger(receipt.retainedFeesCents) || receipt.retainedFeesCents < 0 ||
      receipt.grossAmountCents <= receipt.providerFeesCents + receipt.retainedFeesCents) {
    throw new Error('INVALID_RECEIPT_AMOUNTS_OR_IDENTITY');
  }
  if (!receipt.bankIncomingPixVerified || !receipt.bankSettledAt) {
    return {status:'BLOCKED_NO_BANK_RECEIPT',
      explanation:'Sem comprovação de Pix liquidado e recebido na conta NextGen.'};
  }
  if (!receipt.reconciledAt) {
    return {status:'BLOCKED_NOT_RECONCILED',
      explanation:'Pagamento recebido, mas ainda não conciliado com a empresa.'};
  }
  if (receipt.complianceHold) {
    return {status:'BLOCKED_COMPLIANCE_HOLD',
      explanation:'Repasse suspenso para verificação operacional ou de segurança.'};
  }
  const settledDate = dateInSaoPaulo(receipt.bankSettledAt);
  const reconciledDate = dateInSaoPaulo(receipt.reconciledAt);
  if (new Date(receipt.reconciledAt).getTime() < new Date(receipt.bankSettledAt).getTime()) {
    return {status:'BLOCKED_NOT_RECONCILED',
      explanation:'Data de conciliação anterior à confirmação bancária.'};
  }
  const laterDate = settledDate > reconciledDate ? settledDate : reconciledDate;
  const base = nextVerifiedBankBusinessDay(laterDate, calendar, true);
  const d1 = base && nextVerifiedBankBusinessDay(base, calendar);
  if (!base || !d1) {
    return {status:'BLOCKED_BANK_CALENDAR',
      explanation:'Calendário de dias úteis bancários não validado para o período do repasse.'};
  }
  return {
    status:'ELIGIBLE_FOR_SCHEDULING',
    amountCents: receipt.grossAmountCents-receipt.providerFeesCents-receipt.retainedFeesCents,
    baseBusinessDate:base,
    scheduledBusinessDate:d1,
    explanation:'Repasse planejável em D+1 útil; execução e crédito dependem de confirmação do Pix OUT.'
  };
}
