import { EfiOperationsGuard } from './efi-operations.guard';

describe('Efí operations admin authentication', () => {
  const original = process.env.NEXTGEN_ADMIN_TOKEN;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXTGEN_ADMIN_TOKEN;
    else process.env.NEXTGEN_ADMIN_TOKEN = original;
  });

  const request = (header?: string): any => ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: header ? { 'x-nextgen-admin-token': header } : {} })
    })
  });

  it('fails closed without secret configured', () => {
    delete process.env.NEXTGEN_ADMIN_TOKEN;
    expect(() => new EfiOperationsGuard().canActivate(request('any'))).toThrow('EFI_OPERATIONS_AUTH_NOT_CONFIGURED');
  });

  it('does not accept short admin secrets', () => {
    process.env.NEXTGEN_ADMIN_TOKEN = 'short';
    expect(() => new EfiOperationsGuard().canActivate(request('short'))).toThrow('EFI_OPERATIONS_AUTH_NOT_CONFIGURED');
  });

  it('rejects requests without a valid header', () => {
    process.env.NEXTGEN_ADMIN_TOKEN = '1'.repeat(40);
    expect(() => new EfiOperationsGuard().canActivate(request())).toThrow('UNAUTHORIZED_EFI_OPERATIONS');
    expect(() => new EfiOperationsGuard().canActivate(request('2'.repeat(40)))).toThrow('UNAUTHORIZED_EFI_OPERATIONS');
  });

  it('accepts exact internal header token', () => {
    process.env.NEXTGEN_ADMIN_TOKEN = '1'.repeat(40);
    expect(new EfiOperationsGuard().canActivate(request('1'.repeat(40)))).toBe(true);
  });
});
