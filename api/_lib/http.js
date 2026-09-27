// Minimal helpers that work both on Vercel (Node runtime) and in the Vite dev middleware.
// Files under api/_lib are not exposed as routes (underscore prefix).

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readStream(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

// Vercel may have already parsed the body into req.body; the dev server has not.
export async function readJson(req, limit = 16_000) {
  if (req.body !== undefined && !Buffer.isBuffer(req.body)) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const buf = Buffer.isBuffer(req.body) ? req.body : await readStream(req, limit);
  if (buf.length > limit) throw Object.assign(new Error('Payload too large'), { status: 413 });
  return JSON.parse(buf.toString('utf8') || '{}');
}

export async function readRaw(req, limit) {
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > limit) throw Object.assign(new Error('Payload too large'), { status: 413 });
    return req.body;
  }
  return readStream(req, limit);
}

// Best-effort per-instance rate limit. For real abuse protection use Vercel Firewall rules
// and a spend limit on the Groq account.
const hits = new Map();
export function rateLimited(req, max = 20, windowMs = 60_000) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0].trim();
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}

// Reject cross-site calls so other websites can't spend our Groq quota from their visitors' browsers.
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin GETs and server-to-server calls omit it
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  try {
    const o = new URL(origin);
    return o.host === req.headers.host || allowed.includes(o.origin);
  } catch {
    return false;
  }
}

export function guard(req, res, method) {
  if (req.method !== method) { send(res, 405, { error: 'Method not allowed' }); return false; }
  if (!sameOrigin(req)) { send(res, 403, { error: 'Forbidden' }); return false; }
  if (rateLimited(req)) { send(res, 429, { error: 'Too many requests — please wait a minute.' }); return false; }
  if (!process.env.GROQ_API_KEY) { send(res, 503, { error: 'AI is not configured on this deployment.' }); return false; }
  return true;
}
