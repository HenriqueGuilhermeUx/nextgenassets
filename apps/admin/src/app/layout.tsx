import './globals.css';
export const metadata = { title: 'NextGen Assets Admin', description: 'Painel interno NextGen Assets' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
