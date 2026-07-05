const stages = [
  {
    title: 'Antes do vencimento',
    when: 'D-2 / D-1',
    message: 'Olá, {nome}. Seu pagamento de {valor} vence em {vencimento}. Para facilitar, segue o link Pix: {link}'
  },
  {
    title: 'Vence hoje',
    when: 'D0',
    message: 'Olá, {nome}. Seu pagamento de {valor} vence hoje. Você pode pagar com Pix por aqui: {link}'
  },
  {
    title: 'Pendente',
    when: 'D+1 / D+3',
    message: 'Olá, {nome}. Identificamos que o pagamento de {valor} ainda está pendente. Regularize por aqui: {link}'
  },
  {
    title: 'Confirmado',
    when: 'Após pagamento',
    message: 'Olá, {nome}. Recebemos seu pagamento de {valor}. Obrigado! Seu financeiro já foi atualizado.'
  }
];

const flow = [
  'Cobrança criada no painel',
  'Pix gerado e link salvo',
  'Mensagem enviada ao pagador',
  'Webhook confirma pagamento',
  'Cliente recebe confirmação',
  'Empresa acompanha no painel'
];

export default function ReguaCobrancaPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/operacao" className="text-sm font-black text-emerald-300">← Operação</a>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-10">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Régua de cobrança</div>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Comunicação pronta para receber melhor.</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/65">Modelos comerciais para lembrar, recuperar e confirmar pagamentos Pix sem parecer cobrança agressiva.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <Metric title="Tom" value="Amigável" />
            <Metric title="Canal" value="E-mail / WhatsApp" />
            <Metric title="Link" value="Pix" />
            <Metric title="Status" value="Pronto" />
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage) => (
            <div key={stage.title} className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <div className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase text-blue-300">{stage.when}</div>
              <h2 className="mt-4 text-2xl font-black text-emerald-300">{stage.title}</h2>
              <p className="mt-4 rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-white/70">{stage.message}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-7">
            <h2 className="text-3xl font-black">Fluxo recomendado</h2>
            <div className="mt-5 space-y-3">
              {flow.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-2xl bg-slate-950 p-4 text-sm text-white/70">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-slate-950">{index + 1}</div>
                  <div>{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-7">
            <h2 className="text-3xl font-black">Como vender isso</h2>
            <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-sm leading-7 text-white/70">
              <p>A empresa não compra só um Pix. Ela compra uma operação de recebimentos: cobrança, link, lembrete, confirmação, conciliação e repasse.</p>
              <p className="mt-3">A régua reduz esquecimento, melhora caixa e tira trabalho manual do financeiro.</p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <a href="/notificacoes" className="rounded-xl bg-emerald-400 px-4 py-3 text-center font-black text-slate-950">Central operacional</a>
              <a href="/cobrancas" className="rounded-xl bg-blue-400 px-4 py-3 text-center font-black text-slate-950">Cobranças</a>
              <a href="/nova-cobranca" className="rounded-xl bg-white/10 px-4 py-3 text-center font-black text-white">Nova cobrança</a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-3xl border border-white/10 bg-slate-950 p-5"><div className="text-xs font-black uppercase text-white/45">{title}</div><div className="mt-2 text-xl font-black text-emerald-300">{value}</div></div>;
}
