import Link from 'next/link';

export default function StaffPanelPlaceholderPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-5xl mx-auto rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Painel do Restaurante</h1>
            <p className="text-sm text-slate-500">Operação da recepção e métricas de fila</p>
          </div>
          <Link href="/" className="text-xs text-slate-600 hover:underline">
            ← Início
          </Link>
        </div>
        <div className="mt-6 rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500 border border-dashed border-slate-300">
          Painel de recepção e métricas (Fase 1 e Fase 6).
        </div>
      </div>
    </div>
  );
}
