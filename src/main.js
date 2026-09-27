import './styles.css';
import { S, save, resetAll, startNewJourney, logEvent } from './state.js';
import * as api from './api.js';
import {
  QUESTIONS, byId, rank, pickQuestion, ruleUnderstand, factsFromExtraction, finaliseFacts, parseAmount,
} from './engine/index.js';
import {
  esc, label, fmt, outcomeL, journeyHtml, startView, understandView, questionView, resultsView, readyView, trackView, dashView,
  nearbyHtml, helpModal, sheetModal, termModal, chipModal, aboutModal, handoffText, sheetText,
} from './ui/views.js';
import { t, tc, getLang, setLang, LANGS } from './i18n/index.js';

const $ = (id) => document.getElementById(id);
const view = $('view');
const env = {
  ai: false, checked: false,
  canRecord: !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder),
  tts: 'speechSynthesis' in window,
};

/* ---------------- Routing ---------------- */
// #/  #/check  #/question  #/results  #/explore/:id (Get ready)  #/track/:id  #/my-msme
function journeyStepFor(name) {
  switch (name) {
    case 'check': case 'question': return 2;
    case 'results': return 3;
    case 'explore': return 4;
    case 'track': return 5;
    case 'my-msme': {
      const ids = Object.keys(S.tracked);
      if (ids.some((id) => S.tracked[id].outcome && S.tracked[id].outcome !== 'notyet')) return 5;
      if (ids.length) return 4;
      return S.lastTop.length ? 3 : S.story ? 2 : 1;
    }
    default: return 1;
  }
}
function route({ keepScroll = false } = {}) {
  const [, name = '', arg] = location.hash.split('/');
  if (['check', 'question', 'results', 'explore', 'track'].includes(name) && !S.story) return redirect('#/');
  let html;
  switch (name) {
    case 'check': html = understandView(); break;
    case 'question':
      if (!S.curQ) return redirect('#/check');
      html = questionView(); break;
    case 'results': html = resultsView(); break;
    case 'explore':
    case 'track':
      if (!byId(arg)) return redirect('#/results');
      if (!S.tracked[arg]) track(arg);
      html = name === 'explore' ? readyView(arg) : trackView(arg); break;
    case 'my-msme': html = dashView(); break;
    default: html = startView(env);
  }
  stopSpeaking();
  $('journey').innerHTML = journeyHtml(journeyStepFor(name));
  view.innerHTML = html;
  if (!keepScroll) window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
}
function redirect(hash) { history.replaceState(null, '', hash); route(); } // no Back-button trap
function navigate(hash) { if (location.hash === hash) route(); else location.hash = hash; }
window.addEventListener('hashchange', () => route());

