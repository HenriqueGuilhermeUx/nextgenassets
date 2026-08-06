const businessTypes = [
  {
    title: 'Escola, curso ou aula recorrente',
    slug: 'escola',
    headline: 'Mensalidades, turmas, responsáveis e inadimplência.',
    fields: ['Aluno', 'Responsável', 'Turma', 'Mensalidade', 'Mês de referência', 'Vencimento'],
    recurrence: 'Mensal por 6, 10 ou 12 meses',
    dashboard: ['Mensalidades do mês', 'Alunos pagos', 'Alunos pendentes', 'Valor previsto', 'Inadimplência por turma']
  },
  {
    title: 'Dentista, clínica ou estética',
    slug: 'dentista',
    headline: 'Tratamentos, pacientes, parcelas e retornos.',
    fields: ['Paciente', 'Tratamento', 'Profissional', 'Parcela', 'Data de vencimento', 'Observação clínica'],
    recurrence: 'Parcelas mensais ou plano recorrente',
    dashboard: ['Tratamentos ativos', 'Parcelas pendentes', 'Pacientes em atraso', 'Recebimentos da semana', 'Próximos vencimentos']
  },
  {
    title: 'Academia, studio ou personal',
    slug: 'academia',
    headline: 'Planos, alunos, renovações e mensalidades.',
    fields: ['Aluno', 'Plano', 'Modalidade', 'Mensalidade', 'Data de renovação', 'Status do plano'],
    recurrence: 'Mensalidade contínua ou pacote de meses',
    dashboard: ['Planos ativos', 'Renovações próximas', 'Mensalidades vencidas', 'Alunos em atraso', 'Receita recorrente']
  },
  {
    title: 'Condomínio, clube ou associação',
    slug: 'condominio',
    headline: 'Cotas, associados, unidades e cobranças recorrentes.',
    fields: ['Morador/associado', 'Unidade', 'Cota', 'Competência', 'Vencimento', 'Acordo'],
    recurrence: 'Cota mensal ou acordo parcelado',
    dashboard: ['Cotas do mês', 'Unidades em dia', 'Pendências', 'Acordos ativos', 'Valor a receber']
  },
  {
    title: 'Serviço recorrente ou consultoria',
    slug: 'servicos',
    headline: 'Clientes, contratos, mensalidades e parcelas.',
    fields: ['Cliente', 'Contrato', 'Serviço', 'Mensalidade', 'Vencimento', 'Responsável financeiro'],
    recurrence: 'Mensalidade fixa, contrato ou pacote parcelado',
    dashboard: ['Contratos ativos', 'Cobranças do mês', 'Clientes pendentes', 'MRR previsto', 'Recebido no período']
  }
];

export default function TipoNegocioPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/" className="text-sm font-black text-emerald-300">← NextGen Assets</a>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-12">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Tipo de operação</div>
          <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight md:text-6xl">A NextGen muda conforme o negócio do cliente.</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/65">O cliente não entra em uma plataforma genérica de Pix. Ele escolhe o tipo de operação, e a NextGen adapta campos, recorrência, mensagens e indicadores.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <Metric title="Coração" value="Recorrência" />
            <Metric title="Meio" value="Pix" />
            <Metric title="Canal" value="WhatsApp/e-mail" />
            <Metric title="Valor" value="Operação" />
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {businessTypes.map((item) => (
            <a key={item.slug} href={`/modelos/${item.slug}`} className="group rounded-3xl border border-white/10 bg-white/10 p-6 transition hover:-translate-y-1 hover:border-emerald-300/50 hover:bg-white/15">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-sm font-black uppercase text-emerald-300">Modelo vertical</div>
                  <h2 className="mt-3 text-3xl font-black group-hover:text-emerald-300">{item.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/65">{item.headline}</p>
                </div>
                <div className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950">Abrir</div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-950 p-4">
                  <div className="text-xs font-black uppercase text-white/40">Campos</div>
                  <div className="mt-3 space-y-2">
                    {item.fields.slice(0, 4).map((field) => <div key={field} className="text-sm text-white/65">✓ {field}</div>)}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-950 p-4">
                  <div className="text-xs font-black uppercase text-white/40">Recorrência</div>
                  <p className="mt-3 text-sm leading-6 text-white/65">{item.recurrence}</p>
                </div>
                <div className="rounded-2xl bg-slate-950 p-4">
                  <div className="text-xs font-black uppercase text-white/40">Painel</div>
                  <div className="mt-3 space-y-2">
                    {item.dashboard.slice(0, 3).map((field) => <div key={field} className="text-sm text-white/65">✓ {field}</div>)}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-7">
          <h2 className="text-3xl font-black">Nova tese comercial</h2>
          <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-sm leading-7 text-white/70">
            <p><strong className="text-emerald-300">Antes:</strong> gerar Pix e acompanhar cobrança.</p>
            <p className="mt-3"><strong className="text-emerald-300">Agora:</strong> criar cobranças recorrentes adaptadas à rotina de cada negócio, com comunicação periódica e painel de acompanhamento.</p>
            <p className="mt-3 text-emerald-300">Você cadastra uma vez. A NextGen cobra todo mês.</p>
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
      <div className="mt-2 text-xl font-black text-emerald-300">{value}</div>
    </div>
  );
}
