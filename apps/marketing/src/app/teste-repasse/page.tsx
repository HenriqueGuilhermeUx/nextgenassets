export default function TesteRepassePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl rounded-3xl border border-amber-300/30 bg-amber-300/10 p-8">
        <a href="/operacao" className="text-sm font-black text-emerald-300">← Voltar para Operação</a>
        <h1 className="mt-6 text-4xl font-black">Teste pausado por segurança</h1>
        <p className="mt-4 text-lg leading-8 text-white/70">
          Esta página foi pausada para evitar qualquer ação direta fora do fluxo operacional controlado.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <a href="/repasses" className="rounded-xl bg-purple-400 px-4 py-3 text-center font-black text-slate-950">Abrir Repasses</a>
          <a href="/repasses-admin" className="rounded-xl bg-slate-900 px-4 py-3 text-center font-black text-white">Abrir Painel Operacional</a>
        </div>
      </div>
    </main>
  );
}