/* ---------------- Journey logic ---------------- */
async function startJourney(text) {
  text = (text ?? $('story')?.value ?? '').trim();
  if (!text) {
    const el = $('story');
    if (el) { el.focus(); el.placeholder = t('start.empty'); }
    return;
  }
  const btn = $('goBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>${esc(t('start.understanding'))}`; }
  startNewJourney(text);
  let facts = null;
  if (env.ai) {
    try {
      const x = await api.understand(text, getLang());
      facts = factsFromExtraction(x);
      S.summary = x.summary || '';
    } catch (e) {
      console.warn('AI understanding unavailable, using rules:', e.message);
    }
  }
  S.facts = finaliseFacts(facts || ruleUnderstand(text), text);
  save();
  nextQuestion(); // ② straight away — what we understood is shown as editable chips
}

function nextQuestion() {
  const pick = pickQuestion(S.facts, S.asked);
  if (!pick) { S.curQ = null; save(); return showResults(); }
  S.curQ = pick.slot;
  S.curAffects = pick.affects;
  S.needHelp = false;
  save();
  navigate('#/question');
}

function answer(slot, v) {
  if (slot === 'need' && v === 'unknown') { S.dk++; S.needHelp = true; save(); return route({ keepScroll: true }); }
  S.facts[slot] = { v, o: v === 'unknown' ? 'unknown' : 'answered' };
  if (v === 'unknown') S.dk++;
  S.asked.push(slot);
  nextQuestion();
}

function showResults() {
  const R = rank(S.facts);
  S.lastTop = R.top.map((r) => r.id);
  S.curQ = null;
  logEvent(t('log.checked', { x: R.top.slice(0, 3).map((r) => tc(r.p.name)).join(', ') || t('log.none') }));
  navigate('#/results');
}

function track(id) {
  S.tracked[id] = { docs: {}, outcome: null, added: new Date().toISOString() };
  logEvent(t('log.started', { n: tc(byId(id).name) }));
}

// Changing a fact re-runs the question loop, which asks for it again only if it matters.
function dropFact(k) {
  delete S.facts[k];
  S.asked = S.asked.filter((s) => s !== k);
  save();
  closeModal();
  nextQuestion();
}

function enrich(slot, v) {
  const key = (r) => r.id + ':' + r.status;
  const before = rank(S.facts).top.slice(0, 4).map(key);
  S.facts[slot] = { v, o: 'answered' };
  const R = rank(S.facts);
  const after = R.top.slice(0, 4).map(key);
  const idOf = (x) => x.split(':')[0];
  const name = (x) => tc(byId(idOf(x)).name);
  const msgs = [];
  after.filter((x) => !before.some((b) => idOf(b) === idOf(x))).forEach((x) => msgs.push(t('changed.now', { n: name(x) })));
  before.filter((x) => !after.some((a) => idOf(a) === idOf(x))).forEach((x) => msgs.push(t('changed.gone', { n: name(x) })));
  after.forEach((x) => { const b = before.find((y) => idOf(y) === idOf(x)); if (b && b !== x) msgs.push(`${name(x)}: ${t('status.' + x.split(':')[1])}`); });
  S.lastTop = R.top.map((r) => r.id);
  logEvent(t('log.added', { l: label(slot), v: fmt(slot, v) }));
  view.innerHTML = dashView(`<div class="note"><b>${esc(t('changed.t'))}</b> ${msgs.length ? msgs.map(esc).join(' · ') : esc(t('changed.none'))}</div>`);
}

/* ---------------- Modal ---------------- */
let lastFocus = null;
function openModal(html) {
  lastFocus = document.activeElement;
  $('modalBody').innerHTML = html;
  $('modal').hidden = false;
  $('modalBody').querySelector('button, a')?.focus();
}
function closeModal() {
  if ($('modal').hidden) return;
  $('modal').hidden = true;
  lastFocus?.focus?.();
}
$('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

/* ---------------- Read aloud (browser speech, no network) ---------------- */
let speakingBtn = null;
function stopSpeaking() {
  if (!env.tts) return;
  speechSynthesis.cancel();
  if (speakingBtn) { speakingBtn.textContent = t('read'); speakingBtn = null; }
}
function speak(targetId, btn) {
  if (speakingBtn) { const same = speakingBtn === btn; stopSpeaking(); if (same) return; }
  const el = $(targetId);
  if (!el) return;
  const clone = el.cloneNode(true);
  clone.querySelectorAll('button:not(.term), details, .expert-only, .chip').forEach((n) => n.remove());
  const text = clone.textContent.replace(/\s+/g, ' ').replace(/[✓✗•⭐🔊📄]/g, '').trim();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = getLang() === 'hi' ? 'hi-IN' : 'en-IN';
  const voice = speechSynthesis.getVoices().find((v) => v.lang?.replace('_', '-').startsWith(u.lang.slice(0, 2)));
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.onend = u.onerror = () => { if (speakingBtn === btn) { btn.textContent = t('read'); speakingBtn = null; } };
  speakingBtn = btn;
  btn.textContent = t('read.stop');
  speechSynthesis.speak(u);
}

/* ---------------- Voice input (Groq Whisper via /api/transcribe) ---------------- */
let recorder = null;
async function toggleMic() {
  const btn = $('micBtn'), note = $('micNote');
  if (recorder?.state === 'recording') { recorder.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((tr) => tr.stop());
      btn.classList.remove('rec'); btn.textContent = t('start.speak');
      note.textContent = t('mic.transcribing');
      try {
        const text = await api.transcribe(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        $('story').value = ($('story').value + ' ' + text).trim();
        note.textContent = t('mic.check');
        $('story').scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) { note.textContent = t('mic.fail', { e: e.message }); }
    };
    recorder.start();
    btn.classList.add('rec'); btn.textContent = t('start.stop');
    note.textContent = t('mic.listening');
  } catch (e) {
    note.textContent = t('mic.unavailable', { e: e.message });
  }
}

/* ---------------- Sharing ---------------- */
const shareSource = (d) => (d.src === 'sheet' ? sheetText(d.id) : handoffText());
function print() {
  document.body.classList.add('printing');
  window.print();
  setTimeout(() => document.body.classList.remove('printing'), 500);
}

/* ---------------- Actions (event delegation) ---------------- */
const ACTIONS = {
  start: () => startJourney(),
  tile: (d) => startJourney(t('tiles')[+d.i][2]),
  demo: (d) => { $('story').value = t('demos')[+d.i][1]; $('story').focus(); },
  lang: () => switchLang(getLang() === 'hi' ? 'en' : 'hi'),
  mic: toggleMic,
  // Facts
  chip: (d) => openModal(chipModal(d.k)),
  'chip-yes': (d) => { S.facts[d.k].o = 'answered'; save(); closeModal(); route({ keepScroll: true }); },
  'chip-no': (d) => dropFact(d.k),
  'drop-fact': (d) => { delete S.facts[d.k]; S.asked = S.asked.filter((s) => s !== d.k); save(); route({ keepScroll: true }); },
  confirm: () => { S.asked = S.asked.filter((s) => s === 'need' || S.facts[s] !== undefined); nextQuestion(); },
  // Questions
  opt: (d) => { const v = QUESTIONS[S.curQ].opts[+d.i][0]; answer(S.curQ, S.curQ === 'need' ? [v] : v); },
  dk: () => answer(S.curQ, 'unknown'),
  'show-results': showResults,
  // Options → Get ready → Track
  explore: (d) => navigate('#/explore/' + d.id),
  doc: (d) => { const tr = S.tracked[d.id]; tr.docs = tr.docs || {}; if (d.v) tr.docs[d.k] = d.v; else { delete tr.docs[d.k]; if (tr.done) delete tr.done[d.k]; } save(); route({ keepScroll: true }); },
  outcome: (d) => { S.tracked[d.id].outcome = d.v; logEvent(`${tc(byId(d.id).name)}: ${outcomeL(d.v)}`); save(); route({ keepScroll: true }); },
  untrack: (d) => { delete S.tracked[d.id]; save(); route({ keepScroll: true }); },
  enrich: (d) => enrich(d.slot, JSON.parse(d.v)),
  // Help, sharing, glossary, reading
  help: () => openModal(helpModal()),
  about: () => openModal(aboutModal()),
  sheet: (d) => openModal(sheetModal(d.id)),
  term: (d) => openModal(termModal(d.term)),
  'close-modal': closeModal,
  copy: async (d) => {
    try { await navigator.clipboard.writeText(shareSource(d)); $('copied').textContent = t('saathi.copied'); }
    catch { const r = document.createRange(); r.selectNodeContents($('shareText')); getSelection().removeAllRanges(); getSelection().addRange(r); $('copied').textContent = t('saathi.selected'); }
  },
  'share-wa': (d) => window.open('https://wa.me/?text=' + encodeURIComponent(shareSource(d)), '_blank', 'noopener'),
  print,
  speak: (d, el) => speak(d.target, el),
  expert: () => setExpert(!document.body.classList.contains('expert')),
  // Housekeeping
  reset: (d, el) => {
    if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = t('dash.clearConfirm'); el.classList.add('primary'); return; }
    resetAll(); navigate('#/');
  },
  'new-need': () => { S.story = ''; S.summary = ''; save(); navigate('#/'); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.type === 'checkbox') return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
});
document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form.dataset.form === 'amount') {
    e.preventDefault();
    const a = parseAmount($('amtIn').value);
    if (!a) { $('amtErr').textContent = t('q.amountErr'); return; }
    answer('amount', a);
  } else if (form.dataset.form === 'pin') {
    e.preventDefault();
    const pin = $('pin').value.trim();
    $('near').innerHTML = /^\d{6}$/.test(pin) ? nearbyHtml(form.dataset.id, pin) : `<p class="small err">${esc(t('pin.err'))}</p>`;
  }
});
// Ctrl/Cmd+Enter submits the story.
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'story' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) startJourney();
});

