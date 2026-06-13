// Teste simples do SDK
const NextGen = require('./nextgen-sdk.ts');

async function main() {
  const ng = new NextGen({ apiKey: 'demo' });
  
  console.log('🟢 NextGen SDK v0.1');
  console.log('   - ng.woovi.createCharge()');
  console.log('   - ng.woovi.listSubaccounts()');
  console.log('   - ng.woovi.withdraw()');
  console.log('   - ng.woovi.withdrawAll()');
  console.log('   - ng.woovi.createTransfer()');
  console.log('   - ng.pluggy.createConnectToken()');
  console.log('   - ng.pluggy.listConsents()');
}

main().catch(console.error);
