'use client';

import { useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

export default function TesteRepassePage() {
  const [partnerSlug] = useState('nextgen-assets');
  const [companyName, setCompanyName] = useState('Empresa Teste NextGen');
  const [receivingPixKey, setReceivingPixKey] = useState('');
  const [amount, setAmount] = useState('1.00');
  const [payer, setPayer] = useState({ name: 'Pagador Teste', externalCustomerId: 'pagador-teste-001', email: '', phone: '' });
  const [charge, setCharge] = useState<any>(null);
  const [result, setResult] = useState<any>({ passo: 'Informe a chave Pix da subconta e comece pelo pagador.' });
  const [loading, setLoading] = useState(false);

  async function post(path: string, body: any) {
    setLoading(true);
    try {
      const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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

  async function createPayer() {
    const data = await post('/company-billing/customers', { partnerSlug, ...payer });
    setResult({ action: 'payer-created', response: data });
  }

  async function createCharge() {
    const data = await post('/company-billing/charges', {
      partnerSlug,
      externalCustomerId: payer.externalCustomerId,
      title: 'Teste de repasse',
      description: `Teste de repasse para ${companyName}`,
      amount,
      dueDate: new Date().toISOString().slice(0, 10)
    });
    if (data?.charge) setCharge(data.charge);
    setResult({ action: 'charge-created', response: data });
  }

  async function generatePix() {
    if (!receivingPixKey.trim()) {
      setResult({ success: false, error: 'Informe a chave Pix da subconta.' });
      return;
    }
    if (!charge?.id) {
      setResult({ success: false, error: 'Crie a cobrança antes.' });
      return;
    }

    const data = await post('/company-billing/woovi-subaccounts/create-charge', {
      chargeId: charge.id,
      partnerPixKey: receivingPixKey.trim()
    });

    const link = data?.payment?.paymentLink || data?.payment?.brCode || '';
    if (link) await navigator.clipboard.writeText(link);
    setResult({ action: 'pix-generated', copied: !!link, message: link ? 'Pix gerado e copiado.' : 'Pix gerado.', response: data });
  }

  async function requestPayout() {
    if (!receivingPixKey.trim()) {
      setResult({ success: false, error: 'Informe a chave Pix da subconta.' });
      return;
    }
    const data = await post('/company-billing/woovi-subaccounts/withdraw', { pixKey: receivingPixKey.trim() });
    setResult({ action: 'payout-requested', response: data });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <a href="/conta-nextgen" className="text-sm font-bold text-emerald-300">← Conta NextGen</a>
        <h1 className="mt-4 text-4xl font-black">Teste de subconta</h1>
        <p className="mt-2 max-w-3xl text-white/60">Use uma cobrança pequena para validar: geração do Pix, split para subconta e solicitação de repasse.</p>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card title="1. Subconta recebedora">
            <Field label="Empresa" value={companyName} onChange={setCompanyName} />
            <Field label="Chave Pix da subconta" value={receivingPixKey} onChange={setReceivingPixKey} />
            <Field label="Valor do teste" value={amount} onChange={setAmount} />
            <div className="rounded-2xl bg-slate-950 p-4 text-sm text-white/60">Sugestão: teste com R$ 10,00 para validar taxa, split e saldo.</div>
          </Card>

          <Card title="2. Pagador de teste">
            <Field label="Nome" value={payer.name} onChange={(v) => setPayer({ ...payer, name: v })} />
            <Field label="Código" value={payer.externalCustomerId} onChange={(v) => setPayer({ ...payer, externalCustomerId: v })} />
            <Field label="E-mail" value={payer.email} onChange={(v) => setPayer({ ...payer, email: v })} />
            <Field label="WhatsApp" value={payer.phone} onChange={(v) => setPayer({ ...payer, phone: v })} />
            <button onClick={createPayer} className="mt-4 w-full rounded-xl bg-blue-400 px-4 py-3 font-black text-slate-950">Salvar pagador</button>
          </Card>

          <Card title="3. Cobrança Pix">
            <div className="rounded-2xl bg-slate-950 p-4 text-sm text-white/60">{charge?.id ? `Cobrança criada: ${charge.id}` : 'Crie a cobrança depois de salvar o pagador.'}</div>
            <button onClick={createCharge} className="mt-4 w-full rounded-xl bg-indigo-400 px-4 py-3 font-black text-slate-950">Criar cobrança</button>
            <button onClick={generatePix} className="mt-3 w-full rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950">Gerar Pix sem comissão por recebimento</button>
            <div className="mt-3 text-xs text-white/50">A cobrança reserva apenas a taxa técnica estimada do Pix. A receita da NextGen vem do plano e de recursos extras.</div>
          </Card>

          <Card title="4. Depois do pagamento">
            <div className="rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-white/60">Pague o Pix de teste. Depois confira em /repasses se o saldo entrou automaticamente pelo webhook.</div>
            <button onClick={requestPayout} className="mt-4 w-full rounded-xl bg-purple-400 px-4 py-3 font-black text-slate-950">Solicitar saque da subconta</button>
          </Card>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-6">
          <div className="mb-3 text-sm text-white/50">{loading ? 'Carregando...' : 'Resultado'}</div>
          <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200">{JSON.stringify(result, null, 2)}</pre>
        </section>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: any }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-6"><h2 className="text-2xl font-black">{title}</h2><div className="mt-5 space-y-3">{children}</div></div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-bold uppercase text-white/50">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" /></label>;
}
