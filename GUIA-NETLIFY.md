# 🌐 GUIA NETLIFY — NextGen Assets (4 frontends)

## ⏱️ Tempo estimado: 30-40 min (1 site = ~8 min)

---

# 📋 PRÉ-REQUISITOS

Antes de começar, tenha em mãos:

- ✅ Conta no Netlify: https://app.netlify.com (crie com GitHub)
- ✅ Acesso ao GitHub: https://github.com/HenriqueGuilhermeUx/nextgenassets
- ✅ URL da API funcionando: `https://nga-api-yr9w.onrender.com`

---

# 🎯 OS 4 SITES (resumo)

| # | Nome no Netlify | Pasta | Domínio final | URL temporária |
|---|---|---|---|---|
| 1 | `nextgen-assets` | `apps/marketing` | nextgenassets.com.br | https://nextgen-assets.netlify.app |
| 2 | `nga-admin` | `apps/admin` | admin.nextgenassets.com.br | https://nga-admin.netlify.app |
| 3 | `nga-partner` | `apps/partner` | painel.nextgenassets.com.br | https://nga-partner.netlify.app |
| 4 | `nga-consumer` | `apps/consumer` | app.nextgenassets.com.br | https://nga-consumer.netlify.app |

---

# 🚀 PASSO A PASSO (repetir pra cada site)

## PASSO 1: Criar novo site

1. Acessa: https://app.netlify.com
2. Clica em **"Add new site"** → **"Import an existing project"**
3. Escolhe **"Deploy with GitHub"**
4. Autoriza o Netlify a acessar seu GitHub
5. Procura e seleciona: **`HenriqueGuilhermeUx/nextgenassets`**

---

## PASSO 2: Configurar build (CRÍTICO!)

A primeira tela tem 3 campos importantes:

### Campo 1: **Owner**
- Selecione sua conta pessoal

### Campo 2: **Site name** (nome do site)
- Coloque o nome da tabela acima (`nextgen-assets`, `nga-admin`, etc.)

### Campo 3: **Branch to deploy**
- `main`

### Campo 4: **Base directory** ⭐ MUITO IMPORTANTE!
Esse é o campo que vai variar por site:

| Site | Base directory |
|---|---|
| nextgen-assets | `apps/marketing` |
| nga-admin | `apps/admin` |
| nga-partner | `apps/partner` |
| nga-consumer | `apps/consumer` |

### Campo 5: **Build command** (vai pegar do netlify.toml automaticamente, mas confirme)
```
npm run build
```

### Campo 6: **Publish directory** (vai pegar do netlify.toml)
```
.next
```

---

## PASSO 3: Variáveis de ambiente (ANTES de clicar Deploy!)

**Antes** de clicar em "Deploy site", clique em **"Advanced"** → **"New variable"** e adicione:

### Para `nextgen-assets` (Marketing):
```
NEXT_PUBLIC_API_URL = https://nga-api-yr9w.onrender.com
NEXT_PUBLIC_SITE_URL = https://nextgenassets.com.br
```

### Para `nga-admin`:
```
NEXT_PUBLIC_API_URL = https://nga-api-yr9w.onrender.com
NEXT_PUBLIC_SITE_URL = https://admin.nextgenassets.com.br
NEXT_PUBLIC_ADMIN_KEY = nga_admin_prod_key_change_me
```

### Para `nga-partner`:
```
NEXT_PUBLIC_API_URL = https://nga-api-yr9w.onrender.com
NEXT_PUBLIC_SITE_URL = https://painel.nextgenassets.com.br
NEXT_PUBLIC_PARTNER_KEY = nga_partner_prod_key_change_me
```

### Para `nga-consumer`:
```
NEXT_PUBLIC_API_URL = https://nga-api-yr9w.onrender.com
NEXT_PUBLIC_SITE_URL = https://app.nextgenassets.com.br
```

---

## PASSO 4: Deploy!

1. Clica em **"Deploy site"** (botão verde embaixo)
2. Espera 3-5 min (vai mostrar logs em tempo real)
3. Status final esperado: **"Published"** ✅

---

## PASSO 5: Testa a URL temporária

Netlify gera uma URL tipo:
- `https://nextgen-assets.netlify.app` (Marketing)
- `https://nga-admin.netlify.app` (Admin)
- `https://nga-partner.netlify.app` (Partner)
- `https://nga-consumer.netlify.app` (Consumer)

Abre no navegador e verifica se:
- ✅ Carrega a página
- ✅ Não dá erro 404
- ✅ Não dá erro de CORS no console do navegador (F12)

---

# 🔁 REPETE pra cada um dos 4 sites

Manda print da tela de configuração do PRIMEIRO site se travar em algum lugar.

---

# ⚠️ DEPLOY FAIL? (problemas comuns)

## "Build failed: Cannot find module"
- Confirma que `Base directory` tá apontando pra pasta certa (`apps/marketing` por ex)
- Confirma que `Build command` é `npm run build`

## "Build failed: ENOENT ... package.json"
- Esquceu de colocar o Base directory
- Volta no passo 2 e preenche

## "Deploy succeeded but site shows 404"
- Confirma que `Publish directory` é `.next`
- Aguarda 1-2 min (Netlify pode demorar pra ativar)

## "CORS error" no navegador
- Volta nas variáveis de ambiente do site e confirma `NEXT_PUBLIC_API_URL`
- Confirma que tá usando `https://nga-api-yr9w.onrender.com` (com https)

---

# 📊 CHECKLIST FINAL

Depois de criar os 4 sites:

- [ ] nextgen-assets → https://nextgen-assets.netlify.app carrega
- [ ] nga-admin → https://nga-admin.netlify.app carrega
- [ ] nga-partner → https://nga-partner.netlify.app carrega
- [ ] nga-consumer → https://nga-consumer.netlify.app carrega
- [ ] Todos conectam na API (sem erro CORS)

Depois disso, vamos pro **Cloudflare DNS** (domínio customizado)!

---

# 🆘 PRECISA DE AJUDA?

Se travar em qualquer passo, me manda:
- Print da tela onde travou
- O erro que apareceu
- A URL do site que tá tentando criar

A gente desempaca! 💪
