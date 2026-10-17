import { EfiOFWebhookReceiverController } from './efi-of-webhook-receiver.controller';
import { Logger } from '@nestjs/common';

describe('Efí Open Finance callback HMAC', () => {
  const previous = process.env.EFI_OF_WEBHOOK_HMAC;
  const key = 'L9aR7yT8mB2dV4pN6wE3hJ5zX1qS0cF8K2vM';
  afterEach(() => {
    if (previous === undefined) delete process.env.EFI_OF_WEBHOOK_HMAC;
    else process.env.EFI_OF_WEBHOOK_HMAC = previous;
  });

  function verify(hmac?: string) {
    const ctrl = new EfiOFWebhookReceiverController() as any;
    return ctrl.assertHmac({ query: hmac ? { hmac } : {} });
  }

  it('fails closed without server configuration', () => {
    delete process.env.EFI_OF_WEBHOOK_HMAC;
    expect(() => verify(key)).toThrow('EFI_WEBHOOK_AUTH_NOT_CONFIGURED');
  });

  it('rejects sample values and invalid signatures', () => {
    process.env.EFI_OF_WEBHOOK_HMAC = 'SUBSTITUA_POR_HMAC_FORTE_NO_RENDER';
    expect(() => verify('SUBSTITUA_POR_HMAC_FORTE_NO_RENDER')).toThrow('EFI_WEBHOOK_AUTH_NOT_CONFIGURED');
    process.env.EFI_OF_WEBHOOK_HMAC = key;
    expect(() => verify()).toThrow('INVALID_EFI_WEBHOOK_AUTH');
    expect(() => verify('X'.repeat(key.length))).toThrow('INVALID_EFI_WEBHOOK_AUTH');
  });

  it('accepts only the matching configured value', () => {
    process.env.EFI_OF_WEBHOOK_HMAC = key;
    expect(() => verify(key)).not.toThrow();
  });

  it('rejects unsigned callbacks before attempting to process their payload', async () => {
    process.env.EFI_OF_WEBHOOK_HMAC = key;
    const ctrl = new EfiOFWebhookReceiverController();
    await expect(ctrl.handle({ event: 'payment.completed' }, { query: {} } as any))
      .rejects.toThrow('INVALID_EFI_WEBHOOK_AUTH');
  });

  it('does not reflect malformed events or personal data in callback logs', async () => {
    process.env.EFI_OF_WEBHOOK_HMAC = key;
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    try {
      const ctrl = new EfiOFWebhookReceiverController();
      const result = await ctrl.handle(
        { event: 'unknown.event\\ncpf=12345678901', cpf: '12345678901' },
        { query: { hmac: key } } as any
      );
      expect(result.event).toBe('unknown');
      expect(log.mock.calls.flat().join(' ')).not.toContain('12345678901');
      expect(log).toHaveBeenCalledWith('Efí OF webhook received');
    } finally {
      log.mockRestore();
    }
  });
});
