# 🧪 Teste Rápido da Extensão

## 1. Gerar ícones placeholder

A extensão precisa de 3 PNGs (`16x16`, `48x48`, `128x128`). Como placeholder rápido, vou gerar SVGs e converter via comando. Mas por enquanto pode usar qualquer imagem quadrada.

```bash
# Solução rápida: criar PNGs pretos como placeholder
cd extension/icons
# Use o logo ⚡ sobre fundo verde NextGen (#00d97e)
# Pode usar https://favicon.io/ pra gerar a partir de emoji
```

## 2. Instalar no Chrome

1. Vá em `chrome://extensions/`
2. Toggle **"Developer mode"** (canto superior direito)
3. **"Load unpacked"** → selecione a pasta `/workspace/orkest/extension/`
4. Aparece ⚡ na barra

## 3. Login

1. Clique no ⚡
2. Cole um token (gere em `https://painel.nextgenassets.com.br/settings/tokens`)
3. Slug: `demo-marketplace` (default)
4. **"Conectar"**

## 4. Testar detecção

Visite:
- `https://www.mercadolivre.com.br/p/MLB123` (qualquer produto)
- `https://www.amazon.com.br/dp/B0XXXXX` (qualquer produto)
- `https://www.magazineluiza.com.br/...` (qualquer PDP)

Aguarda ~1.5s → badge ⚡ aparece no canto inferior direito → clica **"Criar gatilho"**.

## 5. Confirmar no painel

Vai em `https://painel.nextgenassets.com.br/triggers` → deve aparecer gatilho com `source: BROWSER_EXTENSION`.
