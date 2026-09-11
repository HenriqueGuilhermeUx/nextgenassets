'use client';

import { useEffect, useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

const sample = `DANFE NF-e\nFornecedor ABC LTDA\nCNPJ 12.345.678/0001-90\nNota 12345\nData 10/09/2026\nProduto 7894900011517\nTotal R$ 10,00\nVencimento 20/09/2026`;

export default function SmartInboxPage() {
  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [fileName, setFileName] = useState('nota-teste.pdf');
  const [documentText, setDocumentText] = useState(sample);
  const [barcode, setBarcode] = useState('');
  const [data, setData] = useState<any>(null);
  const [inbox, setInbox] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function call(path: string, options?: RequestInit) {
    setLoading(true);
    try {
      const res = await fetch(`${API}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }
      });
      const json = await res.json();
      setData(json);
      return json;
    } catch (err: any) {
      const json = { success: false, error: err.message };
      setData(json);
      return json;
    } finally {
      setLoading(false);
    }
  }

  async function receive() {
    const json = await call('/smart-operations/inbox', {
      method: 'POST',
      body: JSON.stringify({
        partnerSlug,
        tenantSlug: partnerSlug,
        source: 'SMART_INBOX_UI',
        fileName,
        mimeType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        documentText,
        barcode
      })
    });
    if (json?.success) await loadInbox();
  }

  async function confirm(documentId: string, action: string) {
    const json = await call(`/smart-operations/documents/${documentId}/confirm-action`, {
      method: 'POST',
      body: JSON.stringify({ confirm: true, action, source: 'smart-inbox-ui' })
    });
    if (json?.success) await loadInbox();
  }

  async function loadInbox() {
    const json = await call(`/smart-operations/inbox?partnerSlug=${encodeURIComponent(partnerSlug)}`);
    setInbox(json?.documents || []);
  }

  useEffect(() => {
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/smart-operations" className="text-sm font-black text-emerald-300">← Smart Operations</a>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-10">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">NextGen Smart Inbox</div>
          <h1 className="mt-4 text-4xl font-black md:text-6xl">📷 Escanear / enviar documento</h1>
          <p className="mt-4 max-w-4xl text-white/65">Receba nota, PDF, recibo, comprovante ou código de barras. O MVP aceita texto/metadata e já prepara o fluxo para upload com signed URL.</p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Novo documento</h2>
            <div className="mt-5 space-y-3">
              <Field label="Empresa" value={partnerSlug} setValue={setPartnerSlug} />
              <Field label="Nome do arquivo" value={fileName} setValue={setFileName} />
              <Field label="Código de barras / linha digitável" value={barcode} setValue={setBarcode} />
              <label className="block">
                <span className="text-xs font-black uppercase text-white/45">Texto extraído / simulação OCR</span>
                <textarea value={documentText} onChange={(e) => setDocumentText(e.target.value)} className="mt-1 min-h-56 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none" />
              </label>
              <button onClick={receive} disabled={loading} className="w-full rounded-xl bg-emerald-400 px-5 py-4 font-black text-slate-950 disabled:opacity-60">Identificar documento</button>
              <button onClick={loadInbox} disabled={loading} className="w-full rounded-xl border border-white/10 px-5 py-4 font-black text-white disabled:opacity-60">Atualizar inbox</button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Documentos recebidos</h2>
            <div className="mt-5 space-y-4">
              {inbox.length === 0 && <div className="rounded-2xl bg-slate-950 p-4 text-sm text-white/60">Nenhum documento ainda.</div>}
              {inbox.map((doc) => (
                <div key={doc.id} className="rounded-2xl bg-slate-950 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-black text-emerald-300">{doc.documentType}</div>
                      <div className="mt-1 text-xs text-white/45">{doc.id}</div>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">{doc.status}</div>
                  </div>
                  <div className="mt-4 text-sm leading-6 text-white/65">
                    Total: {doc.extractedData?.total ? Number(doc.extractedData.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'não identificado'}<br />
                    Fornecedor: {doc.extractedData?.supplier?.name || 'não identificado'}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(doc.suggestedActions || []).map((action: string) => (
                      <button key={action} onClick={() => confirm(doc.id, action)} className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-200">{action}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-blue-400/20 bg-blue-400/10 p-6">
          <h2 className="text-2xl font-black">Resposta da API</h2>
          <pre className="mt-4 max-h-[420px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-blue-100">{loading ? 'Carregando...' : JSON.stringify(data || {}, null, 2)}</pre>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  return <label className="block"><span className="text-xs font-black uppercase text-white/45">{label}</span><input value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" /></label>;
}
