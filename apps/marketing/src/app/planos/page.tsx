const plans = [
  ['Starter', 'R$ 49/mês', 'até 50 cobranças/mês', ['Conta NextGen', 'Pix e link', 'Clientes pagadores', 'E-mail automático']],
  ['Growth', 'R$ 99/mês', 'até 200 cobranças/mês', ['Importação de planilha', 'Recorrência', 'Régua de cobrança', 'Relatórios']],
  ['Pro', 'R$ 199/mês', 'até 1.000 cobranças/mês', ['WhatsApp conectado', 'Múltiplos usuários', 'Repasses', 'Conciliação']],
  ['Enterprise', 'Sob consulta', 'alto volume', ['API', 'White label', 'SLA', 'Implantação assistida']]
];

export default function PlanosPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/" className="text-sm font-bold text-emerald-300">← NextGen Assets</a>
        <h1 className="mt-6 text-5xl font-black">Planos NextGen</h1>
        <p className="mt-4 max-w-3xl text-xl leading-8 text-white/60">Assinatura mensal por perfil de operação, com franquia de cobranças e recursos progressivos.</p>

        <div className="mt-10 grid gap-6 lg:grid-cols-4">
          {plans.map(([name, price, volume, features]: any) => (
            <div key={name} className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <div className="text-xl font-black text-emerald-300">{name}</div>
              <div className="mt-4 text-3xl font-black">{price}</div>
              <div className="mt-2 text-sm text-white/60">{volume}</div>
              <ul className="mt-6 space-y-3 text-sm text-white/75">
                {features.map((item: string) => <li key={item}>✓ {item}</li>)}
              </ul>
              <a href="/conta-nextgen" className="mt-6 block rounded-xl bg-emerald-400 px-4 py-3 text-center font-black text-slate-950">Começar</a>
            </div>
          ))}
        </div>

        <section className="mt-10 rounded-3xl border border-blue-400/20 bg-blue-400/10 p-8">
          <h2 className="text-3xl font-black">Modelo sugerido</h2>
          <p className="mt-4 text-white/60">Assinatura mensal com limite de uso. No início, vender simples. Depois, adicionar excedente apenas para alto volume.</p>
          <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-sm text-emerald-200">Plano mensal + franquia + recursos premium</div>
        </section>
      </div>
    </main>
  );
}
