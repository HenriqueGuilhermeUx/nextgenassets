const whatsapp = [
  {
    title: 'Mensagem curta',
    text: 'Oi! Estou validando a Conta NextGen, uma solução para empresas organizarem cobranças Pix, comunicação com clientes, acompanhamento de pagamentos e repasses. Posso te mandar uma proposta rápida de piloto?'
  },
  {
    title: 'Mensagem com link',
    text: 'Oi! Montei uma proposta simples de piloto da Conta NextGen para empresas que recebem por Pix e querem organizar cobranças, lembretes, pagamentos e repasses. Veja aqui: https://nextgenassets.com.br/proposta-piloto'
  },
  {
    title: 'Follow-up',
    text: 'Passando para saber se faz sentido testar com poucas cobranças. A ideia é validar sem complicar sua operação: criar cobrança, gerar Pix, acompanhar pagamento e conferir saldo.'
  }
];

const questions = [
  'Hoje vocês recebem mais por Pix, boleto, cartão ou transferência?',
  'Quantas cobranças por mês vocês emitem em média?',
  'Vocês controlam pagamentos em sistema, planilha ou manualmente?',
  'Quem faz os lembretes de pagamento hoje?',
  'O maior problema é atraso, conciliação, comunicação ou repasse?',
  'Vocês topariam testar com uma cobrança pequena primeiro?'
];

const objections = [
  ['Já usamos Pix', 'Perfeito. A Conta NextGen não substitui o Pix; ela organiza cobrança, comunicação, acompanhamento e repasse em cima do Pix.'],
  ['Não quero mexer no financeiro agora', 'O piloto pode começar pequeno, com poucas cobranças ou uma cobrança de teste, sem mudar a operação principal.'],
  ['Qual o custo?', 'O modelo base é assinatura mensal e 0% NextGen por Pix. O piloto serve para validar volume, rotina e valor entregue antes de fechar plano.'],
  ['É seguro?', 'O piloto é assistido e começa com baixo volume. A operação de repasse fica controlada e acompanhada antes de qualquer automação maior.'],
  ['Meu cliente já paga direto', 'Ótimo. O ganho está em reduzir esquecimento, registrar status, centralizar links e diminuir trabalho manual do financeiro.']
];

const meeting = [
  ['1', 'Entender operação atual', 'Perguntar como a empresa cobra, acompanha pagamentos e lembra clientes.'],
  ['2', 'Mostrar proposta', 'Abrir /proposta-piloto e explicar o piloto assistido em linguagem simples.'],
  ['3', 'Mostrar começo', 'Abrir /comece e mostrar os quatro passos da implantação.'],
  ['4', 'Definir teste', 'Combinar uma cobrança pequena, um cliente real ou um fluxo simulado.'],
  ['5', 'Acompanhar resultado', 'Validar pagamento, painel, saldo e tempo economizado no financeiro.']
];

export default function KitPilotoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/proposta-piloto" className="text-sm font-black text-emerald-300">← Proposta piloto</a>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-12">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Kit comercial</div>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Abordagem pronta para vender o piloto.</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/65">Use estes textos para abordar empresas, qualificar interesse, responder objeções e conduzir a primeira conversa.</p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a href="/proposta-piloto" className="rounded-xl bg-emerald-400 px-7 py-4 text-center font-black text-slate-950">Abrir proposta</a>
            <a href="/comece" className="rounded-xl border border-white/20 px-7 py-4 text-center font-black text-white">Abrir guia de início</a>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          {whatsapp.map((item) => (
            <div key={item.title} className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h2 className="text-2xl font-black text-emerald-300">{item.title}</h2>
              <p className="mt-4 rounded-2xl bg-slate-950 p-4 text-sm leading-7 text-white/70">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-7">
            <h2 className="text-3xl font-black">Perguntas de qualificação</h2>
            <div className="mt-5 space-y-3">
              {questions.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-white/70">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-slate-950">{index + 1}</div>
                  <div>{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-7">
            <h2 className="text-3xl font-black">Roteiro da primeira reunião</h2>
            <div className="mt-5 space-y-3">
              {meeting.map(([number, title, text]) => (
                <div key={number} className="rounded-2xl bg-slate-950 p-4">
                  <div className="font-black text-emerald-300">{number}. {title}</div>
                  <p className="mt-2 text-sm leading-6 text-white/65">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-7">
          <h2 className="text-3xl font-black">Objeções e respostas</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {objections.map(([title, text]) => (
              <div key={title} className="rounded-2xl bg-slate-950 p-5">
                <h3 className="text-xl font-black text-blue-300">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/65">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-blue-400/20 bg-blue-400/10 p-7">
          <h2 className="text-3xl font-black">Próximo passo sugerido</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-blue-100">Escolha uma empresa conhecida, mande a mensagem curta, depois envie a proposta. Se a pessoa responder, marque 15 minutos e proponha testar com uma cobrança pequena.</p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <a href="/proposta-piloto" className="rounded-xl bg-emerald-400 px-5 py-4 text-center font-black text-slate-950">Enviar proposta</a>
            <a href="/comece" className="rounded-xl bg-white/10 px-5 py-4 text-center font-black text-white">Guia de início</a>
            <a href="/validacao-piloto" className="rounded-xl border border-white/10 px-5 py-4 text-center font-black text-white">Validar teste</a>
          </div>
        </section>
      </div>
    </main>
  );
}
