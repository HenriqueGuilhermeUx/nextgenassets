# Orkest Widget — Documentação

> Embeddable button que adiciona "Comprar por Gatilho" em qualquer e-commerce.

## 🎯 Visão Geral

O Orkest Widget é um **snippet JS** (similar ao Google Analytics) que qualquer e-commerce pode instalar. Quando ativo, ele renderiza um botão "🎯 Comprar por Gatilho" ao lado dos botões tradicionais (Pix, Cartão, Boleto). O consumidor clica, configura uma regra baseada na sua vida financeira, e o Orkest executa a compra quando a condição for atingida.

## ✨ Features

- **Auto-detect de produto** (Schema.org, Open Graph, meta tags, JSON-LD)
- **5 tipos de gatilho** prontos (saldo, dia do mês, salário, acumulação, restock)
- **Open Finance** integrado (consentimento read-only, padrão BC)
- **Modal responsivo** que funciona em mobile e desktop
- **Auto-redirect** para notificação WhatsApp quando a compra é executada
- **Multi-plataforma**: Shopify, WooCommerce, VTEX, Nuvemshop, custom HTML

## 📦 Instalação

### Opção 1: Snippet Genérico (qualquer site)

Cole no `<head>` do site:

```html
<script src="https://widget.orkest.com.br/v1/orkest-widget.js"></script>
<script>
  OrkestWidget.init({
    apiKey: 'pk_live_xxxxx',  // obtido no dashboard do Orkest
    mode: 'auto',             // detecta produto automaticamente
    theme: 'light'            // 'light' ou 'dark'
  });
</script>
```

O widget vai:
1. Detectar produto da página (JSON-LD, OG tags, microdata)
2. Procurar botão "Comprar" no DOM
3. Injetar botão "🎯 Comprar por Gatilho" logo abaixo
4. Configurar tudo automaticamente

### Opção 2: Data Attribute (controle total)

```html
<div data-orkest-button
     data-orkest-sku="PERFUME_X"
     data-orkest-price="489"
     data-orkest-name="Perfume Importado X 100ml">
</div>
```

O widget substitui essa div pelo botão Orkest. Use quando você quer controle exato de onde o botão aparece.

### Opção 3: JavaScript Manual

```javascript
OrkestWidget.setProduct({
  sku: 'PRODUTO_123',
  name: 'Nome do Produto',
  price: 489.00,
  currency: 'BRL',
  image: 'https://...',
  url: 'https://...'
});
```

## 🛍️ Plataformas Suportadas

### Shopify (App 1-click)

Em desenvolvimento: app oficial na Shopify App Store. Instalação via 1-click.

```bash
# Quando disponível, em Breve
```

**Workaround atual**: instale via theme.liquid:

1. Vá em `Online Store > Themes > Actions > Edit Code`
2. Abra `theme.liquid`
3. Cole o snippet antes do `</head>`
4. Salve

### WooCommerce (Plugin)

```bash
# Em Breve: plugin oficial no WordPress.org
```

**Workaround atual**: instale via header.php do tema:

1. Vá em `Appearance > Theme Editor > header.php`
2. Cole antes do `</head>`
3. Salve

### VTEX (IO App)

```bash
# Em Breve: VTEX IO App
```

### Nuvemshop / Tray / Yampi

Todos suportam injeção de JS no checkout. Cole o snippet no campo "Scripts adicionais".

### Custom HTML

Cole o snippet direto no HTML do site.

## 🎨 Customização

### Tema

```javascript
OrkestWidget.init({
  theme: 'dark'  // ou 'light'
});
```

### Posição

```javascript
OrkestWidget.init({
  position: 'inline'  // padrão: injeta após "Comprar"
  // ou 'floating' (botão fixo no canto)
  // ou 'modal' (só abre quando invocado)
});
```

### Callbacks

```javascript
OrkestWidget.init({
  onTriggerConfigured: (data) => {
    // Envia evento pro Google Analytics, Meta Pixel, etc
    gtag('event', 'orkest_trigger_configured', { sku: data.sku, trigger: data.triggerCode });
  },
  onTriggerExecuted: (data) => {
    // Compra executada!
    console.log('Compra executada:', data);
  }
});
```

## 📡 Eventos do Widget

O widget emite eventos que você pode escutar:

| Evento | Quando | Payload |
|---|---|---|
| `orkest:initialized` | Widget carregou | `{ apiKey, mode }` |
| `orkest:product_detected` | Produto encontrado | `{ sku, price, name }` |
| `orkest:button_rendered` | Botão injetado | `{ sku, position }` |
| `orkest:modal_opened` | Modal abriu | `{ sku }` |
| `orkest:trigger_configured` | Gatilho ativado | `{ sku, triggerCode, params }` |
| `orkest:modal_closed` | Modal fechou | `{ reason }` |

Escute via:

```javascript
window.addEventListener('orkest:trigger_configured', (e) => {
  console.log('Gatilho configurado:', e.detail);
});
```

## 🔐 Segurança & LGPD

- **Read-only por padrão**: Orkest só lê saldo/extrato, nunca mexe sem autorização
- **Consentimento explícito**: usuário aceita na tela, com opção de revogar
- **Sem armazenamento de credenciais**: tokens criptografados no Vault
- **Audit log**: cada gatilho ativado é registrado
- **Direito de exportação**: usuário pode baixar todos os dados (LGPD Art. 18)

## 🧪 Testando localmente

```bash
# 1. Sobe o site público do Orkest
cd /workspace/orkest
npm run dev:marketing

# 2. Acessa a demo
# → http://localhost:3000/widget/demo.html
# (rota mapeada via Next.js public/)
```

A demo renderiza uma **loja fake de perfumaria** com o widget já instalado. Clique no botão rosa pra ver o modal funcionando.

## 📊 Métricas de Sucesso

| Métrica | Meta | Por quê |
|---|---|---|
| **Add-to-cart rate** | +15-30% | Botão adicional captura "would-have-left" |
| **Trigger configuration rate** | 8-15% dos visitantes | Captura intenção declarada |
| **Trigger-to-purchase** | 25-40% | Converte gatilho em compra real |
| **Avg days to convert** | 14-30 dias | Tempo médio entre config e execução |
| **ROI do widget** | 5-10x | Receita recuperada vs custo de instalação |

## 🚀 Roadmap

- [x] Auto-detect de produto
- [x] 5 gatilhos pré-formatados
- [x] Modal responsivo
- [x] Demo page
- [ ] Shopify App (oficial)
- [ ] WooCommerce Plugin (oficial)
- [ ] VTEX IO App
- [ ] Nuvemshop Plugin
- [ ] A/B testing de copy
- [ ] Personalização de cores via dashboard
- [ ] Webhooks out do widget

## 💡 Boas Práticas

1. **Posicione o botão DEPOIS do "Comprar agora"** — captura quem está hesitante
2. **Use copy amigável** — "🎯 Comprar por Gatilho Inteligente" > "Configurar Automação"
3. **Adicione tooltip** — "💡 Pague quando puder"
4. **Teste em mobile** — 60%+ do tráfego de e-commerce é mobile
5. **Monitore conversões** — integre com GA4 / Meta Pixel
6. **Não esconda o Pix** — o widget complementa, não substitui

## 🆘 Suporte

- Email: widget@orkest.com.br
- Slack: orkest-workspace.slack.com
- Docs: https://docs.orkest.com.br/widget
