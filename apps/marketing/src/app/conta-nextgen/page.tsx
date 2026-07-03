'use client';

import { useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

export default function ContaNextGenPage() {
  const [partnerSlug] = useState('nextgen-assets');
  const [account, setAccount] = useState({ companyName: 'Empresa Cliente', receivingPixKey: '' });
  const [payer, setPayer] = useState({ name: 'Cliente Pagador', externalCustomerId: 'pagador-001', email: '', phone: '' });
  const [charge, setCharge] = useState({ title: 'Pagamento teste', description: 'Serviço / mensalidade / pedido', amount: '10.00', dueDate: '2026-07-05' });
  const [lastCharge, setLastCharge] = useState<any>(null);
  const [result, setResult] = useState<any>({ passo: 'Comece abrindo a Conta NextGen da empresa.' });
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

  async function openAccount() {
    const prepared = await post('/company-billing/woovi-subaccounts/create', {
      partnerSlug,
      name: account.companyName,
      receivingPixKey: account.receivingPixKey
    });
    setResult({ action: 'nextgen-account-ready', message: 'Conta NextGen preparada para receber repasses.', response: prepared });
  }

  async function savePayer() {
    const saved = await post('/company-billing/customers', { partnerSlug, ...payer });
    setResult({ action: 'payer-saved', message: 'Cliente pagador salvo.', response: saved });
  }

  async function createCharge() {
    const created = await post('/company-billing/charges', { partnerSlug, externalCustomerId: payer.externalCustomerId, ...charge });
    if (created?.charge) setLastCharge(created.charge);
    setResult({ action: 'charge-created', message: 'Cobrança criada. Agora gere o Pix.', response: created });
  }

  async function generatePix() {
    if (!lastCharge?.id) {
      setResult({ success: false, error: 'Crie uma cobrança primeiro.' });
      return;
    }
    const generated = await post('/company-billing/woovi-subaccounts/create-charge', { chargeId: lastCharge.id, nextgenRate: 0.03 });
    const link = generated?.payment?.paymentLink || generated?.payment?.brCode || '';
    if (link) await navigator.clipboard.writeText(link);
    setResult({ action: 'pix-generated', message: link ? 'Pix gerado e copiado.' : 'Pix gerado.', response: generated });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <a href="/painel-empresa" className="text-sm font-bold text-emerald-300">← Painel</a>
        <h1 className="mt-4 text-4xl font-black">Conta NextGen</h1>
        <p className="mt-2 max-w-3xl text-white/60">Fluxo simples: empresa abre a conta, informa o Pix de repasse, cadastra cliente pagador, cria cobrança e gera Pix.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card title="1. Abrir Conta NextGen">
            <p className="text-sm text-white/60">Este é o cadastro da empresa que vai receber os repasses.</p>
            <Field label="Nome da empresa" value={account.companyName} onChange={(v) => setAccount({ ...account, companyName: v })} />
            <Field label="Pix para receber repasses" value={account.receivingPixKey} onChange={(v) => setAccount({ ...account, receivingPixKey: v })} />
            <button onClick={openAccount} className="mt-4 w-full rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950">Preparar conta</button>
          </Card>

          <Card title="2. Cliente pagador">
            <p className="text-sm text-white/60">Este é o cliente da empresa: quem vai receber a cobrança.</p>
            <Field label="Nome" value={payer.name} onChange={(v) => setPayer({ ...payer, name: v })} />
            <Field label="Código" value={payer.externalCustomerId} onChange={(v) => setPayer({ ...payer, externalCustomerId: v })} />
            <Field label="E-mail" value={payer.email} onChange={(v) => setPayer({ ...payer, email: v })} />
            <Field label="WhatsApp" value={payer.phone} onChange={(v) => setPayer({ ...payer, phone: v })} />
            <button onClick={savePayer} className="mt-4 w-full rounded-xl bg-blue-400 px-4 py-3 font-black text-slate-950">Salvar cliente pagador</button>
          </Card>

          <Card title="3. Cobrança">
            <p className="text-sm text-white/60">Crie uma cobrança avulsa. Depois podemos evoluir para recorrência, prazo, plano e assinatura.</p>
            <Field label="Título" value={charge.title} onChange={(v) => setCharge({ ...charge, title: v })} />
            <Field label="Descrição" value={charge.description} onChange={(v) => setCharge({ ...charge, description: v })} />
            <Field label="Valor" value={charge.amount} onChange={(v) => setCharge({ ...charge, amount: v })} />
            <Field label="Vencimento" value={charge.dueDate} onChange={(v) => setCharge({ ...charge, dueDate: v })} />
            <button onClick={createCharge} className="mt-4 w-full rounded-xl bg-indigo-400 px-4 py-3 font-black text-slate-950">Criar cobrança</button>
          </Card>

          <Card title="4. Pix e envio">
            <p className="text-sm text-white/60">Gera o Pix usando a conta de repasse já preparada na Conta NextGen.</p>
            <div className="rounded-2xl bg-slate-950 p-4 text-sm text-white/60">{lastCharge?.id ? `Cobrança pronta: ${lastCharge.id}` : 'Crie uma cobrança primeiro.'}</div>
            <button onClick={generatePix} className="mt-4 w-full rounded-xl bg-purple-400 px-4 py-3 font-black text-slate-950">Gerar Pix</button>
            <div className="mt-3 text-xs text-white/50">Depois vamos ligar envio automático por e-mail e WhatsApp do cliente.</div>
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
