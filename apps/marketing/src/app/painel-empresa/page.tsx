'use client';

import { useEffect, useState } from 'react';

const API_BASE = 'https://api.nextgenassets.com.br/v1';

export default function PainelEmpresaPage() {
  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [customer, setCustomer] = useState({
    name: 'Cliente Teste',
    externalCustomerId: 'cliente-001',
    phone: '',
    email: '',
    unit: '001',
    segment: 'condominio'
  });
  const [charge, setCharge] = useState({
    externalCustomerId: 'cliente-001',
    amount: '100.00',
    dueDate: '2026-07-05',
    title: 'Mensalidade teste',
    description: 'Cobrança teste'
  });
  const [dashboard, setDashboard] = useState<any>(null);
  const [customers, setCustomers] = useState<any>(null);
  const [charges, setCharges] = useState<any>(null);
  const [reminders, setReminders] = useState<any>(null);
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

  async function loadAll() {
    const slug = encodeURIComponent(partnerSlug);
    const d = await callApi(`/company-billing/dashboard?partnerSlug=${slug}`);
    const c = await callApi(`/company-billing/customers?partnerSlug=${slug}`);
    const ch = await callApi(`/company-billing/charges?partnerSlug=${slug}`);
    const r = await callApi(`/company-billing/reminders/due?partnerSlug=${slug}`);
    setDashboard(d);
    setCustomers(c);
    setCharges(ch);
    setReminders(r);
  }

  async function createCustomer() {
    await callApi('/company-billing/customers', {
      method: 'POST',
      body: JSON.stringify({ partnerSlug, ...customer })
    });
    await loadAll();
  }

  async function createCharge() {
    await callApi('/company-billing/charges', {
      method: 'POST',
      body: JSON.stringify({ partnerSlug, ...charge })
    });
    await loadAll();
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <a href="/" className="text-sm font-bold text-emerald-300">← NextGen Assets</a>
            <h1 className="mt-3 text-4xl font-black md:text-5xl">Painel Empresa</h1>
            <p className="mt-2 text-white/60">MVP da Cobrança Inteligente: clientes, cobranças e lembretes.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <label className="text-xs font-bold uppercase text-white/50">Empresa / Partner Slug</label>
            <input value={partnerSlug} onChange={(e) => setPartnerSlug(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
            <button onClick={loadAll} className="mt-3 w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 hover:bg-emerald-300">Atualizar painel</button>
          </div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          <Metric title="Total a receber" value={money(dashboard?.dashboard?.totalAmount)} />
          <Metric title="Recebido" value={money(dashboard?.dashboard?.paidAmount)} />
          <Metric title="Pendente" value={money(dashboard?.dashboard?.pendingAmount)} />
          <Metric title="Lembretes vencidos" value={String(dashboard?.dashboard?.dueReminders || 0)} />
        </div>
      </section>

      <section className="px-6 pb-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <Card title="1. Cadastrar cliente">
            <Field label="Nome" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} />
            <Field label="Código interno / unidade" value={customer.externalCustomerId} onChange={(v) => setCustomer({ ...customer, externalCustomerId: v })} />
            <Field label="Contato" value={customer.phone} onChange={(v) => setCustomer({ ...customer, phone: v })} />
            <Field label="E-mail" value={customer.email} onChange={(v) => setCustomer({ ...customer, email: v })} />
            <Field label="Segmento" value={customer.segment} onChange={(v) => setCustomer({ ...customer, segment: v })} />
            <button onClick={createCustomer} className="mt-4 w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 hover:bg-emerald-300">Criar cliente</button>
          </Card>

          <Card title="2. Criar cobrança">
            <Field label="Código do cliente" value={charge.externalCustomerId} onChange={(v) => setCharge({ ...charge, externalCustomerId: v })} />
            <Field label="Título" value={charge.title} onChange={(v) => setCharge({ ...charge, title: v })} />
            <Field label="Descrição" value={charge.description} onChange={(v) => setCharge({ ...charge, description: v })} />
            <Field label="Valor" value={charge.amount} onChange={(v) => setCharge({ ...charge, amount: v })} />
            <Field label="Vencimento" value={charge.dueDate} onChange={(v) => setCharge({ ...charge, dueDate: v })} />
            <button onClick={createCharge} className="mt-4 w-full rounded-xl bg-blue-400 px-4 py-3 font-bold text-slate-950 hover:bg-blue-300">Criar cobrança + lembretes</button>
          </Card>
        </div>
      </section>

      <section className="px-6 pb-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          <ListCard title="Clientes" items={customers?.customers || []} />
          <ListCard title="Cobranças" items={charges?.charges || []} />
          <ListCard title="Lembretes prontos" items={reminders?.reminders || []} />
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-6"><h2 className="mb-4 text-2xl font-black">{title}</h2><div className="space-y-3">{children}</div></div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-bold uppercase text-white/50">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-300" /></label>;
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-6"><div className="text-sm font-bold uppercase text-white/50">{title}</div><div className="mt-3 text-3xl font-black text-emerald-300">{value}</div></div>;
}

function ListCard({ title, items }: { title: string; items: any[] }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-6"><h2 className="mb-4 text-xl font-black">{title}</h2><div className="space-y-3">{items.length ? items.slice(0, 8).map((item, index) => <div key={item.id || index} className="rounded-2xl bg-slate-950 p-4"><div className="font-bold">{item.name || item.title}</div><div className="mt-1 text-xs text-white/50">{item.status || item.externalCustomerId || item.stepKey}</div></div>) : <div className="rounded-2xl bg-slate-950 p-4 text-sm text-white/50">Nenhum registro ainda.</div>}</div></div>;
}

function money(value: any) {
  const n = Number(value || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
