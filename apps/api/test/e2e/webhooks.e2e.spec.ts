// ============================================
//  WEBHOOKS E2E — HMAC + Retry + DLQ
// ============================================
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { WebhookSigner } from '../../src/modules/webhooks/webhook-signer';
import { createTestApp, cleanDatabase, seedTestPartner } from '../helpers/test-app';

describe('Webhooks E2E', () => {
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

  describe('WebhookSigner', () => {
    it('deve assinar payload com HMAC-SHA256', () => {
      const payload = '{"event":"test"}';
      const secret = 'test-secret';
      const signature = WebhookSigner.sign(payload, secret);
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('deve verificar assinatura válida', () => {
      const payload = '{"event":"test"}';
      const secret = 'test-secret';
      const signature = WebhookSigner.sign(payload, secret);
      expect(WebhookSigner.verify(payload, signature, secret)).toBe(true);
    });

    it('deve rejeitar assinatura inválida', () => {
      expect(WebhookSigner.verify('payload', 'fake-sig', 'secret')).toBe(false);
    });

    it('deve rejeitar payload adulterado', () => {
      const secret = 'test-secret';
      const signature = WebhookSigner.sign('original', secret);
      expect(WebhookSigner.verify('adulterado', signature, secret)).toBe(false);
    });

    it('deve gerar header no formato t=...,v1=...', () => {
      const header = WebhookSigner.generateHeader('{"x":1}', 'secret', 1699999999);
      expect(header).toMatch(/^t=1699999999,v1=[a-f0-9]{64}$/);
    });
  });

  describe('POST /v1/webhooks/verify-signature', () => {
    it('deve validar assinatura via endpoint', async () => {
      const payload = '{"event":"test","data":{"x":1}}';
      const secret = 'test-secret';
      const signature = WebhookSigner.sign(payload, secret);

      const response = await request(app.getHttpServer())
        .post('/v1/webhooks/verify-signature')
        .send({ payload, signature, secret })
        .expect(201);

      expect(response.body.valid).toBe(true);
    });
  });

  describe('POST /v1/webhooks/out/notify-partner', () => {
    it('deve enfileirar webhook pra envio', async () => {
      const partner = await seedTestPartner({ webhookUrl: 'https://webhook.site/test' });

      const response = await request(app.getHttpServer())
        .post('/v1/webhooks/out/notify-partner')
        .send({
          partnerId: partner.id,
          event: 'trigger.executed',
          data: { triggerId: 'trg_123', amount: 500 }
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBeDefined();
    });

    it('deve rejeitar se partner não tem webhookUrl', async () => {
      const partner = await seedTestPartner({ webhookUrl: null });

      const response = await request(app.getHttpServer())
        .post('/v1/webhooks/out/notify-partner')
        .send({ partnerId: partner.id, event: 'test', data: {} })
        .expect(201);

      expect(response.body.status).toBe('no_url');
    });
  });

  describe('GET /v1/webhooks/out/stats', () => {
    it('deve retornar estatísticas agregadas', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/webhooks/out/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        total: expect.any(Number),
        delivered: expect.any(Number),
        pending: expect.any(Number),
        deadLetter: expect.any(Number),
        successRate: expect.any(Number)
      });
    });
  });
});
