'use client';

import { useEffect, useState } from 'react';

const API_BASE = 'https://api.nextgenassets.com.br/v1';

export default function RoteadorPagamentosPage() {
  const [form, setForm] = useState({
    valueCents: '10000',
    partnerPixKey: '',
    nextgenRate: '0.03',
    wooviFeeRate: '0.005',
    comment: 'Mensalidade teste NextGen',
    reserveProviderFee: true
  });
  const [health, setHealth] = useState<any>(null);
  const [calc, setCalc] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
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

  async function loadHealth() {
    const data = await callApi('/company-billing/payment-router/health');
    setHealth(data);
  }

  async function calculate() {
    const data = await callApi('/company-billing/payment-router/calculate', {
      method: 'POST',
      body: JSON.stringify({
        valueCents: Number(form.valueCents),
        nextgenRate: Number(form.nextgenRate),
        wooviFeeRate: Number(form.wooviFeeRate),
        reserveProviderFee: form.reserveProviderFee
      })
    });
    setCalc(data);
  }

  async function createCharge() {
    const data = await callApi('/company-billing/payment-router/create-woovi-charge', {
      method: 'POST',
      body: JSON.stringify({
        valueCents: Number(form.valueCents),
        partnerPixKey: form.partnerPixKey,
        nextgenRate: Number(form.nextgenRate),
        wooviFeeRate: Number(form.wooviFeeRate),
        comment: form.comment,
        reserveProviderFee: form.reserveProviderFee
      })
    });
    setResult(data);
  }

  useEffect(() => {
    loadHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <a href="/painel-empresa" className="text-sm font-bold text-emerald-300">← Painel Empresa</a>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">Roteador de Pagamentos</h1>
          <p className="mt-3 max-w-3xl text-white/60">Modo híbrido: manual liberado para vender agora, Woovi para Pix/split flexível e Efí para Open Finance/Pix Automático.</p>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          <Metric title="Manual" value="Ativo" text="Receber e repassar com controle" />
          <Metric title="Woovi" value={health?.woovi?.hasAppId ? 'Configurado' : 'Pendente'} text="Pix cobrança e split" />
          <Metric title="Efí" value="Ativo" text="Open Finance e Pix Automático" />
        </div>
      </section>

      <section className="px-6 pb-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Criar cobrança Woovi</h2>
            <p className="mt-2 text-sm text-white/50">Preencha a chave Pix do cliente/parceiro. As chaves da NextGen ficam no Render, não aparecem aqui.</p>
            <div className="mt-6 space-y-3">
              <Field label="Valor em centavos" value={form.valueCents} onChange={(v) => setForm({ ...form, valueCents: v })} />
              <Field label="Chave Pix do parceiro" value={form.partnerPixKey} onChange={(v) => setForm({ ...form, partnerPixKey: v })} />
              <Field label="Taxa NextGen" value={form.nextgenRate} onChange={(v) => setForm({ ...form, nextgenRate: v })} />
              <Field label="Taxa estimada Woovi" value={form.wooviFeeRate} onChange={(v) => setForm({ ...form, wooviFeeRate: v })} />
              <Field label="Descrição" value={form.comment} onChange={(v) => setForm({ ...form, comment: v })} />
              <label className="flex items-center gap-3 rounded-xl bg-slate-900 p-4 text-sm text-white/70">
                <input type="checkbox" checked={form.reserveProviderFee} onChange={(e) => setForm({ ...form, reserveProviderFee: e.target.checked })} />
                Reservar taxa estimada do provedor antes do repasse
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <button onClick={calculate} className="rounded-xl border border-white/10 px-4 py-3 font-bold text-white hover:bg-white/10">Calcular</button>
                <button onClick={createCharge} className="rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 hover:bg-emerald-300">Criar cobrança</button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Panel title="Cálculo">
              <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200">{JSON.stringify(calc || { info: 'Clique em calcular.' }, null, 2)}</pre>
            </Panel>
            <Panel title="Resposta da API">
              <div className="mb-3 text-sm text-white/50">{loading ? 'Carregando...' : 'Última resposta'}</div>
              <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200">{JSON.stringify(result || health || { info: 'Nenhuma ação ainda.' }, null, 2)}</pre>
            </Panel>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-bold uppercase text-white/50">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-300" /></label>;
}

function Metric({ title, value, text }: { title: string; value: string; text: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-6"><div className="text-sm font-bold uppercase text-white/50">{title}</div><div className="mt-3 text-2xl font-black text-emerald-300">{value}</div><div className="mt-2 text-sm text-white/50">{text}</div></div>;
}

function Panel({ title, children }: { title: string; children: any }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-6"><h2 className="text-xl font-black">{title}</h2><div className="mt-4">{children}</div></div>;
}
