'use client';

import { useEffect, useMemo, useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

type RequestItem = {
  id: string;
  type?: string;
  status?: string;
  amountCents?: number;
  plan?: string;
  scheduledFor?: string;
  processedAt?: string | null;
  rawData?: any;
};

export default function RepassesAdminPage() {
  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [plan, setPlan] = useState('starter');
  const [adminToken, setAdminToken] = useState('');
  const [balance, setBalance] = useState<any>(null);
  const [pending, setPending] = useState<any>(null);
  const [selectedId, setSelectedId] = useState('');
  const [providerReference, setProviderReference] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<any>({ info: 'Carregue os pedidos para começar.' });
  const [loading, setLoading] = useState(false);

  async function getJson(path: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API}${path}`);
      return await res.json();
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
    setResult({ action: 'loaded-admin', balance: b, requests: p });
  }

  async function markProcessed() {
    if (!selectedId) {
      setResult({ success: false, error: 'Selecione um pedido.' });
      return;
    }

    if (!adminToken.trim()) {
      setResult({ success: false, error: 'Informe o token operacional.' });
      return;
    }

    const response = await postJson('/company-billing/payout-requests/mark-processed', {
      requestId: selectedId,
      status: 'PROCESSED',
      processedBy: 'repasses-admin',
      adminToken: adminToken.trim(),
      providerReference: providerReference.trim() || null,
      note: note.trim() || null
    });

    setResult({ action: 'request-marked-processed', requestId: selectedId, response });
    await load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requests: RequestItem[] = pending?.requests || [];
  const openRequests = useMemo(() => requests.filter((item) => ['REQUESTED', 'SCHEDULED', 'PROCESSING'].includes(String(item.status || ''))), [requests]);
  const processedRequests = useMemo(() => requests.filter((item) => !['REQUESTED', 'SCHEDULED', 'PROCESSING'].includes(String(item.status || ''))), [requests]);
  const balanceData = balance?.balance || {};

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <a href="/repasses" className="text-sm font-bold text-emerald-300">← Repasses</a>
          <a href="/planos" className="text-sm font-bold text-blue-300">Planos NextGen →</a>
        </div>

        <h1 className="mt-5 text-4xl font-black md:text-5xl">Admin de Repasses</h1>
        <p className="mt-3 max-w-4xl text-white/60">Painel operacional para conferir pedidos, registrar processamento e manter a operação manual segura antes da automação por lote.</p>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <Metric title="Saldo confirmado" value={balanceData.confirmed || 'R$ 0,00'} />
          <Metric title="Reservado" value={balanceData.reserved || 'R$ 0,00'} />
          <Metric title="Disponível" value={balanceData.available || 'R$ 0,00'} />
          <Metric title="Pedidos abertos" value={String(openRequests.length)} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Filtros</h2>
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
            <button onClick={load} className="mt-5 w-full rounded-xl bg-blue-400 px-4 py-3 font-black text-slate-950">Atualizar painel</button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Registrar processamento</h2>
            <p className="mt-2 text-sm text-white/60">Use depois de conferir o pedido e registrar a operação no provedor. Este botão apenas atualiza o status no sistema.</p>

            <label className="mt-5 block">
              <span className="text-xs font-bold uppercase text-white/50">Token operacional</span>
              <input type="password" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} placeholder="NEXTGEN_ADMIN_TOKEN" className="mt-2 w-full rounded-xl border border-amber-300/30 bg-slate-900 px-4 py-3 outline-none" />
            </label>

            <label className="mt-5 block">
              <span className="text-xs font-bold uppercase text-white/50">Pedido</span>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none">
                <option value="">Selecione</option>
                {openRequests.map((item) => (
                  <option key={item.id} value={item.id}>{item.type} · {moneyFromCents(item.amountCents)} · {item.id.slice(0, 16)}...</option>
                ))}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase text-white/50">Referência/comprovante</span>
              <input value={providerReference} onChange={(e) => setProviderReference(e.target.value)} placeholder="ID, comprovante ou referência interna" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase text-white/50">Observação</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: processado em lote do dia" className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />
            </label>

            <button onClick={markProcessed} className="mt-5 w-full rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950">Marcar como processado</button>
            <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-xs leading-5 text-amber-100">Sem token válido, o backend recusa a ação administrativa.</div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Pedidos abertos</h2>
            <div className="mt-5 max-h-[520px] space-y-3 overflow-auto">
              {openRequests.length ? openRequests.map((item) => <RequestCard key={item.id} item={item} selected={item.id === selectedId} onSelect={() => setSelectedId(item.id)} />) : <Empty text="Nenhum pedido aberto." />}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Histórico</h2>
            <div className="mt-5 max-h-[520px] space-y-3 overflow-auto">
              {processedRequests.length ? processedRequests.map((item) => <RequestCard key={item.id} item={item} />) : <Empty text="Nenhum histórico ainda." />}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-6">
          <div className="mb-3 text-sm text-white/50">{loading ? 'Carregando...' : 'Resultado'}</div>
          <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200">{JSON.stringify(result, null, 2)}</pre>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-5"><div className="text-xs font-bold uppercase text-white/50">{title}</div><div className="mt-3 text-2xl font-black text-emerald-300">{value}</div></div>;
}

function RequestCard({ item, selected, onSelect }: { item: RequestItem; selected?: boolean; onSelect?: () => void }) {
  return (
    <button onClick={onSelect} className={`block w-full rounded-2xl border p-4 text-left ${selected ? 'border-emerald-300 bg-emerald-400/10' : 'border-white/10 bg-slate-950'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-black">{item.type || '-'} · {item.status || '-'}</div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">{item.plan || 'sem plano'}</div>
      </div>
      <div className="mt-2 text-lg font-black text-emerald-300">{moneyFromCents(item.amountCents)}</div>
      <div className="mt-1 text-xs text-white/40">ID: {item.id}</div>
      <div className="mt-1 text-xs text-white/40">Programado: {formatDate(item.scheduledFor)}</div>
      {item.processedAt ? <div className="mt-1 text-xs text-white/40">Processado: {formatDate(item.processedAt)}</div> : null}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl bg-slate-950 p-4 text-sm text-white/50">{text}</div>;
}

function moneyFromCents(value: any) {
  return (Number(value || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: any) {
  if (!value) return '-';
  try { return new Date(value).toLocaleString('pt-BR'); } catch { return String(value); }
}
