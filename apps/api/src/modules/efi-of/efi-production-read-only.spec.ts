import { GUARDS_METADATA } from '@nestjs/common/constants';
import { EfiOperationsGuard } from './efi-operations.guard';
import { EfiProductionReadOnlyController } from './efi-production-read-only.controller';
import { EfiProductionReadOnlyService } from './efi-production-read-only.service';
import { assertEfiProductionReadOnly, efiProductionReadOnlyPreflight } from './efi-production-read-only.policy';
import { EfiOFService } from './efi-of.service';

const envKeys = [
  'NEXTGEN_EFI_PRODUCTION_READ_ONLY_ENABLED','NEXTGEN_EFI_AUTOMATIC_ENABLED',
  'NEXTGEN_EFI_AUTOMATIC_SANDBOX_REQUESTS','NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS',
  'NEXTGEN_CENTRALIZED_D1_ENABLED','NEXTGEN_DISABLE_BACKGROUND_WORKERS',
  'EFI_OF_API_URL','EFI_OAUTH_URL','EFI_CLIENT_ID','EFI_CLIENT_SECRET',
  'EFI_CERTIFICATE_BASE64','EFI_P12_BASE64'
] as const;

describe('Efí real read-only isolated lookup — NO NETWORK, NO MONEY', () => {
  const original = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  const efi = { getAutomaticAdhesionOfficial: jest.fn(), getAutomaticProductionPaymentStatus: jest.fn(), createConsent: jest.fn(),
    sendAutomaticPaymentSandbox: jest.fn(), initiatePayment: jest.fn() };
  const service = new EfiProductionReadOnlyService(efi as unknown as EfiOFService);
  const args = ['urn:efi:12345678-abcd-1234-efab-123456789abc', '2026-10-19'] as const;
  beforeEach(() => {
    for (const key of envKeys) delete process.env[key];
    jest.clearAllMocks();
  });
  afterAll(() => {
    for (const key of envKeys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });
  function enableReadOnly() {
    process.env.NEXTGEN_EFI_PRODUCTION_READ_ONLY_ENABLED = 'true';
    process.env.NEXTGEN_DISABLE_BACKGROUND_WORKERS = 'true';
    process.env.EFI_OF_API_URL = 'https://openfinance.api.efipay.com.br';
    process.env.EFI_OAUTH_URL = 'https://openfinance.api.efipay.com.br/v1/oauth/token';
    process.env.EFI_CLIENT_ID = 'unit-test-only-id';
    process.env.EFI_CLIENT_SECRET = 'unit-test-only-secret';
    process.env.EFI_CERTIFICATE_BASE64 = 'X'.repeat(300);
  }

  it('is protected by internal operations authentication', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, EfiProductionReadOnlyController)).toContain(EfiOperationsGuard);
  });
  it('is opt-in; preflight never contacts the bank', () => {
    expect(efiProductionReadOnlyPreflight()).toMatchObject({
      enabled: false, authorizationVerified: false, bankingAccessExecuted: false
    });
    expect(() => assertEfiProductionReadOnly()).toThrow('EFI_PRODUCTION_READ_ONLY_DISABLED');
    expect(efi.getAutomaticAdhesionOfficial).not.toHaveBeenCalled();
  });
  it('refuses lookalike, sandbox hosts and unsafe OAuth URL', () => {
    enableReadOnly();
    process.env.EFI_OF_API_URL = 'https://openfinance.api.efipay.com.br.attacker.invalid';
    expect(() => assertEfiProductionReadOnly()).toThrow('EFI_PRODUCTION_READ_ONLY_HOST_INVALID');
    process.env.EFI_OF_API_URL = 'https://openfinance-h.api.efipay.com.br';
    expect(() => assertEfiProductionReadOnly()).toThrow('EFI_PRODUCTION_READ_ONLY_HOST_INVALID');
    process.env.EFI_OF_API_URL = 'https://openfinance.api.efipay.com.br';
    process.env.EFI_OAUTH_URL = 'https://openfinance.api.efipay.com.br.other.invalid/v1/oauth/token';
    expect(() => assertEfiProductionReadOnly()).toThrow('EFI_PRODUCTION_READ_ONLY_HOST_INVALID');
  });
  it('refuses bank lookups while workers or financial flags are enabled', () => {
    enableReadOnly();
    process.env.NEXTGEN_EFI_AUTOMATIC_ENABLED='true';
    expect(() => assertEfiProductionReadOnly()).toThrow('EFI_PRODUCTION_READ_ONLY_REQUIRES_WORKER_AND_PAYMENT_SHUTDOWN');
    process.env.NEXTGEN_EFI_AUTOMATIC_ENABLED='false';
    process.env.NEXTGEN_CENTRALIZED_D1_ENABLED='true';
    expect(() => assertEfiProductionReadOnly()).toThrow('EFI_PRODUCTION_READ_ONLY_REQUIRES_WORKER_AND_PAYMENT_SHUTDOWN');
    process.env.NEXTGEN_CENTRALIZED_D1_ENABLED='false';
    process.env.NEXTGEN_DISABLE_BACKGROUND_WORKERS='false';
    expect(() => assertEfiProductionReadOnly()).toThrow('EFI_PRODUCTION_READ_ONLY_REQUIRES_WORKER_AND_PAYMENT_SHUTDOWN');
  });
  it('refuses missing credentials and malformed requests without network access', async () => {
    enableReadOnly();
    delete process.env.EFI_CLIENT_SECRET;
    expect(() => assertEfiProductionReadOnly()).toThrow('EFI_PRODUCTION_READ_ONLY_MTLS_CREDENTIALS_MISSING');
    enableReadOnly();
    await expect(service.lookupAdhesion('not-a-valid-id', args[1])).rejects.toThrow('EFI_PRODUCTION_READ_ONLY_INVALID_LOOKUP');
    await expect(service.lookupAdhesion(args[0], '2026-02-30')).rejects.toThrow('EFI_PRODUCTION_READ_ONLY_INVALID_DATE');
    expect(efi.getAutomaticAdhesionOfficial).not.toHaveBeenCalled();
  });
  it('allows only exact readback; never writes consent, payment or balances', async () => {
    enableReadOnly();
    efi.getAutomaticAdhesionOfficial.mockResolvedValue({
      providerId: args[0], status: 'pendente',
      localReference: 'nextgen-fixture', amountCents: 1500, beneficiaryFingerprint: 'SECRET_TEST_ONLY',
      startsOn: '2026-10-19', expiresOn: '2027-10-19', interval: 'MENSAL'
    });
    const result = await service.lookupAdhesion(...args);
    expect(result).toEqual({
      success:true,bankRecordFound:true,bankReportedStatus:'pendente',
      localMandateMatched:false,anyPaymentSettled:false,
      customerRecordModified:false,instructionSent:false
    });
    expect(efi.getAutomaticAdhesionOfficial).toHaveBeenCalledTimes(1);
    expect(efi.createConsent).not.toHaveBeenCalled();
    expect(efi.sendAutomaticPaymentSandbox).not.toHaveBeenCalled();
    expect(efi.initiatePayment).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('SECRET_TEST_ONLY');
  });
  it('fails closed for unknown or untrusted bank statuses', async () => {
    enableReadOnly();
    efi.getAutomaticAdhesionOfficial.mockResolvedValue({
      providerId: args[0], status: 'authorized\\ncpf=00011122233'
    });
    await expect(service.lookupAdhesion(...args))
      .rejects.toThrow('EFI_PRODUCTION_READ_ONLY_QUERY_REQUIRES_REVIEW');
  });
  it('payment lookup is disabled by default and never calls Efí', async () => {
    await expect(service.lookupPayment({
      adhesionId: args[0], endToEndId: 'E00038166201907261559y6j6',
      requestedDate: '2026-10-19', amountCents: 199
    })).rejects.toThrow('EFI_PRODUCTION_READ_ONLY_DISABLED');
    expect(efi.getAutomaticProductionPaymentStatus).not.toHaveBeenCalled();
  });
  it('rejects invalid dates, payment identifiers and amount before bank calls', async () => {
    enableReadOnly();
    const valid = {
      adhesionId: args[0], endToEndId: 'E00038166201907261559y6j6',
      requestedDate: '2026-10-19', amountCents: 199
    };
    await expect(service.lookupPayment({...valid,requestedDate:'2026-02-30'}))
      .rejects.toThrow('EFI_PRODUCTION_READ_ONLY_PAYMENT_INVALID');
    await expect(service.lookupPayment({...valid,amountCents:0}))
      .rejects.toThrow('EFI_PRODUCTION_READ_ONLY_PAYMENT_INVALID');
    await expect(service.lookupPayment({...valid, endToEndId:'bad'}))
      .rejects.toThrow('EFI_PRODUCTION_READ_ONLY_PAYMENT_INVALID');
    expect(efi.getAutomaticProductionPaymentStatus).not.toHaveBeenCalled();
  });
  it('reads existing payment status without claiming settlement, balance credit or payout', async () => {
    enableReadOnly();
    efi.getAutomaticProductionPaymentStatus.mockResolvedValue({
      status:'aceito',endToEndId:'E00038166201907261559y6j6',hasRefunds:false
    });
    const result = await service.lookupPayment({
      adhesionId:args[0],endToEndId:'E00038166201907261559y6j6',
      requestedDate:'2026-10-19',amountCents:199
    });
    expect(result).toEqual({
      success:true,bankPaymentFound:true,exactBankReferenceAndAmountMatched:true,
      bankReportedStatus:'aceito',refundReported:false,
      bankCreditReconciled:false,settlementVerified:false,receiptCreated:false,
      payoutExecuted:false,customerRecordModified:false
    });
    expect(efi.getAutomaticProductionPaymentStatus).toHaveBeenCalledTimes(1);
    expect(efi.createConsent).not.toHaveBeenCalled();
    expect(efi.initiatePayment).not.toHaveBeenCalled();
    expect(efi.sendAutomaticPaymentSandbox).not.toHaveBeenCalled();
  });
  it('shows refunds as requiring review, never successful settlement', async () => {
    enableReadOnly();
    efi.getAutomaticProductionPaymentStatus.mockResolvedValue({
      status:'aceito',endToEndId:'E00038166201907261559y6j6',hasRefunds:true
    });
    const response = await service.lookupPayment({
      adhesionId:args[0],endToEndId:'E00038166201907261559y6j6',
      requestedDate:'2026-10-19',amountCents:199
    });
    expect(response.refundReported).toBe(true);
    expect(response.settlementVerified).toBe(false);
  });
  it('fails closed on unknown payment statuses and hides provider errors', async () => {
    enableReadOnly();
    const valid = {
      adhesionId:args[0],endToEndId:'E00038166201907261559y6j6',
      requestedDate:'2026-10-19',amountCents:199
    };
    efi.getAutomaticProductionPaymentStatus.mockResolvedValue({
      status:'accepted\\ncpf=12345678901',hasRefunds:false
    });
    await expect(service.lookupPayment(valid))
      .rejects.toThrow('EFI_PRODUCTION_READ_ONLY_PAYMENT_REQUIRES_REVIEW');
    efi.getAutomaticProductionPaymentStatus.mockRejectedValue(
      new Error('CPF=12345678901 bank token=SENSITIVE'));
    await expect(service.lookupPayment(valid))
      .rejects.toThrow('EFI_PRODUCTION_READ_ONLY_PAYMENT_REQUIRES_REVIEW');
  });
  it('redacts bank errors rather than echoing PII or raw tokens', async () => {
    enableReadOnly();
    efi.getAutomaticAdhesionOfficial.mockRejectedValue(new Error('cpf=12345678901 token=PRIVATE'));
    await expect(service.lookupAdhesion(...args))
      .rejects.toThrow('EFI_PRODUCTION_READ_ONLY_QUERY_REQUIRES_REVIEW');
  });
});
