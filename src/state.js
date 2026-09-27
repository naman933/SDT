// Journey state, persisted per browser. Nothing here is sent to the server.
const KEY = 'msmeNav.v3';

const blank = () => ({
  story: '', summary: '', facts: {}, asked: [], dk: 0,
  curQ: null, curAffects: [], needHelp: false,
  tracked: {}, log: [], lastTop: [],
});

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === 'object') return Object.assign(blank(), s);
  } catch { /* storage unavailable or corrupt */ }
  return blank();
}

export const S = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode etc. */ }
}

export function resetAll() {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, blank());
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function startNewJourney(story) {
  Object.assign(S, { story, summary: '', facts: {}, asked: [], dk: 0, curQ: null, curAffects: [], needHelp: false });
}

export function logEvent(t) {
  const locale = typeof document !== 'undefined' && document.documentElement.lang === 'hi' ? 'hi-IN' : 'en-IN';
  S.log.unshift({ t, at: new Date().toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) });
  S.log = S.log.slice(0, 30);
  save();
}
