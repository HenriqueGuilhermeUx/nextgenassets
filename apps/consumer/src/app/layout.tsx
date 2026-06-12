import './globals.css';

export const metadata = {
  title: 'NextGen Assets | Billing',
  description: 'Plano Free e Premium do NextGen Assets'
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
