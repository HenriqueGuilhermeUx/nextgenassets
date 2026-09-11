import { MockProductLookupProvider } from './mock-product-lookup.provider';

describe('MockProductLookupProvider', () => {
  it('identifies a known EAN', async () => {
    const provider = new MockProductLookupProvider();
    const result = await provider.lookupByCode('7894900011517');

    expect(result.found).toBe(true);
    expect(result.ean).toBe('7894900011517');
    expect(result.name).toBeTruthy();
  });

  it('returns a safe fallback for unknown EAN', async () => {
    const provider = new MockProductLookupProvider();
    const result = await provider.lookupByCode('0000000000000');

    expect(result.found).toBe(false);
    expect(result.ean).toBe('0000000000000');
    expect(result.rawData?.reason).toBe('not_found_in_mock_provider');
  });
});
