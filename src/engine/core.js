// Shared primitives: money formatting, fact access, need taxonomy.

export const L = 1e5;
export const CR = 1e7;
export const RECORDED = 'Sep 2026';
// Day the corpus records were last checked against their official sources. Older than STALE_DAYS → "verify before acting".
export const CHECKED = '2026-09-27';
export const STALE_DAYS = 180;
export const isStale = (today = new Date()) => (today - new Date(CHECKED)) / 864e5 > STALE_DAYS;

export function inr(n) {
  if (n == null) return '—';
  if (n >= CR) return '₹' + +(n / CR).toFixed(2) + ' crore';
  if (n >= L) return '₹' + +(n / L).toFixed(2) + ' lakh';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

// A fact is { v, o } where o = origin: said | ai | inferred | answered | unknown | sim.
// 'unknown' is a real answer ("I don't know") and 'declined' is "prefer not to say" — neither is ever treated as "no".
export const V = (f, k) => {
  const x = f[k];
  return x && x.v != null && x.v !== 'unknown' && x.v !== 'declined' ? x.v : null;
};

// The profile areas used for "Based on X of Y profile areas". Each entry lists the fact keys that fill it.
export const COVERAGE = [
  ['need', ['need']], ['amount', ['amount']], ['stage', ['stage']], ['sector', ['activity', 'sector']],
  ['state', ['state', 'city']], ['size', ['size']], ['urgency', ['urgency']], ['udyam', ['udyam']],
];
export function coverage(f) {
  const known = COVERAGE.filter(([, keys]) => keys.some((k) => V(f, k) != null)).map(([a]) => a);
  return { known, missing: COVERAGE.map(([a]) => a).filter((a) => !known.includes(a)), total: COVERAGE.length };
}
export const needsOf = (f) => {
  const v = V(f, 'need');
  return Array.isArray(v) ? v : [];
};
export const hasNeed = (f, ...n) => needsOf(f).some((x) => n.includes(x));

export const NEEDS = {
  startup: { l: 'Start a new business', s: 'Starting something new', want: ['money'] },
  equipment: { l: 'Buy a machine or equipment', s: 'Machine / asset / tools', want: ['money'] },
  expansion: { l: 'Grow or expand capacity', s: 'More orders, bigger unit', want: ['money'] },
  working_capital: { l: 'Money for day-to-day running', s: 'Stock, raw material, wages, bills', want: ['money'] },
  receivables: { l: "Get paid by a customer who hasn't paid", s: 'Unpaid invoice / stuck payment', want: ['recovery', 'money'] },
  market: { l: 'Find more customers or sell more', s: 'Online, government buyers, fairs', want: ['market'] },
  green: { l: 'Save energy or move to clean energy', s: 'Solar, efficient machines', want: ['money'] },
  circular: { l: 'Recycle or reuse waste', s: 'Scrap, waste, recycling', want: ['money'] },
  quality: { l: 'Get a quality certification', s: 'Quality / sustainability', want: ['cert'] },
  productivity: { l: 'Cut waste and improve productivity', s: 'Lean, efficiency', want: ['advisory', 'cert'] },
  export: { l: 'Sell outside India', s: 'Export, international buyers', want: ['market'] },
  equity: { l: 'Bring in an investor', s: 'Equity, not a loan', want: ['equity'] },
  training: { l: 'Learn business or technical skills', s: 'Training, courses', want: ['training'] },
  formalisation: { l: 'Get a formal business registration', s: 'Udyam / MSME identity', want: ['identity'] },
};

export const ENUMS = {
  stage: ['new', 'existing', 'expanding'],
  sector: ['manufacturing', 'services', 'trading', 'dairy', 'agri_crop'],
  urgency: ['week', 'month', 'flexible'],
  buyer_type: ['govt_psu', 'large_company', 'small_business', 'consumers'],
  overdue: ['over45', 'under45'],
  udyam: ['yes', 'no'],
  green_tech: ['green', 'circular', 'no'],
  dairy_type: ['farm', 'processing'],
};
