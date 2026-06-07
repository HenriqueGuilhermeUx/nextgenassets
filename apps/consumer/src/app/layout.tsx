import './globals.css';
export const metadata = { title: 'Meu Orkest' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
