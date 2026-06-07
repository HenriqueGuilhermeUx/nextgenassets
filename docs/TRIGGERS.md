# Catálogo de Gatilhos — Orkest

> 20+ gatilhos pré-formatados. Cada um customizável em valores e limites. Sem código.

---

## 📈 Investimento Automático (4 gatilhos)

### `BUY_DIP_STOCK` — Caçador de Ações na Queda
Compra ação quando cai X% em janela Y.
```json
{ "ticker": "ITUB4", "dipPct": 2, "windowDays": 7, "amountBrl": 500, "minBalance": 5000 }
```
*"Compra R$ 500 de ITUB4 se cair 2% em 7 dias, mas só se saldo > R$ 5.000"*

### `STOP_LOSS_STOCK` — Stop-Loss
Vende ação se cair X% do preço de referência.
```json
{ "ticker": "PETR4", "lossPct": 10, "referencePrice": "avg_cost" }
```

### `TAKE_PROFIT_STOCK` — Take-Profit
Vende se subir X% (trava lucro).
```json
{ "ticker": "VALE3", "gainPct": 15, "sellPct": 100 }
```

### `YIELD_MAX_FUND` — Maximizador de Yield *(premium)*
Migra entre fundos buscando maior yield.
```json
{ "fundIds": ["XP_SELECTION", "BTG_YIELD"], "minYieldRatio": 110, "rebalanceFreqDays": 30 }
```

---

## 📊 Aportes Programados (3 gatilhos)

### `DCA_STOCK` — DCA em Ação
Compra ação todo mês.
```json
{ "ticker": "PETR4", "dayOfMonth": 10, "amountBrl": 200, "minBalance": 1000 }
```

### `DCA_FUND` — Aporte em Fundo
Aporta em fundo de investimento.
```json
{ "fundId": "XP_SELECTION", "dayOfMonth": 10, "amountBrl": 500, "minBalance": 1000 }
```

### `DCA_CRYPTO` — Dolarização
Compra USDC/USDY todo mês.
```json
{ "asset": "USDC", "dayOfMonth": 5, "amountBrl": 500 }
```

---

## 🏦 Bancário (4 gatilhos)

### `ROUND_UP_SAVINGS` — Arredondamento
Cada compra no cartão é arredondada, troco vai pra investimento.
```json
{ "roundToBrl": 5, "destinationFundId": "BTG_YIELD", "maxWeeklyBrl": 100 }
```

### `RASI_CAIXA_FUND` — Raspa Caixa
Move excedente de caixa pós-salário pra fundo DI.
```json
{ "fundId": "BTG_YIELD", "minCashReserve": 3000, "dayOfMonth": 7, "maxTransferBrl": 5000 }
```

### `GOAL_SAVINGS` — Meta de Economia
Guarda pra objetivo específico.
```json
{ "goalName": "Viagem 2027", "goalAmountBrl": 10000, "monthlyAmountBrl": 300, "destinationFundId": "XP_SELECTION" }
```

### `SALARY_AUTO_ALLOCATE` — Auto-Alocação pós-Salário
Detecta salário e distribui automaticamente.
```json
{ "employerPixKey": "empresa@pix.com", "minSalaryBrl": 3000, "allocationPct": 20, "destinations": [...] }
```

---

## 🛒 Consumo / Varejo (4 gatilhos)

### `RECURRING_BUY` — Compra Recorrente
Compra produto a cada N dias se preço está no range.
```json
{ "sku": "BISCOITO_Z", "frequencyDays": 30, "minPriceBrl": 5, "maxPriceBrl": 7, "quantity": 2 }
```

### `PRICE_ALERT_BUY` — Alerta de Preço
Espera preço-alvo e compra.
```json
{ "sku": "TV_50_4K", "targetPriceBrl": 2000, "currentPriceBrl": 2499 }
```

### `GIFT_AUTO_BUY` — Presente Automático
Compra presente em datas especiais.
```json
{ "recipientName": "João", "date": "2027-03-15", "maxAmountBrl": 100, "sku": "LIVRO_X" }
```

