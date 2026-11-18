// Vercel serverless function: POST /api/ai  { "prompt": "..." }  ->  parsed JSON from Claude
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const hits = new Map(); // tiny per-instance rate limit (20 requests / 10 min / IP)

function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const arr = (hits.get(ip) || []).filter(t => now - t < win);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 20;
}

function extractJSON(text) {
  const t = String(text || '').replace(/```json|```/gi, '').trim();
  try { return JSON.parse(t); } catch (_) {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
  throw new Error('The AI did not return valid JSON');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY. Add it in Vercel > Settings > Environment Variables, then redeploy.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  const prompt = body && body.prompt;
  if (typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'Missing prompt' });
  if (prompt.length > 60000) return res.status(413).json({ error: 'Text is too long. Try a shorter one.' });

  const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ error: 'Too many requests. Please wait a few minutes.' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: 'You reply with a single valid JSON object only. No markdown, no code fences, no commentary.',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || 'Anthropic API error';
      return res.status(r.status === 401 ? 500 : 502).json({ error: r.status === 401 ? 'The API key is invalid. Check ANTHROPIC_API_KEY.' : msg });
    }
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    return res.status(200).json(extractJSON(text));
  } catch (e) {
    return res.status(502).json({ error: e.message || 'AI request failed' });
  }
};
