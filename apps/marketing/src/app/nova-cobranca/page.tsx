'use client';

import { useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

export default function NovaCobrancaPage() {
  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [subaccountPixKey, setSubaccountPixKey] = useState('');
  const [customer, setCustomer] = useState({
    name: '',
    externalCustomerId: '',
    document: '',
    email: '',
    phone: ''
  });
  const [charge, setCharge] = useState({
    title: '',
    description: '',
    amount: '10.00',
    dueDate: new Date().toISOString().slice(0, 10)
  });
  const [createdCharge, setCreatedCharge] = useState<any>(null);
  const [result, setResult] = useState<any>({ info: 'Preencha o pagador e a cobrança.' });
  const [loading, setLoading] = useState(false);

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

  async function saveCustomer() {
    if (!customer.name.trim()) {
      setResult({ success: false, error: 'Informe o nome do pagador.' });
      return null;
    }

    const externalCustomerId = customer.externalCustomerId.trim() || slugCustomer(customer.name);
    const data = await postJson('/company-billing/customers', {
      partnerSlug,
      name: customer.name.trim(),
      externalCustomerId,
      document: customer.document.trim() || null,
      email: customer.email.trim() || null,
      phone: customer.phone.trim() || null,
      source: 'nova-cobranca-page'
    });

    setCustomer((current) => ({ ...current, externalCustomerId }));
    setResult({ action: 'customer-saved', response: data });
    return { ...data, externalCustomerId };
  }

  async function createChargeOnly() {
    const customerData = await saveCustomer();
    const externalCustomerId = customerData?.externalCustomerId || customer.externalCustomerId.trim() || slugCustomer(customer.name);

    if (!charge.amount.trim()) {
      setResult({ success: false, error: 'Informe o valor da cobrança.' });
      return null;
    }
    if (!charge.dueDate.trim()) {
      setResult({ success: false, error: 'Informe o vencimento.' });
      return null;
    }

    const data = await postJson('/company-billing/charges', {
      partnerSlug,
      externalCustomerId,
      title: charge.title.trim() || `Cobrança ${charge.dueDate}`,
      description: charge.description.trim() || 'Cobrança NextGen',
      amount: charge.amount.trim(),
      dueDate: charge.dueDate,
      source: 'nova-cobranca-page'
    });

    if (data?.charge) setCreatedCharge(data.charge);
    setResult({ action: 'charge-created', response: data });
    return data;
  }

  async function createChargeAndPix() {
    const chargeData = await createChargeOnly();
    const smartCharge = chargeData?.charge;
    if (!smartCharge?.id) return;

    if (!subaccountPixKey.trim()) {
      setResult({
        success: true,
        warning: 'Cobrança criada, mas Pix não foi gerado porque a chave Pix da subconta não foi informada.',
        charge: smartCharge
      });
      return;
    }

    const pix = await postJson('/company-billing/woovi-subaccounts/create-charge', {
      chargeId: smartCharge.id,
      partnerPixKey: subaccountPixKey.trim()
    });

    const link = pix?.payment?.paymentLink || pix?.payment?.brCode || '';
    if (link) await navigator.clipboard.writeText(link);

    setResult({
      action: 'charge-and-pix-created',
      charge: smartCharge,
      pix,
      copied: !!link
    });
  }

  async function generatePixForCreated() {
    if (!createdCharge?.id) {
      setResult({ success: false, error: 'Crie a cobrança primeiro.' });
      return;
    }
    if (!subaccountPixKey.trim()) {
      setResult({ success: false, error: 'Informe a chave Pix da subconta.' });
      return;
    }

    const pix = await postJson('/company-billing/woovi-subaccounts/create-charge', {
      chargeId: createdCharge.id,
      partnerPixKey: subaccountPixKey.trim()
    });

    const link = pix?.payment?.paymentLink || pix?.payment?.brCode || '';
    if (link) await navigator.clipboard.writeText(link);
    setResult({ action: 'pix-generated-for-created-charge', chargeId: createdCharge.id, pix, copied: !!link });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <a href="/operacao" className="text-sm font-black text-emerald-300">← Operação</a>
          <a href="/cobrancas" className="text-sm font-black text-blue-300">Cobranças →</a>
        </div>

        <h1 className="mt-5 text-4xl font-black md:text-5xl">Nova cobrança</h1>
        <p className="mt-3 max-w-4xl text-white/60">Crie pagador, cobrança e Pix com split para subconta em um único fluxo.</p>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Configuração</h2>
            <Field label="Conta" value={partnerSlug} onChange={setPartnerSlug} />
            <Field label="Chave Pix da subconta" value={subaccountPixKey} onChange={setSubaccountPixKey} placeholder="Chave Pix cadastrada na subconta recebedora" />
            <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-white/60">Sem percentual NextGen por Pix. A cobrança reserva apenas a taxa técnica estimada do provedor.</div>
          </div>

          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
            <h2 className="text-2xl font-black">Ações rápidas</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <button onClick={saveCustomer} className="rounded-xl bg-blue-400 px-4 py-3 font-black text-slate-950">Salvar pagador</button>
              <button onClick={createChargeOnly} className="rounded-xl bg-indigo-400 px-4 py-3 font-black text-slate-950">Criar cobrança</button>
              <button onClick={createChargeAndPix} className="rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950">Criar + gerar Pix</button>
            </div>
            {createdCharge?.id ? (
              <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-sm text-white/70">
                Cobrança criada: <span className="font-black text-emerald-300">{createdCharge.id}</span>
                <button onClick={generatePixForCreated} className="mt-3 block w-full rounded-xl bg-purple-400 px-4 py-3 font-black text-slate-950">Gerar Pix desta cobrança</button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Pagador</h2>
            <Field label="Nome" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} placeholder="Nome do cliente pagador" />
            <Field label="Código interno" value={customer.externalCustomerId} onChange={(v) => setCustomer({ ...customer, externalCustomerId: v })} placeholder="opcional; gerado pelo nome se vazio" />
            <Field label="CPF/CNPJ" value={customer.document} onChange={(v) => setCustomer({ ...customer, document: v })} />
            <Field label="E-mail" value={customer.email} onChange={(v) => setCustomer({ ...customer, email: v })} />
            <Field label="WhatsApp" value={customer.phone} onChange={(v) => setCustomer({ ...customer, phone: v })} />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Cobrança</h2>
            <Field label="Título" value={charge.title} onChange={(v) => setCharge({ ...charge, title: v })} placeholder="Ex.: Mensalidade julho" />
            <Field label="Descrição" value={charge.description} onChange={(v) => setCharge({ ...charge, description: v })} placeholder="Descrição para controle interno" />
            <Field label="Valor" value={charge.amount} onChange={(v) => setCharge({ ...charge, amount: v })} placeholder="10.00" />
            <Field label="Vencimento" value={charge.dueDate} onChange={(v) => setCharge({ ...charge, dueDate: v })} placeholder="YYYY-MM-DD" />
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

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="mt-4 block">
      <span className="text-xs font-black uppercase text-white/50">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />
    </label>
  );
}

function slugCustomer(name: string) {
  const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return normalized || `cliente-${Date.now()}`;
}