/* ---------------- Language, expert view, boot ---------------- */
function setPill() {
  const p = $('aiPill');
  p.textContent = env.checked ? t(env.ai ? 'ai.on' : 'ai.off') : t('ai.checking');
  p.title = t('ai.title');
  p.classList.toggle('on', env.ai);
}
function setExpert(on) {
  document.body.classList.toggle('expert', on);
  const b = $('expertBtn');
  b.setAttribute('aria-pressed', String(on));
  b.textContent = t(on ? 'nav.expertOn' : 'nav.expert');
  try { localStorage.setItem('msmeNav.expert', on ? '1' : ''); } catch { /* ignore */ }
}
// Text that lives in index.html (outside the routed view).
function applyStaticText() {
  document.documentElement.lang = getLang();
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  const sw = $('langBtn');
  sw.textContent = t('lang.switch');
  sw.lang = getLang() === 'hi' ? 'en' : 'hi';
  sw.title = t('lang.switchTitle');
  sw.setAttribute('aria-label', t('lang.switchTitle'));
  $('journey').setAttribute('aria-label', t('journey.label'));
  setExpert(document.body.classList.contains('expert'));
  setPill();
}
function switchLang(l) {
  if (!LANGS[l]) return;
  const draft = $('story')?.value; // keep what the owner has typed
  setLang(l);
  applyStaticText();
  closeModal();
  route({ keepScroll: true });
  if (draft != null && $('story')) $('story').value = draft;
  const box = $('speakBox');
  if (box) box.hidden = !(env.ai && env.canRecord);
}

if (!env.tts) document.body.classList.add('no-tts');
try { if (localStorage.getItem('msmeNav.expert')) document.body.classList.add('expert'); } catch { /* ignore */ }
applyStaticText();
route();
api.health().then((h) => {
  env.ai = !!h.ai;
  env.checked = true;
  setPill();
  const box = $('speakBox');
  if (box) box.hidden = !(env.ai && env.canRecord);
});
