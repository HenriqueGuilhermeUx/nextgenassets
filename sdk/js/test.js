/**
 * Testes básicos do SDK NextGen
 * Roda: node test.js
 */

const NextGen = require('./nextgen-sdk.ts').default;

(async () => {
  console.log('🧪 Testando SDK NextGen v0.2\n');
  
  const ng = new NextGen({
    apiKey: 'nka_test_key',
    baseUrl: 'https://api.nextgenassets.com.br'
  });
  
  // Test 1: calculateSplit
  console.log('1️⃣ calculateSplit(10000):');
  console.log(ng.woovi.calculateSplit(10000));
  console.log();
  
  // Test 2: billing
  console.log('2️⃣ billing.me()...');
  try {
    const me = await ng.billing.me();
    console.log(me);
  } catch (err) {
    console.log('   Erro (esperado sem API Key real):', err.message);
  }
  console.log();
  
  console.log('✅ SDK carregado com sucesso!');
  console.log('📚 Docs: https://nextgenassets.com.br/docs/integracao');
})();
