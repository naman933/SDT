import './styles.css';
import { S, save, resetAll, startNewJourney, logEvent } from './state.js';
import * as api from './api.js';
import {
  QUESTIONS, byId, rank, pickQuestion, ruleUnderstand, factsFromExtraction, finaliseFacts, parseAmount, STATUS,
} from './engine/index.js';
import {
  TILES, DEMOS, LABEL, fmt, startView, understandView, questionView, resultsView, actionView, dashView,
  nearbyHtml, saathiModal, aboutModal, STAGES,
} from './ui/views.js';

const $ = (id) => document.getElementById(id);
const view = $('view');
const env = { ai: false, canRecord: !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder) };

/* ---------------- Routing ---------------- */
// #/  #/check  #/question  #/results  #/explore/:id  #/my-msme
function route() {
  const [, name = '', arg] = location.hash.split('/');
  const needsStory = ['check', 'question', 'results', 'explore'].includes(name);
  if (needsStory && !S.story) return redirect('#/');
  let html;
  switch (name) {
    case 'check': html = understandView(); break;
    case 'question':
      if (!S.curQ) return redirect('#/check');
      html = questionView(); break;
    case 'results': html = resultsView(); break;
    case 'explore':
      if (!byId(arg)) return redirect('#/results');
      if (!S.tracked[arg]) track(arg);
      html = actionView(arg); break;
    case 'my-msme': html = dashView(); break;
    default: html = startView(env);
  }
  view.innerHTML = html;
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
}
// Replace the current history entry (no Back-button trap) and render.
function redirect(hash) {
  history.replaceState(null, '', hash);
  route();
}
function navigate(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}
window.addEventListener('hashchange', route);

/* ---------------- Journey logic ---------------- */
async function startJourney(text) {
  text = (text ?? $('story')?.value ?? '').trim();
  if (!text) {
    const el = $('story');
    if (el) { el.focus(); el.placeholder = "Write a line about your business — or tap “I don't know” below."; }
    return;
  }
  const btn = $('goBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Understanding…'; }
  startNewJourney(text);
  let facts = null;
  if (env.ai) {
    try {
      const x = await api.understand(text);
      facts = factsFromExtraction(x);
      S.summary = x.summary_en || '';
    } catch (e) {
      console.warn('AI understanding unavailable, using rules:', e.message);
    }
  }
  S.facts = finaliseFacts(facts || ruleUnderstand(text), text);
  save();
  navigate('#/check');
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
  if (slot === 'need' && v === 'unknown') { S.dk++; S.needHelp = true; save(); return route(); }
  S.facts[slot] = { v, o: v === 'unknown' ? 'unknown' : 'answered' };
  if (v === 'unknown') S.dk++;
  S.asked.push(slot);
  nextQuestion();
}

function showResults() {
  const R = rank(S.facts);
  S.lastTop = R.top.map((r) => r.id);
  S.curQ = null;
  logEvent('Checked options: ' + (R.top.slice(0, 3).map((r) => r.p.name).join(', ') || 'none found'));
  navigate('#/results');
}

function track(id) {
  S.tracked[id] = { stage: 1, done: {}, added: new Date().toISOString() };
  logEvent('Started exploring ' + byId(id).name);
}

function enrich(slot, v) {
  const key = (r) => r.id + ':' + r.status;
  const before = rank(S.facts).top.slice(0, 4).map(key);
  S.facts[slot] = { v, o: 'answered' };
  const R = rank(S.facts);
  const after = R.top.slice(0, 4).map(key);
  const idOf = (x) => x.split(':')[0];
  const name = (x) => byId(idOf(x)).name;
  const msgs = [];
  after.filter((x) => !before.some((b) => idOf(b) === idOf(x))).forEach((x) => msgs.push('Now showing: ' + name(x)));
  before.filter((x) => !after.some((a) => idOf(a) === idOf(x))).forEach((x) => msgs.push('No longer showing: ' + name(x)));
  after.forEach((x) => { const b = before.find((y) => idOf(y) === idOf(x)); if (b && b !== x) msgs.push(`${name(x)}: ${STATUS[x.split(':')[1]][1].toLowerCase()}`); });
  S.lastTop = R.top.map((r) => r.id);
  logEvent(`Added: ${LABEL[slot]} = ${fmt(slot, v)}`);
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  view.innerHTML = dashView(`<div class="note"><b>What changed:</b> ${msgs.length ? msgs.map(esc).join(' · ') : "No change to your matches — but we've recorded it."}</div>`);
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
  $('modal').hidden = true;
  lastFocus?.focus?.();
}
$('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('modal').hidden) closeModal(); });

/* ---------------- Voice ---------------- */
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
      stream.getTracks().forEach((t) => t.stop());
      btn.classList.remove('rec'); btn.textContent = '🎙 Speak instead';
      note.textContent = 'Transcribing…';
      try {
        const text = await api.transcribe(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        $('story').value = ($('story').value + ' ' + text).trim();
        note.textContent = 'Check the text, then Continue.';
      } catch (e) { note.textContent = 'Could not transcribe: ' + e.message; }
    };
    recorder.start();
    btn.classList.add('rec'); btn.textContent = '■ Stop';
    note.textContent = 'Listening… speak in any language. Tap Stop when done.';
  } catch (e) {
    note.textContent = 'Microphone not available: ' + e.message;
  }
}

