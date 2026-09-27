// POST /api/transcribe  (raw audio body, Content-Type: application/octet-stream, X-Audio-Type: audio/webm)
// -> { text }. Audio is forwarded to Groq Whisper and not stored.
import { send, readRaw, guard } from './_lib/http.js';

const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB request bodies

export default async function handler(req, res) {
  if (!guard(req, res, 'POST')) return;
  try {
    const audio = await readRaw(req, MAX_BYTES);
    if (!audio.length) return send(res, 400, { error: 'No audio received' });
    const type = /^audio\/[\w.+-]+(;.*)?$/.test(req.headers['x-audio-type'] || '') ? req.headers['x-audio-type'] : 'audio/webm';
    const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm';
    const fd = new FormData();
    fd.append('file', new Blob([audio], { type }), `speech.${ext}`);
    fd.append('model', process.env.GROQ_SPEECH_MODEL || 'whisper-large-v3');
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: fd,
      signal: AbortSignal.timeout(30_000),
    });
    const d = await r.json();
    if (!r.ok || typeof d.text !== 'string') throw new Error(d.error?.message || `Groq ${r.status}`);
    send(res, 200, { text: d.text.slice(0, 2000) });
  } catch (e) {
    console.error('transcribe failed:', e.message);
    send(res, e.status || 502, { error: 'Could not transcribe the audio.' });
  }
}
