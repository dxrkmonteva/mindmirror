export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sessionId, answers, friendName } = req.body;

  console.log(`Friend answered for session: ${sessionId}, answers count: ${answers?.length}`);

  res.status(200).json({ success: true, message: 'Answers saved' });
}
