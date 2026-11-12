import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateQueueEntryStatus } from '@/lib/queue/store';
import { QueueStatus } from '@/types/database';

const updateStatusSchema = z.object({
  status: z.enum([
    'waiting',
    'notified',
    'on_the_way',
    'seated',
    'no_show',
    'cancelled',
    'postponed',
  ]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json();
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Status inválido' },
        { status: 400 },
      );
    }

    const updated = await updateQueueEntryStatus(
      params.id,
      parsed.data.status as QueueStatus,
    );

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: 'Entrada não encontrada' },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, entry: updated });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