/* ---------------- Actions (event delegation) ---------------- */
const ACTIONS = {
  start: () => startJourney(),
  tile: (d) => startJourney(TILES[+d.i][2]),
  demo: (d) => { $('story').value = DEMOS[+d.i][1]; $('story').focus(); },
  mic: toggleMic,
  'drop-fact': (d) => { delete S.facts[d.k]; S.asked = S.asked.filter((s) => s !== d.k); save(); route(); },
  confirm: () => { S.asked = S.asked.filter((s) => s === 'need' || S.facts[s] !== undefined); nextQuestion(); },
  opt: (d) => { const v = QUESTIONS[S.curQ].opts[+d.i][0]; answer(S.curQ, S.curQ === 'need' ? [v] : v); },
  dk: () => answer(S.curQ, 'unknown'),
  'show-results': showResults,
  explore: (d) => navigate('#/explore/' + d.id),
  'toggle-score': (d, el) => { const p = $('sc-' + d.id); p.hidden = !p.hidden; el.setAttribute('aria-expanded', String(!p.hidden)); },
  stage: (d) => { S.tracked[d.id].stage = +d.i; logEvent(`${byId(d.id).name} → ${STAGES[+d.i]}`); save(); route(); },
  untrack: (d) => { delete S.tracked[d.id]; save(); route(); },
  enrich: (d) => enrich(d.slot, JSON.parse(d.v)),
  saathi: () => openModal(saathiModal()),
  about: () => openModal(aboutModal()),
  'close-modal': closeModal,
  'copy-hand': async () => {
    try { await navigator.clipboard.writeText($('hand').textContent); $('copied').textContent = 'Copied.'; }
    catch { const r = document.createRange(); r.selectNodeContents($('hand')); getSelection().removeAllRanges(); getSelection().addRange(r); $('copied').textContent = 'Selected — press Ctrl/Cmd+C.'; }
  },
  reset: (d, el) => {
    if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Click again to delete everything'; el.classList.add('primary'); return; }
    resetAll(); navigate('#/');
  },
  'new-need': () => { S.story = ''; save(); navigate('#/'); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.type === 'checkbox') return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset?.act === 'tick') { S.tracked[el.dataset.id].done[el.dataset.k] = el.checked; save(); }
});
document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form.dataset.form === 'amount') {
    e.preventDefault();
    const a = parseAmount($('amtIn').value);
    if (!a) { $('amtErr').textContent = 'Try e.g. “8 lakh” or “250000”.'; return; }
    answer('amount', a);
  } else if (form.dataset.form === 'pin') {
    e.preventDefault();
    const pin = $('pin').value.trim();
    $('near').innerHTML = /^\d{6}$/.test(pin) ? nearbyHtml(form.dataset.id, pin) : '<p class="small err">Please enter a 6-digit pincode.</p>';
  }
});
// Ctrl/Cmd+Enter submits the story.
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'story' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) startJourney();
});

/* ---------------- Boot ---------------- */
function setPill() {
  const p = $('aiPill');
  p.textContent = env.ai ? 'AI understanding: on' : 'Rule-based mode';
  p.classList.toggle('on', env.ai);
}
route();
api.health().then((h) => {
  env.ai = !!h.ai;
  setPill();
  const mic = $('micBtn');
  if (mic) mic.hidden = !(env.ai && env.canRecord);
});
