import {
  assertCycleEligible,
  recurrenceCycleKey,
  transitionMandate,
  NativeMandate
} from './mandate-state';

const base: NativeMandate = {
  id: 'mandate-1',
  tenantId: 'company-a',
  status: 'DRAFT',
  frequency: 'MONTHLY',
  amountCapCents: 5000,
  startsOn: '2026-11-01',
  endsOn: '2027-10-31'
};

describe('NextGen native automatic Pix domain safety', () => {
  it('starts pending, not authorized', () => {
    expect(transitionMandate(base, 'REQUEST_AUTHORIZATION').status).toBe('AUTHORIZATION_PENDING');
    expect(() => assertCycleEligible(base, 1000, '2026-11-10')).toThrow('ACTIVE_VERIFIED_MANDATE_REQUIRED');
  });

  it('never approves without verified bank evidence', () => {
    const pending = transitionMandate(base, 'REQUEST_AUTHORIZATION');
    expect(() => transitionMandate(pending, 'BANK_AUTHORIZATION_CONFIRMED')).toThrow('VERIFIED_BANK_AUTHORIZATION_REQUIRED');
  });

  it('allows an authorized cycle inside amount and dates', () => {
    const pending = transitionMandate(base, 'REQUEST_AUTHORIZATION');
    const approved = transitionMandate(pending, 'BANK_AUTHORIZATION_CONFIRMED', {
      verified: true,
      externalAuthorizationId: 'verified-bank-ref',
      verifiedAt: '2026-10-15T20:00:00.000Z'
    });
    expect(approved.status).toBe('AUTHORIZED');
    expect(() => assertCycleEligible(approved, 4900, '2026-11-10')).not.toThrow();
    expect(() => assertCycleEligible(approved, 5100, '2026-11-10')).toThrow('INVALID_OR_EXCEEDING_CYCLE_AMOUNT');
    expect(() => assertCycleEligible(approved, 4900, '2028-11-10')).toThrow('CYCLE_OUTSIDE_MANDATE_PERIOD');
  });

  it('rejects cycles after revocation', () => {
    const pending = transitionMandate(base, 'REQUEST_AUTHORIZATION');
    const approved = transitionMandate(pending, 'BANK_AUTHORIZATION_CONFIRMED', {
      verified: true,
      externalAuthorizationId: 'verified-bank-ref',
      verifiedAt: '2026-10-15T20:00:00.000Z'
    });
    const revoked = transitionMandate(approved, 'BANK_REVOKED');
    expect(() => assertCycleEligible(revoked, 1000, '2026-11-10')).toThrow('ACTIVE_VERIFIED_MANDATE_REQUIRED');
    expect(() => transitionMandate(revoked, 'RESUME')).toThrow('INVALID_MANDATE_TRANSITION');
  });

  it('does not accept bank approval after rejected', () => {
    const rejected = transitionMandate(transitionMandate(base, 'REQUEST_AUTHORIZATION'), 'BANK_AUTHORIZATION_REJECTED');
    expect(() => transitionMandate(rejected, 'BANK_AUTHORIZATION_CONFIRMED')).toThrow('INVALID_MANDATE_TRANSITION');
  });

  it('builds stable cycle key for database uniqueness', () => {
    expect(recurrenceCycleKey('company-a', 'mandate-1', '2026-11')).toBe('company-a:mandate-1:2026-11');
    expect(() => recurrenceCycleKey('company-a', 'mandate-1', 'Nov/2026')).toThrow('INVALID_CYCLE_KEY');
  });
});
