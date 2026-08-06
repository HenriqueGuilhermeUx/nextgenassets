const models: Record<string, any> = {
  escola: {
    label: 'Escola, curso ou aula recorrente',
    title: 'Mensalidades Pix recorrentes para escolas e cursos.',
    promise: 'Cadastre alunos e responsáveis uma vez. A NextGen organiza mensalidades, lembretes, pagamentos e inadimplência mês a mês.',
    entity: 'Aluno',
    payer: 'Responsável',
    product: 'Mensalidade',
    recurrence: 'Mensal por 6, 10 ou 12 meses',
    fields: ['Aluno', 'Responsável financeiro', 'CPF/documento', 'Turma', 'Série ou curso', 'Mensalidade', 'Dia de vencimento', 'Mês de referência'],
    dashboard: ['Mensalidades do mês', 'Alunos pagos', 'Alunos pendentes', 'Valor previsto', 'Valor recebido', 'Inadimplência por turma'],
    messages: [
      ['D-3', 'Olá, {{responsavel}}. A mensalidade de {{aluno}} referente a {{referencia}} vence em {{vencimento}}. Link Pix: {{link}}'],
      ['D0', 'Hoje vence a mensalidade de {{aluno}}. Para facilitar, segue o Pix: {{link}}'],
      ['D+2', 'Identificamos que a mensalidade de {{aluno}} ainda está pendente. Posso ajudar com o link de pagamento? {{link}}'],
      ['Pago', 'Pagamento de {{aluno}} confirmado. Obrigado!']
    ],
    cta: 'Criar recorrência escolar'
  },
  dentista: {
    label: 'Dentista, clínica ou estética',
    title: 'Parcelas e planos recorrentes para pacientes.',
    promise: 'Organize tratamentos, parcelas, retornos e pagamentos recorrentes sem depender de planilha e lembrete manual.',
    entity: 'Paciente',
    payer: 'Paciente ou responsável',
    product: 'Tratamento / parcela / plano',
    recurrence: 'Parcelas mensais, pacotes ou plano recorrente',
    fields: ['Paciente', 'CPF/documento', 'Tratamento', 'Profissional', 'Valor da parcela', 'Número de parcelas', 'Dia de vencimento', 'Observação'],
    dashboard: ['Tratamentos ativos', 'Parcelas do mês', 'Pacientes pendentes', 'Recebimentos da semana', 'Parcelas vencidas', 'Próximos retornos'],
    messages: [
      ['D-2', 'Olá, {{paciente}}. Sua parcela de {{tratamento}} vence em {{vencimento}}. Link Pix: {{link}}'],
      ['D0', 'Olá, {{paciente}}. Hoje vence sua parcela de {{tratamento}}. Pix: {{link}}'],
      ['D+2', 'Olá, {{paciente}}. Consta uma parcela pendente do tratamento {{tratamento}}. Segue o link: {{link}}'],
      ['Pago', 'Pagamento confirmado. Obrigado!']
    ],
    cta: 'Criar recorrência de tratamento'
  },
  academia: {
    label: 'Academia, studio ou personal',
    title: 'Planos mensais e renovações com Pix recorrente.',
    promise: 'Controle alunos, planos, vencimentos, renovações e cobranças mensais com comunicação automática.',
    entity: 'Aluno',
    payer: 'Aluno',
    product: 'Plano / mensalidade',
    recurrence: 'Mensalidade contínua ou pacote de meses',
    fields: ['Aluno', 'CPF/documento', 'Plano', 'Modalidade', 'Valor mensal', 'Dia de vencimento', 'Data de renovação', 'Status do plano'],
    dashboard: ['Planos ativos', 'Renovações próximas', 'Mensalidades do mês', 'Alunos pendentes', 'Receita recorrente', 'Planos vencidos'],
    messages: [
      ['D-3', 'Olá, {{aluno}}. Sua mensalidade do plano {{plano}} vence em {{vencimento}}. Pix: {{link}}'],
      ['D0', 'Hoje vence sua mensalidade do plano {{plano}}. Segue o Pix: {{link}}'],
      ['D+2', 'Olá, {{aluno}}. Sua mensalidade ainda aparece como pendente. Link: {{link}}'],
      ['Pago', 'Pagamento confirmado. Seu plano segue ativo.']
    ],
    cta: 'Criar recorrência de plano'
  },
  condominio: {
    label: 'Condomínio, clube ou associação',
    title: 'Cotas mensais, acordos e associados em um painel.',
    promise: 'Organize cotas recorrentes, unidades, associados, acordos e pendências com cobrança Pix periódica.',
    entity: 'Morador / associado',
    payer: 'Responsável pela unidade',
    product: 'Cota / mensalidade / acordo',
    recurrence: 'Cota mensal ou acordo parcelado',
    fields: ['Morador ou associado', 'Unidade', 'CPF/documento', 'Competência', 'Valor da cota', 'Dia de vencimento', 'Tipo de cobrança', 'Observação'],
    dashboard: ['Cotas do mês', 'Unidades em dia', 'Unidades pendentes', 'Acordos ativos', 'Valor previsto', 'Valor recebido'],
    messages: [
      ['D-3', 'Olá, {{responsavel}}. A cota de {{competencia}} da unidade {{unidade}} vence em {{vencimento}}. Pix: {{link}}'],
      ['D0', 'Hoje vence a cota da unidade {{unidade}}. Link Pix: {{link}}'],
      ['D+2', 'Consta pendência da cota da unidade {{unidade}}. Segue o Pix para regularização: {{link}}'],
      ['Pago', 'Pagamento da unidade {{unidade}} confirmado. Obrigado!']
    ],
    cta: 'Criar recorrência de cotas'
  },
  servicos: {
    label: 'Serviço recorrente ou consultoria',
    title: 'Mensalidades e contratos recorrentes para serviços.',
    promise: 'Controle clientes, contratos, mensalidades, parcelas e recebimentos recorrentes em uma rotina simples.',
    entity: 'Cliente',
    payer: 'Responsável financeiro',
    product: 'Contrato / mensalidade / pacote',
    recurrence: 'Mensalidade fixa, contrato recorrente ou pacote parcelado',
    fields: ['Cliente', 'Responsável financeiro', 'CPF/CNPJ', 'Contrato', 'Serviço', 'Valor mensal', 'Dia de vencimento', 'Centro de custo'],
    dashboard: ['Contratos ativos', 'Cobranças do mês', 'Clientes pendentes', 'MRR previsto', 'Recebido no período', 'Renovações próximas'],
    messages: [
      ['D-3', 'Olá, {{cliente}}. A mensalidade do serviço {{servico}} vence em {{vencimento}}. Pix: {{link}}'],
      ['D0', 'Hoje vence a mensalidade do contrato {{contrato}}. Link Pix: {{link}}'],
      ['D+2', 'Consta mensalidade pendente do serviço {{servico}}. Segue link para pagamento: {{link}}'],
      ['Pago', 'Pagamento confirmado. Obrigado pela parceria!']
    ],
    cta: 'Criar recorrência de contrato'
  }
};

