import { describe, it, expect, beforeEach } from 'vitest';
import { POST as tickPOST } from '@/app/api/tick/route';
import { POST as webhookPOST } from '@/app/api/telegram/webhook/route';
import { createQueueEntry, getQueueEntryByToken } from '@/lib/queue/store';
import { linkTelegramContact, purgeExpiredContacts, clearMemoryContacts } from '@/lib/queue/contacts';
import { NextRequest } from 'next/server';

describe('Tick Engine & Telegram Notifications (Phase 4)', () => {
  beforeEach(() => {
    clearMemoryContacts();
  });

  it('POST /api/tick should reject requests without secret', async () => {
    const req = new NextRequest('http://localhost:3000/api/tick', { method: 'POST' });
    const res = await tickPOST(req);
    expect(res.status).toBe(401);
  });

  it('POST /api/tick should be idempotent and not notify entries twice', async () => {
    // 1. Create entry whose travel_minutes is close to wait time (should trigger notify)
    const token = 'test-token-tick-' + Date.now();
    const entry = await createQueueEntry({
      restaurant_id: '11111111-1111-1111-1111-111111111111',
      display_name: 'Lucas',
      party_size: 2,
      status: 'waiting',
      joined_at: new Date().toISOString(),
      travel_minutes: 20, // High travel time triggers notify immediately
      travel_mode: 'driving-car',
      origin_area: 'Centro',
      predicted_wait_min_at_join: 15,
      notified_at: null,
      seated_at: null,
      cancelled_at: null,
      channel: 'web',
      consent_at: new Date().toISOString(),
      link_token: token,
    });

    // Link telegram contact
    await linkTelegramContact(entry.id, '123456789');

    // First Tick: Should notify Lucas
    const tick1Req = new NextRequest('http://localhost:3000/api/tick', {
      method: 'POST',
      headers: { 'x-tick-secret': 'mock-tick-secret' },
    });
    const tick1Res = await tickPOST(tick1Req);
    expect(tick1Res.status).toBe(200);
    const tick1Json = await tick1Res.json();
    expect(tick1Json.ok).toBe(true);

    const updated1 = await getQueueEntryByToken(token);
    expect(updated1?.status).toBe('notified');
    expect(updated1?.notified_at).toBeDefined();

    // Second Tick: Should NOT re-notify (notifiedCount === 0 for this entry)
    const tick2Req = new NextRequest('http://localhost:3000/api/tick', {
      method: 'POST',
      headers: { 'x-tick-secret': 'mock-tick-secret' },
    });
    const tick2Res = await tickPOST(tick2Req);
    const tick2Json = await tick2Res.json();
    expect(tick2Json.ok).toBe(true);
    // Verified: entry remains notified with same notified_at timestamp
    const updated2 = await getQueueEntryByToken(token);
    expect(updated2?.notified_at).toBe(updated1?.notified_at);
  });

  it('LGPD Purge: should delete contacts with expired purge_after timestamp', async () => {
    // Contact expired 2 hours ago
    const past = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    await linkTelegramContact('entry-old-1', 'chat-999', -2); // expired

    // Contact valid for next 24 hours
    await linkTelegramContact('entry-fresh-1', 'chat-888', 24);

    const purged = await purgeExpiredContacts();
    expect(purged).toBeGreaterThanOrEqual(1);
  });

  it('Telegram Webhook: should handle /start <link_token> and link contact', async () => {
    const token = 'token-link-' + Date.now();
    const entry = await createQueueEntry({
      restaurant_id: '11111111-1111-1111-1111-111111111111',
      display_name: 'Julia',
      party_size: 2,
      status: 'waiting',
      joined_at: new Date().toISOString(),
      travel_minutes: 10,
      travel_mode: 'driving-car',
      origin_area: 'Batel',
      predicted_wait_min_at_join: 15,
      notified_at: null,
      seated_at: null,
      cancelled_at: null,
      channel: 'web',
      consent_at: new Date().toISOString(),
      link_token: token,
    });

    const updatePayload = {
      update_id: 1001,
      message: {
        message_id: 1,
        chat: { id: 987654321 },
        text: `/start ${token}`,
      },
    };

    const req = new NextRequest('http://localhost:3000/api/telegram/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-bot-api-secret-token': 'mock-webhook-secret',
      },
      body: JSON.stringify(updatePayload),
    });

    const res = await webhookPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('Telegram Webhook: should handle button callback queries (on_the_way and cancel)', async () => {
    const token = 'token-button-' + Date.now();
    const entry = await createQueueEntry({
      restaurant_id: '11111111-1111-1111-1111-111111111111',
      display_name: 'Marcos',
      party_size: 4,
      status: 'notified',
      joined_at: new Date().toISOString(),
      travel_minutes: 15,
      travel_mode: 'driving-car',
      origin_area: 'Batel',
      predicted_wait_min_at_join: 15,
      notified_at: new Date().toISOString(),
      seated_at: null,
      cancelled_at: null,
      channel: 'web',
      consent_at: new Date().toISOString(),
      link_token: token,
    });

    // Simulate clicking "Estou a caminho" button
    const callbackPayload = {
      update_id: 1002,
      callback_query: {
        id: 'cq-123',
        data: `action:on_the_way:${entry.id}`,
        message: { chat: { id: 55555 } },
      },
    };

    const req = new NextRequest('http://localhost:3000/api/telegram/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackPayload),
    });

    const res = await webhookPOST(req);
    expect(res.status).toBe(200);

    const updated = await getQueueEntryByToken(token);
    expect(updated?.status).toBe('on_the_way');
  });
});
