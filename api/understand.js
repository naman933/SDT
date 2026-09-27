// POST /api/understand  { text }  ->  sanitized extraction (facts only — never schemes or advice)
import { send, readJson, guard } from './_lib/http.js';
import { EXTRACTION_PROMPT, sanitizeExtraction } from '../src/engine/understand.js';

const MAX_CHARS = 2000;

async function callGroq(model, text) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: EXTRACTION_PROMPT }, { role: 'user', content: text }],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  const d = await r.json();
  return JSON.parse(d.choices[0].message.content);
}

export default async function handler(req, res) {
  if (!guard(req, res, 'POST')) return;
  try {
    const { text } = await readJson(req);
    if (typeof text !== 'string' || !text.trim()) return send(res, 400, { error: 'Missing text' });
    const input = text.trim().slice(0, MAX_CHARS);
    const primary = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const fallback = process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b';
    let raw;
    try { raw = await callGroq(primary, input); } catch { raw = await callGroq(fallback, input); }
    send(res, 200, sanitizeExtraction(raw));
  } catch (e) {
    console.error('understand failed:', e.message);
    send(res, e.status || 502, { error: 'Could not understand the text right now.' });
  }
}
