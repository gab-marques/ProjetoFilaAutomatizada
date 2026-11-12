import Link from 'next/link';

interface Props {
  params: { slug: string };
}

export default function RestaurantQueuePlaceholderPage({ params }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Cantina Demo ({params.slug})</h1>
        <p className="mt-2 text-sm text-slate-600">
          Entrada na fila virtual com cálculo de tempo de deslocamento.
        </p>
        <div className="mt-6 rounded-lg bg-slate-100 p-4 text-xs text-slate-500">
          Formulário de entrada na fila (Fase 1 e Fase 2).
        </div>
        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-red-600 hover:underline">
            ← Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
