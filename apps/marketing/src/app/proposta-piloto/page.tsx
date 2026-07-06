const pains = [
  'Clientes esquecem vencimentos e o financeiro precisa cobrar manualmente.',
  'Links de pagamento ficam espalhados em WhatsApp, planilhas e sistemas diferentes.',
  'A empresa não tem uma visão simples de pendentes, pagos, saldo e repasses.',
  'O processo de cobrança consome tempo que poderia estar em vendas e atendimento.'
];

const solution = [
  ['Cobrança Pix organizada', 'Criação de cobranças com cliente, valor, vencimento, link e status em um painel único.'],
  ['Comunicação pronta', 'Modelos de lembrete, vencimento, pendência e confirmação para reduzir trabalho manual.'],
  ['Painel da empresa', 'Visão de cobranças, pagamentos, saldo estimado e solicitações de repasse.'],
  ['Piloto assistido', 'Implantação acompanhada para testar com segurança antes de abrir para alto volume.']
];

const pilot = [
  ['Duração sugerida', '7 a 15 dias de teste assistido.'],
  ['Volume inicial', 'Começar com poucas cobranças reais ou cobranças de baixo valor.'],
  ['Objetivo', 'Validar criação da cobrança, pagamento, confirmação, painel e repasse.'],
  ['Suporte', 'Acompanhamento próximo durante o piloto para ajustar o fluxo.']
];

const validation = [
  'Configurar a empresa na Conta NextGen.',
  'Criar a primeira cobrança Pix.',
  'Enviar link de pagamento para o cliente.',
  'Confirmar pagamento no painel.',
  'Visualizar saldo e solicitação de repasse.',
  'Avaliar economia de tempo no financeiro.'
];

export default function PropostaPilotoPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <a href="/" className="text-sm font-black text-emerald-300">← NextGen Assets</a>
          <div className="mt-10 max-w-5xl">
            <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-200">Proposta de piloto</div>
            <h1 className="mt-6 text-5xl font-black leading-tight md:text-7xl">Organize seus recebimentos Pix com a Conta NextGen.</h1>
            <p className="mt-7 max-w-3xl text-xl leading-8 text-white/70">Um piloto assistido para sua empresa criar cobranças, acompanhar pagamentos, usar comunicação pronta e controlar repasses em um painel simples.</p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a href="/comece" className="rounded-xl bg-emerald-400 px-7 py-4 text-center font-black text-slate-950">Começar piloto</a>
              <a href="https://wa.me/5511947984328?text=Quero%20avaliar%20o%20piloto%20da%20Conta%20NextGen" className="rounded-xl border border-white/20 px-7 py-4 text-center font-black text-white">Falar no WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-18 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="font-black text-blue-700">O PROBLEMA</p>
              <h2 className="mt-3 text-4xl font-black md:text-5xl">Receber parece simples, mas a operação fica manual.</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">A empresa até consegue gerar Pix, mas ainda precisa controlar vencimento, cobrança, confirmação, saldo e repasse manualmente.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {pains.map((item) => (
                <div key={item} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-2xl">⚠️</div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-18 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-black text-blue-700">A SOLUÇÃO</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Conta NextGen: recebimentos inteligentes para o financeiro.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">A proposta é começar pequeno, validar o fluxo e evoluir para uma operação mais automatizada.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {solution.map(([title, text]) => (
              <div key={title} className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="text-xl font-black text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-18 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[2rem] bg-slate-950 p-8 text-white">
              <p className="font-black text-emerald-300">COMO FUNCIONA O PILOTO</p>
              <h2 className="mt-3 text-4xl font-black">Teste assistido, sem complicar a operação.</h2>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {pilot.map(([title, text]) => (
                  <div key={title} className="rounded-2xl bg-white/10 p-5">
                    <h3 className="font-black text-emerald-300">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/65">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="font-black text-blue-700">O QUE VAMOS VALIDAR</p>
              <h2 className="mt-3 text-4xl font-black">Fluxo completo de ponta a ponta.</h2>
              <div className="mt-8 space-y-3">
                {validation.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-slate-950">{index + 1}</div>
                    <div>{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-6 py-18 text-center text-white md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-4xl font-black md:text-5xl">Próximo passo</h2>
          <p className="mt-4 text-lg leading-8 text-white/70">Comece configurando a empresa e criando uma cobrança pequena para validar o fluxo.</p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <a href="/comece" className="rounded-xl bg-emerald-400 px-7 py-4 font-black text-slate-950">Abrir guia de início</a>
            <a href="/planos" className="rounded-xl border border-white/20 px-7 py-4 font-black text-white">Ver planos</a>
          </div>
        </div>
      </section>
    </main>
  );
}
