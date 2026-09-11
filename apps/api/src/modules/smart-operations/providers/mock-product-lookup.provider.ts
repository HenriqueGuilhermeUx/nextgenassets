import { Injectable } from '@nestjs/common';
import { ProductLookupProvider, ProductLookupResult } from '../smart-operations.types';

const MOCK_PRODUCTS: Record<string, ProductLookupResult> = {
  '7894900011517': {
    found: true,
    provider: 'mock-product-intelligence',
    ean: '7894900011517',
    name: 'Coca-Cola',
    brand: 'Coca-Cola',
    category: 'Bebidas',
    packaging: 'Garrafa PET 2L',
    weight: '2L',
    imageUrl: null as any
  },
  '7891991010833': {
    found: true,
    provider: 'mock-product-intelligence',
    ean: '7891991010833',
    name: 'Leite Integral',
    brand: 'Piracanjuba',
    category: 'Laticínios',
    packaging: 'Caixa 1L',
    weight: '1L',
    imageUrl: null as any
  }
};

@Injectable()
export class MockProductLookupProvider implements ProductLookupProvider {
  name = 'mock-product-intelligence';

  async lookupByCode(code: string): Promise<ProductLookupResult> {
    const clean = String(code || '').replace(/\D/g, '');
    if (!clean) {
      return { found: false, provider: this.name, rawData: { reason: 'empty_code' } };
    }

    const known = MOCK_PRODUCTS[clean];
    if (known) return known;

    return {
      found: false,
      provider: this.name,
      ean: clean,
      name: `Produto ${clean}`,
      category: 'Não classificado',
      rawData: {
        reason: 'not_found_in_mock_provider',
        nextProviders: ['open-food-facts', 'open-products-facts', 'nextgen-private-catalog']
      }
    };
  }
}
