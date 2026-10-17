import { GUARDS_METADATA } from '@nestjs/common/constants';
import { EfiOperationsGuard } from './efi-operations.guard';
import { EfiOFAdminController } from './efi-of-admin.controller';
import { EfiOFDebugController } from './efi-of-debug.controller';
import { EfiOFService } from './efi-of.service';
import { EfiOFWebhookReceiverController } from './efi-of-webhook-receiver.controller';
import { EfiWebhookPublicController } from './efi-webhook-public.controller';
import { EfiOFWebhookController } from './efi-of-webhook.controller';

describe('Efí real: safe authentication and callback contract', () => {
  const originalOf = process.env.EFI_OF_WEBHOOK_HMAC;
  const originalPix = process.env.EFI_PIX_WEBHOOK_HMAC;
  afterEach(() => {
    if (originalOf === undefined) delete process.env.EFI_OF_WEBHOOK_HMAC;
    else process.env.EFI_OF_WEBHOOK_HMAC = originalOf;
    if (originalPix === undefined) delete process.env.EFI_PIX_WEBHOOK_HMAC;
    else process.env.EFI_PIX_WEBHOOK_HMAC = originalPix;
  });

  it('requires guard on administrative money-moving endpoints', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, EfiOFAdminController)).toContain(EfiOperationsGuard);
    for (const method of ['health', 'certCheck', 'testTokenBrowser', 'participants',
      'participantsEfi', 'getOpenFinanceConfig', 'putOpenFinanceConfig', 'testToken', 'testConsent']) {
      expect(Reflect.getMetadata(GUARDS_METADATA, EfiOFDebugController.prototype[method])).toContain(EfiOperationsGuard);
    }
    expect(Reflect.getMetadata(GUARDS_METADATA, EfiOFDebugController.prototype.returnFromOpenFinance)).toBeUndefined();
  });

  it('does not reflect browser callback credentials', () => {
    const reply = new EfiOFDebugController({} as EfiOFService).returnFromOpenFinance();
    expect(reply.bankAuthorizationConfirmed).toBe(false);
    expect(JSON.stringify(reply)).not.toMatch(/access_token|authorization_code|state=/i);
  });

  it('does not reflect bank OAuth token prefixes', async () => {
    const service = new EfiOFService();
    jest.spyOn(service, 'refreshToken').mockResolvedValue('BANK_ACCESS_TOKEN_PRIVATE');
    expect(await service.testConnection()).toEqual({ ok: true });
  });

  it('blocks unsigned Pix and Open Finance callbacks', async () => {
    process.env.EFI_PIX_WEBHOOK_HMAC = 'p'.repeat(40);
    process.env.EFI_OF_WEBHOOK_HMAC = 'o'.repeat(40);
    await expect(new EfiWebhookPublicController().handle({ pix: [] }, { query: {} } as any))
      .rejects.toThrow('EFI_PIX_CALLBACK_UNAUTHORIZED');
    await expect(new EfiOFWebhookReceiverController().handle({}, { query: {} } as any))
      .rejects.toThrow('EFI_OF_CALLBACK_UNAUTHORIZED');
    await expect(new EfiOFWebhookController().handle({}, { query: {} } as any))
      .rejects.toThrow('EFI_OF_CALLBACK_UNAUTHORIZED');
  });

  it('fails closed when callback keys are missing', async () => {
    delete process.env.EFI_PIX_WEBHOOK_HMAC;
    delete process.env.EFI_OF_WEBHOOK_HMAC;
    await expect(new EfiWebhookPublicController().handle({}, { query: {} } as any))
      .rejects.toThrow('EFI_PIX_CALLBACK_SECRET_NOT_CONFIGURED');
    await expect(new EfiOFWebhookReceiverController().handle({}, { query: {} } as any))
      .rejects.toThrow('EFI_OF_CALLBACK_SECRET_NOT_CONFIGURED');
  });
});
