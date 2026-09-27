// Turning an owner's words into facts.
// - ruleUnderstand: offline fallback (regex).
// - sanitizeExtraction: validates AI output against fixed enums (used server-side).
// - factsFromExtraction: maps sanitized output to facts with origins (client-side).
import { L, CR, NEEDS, ENUMS } from './core.js';

const CITY = {
  mumbai: 'Maharashtra', pune: 'Maharashtra', nagpur: 'Maharashtra', nashik: 'Maharashtra', thane: 'Maharashtra', kolhapur: 'Maharashtra',
  bengaluru: 'Karnataka', bangalore: 'Karnataka', mysuru: 'Karnataka', delhi: 'Delhi', chennai: 'Tamil Nadu', coimbatore: 'Tamil Nadu',
  hyderabad: 'Telangana', ahmedabad: 'Gujarat', surat: 'Gujarat', rajkot: 'Gujarat', kolkata: 'West Bengal', jaipur: 'Rajasthan',
  lucknow: 'Uttar Pradesh', kanpur: 'Uttar Pradesh', indore: 'Madhya Pradesh', bhopal: 'Madhya Pradesh', ludhiana: 'Punjab',
  patna: 'Bihar', bhubaneswar: 'Odisha', guwahati: 'Assam', kochi: 'Kerala',
};
const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh'];

// Largest amount mentioned, ignoring figures described as sales/turnover/revenue.
export function parseAmount(text) {
  const t = String(text).toLowerCase().replace(/,/g, '');
  const rx = /(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(crore|cr\b|lakhs?|lac|l\b|thousand|k\b)?/g;
  let best = null, m;
  while ((m = rx.exec(t))) {
    const after = t.slice(rx.lastIndex, rx.lastIndex + 25);
    if (/^\s*(annual|yearly)?\s*(sales|turnover|revenue)/.test(after)) continue;
    let n = parseFloat(m[1]);
    const u = m[2] || '';
    if (/^cr/.test(u)) n *= CR;
    else if (/^la|^l$/.test(u)) n *= L;
    else if (/^th|^k$/.test(u)) n *= 1e3;
    else if (n < 1000) continue; // bare small numbers are usually years/days, not money
    if (!best || n > best) best = n;
  }
  return best;
}

export function sectorFromActivity(a) {
  a = (a || '').toLowerCase();
  if (/dairy|milk|cattle/.test(a)) return 'dairy';
  if (/shop|retail|kirana|trad|wholesale|store|distribut/.test(a)) return 'trading';
  if (/manufactur|factory|fabricat|parts|plant/.test(a)) return 'manufacturing';
  if (/farm|crop|agri/.test(a)) return 'agri_crop';
  return a ? 'services' : null;
}

const NEED_RX = {
  receivables: /not paid|hasn'?t paid|hasnt paid|haven'?t (been )?paid|unpaid|pending payment|payment (is )?(stuck|pending|delayed|due)|owes me|outstanding|receivable|udhaar/,
  startup: /\b(start|starting|set ?up|launch|open(ing)? a|new business|shuru)\b/,
  equipment: /machine|machinery|equipment|\btools?\b|oven|vehicle|\bvan\b|truck|computer|chiller|chilling|printer|loom/,
  expansion: /expand|expansion|\bgrow|scale up|capacity|more orders|second unit|new branch/,
  working_capital: /working capital|\bstock\b|inventory|raw material|wages|salar|\brent\b|day[- ]to[- ]day|festive|running cost/,
  market: /more customers|find customers|sell more|sell online|ondc|marketing|new buyers|\bmarket\b/,
  green: /solar|energy[- ]saving|save energy|clean energy|\bgreen\b|electric vehicle/,
  circular: /recycl|\bwaste\b|scrap|reuse|circular/,
  quality: /certif|quality|\biso\b|\bzed\b/,
  productivity: /productivity|efficien|\blean\b|reduce (cost|waste)/,
  export: /export|abroad|international|overseas/,
  equity: /investor|equity|\bstake\b/,
  training: /training|learn|skill|course/,
  formalisation: /(want|need|how) to register|get registered/,
};

export function ruleUnderstand(text) {
  const t = ' ' + String(text).toLowerCase() + ' ';
  const f = {};
  const set = (k, v, o = 'said') => { if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) f[k] = { v, o }; };

  const needs = Object.keys(NEED_RX).filter((k) => NEED_RX[k].test(t));
  if (needs.includes('receivables')) { const i = needs.indexOf('working_capital'); if (i >= 0) needs.splice(i, 1); }
  const vague = /don'?t know|not sure what|no idea|help me figure/.test(t) && text.length < 120;
  if (!vague && needs.length) set('need', needs);

  set('amount', parseAmount(text));
  const sm = t.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(crore|cr)\s*(annual|yearly)?\s*(sales|turnover|revenue)/);
  if (sm) { const c = parseFloat(sm[1]); set('size', c <= 10 ? 'micro' : c <= 100 ? 'small' : 'medium', 'inferred'); }

  if (/\b(start|starting|set ?up|launch|want to open|planning to open|new business|shuru)\b/.test(t)) set('stage', 'new');
  else if (/\b(i run|we run|i have a|i own|my (shop|business|factory|unit|dairy|store|company|firm)|our (shop|business|factory|unit|company|firm)|we (manufacture|make|produce|sell|supply|are a)|more orders|existing|running|since \d|\d+ years|chalata|chalati)\b/.test(t))
    set('stage', needs.includes('expansion') ? 'expanding' : 'existing', needs.includes('expansion') ? 'said' : 'inferred');

  const ACT = [
    ['dairy', /dairy|milk|doodh|cattle|buffalo|\bcows?\b/], ['retail shop', /\bshop\b|store|kirana|retail|dukaan|dukan/],
    ['wholesale trading', /wholesale|trader|trading|distributor/], ['manufacturing', /manufactur|factory|fabricat|\bparts\b|plant|workshop/],
    ['tailoring', /tailor|stitch|boutique|darzi/], ['services', /salon|repair|restaurant|cafe|transport|logistics|clinic|consult|service/],
  ];
  for (const [a, rx] of ACT) if (rx.test(t)) { set('activity', a); break; }

  for (const [c, s] of Object.entries(CITY)) if (t.includes(c)) { set('city', c[0].toUpperCase() + c.slice(1)); set('state', s, 'inferred'); break; }
  if (!f.state) for (const s of STATES) if (t.includes(s.toLowerCase())) { set('state', s); break; }

  if (/urgent|immediately|this week|asap|jaldi|right away/.test(t)) set('urgency', 'week');
  if (needs.includes('receivables')) {
    if (/government|govt|\bpsu\b|department/.test(t)) set('buyer_type', 'govt_psu');
    else if (/large company|corporate|big company|mnc/.test(t)) set('buyer_type', 'large_company');
    const d = t.match(/(\d+)\s*(days|months)/);
    if (d) set('overdue', +d[1] * (d[2] === 'months' ? 30 : 1) > 45 ? 'over45' : 'under45');
  }
  if (/no udyam|not registered|don'?t have udyam|without udyam|udyam nahi|no registration/.test(t)) set('udyam', 'no');
  else if (/have udyam|udyam regist|udyam certificate/.test(t)) set('udyam', 'yes');
  if (/solar|energy[- ]saving|clean energy/.test(t)) set('green_tech', 'green');
  else if (/recycl|scrap|waste/.test(t)) set('green_tech', 'circular');
  if (/processing|chilling|chiller|paneer|packag|pasteur/.test(t) && /dairy|milk/.test(t)) set('dairy_type', 'processing', 'inferred');
  return f;
}

