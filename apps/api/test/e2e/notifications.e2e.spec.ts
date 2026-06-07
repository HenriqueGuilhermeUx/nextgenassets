// ============================================
//  NOTIFICATIONS + WHATSAPP E2E
// ============================================
import { INestApplication } from '@nestjs/common';
import { WhatsAppService } from '../../src/modules/notifications/whatsapp.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { createTestApp, cleanDatabase, seedTestPartner, seedTestUser, prisma } from '../helpers/test-app';

describe('Notifications E2E', () => {
  let app: INestApplication;
  let notifications: NotificationsService;
  let whatsApp: WhatsAppService;

  beforeAll(async () => {
    app = await createTestApp();
    notifications = app.get(NotificationsService);
    whatsApp = app.get(WhatsAppService);
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('WhatsApp Service', () => {
    it('deve formatar telefone adicionando 55 se necessário', () => {
      const formatted = (whatsApp as any).formatPhone('11999998888');
      expect(formatted).toBe('+5511999998888');
    });

    it('deve formatar mensagem com emoji + título + body + CTA', () => {
      const msg = (whatsApp as any).formatMessage({
        title: 'Gatilho executado',
        body: 'Compra de 22 ITUB4',
        emoji: '✅',
        cta: { label: 'Ver detalhes', url: 'https://app.com/123' }
      });
      expect(msg).toContain('✅');
      expect(msg).toContain('*Gatilho executado*');
      expect(msg).toContain('Ver detalhes: https://app.com/123');
      expect(msg).toContain('— Orkest');
    });

    it('deve enviar via MOCK quando não há provider configurado', async () => {
      const result = await whatsApp.send('11999998888', {
        title: 'Teste',
        body: 'Mensagem de teste',
        emoji: '🧪'
      });
      expect(result.provider).toBe('mock');
      expect(result.to).toContain('+55');
    });

    it('deve skip quando phone é null', async () => {
      const result = await whatsApp.send(null, { title: 'Test', body: 'X' });
      expect(result.skipped).toBe('no phone number');
    });
  });

  describe('Notifications Service', () => {
    it('deve enviar notificação multi-canal', async () => {
      const partner = await seedTestPartner();
      const user = await seedTestUser(partner.id, { phone: '11999998888' });

      const results = await notifications.send({
        userId: user.id,
        event: 'TRIGGER_EXECUTED',
        channels: ['WHATSAPP', 'PUSH'],
        data: { triggerName: 'ITUB4 na queda', amount: 500 }
      });

      expect(results.length).toBe(2);
      expect(results.some((r: any) => r.channel === 'WHATSAPP')).toBe(true);
    });

    it('deve gerar template correto pra cada evento', async () => {
      const partner = await seedTestPartner();
      const user = await seedTestUser(partner.id);

      await notifications.send({
        userId: user.id,
        event: 'PRE_ORDER_SHIPPED',
        channels: ['PUSH'],
        data: { productName: 'Perfume X', deliveryDays: 3, trackingCode: 'BR123' }
      });

      const notif = await prisma.notification.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });

      expect(notif).toBeDefined();
      expect(notif?.title).toContain('caminho');
      expect(notif?.body).toContain('Perfume X');
    });
  });
});
