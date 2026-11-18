import { Contact } from '@/types/database';
import { supabaseAdmin } from '@/lib/supabase/server';
import { env } from '@/lib/env';

// In-memory fallback for contacts in dev/test
const memoryContacts: Contact[] = [];

function isMock(): boolean {
  return (
    env.NEXT_PUBLIC_SUPABASE_URL.includes('mock') ||
    env.SUPABASE_SERVICE_ROLE_KEY.includes('mock')
  );
}

export async function linkTelegramContact(
  queueEntryId: string,
  telegramChatId: string,
  retentionHours = 24,
): Promise<Contact> {
  const purgeAfter = new Date(Date.now() + retentionHours * 3600 * 1000).toISOString();
  const contact: Contact = {
    id: crypto.randomUUID(),
    queue_entry_id: queueEntryId,
    telegram_chat_id: telegramChatId.toString(),
    purge_after: purgeAfter,
  };

  if (isMock()) {
    // Remove existing contact for this entry if present
    const existingIdx = memoryContacts.findIndex(
      (c) => c.queue_entry_id === queueEntryId || c.telegram_chat_id === telegramChatId,
    );
    if (existingIdx >= 0) memoryContacts.splice(existingIdx, 1);
    memoryContacts.push(contact);
    return contact;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert(contact)
      .select()
      .single();

    if (error || !data) {
      memoryContacts.push(contact);
      return contact;
    }
    return data as Contact;
  } catch {
    memoryContacts.push(contact);
    return contact;
  }
}

export async function getContactByEntryId(queueEntryId: string): Promise<Contact | null> {
  if (isMock()) {
    return memoryContacts.find((c) => c.queue_entry_id === queueEntryId) || null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('queue_entry_id', queueEntryId)
      .single();

    if (error || !data) {
      return memoryContacts.find((c) => c.queue_entry_id === queueEntryId) || null;
    }
    return data as Contact;
  } catch {
    return memoryContacts.find((c) => c.queue_entry_id === queueEntryId) || null;
  }
}

export async function getActiveEntryByChatId(telegramChatId: string) {
  if (isMock()) {
    return memoryContacts.find((c) => c.telegram_chat_id === telegramChatId.toString()) || null;
  }

  try {
    const { data } = await supabaseAdmin
      .from('contacts')
      .select('*, queue_entries(*)')
      .eq('telegram_chat_id', telegramChatId.toString())
      .order('purge_after', { ascending: false })
      .limit(1)
      .single();

    return data || null;
  } catch {
    return memoryContacts.find((c) => c.telegram_chat_id === telegramChatId.toString()) || null;
  }
}

export async function purgeExpiredContacts(now = new Date().toISOString()): Promise<number> {
  let purgedCount = 0;

  // Always purge in-memory
  const beforeLen = memoryContacts.length;
  for (let i = memoryContacts.length - 1; i >= 0; i--) {
    if (new Date(memoryContacts[i].purge_after).getTime() <= new Date(now).getTime()) {
      memoryContacts.splice(i, 1);
      purgedCount++;
    }
  }

  if (!isMock()) {
    try {
      const { count } = await supabaseAdmin
        .from('contacts')
        .delete({ count: 'exact' })
        .lte('purge_after', now);

      if (count !== null && count !== undefined) {
        return Math.max(purgedCount, count);
      }
    } catch {
      // Fallback count
    }
  }

  return beforeLen - memoryContacts.length;
}

export function clearMemoryContacts() {
  memoryContacts.length = 0;
}
