const stages = [
  {
    title: '1. Prospectar',
    goal: 'Escolher empresas com dor real de cobrança.',
    actions: ['Abrir /alvos-piloto', 'Selecionar 10 empresas conhecidas', 'Priorizar decisores acessíveis'],
    exit: 'Lista inicial com nome, segmento e contato.'
  },
  {
    title: '2. Enviar proposta',
    goal: 'Apresentar a Conta NextGen sem reunião longa.',
    actions: ['Usar mensagem curta do /kit-piloto', 'Enviar /proposta-piloto', 'Registrar resposta do contato'],
    exit: 'Contato respondeu ou pediu mais detalhes.'
  },
  {
    title: '3. Conversa rápida',
    goal: 'Entender se existe dor e viabilidade de teste.',
    actions: ['Fazer perguntas de qualificação', 'Confirmar volume de cobranças', 'Combinar teste pequeno'],
    exit: 'Empresa topou testar com cobrança pequena.'
  },
  {
    title: '4. Onboarding',
    goal: 'Configurar a empresa e criar primeira cobrança.',
    actions: ['Abrir /comece', 'Configurar Conta NextGen', 'Criar cobrança de teste'],
    exit: 'Cobrança criada e Pix gerado.'
  },
  {
    title: '5. Validação',
    goal: 'Confirmar pagamento, painel, saldo e repasse.',
    actions: ['Usar /validacao-piloto', 'Conferir /cobrancas', 'Conferir /repasses'],
    exit: 'Fluxo validado de ponta a ponta.'
  },
  {
    title: '6. Conversão',
    goal: 'Transformar piloto em plano mensal.',
    actions: ['Apresentar /planos', 'Definir plano Starter, Growth ou Pro', 'Combinar próximos volumes'],
    exit: 'Empresa aceitou seguir pagando mensalidade.'
  }
];

const statuses = [
  ['Novo contato', 'Ainda não recebeu mensagem.'],
  ['Proposta enviada', 'Recebeu /proposta-piloto.'],
  ['Interessado', 'Respondeu ou pediu detalhes.'],
  ['Reunião marcada', 'Conversa rápida agendada.'],
  ['Piloto em teste', 'Empresa usando /comece.'],
  ['Validado', 'Teste de cobrança concluído.'],
  ['Convertido', 'Virou plano mensal.'],
  ['Perdido', 'Não faz sentido agora.']
];

const metrics = [
  ['10', 'contatos iniciais'],
  ['5', 'respostas esperadas'],
  ['3', 'conversas rápidas'],
  ['1', 'piloto ativo']
];

export default function PipelinePilotoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/piloto" className="text-sm font-black text-emerald-300">← Central do Piloto</a>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-12">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Pipeline do piloto</div>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Transforme abordagem em piloto pago.</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/65">Acompanhe a jornada desde a escolha dos alvos até a conversão em plano mensal.</p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {metrics.map(([value, label]) => (
            <div key={label} className="rounded-3xl border border-white/10 bg-white/10 p-5">
              <div className="text-3xl font-black text-emerald-300">{value}</div>
              <div className="mt-2 text-sm font-black uppercase text-white/45">{label}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {stages.map((stage) => (
            <div key={stage.title} className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h2 className="text-2xl font-black text-emerald-300">{stage.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/65">{stage.goal}</p>
              <div className="mt-5 space-y-2">
                {stage.actions.map((action) => (
                  <div key={action} className="rounded-2xl bg-slate-950 p-3 text-sm text-white/70">✓ {action}</div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-sm leading-6 text-blue-100">
                Saída: {stage.exit}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-7">
            <h2 className="text-3xl font-black">Status para controlar</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {statuses.map(([title, text]) => (
                <div key={title} className="rounded-2xl bg-slate-950 p-4">
                  <div className="font-black text-emerald-300">{title}</div>
                  <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-7">
            <h2 className="text-3xl font-black">Rotina diária</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-white/70">
              <div className="rounded-2xl bg-slate-950 p-4">1. Abordar 2 empresas por dia.</div>
              <div className="rounded-2xl bg-slate-950 p-4">2. Fazer follow-up em quem recebeu proposta.</div>
              <div className="rounded-2xl bg-slate-950 p-4">3. Marcar conversa rápida com interessado.</div>
              <div className="rounded-2xl bg-slate-950 p-4">4. Levar a empresa para /comece.</div>
              <div className="rounded-2xl bg-slate-950 p-4">5. Validar o teste em /validacao-piloto.</div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="/alvos-piloto" className="rounded-xl bg-emerald-400 px-5 py-4 text-center font-black text-slate-950">Escolher alvos</a>
              <a href="/kit-piloto" className="rounded-xl border border-white/10 px-5 py-4 text-center font-black text-white">Abrir kit comercial</a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
