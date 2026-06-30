import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NextGen Assets — Cobrança Inteligente',
  description: 'Cobrança inteligente para qualquer negócio recorrente. Pix, Pix Automático, lembretes, conciliação e repasse.',
  keywords: ['cobrança inteligente', 'pix automático', 'pix cobrança', 'split de pagamento', 'recorrência', 'fintech B2B'],
  openGraph: {
    title: 'NextGen Assets — Cobrança Inteligente',
    description: 'Automatize cobranças, lembretes, Pix e repasses para qualquer negócio recorrente.',
    type: 'website'
  }
};

function GlobalFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-black">NextGen Assets</div>
          <div className="mt-1 text-sm text-white/50">Cobrança inteligente, Pix, lembretes e repasses para negócios recorrentes.</div>
        </div>

        <div className="flex flex-row items-center gap-3">
          <a
            href="https://wa.me/5511947984328?text=Quero%20falar%20com%20a%20NextGen%20Assets"
            target="_blank"
            rel="noreferrer"
            aria-label="Falar pelo WhatsApp"
            title="WhatsApp"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-xl text-emerald-200 hover:bg-emerald-400/20"
          >
            💬
          </a>
          <a
            href="mailto:henriquecampos66@gmail.com?subject=Contato%20NextGen%20Assets"
            aria-label="Enviar e-mail"
            title="E-mail"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-300/30 bg-blue-300/10 text-xl text-blue-100 hover:bg-blue-300/20"
          >
            ✉️
          </a>
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-7xl flex-col gap-2 border-t border-white/10 pt-5 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
        <span>© {new Date().getFullYear()} NextGen Assets. Todos os direitos reservados.</span>
        <a href="https://alternativeventures.com.br" target="_blank" rel="noreferrer" className="font-bold text-white/70 hover:text-white">
          Desenvolvido por Alternative Ventures
        </a>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <GlobalFooter />
      </body>
    </html>
  );
}
