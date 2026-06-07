// ============================================
//  RETAILER E2E — Pre-order flow completo
// ============================================
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, cleanDatabase, seedTestPartner, seedTestUser, prisma } from '../helpers/test-app';

describe('Retailer (Pre-order flow) E2E', () => {
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

  describe('POST /v1/retailer/pre-orders', () => {
    it('deve criar uma reserva (pre-order)', async () => {
      const partner = await seedTestPartner({ type: 'RETAILER' });
      const user = await seedTestUser(partner.id);

      const response = await request(app.getHttpServer())
        .post('/v1/retailer/pre-orders')
        .send({
          userId: user.id,
          sku: 'PERFUME_IMPORTADO_X',
          quantity: 1
        })
        .expect(201);

      expect(response.body).toMatchObject({
        userId: user.id,
        sku: 'PERFUME_IMPORTADO_X',
        quantity: 1,
        status: 'PENDING',
        totalBrl: 489
      });
      expect(response.body.externalId).toMatch(/^PRE-ORDER-/);
    });

    it('deve rejeitar SKU inexistente', async () => {
      const partner = await seedTestPartner({ type: 'RETAILER' });
      const user = await seedTestUser(partner.id);

      await request(app.getHttpServer())
        .post('/v1/retailer/pre-orders')
        .send({ userId: user.id, sku: 'SKU_INEXISTENTE' })
        .expect(500);  // Throw é convertido em 500
    });

    it('deve rejeitar sem userId', async () => {
      await request(app.getHttpServer())
        .post('/v1/retailer/pre-orders')
        .send({ sku: 'BISCOITO_Z_150G' })
        .expect(400);
    });
  });

  describe('Fluxo completo: PENDING → CONFIRMED → FULFILLED', () => {
    it('deve completar o ciclo de vida da reserva', async () => {
      const partner = await seedTestPartner({ type: 'RETAILER' });
      const user = await seedTestUser(partner.id);

      // 1. Criar pre-order
      const createRes = await request(app.getHttpServer())
        .post('/v1/retailer/pre-orders')
        .send({ userId: user.id, sku: 'BISCOITO_Z_150G', quantity: 2 })
        .expect(201);

      const reservationId = createRes.body.externalId;

      // 2. Confirmar (Pix caiu)
      const confirmRes = await request(app.getHttpServer())
        .post(`/v1/retailer/pre-orders/${reservationId}/confirm`)
        .expect(201);

      expect(confirmRes.body.status).toBe('CONFIRMED');
      expect(confirmRes.body.reservedAt).toBeDefined();

      // 3. Despachar
      const shipRes = await request(app.getHttpServer())
        .post(`/v1/retailer/pre-orders/${reservationId}/ship`)
        .expect(201);

      expect(shipRes.body.status).toBe('FULFILLED');
      expect(shipRes.body.trackingCode).toBeDefined();
      expect(shipRes.body.estimatedDeliveryDays).toBeGreaterThan(0);
    });
  });

  describe('GET /v1/retailer/pre-orders', () => {
    it('deve listar reservas com filtro de status', async () => {
      const partner = await seedTestPartner({ type: 'RETAILER' });
      const user = await seedTestUser(partner.id);

      // Cria 2 reservas
      await request(app.getHttpServer()).post('/v1/retailer/pre-orders').send({ userId: user.id, sku: 'CAFE_X_500G' });
      await request(app.getHttpServer()).post('/v1/retailer/pre-orders').send({ userId: user.id, sku: 'LEITE_INTEGRAL_1L' });

      const response = await request(app.getHttpServer())
        .get('/v1/retailer/pre-orders')
        .query({ status: 'PENDING' })
        .expect(200);

      expect(response.body.length).toBe(2);
      expect(response.body.every((r: any) => r.status === 'PENDING')).toBe(true);
    });
  });

  describe('GET /v1/retailer/pipeline/summary', () => {
    it('deve retornar KPIs agregados do pipeline', async () => {
      const partner = await seedTestPartner({ type: 'RETAILER' });
      const user = await seedTestUser(partner.id);

      await request(app.getHttpServer()).post('/v1/retailer/pre-orders').send({ userId: user.id, sku: 'PERFUME_IMPORTADO_X' });
      await request(app.getHttpServer()).post('/v1/retailer/pre-orders').send({ userId: user.id, sku: 'PERFUME_Y' });

      const response = await request(app.getHttpServer())
        .get('/v1/retailer/pipeline/summary')
        .expect(200);

      expect(response.body).toMatchObject({
        totalPendingCount: 2,
        totalPendingValue: expect.any(Number)
      });
      expect(response.body.totalPendingValue).toBeGreaterThan(0);
    });
  });

  describe('GET /v1/retailer/inventory', () => {
    it('deve listar inventário com low_stock flag', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/retailer/inventory')
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('sku');
      expect(response.body[0]).toHaveProperty('stock');
      expect(response.body[0]).toHaveProperty('lowStock');
    });
  });

  describe('GET /v1/retailer/forecast', () => {
    it('deve retornar previsão conservadora/realista/otimista', async () => {
      const partner = await seedTestPartner({ type: 'RETAILER' });
      const user = await seedTestUser(partner.id);
      await request(app.getHttpServer()).post('/v1/retailer/pre-orders').send({ userId: user.id, sku: 'PERFUME_Z' });

      const response = await request(app.getHttpServer())
        .get('/v1/retailer/forecast')
        .expect(200);

      expect(response.body.forecast).toMatchObject({
        conservative: expect.any(Number),
        realistic: expect.any(Number),
        optimistic: expect.any(Number)
      });
      expect(response.body.forecast.optimistic).toBeGreaterThan(response.body.forecast.conservative);
    });
  });
});
