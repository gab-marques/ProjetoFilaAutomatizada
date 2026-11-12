'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { QueueEntry, QueueStatus } from '@/types/database';

export default function StaffPanelPage() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/queue/staff');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch {
      // Polling fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 5000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

  async function handleStatusChange(entryId: string, newStatus: QueueStatus) {
    setActionLoading(entryId);
    try {
      const res = await fetch(`/api/queue/${entryId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchEntries();
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreateTestEntry() {
    try {
      const names = ['Camila', 'Felipe', 'Lucas', 'Mariana', 'Thiago', 'Beatriz'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomParty = [2, 2, 4, 4, 6][Math.floor(Math.random() * 5)];
      const randomMinutes = [10, 15, 20, 25][Math.floor(Math.random() * 4)];

      await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_slug: 'cantina-demo',
          display_name: randomName,
          party_size: randomParty,
          travel_mode: 'driving-car',
          travel_minutes: randomMinutes,
          origin_area: 'Batel',
          consent: true,
        }),
      });

      fetchEntries();
    } catch {
      // Ignore simulation error
    }
  }

  const activeEntries = entries.filter((e) =>
    ['waiting', 'notified', 'on_the_way', 'postponed'].includes(e.status),
  );
  const seatedToday = entries.filter((e) => e.status === 'seated').length;
  const noShowToday = entries.filter((e) => e.status === 'no_show').length;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              Cantina Demo • Painel Operacional
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-2">
              Gestão da Fila em Tempo Real
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Atualização automática a cada 5 segundos • Operação da Recepção
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCreateTestEntry}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
            >
              + Simular Entrada de Cliente
            </button>
            <Link
              href="/r/cantina-demo"
              target="_blank"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Abrir Fila Pública ↗
            </Link>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Na Fila Agora</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{activeEntries.length}</p>
            <span className="text-[10px] text-slate-400">grupos aguardando</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Notificados / A Caminho</span>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {entries.filter((e) => e.status === 'notified' || e.status === 'on_the_way').length}
            </p>
            <span className="text-[10px] text-slate-400">aviso disparado</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Atendidos Hoje</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{seatedToday}</p>
            <span className="text-[10px] text-slate-400">mesas sentadas</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Desistências / No-show</span>
            <p className="text-2xl font-black text-slate-700 mt-1">{noShowToday}</p>
            <span className="text-[10px] text-slate-400">não compareceram</span>
          </div>
        </div>

        {/* Main Queue List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Fila Ativa ({activeEntries.length})
            </h2>
            <span className="text-xs text-slate-400">
              {loading ? 'Sincronizando...' : 'Conectado'}
            </span>
          </div>

          {activeEntries.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="text-sm">Nenhum cliente na fila no momento.</p>
              <button
                type="button"
                onClick={handleCreateTestEntry}
                className="mt-3 text-xs font-semibold text-red-600 hover:underline"
              >
                Clique aqui para simular um cliente entrando na fila
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-4 py-3">Grupo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Deslocamento</th>
                    <th className="px-4 py-3">Espera Prevista</th>
                    <th className="px-4 py-3">Entrada</th>
                    <th className="px-6 py-3 text-right">Ações da Recepção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {activeEntries.map((entry, idx) => {
                    const isBusy = actionLoading === entry.id;
                    const elapsedMin = Math.round(
                      (Date.now() - new Date(entry.joined_at).getTime()) / (1000 * 60),
                    );

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            {entry.display_name}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-semibold">
                          {entry.party_size} {entry.party_size === 1 ? 'pessoa' : 'pessoas'}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              entry.status === 'notified'
                                ? 'bg-amber-100 text-amber-800'
                                : entry.status === 'on_the_way'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {entry.status === 'notified'
                              ? '🚗 Notificado (Saia agora)'
                              : entry.status === 'on_the_way'
                              ? 'A Caminho'
                              : 'Aguardando'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          ~{entry.travel_minutes} min ({entry.travel_mode === 'foot-walking' ? 'a pé' : 'carro'})
                        </td>
                        <td className="px-4 py-4 font-bold text-red-600">
                          ~{entry.predicted_wait_min_at_join} min
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          há {elapsedMin} min
                        </td>
                        <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                          {entry.status === 'waiting' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleStatusChange(entry.id, 'notified')}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] transition"
                            >
                              Chamar
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleStatusChange(entry.id, 'seated')}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition"
                          >
                            Sentou ✓
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleStatusChange(entry.id, 'no_show')}
                            className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] transition"
                          >
                            Não veio
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleStatusChange(entry.id, 'cancelled')}
                            className="px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-[11px] transition"
                          >
                            Cancelar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
