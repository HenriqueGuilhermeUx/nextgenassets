# DEPLOY-NETLIFY.md — Frontends Next.js no Netlify

> **Como fazer deploy dos 4 frontends Next.js (Marketing, Admin, Partner, Consumer) no Netlify.**

---

## 0. Visão geral

| App | Pasta | Porta local | Subdomínio final |
|---|---|---|---|
| **Marketing** (site público) | `apps/marketing` | 3000 | `nextgenassets.com.br` |
| **Admin** (painel interno) | `apps/admin` | 3002 | `admin.nextgenassets.com.br` |
| **Partner** (portal B2B) | `apps/partner` | 3003 | `painel.nextgenassets.com.br` |
| **Consumer** (app do usuário) | `apps/consumer` | 3004 | `app.nextgenassets.com.br` |

> 💡 **Decisão:** **4 sites separados no Netlify** (mais simples) em vez de 1 monorepo com paths.

---

## 1. Pré-requisitos

- [ ] Código no GitHub (já feito no DEPLOY-RENDER.md)
- [ ] Conta no Netlify: [app.netlify.com](https://app.netlify.com) (criar com GitHub)
- [ ] API no Render funcionando em `https://api.nextgenassets.com.br`
- [ ] Domínio `nextgenassets.com.br` no Cloudflare

---

## 2. Prepara cada app pra Netlify

### 2.1 Cria `netlify.toml` em cada app

#### `apps/marketing/netlify.toml`
```toml
[build]
  base    = "apps/marketing"
  publish = ".next"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS    = "--legacy-peer-deps"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[[redirects]]
  from = "/*"
  to   = "/index.html"
  status = 200
```

#### `apps/admin/netlify.toml`
```toml
[build]
  base    = "apps/admin"
  publish = ".next"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS    = "--legacy-peer-deps"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

#### `apps/partner/netlify.toml`
```toml
[build]
  base    = "apps/partner"
  publish = ".next"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS    = "--legacy-peer-deps"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

#### `apps/consumer/netlify.toml`
```toml
[build]
  base    = "apps/consumer"
  publish = ".next"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS    = "--legacy-peer-deps"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### 2.2 Ajusta o `next.config.js` de cada app pra aceitar Netlify

```javascript
// apps/marketing/next.config.js (e idem pros outros)
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // ESSENCIAL pro Netlify
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};
module.exports = nextConfig;
```

### 2.3 Commit
```bash
git add .
git commit -m "feat: add Netlify deployment configs"
git push
```

---

## 3. Deploy de cada app (passo a passo)

Repete o processo **4 vezes** (uma pra cada app).

### 3.1 Add new site
1. Acessa [app.netlify.com](https://app.netlify.com)
2. **Add new site** → **Import an existing project**
3. Conecta o **GitHub** → seleciona `nextgen-assets`
4. Configura:

#### Marketing (apps/marketing)
| Campo | Valor |
|---|---|
| **Site name** | `nextgen-assets` |
| **Base directory** | `apps/marketing` |
| **Build command** | `npm run build` |
| **Publish directory** | `.next` |

#### Admin (apps/admin)
| Campo | Valor |
|---|---|
| **Site name** | `nga-admin` |
| **Base directory** | `apps/admin` |
| **Build command** | `npm run build` |
| **Publish directory** | `.next` |

#### Partner (apps/partner)
| Campo | Valor |
|---|---|
| **Site name** | `nga-partner` |
| **Base directory** | `apps/partner` |
| **Build command** | `npm run build` |
| **Publish directory** | `.next` |

#### Consumer (apps/consumer)
| Campo | Valor |
|---|---|
| **Site name** | `nga-consumer` |
| **Base directory** | `apps/consumer` |
| **Build command** | `npm run build` |
| **Publish directory** | `.next` |

### 3.2 Variáveis de ambiente (CRÍTICO)

Em **Site settings > Environment variables > Add a variable**:

#### Variáveis comuns a TODOS os frontends
| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.nextgenassets.com.br` |

