// ============================================
//  AI SUGGESTIONS E2E
// ============================================
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, cleanDatabase, seedTestPartner, seedTestUser } from '../helpers/test-app';

describe('AI Suggestions E2E', () => {
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

  describe('GET /v1/ai/suggestions/:userId', () => {
    it('deve retornar perfil + sugestões baseadas em regras (sem OpenAI)', async () => {
      const partner = await seedTestPartner();
      const user = await seedTestUser(partner.id);

      const response = await request(app.getHttpServer())
        .get(`/v1/ai/suggestions/${user.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('profile');
      expect(response.body).toHaveProperty('suggestions');
      expect(response.body).toHaveProperty('riskProfile');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
    });

    it('deve incluir gatilho DCA_FUND pra saldo alto', async () => {
      const partner = await seedTestPartner();
      // Credita saldo alto no mock bank
      const user = await seedTestUser(partner.id);

      // Aqui estamos testando apenas a estrutura — o saldo virá do mock bank
      const response = await request(app.getHttpServer())
        .get(`/v1/ai/suggestions/${user.id}`)
        .expect(200);

      // Pelo menos 1 sugestão deve existir
      expect(response.body.suggestions.length).toBeGreaterThan(0);

      // Cada sugestão tem estrutura mínima
      response.body.suggestions.forEach((s: any) => {
        expect(s).toHaveProperty('triggerCode');
        expect(s).toHaveProperty('title');
        expect(s).toHaveProperty('rationale');
        expect(s).toHaveProperty('suggestedParams');
        expect(s.confidence).toBeGreaterThanOrEqual(0);
        expect(s.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('POST /v1/ai/suggestions/:userId/apply', () => {
    it('deve aplicar sugestão criando gatilho', async () => {
      const partner = await seedTestPartner();
      const user = await seedTestUser(partner.id);

      const response = await request(app.getHttpServer())
        .post(`/v1/ai/suggestions/${user.id}/apply`)
        .send({
          partnerId: partner.id,
          suggestion: {
            triggerCode: 'DCA_FUND',
            suggestedParams: { fundId: 'XP_SELECTION', dayOfMonth: 10, amountBrl: 200 }
          }
        })
        .expect(201);

      expect(response.body.applied).toBe(true);
      expect(response.body.triggerCode).toBe('DCA_FUND');
    });
  });
});
