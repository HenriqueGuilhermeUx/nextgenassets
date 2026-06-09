'use client';
import Link from 'next/link';

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gray-900 text-white p-6 overflow-y-auto">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center font-bold">N</div>
        <div>
          <div className="text-lg font-bold">NextGen Assets</div>
          <div className="text-xs text-gray-400">Admin</div>
        </div>
      </div>
      <nav className="space-y-1">
        {[
          { href: '/', label: 'Dashboard', icon: '📊' },
          { href: '/partners', label: 'Parceiros', icon: '🤝' },
          { href: '/users', label: 'Usuários', icon: '👥' },
          { href: '/triggers', label: 'Gatilhos', icon: '⚡' },
          { href: '/executions', label: 'Execuções', icon: '🚀' },
          { href: '/catalog', label: 'Catálogo', icon: '📚' },
          { href: '/reports', label: 'Relatórios', icon: '📈' },
          { href: '/retailer-pipeline', label: 'Pipeline Varejo', icon: '🛍️' }
        ].map(item => (
          <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition text-sm font-medium">
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-8 p-3 bg-gray-800 rounded-lg text-xs text-gray-400">
        <div className="font-semibold text-white mb-1">v1.0.0 MVP</div>
        <div>20+ gatilhos · 5 mocks</div>
      </div>
    </aside>
  );
}
