'use client';

import { useEffect, useMemo, useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

type Charge = {
  id: string;
  title?: string;
  description?: string;
  amountBrl?: string | number;
  dueDate?: string;
  status?: string;
  paymentLink?: string;
  provider?: string;
  providerRef?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  rawData?: any;
};

export default function CobrancasPage() {
  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [subaccountPixKey, setSubaccountPixKey] = useState('');
  const [charges, setCharges] = useState<Charge[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [result, setResult] = useState<any>({ info: 'Carregue as cobranças para começar.' });
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
    const data = await getJson(`/company-billing/charges?partnerSlug=${slug}`);
    setCharges(data?.charges || []);
    setResult({ action: 'loaded-charges', response: data });
  }

  async function generatePix(charge: Charge) {
    const body: any = { chargeId: charge.id };
    if (subaccountPixKey.trim()) body.partnerPixKey = subaccountPixKey.trim();

    const data = await postJson('/company-billing/woovi-subaccounts/create-charge', body);
    const link = data?.payment?.paymentLink || data?.payment?.brCode || '';
    if (link) await navigator.clipboard.writeText(link);
    setResult({ action: 'pix-generated', chargeId: charge.id, copied: !!link, usedSavedReceivingKey: !subaccountPixKey.trim(), response: data });
    await load();
  }

  async function copyPayment(charge: Charge) {
    const link = charge.paymentLink || charge.rawData?.paymentProvider?.paymentLink || '';
    if (!link) {
      setResult({ success: false, error: 'Esta cobrança ainda não tem link/código Pix salvo.' });
      return;
    }
    await navigator.clipboard.writeText(link);
    setResult({ success: true, action: 'payment-copied', chargeId: charge.id, copied: true });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (selectedStatus === 'ALL') return charges;
    return charges.filter((charge) => String(charge.status || '').toUpperCase() === selectedStatus);
  }, [charges, selectedStatus]);

  const stats = useMemo(() => {
    const paid = charges.filter((c) => String(c.status || '').toUpperCase() === 'PAID');
    const pending = charges.filter((c) => ['PENDING', 'SENT'].includes(String(c.status || '').toUpperCase()));
    const paidTotal = paid.reduce((sum, c) => sum + numberAmount(c.amountBrl), 0);
    return { paidTotal, paid: paid.length, pending: pending.length };
  }, [charges]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <a href="/operacao" className="text-sm font-black text-emerald-300">← Operação</a>
          <div className="flex gap-3 text-sm font-black">
            <a href="/nova-cobranca" className="text-emerald-300">Nova cobrança</a>
            <a href="/importar-base" className="text-blue-300">Importar base</a>
            <a href="/repasses" className="text-purple-300">Repasses</a>
          </div>
        </div>

        <h1 className="mt-5 text-4xl font-black md:text-5xl">Cobranças</h1>
        <p className="mt-3 max-w-4xl text-white/60">Gerencie cobranças, gere Pix com split para subconta e acompanhe status pelo webhook.</p>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <Metric title="Cobranças" value={String(charges.length)} />
          <Metric title="Pendentes" value={String(stats.pending)} />
          <Metric title="Pagas" value={String(stats.paid)} />
          <Metric title="Recebido" value={money(stats.paidTotal)} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Configuração</h2>
            <label className="mt-5 block">
              <span className="text-xs font-black uppercase text-white/50">Conta</span>
              <input value={partnerSlug} onChange={(e) => setPartnerSlug(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-white/50">Chave Pix da subconta opcional</span>
              <input value={subaccountPixKey} onChange={(e) => setSubaccountPixKey(e.target.value)} placeholder="Deixe vazio para usar a chave salva da empresa" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />
            </label>
            <button onClick={load} className="mt-5 w-full rounded-xl bg-blue-400 px-4 py-3 font-black text-slate-950">Atualizar cobranças</button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Como usar</h2>
            <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-sm leading-7 text-white/65">
              <p>1. Crie uma cobrança ou importe uma base.</p>
              <p>2. Se a empresa já tiver chave salva, deixe o campo opcional vazio.</p>
              <p>3. Clique em gerar Pix na cobrança.</p>
              <p>4. O link/código é copiado e o webhook marca como pago depois do pagamento.</p>
            </div>
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">0% NextGen por Pix. A cobrança reserva apenas a taxa técnica estimada do provedor.</div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-black">Lista de cobranças</h2>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none">
              <option value="ALL">Todas</option>
              <option value="PENDING">Pendentes</option>
              <option value="SENT">Enviadas</option>
              <option value="PAID">Pagas</option>
              <option value="OVERDUE">Atrasadas</option>
            </select>
          </div>

          <div className="mt-5 max-h-[680px] space-y-3 overflow-auto">
            {filtered.length ? filtered.map((charge) => (
              <ChargeCard key={charge.id} charge={charge} onGenerate={() => generatePix(charge)} onCopy={() => copyPayment(charge)} />
            )) : <div className="rounded-2xl bg-slate-950 p-5 text-sm text-white/50">Nenhuma cobrança encontrada.</div>}
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

function ChargeCard({ charge, onGenerate, onCopy }: { charge: Charge; onGenerate: () => void; onCopy: () => void }) {
  const status = String(charge.status || 'PENDING').toUpperCase();
  const hasProviderPix = !!(charge.providerRef || charge.paymentLink || charge.rawData?.paymentProvider?.correlationID);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-lg font-black">{charge.title || 'Cobrança'}</div>
          <div className="mt-1 text-sm text-white/50">{charge.customerName || 'Cliente'} · venc. {formatDate(charge.dueDate)}</div>
          <div className="mt-1 text-xs text-white/35">ID: {charge.id}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-emerald-300">{money(numberAmount(charge.amountBrl))}</div>
          <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${status === 'PAID' ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-white/70'}`}>{status}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <button onClick={onGenerate} disabled={status === 'PAID'} className="rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{hasProviderPix ? 'Gerar Pix novamente' : 'Gerar Pix'}</button>
        <button onClick={onCopy} className="rounded-xl bg-blue-400 px-4 py-3 font-black text-slate-950">Copiar link/código</button>
        <a href={`/roteador-pagamentos?id=${charge.id}`} className="rounded-xl bg-white/10 px-4 py-3 text-center font-black text-white">Abrir pagamento</a>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-5"><div className="text-xs font-black uppercase text-white/45">{title}</div><div className="mt-3 text-2xl font-black text-emerald-300">{value}</div></div>;
}

function numberAmount(value: any) {
  return Number(String(value || '0').replace(',', '.')) || 0;
}

function money(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: any) {
  if (!value) return '-';
  try { return new Date(value).toLocaleDateString('pt-BR'); } catch { return String(value); }
}
