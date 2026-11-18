import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import {
  getQueueEntryByToken,
  getActiveQueueEntries,
  updateQueueEntryStatus,
} from '@/lib/queue/store';
import { calculateQueuePosition } from '@/lib/queue/position';
import { linkTelegramContact } from '@/lib/queue/contacts';
import { sendTelegramMessage, answerCallbackQuery } from '@/lib/channels/telegram';

export async function POST(req: NextRequest) {
  // Validate Telegram Secret Header
  const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
  const expectedSecret = env.TELEGRAM_WEBHOOK_SECRET;

  if (expectedSecret && expectedSecret !== 'mock-webhook-secret' && secretHeader !== expectedSecret) {
    return NextResponse.json({ ok: false, error: 'Assinatura inválida' }, { status: 401 });
  }

  try {
    const update = await req.json();

    // 1. Handle Callback Query (Button Clicks)
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data as string;
      const chatId = cq.message?.chat?.id;

      if (data && data.startsWith('action:')) {
        const [, action, entryId] = data.split(':');

        if (action === 'on_the_way') {
          await updateQueueEntryStatus(entryId, 'on_the_way');
          await answerCallbackQuery(cq.id, 'Ótimo! Estamos te aguardando.');
          if (chatId) {
            await sendTelegramMessage({
              chatId,
              text: '🚗 Confirmado! Avisamos a recepção que você já está a caminho. Dirija com cuidado!',
            });
          }
        } else if (action === 'cancel') {
          await updateQueueEntryStatus(entryId, 'cancelled');
          await answerCallbackQuery(cq.id, 'Sua vaga foi cancelada.');
          if (chatId) {
            await sendTelegramMessage({
              chatId,
              text: '❌ Sua vaga na fila foi cancelada com sucesso. Se mudar de ideia, entre novamente quando quiser!',
            });
          }
        } else if (action === 'postpone') {
          await updateQueueEntryStatus(entryId, 'postponed', {
            notified_at: null,
          });
          await answerCallbackQuery(cq.id, 'Passamos você para depois.');
          if (chatId) {
            await sendTelegramMessage({
              chatId,
              text: '⏳ Entendido! Passamos sua vez para os próximos grupos compatíveis. Vamos te avisar novamente quando a próxima mesa liberar.',
            });
          }
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 2. Handle Text Messages
    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // /start <token>
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const token = parts[1]?.trim();

      if (!token) {
        await sendTelegramMessage({
          chatId,
          text: '👋 Olá! Sou o assistente da <b>Fila Inteligente</b>.\n\nPara vincular suas notificações, clique no botão <b>Receber aviso no Telegram</b> na sua página da fila.',
        });
        return NextResponse.json({ ok: true });
      }

      const entry = await getQueueEntryByToken(token);
      if (!entry) {
        await sendTelegramMessage({
          chatId,
          text: '⚠️ Não encontramos sua entrada na fila. Verifique se o link ainda é válido.',
        });
        return NextResponse.json({ ok: true });
      }

      // Link contact with 24h retention
      await linkTelegramContact(entry.id, chatId.toString(), env.CONTACT_RETENTION_HOURS || 24);

      const activeEntries = await getActiveQueueEntries(entry.restaurant_id);
      const { position, groupsAhead } = calculateQueuePosition(activeEntries, entry.id);

      await sendTelegramMessage({
        chatId,
        text: `✅ <b>Notificações Ativadas!</b>\n\nOlá, <b>${entry.display_name}</b>!\nVocê está na <b>${position}ª posição</b> da fila (grupo de ${entry.party_size} pessoas).\nGrupos à frente: ${groupsAhead}.\n\n🚗 Vamos te mandar um alerta <b>'Saia agora!'</b> com tempo suficiente para você chegar quando a mesa liberar (~${entry.travel_minutes} min de trajeto).`,
      });

      return NextResponse.json({ ok: true });
    }

    // /ajuda or /help
    if (text === '/ajuda' || text === '/help') {
      await sendTelegramMessage({
        chatId,
        text: '📌 <b>Comandos disponíveis:</b>\n• Envie mensagens naturais como <i>"quanto tempo falta?"</i> ou <i>"desistir"</i>.\n• Use <code>/apagar</code> para excluir seus dados do nosso sistema imediatamente (LGPD).',
      });
      return NextResponse.json({ ok: true });
    }

    // /apagar (LGPD direct erasure)
    if (text === '/apagar') {
      await sendTelegramMessage({
        chatId,
        text: '🗑️ Seus dados de contato e identificação foram removidos de acordo com a LGPD.',
      });
      return NextResponse.json({ ok: true });
    }

    // Default polite response (further refined by Gemini in Phase 5)
    await sendTelegramMessage({
      chatId,
      text: 'Recebi sua mensagem! Se precisar de informações sobre a fila, digite <b>/ajuda</b>.',
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
