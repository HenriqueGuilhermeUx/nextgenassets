# NextGen Cobrança Inteligente — Modo Inicial com Repasse Manual

## Objetivo

Permitir vender o serviço imediatamente, mesmo antes do split automático estar 100% operacional em todos os provedores.

## Tese

No início, a NextGen pode receber a cobrança em conta própria/provedor e repassar manualmente o valor líquido para a empresa cliente.

Fluxo:

```txt
Cliente final paga
→ NextGen registra recebimento
→ sistema calcula taxa NextGen
→ sistema calcula líquido da empresa
→ fica como repasse pendente
→ operador faz Pix manual para a empresa
→ operador marca como repassado com referência/comprovante
```

## Cuidados operacionais

- Preferir repasse manual via Pix/transferência com comprovante.
- Evitar dinheiro em espécie.
- Guardar referência do comprovante.
- Manter relatório de repasses pendentes e realizados.
- Não prometer split instantâneo antes do provedor estar validado.
- Comunicar como “repasse operacional manual no piloto”.

## Status

- `EXPECTED`: cobrança prevista, dinheiro ainda não caiu.
- `REPASS_PENDING`: dinheiro caiu, repasse para empresa está pendente.
- `REPASSED`: repasse manual realizado.
- `CANCELED`: registro cancelado.

## Rotas

Base:

```txt
https://api.nextgenassets.com.br/v1
```

Criar previsão/repasse manual:

```txt
POST /company-billing/manual-settlements
```

Exemplo:

```json
{
  "partnerSlug": "empresa-xpto",
  "grossCents": 10000,
  "nextgenRate": 0.03,
  "providerFeeCents": 50,
  "recipientName": "Empresa XPTO",
  "recipientRef": "Pix/conta cadastrada no contrato",
  "description": "Mensalidade Julho",
  "received": true
}
```

Listar pendentes:

```txt
GET /company-billing/manual-settlements/pending?partnerSlug=empresa-xpto
```

Resumo:

```txt
GET /company-billing/manual-settlements/summary?partnerSlug=empresa-xpto
```

Marcar como recebido:

```txt
POST /company-billing/manual-settlements/:id/mark-received
```

Marcar como repassado:

```txt
POST /company-billing/manual-settlements/:id/mark-repassed
```

Exemplo:

```json
{
  "repassReference": "Comprovante Pix 12345",
  "notes": "Repasse feito manualmente em 2026-06-29"
}
```

Cancelar:

```txt
POST /company-billing/manual-settlements/:id/cancel
```

## Fórmula padrão

```txt
valor bruto recebido
- taxa NextGen
- taxa do provedor
= valor líquido da empresa
```

Exemplo:

```txt
R$ 100,00 recebido
- R$ 3,00 NextGen
- R$ 0,50 provedor
= R$ 96,50 para repassar
```

## Caminho de evolução

1. Repasse manual controlado.
2. Woovi split para Pix cobrança.
3. Efí Split quando cliente tiver conta Efí.
4. Efí Open Finance/Pix Automático para recorrência autorizada.
5. Payment Router automático escolhendo o melhor provedor por cobrança.
