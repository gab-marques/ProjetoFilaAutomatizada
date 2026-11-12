import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { RidgeRegression } from '@/lib/predict/linreg';
import { evaluateModel } from '@/lib/predict/evaluate';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateSyntheticHistory } from '@/scripts/seed-history';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-tick-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== env.TICK_SECRET) {
    return NextResponse.json({ ok: false, error: 'Acesso não autorizado' }, { status: 401 });
  }

  try {
    let history: Array<{
      party_size: number;
      dow: number;
      hour: number;
      queue_len_at_join: number;
      tables_free_at_join: number;
      actual_wait_min: number;
      outcome: string;
    }> = [];

    const isMock = env.NEXT_PUBLIC_SUPABASE_URL.includes('mock') || env.SUPABASE_SERVICE_ROLE_KEY.includes('mock');

    if (!isMock) {
      try {
        const { data, error } = await supabaseAdmin
          .from('wait_history')
          .select('*')
          .eq('outcome', 'seated')
          .order('created_at', { ascending: true });

        if (!error && data && data.length >= 20) {
          history = data;
        }
      } catch {
        // Fallback to generator
      }
    }

    if (history.length === 0) {
      history = generateSyntheticHistory('11111111-1111-1111-1111-111111111111', 2).filter(
        (d) => d.outcome === 'seated',
      );
    }

    const splitIdx = Math.floor(history.length * 0.8);
    const trainData = history.slice(0, splitIdx);
    const testData = history.slice(splitIdx);

    const model = new RidgeRegression();
    const params = model.fit(trainData, 0.5);
    const metrics = evaluateModel(testData, (s) => model.predict(s));

    if (!isMock) {
      try {
        await supabaseAdmin.from('model_versions').insert({
          restaurant_id: '11111111-1111-1111-1111-111111111111',
          kind: 'linreg',
          params,
          trained_at: new Date().toISOString(),
          n_samples: history.length,
          mae_holdout: metrics.mae,
        });
      } catch {
        // Ignore in dev
      }
    }

    return NextResponse.json({
      ok: true,
      kind: 'linreg',
      n_samples: history.length,
      mae_holdout: metrics.mae,
      rmse: metrics.rmse,
      params,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
