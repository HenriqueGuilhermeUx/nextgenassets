'use client';
import { useState, useEffect } from 'react';

interface TriggerType {
  code: string;
  name: string;
  description: string;
}

interface CatalogCategory {
  [key: string]: TriggerType[];
}

export default function TriggersPage() {
  const [catalog, setCatalog] = useState<any>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [nlInput, setNlInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [myTriggers, setMyTriggers] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch('https://api.nextgenassets.com.br/v1/triggers/catalog')
      .then(r => r.json())
      .then(setCatalog);
    // Busca meus triggers
    fetch('https://api.nextgenassets.com.br/v1/triggers/by-user/demo-user', {
      headers: { 'X-API-Key': 'nka_demo' }
    }).then(r => r.json()).then(setMyTriggers);
  }, []);

  const createFromNL = async () => {
    setCreating(true);
    try {
      const r = await fetch('https://api.nextgenassets.com.br/v1/triggers/from-natural-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: nlInput,
          userId: 'demo-user',
          partnerId: 'demo-partner'
        })
      });
      const data = await r.json();
      setResult(data);
    } finally {
      setCreating(false);
    }
  };

  const createCustom = async (code: string) => {
    setSelectedCode(code);
    setResult({ code, ready: true, message: 'Configure os parâmetros abaixo' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">🎯 Gatilhos</h1>
        <p className="text-gray-700 mb-8">
          45 gatilhos disponíveis. Crie com linguagem natural ou escolha um abaixo.
        </p>

        {/* NL Input */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-3">💬 Criar com Linguagem Natural</h2>
          <p className="text-sm text-gray-600 mb-3">Descreva o que você quer em português:</p>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 border rounded-lg p-3"
              placeholder='Ex: "Quando cliente João pagar, marca venda como paga"'
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
            />
            <button
              onClick={createFromNL}
              disabled={creating || !nlInput}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50"
            >
              {creating ? 'Criando...' : '✨ Criar'}
            </button>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            <strong>Exemplos:</strong> "PIX recebido do cliente 34198276870" · 
            "Subscription vencendo em 3 dias" · 
            "Meta de vendas R$ 10k" · 
            "Cliente inativo há 30 dias" · 
            "NPS baixo" · 
            "Carrinho abandonado há 1h" · 
            "Estoque abaixo de 5"
          </div>
        </div>

        {/* Resultado */}
        {result && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8">
            <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}

        {/* Catálogo */}
        {catalog && (
          <div className="space-y-6">
            {Object.entries(catalog.categories as CatalogCategory).map(([cat, triggers]) => (
              <div key={cat} className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-xl font-bold mb-4">
                  {cat.replace(/_/g, ' ')} ({triggers.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {triggers.map((t: TriggerType) => (
                    <button
                      key={t.code}
                      onClick={() => createCustom(t.code)}
                      className="text-left border rounded-lg p-4 hover:border-purple-500 hover:bg-purple-50 transition"
                    >
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-xs text-gray-600 mt-1">{t.description}</div>
                      <code className="text-xs text-purple-600 mt-2 block">{t.code}</code>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Meus Triggers */}
        {myTriggers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mt-8">
            <h2 className="text-xl font-bold mb-4">📋 Meus Gatilhos ({myTriggers.length})</h2>
            <div className="space-y-2">
              {myTriggers.map((t: any) => (
                <div key={t.id} className="border rounded-lg p-3 flex justify-between">
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <code className="text-xs text-gray-500">{t.code}</code>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'}`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
