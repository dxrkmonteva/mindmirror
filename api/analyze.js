export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { selfAnswers, friendAnswers, questions } = req.body;

  const prompt = `Ты психолог-аналитик. Проанализируй разрыв между самооценкой человека и тем как его видят друзья.

ВОПРОСЫ И ОТВЕТЫ САМОГО ЧЕЛОВЕКА:
${questions.map((q, i) => `${i+1}. ${q}\nОтвет: ${selfAnswers[i] || 'нет ответа'}`).join('\n')}

ОТВЕТЫ ДРУЗЕЙ (анонимно, ${friendAnswers.length} человек):
${friendAnswers.map((fa, fi) => `Друг ${fi+1}:\n${questions.map((q, i) => `  ${i+1}. ${q}\n  Ответ: ${fa[i] || 'нет ответа'}`).join('\n')}`).join('\n\n')}

Напиши анализ в формате JSON (только JSON, без лишнего текста):
{
  "overallMatch": число от 0 до 100 (насколько совпадает самооценка с мнением друзей),
  "topInsights": [
    {
      "title": "короткое название инсайта",
      "self": "как человек видит себя",
      "friends": "как видят друзья",
      "insight": "психологический анализ 2-3 предложения",
      "isGap": true или false (true если есть значимое расхождение)
    }
  ],
  "strengths": ["сильная сторона 1", "сильная сторона 2", "сильная сторона 3"],
  "blindSpots": ["слепое пятно 1", "слепое пятно 2"],
  "advice": "персональный совет 2-3 предложения на основе анализа",
  "summary": "общее резюме 2-3 предложения"
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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

    const data = await response.json();
    const text = data.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const analysis = JSON.parse(jsonMatch[0]);
    res.status(200).json(analysis);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
  }
