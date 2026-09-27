// Client for the serverless API. Every call degrades gracefully to rule-based mode.

export async function health() {
  try {
    const r = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return { ai: false };
    return await r.json();
  } catch {
    return { ai: false };
  }
}

export async function understand(text, lang = 'en') {
  const r = await fetch('/api/understand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
  return r.json();
}

export async function transcribe(blob) {
  const r = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-Audio-Type': blob.type || 'audio/webm' },
    body: blob,
    signal: AbortSignal.timeout(35000),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || typeof d.text !== 'string') throw new Error(d.error || `HTTP ${r.status}`);
  return d.text;
}
