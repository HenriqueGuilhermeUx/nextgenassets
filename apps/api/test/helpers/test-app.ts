// ============================================
//  TEST HELPERS — App instance + teardown
// ============================================
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.init();
  return app;
}

export async function cleanDatabase(): Promise<void> {
  // Ordem importa por causa das FKs
  await prisma.notification.deleteMany();
  await prisma.execution.deleteMany();
  await prisma.trigger.deleteMany();
  await prisma.consumerUser.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.partner.deleteMany();
}

export async function seedTestPartner(overrides: any = {}) {
  return prisma.partner.create({
    data: {
      slug: 'test-partner-' + Date.now(),
      name: 'Test Partner',
      type: 'BROKER',
      status: 'ACTIVE',
      tier: 'GROWTH',
      config: {
        stockAdapter: 'MOCK_STOCK_BROKER',
        openFinanceProvider: 'EFI_MOCK',
        enabledTriggers: ['BUY_DIP_STOCK', 'DCA_STOCK']
      },
      monthlyFeeBrl: 8000,
      takeRateBrl: 0.12,
      maxMau: 10000,
      ...overrides
    }
  });
}

export async function seedTestUser(partnerId: string, overrides: any = {}) {
  return prisma.consumerUser.create({
    data: {
      partnerId,
      externalUserId: 'ext-user-' + Date.now(),
      email: 'test@user.com',
      name: 'Test User',
      consentStatus: 'ACTIVE',
      bankName: 'Itaú',
      bankAccountMask: '0001-9 / 12345-6',
      notifyChannels: ['PUSH', 'EMAIL'],
      ...overrides
    }
  });
}

export async function seedTestTrigger(partnerId: string, userId: string, overrides: any = {}) {
  return prisma.trigger.create({
    data: {
      partnerId,
      userId,
      code: 'BUY_DIP_STOCK',
      name: 'Test Trigger',
      status: 'ACTIVE',
      params: { ticker: 'ITUB4', dipPct: 0.5, windowDays: 7, amountBrl: 200, minBalance: 1000 },
      ...overrides
    }
  });
}

export { prisma };
