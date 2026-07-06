const segments = [
  {
    title: 'Clínicas e consultórios',
    score: '9/10',
    reason: 'Têm consultas, retornos, pacotes, faltas e pagamentos recorrentes ou parcelados.',
    pitch: 'Organizar cobranças Pix, lembretes de pagamento e confirmação para reduzir trabalho da recepção.',
    firstOffer: 'Teste com 5 a 10 cobranças de consultas ou pacotes.'
  },
  {
    title: 'Escolas, cursos e reforço escolar',
    score: '9/10',
    reason: 'Mensalidades e rematrículas geram muita cobrança manual.',
    pitch: 'Centralizar mensalidades, links Pix, lembretes aos responsáveis e status de pagamento.',
    firstOffer: 'Teste com uma turma pequena ou mensalidades pendentes.'
  },
  {
    title: 'Academias, studios e personal trainers',
    score: '8/10',
    reason: 'Planos mensais, pacotes e renovações são recorrentes.',
    pitch: 'Reduzir esquecimento de pagamento e acompanhar renovações em um painel simples.',
    firstOffer: 'Teste com 10 alunos ou clientes de plano mensal.'
  },
  {
    title: 'Condomínios e associações',
    score: '8/10',
    reason: 'Possuem cotas, acordos, atrasos e necessidade de comunicação constante.',
    pitch: 'Organizar cotas, segunda via Pix, lembretes e acompanhamento de pagamentos.',
    firstOffer: 'Teste com acordos ou cobranças específicas.'
  },
  {
    title: 'Serviços B2B e consultorias',
    score: '8/10',
    reason: 'Cobram sinal, parcelas, contratos e recorrência de clientes empresariais.',
    pitch: 'Acompanhar propostas, cobranças e pagamentos sem depender só de planilhas.',
    firstOffer: 'Teste com cobranças de contrato ou mensalidade.'
  },
  {
    title: 'Eventos, festas e fornecedores',
    score: '7/10',
    reason: 'Trabalham com sinal, parcelas e saldo antes da entrega.',
    pitch: 'Controlar sinal, parcelas, vencimentos e confirmação de pagamento.',
    firstOffer: 'Teste com contratos novos ou pagamentos parcelados.'
  }
];

const criteria = [
  ['Dor de cobrança', 'A empresa precisa cobrar clientes com frequência?'],
  ['Volume', 'Tem pelo menos 20 cobranças por mês?'],
  ['Processo manual', 'Hoje usa planilha, WhatsApp ou controle solto?'],
  ['Dono acessível', 'Você consegue falar com o decisor?'],
  ['Baixo risco', 'Dá para testar com cobrança pequena?'],
  ['Feedback rápido', 'A empresa topa dar retorno em poucos dias?']
];

const firstTen = [
  '1 clínica pequena conhecida',
  '1 dentista ou estética com pacotes',
  '1 escola/curso local',
  '1 academia ou studio',
  '1 personal trainer com alunos fixos',
  '1 condomínio pequeno ou associação',
  '1 consultoria/serviço B2B',
  '1 fornecedor de eventos',
  '1 prestador recorrente de manutenção',
  '1 negócio de assinatura/mensalidade'
];

export default function AlvosPilotoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/piloto" className="text-sm font-black text-emerald-300">← Central do Piloto</a>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-12">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Alvos do piloto</div>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Escolha empresas com dor real de cobrança.</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/65">A Conta NextGen deve ser testada primeiro onde existe cobrança recorrente, controle manual, esquecimento de pagamento e necessidade de acompanhamento.</p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {segments.map((item) => (
            <div key={item.title} className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-emerald-300">{item.title}</h2>
                <div className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-slate-950">{item.score}</div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/65">{item.reason}</p>
              <div className="mt-5 rounded-2xl bg-slate-950 p-4">
                <div className="text-xs font-black uppercase text-white/40">Pitch</div>
                <p className="mt-2 text-sm leading-6 text-white/70">{item.pitch}</p>
              </div>
              <div className="mt-3 rounded-2xl bg-slate-950 p-4">
                <div className="text-xs font-black uppercase text-white/40">Primeira oferta</div>
                <p className="mt-2 text-sm leading-6 text-white/70">{item.firstOffer}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-7">
            <h2 className="text-3xl font-black">Critério de escolha</h2>
            <div className="mt-5 space-y-3">
              {criteria.map(([title, text], index) => (
                <div key={title} className="rounded-2xl bg-slate-950 p-4">
                  <div className="font-black text-emerald-300">{index + 1}. {title}</div>
                  <p className="mt-2 text-sm leading-6 text-white/65">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-7">
            <h2 className="text-3xl font-black">Lista dos 10 primeiros contatos</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {firstTen.map((item) => (
                <div key={item} className="rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-white/70">{item}</div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-5 text-sm leading-7 text-blue-100">
              Prioridade: comece por quem você já conhece ou consegue falar com o dono. O primeiro piloto precisa de confiança e feedback rápido, não de escala.
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-7">
          <h2 className="text-3xl font-black">Mensagem para o primeiro contato</h2>
          <p className="mt-5 rounded-2xl bg-slate-950 p-5 text-sm leading-7 text-white/70">
            Oi! Estou validando a Conta NextGen, uma solução para empresas organizarem cobranças Pix, lembretes, acompanhamento de pagamentos e repasses. Acho que pode fazer sentido para sua operação. Posso te mandar uma proposta simples de piloto?
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href="/proposta-piloto" className="rounded-xl bg-emerald-400 px-6 py-4 text-center font-black text-slate-950">Enviar proposta</a>
            <a href="/kit-piloto" className="rounded-xl border border-white/10 px-6 py-4 text-center font-black text-white">Abrir kit comercial</a>
          </div>
        </section>
      </div>
    </main>
  );
}
