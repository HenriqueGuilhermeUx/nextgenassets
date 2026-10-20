import {
  assertConsentEligibleForCycle,
  recurrenceCycleKey,
  toEfiOpenFinanceAdhesion,
  toEfiOpenFinanceAutomaticPayment,
  NextgenRecurrenceSnapshot,
  VerifiedConsentSnapshot
} from './efi-automatic-recurrence.bridge';

const rec: NextgenRecurrenceSnapshot = {
  id: 'rec-test',
  tenantId: 'company-a',
  partnerId: 'partner-a',
  customerId: 'customer-a',
  title: 'Mensalidade demonstrativa',
  amountCents: 1000,
  frequency: 'MONTHLY',
  dueDate: '2026-11-10',
  startsOn: '2026-11-01',
  endsOn: '2027-10-31',
  status: 'ACTIVE'
};

const verified: VerifiedConsentSnapshot = {
  recurrenceId: rec.id,
  tenantId: rec.tenantId,
  status: 'AUTHORIZED',
  externalAdhesionId: 'urn:efi:demo-verified',
  verifiedAt: '2026-10-15T16:00:00.000Z',
  maxPaymentCents: 1000,
  allowRetry: false
};

describe('Efí auto-pay bridge for existing NextGen recurring contracts', () => {
  it('builds a consent request without banking side effects', () => {
    const payload = toEfiOpenFinanceAdhesion(rec, {
      cpf: '00000000000', name: 'Pagador de teste', participantId: 'bank-demo'
    }, {
      name: 'Empresa recebedora teste',
      document: '00000000000000',
      bankCode: '00000000',
      agency: '0001',
      account: '1001',
      accountType: 'TRAN'
    });
    expect(payload.assinatura.configuracao.automatico.intervalo).toBe('MENSAL');
    expect(payload.assinatura.configuracao.automatico.valorFixo).toBe('10.00');
    expect(payload.assinatura.idProprio).toBe('nextgen-rec-test');
  });

  it('never initiates without a verified bank consent', () => {
    expect(() => assertConsentEligibleForCycle(rec, {...verified, status:'PENDING'})).toThrow('BANK_CONSENT_NOT_VERIFIED');
    expect(() => assertConsentEligibleForCycle(rec, {...verified, verifiedAt:undefined})).toThrow('BANK_CONSENT_NOT_VERIFIED');
  });

  it('rejects cross-tenant, excess value and expired contract', () => {
    expect(() => assertConsentEligibleForCycle(rec, {...verified, tenantId:'company-b'})).toThrow('CONSENT_NOT_OWNED_BY_RECURRENCE');
    expect(() => assertConsentEligibleForCycle(rec, {...verified, maxPaymentCents:999})).toThrow('CONSENT_AMOUNT_LIMIT_EXCEEDED');
    expect(() => assertConsentEligibleForCycle({...rec, dueDate:'2028-01-10'}, verified)).toThrow('CYCLE_OUTSIDE_CONTRACT_PERIOD');
  });

  it('maps authorized cycles to Efí payment payload', () => {
    const payload = toEfiOpenFinanceAutomaticPayment(rec, verified, '3550308');
    expect(payload.identificadorAdesao).toBe('urn:efi:demo-verified');
    expect(payload.pagamento.valor).toBe('10.00');
    expect(payload.pagamento.data).toBe('2026-11-10');
  });

  it('uses stable and distinct idempotency keys per due date', () => {
    expect(recurrenceCycleKey(rec)).toBe(recurrenceCycleKey({...rec}));
    expect(recurrenceCycleKey({...rec, dueDate:'2026-11-17'})).not.toBe(recurrenceCycleKey(rec));
    expect(recurrenceCycleKey({...rec, tenantId:'company-b'})).not.toBe(recurrenceCycleKey(rec));
  });

  it('rejects suspended recurrence', () => {
    expect(() => toEfiOpenFinanceAutomaticPayment({...rec, status:'PAUSED'}, verified)).toThrow('RECURRENCE_NOT_ACTIVE');
  });
});
