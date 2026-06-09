'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function AdminHome() {
  const [stats, setStats] = useState<any>({});
  const [partners, setPartners] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);

  useEffect(() => {
    api.get('/partners').then(setPartners);
    api.get('/executions?limit=10').then(setExecutions);
    api.get('/executions/stats/summary').then(setStats);
  }, []);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Visão geral do NextGen Assets</p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <KPI label="Total Execuções" value={stats.total || 0} color="bg-blue-500" />
          <KPI label="Completadas" value={stats.completed || 0} color="bg-green-500" />
          <KPI label="Falhadas" value={stats.failed || 0} color="bg-red-500" />
          <KPI label="Pendentes" value={stats.pending || 0} color="bg-yellow-500" />
        </div>

        {/* Partners */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Parceiros B2B</h2>
            <Link href="/partners" className="text-sm text-brand-500">Ver todos →</Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {partners.slice(0, 3).map(p => (
              <Link key={p.id} href={`/partners/${p.id}`} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded">{p.type}</span>
                  <span className="text-xs text-gray-500">{p.tier}</span>
                </div>
                <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{p._count?.users || 0} usuários</span>
                  <span>{p._count?.executions || 0} execuções</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Execuções recentes */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Execuções Recentes</h2>
            <Link href="/executions" className="text-sm text-brand-500">Ver todas →</Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Trigger</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Quando</th>
                </tr>
              </thead>
              <tbody>
                {executions.map(e => (
                  <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{e.trigger?.code}</td>
                    <td className="px-4 py-3">{e.user?.name || '—'}</td>
                    <td className="px-4 py-3">R$ {Number(e.amountBrl || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(e.createdAt).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function KPI({ label, value, color }: any) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100">
      <div className={`w-2 h-2 rounded-full ${color} mb-2`}></div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    EVALUATING: 'bg-blue-100 text-blue-700',
    INITIATING_PIX: 'bg-purple-100 text-purple-700',
    EXECUTING_DESTINATION: 'bg-indigo-100 text-indigo-700'
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded ${colors[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
}

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gray-900 text-white p-6 overflow-y-auto">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center font-bold">O</div>
        <span className="text-xl font-bold">NextGen Assets Admin</span>
      </div>
      <nav className="space-y-1">
        {[
          { href: '/', label: 'Dashboard', icon: '📊' },
          { href: '/partners', label: 'Parceiros', icon: '🤝' },
          { href: '/users', label: 'Usuários', icon: '👥' },
          { href: '/triggers', label: 'Gatilhos', icon: '⚡' },
          { href: '/executions', label: 'Execuções', icon: '🚀' },
          { href: '/catalog', label: 'Catálogo', icon: '📚' },
          { href: '/reports', label: 'Relatórios', icon: '📈' }
        ].map(item => (
          <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition">
            <span>{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-8 p-3 bg-gray-800 rounded-lg text-xs text-gray-400">
        <div className="font-semibold text-white mb-1">v1.0.0 — MVP</div>
        <div>20+ gatilhos · 5 mocks · 4 frontends</div>
      </div>
    </aside>
  );
}
