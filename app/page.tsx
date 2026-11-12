import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 mb-4">
          Projeto 1 • Portfólio IA Builder iFood
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Fila Inteligente com Rota
        </h1>
        <p className="mt-4 text-base text-slate-600 leading-relaxed">
          O cliente entra na fila virtual de casa, o sistema calcula o tempo de deslocamento
          em tempo real via OpenRouteService e avisa no Telegram a hora exata de sair.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/r/cantina-demo"
            className="w-full sm:w-auto rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-red-700 transition"
          >
            Entrar na Fila (Demo Restaurante)
          </Link>
          <Link
            href="/painel"
            className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Acessar Painel da Recepção
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-6 text-xs text-slate-500">
          <Link href="/privacidade" className="hover:underline">
            Privacidade e LGPD
          </Link>
          <span>•</span>
          <span>OpenRouteService</span>
          <span>•</span>
          <span>Gemini Flash</span>
          <span>•</span>
          <span>Supabase</span>
        </div>
      </div>
    </main>
  );
}
