export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sessionId, selfAnswers, questions } = req.body;
  const SUPABASE_URL = `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co`;
  const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

  try {
    const [friendRes, sessionRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/friend_answers?session_id=eq.${sessionId}&select=answers`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      }),
      fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}&select=is_paid`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      })
    ]);

    const friendRows = await friendRes.json();
    const sessionRows = await sessionRes.json();
    const friendAnswers = friendRows.map(r => r.answers);
    const isPaid = sessionRows[0]?.is_paid || false;

    if (friendAnswers.length === 0) {
      return res.status(200).json({ friendCount: 0, isPaid, analysis: null });
    }

    if (!isPaid) {
      return res.status(200).json({ friendCount: friendAnswers.length, isPaid: false, analysis: null });
    }

    const prompt = `Ты психолог-аналитик. Проанализируй разрыв между самооценкой человека и тем как его видят друзья.

ВОПРОСЫ И ОТВЕТЫ САМОГО ЧЕЛОВЕКА:
${questions.map((q, i) => `${i+1}. ${q}\nОтвет: ${selfAnswers[i] || 'нет ответа'}`).join('\n')}

ОТВЕТЫ ДРУЗЕЙ (анонимно, ${friendAnswers.length} человек):
${friendAnswers.map((fa, fi) => `Друг ${fi+1}:\n${questions.map((q, i) => `  ${i+1}. ${q}\n  Ответ: ${fa[i] || 'нет ответа'}`).join('\n')}`).join('\n\n')}

Напиши анализ в формате JSON (только JSON, без лишнего текста):
{
  "overallMatch": число от 0 до 100,
  "topInsights": [
    {
      "title": "короткое название",
      "self": "как человек видит себя",
      "friends": "как видят друзья",
      "insight": "психологический анализ 2-3 предложения",
      "isGap": true или false
    }
  ],
  "strengths": ["сильная сторона 1", "сильная сторона 2", "сильная сторона 3"],
  "blindSpots": ["слепое пятно 1", "слепое пятно 2"],
  "advice": "персональный совет 2-3 предложения",
  "summary": "общее резюме 2-3 предложения"
}`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    const groqData = await groqRes.json();
    const text = groqData.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const analysis = JSON.parse(jsonMatch[0]);

    res.status(200).json({ friendCount: friendAnswers.length, isPaid: true, analysis });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
