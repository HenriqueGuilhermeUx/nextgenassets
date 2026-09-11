'use client';

import { useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

export default function ProductScanPage() {
  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [code, setCode] = useState('7894900011517');
  const [costPrice, setCostPrice] = useState('6.50');
  const [salePrice, setSalePrice] = useState('9.90');
  const [initialStock, setInitialStock] = useState('12');
  const [minStock, setMinStock] = useState('3');
  const [lookup, setLookup] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function findProduct() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/smart-operations/products/lookup?code=${encodeURIComponent(code)}`);
      const json = await res.json();
      setLookup(json.product);
      setData(json);
    } catch (err: any) {
      setData({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function saveProduct() {
    setLoading(true);
    try {
      const p = lookup || { ean: code, name: `Produto ${code}` };
      const res = await fetch(`${API}/smart-operations/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerSlug,
          ean: p.ean || code,
          name: p.name,
          brand: p.brand,
          category: p.category,
          packaging: p.packaging,
          weight: p.weight,
          imageUrl: p.imageUrl,
          costPrice,
          salePrice,
          initialStock,
          minStock,
          source: 'product-scan-ui'
        })
      });
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setData({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <a href="/smart-operations" className="text-sm font-black text-emerald-300">← Smart Operations</a>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-10">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">NextGen Product Scan</div>
          <h1 className="mt-4 text-4xl font-black md:text-6xl">Código de barras em cadastro expresso.</h1>
          <p className="mt-4 max-w-4xl text-white/65">EAN/UPC vira produto identificado. O usuário completa só preço de custo, preço de venda, estoque inicial e estoque mínimo.</p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Escanear produto</h2>
            <div className="mt-5 space-y-3">
              <Field label="Empresa" value={partnerSlug} setValue={setPartnerSlug} />
              <Field label="EAN / UPC" value={code} setValue={setCode} />
              <button onClick={findProduct} disabled={loading} className="w-full rounded-xl bg-emerald-400 px-5 py-4 font-black text-slate-950 disabled:opacity-60">Identificar produto</button>
            </div>

            {lookup && (
              <div className="mt-6 rounded-2xl bg-slate-950 p-5">
                <div className="text-xs font-black uppercase text-white/45">Produto identificado</div>
                <h3 className="mt-2 text-2xl font-black text-emerald-300">{lookup.name}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{lookup.brand || 'Marca não identificada'} · {lookup.packaging || lookup.weight || 'Embalagem não identificada'}</p>
                <p className="mt-1 text-xs text-white/40">EAN: {lookup.ean || code}</p>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Cadastro expresso</h2>
            <div className="mt-5 space-y-3">
              <Field label="Preço de custo" value={costPrice} setValue={setCostPrice} />
              <Field label="Preço de venda" value={salePrice} setValue={setSalePrice} />
              <Field label="Estoque inicial" value={initialStock} setValue={setInitialStock} />
              <Field label="Estoque mínimo" value={minStock} setValue={setMinStock} />
              <button onClick={saveProduct} disabled={loading} className="w-full rounded-xl bg-blue-400 px-5 py-4 font-black text-slate-950 disabled:opacity-60">Salvar produto</button>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-blue-400/20 bg-blue-400/10 p-6">
          <h2 className="text-2xl font-black">Resposta</h2>
          <pre className="mt-4 max-h-[420px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-blue-100">{loading ? 'Carregando...' : JSON.stringify(data || {}, null, 2)}</pre>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  return <label className="block"><span className="text-xs font-black uppercase text-white/45">{label}</span><input value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" /></label>;
}
