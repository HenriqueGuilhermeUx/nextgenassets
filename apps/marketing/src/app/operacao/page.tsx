const cards = [
  {
    title: 'Conta NextGen',
    href: '/conta-nextgen',
    tag: 'comercial',
    description: 'Fluxo principal para abrir conta de recebimento, cadastrar pagador e criar cobrança.'
  },
  {
    title: 'Nova Cobrança',
    href: '/nova-cobranca',
    tag: 'venda',
    description: 'Cria pagador, cobrança e Pix com split para subconta em um fluxo rápido.'
  },
  {
    title: 'Cobranças',
    href: '/cobrancas',
    tag: 'operação',
    description: 'Lista cobranças reais, gera Pix com split para subconta e acompanha status.'
  },
  {
    title: 'Régua de Cobrança',
    href: '/regua-cobranca',
    tag: 'comunicação',
    description: 'Modelos de mensagem para lembrar, recuperar e confirmar pagamentos.'
  },
  {
    title: 'Notificações',
    href: '/notificacoes',
    tag: 'automação',
    description: 'Central operacional de mensagens, pendências e histórico.'
  },
  {
    title: 'Repasses',
    href: '/repasses',
    tag: 'cliente',
    description: 'Mostra saldo, agenda do plano e pedido de repasse antecipado.'
  },
  {
    title: 'Admin de Repasses',
    href: '/repasses-admin',
    tag: 'operação',
    description: 'Painel interno para conferir pedidos e marcar repasses como processados.'
  },
  {
    title: 'Piloto',
    href: '/piloto',
    tag: 'go-live',
    description: 'Checklist comercial para testar o produto com empresa piloto.'
  },
  {
    title: 'Planos',
    href: '/planos',
    tag: 'pricing',
    description: 'Planos com 0% NextGen por Pix, repasse D+3, D+2 e D+1.'
  },
  {
    title: 'Importar Base',
    href: '/importar-base',
    tag: 'cobrança',
    description: 'Importação de clientes e cobranças por planilha/CSV.'
  },
  {
    title: 'Recorrências',
    href: '/recorrencias',
    tag: 'automação',
    description: 'Cobranças recorrentes e geração automática por vencimento.'
  },
  {
    title: 'Roteador de Pagamentos',
    href: '/roteador-pagamentos',
    tag: 'pagamento',
    description: 'Página pública de pagamento para links de cobrança.'
  }
];

const checklist = [
  'Configurar a Conta NextGen da empresa',
  'Criar nova cobrança ou importar base',
  'Gerar Pix com split para subconta',
  'Enviar link/código Pix ao pagador',
  'Acompanhar comunicação da cobrança',
  'Pagamento cair e webhook marcar como pago',
  'Conferir saldo em Repasses',
  'Solicitar repasse antecipado ou programado',
  'Processar manualmente e marcar no Admin'
];

export default function OperacaoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/" className="text-sm font-black text-emerald-300">← NextGen Assets</a>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-10">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Operação NextGen</div>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Central de operação dos recebimentos inteligentes.</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/65">Use esta página como atalho para operar cobranças, Pix, comunicação, saldo e repasses sem decorar URLs.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <Metric title="Pix" value="0% NextGen" />
            <Metric title="Split" value="Subconta" />
            <Metric title="Repasse" value="D+3 / D+2 / D+1" />
            <Metric title="Comunicação" value="Régua" />
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <a key={card.href} href={card.href} className="group rounded-3xl border border-white/10 bg-white/10 p-6 transition hover:-translate-y-1 hover:border-emerald-300/50 hover:bg-white/15">
              <div className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase text-blue-300">{card.tag}</div>
              <h2 className="mt-4 text-2xl font-black group-hover:text-emerald-300">{card.title}</h2>
              <p className="mt-3 min-h-20 text-sm leading-6 text-white/60">{card.description}</p>
              <div className="mt-5 text-sm font-black text-emerald-300">Abrir →</div>
            </a>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-7">
            <h2 className="text-3xl font-black">Fluxo recomendado</h2>
            <div className="mt-5 space-y-3">
              {checklist.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-2xl bg-slate-950 p-4 text-sm text-white/70">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-slate-950">{index + 1}</div>
                  <div>{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-7">
            <h2 className="text-3xl font-black">Regra de negócio validada</h2>
            <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-sm leading-7 text-white/65">
              <p><strong className="text-emerald-300">Pix:</strong> cliente recebe o máximo possível na subconta.</p>
              <p><strong className="text-emerald-300">NextGen:</strong> não cobra percentual por Pix no plano base.</p>
              <p><strong className="text-emerald-300">Receita:</strong> assinatura, excedente, automações premium e repasse antecipado.</p>
              <p><strong className="text-emerald-300">Comunicação:</strong> lembretes e confirmação reduzem trabalho manual do financeiro.</p>
            </div>
            <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-5 text-sm leading-7 text-blue-100">
              Próximo bloco técnico: revisão final da home e do posicionamento público para vender Recebimentos Inteligentes.
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
      <div className="mt-2 text-xl font-black text-emerald-300">{value}</div>
    </div>
  );
}
