# 💰 Pricing & Modelo de Negócio

> **Para:** Devs/parceiros querendo entender quanto custa usar NextGen

---

## 📊 Modelo de Receita

NextGen ganha de **2 formas**:

1. **Comissão sobre split** (B2B) - 3% de cada transação
2. **SaaS mensal** (B2C) - Planos FREE / PREMIUM / ENTERPRISE

---

## 🏢 B2B - Split de Pagamento (Marketplace)

### Quem paga: o vendedor do marketplace

**Comissão NextGen:** 3% de cada venda
**Taxa Woovi:** 0,5% (gateway PIX)
**Vendedor recebe:** 96,5%

### Exemplo

```
Marketplace vende R$ 1.000,00:
  ├─ NextGen fica com R$ 30,00 (3%)
  ├─ Woovi retém R$ 5,00 (0.5%)
  └─ Vendedor recebe R$ 965,00 (96.5%)
```

### Casos especiais

**Marketplace com comissão customizada:**

```javascript
// Partner pode setar commissionRate próprio
// Ex: 5% ao invés de 3%
PATCH /v1/admin/webhooks/partners/{partnerId}
{
  "commissionRate": 0.05  // 5%
}
```

**Sem split (NextGen cobra flat fee):**

```
R$ 100,00 = R$ 99,00 vendedor + R$ 1,00 NextGen
```

---

## 👤 B2C - SaaS (Triggers + AI)

### Quem paga: o usuário final (consumer)

| Plano | Preço | Triggers/mês | Features |
|---|---|---|---|
| **FREE** | R$ 0 | 5 | Split básico |
| **PREMIUM** | R$ 29,90 | 100 | + Open Finance + AI |
| **ENTERPRISE** | Custom | Ilimitado | Tudo + custom |

### Features por plano

#### FREE (R$ 0)
- ✅ Cobranças PIX com split
- ✅ 1 subconta
- ✅ Dashboard básico
- ❌ Open Finance
- ❌ AI Orchestrator
- ❌ Webhooks customizados

#### PREMIUM (R$ 29,90)
- ✅ Tudo do FREE
- ✅ **Open Finance read** (Klavi/Pluggy)
- ✅ **AI Orchestrator** (linguagem natural → trigger)
- ✅ Subcontas ilimitadas
- ✅ Webhooks customizados
- ✅ 100 triggers/mês
- ❌ Open Finance PISP (write)

#### ENTERPRISE (custom)
- ✅ Tudo do PREMIUM
- ✅ **Open Finance PISP** (Efi OF)
- ✅ Multi-partner
- ✅ SLA garantido
- ✅ Suporte dedicado
- ✅ Triggers ilimitados

---

## 🏦 Custos de Provider (passados)

| Provider | Custo | Quem paga |
|---|---|---|
| **Woovi** | 0,5% por charge | Vendedor (do split) |
| **Pluggy** | R$ 0,50/query OF | User B2C (do plano) |
| **Klavi** | Free sandbox, R$ 0,10/query prod | User B2C (do plano) |
| **Efi OF** | Grátis (PISP) | Incluso |
| **OpenAI** | ~R$ 0,10/trigger AI | NextGen (custo operacional) |
| **Render** | $7/mês (Standard) | NextGen |
| **Supabase** | $25/mês (Pro) | NextGen |
| **Netlify + Vercel** | Free tier | NextGen |

---

## 💵 Exemplo Completo (B2B)

**Marketplace que vende R$ 50.000/mês:**

```
Revenue bruto: R$ 50.000
├─ NextGen recebe: R$ 1.500 (3% split)
├─ Woovi retém: R$ 250 (0.5%)
└─ Vendedor recebe: R$ 48.250

Custos operacionais NextGen:
├─ Render: R$ 35
├─ Supabase: R$ 125
├─ OpenAI (se AI usado): ~R$ 50
├─ Open Finance (Pluggy): R$ 0 (se não usar)
└─ Total custos: ~R$ 210

Lucro líquido NextGen: R$ 1.500 - R$ 210 = R$ 1.290/mês
```

---

