'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { api } from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => { api.get('/users').then(setUsers); }, []);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 p-8">
        <h1 className="text-3xl font-bold mb-6">Usuários (Consumidores Finais)</h1>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">External ID</th>
                <th className="px-4 py-3">Consent</th>
                <th className="px-4 py-3">Banco</th>
                <th className="px-4 py-3">Gatilhos</th>
                <th className="px-4 py-3">Execuções</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 font-mono text-xs">{u.externalUserId}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      u.consentStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100'
                    }`}>{u.consentStatus}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{u.bankName} {u.bankAccountMask}</td>
                  <td className="px-4 py-3">{u._count?.triggers || 0}</td>
                  <td className="px-4 py-3">{u._count?.executions || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
