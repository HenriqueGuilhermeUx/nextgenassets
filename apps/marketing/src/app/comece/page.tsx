const steps = [
  {
    number: '1',
    title: 'Configure sua Conta NextGen',
    text: 'Cadastre a empresa recebedora uma única vez para que as cobranças Pix usem essa configuração automaticamente.',
    href: '/conta-nextgen',
    cta: 'Configurar empresa'
  },
  {
    number: '2',
    title: 'Crie sua primeira cobrança',
    text: 'Informe o cliente, valor, vencimento e gere o Pix em poucos cliques.',
    href: '/nova-cobranca',
    cta: 'Criar cobrança'
  },
  {
    number: '3',
    title: 'Acompanhe pagamentos',
    text: 'Veja cobranças pendentes, pagas e links de pagamento em uma tela simples.',
    href: '/cobrancas',
    cta: 'Ver cobranças'
  },
  {
    number: '4',
    title: 'Controle saldo e repasses',
    text: 'Acompanhe saldo confirmado, solicitações de repasse e agenda do seu plano.',
    href: '/repasses',
    cta: 'Ver repasses'
  }
];

const benefits = [
  ['0% NextGen por Pix', 'No plano base, a NextGen não cobra percentual por Pix.'],
  ['Cobrança organizada', 'Link, valor, vencimento, status e histórico em um só lugar.'],
  ['Comunicação pronta', 'Modelos para lembrar, recuperar e confirmar pagamentos.'],
  ['Piloto assistido', 'A operação começa acompanhada para validar tudo com segurança.']
];

export default function ComecePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/" className="text-sm font-black text-emerald-300">← NextGen Assets</a>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-12">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Comece aqui</div>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Sua operação de recebimentos em poucos passos.</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/65">Use este guia para configurar a Conta NextGen, criar a primeira cobrança Pix e acompanhar seus recebimentos.</p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a href="/conta-nextgen" className="rounded-xl bg-emerald-400 px-7 py-4 text-center font-black text-slate-950">Configurar agora</a>
            <a href="/painel-empresa" className="rounded-xl border border-white/20 px-7 py-4 text-center font-black text-white">Abrir painel</a>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {benefits.map(([title, text]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h2 className="text-xl font-black text-emerald-300">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">{text}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-7">
          <h2 className="text-3xl font-black">Passo a passo</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {steps.map((step) => (
              <a key={step.number} href={step.href} className="group rounded-3xl bg-slate-950 p-6 transition hover:-translate-y-1 hover:bg-white/10">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-400 font-black text-slate-950">{step.number}</div>
                  <div>
                    <h3 className="text-2xl font-black group-hover:text-emerald-300">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/60">{step.text}</p>
                    <div className="mt-5 text-sm font-black text-emerald-300">{step.cta} →</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-7">
            <h2 className="text-3xl font-black">O que validar no primeiro teste</h2>
            <div className="mt-5 space-y-3 text-sm text-white/70">
              <div className="rounded-2xl bg-slate-950 p-4">✓ Conta recebedora configurada</div>
              <div className="rounded-2xl bg-slate-950 p-4">✓ Cobrança Pix gerada</div>
              <div className="rounded-2xl bg-slate-950 p-4">✓ Pagamento reconhecido</div>
              <div className="rounded-2xl bg-slate-950 p-4">✓ Saldo aparecendo em repasses</div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-7">
            <h2 className="text-3xl font-black">Precisa de ajuda?</h2>
            <p className="mt-4 text-sm leading-7 text-white/65">No piloto, a implantação é assistida. Você pode começar com uma cobrança pequena para validar o fluxo completo.</p>
            <a href="https://wa.me/5511947984328?text=Quero%20ajuda%20para%20come%C3%A7ar%20na%20Conta%20NextGen" className="mt-6 block rounded-xl bg-emerald-400 px-5 py-4 text-center font-black text-slate-950">Falar com a NextGen</a>
          </div>
        </section>
      </div>
    </main>
  );
}
