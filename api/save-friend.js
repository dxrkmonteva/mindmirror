export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sessionId, answers } = req.body;
  const SUPABASE_URL = `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co`;
  const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/friend_answers`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: sessionId,
        answers: answers,
        created_at: new Date().toISOString()
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: err });
    }

    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
