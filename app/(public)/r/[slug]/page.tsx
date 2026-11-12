'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RestaurantQueuePage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [travelMode, setTravelMode] = useState<'driving-car' | 'foot-walking'>('driving-car');
  const [travelMinutes, setTravelMinutes] = useState(15);
  const [originArea, setOriginArea] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle route calculation if user enters address or clicks geolocation (prepared for Phase 2)
  async function handleEstimateRoute() {
    if (!addressInput.trim()) return;
    setCalculatingRoute(true);
    setErrorMsg('');
    try {
      const res = await fetch(
        `/api/routing/estimate?address=${encodeURIComponent(addressInput)}&mode=${travelMode}&slug=${params.slug}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.travel_minutes) {
          setTravelMinutes(data.travel_minutes);
          if (data.origin_area) setOriginArea(data.origin_area);
        }
      }
    } catch {
      // Fallback: keep manual minutes
    } finally {
      setCalculatingRoute(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!consent) {
      setErrorMsg('Você precisa concordar com os termos de privacidade para entrar na fila.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_slug: params.slug,
          display_name: displayName,
          party_size: Number(partySize),
          travel_mode: travelMode,
          travel_minutes: Number(travelMinutes),
          origin_area: originArea || undefined,
          consent: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao entrar na fila.');
        setLoading(false);
        return;
      }

      router.push(data.redirect_url);
    } catch (err) {
      setErrorMsg('Falha na conexão. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 px-6 py-6 text-white text-center">
          <span className="text-xs font-semibold uppercase tracking-wider bg-red-700/60 px-3 py-1 rounded-full">
            Fila Virtual
          </span>
          <h1 className="text-2xl font-bold mt-2 capitalize">
            {params.slug.replace('-', ' ')}
          </h1>
          <p className="text-xs text-red-100 mt-1">
            Entre na fila agora e seja avisado na hora certa de sair de casa!
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Seu nome ou apelido
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Gabriela"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Tamanho do seu grupo
            </label>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 8, 10].map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => setPartySize(size)}
                  className={`py-2 text-sm font-semibold rounded-lg border transition ${
                    partySize === size
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {size} {size === 1 ? 'pessoa' : 'pessoas'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Como você irá até o restaurante?
            </label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTravelMode('driving-car')}
                className={`py-2 text-xs font-medium rounded-lg border flex items-center justify-center gap-2 ${
                  travelMode === 'driving-car'
                    ? 'bg-red-50 text-red-700 border-red-300 font-semibold'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                🚗 Carro / Uber
              </button>
              <button
                type="button"
                onClick={() => setTravelMode('foot-walking')}
                className={`py-2 text-xs font-medium rounded-lg border flex items-center justify-center gap-2 ${
                  travelMode === 'foot-walking'
                    ? 'bg-red-50 text-red-700 border-red-300 font-semibold'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                🚶 A pé
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Seu endereço ou ponto de partida (opcional)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                placeholder="Ex: Av. Batel, Curitiba"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onBlur={handleEstimateRoute}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-red-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleEstimateRoute}
                disabled={calculatingRoute || !addressInput}
                className="shrink-0 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 rounded-lg transition"
              >
                {calculatingRoute ? '...' : 'Calcular'}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Ou informe manualmente seu tempo de deslocamento:
            </p>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={travelMinutes}
                onChange={(e) => setTravelMinutes(Number(e.target.value))}
                className="w-full accent-red-600"
              />
              <span className="text-xs font-bold text-slate-800 shrink-0 w-16 text-right">
                {travelMinutes === 0 ? 'Já no local' : `${travelMinutes} min`}
              </span>
            </div>
          </div>

          {/* LGPD Consent */}
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span>
                Concordo com o uso temporário da minha localização estritamente para
                cálculo do trajeto até o restaurante. Sei que meu endereço completo <strong>nunca é armazenado</strong>.{' '}
                <Link href="/privacidade" target="_blank" className="text-red-600 underline">
                  Ver detalhes da LGPD
                </Link>.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Entrando na fila...' : 'Entrar na Fila Virtual'}
          </button>
        </form>
      </div>
    </div>
  );
}
