# GUIA-VISUAL.md — 100% pelo navegador (SEM BASH)

> **Passo a passo visual, sem precisar rodar nenhum comando no terminal.**
> Tudo é clicar em botões no Supabase, Upstash, Render e Netlify.

---

## 🎯 Stack final
- ✅ Supabase (PostgreSQL) — você já criou
- ⏳ Upstash (Redis) — você vai criar agora
- ⏳ Render (API) — você vai criar
- ⏳ Netlify (4 sites) — você vai criar

---

# 1️⃣ Supabase: pegar a DATABASE_URL (5min)

Você já criou o projeto. Agora vamos pegar a "string de conexão" do banco.

### Passo a passo visual:

1. Acessa https://supabase.com/dashboard/org/ijphivdubygmvvegcjtx
2. **Clica no seu projeto** (nextgen-assets-prod)
3. No **menu lateral esquerdo**, clica no **ícone de engrenagem** (⚙️) — é o último item, escrito **"Project Settings"** ou **"Settings"**
4. No submenu que abre, clica em **"Database"**
5. **Rola a página pra baixo** até achar a seção **"Connection string"**
6. Clica na aba **"URI"** (não "JDBC" nem "Golang")
7. Vai aparecer uma URL tipo:
   ```
   postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```
8. **MUITO IMPORTANTE:**
   - Troca `[YOUR-PASSWORD]` pela senha que você definiu quando criou o projeto
   - Adiciona `?sslmode=require` no FINAL (depois de `/postgres`)
9. **Copia a URL final** e **cola aqui no chat pra eu conferir** (ou guarda num bloco de notas)

### Exemplo do resultado final:
```
postgresql://postgres.xxxx:MinhaSenh@123@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

> ⚠️ **DICA:** se sua senha tem `@`, `#`, `$` ou `/`, precisa "escapar" com `%40`, `%23`, etc. Melhor gerar uma senha SEM esses caracteres.

---

# 2️⃣ Rodar o SQL no Supabase (10min)

Esse passo cria TODAS as tabelas do banco. **Sem bash — é só colar SQL no navegador.**

### Passo a passo visual:

1. No **menu lateral esquerdo** do Supabase, clica em **"SQL Editor"** (ícone com `>_` ou escrito "SQL")
2. Clica no botão **"+ New query"** (canto superior direito)
3. Vai abrir um editor grande de SQL em branco
4. **Abre o arquivo** `/workspace/orkest/SUPABASE-SETUP.sql` no seu computador
5. **Seleciona TUDO** (Ctrl+A no Windows/Linux, Cmd+A no Mac)
6. **Copia** (Ctrl+C / Cmd+C)
7. **Volta pro Supabase** e **cola no editor SQL** (Ctrl+V / Cmd+V)
8. **Clica no botão "RUN"** (canto inferior direito, azul)
   - Ou aperta **Ctrl+Enter** (Cmd+Enter no Mac)
9. Espera 5-10 segundos
10. Deve aparecer embaixo:
    - `Success. No rows returned` (ou mensagens de SELECT no final)
    - **Sem erros vermelhos**

### Como verificar que funcionou:

1. No **menu lateral**, clica em **"Table Editor"** (ícone de tabela)
2. Deve aparecer 8 tabelas:
   - `Partner`
   - `ApiKey`
   - `ConsumerUser`
   - `Trigger`
   - `Execution`
   - `AuditLog`
   - `TriggerCatalog`
   - `Notification`
3. Clica em `Partner` → deve ter **1 linha** (a "Corretora Demo")
4. Clica em `TriggerCatalog` → deve ter **23 linhas** (os 23 gatilhos)

> 🎉 Se tiver as 8 tabelas e os dados, **banco tá pronto!**

---

# 3️⃣ Upstash: criar Redis (5min)

### Passo a passo visual:

1. Acessa https://console.upstash.com/login
2. **Login com GitHub** (botão "Continue with GitHub")
3. Clica em **"Create Database"**
4. Preenche:
   - **Name:** `nextgen-assets-redis`
   - **Type:** Regional
   - **Region:** `US-East-1` (deixa o default)
   - **TLS:** ✅ (deixa marcado)
5. Clica em **"Create"**
6. Espera 30 segundos
7. Vai aparecer o card do database
8. **Clica nele**
9. Rola até a seção **"Connect to your database"**
10. Clica em **"Redis URL"** (ou "TCP/SSL URL")
11. Vai aparecer tipo:
    ```
    redis://default:AbCdEf123456@us1-xxxxx.upstash.io:6379
    ```
