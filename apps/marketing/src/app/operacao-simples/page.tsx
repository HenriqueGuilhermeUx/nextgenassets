'use client';

import { useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

export default function OperacaoSimplesPage() {
  const [partnerSlug] = useState('nextgen-assets');
  const [customer, setCustomer] = useState({ name: 'Cliente Teste', externalCustomerId: 'cliente-001', email: '', phone: '', receiverKey: '' });
  const [charge, setCharge] = useState({ title: 'Pagamento teste', description: 'Serviço / mensalidade / pedido', amount: '10.00', dueDate: '2026-07-05' });
  const [lastCharge, setLastCharge] = useState<any>(null);
  const [result, setResult] = useState<any>({ passo: 'Comece salvando o cliente.' });
  const [loading, setLoading] = useState(false);

  async function api(path: string, body?: any) {
    setLoading(true);
    try {
      const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
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

  async function saveCustomer() {
    const saved = await api('/company-billing/customers', { partnerSlug, ...customer });
    let prepared = null;
    if (customer.receiverKey.trim()) {
      prepared = await api('/company-billing/woovi-subaccounts/create', {
        partnerSlug,
        externalCustomerId: customer.externalCustomerId,
        name: customer.name,
        pixKey: customer.receiverKey.trim()
      });
    }
    setResult({ action: 'customer-ready', customer: saved, receivingAccount: prepared });
  }

  async function createCharge() {
    const created = await api('/company-billing/charges', { partnerSlug, externalCustomerId: customer.externalCustomerId, ...charge });
    if (created?.charge) setLastCharge(created.charge);
    setResult({ action: 'charge-created', next: 'Agora clique em Gerar Pix Woovi.', response: created });
  }

  async function createWoovi() {
    if (!lastCharge?.id) {
      setResult({ success: false, error: 'Crie um recebimento primeiro.' });
      return;
    }
    const created = await api('/company-billing/woovi-subaccounts/create-charge', { chargeId: lastCharge.id, nextgenRate: 0.03 });
    const link = created?.payment?.paymentLink || created?.payment?.brCode || '';
    if (link) await navigator.clipboard.writeText(link);
    setResult({ action: 'woovi-payment-created', copied: !!link, response: created });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <a href="/painel-empresa" className="text-sm font-bold text-emerald-300">← Painel completo</a>
        <h1 className="mt-4 text-4xl font-black">Operação simples</h1>
        <p className="mt-2 text-white/60">Fluxo limpo: cliente, destino de recebimento, cobrança e Pix Woovi.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card title="1. Cliente">
            <Field label="Nome" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} />
            <Field label="Código" value={customer.externalCustomerId} onChange={(v) => setCustomer({ ...customer, externalCustomerId: v })} />
            <Field label="E-mail" value={customer.email} onChange={(v) => setCustomer({ ...customer, email: v })} />
            <Field label="WhatsApp" value={customer.phone} onChange={(v) => setCustomer({ ...customer, phone: v })} />
            <Field label="Chave para receber" value={customer.receiverKey} onChange={(v) => setCustomer({ ...customer, receiverKey: v })} />
            <button onClick={saveCustomer} className="mt-4 w-full rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950">Salvar cliente</button>
          </Card>

          <Card title="2. Recebimento">
            <Field label="Título" value={charge.title} onChange={(v) => setCharge({ ...charge, title: v })} />
            <Field label="Descrição" value={charge.description} onChange={(v) => setCharge({ ...charge, description: v })} />
            <Field label="Valor" value={charge.amount} onChange={(v) => setCharge({ ...charge, amount: v })} />
            <Field label="Vencimento" value={charge.dueDate} onChange={(v) => setCharge({ ...charge, dueDate: v })} />
            <button onClick={createCharge} className="mt-4 w-full rounded-xl bg-blue-400 px-4 py-3 font-black text-slate-950">Criar recebimento</button>
          </Card>

          <Card title="3. Pix Woovi">
            <div className="rounded-2xl bg-slate-950 p-4 text-sm text-white/60">
              {lastCharge?.id ? `Recebimento pronto: ${lastCharge.id}` : 'Crie um recebimento primeiro.'}
            </div>
            <button onClick={createWoovi} className="mt-4 w-full rounded-xl bg-purple-400 px-4 py-3 font-black text-slate-950">Gerar Pix Woovi</button>
            <div className="mt-3 text-xs text-white/50">Quando gerar, o link/código será copiado se a Woovi retornar um pagamento.</div>
          </Card>
        </div>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-6">
          <div className="mb-3 text-sm text-white/50">{loading ? 'Carregando...' : 'Última ação'}</div>
          <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200">{JSON.stringify(result, null, 2)}</pre>
        </section>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: any }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-6"><h2 className="text-2xl font-black">{title}</h2><div className="mt-5 space-y-3">{children}</div></div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block"><span className="text-xs font-bold uppercase text-white/50">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" /></label>;
}
