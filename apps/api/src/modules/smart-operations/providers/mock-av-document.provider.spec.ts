import { MockAvDocumentProvider } from './mock-av-document.provider';

describe('MockAvDocumentProvider', () => {
  it('detects purchase invoice and suggests operational actions', async () => {
    const provider = new MockAvDocumentProvider();
    const result = await provider.extract({
      tenantSlug: 'nextgen-assets',
      documentText: 'DANFE NF-e\nFornecedor ABC LTDA\nCNPJ 12.345.678/0001-90\nNota 12345\nTotal R$ 10,00\nVencimento 20/09/2026'
    });

    expect(result.documentType).toBe('PURCHASE_INVOICE');
    expect(result.suggestedActions).toContain('REGISTER_PURCHASE');
    expect(result.suggestedActions).toContain('UPDATE_INVENTORY');
    expect(result.total).toBe(10);
  });

  it('detects barcode documents as accounts payable candidates', async () => {
    const provider = new MockAvDocumentProvider();
    const result = await provider.extract({
      tenantSlug: 'nextgen-assets',
      barcode: '34191790010104351004791020150008291070026000'
    });

    expect(result.documentType).toBe('BILL_OR_BARCODE');
    expect(result.suggestedActions).toContain('CREATE_ACCOUNT_PAYABLE');
  });
});
