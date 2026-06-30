'use client';

import { useEffect, useState } from 'react';

const API_BASE = 'https://api.nextgenassets.com.br/v1';

type ApiState = any;

export default function RepasseManualPage() {
  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [form, setForm] = useState({
    grossCents: '10000',
    nextgenRate: '0.03',
    providerFeeCents: '50',
    recipientName: 'Empresa Teste',
    recipientRef: 'Pix cadastrado no contrato',
    description: 'Mensalidade teste',
    received: true
  });
  const [summary, setSummary] = useState<ApiState>(null);
  const [pending, setPending] = useState<ApiState>(null);
  const [result, setResult] = useState<ApiState>(null);
  const [loading, setLoading] = useState(false);

  async function callApi(path: string, options?: RequestInit) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }
      });
      const data = await res.json();
      setResult(data);
      return data;
    } catch (err: any) {
      const data = { success: false, error: err.message };
      setResult(data);
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function loadAll() {
    const slug = encodeURIComponent(partnerSlug);
    const s = await callApi(`/company-billing/manual-settlements/summary?partnerSlug=${slug}`);
    const p = await callApi(`/company-billing/manual-settlements/pending?partnerSlug=${slug}`);
    setSummary(s);
    setPending(p);
  }

  async function createSettlement() {
    await callApi('/company-billing/manual-settlements', {
      method: 'POST',
      body: JSON.stringify({
        partnerSlug,
        grossCents: Number(form.grossCents),
        nextgenRate: Number(form.nextgenRate),
        providerFeeCents: Number(form.providerFeeCents),
        recipientName: form.recipientName,
        recipientRef: form.recipientRef,
        description: form.description,
        received: form.received
      })
    });
    await loadAll();
  }

  async function markRepassed(id: string) {
    const proof = window.prompt('Referência do comprovante Pix/transferência:', 'Comprovante Pix manual');
    if (!proof) return;
    await callApi(`/company-billing/manual-settlements/${id}/mark-repassed`, {
      method: 'POST',
      body: JSON.stringify({ repassReference: proof, notes: 'Marcado pelo painel de repasse manual' })
    });
    await loadAll();
  }

  async function markReceived(id: string) {
    await callApi(`/company-billing/manual-settlements/${id}/mark-received`, {
      method: 'POST',
      body: JSON.stringify({ providerReference: 'Recebimento confirmado pelo painel' })
    });
    await loadAll();
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brl = summary?.brl || {};
  const rows = pending?.settlements || [];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <a href="/painel-empresa" className="text-sm font-bold text-emerald-300">← Painel Empresa</a>
            <h1 className="mt-3 text-4xl font-black md:text-5xl">Repasse Manual</h1>
            <p className="mt-2 max-w-2xl text-white/60">Modo inicial para vender agora: recebe na conta própria, calcula taxa NextGen, controla pendência e registra comprovante do Pix manual.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <label className="text-xs font-bold uppercase text-white/50">Empresa / Partner Slug</label>
            <input value={partnerSlug} onChange={(e) => setPartnerSlug(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
            <button onClick={loadAll} className="mt-3 w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 hover:bg-emerald-300">Atualizar</button>
          </div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          <Metric title="Bruto recebido" value={brl.gross || 'R$ 0,00'} />
          <Metric title="Taxa NextGen" value={brl.nextgen || 'R$ 0,00'} />
          <Metric title="Repasse pendente" value={brl.repassPending || 'R$ 0,00'} />
          <Metric title="Já repassado" value={brl.repassed || 'R$ 0,00'} />
        </div>
      </section>

      <section className="px-6 pb-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Criar recebimento</h2>
            <p className="mt-2 text-sm text-white/50">Use para registrar um pagamento que caiu na conta da NextGen e precisa ser repassado.</p>
            <div className="mt-6 space-y-3">
              <Field label="Valor bruto em centavos" value={form.grossCents} onChange={(v) => setForm({ ...form, grossCents: v })} />
              <Field label="Taxa NextGen" value={form.nextgenRate} onChange={(v) => setForm({ ...form, nextgenRate: v })} />
              <Field label="Taxa provedor em centavos" value={form.providerFeeCents} onChange={(v) => setForm({ ...form, providerFeeCents: v })} />
              <Field label="Empresa recebedora" value={form.recipientName} onChange={(v) => setForm({ ...form, recipientName: v })} />
              <Field label="Referência do repasse" value={form.recipientRef} onChange={(v) => setForm({ ...form, recipientRef: v })} />
              <Field label="Descrição" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
              <label className="flex items-center gap-3 rounded-xl bg-slate-900 p-4 text-sm text-white/70">
                <input type="checkbox" checked={form.received} onChange={(e) => setForm({ ...form, received: e.target.checked })} />
                Já caiu na conta e está pronto para repassar
              </label>
              <button onClick={createSettlement} className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 hover:bg-emerald-300">Registrar recebimento</button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black">Pendências</h2>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white/60">{rows.length} itens</span>
            </div>
            <div className="space-y-3">
              {rows.length ? rows.map((item: any) => (
                <div key={item.id} className="rounded-2xl bg-slate-950 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-black">{item.recipientName || 'Empresa'}</div>
                      <div className="mt-1 text-sm text-white/50">{item.description || 'Sem descrição'} · {item.status}</div>
                      <div className="mt-3 grid gap-2 text-sm text-white/70 md:grid-cols-4">
                        <span>Bruto: {item.brl?.gross}</span>
                        <span>NextGen: {item.brl?.nextgen}</span>
                        <span>Provedor: {item.brl?.providerFee}</span>
                        <span>Repasse: {item.brl?.partnerNet}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {item.status === 'EXPECTED' && <button onClick={() => markReceived(item.id)} className="rounded-xl bg-blue-400 px-4 py-2 text-sm font-bold text-slate-950">Recebido</button>}
                      <button onClick={() => markRepassed(item.id)} className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950">Repassado</button>
                    </div>
                  </div>
                </div>
              )) : <div className="rounded-2xl bg-slate-950 p-6 text-white/50">Nenhuma pendência por enquanto.</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/10 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">Resposta da API</h2>
            {loading && <span className="text-sm text-emerald-300">Carregando...</span>}
          </div>
          <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200">{JSON.stringify(result || { info: 'Nenhuma ação ainda.' }, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-bold uppercase text-white/50">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-300" /></label>;
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-6"><div className="text-sm font-bold uppercase text-white/50">{title}</div><div className="mt-3 text-3xl font-black text-emerald-300">{value}</div></div>;
}
