// GET /api/health -> { ai: boolean }. Tells the UI whether AI understanding is available (never exposes the key).
import { send } from './_lib/http.js';

export default function handler(req, res) {
  send(res, 200, { ai: Boolean(process.env.GROQ_API_KEY) });
}
