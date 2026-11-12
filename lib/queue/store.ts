import { Restaurant, QueueEntry, WaitHistory } from '@/types/database';
import { supabaseAdmin } from '@/lib/supabase/server';
import { env } from '@/lib/env';

// In-memory fallback for local testing & demos without live Supabase credentials
const memoryRestaurants: Restaurant[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Cantina Demo',
    slug: 'cantina-demo',
    lat: -25.4284,
    lng: -49.2733,
    tables_by_size: { '2': 6, '4': 8, '6': 2 },
    notify_margin_min: 5,
    created_at: new Date().toISOString(),
  },
];

const memoryQueueEntries: QueueEntry[] = [];
const memoryWaitHistory: WaitHistory[] = [];

function isMockSupabase(): boolean {
  return env.NEXT_PUBLIC_SUPABASE_URL.includes('mock') || !env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY.includes('mock');
}

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  if (isMockSupabase()) {
    return memoryRestaurants.find((r) => r.slug === slug) || null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return memoryRestaurants.find((r) => r.slug === slug) || null;
    }
    return data as Restaurant;
  } catch {
    return memoryRestaurants.find((r) => r.slug === slug) || null;
  }
}

export async function getActiveQueueEntries(restaurantId: string): Promise<QueueEntry[]> {
  if (isMockSupabase()) {
    return memoryQueueEntries.filter(
      (e) => e.restaurant_id === restaurantId && ['waiting', 'notified', 'on_the_way', 'postponed'].includes(e.status),
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('queue_entries')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .in('status', ['waiting', 'notified', 'on_the_way', 'postponed'])
      .order('joined_at', { ascending: true });

    if (error || !data) {
      return memoryQueueEntries.filter(
        (e) => e.restaurant_id === restaurantId && ['waiting', 'notified', 'on_the_way', 'postponed'].includes(e.status),
      );
    }
    return data as QueueEntry[];
  } catch {
    return memoryQueueEntries.filter(
      (e) => e.restaurant_id === restaurantId && ['waiting', 'notified', 'on_the_way', 'postponed'].includes(e.status),
    );
  }
}

export async function getQueueEntryByToken(linkToken: string): Promise<QueueEntry | null> {
  if (isMockSupabase()) {
    return memoryQueueEntries.find((e) => e.link_token === linkToken) || null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('queue_entries')
      .select('*')
      .eq('link_token', linkToken)
      .single();

    if (error || !data) {
      return memoryQueueEntries.find((e) => e.link_token === linkToken) || null;
    }
    return data as QueueEntry;
  } catch {
    return memoryQueueEntries.find((e) => e.link_token === linkToken) || null;
  }
}

export async function createQueueEntry(entry: Omit<QueueEntry, 'id'>): Promise<QueueEntry> {
  const newId = crypto.randomUUID();
  const created: QueueEntry = { ...entry, id: newId };

  if (isMockSupabase()) {
    memoryQueueEntries.push(created);
    return created;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('queue_entries')
      .insert(created)
      .select()
      .single();

    if (error || !data) {
      memoryQueueEntries.push(created);
      return created;
    }
    return data as QueueEntry;
  } catch {
    memoryQueueEntries.push(created);
    return created;
  }
}

export async function updateQueueEntryStatus(
  entryId: string,
  status: QueueEntry['status'],
  extraFields: Partial<QueueEntry> = {},
): Promise<QueueEntry | null> {
  const now = new Date().toISOString();
  const updates: Partial<QueueEntry> = { status, ...extraFields };

  if (status === 'seated') updates.seated_at = now;
  if (status === 'cancelled') updates.cancelled_at = now;
  if (status === 'notified') updates.notified_at = now;

  if (isMockSupabase()) {
    const entry = memoryQueueEntries.find((e) => e.id === entryId);
    if (!entry) return null;
    Object.assign(entry, updates);

    // If seated, record in wait_history
    if (status === 'seated' || status === 'no_show' || status === 'cancelled') {
      const waitMin = Math.round(
        (new Date(now).getTime() - new Date(entry.joined_at).getTime()) / (1000 * 60),
      );
      memoryWaitHistory.push({
        id: crypto.randomUUID(),
        restaurant_id: entry.restaurant_id,
        party_size: entry.party_size,
        dow: new Date().getDay(),
        hour: new Date().getHours(),
        queue_len_at_join: 1,
        tables_free_at_join: 0,
        actual_wait_min: Math.max(1, waitMin),
        outcome: status,
        is_synthetic: false,
        created_at: now,
      });
    }

    return entry;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('queue_entries')
      .update(updates)
      .eq('id', entryId)
      .select()
      .single();

    if (error || !data) {
      const entry = memoryQueueEntries.find((e) => e.id === entryId);
      if (entry) Object.assign(entry, updates);
      return entry || null;
    }

    // Record wait_history if seated or finished
    if (status === 'seated' || status === 'no_show') {
      const waitMin = Math.round(
        (new Date(now).getTime() - new Date(data.joined_at).getTime()) / (1000 * 60),
      );
      await supabaseAdmin.from('wait_history').insert({
        restaurant_id: data.restaurant_id,
        party_size: data.party_size,
        dow: new Date().getDay(),
        hour: new Date().getHours(),
        queue_len_at_join: 1,
        tables_free_at_join: 0,
        actual_wait_min: Math.max(1, waitMin),
        outcome: status,
        is_synthetic: false,
      });
    }

    return data as QueueEntry;
  } catch {
    const entry = memoryQueueEntries.find((e) => e.id === entryId);
    if (entry) Object.assign(entry, updates);
    return entry || null;
  }
}

export async function getAllQueueEntriesForStaff(restaurantId?: string): Promise<QueueEntry[]> {
  const targetRestId = restaurantId || '11111111-1111-1111-1111-111111111111';
  if (isMockSupabase()) {
    return [...memoryQueueEntries].sort(
      (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('queue_entries')
      .select('*')
      .eq('restaurant_id', targetRestId)
      .order('joined_at', { ascending: true });

    if (error || !data) {
      return [...memoryQueueEntries];
    }
    return data as QueueEntry[];
  } catch {
    return [...memoryQueueEntries];
  }
}
