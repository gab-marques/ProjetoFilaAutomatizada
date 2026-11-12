import { NextResponse } from 'next/server';
import { getAllQueueEntriesForStaff } from '@/lib/queue/store';

export async function GET() {
  try {
    const entries = await getAllQueueEntriesForStaff();
    return NextResponse.json({ ok: true, entries });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
