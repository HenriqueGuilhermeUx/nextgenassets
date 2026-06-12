'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
const PLUGGY_SCRIPT_URL = 'https://cdn.pluggy.ai/static/pluggy-connect/v1.0.0/pluggy-connect.js';

export default function ConnectBankPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('demo-user-001');
  const [status, setStatus] = useState<string>('Pronto pra conectar');
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [pluggyLoaded, setPluggyLoaded] = useState(false);
  const [consent, setConsent] = useState<any>(null);

  useEffect(() => {
    // Carrega o script do widget Pluggy Connect
    if (typeof window === 'undefined') return;
    const s = document.createElement('script');
    s.src = PLUGGY_SCRIPT_URL;
    s.async = true;
    s.onload = () => setPluggyLoaded(true);
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, []);

  useEffect(() => {
    api.get('/users')
      .then((u: any[]) => {
        if (u[0]) setUserId(u[0].externalUserId || u[0].id);
      })
      .catch(() => setStatus('API offline'))
      .finally(() => setLoading(false));
  }, []);

  const getConnectToken = async () => {
    setStatus('Gerando Connect Token...');
    try {
      const r = await api.post('/admin/webhooks/pluggy-connect-token', { clientUserId: userId });
      if (r.connectToken) {
        setConnectToken(r.connectToken);
        setStatus('Connect Token gerado! Abrindo widget...');
        openPluggyWidget(r.connectToken);
      } else {
        setStatus('Erro: ' + JSON.stringify(r));
      }
    } catch (err: any) {
      setStatus('Erro: ' + err.message);
    }
  };

  const openPluggyWidget = (token: string) => {
    // @ts-ignore
    const PluggyConnect = window.PluggyConnect;
    if (!PluggyConnect) {
      setStatus('Widget Pluggy não carregou');
      return;
    }
    const connect = new PluggyConnect({
      connectToken: token,
      onSuccess: (itemData: any) => {
        setStatus('✅ Banco conectado! Item: ' + itemData.item.id);
        checkConsent();
      },
      onError: (err: any) => {
        setStatus('Erro: ' + err.message);
      },
      onClose: () => {
        setStatus('Widget fechado');
      }
    });
    connect.init();
  };

  const checkConsent = async () => {
    setStatus('Verificando consent...');
    try {
      // @ts-ignore
      const allConsents = await fetch(`${API_URL}/admin/webhooks/consents`).then(r => r.json());
      setConsent(allConsents);
      setStatus('Consent atualizado!');
    } catch (err: any) {
      setStatus('Erro ao checar consent: ' + err.message);
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: '#10b981' }}>🏦 Conectar Banco</h1>
      <p>Pluggy Open Finance — conecta teu banco pra ver saldo e transações em tempo real.</p>

      <div style={{ background: '#0a0e1a', color: '#fff', padding: 16, borderRadius: 8, margin: '20px 0' }}>
        <strong>Status:</strong> {status}
      </div>

      <div style={{ background: '#1a1a2e', color: '#fff', padding: 16, borderRadius: 8, margin: '20px 0', fontSize: 13 }}>
        <div><strong>User ID:</strong> {userId}</div>
        <div><strong>Widget Pluggy:</strong> {pluggyLoaded ? '✅ Carregado' : '⏳ Carregando...'}</div>
        <div><strong>Connect Token:</strong> {connectToken ? '✅ ' + connectToken.substring(0, 30) + '...' : '—'}</div>
      </div>

      <button
        onClick={getConnectToken}
        disabled={loading || !pluggyLoaded}
        style={{
          padding: '14px 32px',
          fontSize: 16,
          background: pluggyLoaded ? '#10b981' : '#999',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: pluggyLoaded ? 'pointer' : 'not-allowed',
          marginRight: 8
        }}
      >
        🏦 Conectar Banco
      </button>

      <button
        onClick={checkConsent}
        style={{
          padding: '14px 32px',
          fontSize: 16,
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer'
        }}
      >
        🔄 Verificar Consent
      </button>

      {consent && consent.consents && consent.consents.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2>Consents Pluggy ({consent.count})</h2>
          {consent.consents.map((c: any) => (
            <div key={c.id} style={{ background: '#0a0e1a', color: '#fff', padding: 12, borderRadius: 6, marginBottom: 8 }}>
              <div><strong>ID:</strong> {c.id}</div>
              <div><strong>Provider:</strong> {c.provider}</div>
              <div><strong>Status:</strong> {c.status}</div>
              <div><strong>User:</strong> {c.providerUserId}</div>
              <div><strong>Metadata:</strong> <code>{JSON.stringify(c.metadata)}</code></div>
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: 32, color: '#666', fontSize: 13 }}>
        Ao conectar, tu autoriza a NextGen a consultar saldo e transações via Open Finance.
        Custo: R$ 0,50 por consulta.
      </p>
    </div>
  );
}
