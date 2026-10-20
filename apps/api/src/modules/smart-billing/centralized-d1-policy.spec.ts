import {
  dateInSaoPaulo, nextVerifiedBankBusinessDay, scheduleCentralizedD1,
  ConfirmedCentralReceipt, BankBusinessCalendar
} from './centralized-d1-policy';

const calendar: BankBusinessCalendar = {
  coverageThrough: '2027-12-31',
  holidayDates: ['2026-10-12', '2026-11-02', '2026-12-25'],
  source: 'VERIFIED_BANK_CALENDAR'
};
const receipt: ConfirmedCentralReceipt = {
  partnerId: 'company-test', sourcePaymentId: 'incoming-e2e-test',
  grossAmountCents: 10000, providerFeesCents: 51, retainedFeesCents: 0,
  bankIncomingPixVerified: true,
  bankSettledAt: '2026-10-16T15:00:00.000Z',
  reconciledAt: '2026-10-16T15:10:00.000Z',
  complianceHold: false
};

describe('NextGen centralized Pix D+1 policy: never credit without bank confirmation', () => {
  it('plans next working day after Friday for a confirmed and reconciled Pix', () => {
    expect(scheduleCentralizedD1(receipt,calendar)).toEqual({
      status: 'ELIGIBLE_FOR_SCHEDULING', amountCents: 9949,
      baseBusinessDate: '2026-10-16', scheduledBusinessDate: '2026-10-19',
      explanation: expect.stringContaining('Pix OUT')
    });
  });
  it('counts bank holidays and weekends, never calendar days', () => {
    expect(nextVerifiedBankBusinessDay('2026-10-09',calendar)).toBe('2026-10-13');
    const mondayReceipt = {
      ...receipt,
      bankSettledAt: '2026-11-02T15:00:00.000Z',
      reconciledAt: '2026-11-02T15:01:00.000Z'
    };
    const scheduled = scheduleCentralizedD1(mondayReceipt,calendar);
    expect(scheduled.baseBusinessDate).toBe('2026-11-03');
    expect(scheduled.scheduledBusinessDate).toBe('2026-11-04');
  });
  it('uses Sao Paulo business date rather than raw UTC date', () => {
    expect(dateInSaoPaulo('2026-10-17T01:30:00.000Z')).toBe('2026-10-16');
  });
  it('blocks when the Pix is unconfirmed or not yet reconciled', () => {
    expect(scheduleCentralizedD1({...receipt,bankIncomingPixVerified:false},calendar).status)
      .toBe('BLOCKED_NO_BANK_RECEIPT');
    expect(scheduleCentralizedD1({...receipt,reconciledAt:null},calendar).status)
      .toBe('BLOCKED_NOT_RECONCILED');
    expect(scheduleCentralizedD1({...receipt,complianceHold:true},calendar).status)
      .toBe('BLOCKED_COMPLIANCE_HOLD');
    expect(scheduleCentralizedD1({
      ...receipt,reconciledAt:'2026-10-16T14:55:00.000Z'
    },calendar).status).toBe('BLOCKED_NOT_RECONCILED');
  });
  it('does not promise D+1 without calendar coverage', () => {
    const shortCalendar: BankBusinessCalendar = {
      ...calendar,coverageThrough:'2026-10-16'
    };
    expect(scheduleCentralizedD1(receipt,shortCalendar).status).toBe('BLOCKED_BANK_CALENDAR');
  });
  it('rejects overspending and invalid value fields', () => {
    expect(() => scheduleCentralizedD1({...receipt,providerFeesCents:11000},calendar))
      .toThrow('INVALID_RECEIPT_AMOUNTS_OR_IDENTITY');
    expect(() => nextVerifiedBankBusinessDay('2026-02-30',calendar))
      .toThrow('INVALID_BANK_CALENDAR_DATE');
  });
  it('does not count late reconciliation as an earlier D', () => {
    const delayed= scheduleCentralizedD1({...receipt,reconciledAt:'2026-10-19T12:00:00.000Z'},calendar);
    expect(delayed.baseBusinessDate).toBe('2026-10-19');
    expect(delayed.scheduledBusinessDate).toBe('2026-10-20');
  });
});
