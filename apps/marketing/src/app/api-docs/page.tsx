'use client';
import Script from 'next/script';
import { useState } from 'react';

export default function ApiDocsPage() {
  const [apiKey, setApiKey] = useState('');

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js" strategy="afterInteractive" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" />
      
      <div className="min-h-screen bg-white">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-lg">
          <h1 className="text-xl font-bold">📚 NextGen Assets — API Reference</h1>
          <input
            type="text"
            placeholder="X-API-Key (ng_live_...)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="px-3 py-1 rounded text-slate-900 text-sm w-72"
          />
        </div>
        
        <Script id="redoc-init" strategy="afterInteractive">{`
          document.addEventListener('DOMContentLoaded', () => {
            const specUrl = '/api-spec.json';
            const k = document.querySelector('input[placeholder*="X-API-Key"]')?.value;
            Redoc.init(specUrl, {
              scrollYOffset: 70,
              hideDownloadButton: false,
              expandResponses: '200',
              pathInMiddlePanel: true,
              requiredPropsFirst: true
            }, document.getElementById('redoc-container'));
          });
        `}</Script>
        
        <div id="redoc-container" style={{ height: 'calc(100vh - 70px)' }} />
      </div>
    </>
  );
}
