# NextGen / Efí — teste seguro sem PowerShell

**Windows: basta extrair a pasta e abrir o arquivo `INICIAR_TESTE_EFI.cmd` com duplo clique.**

Requisitos: Node.js 20 ou superior, Client ID e Client Secret da aplicação Efí ativa (ambiente Produção), arquivo P12 de produção dessa mesma aplicação, senha do P12 caso exista.

O script solicita os dados por perguntas na janela. Client Secret e senha do P12 **não aparecem na tela**. Nada é gravado em arquivos ou colocado em parâmetros do CMD. A única chamada bancária é OAuth por HTTPS mTLS, para verificar três escopos. O resultado não mostra access_token, credenciais, certificados, conta bancária nem transações.

Não use computadores compartilhados, não envie dados de acesso pelo chat, não faça upload do P12 e não execute o teste na infraestrutura pública do Render.

1. Extraia o ZIP em uma pasta local.
2. Dê duplo clique em `INICIAR_TESTE_EFI.cmd`.
3. Copie os valores solicitados diretamente do painel Efí e indique o caminho completo do arquivo P12.
4. Copie somente o bloco JSON de resultado e envie no chat. Não envie os dados digitados.

Se o Windows bloquear o arquivo por política de segurança, não desative proteções. Execute manualmente no Prompt de Comando (CMD) dentro da pasta: `node verify-readonly-oauth-interactive.mjs`. Se o Node.js não estiver instalado, instale-o pelo site oficial https://nodejs.org/.
