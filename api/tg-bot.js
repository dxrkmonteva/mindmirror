export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const BOT_TOKEN = process.env.TG_BOT_TOKEN;
  const SUPABASE_URL = `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co`;
  const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
  const STARS_PRICE = 310;

  async function tgApi(method, body) {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  }

  async function sendMessage(chatId, text, keyboard) {
    const body = { chat_id: chatId, text, parse_mode: 'HTML' };
    if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
    return tgApi('sendMessage', body);
  }

  async function sendInvoice(chatId, sessionId) {
    return tgApi('sendInvoice', {
      chat_id: chatId,
      title: 'Полный психологический портрет',
      description: 'AI анализ — как тебя видят друзья. Все инсайты, сильные стороны и слепые пятна.',
      payload: `analysis_${sessionId}`,
      currency: 'XTR',
      prices: [{ label: 'Полный анализ MindMirror', amount: STARS_PRICE }],
      photo_url: 'https://mindmirror2.vercel.app/og.png',
    });
  }

  async function saveChatId(tgUsername, chatId) {
    await fetch(`${SUPABASE_URL}/rest/v1/sessions?tg_username=eq.${encodeURIComponent(tgUsername)}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tg_chat_id: String(chatId) })
    });
  }

  async function unlockSession(sessionId) {
    await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_paid: true })
    });
  }

  if (req.method === 'GET') {
    const setupUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=https://mindmirror2.vercel.app/api/tg-bot`;
    const r = await fetch(setupUrl);
    const d = await r.json();
    return res.status(200).json({ setup: d });
  }

  if (req.method === 'POST') {
    const update = req.body;

    if (update.pre_checkout_query) {
      await tgApi('answerPreCheckoutQuery', {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true
      });
      return res.status(200).end();
    }

    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const chatId = update.message.chat.id;
      const payload = payment.invoice_payload;
      const sessionId = payload.replace('analysis_', '');

      await unlockSession(sessionId);

      await sendMessage(chatId,
        `🎉 <b>Оплата прошла!</b>\n\nТвой полный анализ разблокирован.\n\nОткрой сайт и нажми "Посмотреть анализ" — теперь всё доступно!`,
        [[{ text: '🔍 Открыть анализ', url: `https://mindmirror2.vercel.app` }]]
      );
      return res.status(200).end();
    }

    const msg = update.message;
    if (!msg) return res.status(200).end();

    const chatId = msg.chat.id;
    const text = msg.text || '';
    const username = msg.from.username ? '@' + msg.from.username : null;
    const firstName = msg.from.first_name || 'друг';

    if (text === '/start') {
      if (username) await saveChatId(username, chatId);
      await sendMessage(chatId,
        `Привет, ${firstName}! 👋\n\n<b>MindMirror</b> — узнай как тебя видят друзья.\n\n✅ Аккаунт привязан! Я уведомлю тебя когда друзья ответят.\n\nПройди тест и отправь ссылку друзьям:`,
        [[{ text: '🚀 Пройти тест', url: 'https://mindmirror2.vercel.app' }]]
      );
    } else if (text.startsWith('/pay')) {
      const sessionId = text.split(' ')[1];
      if (!sessionId) {
        await sendMessage(chatId, 'Пройди тест на сайте сначала — там будет кнопка оплаты.',
          [[{ text: '🚀 На сайт', url: 'https://mindmirror2.vercel.app' }]]
        );
      } else {
        await sendInvoice(chatId, sessionId);
      }
    } else if (text === '/help') {
      await sendMessage(chatId,
        `<b>Как работает MindMirror:</b>\n\n1. Пройди тест на сайте\n2. Отправь ссылку 3+ друзьям\n3. Получи уведомление когда ответят\n4. Купи полный анализ за ${STARS_PRICE} Stars (~$4)\n\n🌐 mindmirror2.vercel.app`,
        [[{ text: '🚀 Начать', url: 'https://mindmirror2.vercel.app' }]]
      );
    } else {
      await sendMessage(chatId,
        `Используй /start чтобы начать\nили /help для справки`,
        [[{ text: '🌐 Открыть MindMirror', url: 'https://mindmirror2.vercel.app' }]]
      );
    }

    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