## 💵 Exemplo Completo (B2C)

**1000 usuários, 100 pagam PREMIUM (R$ 29,90):**

```
Revenue SaaS: 100 × R$ 29,90 = R$ 2.990/mês

Custos:
├─ Render: R$ 35
├─ Supabase: R$ 125
├─ OpenAI: R$ 200 (cada user usa ~10x AI)
├─ Klavi (1000 users × 10 queries × R$ 0,10): R$ 1.000
└─ Total: R$ 1.360

Lucro: R$ 2.990 - R$ 1.360 = R$ 1.630/mês
```

---

## 🛒 Estratégia de Pricing

### Por que 3%?

- **Mais barato** que:
  - Stripe (4% + R$ 0,30)
  - PayPal (5-6%)
  - Iugu (4,5%)
  - Asaas (~3,5%)

- **Mais caro** que:
  - Mercado Pago (2,99%)
  - Woovi direto (1,99% + R$ 0,10)

**Sweet spot:** competitivo, sustentável.

### Por que plano FREE?

- Aquisição de usuários (land-and-expand)
- 5 triggers/mês é suficiente pra testar
- Upgrade natural quando precisa mais

---

## 📈 Como Aumentar Receita

### Upsell B2B
- Comissão customizada (3% → 5% para premium partners)
- White-label (logo custom, sem NextGen branding)
- SLA garantido

### Upsell B2C
- FREE → PREMIUM (R$ 29,90)
- PREMIUM → ENTERPRISE (R$ 199+)
- Add-ons:
  - +100 triggers (R$ 9,90)
  - Open Finance PISP (R$ 49,90)
  - AI Avançado (R$ 19,90)

### Marketplace Fee
- Cobrar 1% de taxa de processamento
- Volume discount (> R$ 100k/mês → 2,5%)

---

## 🤝 Programa de Parceiros (B2B2B)

**Para:** Agências, consultorias, integradores

```
Você integra NextGen em 10 clientes × R$ 5k/mês = R$ 50k/mês
Sua comissão: 20% da receita de comissão = R$ 500/mês passivo
```

**Requisitos:**
- Ser dev partner registrado
- Indicar clientes
- Suporte básico (1º nível)

**Benefícios:**
- 20% recorrente da comissão
- Acesso a API extended
- Suporte direto do Henrique
- Co-marketing

---

## 💎 Pricing Premium (futuro)

| Feature | Preço |
|---|---|
| **White-label** (sua marca, sem NextGen) | R$ 199/mês |
| **Multi-partner** (vários marketplaces em 1 conta) | R$ 99/mês |
| **SLA 99.9%** | R$ 299/mês |
| **Suporte 24/7** | R$ 499/mês |
| **API extended** (50k calls/dia) | R$ 149/mês |

---

## 📞 Negociação

**Para deals grandes (> R$ 10k/mês):**
- Email: vendas@nextgenassets.com.br
- WhatsApp: +55 11 94798-4328

**Desconto por volume:**
- R$ 10-50k/mês: 10% off
- R$ 50-200k/mês: 20% off
- R$ 200k+/mês: custom

---

## 📊 Comparação com Concorrência

| Feature | NextGen | Stripe | Asaas | Iugu |
|---|---|---|---|---|
| Split nativo | ✅ 3% | ✅ 4% | ❌ | ❌ |
| Open Finance | ✅ | ❌ | ✅ | ✅ |
| Pix Automático | ✅ | ❌ | ✅ | ✅ |
| AI | ✅ | ❌ | ❌ | ❌ |
| Multi-partner | ✅ | ❌ | ❌ | ❌ |
| White-label | ✅ | ❌ | ✅ | ✅ |
| Sandbox free | ✅ | ✅ | ❌ | ❌ |
| **Preço total** | **3,5%** | **4,3%** | **3,5%+R$0,30** | **4,5%+R$0,30** |

---

## 🆘 Dúvidas?

- **Email:** vendas@nextgenassets.com.br
- **WhatsApp:** +55 11 94798-4328

---

**Próximo:** [Voltar ao início](00_START_HERE.md)