#### (Opcional) Firebase — pra todos
| Key | Value |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `nextgen-assets.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `nextgen-assets` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `nextgen-assets.appspot.com` |

#### Específicas do Marketing
| Key | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://nextgenassets.com.br` |

#### Específicas do Admin
| Key | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://admin.nextgenassets.com.br` |
| `NEXT_PUBLIC_ADMIN_API_KEY` | (gera uma forte, tipo `nga_admin_xxxxx`) |

### 3.3 Clica em **Deploy site**
- Tempo de build: 2-5 minutos
- Acompanhe em **Deploys** → log em tempo real
- Quando terminar, status fica **Published** ✅

---

## 4. Domínios customizados

### 4.1 Marketing → `nextgenassets.com.br` (domínio raiz)

1. Painel do Netlify do site Marketing > **Domain settings**
2. **Add custom domain** → `nextgenassets.com.br`
3. **Add custom domain** → `www.nextgenassets.com.br`
4. Netlify vai pedir verificação — vai te dar os DNS records

**Configura no Cloudflare:**

| Tipo | Nome | Valor | Proxy |
|---|---|---|---|
| CNAME | `@` | `nextgen-assets.netlify.app` (apelido Netlify) | **DNS only** |
| CNAME | `www` | `nextgen-assets.netlify.app` | **DNS only** |

> ⚠️ O `@` (raiz) não pode ser CNAME direto. Soluções:
> - **Opção A (recomendada):** usa Cloudflare com proxy **desligado** (cinza), aí `@` aceita CNAME (CDN do Cloudflare não precisa)
> - **Opção B:** usa ALIAS/ANAME (Cloudflare suporta)

> 💡 **Dica:** Netlify também fornece DNS — se quiser, aponte os nameservers do Registro.br pra `dns1.p01.nsone.net` etc. (do Netlify). Aí configura tudo no painel do Netlify. Mais simples, mas tira o Cloudflare.

### 4.2 Admin → `admin.nextgenassets.com.br`
1. Painel do site Admin > **Domain settings**
2. **Add custom domain** → `admin.nextgenassets.com.br`

**Cloudflare:**

| Tipo | Nome | Valor | Proxy |
|---|---|---|---|
| CNAME | `admin` | `nga-admin.netlify.app` | **DNS only** |

### 4.3 Partner → `painel.nextgenassets.com.br`
| Tipo | Nome | Valor | Proxy |
|---|---|---|---|
| CNAME | `painel` | `nga-partner.netlify.app` | **DNS only** |

### 4.4 Consumer → `app.nextgenassets.com.br`
| Tipo | Nome | Valor | Proxy |
|---|---|---|---|
| CNAME | `app` | `nga-consumer.netlify.app` | **DNS only** |

### 4.5 SSL
Netlify provisiona SSL via Let's Encrypt automaticamente em até 5 minutos.

---

## 5. CORS no backend (Render)

A API no Render precisa **liberar CORS** pros frontends. Já configuramos `CORS_ORIGINS` no `render.yaml`, mas confere o valor:
```
CORS_ORIGINS=https://nextgenassets.com.br,https://www.nextgenassets.com.br,https://admin.nextgenassets.com.br,https://painel.nextgenassets.com.br,https://app.nextgenassets.com.br
```

Se mudar, **faz redeploy** da API.

---

## 6. Verificação

### 6.1 Cada site carrega?
- https://nextgenassets.com.br — Marketing ✅
- https://admin.nextgenassets.com.br — Admin ✅
- https://painel.nextgenassets.com.br — Partner ✅
- https://app.nextgenassets.com.br — Consumer ✅

### 6.2 Frontend conversa com API?
- Abre o **DevTools** (F12) no admin
- Vai em **Network**
- Faz login (ou tenta)
- Deve aparecer request pra `https://api.nextgenassets.com.br/api/...`
- Se retornar 200, tá OK

