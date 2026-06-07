// ============================================
//  TRIGGERS E2E — Cobre o Trigger Engine
// ============================================
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, cleanDatabase, seedTestPartner, seedTestUser, seedTestTrigger, prisma } from '../helpers/test-app';

describe('Triggers E2E', () => {
  let app: INestApplication;
  let partner: any;
  let user: any;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
    partner = await seedTestPartner();
    user = await seedTestUser(partner.id);
  });

  describe('POST /v1/triggers', () => {
    it('deve criar um gatilho a partir de parâmetros estruturados', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/triggers')
        .send({
          partnerId: partner.id,
          userId: user.id,
          code: 'BUY_DIP_STOCK',
          name: 'ITUB4 na queda',
          params: { ticker: 'ITUB4', dipPct: 2, windowDays: 7, amountBrl: 500, minBalance: 1000 }
        })
        .expect(201);

      expect(response.body).toMatchObject({
        code: 'BUY_DIP_STOCK',
        name: 'ITUB4 na queda',
        status: 'ACTIVE',
        partnerId: partner.id,
        userId: user.id
      });
      expect(response.body.params).toMatchObject({ ticker: 'ITUB4' });
    });

    it('deve rejeitar gatilho sem campos obrigatórios', async () => {
      await request(app.getHttpServer())
        .post('/v1/triggers')
        .send({ partnerId: partner.id })  // falta userId, code, params
        .expect(400);
    });
  });

  describe('POST /v1/triggers/from-natural-language', () => {
    it('deve traduzir linguagem natural pra JSON estruturado', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/triggers/from-natural-language')
        .send({
          partnerId: partner.id,
          userId: user.id,
          naturalLanguage: 'Compra R$ 500 de ITUB4 se cair 2% em 7 dias'
        })
        .expect(201);

      expect(response.body.trigger).toBeDefined();
      expect(response.body.aiInterpretation).toBeDefined();
      // Aceita qualquer ruleType (depende da IA), mas tem que ter explanation + confidence
      expect(response.body.aiInterpretation.explanation).toBeDefined();
      expect(response.body.aiInterpretation.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /v1/triggers', () => {
    it('deve listar gatilhos com filtros', async () => {
      await seedTestTrigger(partner.id, user.id);
      await seedTestTrigger(partner.id, user.id, { code: 'DCA_STOCK', params: { ticker: 'PETR4', dayOfMonth: 10, amountBrl: 100 } });

      const response = await request(app.getHttpServer())
        .get('/v1/triggers')
        .query({ partnerId: partner.id })
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /v1/triggers/:id/test-evaluation', () => {
    it('deve avaliar gatilho sem executar', async () => {
      const trigger = await seedTestTrigger(partner.id, user.id, {
        params: { ticker: 'ITUB4', dipPct: 0.1, windowDays: 7, amountBrl: 50, minBalance: 100 }
      });

      const response = await request(app.getHttpServer())
        .post(`/v1/triggers/${trigger.id}/test-evaluation`)
        .expect(201);

      expect(response.body).toHaveProperty('shouldFire');
      expect(response.body).toHaveProperty('reason');
    });
  });

  describe('PUT /v1/triggers/:id/pause', () => {
    it('deve pausar gatilho', async () => {
      const trigger = await seedTestTrigger(partner.id, user.id);

      const response = await request(app.getHttpServer())
        .put(`/v1/triggers/${trigger.id}/pause`)
        .send({ reason: 'Manutenção' })
        .expect(200);

      expect(response.body.status).toBe('PAUSED');
      expect(response.body.pauseReason).toBe('Manutenção');
    });
  });

  describe('PUT /v1/triggers/:id/resume', () => {
    it('deve reativar gatilho pausado', async () => {
      const trigger = await seedTestTrigger(partner.id, user.id, { status: 'PAUSED' });

      const response = await request(app.getHttpServer())
        .put(`/v1/triggers/${trigger.id}/resume`)
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
    });
  });
});
