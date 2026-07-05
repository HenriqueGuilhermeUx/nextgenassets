const steps = [
  ['1', 'Publicar backend', 'Fazer deploy limpo da API e confirmar que a rota de saúde responde.'],
  ['2', 'Publicar frontend', 'Fazer deploy limpo do site e abrir a central de operação.'],
  ['3', 'Configurar empresa', 'Entrar em Conta NextGen e salvar a conta recebedora da empresa piloto.'],
  ['4', 'Criar cobrança', 'Criar uma cobrança pequena para validar o fluxo completo.'],
  ['5', 'Gerar Pix', 'Gerar o Pix pela cobrança usando a configuração salva da empresa.'],
  ['6', 'Pagar', 'Pagar a cobrança e aguardar a confirmação automática.'],
  ['7', 'Conferir painel', 'Abrir o painel da empresa e confirmar cobrança paga, saldo e histórico.'],
  ['8', 'Conferir repasse', 'Abrir repasses e validar pedido, agenda do plano e histórico operacional.']
];

const screens = [
  ['/operacao', 'Central de operação'],
  ['/conta-nextgen', 'Configurar empresa'],
  ['/nova-cobranca', 'Criar cobrança'],
  ['/cobrancas', 'Gerenciar cobranças'],
  ['/painel-empresa', 'Painel da empresa'],
  ['/repasses', 'Repasses'],
  ['/repasses-admin', 'Operação interna'],
  ['/regua-cobranca', 'Comunicação'],
  ['/piloto', 'Checklist comercial']
];

export default function ValidacaoPilotoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/operacao" className="text-sm font-black text-emerald-300">← Operação</a>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-10">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Validação do piloto</div>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Roteiro final antes de chamar cliente.</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/65">Use esta página como checklist de campo para validar a Conta NextGen de ponta a ponta.</p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <Metric title="Modelo" value="0% por Pix" />
          <Metric title="Produto" value="Recebimentos" />
          <Metric title="Fluxo" value="Ponta a ponta" />
          <Metric title="Fase" value="Piloto" />
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-7">
          <h2 className="text-3xl font-black">Passo a passo de validação</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {steps.map(([number, title, text]) => (
              <div key={number} className="rounded-2xl bg-slate-950 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400 font-black text-slate-950">{number}</div>
                  <div>
                    <h3 className="text-xl font-black text-emerald-300">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/65">{text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-7">
          <h2 className="text-3xl font-black">Telas para testar</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {screens.map(([href, label]) => (
              <a key={href} href={href} className="rounded-2xl bg-slate-950 p-4 transition hover:bg-white/10">
                <div className="font-black text-emerald-300">{href}</div>
                <div className="mt-2 text-sm text-white/60">{label}</div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-5"><div className="text-xs font-black uppercase text-white/45">{title}</div><div className="mt-2 text-xl font-black text-emerald-300">{value}</div></div>;
}
