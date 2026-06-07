'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { api } from '@/lib/api';

export default function TriggersPage() {
  const [triggers, setTriggers] = useState<any[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => { api.get('/triggers').then(setTriggers); }, []);

  async function testTrigger(id: string) {
    setTesting(id);
    setTestResult(null);
    const result = await api.post(`/triggers/${id}/test-evaluation`, {});
    setTestResult({ ...result, triggerId: id });
    setTesting(null);
  }

  async function forceExecute(id: string) {
    setTesting(id);
    await api.post(`/triggers/${id}/force-execute`, {});
    setTestResult({ executed: true, triggerId: id });
    api.get('/triggers').then(setTriggers);
    setTesting(null);
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 p-8">
        <h1 className="text-3xl font-bold mb-6">Gatilhos</h1>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Params</th>
                <th className="px-4 py-3">Execuções</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {triggers.map(t => (
                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{t.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{t.code}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${t.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <code className="text-xs bg-gray-50 px-2 py-1 rounded">{JSON.stringify(t.params).slice(0, 50)}...</code>
                  </td>
                  <td className="px-4 py-3">{t.executionCount}</td>
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => testTrigger(t.id)} disabled={testing === t.id} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                      {testing === t.id ? '⏳' : '🧪'} Testar
                    </button>
                    <button onClick={() => forceExecute(t.id)} disabled={testing === t.id} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                      🚀 Forçar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {testResult && (
          <div className="mt-6 bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-bold mb-3">Resultado do teste</h3>
            <pre className="text-xs bg-gray-50 rounded p-4 overflow-x-auto">{JSON.stringify(testResult, null, 2)}</pre>
          </div>
        )}
      </main>
    </div>
  );
}
