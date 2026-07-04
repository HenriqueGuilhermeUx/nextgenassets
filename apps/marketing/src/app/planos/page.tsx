const plans = [
  ['Starter', 'R$ 79/mês', 'até 50 recebimentos/mês', 'Repasse D+3', ['Conta NextGen', 'Pix e link', 'Clientes pagadores', 'E-mail automático', '0% NextGen por Pix']],
  ['Growth', 'R$ 149/mês', 'até 200 recebimentos/mês', 'Repasse D+2', ['Importação de planilha', 'Recorrência', 'Régua de cobrança', 'Relatórios', '0% NextGen por Pix']],
  ['Pro', 'R$ 299/mês', 'até 1.000 recebimentos/mês', 'Repasse D+1', ['WhatsApp conectado', 'Múltiplos usuários', 'Repasses', 'Conciliação', '0% NextGen por Pix']],
  ['Enterprise', 'Sob consulta', 'alto volume', 'Repasse sob medida', ['API', 'White label', 'SLA', 'Implantação assistida', 'Condições sob medida']]
];

export default function PlanosPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/" className="text-sm font-bold text-emerald-300">← NextGen Assets</a>
        <h1 className="mt-6 text-5xl font-black">Planos NextGen</h1>
        <p className="mt-4 max-w-3xl text-xl leading-8 text-white/60">Assinatura mensal por perfil de operação, com recebimentos incluídos, repasses programados e sem percentual NextGen por Pix no plano base.</p>

        <section className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
          <div className="text-sm font-bold uppercase text-emerald-200">Vantagem comercial</div>
          <h2 className="mt-2 text-3xl font-black">0% NextGen por Pix</h2>
          <p className="mt-3 max-w-4xl text-white/65">O cliente paga pela operação de recebimentos, automação, cobrança e repasse. A NextGen não precisa virar pedágio em cada Pix.</p>
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-4">
          {plans.map(([name, price, volume, payout, features]: any) => (
            <div key={name} className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <div className="text-xl font-black text-emerald-300">{name}</div>
              <div className="mt-4 text-3xl font-black">{price}</div>
              <div className="mt-2 text-sm text-white/60">{volume}</div>
              <div className="mt-3 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-blue-300">{payout}</div>
              <ul className="mt-6 space-y-3 text-sm text-white/75">
                {features.map((item: string) => <li key={item}>✓ {item}</li>)}
              </ul>
              <a href="/conta-nextgen" className="mt-6 block rounded-xl bg-emerald-400 px-4 py-3 text-center font-black text-slate-950">Começar</a>
            </div>
          ))}
        </div>

        <section className="mt-10 rounded-3xl border border-blue-400/20 bg-blue-400/10 p-8">
          <h2 className="text-3xl font-black">Modelo de margem</h2>
          <p className="mt-4 text-white/60">A margem vem da assinatura, dos recursos premium, do volume excedente e de pedidos de repasse antecipado. O agrupamento de repasses reduz custo operacional e torna o produto viável.</p>
          <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-sm text-emerald-200">Assinatura + recebimentos incluídos + repasse programado + antecipação opcional</div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-8">
          <h2 className="text-3xl font-black">Repasse antecipado</h2>
          <p className="mt-4 text-white/60">O cliente pode solicitar repasse antecipado fora da agenda do plano. Esse recurso pode ser cobrado como extra ou incluído nos planos maiores.</p>
        </section>
      </div>
    </main>
  );
}
