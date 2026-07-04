'use client';

import { useEffect, useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

export default function RepassesPage() {
  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [plan, setPlan] = useState('starter');
  const [balance, setBalance] = useState<any>(null);
  const [pending, setPending] = useState<any>(null);
  const [result, setResult] = useState<any>({ info: 'Carregue o saldo para começar.' });
  const [loading, setLoading] = useState(false);

  async function getJson(path: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API}${path}`);
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  async function postJson(path: string, body: any) {
    setLoading(true);
    try {
      const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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

  async function load() {
    const slug = encodeURIComponent(partnerSlug);
    const b = await getJson(`/company-billing/payout-requests/balance?partnerSlug=${slug}&plan=${plan}`);
    const p = await getJson(`/company-billing/payout-requests/pending?partnerSlug=${slug}`);
    setBalance(b);
    setPending(p);
    setResult({ action: 'loaded', balance: b, requests: p });
  }

  async function requestScheduled() {
    const response = await postJson('/company-billing/payout-requests/request', {
      partnerSlug,
      plan,
      type: 'SCHEDULED',
      source: 'repasses-page'
    });
    setResult({ action: 'scheduled-payout-requested', response });
    await load();
  }

  async function requestEarly() {
    const response = await postJson('/company-billing/payout-requests/request', {
      partnerSlug,
      plan,
      type: 'EARLY',
      source: 'repasses-page'
    });
    setResult({ action: 'early-payout-requested', response });
    await load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const balanceData = balance?.balance || {};
  const requests = pending?.requests || [];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/conta-nextgen" className="text-sm font-bold text-emerald-300">← Conta NextGen</a>
        <h1 className="mt-4 text-4xl font-black md:text-5xl">Repasses</h1>
        <p className="mt-3 max-w-4xl text-white/60">Acompanhe saldo estimado da subconta, agenda do plano e pedidos de repasse antecipado.</p>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <Metric title="Saldo confirmado" value={balanceData.confirmed || 'R$ 0,00'} />
          <Metric title="Reservado" value={balanceData.reserved || 'R$ 0,00'} />
          <Metric title="Disponível" value={balanceData.available || 'R$ 0,00'} />
          <Metric title="Prazo do plano" value={balance?.scheduledPayout || 'D+3'} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Configuração</h2>
            <label className="mt-5 block">
              <span className="text-xs font-bold uppercase text-white/50">Conta</span>
              <input value={partnerSlug} onChange={(e) => setPartnerSlug(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase text-white/50">Plano</span>
              <select value={plan} onChange={(e) => setPlan(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none">
                <option value="starter">Starter - D+3</option>
                <option value="growth">Growth - D+2</option>
                <option value="pro">Pro - D+1</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <button onClick={load} className="mt-5 w-full rounded-xl bg-blue-400 px-4 py-3 font-black text-slate-950">Atualizar saldo</button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Ações</h2>
            <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-white/60">
              O repasse programado segue o prazo do plano. O repasse antecipado cria uma solicitação fora da agenda e pode ser cobrado como extra.
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <button onClick={requestScheduled} className="rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950">Agendar repasse</button>
              <button onClick={requestEarly} className="rounded-xl bg-purple-400 px-4 py-3 font-black text-slate-950">Pedir antecipado</button>
            </div>
            <div className="mt-5 text-xs text-white/50">{loading ? 'Carregando...' : balanceData.note || 'Saldo estimado com base nas cobranças pagas.'}</div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Pedidos</h2>
            <div className="mt-5 max-h-96 space-y-3 overflow-auto">
              {requests.length ? requests.map((item: any) => (
                <div key={item.id} className="rounded-2xl bg-slate-950 p-4">
                  <div className="font-bold">{item.type} · {item.status}</div>
                  <div className="mt-1 text-sm text-white/60">Valor: {moneyFromCents(item.amountCents)}</div>
                  <div className="mt-1 text-xs text-white/40">Programado: {formatDate(item.scheduledFor)}</div>
                </div>
              )) : <div className="rounded-2xl bg-slate-950 p-4 text-sm text-white/50">Nenhum pedido ainda.</div>}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Resultado</h2>
            <pre className="mt-5 max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200">{JSON.stringify(result, null, 2)}</pre>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-5"><div className="text-xs font-bold uppercase text-white/50">{title}</div><div className="mt-3 text-2xl font-black text-emerald-300">{value}</div></div>;
}

function moneyFromCents(value: any) {
  return (Number(value || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: any) {
  if (!value) return '-';
  try { return new Date(value).toLocaleString('pt-BR'); } catch { return String(value); }
}
