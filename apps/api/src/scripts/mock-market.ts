// Script pra simular variações de mercado e forçar triggers
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateDip(scenario: string, asset: string) {
  console.log(`\n🎬 Simulando cenário: ${scenario} em ${asset}\n`);

  const triggers = await prisma.trigger.findMany({
    where: {
      code: { contains: asset.includes('USDC') ? 'CRYPTO' : 'STOCK' },
      status: 'ACTIVE'
    },
    include: { user: true }
  });

  console.log(`📊 Encontrados ${triggers.length} gatilhos pra simular\n`);

  for (const trigger of triggers) {
    console.log(`  → Trigger ${trigger.id} (${trigger.code})`);
    console.log(`     Params: ${JSON.stringify(trigger.params)}`);

    // Chama o engine de avaliação
    const response = await fetch(`http://localhost:3001/v1/triggers/${trigger.id}/test-evaluation`, { method: 'POST' });
    const result = await response.json();
    console.log(`     Avaliação: ${result.shouldFire ? '✅ DISPARA' : '⏸  SKIP'} — ${result.reason}\n`);

    if (result.shouldFire) {
      console.log(`     🚀 Forçando execução...`);
      const exec = await fetch(`http://localhost:3001/v1/triggers/${trigger.id}/force-execute`, { method: 'POST' });
      const execResult = await exec.json();
      console.log(`     Resultado: ${JSON.stringify(execResult, null, 2).slice(0, 300)}\n`);
    }
  }
}

const args = process.argv.slice(2);
const scenario = args.find(a => a.startsWith('--scenario='))?.split('=')[1] || 'dip-2pct';
const asset = args.find(a => a.startsWith('--asset='))?.split('=')[1] || 'ITUB4';

simulateDip(scenario, asset).then(() => process.exit(0));
