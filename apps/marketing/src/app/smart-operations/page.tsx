const modules = [
  ['/smart-inbox', 'Smart Inbox', 'Receba notas, recibos, comprovantes e códigos de barras.'],
  ['/product-scan', 'Product Scan', 'Identifique produto por EAN/UPC e faça cadastro expresso.'],
  ['/compras', 'Compras', 'Transforme nota em compra, itens e custo de entrada.'],
  ['/produtos', 'Produtos', 'Catálogo com EAN, preço, estoque mínimo e dados inteligentes.'],
  ['/estoque', 'Estoque', 'Entradas por nota aprovada e movimentos auditáveis.'],
  ['/despesas', 'Despesas', 'Recibos e comprovantes viram despesas classificadas.'],
  ['/contas-a-pagar', 'Contas a pagar', 'Boletos, notas e vencimentos viram obrigações acompanháveis.'],
  ['/prestacao-contas', 'Prestação de contas', 'Funcionário envia recibos, classifica e acompanha aprovação.']
];

const events = [
  'document.received',
  'purchase.extracted',
  'purchase.confirmed',
  'expense.created',
  'payable.created',
  'product.scanned',
  'product.created',
  'inventory.updated',
  'document.reconciled'
];

export default function SmartOperationsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/operacao" className="text-sm font-black text-emerald-300">← Operação NextGen</a>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-12">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">NextGen Smart Operations</div>
          <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight md:text-6xl">O sistema olha o que aconteceu no negócio e organiza a operação.</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/65">
            Foto, PDF, nota, recibo, comprovante e código de barras viram dado estruturado, sugestão de ação e controle operacional — sem executar nada sem confirmação humana.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="/smart-inbox" className="rounded-xl bg-emerald-400 px-6 py-4 text-center font-black text-slate-950">📷 Escanear / enviar</a>
            <a href="/product-scan" className="rounded-xl border border-white/10 px-6 py-4 text-center font-black text-white">Escanear produto</a>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {modules.map(([href, title, text]) => (
            <a key={href} href={href} className="group rounded-3xl border border-white/10 bg-white/10 p-6 transition hover:-translate-y-1 hover:bg-white/15">
              <div className="text-sm font-black uppercase text-emerald-300">Módulo</div>
              <h2 className="mt-4 text-2xl font-black group-hover:text-emerald-300">{title}</h2>
              <p className="mt-3 min-h-20 text-sm leading-6 text-white/65">{text}</p>
              <div className="mt-5 text-sm font-black text-emerald-300">Abrir {href} →</div>
            </a>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-7">
            <h2 className="text-3xl font-black">Fluxo principal</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-white/70">
              <div className="rounded-2xl bg-slate-950 p-4">1. Documento entra na Smart Inbox.</div>
              <div className="rounded-2xl bg-slate-950 p-4">2. Provider AV Document Intelligence extrai dados.</div>
              <div className="rounded-2xl bg-slate-950 p-4">3. NextGen sugere ações operacionais.</div>
              <div className="rounded-2xl bg-slate-950 p-4">4. Usuário confirma manualmente.</div>
              <div className="rounded-2xl bg-slate-950 p-4">5. Compra, estoque, despesa, conta a pagar e conciliação são relacionados.</div>
            </div>
          </div>

          <div className="rounded-3xl border border-blue-400/20 bg-blue-400/10 p-7">
            <h2 className="text-3xl font-black">Eventos para AV OS</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {events.map((event) => <div key={event} className="rounded-2xl bg-slate-950 p-4 text-sm font-black text-blue-100">{event}</div>)}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
