'use client';

import { useEffect, useState, type ReactNode } from 'react';

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
    description: 'Pagamento teste'
  });
  const [dashboard, setDashboard] = useState<any>(null);
  const [customers, setCustomers] = useState<any>(null);
  const [charges, setCharges] = useState<any>(null);
  const [reminders, setReminders] = useState<any>(null);
  const [notifications, setNotifications] = useState<any>(null);
  const [notificationLogs, setNotificationLogs] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function callApi(path: string, options?: RequestInit, showResult = true) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }
      });
      const data = await res.json();
      if (showResult) setResult(data);
      return data;
    } catch (err: any) {
      const data = { success: false, error: err.message };
      if (showResult) setResult(data);
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function loadAll() {
    const slug = encodeURIComponent(partnerSlug);
    const d = await callApi(`/company-billing/dashboard?partnerSlug=${slug}`, undefined, false);
    const c = await callApi(`/company-billing/customers?partnerSlug=${slug}`, undefined, false);
    const ch = await callApi(`/company-billing/charges?partnerSlug=${slug}`, undefined, false);
    const r = await callApi(`/company-billing/reminders/due?partnerSlug=${slug}`, undefined, false);
    const n = await callApi(`/company-billing/notifications/pending?partnerSlug=${slug}`, undefined, false);
    const nl = await callApi(`/company-billing/notifications/logs?partnerSlug=${slug}&limit=50`, undefined, false);
    setDashboard(d);
    setCustomers(c);
    setCharges(ch);
    setReminders(r);
    setNotifications(n);
    setNotificationLogs(nl);
  }

  async function createCustomer() {
    const response = await callApi('/company-billing/customers', {
      method: 'POST',
      body: JSON.stringify({ partnerSlug, ...customer })
    });
    setResult(response);
    await loadAll();
  }

  async function createCharge() {
    const created = await callApi('/company-billing/charges', {
      method: 'POST',
      body: JSON.stringify({ partnerSlug, ...charge })
    });

    if (created?.success && created?.charge?.id) {
      const scheduled = await callApi('/company-billing/notifications/schedule-charge', {
        method: 'POST',
        body: JSON.stringify({
          partnerSlug,
          chargeId: created.charge.id,
          channels: ['whatsapp', 'email'],
          source: 'painel-empresa'
        })
      });
      setResult({ chargeCreated: created, notificationsScheduled: scheduled });
    } else {
      setResult(created);
    }

    await loadAll();
  }

  async function runNotifications(dryRun: boolean) {
    const response = await callApi('/company-billing/notifications/run-due', {
      method: 'POST',
      body: JSON.stringify({ partnerSlug, dryRun, limit: 100 })
    });
    setResult(response);
    await loadAll();
  }

  async function sendEmailMock() {
    const response = await callApi('/company-billing/notifications/email/send-test', {
      method: 'POST',
      body: JSON.stringify({
        to: customer.email || 'teste@nextgenassets.com.br',
        subject: 'Aviso de pagamento NextGen',
        message: `Olá, ${customer.name.split(' ')[0] || 'cliente'}. Este é um teste de comunicação automática da NextGen para pagamentos, lembretes e recebimentos.`
      })
    });
    setResult({ action: 'email-test', response });
    await loadAll();
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingNotifications = notifications?.count || 0;
  const logsCount = notificationLogs?.count || 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <a href="/" className="text-sm font-bold text-emerald-300">← NextGen Assets</a>
            <h1 className="mt-3 text-4xl font-black md:text-5xl">Painel Empresa</h1>
            <p className="mt-2 text-white/60">Recebimentos, pagamentos, comunicação automática, lembretes e conciliação.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <label className="text-xs font-bold uppercase text-white/50">Empresa / Partner Slug</label>
            <input value={partnerSlug} onChange={(e) => setPartnerSlug(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
            <button onClick={loadAll} className="mt-3 w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 hover:bg-emerald-300">Atualizar painel</button>
          </div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Metric title="Total a receber" value={money(dashboard?.dashboard?.totalAmount)} />
          <Metric title="Recebido" value={money(dashboard?.dashboard?.paidAmount)} />
          <Metric title="Pendente" value={money(dashboard?.dashboard?.pendingAmount)} />
          <Metric title="Lembretes vencidos" value={String(dashboard?.dashboard?.dueReminders || 0)} />
          <Metric title="Avisos pendentes" value={String(pendingNotifications)} highlight="blue" />
          <Metric title="Logs comunicação" value={String(logsCount)} highlight="blue" />
        </div>
      </section>

      <section className="px-6 pb-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_1fr_0.9fr]">
          <Card title="1. Cadastrar cliente">
            <Field label="Nome" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} />
            <Field label="Código interno / unidade" value={customer.externalCustomerId} onChange={(v) => setCustomer({ ...customer, externalCustomerId: v })} />
            <Field label="WhatsApp" value={customer.phone} onChange={(v) => setCustomer({ ...customer, phone: v })} />
            <Field label="E-mail" value={customer.email} onChange={(v) => setCustomer({ ...customer, email: v })} />
            <Field label="Segmento" value={customer.segment} onChange={(v) => setCustomer({ ...customer, segment: v })} />
            <button onClick={createCustomer} className="mt-4 w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 hover:bg-emerald-300">Criar cliente</button>
          </Card>

          <Card title="2. Criar recebimento">
            <Field label="Código do cliente" value={charge.externalCustomerId} onChange={(v) => setCharge({ ...charge, externalCustomerId: v })} />
            <Field label="Título" value={charge.title} onChange={(v) => setCharge({ ...charge, title: v })} />
            <Field label="Descrição" value={charge.description} onChange={(v) => setCharge({ ...charge, description: v })} />
            <Field label="Valor" value={charge.amount} onChange={(v) => setCharge({ ...charge, amount: v })} />
            <Field label="Vencimento" value={charge.dueDate} onChange={(v) => setCharge({ ...charge, dueDate: v })} />
            <button onClick={createCharge} className="mt-4 w-full rounded-xl bg-blue-400 px-4 py-3 font-bold text-slate-950 hover:bg-blue-300">Criar recebimento + notificações</button>
          </Card>

          <Card title="3. Comunicação automática">
            <p className="rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-white/70">
              A NextGen agenda avisos por WhatsApp/e-mail antes do vencimento, no dia do pagamento e após pendência. Enquanto o Resend/WhatsApp real não estão plugados, tudo fica registrado em modo log/mock.
            </p>
            <button onClick={() => runNotifications(true)} className="mt-4 w-full rounded-xl border border-white/10 px-4 py-3 font-bold text-white hover:bg-white/10">Simular avisos vencidos</button>
            <button onClick={() => runNotifications(false)} className="mt-3 w-full rounded-xl bg-indigo-400 px-4 py-3 font-bold text-slate-950 hover:bg-indigo-300">Processar avisos pendentes</button>
            <button onClick={sendEmailMock} className="mt-3 w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 font-bold text-emerald-100 hover:bg-emerald-400/20">Testar e-mail</button>
            <a href="/notificacoes" className="mt-3 block w-full rounded-xl border border-blue-300/30 bg-blue-300/10 px-4 py-3 text-center font-bold text-blue-100 hover:bg-blue-300/20">Abrir central de notificações</a>
          </Card>
        </div>
      </section>

      <section className="px-6 pb-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          <ListCard title="Clientes" items={customers?.customers || []} />
          <ListCard title="Recebimentos" items={charges?.charges || []} />
          <ListCard title="Avisos pendentes" items={notifications?.notifications || []} />
        </div>
      </section>

      <section className="px-6 pb-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <ListCard title="Lembretes antigos" items={reminders?.reminders || []} />
          <ListCard title="Logs de comunicação" items={notificationLogs?.logs || []} />
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/10 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">Resposta da última ação</h2>
            {loading && <span className="text-sm text-emerald-300">Carregando...</span>}
          </div>
          <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200">{JSON.stringify(result || { info: 'Nenhuma ação ainda. O carregamento do dashboard não sobrescreve mais este campo.' }, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-6"><h2 className="mb-4 text-2xl font-black">{title}</h2><div className="space-y-3">{children}</div></div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-bold uppercase text-white/50">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-300" /></label>;
}

function Metric({ title, value, highlight }: { title: string; value: string; highlight?: 'blue' }) {
  const color = highlight === 'blue' ? 'text-blue-300' : 'text-emerald-300';
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-5"><div className="text-xs font-bold uppercase text-white/50">{title}</div><div className={`mt-3 text-2xl font-black ${color}`}>{value}</div></div>;
}

function ListCard({ title, items }: { title: string; items: any[] }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-6"><h2 className="mb-4 text-xl font-black">{title}</h2><div className="max-h-96 space-y-3 overflow-auto">{items.length ? items.slice(0, 10).map((item, index) => <div key={item.id || index} className="rounded-2xl bg-slate-950 p-4"><div className="font-bold">{item.name || item.title || item.type || item.customerName || 'Registro'}</div><div className="mt-1 text-xs text-white/50">{item.status || item.externalCustomerId || item.stepKey || item.channel || item.createdAt}</div>{item.message && <div className="mt-3 text-sm text-white/60">{item.message}</div>}</div>) : <div className="rounded-2xl bg-slate-950 p-4 text-sm text-white/50">Nenhum registro ainda.</div>}</div></div>;
}

function money(value: any) {
  const n = Number(value || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