12. **Copia essa URL inteira** e **cola aqui no chat**

> 🎉 Se chegou até aqui, **Redis tá pronto!**

---

# 4️⃣ Render: criar a API (15min)

### Passo a passo visual:

1. Acessa https://dashboard.render.com
2. Clica em **"New +"** (canto superior direito)
3. Clica em **"Web Service"**
4. Se pedir pra conectar GitHub, clica em **"Connect GitHub"** e dá permissão
5. Procura na lista o repo **"nextgenassets"** (ou `HenriqueGuilhermeUx/nextgenassets`)
6. Clica em **"Connect"** do lado dele

### Configurações do serviço:

| Campo | O que preencher |
|---|---|
| **Name** | `nga-api` |
| **Region** | **Oregon (US West)** ← mais barato |
| **Branch** | `main` |
| **Root Directory** | *(deixa vazio)* |
| **Runtime** | **Docker** (clica no dropdown e escolhe) |
| **Dockerfile Path** | `deploy/docker/api.Dockerfile` |
| **Docker Context** | `.` (só um ponto) |
| **Plan** | **Starter** ($7/mês) ← clica e escolhe Starter, NÃO Free |

### Adicionando variáveis de ambiente:

1. Rola a página até **"Environment Variables"**
2. Clica em **"Add Environment Variable"** pra cada uma abaixo
3. Em **"Key"** cola o nome da variável
4. Em **"Value"** cola o valor
5. Clica em **"Save"** no final de cada uma

#### Variáveis pra colar (uma por uma):

```
DATABASE_URL
```
**Value:** cola a URL do Supabase do passo 1

```
REDIS_URL
```
**Value:** cola a URL do Upstash do passo 3

```
NODE_ENV
```
**Value:** `production`

```
PORT
```
**Value:** `3001`

```
APP_URL
```
**Value:** `https://nextgenassets.com.br`

```
API_URL
```
**Value:** `https://api.nextgenassets.com.br`

```
WIDGET_URL
```
**Value:** `https://widget.nextgenassets.com.br`

```
CORS_ORIGINS
```
**Value:** `https://nextgenassets.com.br,https://www.nextgenassets.com.br,https://admin.nextgenassets.com.br,https://painel.nextgenassets.com.br,https://app.nextgenassets.com.br`

#### JWT (clica em "Generate" pra cada um):

```
JWT_SECRET
```
**Value:** clica no botão **"Generate"** (Render cria valor aleatório forte)

```
JWT_REFRESH_SECRET
```
**Value:** clica em **"Generate"** de novo

```
JWT_EXPIRES_IN
```
**Value:** `15m`

```
JWT_REFRESH_EXPIRES_IN
```
**Value:** `7d`

#### OpenAI:

```
OPENAI_API_KEY
```
**Value:** `sk-proj-COLE_SUA_CHAVE_AQUI` (você pega em platform.openai.com)

```
OPENAI_MODEL
```
**Value:** `gpt-4o-mini`

```
AI_CONFIDENCE_THRESHOLD
```
**Value:** `0.7`

#### Anthropic:

```
ANTHROPIC_API_KEY
```
**Value:** `sk-ant-COLE_SUA_CHAVE_AQUI`

```
ANTHROPIC_MODEL
```
**Value:** `claude-haiku-4-5`

#### Efí Bank (Open Finance):

```
EFI_API_URL
```
**Value:** `https://api-hml.efi.com.br/v1`

```
EFI_CLIENT_ID
```
**Value:** `Client_Id_COLE_SUA_CHAVE`

```
EFI_CLIENT_SECRET
```
**Value:** `Client_Secret_COLE_SUA_CHAVE`

```
EFI_PIX_KEY
```
**Value:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

```
EFI_SANDBOX
```
**Value:** `true`

```
EFI_CERTIFICATE_BASE64
```
**Value:** *(em branco por enquanto — pode adicionar depois)*

#### Woovi:

```
WOOVI_API_URL
```
**Value:** `https://api.woovi.com/v1`

```
WOOVI_APP_ID
```
**Value:** `app_COLE_SUA_CHAVE`

```
WOOVI_API_KEY
```
**Value:** `COLE_SUA_CHAVE`

```
WOOVI_SANDBOX
```
**Value:** `true`

#### WhatsApp:

```
WHATSAPP_PROVIDER
```
**Value:** `zapi`

```
WHATSAPP_API_URL
```
**Value:** `https://api.z-api.io`

```
WHATSAPP_INSTANCE_ID
```
**Value:** `COLE_DEPOIS`

