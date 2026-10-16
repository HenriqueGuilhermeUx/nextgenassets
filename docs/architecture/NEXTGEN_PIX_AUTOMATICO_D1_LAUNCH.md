# NextGen Pix Automático — lançamento comercial e repasse D+1

**Status:** implementação em PR #8, sem deploy. **Não iniciar operações reais enquanto as travas abaixo estiverem abertas.**

## Proposta do produto

A NextGen é a interface de contratação, cobrança e prestação de contas para empresas. A infraestrutura Efí recebe as instruções bancárias sob contrato. O pagador autoriza a recorrência no aplicativo bancário e, nas competências subsequentes, a NextGen administra os ciclos, registra a confirmação de pagamento e concilia os valores.

**Modelo de recebimento escolhido:** conta centralizadora NextGen -> conciliação de cada empresa -> repasse Pix Out para conta da empresa.

**Prazo comercial planejado:** D+1 **dia útil bancário** após o Pix **efetivamente recebido na conta NextGen e conciliado**. D+1 não representa Pix liquidado em D+1; representa a data prevista de **crédito do repasse da empresa**. Não prometer crédito se não houver disponibilidade, validação contratual, calendário bancário e comprovante de transferência.

## Comunicação pronta para o site

**Título:** Seu cliente autoriza uma vez. A NextGen organiza cada recebimento.

**Subtítulo:** Pix Automático para mensalidades e contratos. A NextGen recebe os pagamentos, confirma e concilia cada entrada e programa o crédito na conta da sua empresa em D+1 dia útil bancário.

**Aviso de lançamento:** Em homologação. A ativação, os repasses reais e a política contratual D+1 serão disponibilizados após validação operacional e regulatória.

**Transparência de conta recebedora:** Na autorização bancária, a conta beneficiária pertence à NextGen ou à entidade recebível prevista em contrato, não necessariamente ao prestador final. Mostrar o nome exato do favorecido antes da autorização. Deixar disponível o vínculo com o fornecedor efetivo e evitar que o pagador ache que o dinheiro vai diretamente ao vendedor.

Páginas preparadas:
- `/pix-automatico` — explicação completa e perguntas frequentes.
- `/` — destaque comercial e CTA.
- `/planos` — política nova D+1 separada dos planos legados D+3/D+2/D+1.
- `/recorrencias` e `/recorrencias/pix-automatico` — jornada e aviso D+1.
- `/repasses` — explicação da diferença em relação às subcontas legadas.

## Política D+1 implementada (planejamento)

Ponto de partida (D): primeira data **útil bancária** em/apos a confirmação do Pix de entrada e a conciliação efetiva no fuso `America/Sao_Paulo`. Repasse planejado: próximo dia útil bancário depois de D. O calendário de feriados precisa ser validado, versionado e cobrir todo o período previsto; sem ele não gerar agendamento.

Exemplos:
- Pix recebido e conciliado na segunda-feira -> crédito previsto terça-feira útil.
- Pix recebido e conciliado na sexta-feira -> crédito previsto segunda-feira útil, sem feriado.
- Pix recebido na sexta e só conciliado na segunda -> crédito previsto terça-feira útil.

Condicionantes: saldo efetivamente recebido, taxas transparentes, cadastro de conta bancária de titularidade empresarial, KYC/KYB, prevenção à fraude, ausência de bloqueios, liquidez para Pix Out e confirmação da transferência. **A previsão não é prova de crédito bancário.**

## Proteções implementadas em código de desenvolvimento

- `centralized-d1-policy.ts`: D+1 útil, calendário validado, horários, retenções, conciliação e bloqueios.
- `efi-centralized-d1-payout.service.ts` e `efi-centralized-d1-payout.controller.ts`: leitura/admin e planejamento de recebimentos já verificados (sem Pix Out).
- `20261016_nextgen_centralized_d1_payout.sql`: tabela de recebimento bancário imutável por EndToEnd ID, vínculo a ciclo Efí, auditoria e controle de data e status do repasse.
- Env `NEXTGEN_CENTRALIZED_D1_ENABLED=false` por padrão; calendário `NEXTGEN_BANK_CALENDAR_*` obrigatório.
- A operação bancária continua separada: uma resposta `accepted/scheduled` da iniciação Efí não gera crédito contábil.

Endpoints internos previstos na PR:
- `GET /v1/admin/efi-central-d1/policy`
- `POST /v1/admin/efi-central-d1/schedule-verified` — **apenas cria registro SCHEDULED**, nunca executa Pix de saída.
- `GET /v1/admin/efi-central-d1/payouts?partnerSlug=...`

Todos exigem `x-nextgen-admin-token` e não são destinados ao frontend dos clientes.

## Lançamento: gates indispensáveis

1. Confirmar com a **Efí** a autorização contratual e o enquadramento do recebimento **em nome da NextGen por conta de terceiros**, repasse e segregação de valores, KYB/KYC, conciliação, prevenção a fraude, riscos e limites.
2. Entregar adaptador **verificado** para Pix recebido na conta centralizadora, conciliando por EndToEnd ID com contrato, competência e empresa correta; tratar reprocessamento sem duplicidade.
3. Enviar **Pix Out real** com idempotência, fechamento de lote, conta de destino validada, verificação do banco e comprovante; nunca marcar `BANK_CONFIRMED` sem evidência.
4. Estabelecer calendário oficial de feriados bancários, cutoffs e SLA de execução para permitir anúncio D+1 na contratação.
5. Implementar autenticação de empresas, autorização por tenant derivada da sessão, cadastro e validação da conta bancária de repasse; jamais confiar em `partnerSlug` fornecido pelo cliente.
6. Confirmar preços e tarifas, fundos disponíveis e reconciliação de extrato; evitar double-spend e manter reservas.
7. Rodar teste bancário Efí **sandbox** completo e depois piloto monitorado, incluindo banco com saldo insuficiente, feriado, revogação, webhook duplicado, indisponibilidade e rollback.
8. Aplicar migrations **somente em staging**, com backup; validar CI dos módulos Pix legados, Woovi, billing, repasses, Smart Operations e frontend antes de qualquer merge ou deploy.
9. Apenas após a conclusão e aceite: atualizar termos comerciais e substituir o aviso de homologação nas páginas. Separar clientes atuais de contratos novos.

**Não mudar os prazos dos planos legados silenciosamente.** A diferença D+1 corresponde exclusivamente à nova modalidade centralizada enquanto a migração não for contratada/implantada.
