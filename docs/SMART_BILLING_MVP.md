# NextGen Cobrança Inteligente — MVP

## Produto

A NextGen começa como uma plataforma de cobrança inteligente para empresas que hoje dependem de boleto, cobrança manual e baixa lenta.

Promessa principal:

> Substitua boletos por Pix, Pix Automático, lembretes e conciliação em tempo real.

## Fluxo operacional

1. Empresa cadastra ou importa clientes.
2. Empresa cria cobrança avulsa ou recorrente.
3. NextGen agenda lembretes automaticamente.
4. Cliente recebe lembrete/cobrança por WhatsApp, e-mail ou link.
5. Cliente paga por Pix, link Pix ou autoriza Pix Automático.
6. Webhook confirma pagamento.
7. Painel baixa a cobrança e atualiza o financeiro.

## Régua padrão de lembretes

| Etapa | Quando | Objetivo |
|---|---:|---|
| D-3 | 3 dias antes | Lembrete amigável |
| D-1 | 1 dia antes | Lembrete de vencimento |
| D0 | Dia do vencimento | Cobrança com link Pix |
| D+1 | 1 dia depois | Aviso de atraso |
| D+5 | 5 dias depois | Segunda cobrança |
| D+10 | 10 dias depois | Alerta para financeiro |

## Status de cobrança

- `PENDING`: criada, aguardando envio/pagamento.
- `SENT`: cobrança enviada ao cliente.
- `PAID`: pagamento confirmado.
- `OVERDUE`: vencida e não paga.
- `CANCELED`: cancelada.
- `FAILED`: erro operacional.

## Tabelas MVP

O controller cria automaticamente as tabelas se ainda não existirem:

- `smart_billing_customers`
- `smart_billing_charges`
- `smart_billing_reminders`

## Rotas MVP

Base de produção:

```txt
https://api.nextgenassets.com.br/v1
```

### Health

```txt
GET /company-billing/health
```

### Clientes

```txt
POST /company-billing/customers
GET  /company-billing/customers?partnerSlug=nextgen-assets
```

Exemplo:

```json
{
  "partnerSlug": "nextgen-assets",
  "name": "Cliente Teste",
  "externalCustomerId": "cliente-001",
  "phone": "",
  "email": "",
  "segment": "condominio"
}
```

### Cobranças

```txt
POST /company-billing/charges
GET  /company-billing/charges?partnerSlug=nextgen-assets
```

Exemplo:

```json
{
  "partnerSlug": "nextgen-assets",
  "externalCustomerId": "cliente-001",
  "amount": "100.00",
  "dueDate": "2026-07-05",
  "title": "Mensalidade teste",
  "description": "Cobrança teste"
}
```

### Dashboard

```txt
GET /company-billing/dashboard?partnerSlug=nextgen-assets
```

### Lembretes

```txt
GET  /company-billing/reminders/due?partnerSlug=nextgen-assets
POST /company-billing/reminders/run-due
```

No MVP, `run-due` simula ou marca lembretes como enviados. Próximo passo: plugar envio real por WhatsApp/e-mail.

## Painel empresa

Frontend MVP:

```txt
https://nextgenassets.com.br/painel-empresa
```

Funções:

- cadastrar cliente;
- criar cobrança;
- gerar lembretes;
- consultar dashboard;
- ver lembretes vencidos.

## Próximos passos

1. Ligar envio real por WhatsApp/e-mail.
2. Criar upload de planilha CSV/Excel.
3. Integrar Pix Cobrança real.
4. Integrar Pix Automático para cobranças recorrentes autorizadas.
5. Criar login de empresa.
6. Criar plano e checkout de assinatura PJ.
7. Criar painel financeiro com filtros e exportação.
