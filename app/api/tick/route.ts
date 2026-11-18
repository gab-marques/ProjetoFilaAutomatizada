import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import {
  getActiveQueueEntries,
  getRestaurantBySlug,
  updateQueueEntryStatus,
} from '@/lib/queue/store';
import { calculateQueuePosition, estimateBaselineWait } from '@/lib/queue/position';
import { getContactByEntryId, purgeExpiredContacts } from '@/lib/queue/contacts';
import { sendTelegramMessage } from '@/lib/channels/telegram';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-tick-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== env.TICK_SECRET) {
    return NextResponse.json({ ok: false, error: 'Acesso não autorizado' }, { status: 401 });
  }

  try {
    const restaurant = await getRestaurantBySlug('cantina-demo');
    if (!restaurant) {
      return NextResponse.json({ ok: false, error: 'Restaurante padrão não encontrado' }, { status: 404 });
    }

    const notifyMarginMin = restaurant.notify_margin_min || env.DEFAULT_NOTIFY_MARGIN_MIN || 5;
    const activeEntries = await getActiveQueueEntries(restaurant.id);

    let notifiedCount = 0;
    const now = new Date();

    for (const entry of activeEntries) {
      if (entry.status !== 'waiting') continue;

      // Calculate queue position and remaining wait
      const { groupsAhead } = calculateQueuePosition(activeEntries, entry.id);
      const remainingWait = estimateBaselineWait(groupsAhead, 6);

      // Notification Condition: (remainingWait - travel_minutes <= notifyMarginMin)
      const shouldNotify = remainingWait - entry.travel_minutes <= notifyMarginMin;

      if (shouldNotify && !entry.notified_at) {
        // Atomic status transition
        await updateQueueEntryStatus(entry.id, 'notified', {
          notified_at: now.toISOString(),
        });
        notifiedCount++;

        // Send Telegram notification if contact is connected
        const contact = await getContactByEntryId(entry.id);
        if (contact) {
          await sendTelegramMessage({
            chatId: contact.telegram_chat_id,
            text: `🚗 <b>Saia agora!</b> Olá <b>${entry.display_name}</b>, sua mesa na <b>${restaurant.name}</b> deve liberar em ~${Math.max(
              1,
              remainingWait,
            )} min e seu trajeto leva ~${entry.travel_minutes} min.\n\nVenha agora para garantir sua mesa!`,
            keyboard: [
              [
                { text: '🚗 Já estou a caminho', callback_data: `action:on_the_way:${entry.id}` },
              ],
              [
                { text: '⏳ Me passa pra depois', callback_data: `action:postpone:${entry.id}` },
                { text: '❌ Desistir', callback_data: `action:cancel:${entry.id}` },
              ],
            ],
          });
        }
      }
    }

    // Purge expired contacts for LGPD compliance (> 24 hours)
    const purgedContacts = await purgeExpiredContacts();

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      evaluated: activeEntries.length,
      notified: notifiedCount,
      purged_contacts: purgedContacts,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
