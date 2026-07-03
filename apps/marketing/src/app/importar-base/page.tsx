'use client';

import { useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

const SAMPLE = `codigo;nome;email;whatsapp;documento;valor;vencimento;descricao
cli-001;João Silva;joao@email.com;11999999999;12345678900;49,90;2026-07-10;Mensalidade julho
cli-002;Maria Souza;maria@email.com;11888888888;98765432100;79,90;15/07/2026;Plano mensal`;

export default function ImportarBasePage() {
  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [csv, setCsv] = useState(SAMPLE);
  const [result, setResult] = useState<any>({ info: 'Cole sua planilha em formato CSV e clique em Pré-visualizar.' });
  const [loading, setLoading] = useState(false);

  async function send(path: string, dryRun = false) {
    setLoading(true);
    try {
      const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerSlug, csv, dryRun })
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <a href="/conta-nextgen" className="text-sm font-bold text-emerald-300">← Conta NextGen</a>
        <h1 className="mt-4 text-4xl font-black">Importar base</h1>
        <p className="mt-2 max-w-3xl text-white/60">Cole uma planilha com clientes pagadores e cobranças. A NextGen cria os clientes e as cobranças em lote.</p>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <label className="text-xs font-bold uppercase text-white/50">Empresa</label>
            <input value={partnerSlug} onChange={(e) => setPartnerSlug(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />

            <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-sm text-white/60">
              Colunas aceitas: <b>codigo, nome, email, whatsapp, documento, valor, vencimento, descricao</b>
            </div>

            <textarea value={csv} onChange={(e) => setCsv(e.target.value)} className="mt-5 h-[420px] w-full rounded-2xl border border-white/10 bg-slate-900 p-4 font-mono text-sm outline-none" />

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <button onClick={() => setCsv(SAMPLE)} className="rounded-xl border border-white/10 px-4 py-3 font-bold hover:bg-white/10">Modelo</button>
              <button onClick={() => send('/company-billing/bulk/preview')} className="rounded-xl bg-blue-400 px-4 py-3 font-black text-slate-950">Pré-visualizar</button>
              <button onClick={() => send('/company-billing/bulk/import', false)} className="rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950">Importar</button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Resultado</h2>
            <p className="mt-2 text-sm text-white/50">{loading ? 'Processando...' : 'Última ação'}</p>
            <pre className="mt-5 max-h-[560px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200">{JSON.stringify(result, null, 2)}</pre>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
          <h2 className="text-2xl font-black">Como usar</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Step title="1. Copie do Excel" text="Copie as linhas com cabeçalho e cole no campo." />
            <Step title="2. Confira" text="Clique em Pré-visualizar para ver se a leitura está correta." />
            <Step title="3. Importe" text="Clique em Importar para criar clientes e cobranças." />
          </div>
        </section>
      </div>
    </main>
  );
}

function Step({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl bg-slate-950 p-5"><div className="font-black text-emerald-300">{title}</div><p className="mt-2 text-sm leading-6 text-white/60">{text}</p></div>;
}
