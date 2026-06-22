const https = require('https');
const fs = require('fs');

const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
if (!certBase64) {
  console.log('set EFI_CERTIFICATE_BASE64 first');
  process.exit(1);
}

const pfx = Buffer.from(certBase64, 'base64');
const ca = fs.readFileSync('apps/api/src/certs/efi-chain-prod.crt');

console.log('Testing PROD...');
const req = https.request({
  method: 'POST',
  hostname: 'openfinance.api.efibank.com.br',
  port: 443,
  path: '/v1/oauth/token',
  pfx: pfx,
  passphrase: '',
  ca: ca,
  rejectUnauthorized: true,
  headers: {
    'Authorization': 'Basic ' + Buffer.from(process.env.EFI_CLIENT_ID + ':' + process.env.EFI_CLIENT_SECRET).toString('base64'),
    'Content-Type': 'application/json',
    'Content-Length': 130
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});
req.on('error', (err) => console.log('ERROR:', err.message));
req.setTimeout(10000, () => { req.destroy(); console.log('TIMEOUT'); });
req.write(JSON.stringify({ grant_type: 'client_credentials', scope: 'open-finance.consent open-finance.payment' }));
req.end();
