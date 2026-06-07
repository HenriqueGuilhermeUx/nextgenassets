'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { api } from '@/lib/api';

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => { api.get('/executions?limit=200').then(setExecutions); }, []);

  const filtered = filter === 'all' ? executions : executions.filter(e => e.status === filter);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Execuções</h1>
          <div className="flex gap-2">
            {['all', 'COMPLETED', 'FAILED', 'PENDING'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded text-sm font-medium ${filter === f ? 'bg-brand-500 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">External ID</th>
                <th className="px-4 py-3">Quando</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      e.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      e.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{e.trigger?.code}</td>
                  <td className="px-4 py-3">{e.user?.name}</td>
                  <td className="px-4 py-3">R$ {Number(e.amountBrl || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.externalId?.slice(0, 20) || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(e.createdAt).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
