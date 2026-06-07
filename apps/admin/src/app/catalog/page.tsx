'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { api } from '@/lib/api';

export default function CatalogPage() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => { api.get('/catalog/triggers').then(setCatalog); }, []);

  const filtered = filter === 'all' ? catalog : catalog.filter(t => t.category === filter);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 p-8">
        <h1 className="text-3xl font-bold mb-2">Catálogo de Gatilhos</h1>
        <p className="text-gray-500 mb-6">{catalog.length} gatilhos disponíveis</p>

        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'INVESTMENT_AUTO', 'INVESTMENT_PASSIVE', 'BANKING', 'CONSUMPTION', 'UTILITY', 'INSURANCE', 'CUSTOM'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-sm ${filter === f ? 'bg-brand-500 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
              {f === 'all' ? 'Todos' : f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {filtered.map(t => (
            <div key={t.code} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg">{t.name}</h3>
                  <code className="text-xs text-gray-500">{t.code}</code>
                </div>
                {t.isPremium && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded">PREMIUM</span>}
              </div>
              <p className="text-sm text-gray-600 mb-3">{t.description}</p>
              <div className="text-xs text-gray-500 italic mb-2">"{t.exampleNarrative}"</div>
              <div className="bg-gray-50 rounded p-2 text-xs font-mono">
                {JSON.stringify(t.exampleParams)}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
