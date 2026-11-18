import { env } from '../lib/env';

async function setWebhook() {
  const token = env.TELEGRAM_BOT_TOKEN;
  const secret = env.TELEGRAM_WEBHOOK_SECRET;
  const appUrl = env.APP_BASE_URL || env.NEXT_PUBLIC_APP_URL;

  if (!token || token.includes('mock')) {
    console.log('TELEGRAM_BOT_TOKEN is not configured or mock. Skipping live webhook registration.');
    return;
  }

  const webhookUrl = `${appUrl}/api/telegram/webhook`;
  console.log(`Setting Telegram Webhook to: ${webhookUrl}`);

  const url = `https://api.telegram.org/bot${token}/setWebhook`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  const data = await res.json();
  if (data.ok) {
    console.log('✅ Telegram Webhook registered successfully!');
  } else {
    console.error('❌ Failed to register webhook:', data.description);
  }
}

if (require.main === module) {
  setWebhook().catch(console.error);
}