### 6.3 Login funciona end-to-end?
- Admin: login com `admin@nextgenassets.com.br` / `Admin@2026`
- Deve carregar o dashboard
- Se sim, **tudo tá conectado** ✅

---

## 7. Continuous Deployment

Netlify faz auto-deploy a cada push na branch `main`:
```bash
git add .
git commit -m "feat: atualização no marketing"
git push
# 4 sites rebuildam automaticamente em paralelo
```

**Builds paralelos:** cada site tem seu próprio build independente.

### 7.1 Deploy previews
Cada Pull Request gera um **preview único** (tipo `https://deploy-preview-42--nga-admin.netlify.app`).
- Perfeito pra QA antes de ir pra produção
- Testa em isolamento
- Destrói quando o PR é merged/closed

### 7.2 Branch deploys
Pode configurar pra cada branch ter um site:
- `main` → produção
- `staging` → https://staging--nga-admin.netlify.app
- `feature/x` → https://feature-x--nga-admin.netlify.app

---

## 8. Custos Netlify

| Plano | Bandwidth | Build minutes | Sites | Preço |
|---|---|---|---|---|
| **Free** | 100 GB/mês | 300 min/mês | Ilimitados | **$0** |
| **Pro** | 400 GB/mês | 1.000 min/mês | Ilimitados | $19/mês por member |
| **Business** | 800 GB/mês | 5.000 min/mês | Ilimitados | $99/mês por member |

> 💡 **Free é suficiente** pra MVP e piloto. Upgrade pra Pro só se passar de 100 GB/mês (~300k page views).

---

## 9. Troubleshooting

### Build falha com "Cannot find module"
- Confere que `npm install` rodou dentro do `base` directory
- Verifica `NPM_FLAGS=--legacy-peer-deps` no netlify.toml

### Variáveis de ambiente não funcionam
- Em Next.js, **só funciona** com prefixo `NEXT_PUBLIC_` no client
- Variáveis de servidor (sem prefixo) **não chegam** ao browser
- Confere que reiniciou o build após adicionar env var

### Domínio não carrega (404)
- DNS: `dig admin.nextgenassets.com.br` deve retornar o CNAME do Netlify
- Cloudflare proxy **DESLIGADO** (cinza)
- Esperou 30 minutos pra propagar?

### API retorna CORS error
- Acessa https://api.nextgenassets.com.br/health
- Confere `CORS_ORIGINS` no Render inclui o domínio exato
- Pode ser `www` vs sem `www` — testa os dois

### Build muito lento (>5min)
- Plano Free tem limite de 15 min por build
- Upgrade pra Pro se passar
- Cache de node_modules: adiciona `[[plugins]] package = "@netlify/plugin-cache"`

---

## ✅ Checklist (repetir pros 4 sites)

- [ ] `netlify.toml` criado em cada `apps/`
- [ ] `next.config.js` com `output: 'standalone'`
- [ ] Site criado no Netlify
- [ ] Variáveis de ambiente configuradas
- [ ] Primeiro deploy com sucesso
- [ ] Domínio customizado configurado
- [ ] DNS no Cloudflare apontando
- [ ] SSL ativo
- [ ] Login end-to-end funciona
- [ ] Auto-deploy ativo (faz um `git push` de teste)

---

## 📋 Resumo dos 4 sites

| Site | Netlify name | Domínio |
|---|---|---|
| Marketing | `nextgen-assets` | `nextgenassets.com.br` + `www.nextgenassets.com.br` |
| Admin | `nga-admin` | `admin.nextgenassets.com.br` |
| Partner | `nga-partner` | `painel.nextgenassets.com.br` |
| Consumer | `nga-consumer` | `app.nextgenassets.com.br` |

**Tudo conectado, tudo em HTTPS, tudo em produção.** 🚀