```
WHATSAPP_TOKEN
```
**Value:** `COLE_DEPOIS`

#### Outros:

```
BULL_PREFIX
```
**Value:** `nga`

```
SENTRY_DSN
```
**Value:** *(em branco por enquanto)*

```
LOG_LEVEL
```
**Value:** `info`

### Finalizar:

1. **Health Check Path:** digita `/health`
2. Clica no botão azul **"Create Web Service"** (final da página)
3. Vai começar a build
4. Acompanhe os **"Logs"** em tempo real
5. **Aguarde 5-10 minutos** até aparecer:
   ```
   ✅ Build successful
   🚀 NextGen Assets API running on port 3001
   ```

### Testar:

Quando terminar, abre **outra aba do navegador** e acessa:

```
https://nga-api.onrender.com/health
```

Deve mostrar:
```json
{
  "status": "ok",
  "service": "nextgen-assets-api",
  "version": "1.0.0"
}
```

> 🎉 Se aparecer isso, **API tá no ar!**

---

# 5️⃣ Domínio customizado no Render (5min)

### Passo a passo visual:

1. No painel do Render do serviço `nga-api`
2. Clica em **"Settings"** (menu lateral esquerdo)
3. Rola até **"Custom Domains"**
4. Clica em **"Add Custom Domain"**
5. Digita: `api.nextgenassets.com.br`
6. Clica em **"Save"**
7. Render vai mostrar:
   - **CNAME target:** algo tipo `nga-api.onrender.com`
   - Mensagem: "Domain not verified yet"
8. **Anota esse CNAME target** — vamos usar no próximo passo

---

# 6️⃣ Cloudflare: configurar DNS (10min)

### Se seu domínio JÁ está no Cloudflare:

1. Acessa https://dash.cloudflare.com
2. Clica no domínio `nextgenassets.com.br`
3. No menu lateral, clica em **"DNS"** > **"Records"**
4. Clica em **"Add record"** e adiciona cada um desses:

| Tipo | Nome | Target | Proxy |
|---|---|---|---|
| CNAME | `api` | `nga-api.onrender.com` (o do passo 5) | **DNS only** (cinza) |
| CNAME | `admin` | `nga-admin.netlify.app` | **Proxied** (laranja) |
| CNAME | `painel` | `nga-partner.netlify.app` | **Proxied** (laranja) |
| CNAME | `app` | `nga-consumer.netlify.app` | **Proxied** (laranja) |
| CNAME | `www` | `nextgen-assets.netlify.app` | **Proxied** (laranja) |
| CNAME | `@` | `nextgen-assets.netlify.app` | **Proxied** (laranja) |

> ⚠️ **MUITO IMPORTANTE:** o `api` tem que ficar **cinza** (DNS only). Os outros podem ficar **laranja** (Proxied).

### Se seu domínio AINDA NÃO está no Cloudflare:

1. Acessa https://dash.cloudflare.com
2. Clica em **"+ Add a Site"**
3. Digita `nextgenassets.com.br`
4. Escolhe plano **Free**
5. Cloudflare vai te dar 2 nameservers (tipo `anna.ns.cloudflare.com` e `bob.ns.cloudflare.com`)
6. Vai no **Registro.br** → login → **Domínios** → seu domínio → **"Alterar nameservers"** → cola os 2 do Cloudflare
7. **Espera 1-24h propagar** (geralmente 1-2h)
8. Depois volta aqui e adiciona os 6 CNAMEs acima

---

# 7️⃣ 4 Frontends no Netlify (30min)

### Passo a passo visual (repete 4 vezes):

1. Acessa https://app.netlify.com
2. Clica em **"Add new site"** (canto superior direito) → **"Import an existing project"**
3. Clica em **"Deploy with GitHub"**
4. Autoriza o Netlify a acessar seus repos
5. Procura e seleciona **`HenriqueGuilhermeUx/nextgenassets`**
6. Clica no repo

#### Configuração (muda pra cada site):

**Site 1: MARKETING (site público)**
| Campo | Valor |
|---|---|
| **Site name** | `nextgen-assets` |
| **Base directory** | `apps/marketing` |
| **Build command** | `npm run build` |
| **Publish directory** | `.next` |

**Site 2: ADMIN (painel interno)**
| Campo | Valor |
|---|---|
| **Site name** | `nga-admin` |
| **Base directory** | `apps/admin` |
| **Build command** | `npm run build` |
| **Publish directory** | `.next` |

