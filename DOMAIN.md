# DOMAIN.md — Como plugar nextgenassets.com.br

> **Guia completo pra registrar, configurar DNS, SSL e hospedar a plataforma no domínio `nextgenassets.com.br`.**

---

## 0. Visão geral dos subdomínios

A plataforma NGA usa **1 domínio principal + 6 subdomínios**:

| Subdomínio | Aponta pra | Função |
|---|---|---|
| `nextgenassets.com.br` | Marketing (porta 3000) | Site público institucional |
| `www.nextgenassets.com.br` | Marketing (porta 3000) | Redirect do www |
| `app.nextgenassets.com.br` | Consumer (porta 3004) | Portal do consumidor final |
| `painel.nextgenassets.com.br` | Partner (porta 3003) | Portal do parceiro B2B |
| `admin.nextgenassets.com.br` | Admin (porta 3002) | Painel interno (time Orkest) |
| `api.nextgenassets.com.br` | API (porta 3001) | Backend REST + Swagger |
| `widget.nextgenassets.com.br` | CDN (widget.js) | Script embeddable do widget |

> 💡 **Decisão recomendada:** usar subdomínios por app, em vez de paths (`/admin`, `/painel`). Mais limpo, melhor pra SSL, melhor pra CDN.

---

## 1. Registra o domínio (.com.br)

