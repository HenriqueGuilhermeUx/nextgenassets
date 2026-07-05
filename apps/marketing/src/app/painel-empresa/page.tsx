'use client';

import { useEffect, useMemo, useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

type Charge = {
  id: string;
  title?: string;
  amountBrl?: string | number;
  dueDate?: string;
  status?: string;
  customerName?: string;
  paymentLink?: string;
  providerRef?: string;
  rawData?: any;
  createdAt?: string;
};

export default function PainelEmpresaPage() {
  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [plan, setPlan] = useState('starter');
  const [dashboard, setDashboard] = useState<any>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [requests, setRequests] = useState<any>(null);
  const [result, setResult] = useState<any>({ info: 'Carregando painel da empresa.' });
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

  async function load() {
    const slug = encodeURIComponent(partnerSlug);
    const d = await getJson(`/company-billing/dashboard?partnerSlug=${slug}`);
    const c = await getJson(`/company-billing/charges?partnerSlug=${slug}`);
    const b = await getJson(`/company-billing/payout-requests/balance?partnerSlug=${slug}&plan=${plan}`);
    const r = await getJson(`/company-billing/payout-requests/pending?partnerSlug=${slug}`);

    setDashboard(d);
    setCharges(c?.charges || []);
    setBalance(b);
    setRequests(r);
    setResult({ action: 'loaded-company-dashboard', dashboard: d, charges: c, balance: b, requests: r });
  }

  async function copyChargeLink(charge: Charge) {
    const link = charge.paymentLink || charge.rawData?.paymentProvider?.paymentLink || `https://nextgenassets.com.br/roteador-pagamentos?id=${charge.id}`;
    await navigator.clipboard.writeText(link);
    setResult({ success: true, action: 'charge-link-copied', chargeId: charge.id, link });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = dashboard?.dashboard || {};
  const balanceData = balance?.balance || {};
  const latestCharges = useMemo(() => charges.slice(0, 8), [charges]);
  const pendingCharges = useMemo(() => charges.filter((c) => ['PENDING', 'SENT'].includes(String(c.status || '').toUpperCase())).slice(0, 5), [charges]);
  const openRequests = requests?.requests || [];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <a href="/operacao" className="text-sm font-black text-emerald-300">← Operação</a>
          <div className="flex flex-wrap gap-3 text-sm font-black">
            <a href="/nova-cobranca" className="text-emerald-300">Nova cobrança</a>
            <a href="/cobrancas" className="text-blue-300">Cobranças</a>
            <a href="/repasses" className="text-purple-300">Repasses</a>
          </div>
        </div>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-10">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Conta NextGen</div>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">Painel da empresa</h1>
              <p className="mt-5 max-w-4xl text-lg leading-8 text-white/65">Acompanhe recebimentos, cobranças pendentes, saldo estimado da subconta e próximos repasses.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950 p-5">
              <label className="block">
                <span className="text-xs font-black uppercase text-white/45">Empresa / Partner Slug</span>
                <input value={partnerSlug} onChange={(e) => setPartnerSlug(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />
              </label>
              <label className="mt-4 block">
                <span className="text-xs font-black uppercase text-white/45">Plano</span>
                <select value={plan} onChange={(e) => setPlan(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none">
                  <option value="starter">Starter - D+3</option>
                  <option value="growth">Growth - D+2</option>
                  <option value="pro">Pro - D+1</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <button onClick={load} className="mt-5 w-full rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950">Atualizar painel</button>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Metric title="Total cobrado" value={money(stats.totalAmount)} />
          <Metric title="Recebido" value={money(stats.paidAmount)} />
          <Metric title="Pendente" value={money(stats.pendingAmount)} />
          <Metric title="Cobranças pagas" value={String(stats.paidCount || 0)} />
          <Metric title="Saldo disponível" value={balanceData.available || 'R$ 0,00'} highlight="blue" />
          <Metric title="Prazo repasse" value={balance?.scheduledPayout || 'D+3'} highlight="purple" />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-4">
          <ActionCard title="Nova cobrança" text="Crie pagador, cobrança e Pix em um fluxo rápido." href="/nova-cobranca" cta="Criar agora" />
          <ActionCard title="Cobranças" text="Gere Pix, copie links e acompanhe status." href="/cobrancas" cta="Abrir lista" />
          <ActionCard title="Repasses" text="Veja saldo e solicite repasse conforme o plano." href="/repasses" cta="Ver saldo" />
          <ActionCard title="Importar base" text="Suba clientes e cobranças em lote por CSV." href="/importar-base" cta="Importar" />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-black">Últimas cobranças</h2>
              <a href="/cobrancas" className="text-sm font-black text-emerald-300">Ver todas →</a>
            </div>
            <div className="mt-5 max-h-[520px] space-y-3 overflow-auto">
              {latestCharges.length ? latestCharges.map((charge) => (
                <ChargeRow key={charge.id} charge={charge} onCopy={() => copyChargeLink(charge)} />
              )) : <Empty text="Nenhuma cobrança ainda." />}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h2 className="text-2xl font-black">Saldo e repasses</h2>
              <div className="mt-5 grid gap-3">
                <MiniMetric title="Confirmado" value={balanceData.confirmed || 'R$ 0,00'} />
                <MiniMetric title="Reservado" value={balanceData.reserved || 'R$ 0,00'} />
                <MiniMetric title="Disponível" value={balanceData.available || 'R$ 0,00'} />
              </div>
              <a href="/repasses" className="mt-5 block rounded-xl bg-purple-400 px-4 py-3 text-center font-black text-slate-950">Solicitar / acompanhar repasse</a>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h2 className="text-2xl font-black">Pedidos em aberto</h2>
              <div className="mt-5 space-y-3">
                {openRequests.length ? openRequests.slice(0, 4).map((item: any) => (
                  <div key={item.id} className="rounded-2xl bg-slate-950 p-4">
                    <div className="font-black">{item.type} · {item.status}</div>
                    <div className="mt-1 text-sm text-white/60">{moneyFromCents(item.amountCents)} · {formatDate(item.scheduledFor)}</div>
                  </div>
                )) : <Empty text="Nenhum pedido de repasse aberto." />}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
            <h2 className="text-2xl font-black">Próximas ações</h2>
            <div className="mt-5 space-y-3">
              {pendingCharges.length ? pendingCharges.map((charge) => (
                <div key={charge.id} className="rounded-2xl bg-slate-950 p-4">
                  <div className="font-black">Cobrança pendente</div>
                  <div className="mt-1 text-sm text-white/60">{charge.customerName || 'Cliente'} · {money(numberAmount(charge.amountBrl))}</div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <a href={`/roteador-pagamentos?id=${charge.id}`} className="rounded-xl bg-white/10 px-3 py-2 text-center text-sm font-black text-white">Abrir pagamento</a>
                    <button onClick={() => copyChargeLink(charge)} className="rounded-xl bg-blue-400 px-3 py-2 text-sm font-black text-slate-950">Copiar link</button>
                  </div>
                </div>
              )) : <Empty text="Nenhuma cobrança pendente agora." />}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl font-black">Status técnico</h2>
              {loading ? <span className="text-sm font-bold text-emerald-300">Carregando...</span> : null}
            </div>
            <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200">{JSON.stringify(result, null, 2)}</pre>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value, highlight }: { title: string; value: string; highlight?: 'blue' | 'purple' }) {
  const color = highlight === 'blue' ? 'text-blue-300' : highlight === 'purple' ? 'text-purple-300' : 'text-emerald-300';
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-5"><div className="text-xs font-black uppercase text-white/45">{title}</div><div className={`mt-3 text-2xl font-black ${color}`}>{value}</div></div>;
}

function MiniMetric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-2xl bg-slate-950 p-4"><div className="text-xs font-black uppercase text-white/45">{title}</div><div className="mt-1 text-xl font-black text-emerald-300">{value}</div></div>;
}

function ActionCard({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <a href={href} className="rounded-3xl border border-white/10 bg-white/10 p-6 transition hover:-translate-y-1 hover:border-emerald-300/50 hover:bg-white/15">
      <h2 className="text-2xl font-black text-emerald-300">{title}</h2>
      <p className="mt-3 min-h-14 text-sm leading-6 text-white/60">{text}</p>
      <div className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">{cta}</div>
    </a>
  );
}

function ChargeRow({ charge, onCopy }: { charge: Charge; onCopy: () => void }) {
  const status = String(charge.status || 'PENDING').toUpperCase();
  return (
    <div className="rounded-2xl bg-slate-950 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-black">{charge.title || 'Cobrança'}</div>
          <div className="mt-1 text-sm text-white/50">{charge.customerName || 'Cliente'} · venc. {formatDate(charge.dueDate)}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-emerald-300">{money(numberAmount(charge.amountBrl))}</div>
          <div className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black ${status === 'PAID' ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-white/70'}`}>{status}</div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <a href={`/roteador-pagamentos?id=${charge.id}`} className="rounded-xl bg-white/10 px-3 py-2 text-center text-sm font-black text-white">Abrir pagamento</a>
        <button onClick={onCopy} className="rounded-xl bg-blue-400 px-3 py-2 text-sm font-black text-slate-950">Copiar link</button>
        <a href="/cobrancas" className="rounded-xl border border-white/10 px-3 py-2 text-center text-sm font-black text-white">Gerenciar</a>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl bg-slate-950 p-4 text-sm text-white/50">{text}</div>;
}

function numberAmount(value: any) {
  return Number(String(value || '0').replace(',', '.')) || 0;
}

function money(value: any) {
  const n = Number(String(value || '0').replace(',', '.')) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function moneyFromCents(value: any) {
  return (Number(value || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: any) {
  if (!value) return '-';
  try { return new Date(value).toLocaleDateString('pt-BR'); } catch { return String(value); }
}
