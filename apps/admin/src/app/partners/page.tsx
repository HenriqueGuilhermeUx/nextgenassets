'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/sidebar';

export default function PartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  useEffect(() => { api.get('/partners').then(setPartners); }, []);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 p-8">
        <h1 className="text-3xl font-bold mb-6">Parceiros B2B</h1>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Usuários</th>
                <th className="px-4 py-3">Gatilhos</th>
                <th className="px-4 py-3">Execuções</th>
                <th className="px-4 py-3">Take-rate</th>
              </tr>
            </thead>
            <tbody>
              {partners.map(p => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/partners/${p.id}`} className="text-brand-500 hover:underline">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3">{p.type}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">{p.tier}</span></td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{p._count?.users || 0}</td>
                  <td className="px-4 py-3">{p._count?.triggers || 0}</td>
                  <td className="px-4 py-3">{p._count?.executions || 0}</td>
                  <td className="px-4 py-3">R$ {Number(p.takeRateBrl).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