### 1.1 Onde registrar
- **Registro.br** ([registro.br](https://registro.br)) — entidade oficial, R$ 40/ano
- **Locaweb, Hostgator, UOL Host** — intermediários, às vezes cobram mais caro

### 1.2 Passos
1. Acessa [registro.br/dominio](https://registro.br/dominio)
2. Pesquisa: `nextgenassets.com.br`
3. Se disponível, clica em **Registrar**
4. Preenche dados do titular (pessoa física ou jurídica — usa o CNPJ se já tiver empresa)
5. Paga R$ 40 (cartão ou boleto)
6. Domínio liberado em **2-4 horas**

> ⚠️ **Importante:** Se você não tem empresa ainda, registra como pessoa física MESMO. Depois migra pra PJ via painel do Registro.br (grátis).

---

## 2. Configura DNS (Registro.br)

### 2.1 Acessa o painel
1. Login em [registro.br](https://registro.br)
2. Vai em **Domínios** > **nextgenassets.com.br** > **DNS**
3. Apaga os registros padrão (se houver)

### 2.2 Registros a criar

#### A — Aponta pro servidor principal (Hetzner)

| Tipo | Nome | Valor | TTL |
|---|---|---|---|
| A | `@` | `IP_DO_SERVIDOR_HETZNER` | 3600 |
| A | `www` | `IP_DO_SERVIDOR_HETZNER` | 3600 |
| A | `api` | `IP_DO_SERVIDOR_HETZNER` | 3600 |
| A | `admin` | `IP_DO_SERVIDOR_HETZNER` | 3600 |
| A | `painel` | `IP_DO_SERVIDOR_HETZNER` | 3600 |
| A | `app` | `IP_DO_SERVIDOR_HETZNER` | 3600 |
| A | `widget` | `IP_DO_SERVIDOR_HETZNER` | 3600 |

> 💡 **Pega o IP** no painel da Hetzner após criar o servidor (ex: `157.180.xx.xx`)

#### MX — E-mail (opcional, recomendado)
Se você quer e-mail `@nextgenassets.com.br`:

| Tipo | Nome | Valor | TTL |
|---|---|---|---|
| MX | `@` | `10 mx1.hostinger.com` (ou seu provedor) | 3600 |

Alternativas pra e-mail:
- **Zoho Mail** — grátis até 5 usuários
- **Google Workspace** — R$ 30/mês por usuário
- **Hostinger e-mail** — R$ 10/mês

#### TXT — Verificação de domínio (opcional)
| Tipo | Nome | Valor |
|---|---|---|
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` |

---

## 3. Configura o servidor (Hetzner)

### 3.1 Cria o servidor
1. Login em [hetzner.com/cloud](https://hetzner.com/cloud)
2. **New Server**:
   - **Tipo:** CX22 (2 vCPU, 4GB RAM, 40GB SSD) — €3.79/mês
   - **Imagem:** Ubuntu 22.04 LTS
   - **Localização:** Falkenstein (Ale) ou Helsinki (Fin)
   - **SSH Key:** adiciona a tua chave pública
3. Espera 1-2 min, servidor criado com IP público

### 3.2 Conecta via SSH
```bash
ssh root@SEU_IP
```

### 3.3 Instala dependências
```bash
# Atualiza
apt update && apt upgrade -y

# Instala Docker
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# Instala nginx + certbot (SSL grátis)
apt install -y nginx certbot python3-certbot-nginx

# Instala utilitários
apt install -y git curl wget htop vim
```

---

## 4. Configura o nginx (proxy reverso)

### 4.1 Arquivo: `/etc/nginx/sites-available/nextgenassets`

Cria o arquivo:
```bash
nano /etc/nginx/sites-available/nextgenassets
```

Conteúdo:
```nginx
# ============================================
# NGINX REVERSE PROXY — NextGen Assets
# ============================================

# Redireciona HTTP → HTTPS
server {
    listen 80;
    server_name nextgenassets.com.br www.nextgenassets.com.br api.nextgenassets.com.br admin.nextgenassets.com.br painel.nextgenassets.com.br app.nextgenassets.com.br widget.nextgenassets.com.br;
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# ============================================
# MARKETING (Site público) — porta 3000
# ============================================
server {
    listen 443 ssl http2;
    server_name nextgenassets.com.br www.nextgenassets.com.br;
    
    ssl_certificate /etc/letsencrypt/live/nextgenassets.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nextgenassets.com.br/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# ============================================
# API — porta 3001
# ============================================
server {
    listen 443 ssl http2;
    server_name api.nextgenassets.com.br;
    
    ssl_certificate /etc/letsencrypt/live/nextgenassets.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nextgenassets.com.br/privkey.pem;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /health {
        access_log off;
        proxy_pass http://localhost:3001/health;
    }
}

# ============================================
# ADMIN (Time Orkest) — porta 3002
# ============================================
server {
    listen 443 ssl http2;
    server_name admin.nextgenassets.com.br;
    
    ssl_certificate /etc/letsencrypt/live/nextgenassets.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nextgenassets.com.br/privkey.pem;
    
    # Segurança extra: restringir por IP (opcional)
    # allow 203.0.113.0/24;
    # deny all;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# ============================================
# PARTNER (Portal B2B) — porta 3003
# ============================================
server {
    listen 443 ssl http2;
    server_name painel.nextgenassets.com.br;
    
    ssl_certificate /etc/letsencrypt/live/nextgenassets.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nextgenassets.com.br/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# ============================================
# CONSUMER (App do usuário) — porta 3004
# ============================================
server {
    listen 443 ssl http2;
    server_name app.nextgenassets.com.br;
    
    ssl_certificate /etc/letsencrypt/live/nextgenassets.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nextgenassets.com.br/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# ============================================
# WIDGET (CDN) — porta 3005
# ============================================
server {
    listen 443 ssl http2;
    server_name widget.nextgenassets.com.br;
    
    ssl_certificate /etc/letsencrypt/live/nextgenassets.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nextgenassets.com.br/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 4.2 Ativa o site
```bash
ln -s /etc/nginx/sites-available/nextgenassets /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

---

## 5. SSL grátis (Let's Encrypt)

### 5.1 Gera certificado (cobre todos os subdomínios)
```bash
certbot --nginx \
  -d nextgenassets.com.br \
  -d www.nextgenassets.com.br \
  -d api.nextgenassets.com.br \
  -d admin.nextgenassets.com.br \
  -d painel.nextgenassets.com.br \
  -d app.nextgenassets.com.br \
  -d widget.nextgenassets.com.br \
  --email contato@nextgenassets.com.br \
  --agree-tos \
  --no-eff-email
```

### 5.2 Renovação automática
```bash
# Testa renovação
certbot renew --dry-run

# Adiciona no crontab (renova automaticamente)
crontab -e
# Adiciona:
0 3 * * * certbot renew --quiet
```

### 5.3 Testa o SSL
Acessa: https://www.ssllabs.com/ssltest/analyze.html?d=nextgenassets.com.br
- **Esperado:** A ou A+ (nota máxima)

---

## 6. Sobe a aplicação

### 6.1 Clone o projeto
```bash
cd /opt
git clone https://github.com/seu-usuario/nextgen-assets.git
cd nextgen-assets
```

### 6.2 Configura .env da API
```bash
nano apps/api/.env
```

Conteúdo (template):
```bash
# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://orkest:orkest_prod@postgres:5432/orkest

# ============================================
# REDIS
# ============================================
REDIS_URL=redis://redis:6379

# ============================================
# JWT
# ============================================
JWT_SECRET=mude-isso-em-producao-use-32-chars-min
JWT_REFRESH_SECRET=outro-secret-diferente-32-chars-min
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# OPENAI
# ============================================
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MODEL=gpt-4o-mini

# ============================================
# ANTHROPIC (FALLBACK)
# ============================================
ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_MODEL=claude-haiku-4-5

# ============================================
# EFÍ BANK (Open Finance + ITP)
# ============================================
EFI_API_URL=https://api.efi.com.br/v1
EFI_CLIENT_ID=Client_Id_xxxxx
EFI_CLIENT_SECRET=Client_Secret_xxxxx
EFI_PIX_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
EFI_CERTIFICATE_PATH=/opt/nextgen-assets/certs/efi.p12

# ============================================
# WOOVI (Pix/Subcontas)
# ============================================
WOOVI_API_URL=https://api.woovi.com/v1
WOOVI_APP_ID=app_xxxxx
WOOVI_API_KEY=xxxxx

# ============================================
# WHATSAPP
# ============================================
WHATSAPP_PROVIDER=zapi
WHATSAPP_API_URL=https://api.z-api.io
WHATSAPP_INSTANCE_ID=xxxxx
WHATSAPP_TOKEN=xxxxx

# ============================================
# DOMÍNIO
# ============================================
APP_URL=https://nextgenassets.com.br
API_URL=https://api.nextgenassets.com.br
WIDGET_URL=https://widget.nextgenassets.com.br

# ============================================
# ENVIRONMENT
# ============================================
NODE_ENV=production
PORT=3001
```

### 6.3 Sobe com Docker Compose
```bash
cd /opt/nextgen-assets
docker compose -f deploy/docker-compose.prod.yml up -d
```

### 6.4 Roda migrations
```bash
docker compose -f deploy/docker-compose.prod.yml exec api npx prisma migrate deploy
docker compose -f deploy/docker-compose.prod.yml exec api npx ts-node prisma/seed.ts
```

### 6.5 Verifica se tá tudo OK
```bash
# Health check API
curl https://api.nextgenassets.com.br/health
# → {"status":"ok","db":"connected","redis":"connected"}

# Site
curl https://nextgenassets.com.br
# → HTML do marketing

# Admin
curl https://admin.nextgenassets.com.br
# → HTML do admin
```

---

## 7. Checklist final

- [ ] Domínio `nextgenassets.com.br` registrado no Registro.br
- [ ] DNS apontando pro IP do servidor (todos os 7 subdomínios)
- [ ] Servidor Hetzner criado (CX22, Ubuntu 22.04)
- [ ] Docker + nginx + certbot instalados
- [ ] Nginx configurado como reverse proxy
- [ ] SSL gerado pra todos os subdomínios (Let's Encrypt)
- [ ] SSL nota A ou A+ no SSL Labs
- [ ] Aplicação rodando em Docker
- [ ] Migrations aplicadas
- [ ] Admin acessível em `https://admin.nextgenassets.com.br`
- [ ] API respondendo em `https://api.nextgenassets.com.br/health`
- [ ] Site público em `https://nextgenassets.com.br`
- [ ] E-mail `contato@nextgenassets.com.br` funcionando (opcional mas recomendado)
- [ ] Backups automáticos configurados
- [ ] Monitoramento (Sentry + UptimeRobot) ativo

---

## 8. Custos anuais

| Item | Custo |
|---|---|
| Domínio `.com.br` | R$ 40/ano |
| Hetzner CX22 | €3.79/mês (~R$ 240/ano) |
| SSL | Grátis (Let's Encrypt) |
| **Total ano 1** | **~R$ 280/ano** |

Depois você escala pra CX32 (€5.39/mês) ou CX42 (€8.59/mês) conforme cresce.

---

## 9. Troubleshooting

### DNS não propagou
- Espera até 24h (geralmente 30 minutos)
- Testa em https://dnschecker.org
- `dig nextgenassets.com.br` (Linux/Mac)
- `nslookup nextgenassets.com.br` (Windows)

### SSL não gera
```bash
# Verifica se a porta 80 está aberta
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verifica logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### Nginx dá 502 Bad Gateway
```bash
# Verifica se os apps estão rodando
docker ps

# Verifica logs
docker logs nga-api
docker logs nga-admin
```

### Site não carrega assets
```bash
# Verifica CORS no nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
```

---

## 10. Próximos passos

1. ✅ **HOJE:** Registra o domínio no Registro.br
2. ✅ **HOJE:** Cria servidor Hetzner
3. ✅ **AMANHÃ:** Configura DNS, nginx, SSL
4. ✅ **SEMANA 1:** Sobe a aplicação, testa em sandbox
5. ✅ **SEMANA 2:** Configura Efí + Woovi em homologação
6. ✅ **SEMANA 3:** Primeiro cliente-piloto

Bora! 🚀
