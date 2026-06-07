import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Orkest — Motor de Automação Financeira',
  description: 'Transforme seu app em um agente financeiro autônomo. Open Finance + IA + Gatilhos inteligentes pra qualquer destino.',
  keywords: ['open finance', 'automação financeira', 'embedded finance', 'IA financeira', 'B2B fintech'],
  openGraph: {
    title: 'Orkest — Motor de Automação Financeira',
    description: 'Gatilhos financeiros inteligentes pra corretoras, fundos, bancos e varejo.',
    type: 'website'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
