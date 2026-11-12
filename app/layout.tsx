import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fila Inteligente com Rota',
  description: 'Fila virtual para restaurantes com rota, tempo de deslocamento e notificação pró-ativa.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
