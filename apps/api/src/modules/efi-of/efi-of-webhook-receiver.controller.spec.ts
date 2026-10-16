import { EfiOFWebhookReceiverController } from './efi-of-webhook-receiver.controller';

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
});
