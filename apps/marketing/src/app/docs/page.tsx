'use client';
import Link from 'next/link';

const EXAMPLES = {
  woovi_charge: `curl -X POST https://api.nextgenassets.com.br/v1/admin/webhooks/woovi-test \\
  -H "Content-Type: application/json" \\
  -d '{
    "totalCents": 1000,
    "nextgenCents": 30,
    "partnerCents": 920,
    "correlationID": "order-123",
    "nextgenPixKey": "5f3325c1-2210-419c-977e-03b47fddbd1f",
    "partnerPixKey": "henriquecampos66@gmail.com",
    "comment": "Compra #123"
  }'`,
  split_webhook: `# Webhook: charge.paid (POST JSON)
{
  "event": "OPENPIX:CHARGE_COMPLETED",
  "data": {
    "identifier": "abc123",
    "correlationID": "order-123",
    "value": 1000,
    "status": "COMPLETED",
    "splits": [
      { "pixKey": "nextgen", "value": 30 },
      { "pixKey": "partner", "value": 920 }
    ]
  }
}`,
  pluggy_token: `curl -X POST https://api.nextgenassets.com.br/v1/admin/webhooks/pluggy-connect-token \\
  -H "Content-Type: application/json" \\
  -d '{"clientUserId": "user-abc-123"}'`,
  pluggy_consent: `# Webhook: item/created
{
  "event": "item/created",
  "itemId": "item-uuid",
  "clientUserId": "user-abc-123",
  "connectorId": 201
}`,
  withdraw: `curl -X POST https://api.nextgenassets.com.br/v1/admin/webhooks/woovi-withdraw-all \\
  -H "Content-Type: application/json" \\
  -d '{"minCents": 100}'`,
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="inline-block bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full mb-6">
          📚 API Reference v1.0
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4">
          NextGen Assets <span className="text-emerald-400">API</span>
        </h1>
        <p className="text-xl text-slate-400 mb-6">
          Split de PIX nativo. Open Finance. AI Orchestrator. Tudo em uma API REST.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="#quickstart"
            className="bg-emerald-500 text-slate-900 px-5 py-2 rounded-lg font-bold hover:bg-emerald-400"
          >
            ⚡ Quickstart (5min)
          </a>
          <a
            href="https://raw.githubusercontent.com/HenriqueGuilhermeUx/nextgenassets/main/postman/nextgen.postman_collection.json"
            className="bg-purple-500 text-white px-5 py-2 rounded-lg font-bold hover:bg-purple-400"
          >
            📦 Postman Collection
          </a>
          <a
            href="#sdk"
            className="bg-amber-500 text-slate-900 px-5 py-2 rounded-lg font-bold hover:bg-amber-400"
          >
            🟨 SDK JS
          </a>
        </div>
      </section>

      {/* Quickstart */}
      <section id="quickstart" className="px-6 py-12 max-w-5xl mx-auto border-t border-slate-800">
        <h2 className="text-3xl font-bold mb-6">⚡ Quickstart (5 minutos)</h2>
        <p className="text-slate-400 mb-6">
          Cobrar R$ 100 e dividir R$ 3 (NextGen) + R$ 97 (Partner) com split nativo Woovi.
        </p>
        <ol className="space-y-4 mb-8">
          <li className="flex gap-3">
            <div className="bg-emerald-500 text-slate-900 rounded-full w-7 h-7 flex items-center justify-center font-bold flex-shrink-0">1</div>
            <div>
              <strong>Obtenha suas chaves</strong>
              <p className="text-slate-400 text-sm">Solicite seu AppID Woovi + ClientID/Secret Pluggy via dashboard.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <div className="bg-emerald-500 text-slate-900 rounded-full w-7 h-7 flex items-center justify-center font-bold flex-shrink-0">2</div>
            <div>
              <strong>Configure o webhook</strong>
              <p className="text-slate-400 text-sm">Cadastre <code className="bg-slate-800 px-1 rounded">https://seudominio.com/v1/webhooks/woovi</code> no console Woovi (evento <code className="bg-slate-800 px-1 rounded">OPENPIX:CHARGE_COMPLETED</code>).</p>
            </div>
          </li>
          <li className="flex gap-3">
            <div className="bg-emerald-500 text-slate-900 rounded-full w-7 h-7 flex items-center justify-center font-bold flex-shrink-0">3</div>
            <div>
              <strong>Crie uma charge com split</strong>
              <p className="text-slate-400 text-sm mb-2">POST <code className="bg-slate-800 px-1 rounded">/v1/admin/webhooks/woovi-test</code> com o payload abaixo:</p>
              <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs overflow-x-auto text-emerald-300">
                {EXAMPLES.woovi_charge}
              </pre>
            </div>
          </li>
          <li className="flex gap-3">
            <div className="bg-emerald-500 text-slate-900 rounded-full w-7 h-7 flex items-center justify-center font-bold flex-shrink-0">4</div>
            <div>
              <strong>Pague o QR Code e pronto</strong>
              <p className="text-slate-400 text-sm">Woovi dispara webhook → split é creditado automaticamente nas subcontas → cron saca a cada 1h.</p>
            </div>
          </li>
        </ol>
      </section>

      {/* Endpoints */}
      <section className="px-6 py-12 max-w-5xl mx-auto border-t border-slate-800">
        <h2 className="text-3xl font-bold mb-6">📡 Endpoints</h2>

        <div className="space-y-3">
          {[
            { method: 'POST', path: '/v1/admin/webhooks/woovi-test', desc: 'Criar cobrança Woovi com split nativo' },
            { method: 'POST', path: '/v1/admin/webhooks/woovi-receiver', desc: 'Webhook receiver (charge.completed)' },
            { method: 'POST', path: '/v1/admin/webhooks/woovi-pixout', desc: 'PIX OUT (transferência entre contas)' },
            { method: 'POST', path: '/v1/admin/webhooks/woovi-withdraw', desc: 'Sacar de 1 subconta' },
            { method: 'POST', path: '/v1/admin/webhooks/woovi-withdraw-all', desc: 'Sacar de TODAS as subcontas' },
            { method: 'GET',  path: '/v1/admin/webhooks/woovi-subaccounts', desc: 'Lista subcontas com saldos' },
            { method: 'POST', path: '/v1/admin/webhooks/pluggy-connect-token', desc: 'Cria Connect Token (Pluggy)' },
            { method: 'POST', path: '/v1/admin/webhooks/pluggy-alias', desc: 'Webhook Pluggy (item/created, item/updated)' },
            { method: 'GET',  path: '/v1/admin/webhooks/consents', desc: 'Lista Consents Pluggy' },
            { method: 'GET',  path: '/v1/admin/webhooks/debug-logs', desc: 'Logs in-memory (debug)' },
            { method: 'POST', path: '/v1/admin/webhooks/select', desc: 'Executa SELECT SQL (debug)' },
            { method: 'GET',  path: '/v1/admin/webhooks/woovi-cron-status', desc: 'Status do cron auto-withdraw' },
            { method: 'POST', path: '/v1/admin/webhooks/woovi-cron-run', desc: 'Roda cron manualmente' },
            { method: 'POST', path: '/v1/admin/webhooks/efi/test-charge', desc: 'Criar cobrança Efi (LEGACY)' },
            { method: 'POST', path: '/v1/admin/webhooks/billing/activate', desc: 'Ativar PREMIUM manual' },
            { method: 'GET',  path: '/v1/admin/webhooks/efi/balance', desc: 'Saldo Efi (LEGACY)' },
          ].map((e) => (
            <div key={e.path} className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded-lg p-3">
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                e.method === 'GET' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {e.method}
              </span>
              <code className="text-sm flex-1 text-slate-200">{e.path}</code>
              <span className="text-xs text-slate-500">{e.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Webhooks */}
      <section className="px-6 py-12 max-w-5xl mx-auto border-t border-slate-800">
        <h2 className="text-3xl font-bold mb-6">🔔 Webhooks</h2>
        <p className="text-slate-400 mb-6">Seu endpoint recebe POST com Content-Type: application/json.</p>

        <h3 className="text-xl font-bold mb-3 text-emerald-300">Woovi — charge.completed</h3>
        <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs overflow-x-auto text-emerald-300 mb-8">
          {EXAMPLES.split_webhook}
        </pre>

        <h3 className="text-xl font-bold mb-3 text-purple-300">Pluggy — item/created</h3>
        <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs overflow-x-auto text-purple-300">
          {EXAMPLES.pluggy_consent}
        </pre>
      </section>

      {/* SDK */}
      <section id="sdk" className="px-6 py-12 max-w-5xl mx-auto border-t border-slate-800">
        <h2 className="text-3xl font-bold mb-6">🟨 SDK JavaScript</h2>
        <p className="text-slate-400 mb-4">Browser + Node. Zero deps. CDN ou npm.</p>

        <h3 className="text-lg font-bold mb-2">Via CDN (1 linha):</h3>
        <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs overflow-x-auto text-amber-300 mb-6">
{`<script src="https://cdn.nextgenassets.com.br/v1/nextgen-sdk.js"></script>
<script>
  const ng = new NextGen({ apiKey: 'ng_live_...' });
  ng.woovi.createCharge({ value: 1000, splits: [...] });
</script>`}
        </pre>

        <h3 className="text-lg font-bold mb-2">Via npm:</h3>
        <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs overflow-x-auto text-amber-300 mb-6">
{`npm install @nextgen/sdk

import NextGen from '@nextgen/sdk';
const ng = new NextGen({ apiKey: 'ng_live_...' });
const charge = await ng.woovi.createCharge({
  value: 1000,
  correlationID: 'order-123',
  splits: [
    { pixKey: 'nextgen@pix', value: 30 },
    { pixKey: 'partner@pix', value: 920 }
  ]
});
console.log(charge.paymentLinkUrl);`}
        </pre>

        <h3 className="text-lg font-bold mb-2">Métodos disponíveis:</h3>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <code className="bg-slate-900 px-3 py-2 rounded text-emerald-300">ng.woovi.createCharge(opts)</code>
          <code className="bg-slate-900 px-3 py-2 rounded text-emerald-300">ng.woovi.getCharge(id)</code>
          <code className="bg-slate-900 px-3 py-2 rounded text-emerald-300">ng.woovi.listCharges()</code>
          <code className="bg-slate-900 px-3 py-2 rounded text-emerald-300">ng.woovi.createTransfer(opts)</code>
          <code className="bg-slate-900 px-3 py-2 rounded text-emerald-300">ng.woovi.listSubaccounts()</code>
          <code className="bg-slate-900 px-3 py-2 rounded text-emerald-300">ng.woovi.withdrawAll(opts)</code>
          <code className="bg-slate-900 px-3 py-2 rounded text-purple-300">ng.pluggy.createConnectToken(userId)</code>
          <code className="bg-slate-900 px-3 py-2 rounded text-purple-300">ng.pluggy.listConsents()</code>
        </div>
      </section>

      {/* Auth */}
      <section className="px-6 py-12 max-w-5xl mx-auto border-t border-slate-800">
        <h2 className="text-3xl font-bold mb-6">🔐 Autenticação</h2>
        <p className="text-slate-400 mb-4">
          Todas as chamadas precisam de <code className="bg-slate-800 px-1 rounded">X-API-Key</code>:
        </p>
        <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs overflow-x-auto">
{`curl -H "X-API-Key: ng_live_your_key_here" \\
  https://api.nextgenassets.com.br/v1/...`}
        </pre>
        <p className="text-slate-500 text-sm mt-4">
          Obtenha sua key em <Link href="/vender" className="text-emerald-400 underline">nextgenassets.com.br/vender</Link>.
        </p>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 max-w-4xl mx-auto text-center border-t border-slate-800">
        <h2 className="text-3xl font-bold mb-4">Pronto pra integrar?</h2>
        <p className="text-slate-400 mb-6">1 hora pra ir de zero a split PIX nativo em produção.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="https://wa.me/5511947984328?text=Quero+integrar+NextGen" className="bg-emerald-500 text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-emerald-400">
            💬 Falar com suporte
          </a>
          <Link href="/vender" className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-lg font-bold hover:bg-white/20">
            Ver pitch →
          </Link>
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-slate-500 text-sm border-t border-slate-800">
        <p>NextGen Assets © 2026 — API Reference v1.0</p>
      </footer>
    </div>
  );
}
