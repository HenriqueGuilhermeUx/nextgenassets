// ============================================
//  DESTINATIONS E2E — Mock adapters
// ============================================
import { INestApplication } from '@nestjs/common';
import { MockStockBroker } from '../../src/modules/destinations/mock-providers/mock-stock-broker';
import { MockFundDistributor } from '../../src/modules/destinations/mock-providers/mock-fund-distributor';
import { MockCryptoExchange } from '../../src/modules/destinations/mock-providers/mock-crypto-exchange';
import { MockRetailer } from '../../src/modules/destinations/mock-providers/mock-retailer';
import { createTestApp, cleanDatabase } from '../helpers/test-app';

describe('Destinations E2E (Mock Adapters)', () => {
  let app: INestApplication;
  let stockBroker: MockStockBroker;
  let fundDistributor: MockFundDistributor;
  let cryptoExchange: MockCryptoExchange;
  let retailer: MockRetailer;

  beforeAll(async () => {
    app = await createTestApp();
    stockBroker = app.get(MockStockBroker);
    fundDistributor = app.get(MockFundDistributor);
    cryptoExchange = app.get(MockCryptoExchange);
    retailer = app.get(MockRetailer);
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  describe('MockStockBroker', () => {
    it('deve executar BUY_STOCK com sucesso', async () => {
      const result = await stockBroker.execute({
        type: 'BUY_STOCK',
        ticker: 'ITUB4',
        amountBrl: 500,
        userId: 'test-user'
      });

      expect(result.status).toBe('COMPLETED');
      if (result.status === 'COMPLETED') {
        expect(result.details.ticker).toBe('ITUB4');
        expect(result.details.quantity).toBeGreaterThan(0);
        expect(result.details.totalBrl).toBeLessThanOrEqual(500);
      }
    });

    it('deve falhar quando valor insuficiente pra 1 ação', async () => {
      const result = await stockBroker.execute({
        type: 'BUY_STOCK',
        ticker: 'ITUB4',
        amountBrl: 1,  // muito pouco
        userId: 'test-user'
      });

      expect(result.status).toBe('FAILED');
      if (result.status === 'FAILED') {
        expect(result.errorCode).toBe('INSUFFICIENT_AMOUNT');
      }
    });

    it('deve retornar cotação válida', async () => {
      const quote = await stockBroker.getQuote!('ITUB4');
      expect(quote.price).toBeGreaterThan(0);
      expect(quote.currency).toBe('BRL');
    });

    it('deve falhar pra ação não suportada', async () => {
      const result = await stockBroker.execute({
        type: 'SELL_STOCK',
        ticker: 'ITUB4',
        quantity: 999999,
        userId: 'test-user'
      });

      expect(result.status).toBe('FAILED');
    });
  });

  describe('MockFundDistributor', () => {
    it('deve subscrever cotas de fundo', async () => {
      const result = await fundDistributor.execute({
        type: 'SUBSCRIBE_FUND',
        fundId: 'XP_SELECTION',
        amountBrl: 1000,
        userId: 'test-user'
      });

      expect(result.status).toBe('COMPLETED');
      if (result.status === 'COMPLETED') {
        expect(result.details.sharesAcquired).toBeGreaterThan(0);
        expect(result.details.fundName).toContain('XP');
      }
    });

    it('deve falhar pra fundo inexistente', async () => {
      const result = await fundDistributor.execute({
        type: 'SUBSCRIBE_FUND',
        fundId: 'FUNDO_INEXISTENTE',
        amountBrl: 100,
        userId: 'test-user'
      });

      expect(result.status).toBe('FAILED');
    });
  });

  describe('MockCryptoExchange', () => {
    it('deve comprar USDC', async () => {
      const result = await cryptoExchange.execute({
        type: 'BUY_CRYPTO',
        asset: 'USDC',
        amountBrl: 100,
        userId: 'test-user'
      });

      expect(result.status).toBe('COMPLETED');
      if (result.status === 'COMPLETED') {
        expect(result.details.asset).toBe('USDC');
        expect(result.details.quantityTokens).toBeGreaterThan(0);
        expect(result.details.spreadAppliedPct).toBe(0.5);
      }
    });

    it('deve listar ativos suportados', async () => {
      const assets = await cryptoExchange.listSupportedAssets!();
      expect(assets).toContain('USDC');
      expect(assets).toContain('BTC');
    });
  });

  describe('MockRetailer (Pre-order + Inventory)', () => {
    it('deve criar pre-order', async () => {
      const reservation = await retailer.createPreOrder({
        userId: 'test-user',
        sku: 'PERFUME_IMPORTADO_X',
        quantity: 1,
        scheduledFor: new Date()
      });

      expect(reservation.status).toBe('PENDING');
      expect(reservation.totalBrl).toBe(489);
    });

    it('deve completar fluxo: criar → confirmar → despachar', async () => {
      const created = await retailer.createPreOrder({
        userId: 'test-user',
        sku: 'BISCOITO_Z_150G',
        quantity: 1,
        scheduledFor: new Date()
      });

      const confirmed = await retailer.confirmPreOrder(created.externalId);
      expect(confirmed.status).toBe('CONFIRMED');

      const shipped = await retailer.shipPreOrder(created.externalId);
      expect(shipped.status).toBe('FULFILLED');
      expect(shipped.trackingCode).toBeDefined();
    });

    it('deve detectar restock simulado', async () => {
      const restocks = retailer.getRestocksToday();
      // Pode ter 0 ou mais, dependendo do estado do catálogo
      expect(Array.isArray(restocks)).toBe(true);
    });

    it('deve retornar inventário com flag lowStock', () => {
      const inventory = retailer.getInventory();
      expect(inventory.length).toBeGreaterThan(0);
      inventory.forEach(item => {
        expect(item).toHaveProperty('sku');
        expect(item).toHaveProperty('stock');
        expect(item).toHaveProperty('lowStock');
      });
    });
  });
});
