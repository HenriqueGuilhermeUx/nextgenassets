// ============================================
//  REPORTS E2E — 3 visões + abandoned cart + forecast
// ============================================
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, cleanDatabase, seedTestPartner, seedTestUser, seedTestTrigger, prisma } from '../helpers/test-app';

describe('Reports E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('GET /v1/reports/consumer/:userId', () => {
    it('deve retornar relatório do consumidor', async () => {
      const partner = await seedTestPartner();
      const user = await seedTestUser(partner.id);
      await seedTestTrigger(partner.id, user.id);

      const response = await request(app.getHttpServer())
        .get(`/v1/reports/consumer/${user.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        user: expect.any(Object),
        month: expect.any(String),
        summary: {
          activeTriggers: expect.any(Number),
          totalTriggers: expect.any(Number)
        }
      });
      expect(response.body.activeTriggers.length || 0).toBeGreaterThan(0);
    });
  });

  describe('GET /v1/reports/partner/:partnerId', () => {
    it('deve retornar KPIs do parceiro', async () => {
      const partner = await seedTestPartner();
      const user = await seedTestUser(partner.id);
      await seedTestTrigger(partner.id, user.id);

      const response = await request(app.getHttpServer())
        .get(`/v1/reports/partner/${partner.id}`)
        .expect(200);

      expect(response.body.kpis).toMatchObject({
        totalUsers: expect.any(Number),
        activeTriggers: expect.any(Number),
        executionsThisMonth: expect.any(Number)
      });
    });
  });

  describe('GET /v1/reports/partner/:partnerId/abandoned-cart-recovery', () => {
    it('deve retornar métricas de recuperação de carrinho', async () => {
      const partner = await seedTestPartner({ type: 'RETAILER' });
      const user = await seedTestUser(partner.id);
      await seedTestTrigger(partner.id, user.id, {
        code: 'BALANCE_TRIGGER_BUY',
        params: { sku: 'PERFUME_X', minBalance: 3000 }
      });

      const response = await request(app.getHttpServer())
        .get(`/v1/reports/partner/${partner.id}/abandoned-cart-recovery`)
        .expect(200);

      expect(response.body.kpis).toMatchObject({
        abandonedCartsRecovered: expect.any(Number),
        pipelineValueBrl: expect.any(Number),
        recoveredRevenueBrl: expect.any(Number)
      });
      expect(response.body.insight).toBeDefined();
    });
  });

  describe('GET /v1/reports/partner/:partnerId/pipeline-forecast', () => {
    it('deve retornar previsão em buckets temporais', async () => {
      const partner = await seedTestPartner({ type: 'RETAILER' });
      const user = await seedTestUser(partner.id);
      await seedTestTrigger(partner.id, user.id, {
        code: 'POST_BILLS_BUY',
        params: { sku: 'TV', dayOfMonth: 20, minBalanceAfterBills: 1000 }
      });

      const response = await request(app.getHttpServer())
        .get(`/v1/reports/partner/${partner.id}/pipeline-forecast`)
        .expect(200);

      expect(response.body.buckets).toHaveProperty('next7Days');
      expect(response.body.buckets).toHaveProperty('next30Days');
      expect(response.body.buckets).toHaveProperty('next90Days');
      expect(response.body.summary.probabilityAdjustedValueBrl).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /v1/reports/internal/profitability', () => {
    it('deve retornar breakdown de receita por parceiro', async () => {
      const partner = await seedTestPartner();
      const user = await seedTestUser(partner.id);
      await seedTestTrigger(partner.id, user.id);

      const response = await request(app.getHttpServer())
        .get('/v1/reports/internal/profitability')
        .expect(200);

      expect(response.body).toMatchObject({
        month: expect.any(String),
        summary: {
          totalPartners: expect.any(Number),
          totalExecutions: expect.any(Number),
          successRate: expect.any(Number)
        }
      });
      expect(response.body.revenueByPartner).toBeInstanceOf(Array);
    });
  });
});
