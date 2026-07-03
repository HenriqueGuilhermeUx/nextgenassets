'use client';

import { useEffect, useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

export default function RecorrenciasPage() {
  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [externalCustomerId, setExternalCustomerId] = useState('cliente-001');
  const [title, setTitle] = useState('Mensalidade recorrente');
  const [amount, setAmount] = useState('100.00');
  const [dueDay, setDueDay] = useState('10');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function call(path: string, options?: RequestInit) {
    setLoading(true);
    try {
      const res = await fetch(`${API}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }
      });
      const json = await res.json();
      setData(json);
      return json;
    } catch (err: any) {
      const json = { success: false, error: err.message };
      setData(json);
      return json;
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    await call(`/company-billing/recurrences?partnerSlug=${encodeURIComponent(partnerSlug)}`);
  }

  async function createRecurrence() {
    await call('/company-billing/recurrences', {
      method: 'POST',
      body: JSON.stringify({
        partnerSlug,
        externalCustomerId,
        title,
        description: title,
        amount: Number(amount),
        dueDay: Number(dueDay),
        provider: 'WOOVI'
      })
    });
  }

  async function generateDue() {
    await call('/company-billing/recurrences/generate-due', {
      method: 'POST',
      body: JSON.stringify({ partnerSlug, dryRun: false, limit: 50 })
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <a href="/painel-empresa" className="text-sm font-bold text-emerald-300">← Painel Empresa</a>
        <h1 className="mt-4 text-4xl font-black">Recorrências</h1>
        <p className="mt-2 text-white/60">Crie cobranças mensais automáticas por agenda.</p>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Nova recorrência</h2>
            <div className="mt-5 space-y-3">
              <Field label="Empresa" value={partnerSlug} setValue={setPartnerSlug} />
              <Field label="Código do cliente" value={externalCustomerId} setValue={setExternalCustomerId} />
              <Field label="Título" value={title} setValue={setTitle} />
              <Field label="Valor" value={amount} setValue={setAmount} />
              <Field label="Dia do vencimento" value={dueDay} setValue={setDueDay} />
              <button onClick={createRecurrence} className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950">Criar recorrência</button>
              <button onClick={generateDue} className="w-full rounded-xl bg-blue-400 px-4 py-3 font-black text-slate-950">Gerar cobranças do dia</button>
              <button onClick={load} className="w-full rounded-xl border border-white/10 px-4 py-3 font-bold">Atualizar</button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Resposta</h2>
            <p className="mt-2 text-sm text-white/50">{loading ? 'Carregando...' : 'Última ação'}</p>
            <pre className="mt-4 max-h-[560px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200">{JSON.stringify(data || {}, null, 2)}</pre>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  return <label className="block"><span className="text-xs font-bold uppercase text-white/50">{label}</span><input value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" /></label>;
}
