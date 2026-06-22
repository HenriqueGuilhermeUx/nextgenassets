#!/usr/bin/env node
// ============================================
//  CONVERTE P12 (env Render) → PEM sem senha
//  e testa mTLS contra Efi
// ============================================

const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
const passphrase = process.env.EFI_CERT_PASSPHRASE || '';
const clientId = process.env.EFI_CLIENT_ID;
const clientSecret = process.env.EFI_CLIENT_SECRET;
const host = 'openfinance.api.efibank.com.br';

if (!certBase64) { console.log('❌ EFI_CERTIFICATE_BASE64 não definido'); process.exit(1); }

const p12Buffer = Buffer.from(certBase64, 'base64');
const tmpP12 = '/tmp/efi_env.p12';
const tmpPEM = '/tmp/efi_env_clean.pem';
const tmpKey = '/tmp/efi_env_key.pem';
const tmpCert = '/tmp/efi_env_cert.pem';

fs.writeFileSync(tmpP12, p12Buffer);
console.log(`📦 Cert size: ${p12Buffer.length} bytes`);

// Tenta extrair com senha
const tryPass = (pass) => {
  try {
    return execSync(`openssl pkcs12 -in ${tmpP12} -out ${tmpPEM} -nodes -passin pass:${pass} 2>&1`, { encoding: 'utf-8' });
  } catch (e) {
    return null;
  }
};

const passes = [passphrase, '', 'changeit', 'efi', '1234', 'nextgen', 'apis.efipay.com.br', 'Notarize', 'NOTARIZE'];
let extracted = false;
for (const p of passes) {
  console.log(`🔑 Tentando senha: '${p || '(vazia)'}'`);
  const result = tryPass(p);
  if (result && fs.existsSync(tmpPEM)) {
    console.log(`✅ Cert extraído com senha: '${p || '(vazia)'}'`);
    extracted = true;
    break;
  }
}

if (!extracted) {
  console.log('❌ Não consegui extrair com nenhuma senha comum');
  process.exit(1);
}

// Separa cert e key
execSync(`openssl pkcs12 -in ${tmpP12} -clcerts -nokeys -passin pass:${passphrase || ''} -out ${tmpCert} 2>/dev/null`);
console.log(`📜 Cert: ${fs.statSync(tmpCert).size} bytes`);

// Testa mTLS com cert+key PEM
const key = fs.readFileSync(tmpPEM).toString('utf-8').match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/)?.[0] || fs.readFileSync(tmpPEM).toString('utf-8').match(/-----BEGIN RSA PRIVATE KEY-----[\s\S]+?-----END RSA PRIVATE KEY-----/)?.[0];
const cert = fs.readFileSync(tmpCert).toString('utf-8').match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)?.[0];

if (!key) { console.log('❌ Chave privada não encontrada no PEM'); process.exit(1); }
if (!cert) { console.log('❌ Cert não encontrado no PEM'); process.exit(1); }

console.log('🔑 Testando mTLS com cert+key PEM...');
const credenciais = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
const body = JSON.stringify({ grant_type: 'client_credentials', scope: 'open-finance.consent open-finance.payment' });

const req = https.request({
  method: 'POST', hostname: host, port: 443, path: '/v1/oauth/token',
  key: key, cert: cert, rejectUnauthorized: false, keepAlive: true,
  secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT,
  ciphers: 'DEFAULT:@SECLEVEL=0',
  headers: { 'Authorization': 'Basic ' + credenciais, 'Content-Type': 'application/json', 'Accept': 'application/json', 'Content-Length': Buffer.byteLength(body) }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`📥 Status: ${res.statusCode}`);
    console.log(`📥 Response: ${data.substring(0, 300)}`);
    if (res.statusCode === 200) {
      console.log('🎉 mTLS FUNCIONOU! Token recebido!');
    }
  });
});
req.on('error', (err) => console.log(`❌ ERRO: ${err.message}`));
req.setTimeout(15000, () => { req.destroy(); console.log('⏱️ TIMEOUT'); });
req.write(body);
req.end();
