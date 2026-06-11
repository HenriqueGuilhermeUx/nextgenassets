# ⚡ NextGen Assets — Browser Extension

**Cérebro B2B** que captura intenção de compra cross-marketplace e cria gatilhos automáticos no NextGen Assets.

## 🎯 O que faz

Quando o usuário visita uma página de produto em **Mercado Livre, Amazon BR ou Magazine Luiza**, a extensão:

1. **Detecta** produto + preço automaticamente (seletores específicos por marketplace)
2. **Injeta badge flutuante** com regra de compra sugerida (ex: "Comprar se cair 15%")
3. **1 clique** → cria gatilho no NextGen Assets via API
4. **IA do NextGen** (`/v1/ai/translate-rule`) traduz a regra pra JSON estruturado
5. **MarketWatcherWorker** monitora o preço 24/7 e dispara PIX quando bater

## 🏗️ Estrutura

```
extension/
├── manifest.json              # Manifest V3 config
├── icons/                     # Placeholders (gerar PNG 16/48/128)
├── src/
│   ├── lib/api.js            # Cliente API (auth + createTrigger)
│   ├── marketplaces/
│   │   ├── mercadolivre.js   # Seletores ML: .andes-money-amount__fraction
│   │   ├── amazon.js         # Seletores Amazon: .a-price .a-offscreen
│   │   └── magalu.js         # Seletores Magalu (regex no textContent)
│   ├── content/
│   │   ├── detector.js       # Orquestra detectores, injeta badge
│   │   └── badges.css        # Visual do badge flutuante
│   ├── popup/
│   │   ├── popup.html        # UI de login + lista de gatilhos
│   │   ├── popup.css
│   │   └── popup.js          # Lógica do popup
│   └── background/
│       └── background.js     # Service worker MV3
```

## 🔑 Como instalar (dev)

1. Abra `chrome://extensions/`
2. Ative **"Modo do desenvolvedor"** (canto superior direito)
3. Clique em **"Carregar sem compactação"**
4. Selecione a pasta `extension/`
5. Ícone ⚡ aparece na barra de extensões

## 🔐 Autenticação

1. Acesse `https://painel.nextgenassets.com.br/settings/tokens`
2. Gere um token de API (escopo `triggers:write`)
3. Cole o token no popup da extensão
4. Pronto — visita qualquer produto e a extensão injeta o badge

## 🧪 Como testar

1. Instale a extensão (passos acima)
2. Faça login no popup
3. Visite, por exemplo: `https://www.mercadolivre.com.br/p/MLB-123456789`
4. Badge ⚡ aparece no canto inferior direito com regra sugerida
5. Clique "🚀 Criar gatilho no NextGen"
6. Vá no painel: gatilho criado com `source: BROWSER_EXTENSION`

## 🛣️ Roadmap

- [ ] **v0.1** (esta versão): ML + Amazon + Magalu, badge + popup básico
- [ ] **v0.2**: Shopee, Americanas, Casas Bahia
- [ ] **v0.3**: Detecção de **carrinho abandonado** (cria gatilho de "comprar X se voltar ao estoque")
- [ ] **v0.4**: **Wishlist sync** — sincroniza com a wishlist do marketplace
- [ ] **v0.5**: **B2B dashboard** — marketplace vê volume de intenções capturadas
- [ ] **v1.0**: Publicar na Chrome Web Store (requer $5 dev account)

## 💰 Modelo de monetização (B2B)

- **Free** pra shoppers (constrói base)
- **B2C premium R$19,90/mês** com IA preditiva
- **B2B SaaS R$5-20k/mês** pra marketplaces (dashboard + analytics)
- **White-label R$50-100k** pra bancos
