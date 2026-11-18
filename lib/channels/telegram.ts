import { env } from '@/lib/env';

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export type InlineKeyboard = InlineKeyboardButton[][];

export interface SendMessageOptions {
  chatId: string | number;
  text: string;
  keyboard?: InlineKeyboard;
  parseMode?: 'HTML' | 'MarkdownV2';
}

export async function sendTelegramMessage(
  options: SendMessageOptions,
  fetchFn = fetch,
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const token = env.TELEGRAM_BOT_TOKEN;

  // Fallback when bot token is a mock in dev/test
  if (!token || token.includes('mock')) {
    return { ok: true, messageId: 999999 };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const body: Record<string, unknown> = {
    chat_id: options.chatId,
    text: options.text,
    parse_mode: options.parseMode || 'HTML',
  };

  if (options.keyboard && options.keyboard.length > 0) {
    body.reply_markup = {
      inline_keyboard: options.keyboard,
    };
  }

  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description || `HTTP ${res.status}` };
    }

    return { ok: true, messageId: data.result?.message_id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  fetchFn = fetch,
): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token || token.includes('mock')) return true;

  try {
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
    return true;
  } catch {
    return false;
  }
}
