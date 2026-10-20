# Prova Efí Pix REAL somente OAuth/mTLS — NextGen

Objetivo: verificar se a aplicação Efí atual autentica em produção e quais escopos o OAuth concede. Não existe Pix, saque, webhook, criação de cobrança, leitura de cliente, leitura de extrato ou banco de dados neste procedimento.

Passos (Windows):
1. Em seu computador confiável com Node.js 20 ou superior, abra o repositório da NextGen na branch feature/nextgen-efi-auto-recurring-bridge. Nenhum dado real deve entrar no repositório.
2. Tenha seu certificado .p12 de Produção já baixado, e o Client ID e Client Secret da MESMA aplicação Efí ativa. Não regenere nem revogue nenhuma credencial.
3. No PowerShell, na raiz do projeto, execute o arquivo scripts/efi/run-readonly-oauth-probe.ps1. O script pede os dados localmente com o Client Secret e a senha P12 ocultos. Não salve as respostas num arquivo.
4. O resultado exibe somente os três escopos pix.read, gn.reports.read e gn.reports.write como booleanos, e indicação de sucesso OAuth/mTLS. Ele nunca exibe nem grava access_token, Client Secret, certificado ou dados bancários.

Código de saída: 0 = OAuth e três escopos verificados; 2 = autenticação feita mas falta permissão; 3 = autenticação/configuração não verificada. Compartilhe no chat somente o JSON sanitizado, nunca prints do painel de credenciais.

Não execute no Render público de homologação nem em GitHub Actions. A regra de acesso a clientes e pagamentos da produção permanece intacta. A ausência de saldo ou de Pix real no processo não prova titularidade da conta; essa validação e o repasse D+1 permanecem bloqueados.

Documentação oficial Efí: https://dev.efipay.com.br/docs/api-pix/credenciais/
