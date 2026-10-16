import { EfiOFService } from './efi-of.service';

const request = {
  adhesionId: 'urn:efi:test-authorization',
  amountCents: 35000,
  dueDate: '2026-11-10',
  idempotencyKey: 'a'.repeat(64),
  description: 'Monthly test'
};

describe('Efí automatic Pix sandbox sender - safe no-network unit tests', () => {
  const original = {
    NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS: process.env.NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS,
    EFI_OF_API_URL: process.env.EFI_OF_API_URL,
    EFI_OAUTH_URL: process.env.EFI_OAUTH_URL
  };
  afterEach(() => {
    for (const [k, v] of Object.entries(original)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    jest.restoreAllMocks();
  });

  it('fails closed if sandbox payment dispatch is not enabled', async () => {
    delete process.env.NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS;
    process.env.EFI_OF_API_URL = 'https://openfinance-h.api.efipay.com.br';
    await expect(new EfiOFService().sendAutomaticPaymentSandbox(request))
      .rejects.toThrow('EFI_SANDBOX_PAYMENTS_DISABLED');
  });

  it('refuses production host even if operator enables sandbox flag', async () => {
    process.env.NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS = 'true';
    process.env.EFI_OF_API_URL = 'https://openfinance.api.efipay.com.br';
    await expect(new EfiOFService().sendAutomaticPaymentSandbox(request))
      .rejects.toThrow('EFI_SANDBOX_PAYMENTS_DISABLED');
  });

  it('submits in sandbox and never claims to have settled', async () => {
    process.env.NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS = 'true';
    process.env.EFI_OF_API_URL = 'https://openfinance-h.api.efipay.com.br';
    const service = new EfiOFService();
    jest.spyOn(service, 'ensureToken').mockResolvedValue('TEST_ONLY_TOKEN');
    const spy = jest.spyOn(service as any, 'mTLSRequest').mockResolvedValue({
      status: 200,
      data: { identificadorAdesao: request.adhesionId, status: 'pendente', endToEndId: 'TEST_REF' }
    });
    const response = await service.sendAutomaticPaymentSandbox(request);
    expect(response).toEqual({ status: 'pendente', endToEndId: 'TEST_REF' });
    const opts = spy.mock.calls[0][0];
    expect(opts.path).toBe('/v1/pagamentos-automaticos/pix');
    expect(opts.extraHeaders['x-idempotency-key']).toBe(request.idempotencyKey);
    expect(opts.body.pagamento.valor).toBe('350.00');
  });

  it('rejects mismatching bank response and invalid dates', async () => {
    process.env.NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS = 'true';
    process.env.EFI_OF_API_URL = 'https://openfinance-h.api.efipay.com.br';
    const service = new EfiOFService();
    jest.spyOn(service, 'ensureToken').mockResolvedValue('TEST_ONLY_TOKEN');
    jest.spyOn(service as any, 'mTLSRequest').mockResolvedValue({
      status: 200, data: { identificadorAdesao: 'urn:efi:another', status: 'pendente' }
    });
    await expect(service.sendAutomaticPaymentSandbox(request))
      .rejects.toThrow('EFI_AUTOMATIC_PAYMENT_UNVERIFIED_RESPONSE');
    await expect(service.sendAutomaticPaymentSandbox({...request, dueDate:'tomorrow'}))
      .rejects.toThrow('INVALID_EFI_AUTOMATIC_PAYMENT_REQUEST');
  });
});