export function generateStaticParams() {
  return Object.keys(models).map((tipo) => ({ tipo }));
}

export default function ModeloVerticalPage({ params }: { params: { tipo: string } }) {
  const model = models[params.tipo] || models.servicos;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/tipo-negocio" className="text-sm font-black text-emerald-300">← Tipos de negócio</a>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-12">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">{model.label}</div>
          <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight md:text-6xl">{model.title}</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/65">{model.promise}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <Metric title="Cliente final" value={model.entity} />
            <Metric title="Pagador" value={model.payer} />
            <Metric title="Cobrança" value={model.product} />
            <Metric title="Recorrência" value={model.recurrence} />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-7">
            <h2 className="text-3xl font-black text-emerald-300">Campos da operação</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">Esses campos mudam conforme o tipo de negócio para o cliente sentir que a plataforma foi feita para a rotina dele.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {model.fields.map((field: string) => (
                <div key={field} className="rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-white/70">✓ {field}</div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-7">
            <h2 className="text-3xl font-black">Painel ideal</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">O painel deve destacar os indicadores que fazem sentido para este negócio.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {model.dashboard.map((item: string) => (
                <div key={item} className="rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-white/70">✓ {item}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-7">
          <h2 className="text-3xl font-black">Régua de comunicação recorrente</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">A cobrança precisa ser enviada periodicamente por WhatsApp/e-mail, com lembrete antes, aviso no vencimento, recuperação de pendência e confirmação após pagamento.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {model.messages.map(([when, text]: [string, string]) => (
              <div key={when} className="rounded-2xl bg-slate-950 p-5">
                <div className="text-xl font-black text-emerald-300">{when}</div>
                <p className="mt-3 text-sm leading-6 text-white/65">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-3xl border border-blue-400/20 bg-blue-400/10 p-7">
            <h2 className="text-3xl font-black">Fluxo operacional</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-blue-100">
              <div className="rounded-2xl bg-slate-950 p-4">1. Cadastrar ou importar {model.entity.toLowerCase()}s.</div>
              <div className="rounded-2xl bg-slate-950 p-4">2. Definir valor, vencimento e duração da recorrência.</div>
              <div className="rounded-2xl bg-slate-950 p-4">3. A NextGen gera a cobrança do período.</div>
              <div className="rounded-2xl bg-slate-950 p-4">4. A cobrança é enviada por WhatsApp/e-mail.</div>
              <div className="rounded-2xl bg-slate-950 p-4">5. Pagamento Pix atualiza painel e pendências.</div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-7">
            <h2 className="text-3xl font-black">Próximo passo</h2>
            <p className="mt-4 text-sm leading-7 text-white/65">Criar a recorrência desse modelo e testar com poucos pagadores antes de rodar a base completa.</p>
            <div className="mt-6 flex flex-col gap-3">
              <a href={`/recorrencias?tipo=${params.tipo}`} className="rounded-xl bg-emerald-400 px-6 py-4 text-center font-black text-slate-950">{model.cta}</a>
              <a href="/comece" className="rounded-xl border border-white/10 px-6 py-4 text-center font-black text-white">Abrir guia de início</a>
              <a href="/regua-cobranca" className="rounded-xl border border-white/10 px-6 py-4 text-center font-black text-white">Ver régua de cobrança</a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950 p-5">
      <div className="text-xs font-black uppercase text-white/45">{title}</div>
      <div className="mt-2 text-lg font-black text-emerald-300">{value}</div>
    </div>
  );
}
