export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const BOT_TOKEN = process.env.TG_BOT_TOKEN;
  const SUPABASE_URL = `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co`;
  const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

  const { sessionId } = req.body;

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}&select=tg_chat_id,user_name`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    const rows = await r.json();
    const session = rows[0];

    if (!session || !session.tg_chat_id) {
      return res.status(200).json({ sent: false, reason: 'No chat_id' });
    }

    const name = session.user_name || 'друг';
    const fr = await fetch(
      `${SUPABASE_URL}/rest/v1/friend_answers?session_id=eq.${sessionId}&select=id`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    const friends = await fr.json();
    const count = friends.length;

    const text = count >= 3
      ? `🎉 <b>${name}, твой анализ готов!</b>\n\n<b>${count} друзей</b> ответили о тебе.\n\nAI построил твой психологический портрет — иди смотреть!`
      : `👥 <b>${name}, новый ответ!</b>\n\nУже <b>${count} из 3</b> друзей ответили.\n\n${count < 3 ? 'Отправь ссылку ещё друзьям для точного анализа.' : ''}`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: session.tg_chat_id,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔍 Посмотреть анализ', url: `https://mindmirror2.vercel.app` }
          ]]
        }
      })
    });

    res.status(200).json({ sent: true, count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