// ---- AI extraction contract ----
export const EXTRACTION_PROMPT = `You extract facts from an Indian small-business owner's message (any language, incl. Hindi/Marathi/Hinglish). Return ONLY JSON:
{"summary_en": one plain-English sentence restating their situation,
 "need": array of zero or more of ${JSON.stringify(Object.keys(NEEDS))},
 "amount_inr": number|null, "stage": "new"|"existing"|"expanding"|null,
 "activity": what the business does (e.g. "dairy", "auto parts manufacturing", "kirana shop") — NOT the item being bought|null,
 "sector": "manufacturing"|"services"|"trading"|"dairy"|"agri_crop"|null, "city": string|null, "state": Indian state|null,
 "urgency": "week"|"month"|"flexible"|null,
 "buyer_type": (only if a customer owes them money) "govt_psu"|"large_company"|"small_business"|"consumers"|null,
 "overdue": "over45"|"under45"|null, "udyam": "yes"|"no"|null, "green_tech": "green"|"circular"|null, "dairy_type": "farm"|"processing"|null,
 "inferred": array of field names that were implied rather than explicitly stated}
Rules: extract only what is stated or clearly implied; use null otherwise. "Customer hasn't paid" is receivables, not a new loan. A "new machine" for an existing business is NOT stage "new". Amounts described as sales/turnover are not the amount needed. Never guess gender, caste or religion. Never mention schemes, loans or advice.`;

const str = (v, max = 80) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export function sanitizeExtraction(j) {
  j = j && typeof j === 'object' ? j : {};
  const out = {
    summary_en: str(j.summary_en, 300),
    need: Array.isArray(j.need) ? [...new Set(j.need.filter((n) => NEEDS[n]))] : [],
    amount_inr: typeof j.amount_inr === 'number' && j.amount_inr > 0 && j.amount_inr < 1e11 ? j.amount_inr : null,
    activity: str(j.activity), city: str(j.city, 40), state: str(j.state, 40),
    inferred: Array.isArray(j.inferred) ? j.inferred.filter((x) => typeof x === 'string').slice(0, 20) : [],
  };
  for (const [k, allowed] of Object.entries(ENUMS)) out[k] = allowed.includes(j[k]) ? j[k] : null;
  if (!out.need.includes('receivables')) { out.buyer_type = null; out.overdue = null; }
  return out;
}

export function factsFromExtraction(x) {
  const f = {};
  const inf = new Set(x.inferred || []);
  const o = (k) => (inf.has(k) ? 'inferred' : 'ai');
  if (x.need?.length) f.need = { v: x.need, o: o('need') };
  if (x.amount_inr) f.amount = { v: x.amount_inr, o: o('amount_inr') };
  for (const k of ['stage', 'activity', 'sector', 'city', 'state', 'urgency', 'buyer_type', 'overdue', 'udyam', 'green_tech', 'dairy_type'])
    if (x[k] != null) f[k] = { v: x[k], o: o(k) };
  return f;
}

// Shared post-processing for either path.
export function finaliseFacts(f, story) {
  if (f.need && !f.need.v.length) delete f.need;
  if (f.activity && !f.sector) { const s = sectorFromActivity(f.activity.v); if (s) f.sector = { v: s, o: 'inferred' }; }
  f.story = { v: story, o: 'hidden' };
  return f;
}
