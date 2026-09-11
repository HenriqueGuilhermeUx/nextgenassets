const flow = [
  ['1. Envio', 'Funcionário fotografa recibo, comprovante, nota ou despesa.'],
  ['2. Classificação', 'NextGen sugere fornecedor, valor, categoria, centro de custo e projeto.'],
  ['3. Aprovação', 'Gestor confere e aprova ou solicita ajuste.'],
  ['4. Reembolso', 'Despesa aprovada entra para pagamento/reembolso.'],
  ['5. Relatório', 'Comprovantes e despesas ficam organizados por funcionário, projeto e período.']
];

const fields = ['Funcionário', 'Projeto', 'Centro de custo', 'Categoria', 'Valor', 'Data', 'Comprovante', 'Status de aprovação'];

export default function PrestacaoContasPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/smart-operations" className="text-sm font-black text-emerald-300">← Smart Operations</a>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-12">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Prestação de contas</div>
          <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight md:text-6xl">Recibos de equipe viram despesas aprováveis.</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/65">Estrutura preparada para funcionário enviar comprovantes, classificar despesa, vincular projeto/centro de custo, aprovar e gerar relatório final.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="/smart-inbox" className="rounded-xl bg-emerald-400 px-6 py-4 text-center font-black text-slate-950">Enviar comprovante</a>
            <a href="/despesas" className="rounded-xl border border-white/10 px-6 py-4 text-center font-black text-white">Ver despesas</a>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-7">
            <h2 className="text-3xl font-black">Fluxo de prestação</h2>
            <div className="mt-5 space-y-3">
              {flow.map(([title, text]) => (
                <div key={title} className="rounded-2xl bg-slate-950 p-4">
                  <div className="font-black text-emerald-300">{title}</div>
                  <p className="mt-2 text-sm leading-6 text-white/65">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-blue-400/20 bg-blue-400/10 p-7">
            <h2 className="text-3xl font-black">Campos operacionais</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-1">
              {fields.map((field) => <div key={field} className="rounded-2xl bg-slate-950 p-4 text-sm font-black text-blue-100">{field}</div>)}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
