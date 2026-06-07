import './globals.css';
export const metadata = { title: 'Orkest Admin', description: 'Painel interno Orkest' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
