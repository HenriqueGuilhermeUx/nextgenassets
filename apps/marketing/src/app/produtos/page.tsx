'use client';

import { useEffect, useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

export default function ProdutosPage() {
  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [products, setProducts] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await fetch(`${API}/smart-operations/products?partnerSlug=${encodeURIComponent(partnerSlug)}`);
    const json = await res.json();
    setProducts(json.products || []);
    setData(json);
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/smart-operations" className="text-sm font-black text-emerald-300">← Smart Operations</a>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-10">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Produtos</div>
          <h1 className="mt-4 text-4xl font-black md:text-6xl">Catálogo inteligente por EAN.</h1>
          <p className="mt-4 max-w-4xl text-white/65">Produtos criados por scan, nota de compra ou cadastro expresso. Base para custo, preço e estoque.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href="/product-scan" className="rounded-xl bg-emerald-400 px-6 py-4 text-center font-black text-slate-950">Escanear produto</a>
            <button onClick={load} className="rounded-xl border border-white/10 px-6 py-4 font-black">Atualizar</button>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.length === 0 && <div className="rounded-3xl bg-white/10 p-6 text-white/60">Nenhum produto cadastrado ainda.</div>}
          {products.map((p) => (
            <div key={p.id} className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <div className="text-xs font-black uppercase text-white/45">{p.ean || p.sku || 'sem código'}</div>
              <h2 className="mt-2 text-2xl font-black text-emerald-300">{p.name}</h2>
              <p className="mt-2 text-sm text-white/60">{p.brand || 'Marca não informada'} · {p.category || 'Sem categoria'}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Metric label="Custo" value={money(p.costPrice)} />
                <Metric label="Venda" value={money(p.salePrice)} />
                <Metric label="Estoque" value={String(p.stockQuantity || 0)} />
                <Metric label="Mínimo" value={String(p.minStock || 0)} />
              </div>
            </div>
          ))}
        </section>

        <pre className="mt-8 max-h-72 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-emerald-200">{JSON.stringify(data || {}, null, 2)}</pre>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-950 p-4"><div className="text-xs font-black uppercase text-white/40">{label}</div><div className="mt-1 font-black text-white">{value}</div></div>;
}

function money(value: any) {
  const n = Number(value || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