**Site 3: PARTNER (portal B2B)**
| Campo | Valor |
|---|---|
| **Site name** | `nga-partner` |
| **Base directory** | `apps/partner` |
| **Build command** | `npm run build` |
| **Publish directory** | `.next` |

**Site 4: CONSUMER (app do usuário)**
| Campo | Valor |
|---|---|
| **Site name** | `nga-consumer` |
| **Base directory** | `apps/consumer` |
| **Build command** | `npm run build` |
| **Publish directory** | `.next` |

### Variáveis de ambiente em CADA site:

1. Depois de criar o site, clica em **"Site settings"**
2. No menu lateral esquerdo, clica em **"Environment variables"**
3. Clica em **"Add a variable"** > **"Add a single variable"**
4. Adiciona essas (mesmas em todos os 4):

```
NEXT_PUBLIC_API_URL
```
**Value:** `https://api.nextgenassets.com.br`

```
NEXT_PUBLIC_SITE_URL
```
**Value:**
- No Marketing: `https://nextgenassets.com.br`
- No Admin: `https://admin.nextgenassets.com.br`
- No Partner: `https://painel.nextgenassets.com.br`
- No Consumer: `https://app.nextgenassets.com.br`

5. Clica em **"Save"**
6. Volta pro painel principal do site
7. Clica em **"Deploys"** > **"Trigger deploy"** > **"Deploy site"**

### Domínio customizado em CADA site:

1. No painel do site, clica em **"Domain settings"**
2. Clica em **"Add custom domain"**
3. Digita o subdomínio:
   - Marketing: `nextgenassets.com.br` + `www.nextgenassets.com.br`
   - Admin: `admin.nextgenassets.com.br`
   - Partner: `painel.nextgenassets.com.br`
   - Consumer: `app.nextgenassets.com.br`
4. Clica em **"Verify"** → **"Add domain"**
5. SSL provisiona sozinho em 1-5 minutos

---

# 8️⃣ Teste final (5min)

Quando tudo estiver pronto, abre essas URLs e verifica:

- ✅ `https://nextgenassets.com.br` — Marketing
- ✅ `https://admin.nextgenassets.com.br` — Admin (tela de login)
- ✅ `https://painel.nextgenassets.com.br` — Partner
- ✅ `https://app.nextgenassets.com.br` — Consumer
- ✅ `https://api.nextgenassets.com.br/health` — API health check
- ✅ `https://api.nextgenassets.com.br/api/docs` — Swagger da API

### Login no admin (se criou o banco OK):
- **Email:** `admin@nextgenassets.com.br`
- **Senha:** `Admin@2026` (se o seed rodou, mas só funciona se rolou pelo bash — se não rolou, cria usuário manualmente depois)

---

# 🆘 Se travar em algum lugar

Me manda print do erro / tela que aparece, e te ajudo na hora.

**Erros comuns:**

| Erro | Solução |
|---|---|
| "password authentication failed" no Render | DATABASE_URL com senha errada |
| "Connection refused" Redis | REDIS_URL com senha errada |
| Build falha no Render | Tira as env vars de OpenAI/WhatsApp, deixa em branco |
| Site do Netlify dá 404 | Aguarda 5min após adicionar domínio |
| SSL não funciona | Aguarda 1h (Let's Encrypt demora) |

---

# 📋 Checklist de progresso

### Banco (Supabase)
- [ ] Projeto criado em `sa-east-1`
- [ ] DATABASE_URL copiada (com senha substituída)
- [ ] SQL colado no SQL Editor e rodado com sucesso
- [ ] 8 tabelas aparecem no Table Editor
- [ ] 23 linhas em TriggerCatalog

### Redis (Upstash)
- [ ] Database criado em `us-east-1`
- [ ] REDIS_URL copiada

### API (Render)
- [ ] Web Service criado
- [ ] Todas as env vars adicionadas
- [ ] Plan Starter escolhido
- [ ] Build passou (5-10min)
- [ ] `/health` retorna `{"status":"ok"...}`

### DNS (Cloudflare)
- [ ] Domínio no Cloudflare
- [ ] 6 CNAMEs configurados
- [ ] `api` em cinza, outros em laranja

### 4 Sites (Netlify)
- [ ] 4 sites criados
- [ ] Variáveis de ambiente em cada
- [ ] Domínios customizados configurados
- [ ] Todos carregando

### Validação
- [ ] `https://api.nextgenassets.com.br/health` retorna ok
- [ ] `https://nextgenassets.com.br` carrega marketing
- [ ] `https://admin.nextgenassets.com.br` carrega admin

---

**Vai fazendo e me manda dizer em que passo tá que eu te ajudo!** 🚀
