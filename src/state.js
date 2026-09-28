// Journey state, persisted per browser (guest mode). Nothing here is sent to the server.
const KEY = 'msmeNav.v3';

const blank = () => ({
  story: '', summary: '', facts: {}, asked: [], dk: 0,
  curQ: null, curAffects: [], needHelp: false,
  tracked: {}, log: [], lastTop: [],
  pin: '', grievances: [], grvType: null, filter: 'all', updated: null,
});

// Earlier versions stored "I have it / I don't have it" as docs[key] = have | need, and Udyam to-dos under 'v:'.
function migrate(s) {
  for (const tr of Object.values(s.tracked || {})) {
    tr.items = tr.items || {};
    for (const [k, v] of Object.entries(tr.docs || {})) {
      if (k.startsWith('v:')) { if (v === 'have') tr.items['e:' + k.slice(2)] = 'done'; delete tr.docs[k]; }
      else if (v === 'need') tr.docs[k] = 'missing';
    }
    for (const k of Object.keys(tr.done || {})) if (k.startsWith('d:') && !tr.docs?.[k]) (tr.docs = tr.docs || {})[k] = 'have';
    delete tr.done;
  }
  return s;
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === 'object') return migrate(Object.assign(blank(), s));
  } catch { /* storage unavailable or corrupt */ }
  return blank();
}

export const S = load();

export function save() {
  S.updated = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode etc. */ }
}

export function resetAll() {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, blank());
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function startNewJourney(story) {
  Object.assign(S, { story, summary: '', facts: {}, asked: [], dk: 0, curQ: null, curAffects: [], needHelp: false, filter: 'all' });
}

export function logEvent(t) {
  const locale = typeof document !== 'undefined' && document.documentElement.lang === 'hi' ? 'hi-IN' : 'en-IN';
  S.log.unshift({ t, at: new Date().toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) });
  S.log = S.log.slice(0, 30);
  save();
}
