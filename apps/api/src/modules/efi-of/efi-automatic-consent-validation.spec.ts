import { assertVerifiedEfiAdhesionMatches, parseVerifiedEfiAdhesion } from './efi-automatic-consent-validation';

const officialResponse = {
  identificadorAdesao: 'urn:efi:verified-test-only',
  status: 'autorizado',
  favorecido: { contaBanco: {
    documento: '00000000000000',
    codigoBanco: '00000000',
    agencia: '0001',
    conta: '9999'
  }},
  assinatura: {
    idProprio: 'nextgen-recurrence-test',
    expiracao: '2027-11-10',
    configuracao: { automatico: {
      valorFixo: '350.00',
      intervalo: 'MENSAL',
      dataInicio: '2026-11-10'
    }}
  }
};

describe('Efí bank-verified automatic payment terms', () => {
  const expected = () => {
    const terms = parseVerifiedEfiAdhesion(officialResponse);
    return {
      providerId: terms.providerId,
      localReference: terms.localReference,
      amountCents: terms.amountCents,
      interval: terms.interval,
      startsOn: terms.startsOn,
      expiresOn: terms.expiresOn,
      beneficiaryFingerprint: terms.beneficiaryFingerprint
    };
  };

  it('extracts only amount and fingerprint, not banking details', () => {
    const terms = parseVerifiedEfiAdhesion(officialResponse);
    expect(terms.amountCents).toBe(35000);
    expect(terms.status).toBe('autorizado');
    expect(JSON.stringify(terms)).not.toContain('9999');
    expect(() => assertVerifiedEfiAdhesionMatches(terms, expected())).not.toThrow();
  });

  it('does not accept amount or beneficiary changes', () => {
    const changedAmount = structuredClone(officialResponse);
    changedAmount.assinatura.configuracao.automatico.valorFixo = '700.00';
    expect(() => assertVerifiedEfiAdhesionMatches(
      parseVerifiedEfiAdhesion(changedAmount), expected()
    )).toThrow('EFI_BANK_AUTHORIZATION_TERMS_MISMATCH');

    const changedBank = structuredClone(officialResponse);
    changedBank.favorecido.contaBanco.conta = '8888';
    expect(() => assertVerifiedEfiAdhesionMatches(
      parseVerifiedEfiAdhesion(changedBank), expected()
    )).toThrow('EFI_BANK_AUTHORIZATION_TERMS_MISMATCH');
  });

  it('rejects recurrence, period and interval mismatches', () => {
    for (const overrides of [
      { localReference: 'nextgen-another' },
      { startsOn: '2027-01-01' },
      { expiresOn: '2028-01-01' },
      { interval: 'SEMANAL' }
    ]) {
      expect(() => assertVerifiedEfiAdhesionMatches(
        parseVerifiedEfiAdhesion(officialResponse), {...expected(), ...overrides}
      )).toThrow('EFI_BANK_AUTHORIZATION_TERMS_MISMATCH');
    }
  });

  it('rejects missing or imprecise bank evidence', () => {
    const changed = structuredClone(officialResponse);
    changed.assinatura.configuracao.automatico.valorFixo = '350.001';
    expect(() => parseVerifiedEfiAdhesion(changed)).toThrow('EFI_VERIFIED_ADHESION_TERMS_INCOMPLETE');
    delete (changed.favorecido.contaBanco as any).conta;
    expect(() => parseVerifiedEfiAdhesion(changed)).toThrow('EFI_VERIFIED_ADHESION_TERMS_INCOMPLETE');
  });
});
