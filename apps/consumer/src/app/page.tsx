'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

export default function ConsumerPortal() {
  const [userId, setUserId] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(true);

  useEffect(() => {
    api.get('/users')
      .then((u: any[]) => {
        setUsers(u);
        if (u[0]) setUserId(u[0].id);
        setApiOnline(true);
      })
      .catch(() => setApiOnline(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (userId) {
      // Timeout de 5s pra nao ficar carregando infinito
      const timeout = setTimeout(() => setReport({}), 5000);
      api.get(`/reports/consumer/${userId}`)
        .then(setReport)
        .catch(() => setReport({}))
        .finally(() => clearTimeout(timeout));
    }
  }, [userId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold">N</div>
            <div>
              <div className="font-bold">Meu NextGen Assets</div>
              <div className="text-xs text-gray-500">Minhas automações financeiras</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {users.length > 0 && (
              <select
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-gray-500">{apiOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* API Status Banner */}
        {!apiOnline && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="font-semibold text-red-900">⚠️ API não tá respondendo</div>
            <div className="text-sm text-red-700 mt-1">
              Endpoint: <code className="bg-red-100 px-1 rounded">{API_URL}</code>
            </div>
            <a href={API_URL + '/health'} target="_blank" className="text-sm text-red-700 underline mt-2 inline-block">
              Verificar health check →
            </a>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-500">Carregando suas automações...</div>
        ) : users.length === 0 ? (
          <EmptyState apiOnline={apiOnline} />
        ) : !report ? (
          <div className="text-center py-20 text-gray-500">Carregando relatório...</div>
        ) : Object.keys(report).length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-bold mb-2">Sem dados ainda</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Você ainda não tem gatilhos ativos. Comece criando um gatilho no Admin pra ver suas automações aqui.
            </p>
            <a
              href="https://nga-admin.vercel.app"
              className="inline-block px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
            >
              Ir pro Admin →
            </a>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl p-6 text-white mb-6">
              <div className="text-sm text-white/80 mb-1">Olá, {report.user?.name} 👋</div>
              <div className="text-3xl font-bold mb-1">
                R$ {(report.summary?.totalSpentBrl || 0).toFixed(2)}
              </div>
              <div className="text-sm text-white/80">
                investido automaticamente este mês
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <Stat label="Gatilhos ativos" value={report.summary?.activeTriggers} />
                <Stat label="Execuções" value={report.summary?.executionsThisMonth} />
                <Stat label="Sucesso" value={report.summary?.successfulExecutions} />
              </div>
            </div>

            <section className="mb-6">
              <h2 className="text-xl font-bold mb-3">Meus Gatilhos Ativos</h2>
              {report.activeTriggers?.length > 0 ? (
                <div className="space-y-3">
                  {report.activeTriggers.map((t: any) => (
                    <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold">{t.name}</div>
                          <code className="text-xs text-gray-500">{t.code}</code>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">ATIVO</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <Param label="Parâmetros" value={JSON.stringify(t.params)} />
                        <Param label="Execuções" value={t.executionCount || 0} />
                      </div>
                      {t.lastExecuted && (
                        <div className="mt-2 text-xs text-gray-500">Última execução: {new Date(t.lastExecuted).toLocaleString('pt-BR')}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-500 text-sm">
                  Nenhum gatilho ativo. Crie um no Admin pra começar.
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Histórico Recente</h2>
              <div className="bg-white rounded-xl border border-gray-100 divide-y">
                {report.recentExecutions?.slice(0, 10).map((e: any) => (
                  <div key={e.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{e.trigger}</div>
                      <div className="text-xs text-gray-500">{new Date(e.date).toLocaleString('pt-BR')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">R$ {Number(e.amount || 0).toFixed(2)}</div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        e.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{e.status}</span>
                    </div>
                  </div>
                ))}
                {!report.recentExecutions?.length && (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    Nenhuma execução ainda
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState({ apiOnline }: { apiOnline: boolean }) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">👤</div>
      <h2 className="text-2xl font-bold mb-2">Nenhum usuário cadastrado</h2>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        {apiOnline
          ? 'Crie seu primeiro usuário no Admin pra começar a usar automações.'
          : 'A API não tá respondendo. Verifique se o backend tá rodando.'}
      </p>
      <div className="flex justify-center gap-3">
        <a
          href="https://nga-admin.vercel.app"
          className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
        >
          Ir pro Admin →
        </a>
        <a
          href={API_URL + '/health'}
          target="_blank"
          className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Checar API
        </a>
      </div>
    </div>
  );
}

function Stat({ label, value }: any) {
  return (
    <div>
      <div className="text-2xl font-bold">{value || 0}</div>
      <div className="text-xs text-white/80">{label}</div>
    </div>
  );
}

function Param({ label, value }: any) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-mono text-xs truncate">{value}</div>
    </div>
  );
}
