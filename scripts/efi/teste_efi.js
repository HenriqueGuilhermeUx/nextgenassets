// ============================================
//  TESTE DE CONEXÃO EFI OPEN FINANCE
//  Henrique C. - NextGen Assets
//  Data: 2026-06-21
// ============================================

const axios = require('axios');
const fs = require('fs');
const https = require('https');

// ===== CONFIGURAÇÃO DAS SUAS CREDENCIAIS =====
const CERTIFICADO_NOME = 'producao-687781-Notarize.p12';
const CLIENT_ID = process.env.EFI_CLIENT_ID || 'Client_Id_41cae23c-21b2-4891-9476-6821b401e95e';
const CLIENT_SECRET = process.env.EFI_CLIENT_SECRET || 'Client_Secret_0ed22b4a-6c8a-4a87-9a78-4ea69a3a93cb';
// ============================================

// Transforma as credenciais em formato Base64 exigido pela Efí
const credenciais = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

// Carrega o certificado digital obrigatório para a conexão segura (mTLS)
const certPath = process.env.EFI_CERT_PATH || __dirname + '/' + CERTIFICADO_NOME;
let certificado;
try {
    certificado = fs.readFileSync(certPath);
    console.log("🔐 Certificado carregado de:", certPath);
} catch (err) {
    console.error("❌ Erro ao ler certificado:", err.message);
    console.log("\nColoque o .p12 na pasta scripts/efi/ ou set EFI_CERT_PATH");
    process.exit(1);
}

const agent = new https.Agent({
    pfx: certificado,
    passphrase: process.env.EFI_CERT_PASSPHRASE || ''
});

async function testarConexao() {
    try {
        console.log("\n🔄 Tentando autenticar nos servidores da Efí...");
        
        // Endpoint oficial de autenticação da Efí (Produção)
        const resposta = await axios({
            method: 'POST',
            url: 'https://openfinance.api.efibank.com.br/v1/oauth/token',
            headers: {
                'Authorization': `Basic ${credenciais}`,
                'Content-Type': 'application/json'
            },
            data: {
                grant_type: 'client_credentials',
                scope: 'open-finance.consent open-finance.payment'
            },
            httpsAgent: agent
        });

        if (resposta.data.access_token) {
            console.log("\n✅ SUCESSO! Conexão autenticada com a Efí.");
            console.log("🔑 Access Token:", resposta.data.access_token.substring(0, 30) + "...");
            console.log("⏰ Expira em:", resposta.data.expires_in, "segundos");
            console.log("🚀 Suas chaves estão prontas para Open Finance!");
            
            // Salva o token num arquivo pra próximos testes
            fs.writeFileSync(__dirname + '/last_token.txt', resposta.data.access_token);
            return resposta.data.access_token;
        }
    } catch (error) {
        console.error("\n❌ ERRO NA CONEXÃO:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Detalhes:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
        return null;
    }
}

testarConexao();
