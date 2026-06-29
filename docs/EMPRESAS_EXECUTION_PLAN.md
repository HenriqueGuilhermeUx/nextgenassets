# NextGen Assets — Plano EMPRESAS

## Objetivo

Simplificar a NextGen para vender para empresas: marketplaces, ERPs, SaaS, e-commerces, franquias, clubes de assinatura e apps que precisam de Pix, split, assinatura e gatilhos comerciais.

## Posicionamento

> NextGen Assets ajuda empresas a vender mais com Pix inteligente, split automático e gatilhos comerciais.

Não vender primeiro como cripto, smart wallet, investimento ou sandbox pessoal. Esses produtos ficam para Nexa/Staff e roadmap.

---

## 1. Corrigir endpoint público de gatilhos

Status: FEITO.

O endpoint `POST /v1/triggers` agora aceita dois formatos:

### Formato legado

```json
{
  "partnerId": "...",
  "userId": "...",
  "code": "GATILHO_CARRINHO_ABANDONADO",
  "params": {}
}
```

### Formato B2B / extensão

```json
{
  "catalogCode": "PRICE_DROP",
  "naturalLanguageRule": "Comprar se cair 15%",
  "source": "BROWSER_EXTENSION",
  "sourceMetadata": {
    "marketplace": "mercadolivre",
    "url": "https://...",
    "productTitle": "Produto X",
    "productPriceBrl": 1000
  }
}
```

Headers aceitos:

```txt
X-API-Key: nka_...
X-Partner-Slug: demo-marketplace
Authorization: Bearer nka_...
```

Também foi mantido o alias:

```txt
POST /v1/triggers/create
```

---

## 2. Banco de dados seguro

Status: FEITO.

Criado arquivo seguro:

```txt
SQL_PROD_SAFE_NEXTGEN_EMPRESAS.sql
```

Regra: não rodar SQL com `DROP TABLE` em produção. Scripts com DROP são apenas para banco demo/vazio.

---

## 3. Site focado em EMPRESAS

Status: FEITO.

Criada página:

```txt
/empresas
```

Mensagem principal:

```txt
Venda mais com Pix inteligente e gatilhos comerciais.
```

Produtos vendidos:

1. Pix Split para marketplaces
2. Pix recorrente para assinaturas
3. Gatilhos comerciais inteligentes

---

## 4. Open Finance Efí / PISP

Status: PRÓXIMO.

Objetivo: destravar fluxo de consentimento + iniciação de pagamento.

Checklist:

1. Confirmar `.env` da API:
   - `EFI_CLIENT_ID`
   - `EFI_CLIENT_SECRET`
   - `EFI_CERTIFICATE_BASE64`
   - `EFI_CERT_PASSPHRASE`
   - `EFI_OF_ENABLED=true`
2. Testar geração de token mTLS.
3. Testar criação de consentimento.
4. Confirmar redirect URL recebido da Efí.
5. Confirmar webhook de consentimento autorizado.
6. Testar iniciação de Pix com idempotency key.
7. Registrar logs de erro completos.

---

## 5. Demo pública para vender

Próximo passo depois de Efí:

Criar demo com 3 botões:

1. Simular cobrança com split
2. Simular carrinho abandonado
3. Simular assinatura Pix

Cada demo precisa gerar resultado visual e webhook/log no painel.

---

## 6. Copy comercial

Mensagem curta:

> Em poucos dias, sua empresa passa a receber Pix com split, cobrar assinaturas recorrentes e ativar gatilhos comerciais que recuperam venda automaticamente.

---

## 7. Oferta inicial

### Start
R$ 497/mês + take rate.

### Growth
R$ 1.997/mês + take rate.

### Enterprise
Setup + mensalidade custom.

---

## 8. Prospecção

Lista inicial:

- Marketplaces pequenos
- Franquias
- Clubes de assinatura
- SaaS B2B
- Infoprodutores
- ERPs de nicho
- Lojas premium
- Educação recorrente
- Saúde recorrente
- Serviços mensais

Mensagem:

> Tenho uma infraestrutura pronta para sua empresa vender mais com Pix: split automático, assinatura recorrente e gatilhos comerciais. Posso te mostrar uma demo de 10 minutos?
