'use client';

import { useEffect, useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

export default function DespesasPage() {
  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [rows, setRows] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await fetch(`${API}/smart-operations/expenses?partnerSlug=${encodeURIComponent(partnerSlug)}`);
    const json = await res.json();
    setRows(json.expenses || []);
    setData(json);
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/smart-operations" className="text-sm font-black text-emerald-300">← Smart Operations</a>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-10">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Despesas</div>
          <h1 className="mt-4 text-4xl font-black md:text-6xl">Recibo vira despesa classificada.</h1>
          <p className="mt-4 max-w-4xl text-white/65">Fornecedor, descrição, valor, data, categoria, centro de custo e comprovante ficam conectados à operação.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href="/smart-inbox" className="rounded-xl bg-emerald-400 px-6 py-4 text-center font-black text-slate-950">Enviar recibo</a>
            <button onClick={load} className="rounded-xl border border-white/10 px-6 py-4 font-black">Atualizar</button>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          {rows.length === 0 && <div className="rounded-3xl bg-white/10 p-6 text-white/60">Nenhuma despesa registrada ainda.</div>}
          {rows.map((row) => (
            <div key={row.id} className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-emerald-300">{row.description}</h2>
                  <p className="mt-1 text-sm text-white/50">{row.supplierName || 'Fornecedor não identificado'} · {row.category || 'sem categoria'} · {row.costCenter || 'sem centro de custo'}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black">{money(row.amount)}</div>
                  <div className="text-xs font-black uppercase text-white/45">{row.status}</div>
                </div>
              </div>
            </div>
          ))}
        </section>

        <pre className="mt-8 max-h-72 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-emerald-200">{JSON.stringify(data || {}, null, 2)}</pre>
      </div>
    </main>
  );
}

function money(value: any) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
