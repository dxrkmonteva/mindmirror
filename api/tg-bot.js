export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const BOT_TOKEN = process.env.TG_BOT_TOKEN;
  const SUPABASE_URL = `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co`;
  const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

  async function sendMessage(chatId, text, keyboard) {
    const body = { chat_id: chatId, text, parse_mode: 'HTML' };
    if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
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

  if (req.method === 'GET') {
    const setupUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=https://mindmirror2.vercel.app/api/tg-bot`;
    const r = await fetch(setupUrl);
    const d = await r.json();
    return res.status(200).json({ setup: d });
  }

  if (req.method === 'POST') {
    const update = req.body;
    const msg = update.message;
    if (!msg) return res.status(200).end();

    const chatId = msg.chat.id;
    const text = msg.text || '';
    const username = msg.from.username ? '@' + msg.from.username : null;
    const firstName = msg.from.first_name || 'друг';

    if (text === '/start') {
      if (username) await saveChatId(username, chatId);
      await sendMessage(chatId,
        `Привет, ${firstName}! 👋\n\n<b>MindMirror</b> — узнай как тебя видят друзья.\n\nЯ буду уведомлять тебя когда друзья ответят на твой тест и анализ готов.\n\n✅ Твой аккаунт привязан!`,
        [[{ text: '🔍 Пройти тест', url: 'https://mindmirror2.vercel.app' }]]
      );
    } else if (text === '/help') {
      await sendMessage(chatId,
        `<b>Как пользоваться MindMirror:</b>\n\n1. Пройди тест на сайте\n2. Введи свой @username для уведомлений\n3. Отправь ссылку друзьям\n4. Я напишу когда они ответят!\n\n🌐 mindmirror2.vercel.app`,
        [[{ text: '🚀 Начать тест', url: 'https://mindmirror2.vercel.app' }]]
      );
    } else {
      await sendMessage(chatId,
        `Используй /start чтобы привязать аккаунт\nили /help для справки\n\n🌐 mindmirror2.vercel.app`
      );
    }

    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
