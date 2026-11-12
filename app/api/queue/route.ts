import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getRestaurantBySlug,
  getActiveQueueEntries,
  createQueueEntry,
  getQueueEntryByToken,
} from '@/lib/queue/store';
import {
  calculateQueuePosition,
  estimateBaselineWait,
  getTableCategory,
} from '@/lib/queue/position';

const createQueueSchema = z.object({
  restaurant_slug: z.string().min(1, 'Slug do restaurante é obrigatório'),
  display_name: z.string().trim().min(2, 'Informe seu nome ou apelido (mínimo 2 caracteres)'),
  party_size: z.coerce.number().int().min(1, 'Mínimo 1 pessoa').max(12, 'Máximo 12 pessoas'),
  travel_mode: z.enum(['driving-car', 'foot-walking']).default('driving-car'),
  travel_minutes: z.coerce.number().int().nonnegative().default(0),
  origin_area: z.string().optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Você precisa aceitar os termos de uso e privacidade (LGPD)' }),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createQueueSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, errors: parsed.error.format() },
        { status: 400 },
      );
    }

    const {
      restaurant_slug,
      display_name,
      party_size,
      travel_mode,
      travel_minutes,
      origin_area,
    } = parsed.data;

    const restaurant = await getRestaurantBySlug(restaurant_slug);
    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: 'Restaurante não encontrado' },
        { status: 404 },
      );
    }

    const activeEntries = await getActiveQueueEntries(restaurant.id);
    const category = getTableCategory(party_size);
    const tablesCount = restaurant.tables_by_size[category] || 4;

    // Temporary calculation before inserting
    const groupsAhead = activeEntries.filter(
      (e) => getTableCategory(e.party_size) === category,
    ).length;

    const baselineWait = estimateBaselineWait(groupsAhead, tablesCount);
    const linkToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    const createdEntry = await createQueueEntry({
      restaurant_id: restaurant.id,
      display_name,
      party_size,
      status: 'waiting',
      joined_at: new Date().toISOString(),
      travel_minutes,
      travel_mode,
      origin_area: origin_area || null,
      predicted_wait_min_at_join: Math.max(5, baselineWait),
      notified_at: null,
      seated_at: null,
      cancelled_at: null,
      channel: 'web',
      consent_at: new Date().toISOString(),
      link_token: linkToken,
    });

    return NextResponse.json({
      ok: true,
      link_token: linkToken,
      redirect_url: `/r/${restaurant.slug}/e/${linkToken}`,
      entry: createdEntry,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Token não fornecido' },
      { status: 400 },
    );
  }

  const entry = await getQueueEntryByToken(token);
  if (!entry) {
    return NextResponse.json(
      { ok: false, error: 'Entrada na fila não encontrada' },
      { status: 404 },
    );
  }

  const activeEntries = await getActiveQueueEntries(entry.restaurant_id);
  const queueStats = calculateQueuePosition(activeEntries, entry.id);

  return NextResponse.json({
    ok: true,
    entry,
    position: queueStats.position,
    groupsAhead: queueStats.groupsAhead,
    totalInQueue: queueStats.totalInQueue,
  });
}
