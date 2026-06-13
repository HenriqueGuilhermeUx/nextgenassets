'use client';
import Script from 'next/script';
import { useState } from 'react';

export default function ApiDocsPage() {
  const [apiKey, setApiKey] = useState('');

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" strategy="afterInteractive" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
      
      <div className="min-h-screen bg-white">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">NextGen Assets — API Reference</h1>
          <input
            type="text"
            placeholder="X-API-Key (ex: ng_live_...)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="px-3 py-1 rounded text-slate-900 text-sm w-72"
          />
        </div>
        <div id="swagger-ui" />
        <Script id="swagger-init" strategy="afterInteractive">{`
          window.onload = () => {
            window.ui = SwaggerUIBundle({
              url: 'https://api.nextgenassets.com.br/v1/admin/webhooks/api-spec.json',
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [SwaggerUIBundle.presets.apis],
              requestInterceptor: (req) => {
                const k = document.querySelector('input[placeholder*="X-API-Key"]')?.value;
                if (k) req.headers['X-API-Key'] = k;
                return req;
              }
            });
          };
        `}</Script>
      </div>
    </>
  );
}
