'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { QueueEntry } from '@/types/database';

export default function CustomerQueueStatusPage({
  params,
}: {
  params: { slug: string; token: string };
}) {
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [position, setPosition] = useState<number>(1);
  const [groupsAhead, setGroupsAhead] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/queue?token=${params.token}`);
      if (res.ok) {
        const data = await res.json();
        setEntry(data.entry);
        setPosition(data.position);
        setGroupsAhead(data.groupsAhead);
      }
    } catch {
      // Ignore polling errors
    } finally {
      setLoading(false);
    }
  }, [params.token]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function handleUpdateStatus(newStatus: 'on_the_way' | 'cancelled') {
    if (!entry) return;
    if (newStatus === 'cancelled' && !confirm('Tem certeza que deseja cancelar sua vaga na fila?')) {
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/queue/${entry.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchStatus();
      }
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center text-slate-500 text-sm">Carregando status da fila...</div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-slate-200 text-center">
          <h2 className="text-lg font-bold text-slate-900">Entrada não encontrada</h2>
          <p className="mt-2 text-xs text-slate-500">O link pode ser inválido ou já expirou.</p>
          <Link href={`/r/${params.slug}`} className="mt-4 inline-block text-xs font-semibold text-red-600">
            ← Voltar para a fila
          </Link>
        </div>
      </div>
    );
  }

  const isNotified = entry.status === 'notified';
  const isSeated = entry.status === 'seated';
  const isCancelled = entry.status === 'cancelled';
  const isOnTheWay = entry.status === 'on_the_way';

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto space-y-4">
        {/* Main Status Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Status Banner */}
          <div
            className={`p-6 text-white text-center ${
              isNotified
                ? 'bg-amber-500 animate-pulse'
                : isSeated
                ? 'bg-emerald-600'
                : isCancelled
                ? 'bg-slate-600'
                : 'bg-red-600'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider bg-black/20 px-3 py-1 rounded-full">
              {isNotified
                ? '🚗 SAIA AGORA!'
                : isSeated
                ? '🎉 MESA LIBERADA!'
                : isCancelled
                ? 'ENTRADA CANCELADA'
                : isOnTheWay
                ? 'A CAMINHO'
                : 'VOCÊ ESTÁ NA FILA'}
            </span>
            <h1 className="text-2xl font-black mt-3">Olá, {entry.display_name}!</h1>
            <p className="text-xs text-white/90 mt-1">
              Mesa para {entry.party_size} {entry.party_size === 1 ? 'pessoa' : 'pessoas'} • Tempo de trajeto: ~{entry.travel_minutes} min
            </p>
          </div>

          <div className="p-6 space-y-6">
            {!isSeated && !isCancelled && (
              <>
                {/* Big Metric Display */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <span className="text-[11px] font-medium text-slate-500 uppercase">Sua Posição</span>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1">
                      {position}º
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {groupsAhead === 0 ? 'Você é o próximo!' : `${groupsAhead} à sua frente`}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <span className="text-[11px] font-medium text-slate-500 uppercase">Espera Prevista</span>
                    <p className="text-3xl font-extrabold text-red-600 mt-1">
                      ~{entry.predicted_wait_min_at_join}
                      <span className="text-sm font-normal text-slate-500"> min</span>
                    </p>
                    <span className="text-[10px] text-slate-400">modelo preditivo</span>
                  </div>
                </div>

                {/* Notified Alert Action */}
                {isNotified && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
                    <p className="text-sm font-bold text-amber-900">
                      Sua mesa deve liberar em poucos minutos!
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Você leva cerca de {entry.travel_minutes} min para chegar. Saia agora para não perder a vez.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('on_the_way')}
                      disabled={updating}
                      className="mt-3 w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition"
                    >
                      {updating ? 'Atualizando...' : '🚗 Já estou a caminho!'}
                    </button>
                  </div>
                )}

                {/* Telegram Connection Card */}
                <div className="rounded-xl bg-sky-50 border border-sky-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-base shrink-0">
                      ✈
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-sky-950">
                        Receba o aviso no Telegram
                      </h3>
                      <p className="text-[11px] text-sky-700">
                        Conecte nosso bot para receber o alerta &quot;Saia agora&quot; direto no celular.
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://t.me/filainteligentebot?start=${entry.link_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block w-full text-center py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    Ativar Notificações no Telegram
                  </a>
                </div>

                {/* Actions */}
                <div className="pt-2 flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('cancelled')}
                    disabled={updating}
                    className="text-red-600 hover:underline"
                  >
                    Desistir da fila
                  </button>
                  <span className="text-slate-400">Atualiza automaticamente</span>
                </div>
              </>
            )}

            {isSeated && (
              <div className="text-center py-6">
                <p className="text-sm font-semibold text-slate-800">
                  Esperamos que aproveite sua refeição!
                </p>
                <Link
                  href={`/r/${params.slug}`}
                  className="mt-4 inline-block text-xs font-semibold text-red-600 hover:underline"
                >
                  Entrar novamente na fila
                </Link>
              </div>
            )}

            {isCancelled && (
              <div className="text-center py-6">
                <p className="text-sm font-semibold text-slate-600">
                  Sua vaga na fila foi cancelada com sucesso.
                </p>
                <Link
                  href={`/r/${params.slug}`}
                  className="mt-4 inline-block text-xs font-semibold text-red-600 hover:underline"
                >
                  Entrar novamente na fila
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-400 space-x-3">
          <Link href="/privacidade" className="hover:underline">
            Privacidade e LGPD
          </Link>
          <span>•</span>
          <span>Fila Inteligente com Rota</span>
        </div>
      </div>
    </div>
  );
}
