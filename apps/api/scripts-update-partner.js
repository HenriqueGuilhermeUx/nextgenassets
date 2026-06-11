const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const partner = await prisma.partner.upsert({
    where: { slug: 'demo-marketplace' },
    update: {
      pixKey: '5f3325c1-2210-419c-977e-03b47fddbd1f',
      pixKeyType: 'EVP',
      commissionRate: 0.03
    },
    create: {
      slug: 'demo-marketplace',
      name: 'Demo Marketplace',
      type: 'RETAILER',
      config: {},
      pixKey: '5f3325c1-2210-419c-977e-03b47fddbd1f',
      pixKeyType: 'EVP',
      commissionRate: 0.03
    }
  });
  console.log('✅ Partner:', partner.id, '|', partner.name, '| pixKey:', partner.pixKey);
  await prisma.$disconnect();
})();