### `GROCERY_REPLENISHMENT` — Reposição *(premium)*
Detecta quando item acaba e recompra.
```json
{ "sku": "LEITE_INTEGRAL", "daysSinceLastPurchase": 7, "quantity": 4 }
```

---

## 🛍️ **NOVO** — Consumo Contextual (Recuperação de Carrinho Abandonado)

Estes gatilhos são o **diferencial de varejo** do Orkest. Permitem ao consumidor comprar baseado no **contexto financeiro real** (saldo, salário, contas pagas), não em datas fixas. **Converte carrinho abandonado em compra agendada com compromisso financeiro.**

### `BALANCE_TRIGGER_BUY` — Comprar Quando o Saldo Subir
Compra quando o saldo da conta passar de X. Perfeito pra quem quer esperar o salário cair.
```json
{ "sku": "PERFUME_IMPORTADO_X", "minBalance": 3000, "maxWaitDays": 90 }
```
> *"Compra o perfume quando meu saldo passar de R$ 3.000 (no dia do pagamento)"*

### `GOAL_ACCUMULATION_BUY` — Guardar Pra Comprar
Acumula valor semanal via Pix → subconta até bater o preço.
```json
{ "sku": "PERFUME_Y", "weeklyAmount": 50, "targetAmount": 500 }
```
> *"Guarda R$ 50/semana até juntar R$ 500 e compra o perfume"*

### `POST_BILLS_BUY` — Comprar Depois das Contas
Dispara no dia X apenas se todas as contas do mês já foram pagas E sobrar saldo mínimo.
```json
{ "sku": "PERFUME_Z", "dayOfMonth": 20, "minBalanceAfterBills": 1000 }
```
> *"No dia 20, se todas as contas foram pagas e sobrar R$ 1.000, compra o perfume"*

### `SALARY_TRIGGER_BUY` — Comprar Quando Cair Salário
Detecta crédito salarial maior que X no mês corrente.
```json
{ "sku": "PERFUME_W", "minSalary": 4000, "maxAmountBrl": 600 }
```
> *"Se eu receber mais de R$ 4.000 de salário este mês, compra o perfume"*

### `AUTO_BUY_ON_RESTOCK` — Comprar Quando Voltar ao Estoque
Espera produto voltar ao estoque e compra.
```json
{ "sku": "PERFUME_RARO_V", "maxPriceBrl": 550 }
```
> *"Quando o perfume raro voltar disponível, compra (até R$ 550)"*

---

## 💡 Utilidades (1 gatilho)

### `BILL_AUTO_PAY` — Conta Automática
Paga conta se valor < limite.
```json
{ "billType": "ENERGY", "providerId": "ENEL_SP", "maxAmountBrl": 350, "expectedDayOfMonth": 15 }
```

---

## 🛡️ Seguros (1 gatilho)

### `AUTO_PAY_INSURANCE` — Seguro em Dia
Paga prêmio automaticamente.
```json
{ "policyId": "PORTO_AUTO_12345", "dayOfMonth": 25, "maxAmountBrl": 350 }
```

---

## ✨ Custom (IA)

### `CUSTOM_NL` — Regra em Linguagem Natural
Descreva em português. A IA estrutura.
> "Se eu receber mais de R$ 3.000 nos próximos 5 dias, compra 60% em fundo e 40% em USDC"

---

## Categorias

| Categoria | Gatilhos | Premium |
|---|---|---|
| Investimento Automático | 4 | 1 |
| Aportes Programados | 3 | 0 |
| Bancário | 4 | 0 |
| Consumo Clássico | 4 | 1 |
| **Consumo Contextual** ⭐ | **5** | 0 |
| Utilidades | 1 | 0 |
| Seguros | 1 | 0 |
| Custom (IA) | 1 | 1 |
| **Total** | **23** | **3** |

⭐ **Consumo Contextual** = categoria especial pra varejo físico (perfume, eletrônicos, etc). Resolve o problema do carrinho abandonado com compra baseada em contexto financeiro real.
