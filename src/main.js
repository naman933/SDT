import './styles.css';
import { S, save, resetAll, startNewJourney, logEvent } from './state.js';
import { SERVER_AI } from './config.js';
import {
  QUESTIONS, byId, rank, pickQuestion, ruleUnderstand, factsFromExtraction, finaliseFacts, parseAmount,
} from './engine/index.js';
import {
  esc, label, fmt, outcomeL, journeyHtml, startView, understandView, questionView, resultsView, routeView, compareView,
  readyView, trackView, dashView, fundingView, helpView, profileView, nearbyHtml, emiHtml, FILTERS,
  noteModal, sheetModal, draftModal, termModal, chipModal, aboutModal, handoffText, sheetText, planText,
} from './ui/views.js';
import { t, tc, getLang, setLang, LANGS } from './i18n/index.js';

const $ = (id) => document.getElementById(id);
const view = $('view');
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
let api = null; // the /api client is loaded only when SERVER_AI is on
const env = {
  ai: false, checked: !SERVER_AI,
  canRecord: !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder),
  tts: 'speechSynthesis' in window,
  // Voice typing uses the browser's own speech recognition (or Whisper when server AI is switched on).
  get canSpeak() { return (this.ai && this.canRecord) || !!SpeechRec; },
};

/* ---------------- Routing ---------------- */
// #/  #/check  #/question  #/results  #/route/:id  #/compare  #/explore/:id (Get ready)  #/track/:id
// #/my-msme (My journey)  #/funding  #/help  #/profile
const NEEDS_STORY = ['check', 'question', 'results', 'route', 'compare', 'explore', 'track'];
const isRoute = (id) => byId(id)?.type === 'direct';
function journeyStepFor(name) {
  switch (name) {
    case '': return 1;
    case 'check': case 'question': return 2;
    case 'results': case 'route': case 'compare': return 3;
    case 'explore': return 4;
    case 'track': return 5;
    case 'my-msme': {
      const ids = Object.keys(S.tracked);
      if (ids.some((id) => S.tracked[id].outcome && S.tracked[id].outcome !== 'notyet')) return 5;
      if (ids.length) return 4;
      return S.lastTop.length ? 3 : S.story ? 2 : 1;
    }
    default: return 0; // help, funding, profile: no journey bar
  }
}
function route({ keepScroll = false } = {}) {
  const [, name = '', arg] = location.hash.split('/');
  if (NEEDS_STORY.includes(name) && !S.story) return redirect('#/');
  let html;
  switch (name) {
    case 'check': html = understandView(); break;
    case 'question':
      if (!S.curQ) return redirect('#/check');
      html = questionView(); break;
    case 'results': html = resultsView(); break;
    case 'route':
      if (!isRoute(arg)) return redirect('#/results');
      html = routeView(arg); break;
    case 'compare': html = compareView(); break;
    case 'explore':
    case 'track':
      if (!isRoute(arg)) return redirect('#/results');
      if (!S.tracked[arg]) track(arg);
      html = name === 'explore' ? readyView(arg) : trackView(arg); break;
    case 'my-msme': html = dashView(); break;
    case 'funding': html = fundingView(); break;
    case 'help': html = helpView(); break;
    case 'profile': html = profileView(); break;
    default: html = startView(env);
  }
  stopSpeaking();
  stopMic();
  $('journey').innerHTML = journeyHtml(journeyStepFor(name));
  view.innerHTML = html;
  setNav(name);
  if (!keepScroll) window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
}
function redirect(hash) { history.replaceState(null, '', hash); route(); } // no Back-button trap
function navigate(hash) { if (location.hash === hash) route(); else location.hash = hash; }
window.addEventListener('hashchange', () => route());

// Highlight the current area in the top bar; the funding dashboard appears once there are results.
function setNav(name) {
  $('navFunding').hidden = !S.lastTop.length;
  for (const [id, n] of [['navHelp', 'help'], ['navMy', 'my-msme'], ['navFunding', 'funding']]) {
    const el = $(id);
    if (name === n) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  }
}

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
  S.tracked[id] = { docs: {}, items: {}, notes: {}, drafts: {}, draftState: {}, outcome: null, added: new Date().toISOString() };
  logEvent(t('log.started', { n: tc(byId(id).name) }));
}
const trackedOf = (id) => { if (!S.tracked[id]) track(id); return S.tracked[id]; };

// Changing a fact re-runs the question loop, which asks for it again only if it matters.
function dropFact(k) {
  delete S.facts[k];
  S.asked = S.asked.filter((s) => s !== k);
  save();
  closeModal();
  nextQuestion();
}

// Apply a change to the facts and describe what it did to the leading routes (refinement loop).
function changeNote(mutate) {
  const key = (r) => r.id + ':' + r.status;
  const before = rank(S.facts).top.slice(0, 4).map(key);
  mutate();
  const R = rank(S.facts);
  const after = R.top.slice(0, 4).map(key);
  const idOf = (x) => x.split(':')[0];
  const name = (x) => tc(byId(idOf(x)).name);
  const msgs = [];
  after.filter((x) => !before.some((b) => idOf(b) === idOf(x))).forEach((x) => msgs.push(t('changed.now', { n: name(x) })));
  before.filter((x) => !after.some((a) => idOf(a) === idOf(x))).forEach((x) => msgs.push(t('changed.gone', { n: name(x) })));
  after.forEach((x) => { const b = before.find((y) => idOf(y) === idOf(x)); if (b && b !== x) msgs.push(`${name(x)}: ${t('status.' + x.split(':')[1])}`); });
  S.lastTop = R.top.map((r) => r.id);
  save();
  return `<div class="note"><b>${esc(t('changed.t'))}</b> ${msgs.length ? msgs.map(esc).join(' · ') : esc(t('changed.none'))}</div>`;
}
function setFact(slot, v) {
  if (v === undefined) delete S.facts[slot];
  else S.facts[slot] = { v, o: v === 'unknown' ? 'unknown' : v === 'declined' ? 'declined' : 'answered' };
}
function profileChange(slot, v) {
  const note = changeNote(() => setFact(slot, v));
  logEvent(t('log.added', { l: label(slot), v: v === undefined ? t('pf.notSet') : fmt(slot, v) }));
  view.innerHTML = profileView(note);
}

/* ---------------- Modal ---------------- */
let lastFocus = null;
function openModal(html) {
  lastFocus = document.activeElement;
  $('modalBody').innerHTML = html;
  $('modal').hidden = false;
  $('modalBody').querySelector('textarea, button, a')?.focus();
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
  clone.querySelectorAll('button:not(.term), details, select, .expert-only, .chip').forEach((n) => n.remove());
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

/* ---------------- Voice input ----------------
   Two buttons share one state: the big "Press and speak" and the mic inside the text box.
   Browser-only mode → the browser's speech recognition; words appear live in the box (hi-IN / en-IN).
   Server AI on      → record, then transcribe with Whisper (/api/transcribe) — any language. */
let recorder = null, recognition = null, starting = false, cancelStart = false;
function setMicUI(on) {
  const big = $('micBtn'), inline = $('micInline');
  if (big) { big.classList.toggle('rec', on); big.textContent = t(on ? 'start.stop' : 'start.speak'); }
  if (inline) { inline.classList.toggle('rec', on); inline.textContent = t(on ? 'mic.inlineStop' : 'mic.inline'); inline.setAttribute('aria-pressed', String(on)); }
}
function micNote(text) { const n = $('micNote'); if (n) n.textContent = text; }
function stopMic() {
  if (starting) { cancelStart = true; setMicUI(false); micNote(''); }
  if (recorder?.state === 'recording') recorder.stop();
  if (recognition) { const r = recognition; recognition = null; setMicUI(false); try { r.stop(); } catch { /* already stopped */ } }
}
async function toggleMic(d) {
  if (starting || recorder?.state === 'recording' || recognition) { stopMic(); return; }
  if (d?.focus) $('story')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (env.ai && env.canRecord) return recordForWhisper();
  if (SpeechRec) return liveDictation();
  micNote(t('mic.noVoice'));
}
async function recordForWhisper() {
  // Show "Stop" at once; a second tap while the browser asks for mic permission cancels cleanly.
  starting = true; cancelStart = false;
  setMicUI(true);
  micNote(t('mic.listening'));
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    starting = false;
    if (cancelStart) { stream.getTracks().forEach((tr) => tr.stop()); return; }
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((tr) => tr.stop());
      setMicUI(false);
      micNote(t('mic.transcribing'));
      try {
        const text = await api.transcribe(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        const box = $('story');
        if (box) box.value = (box.value.trim() + ' ' + text.trim()).trim();
        micNote(t('mic.check'));
      } catch (e) { micNote(t('mic.fail', { e: e.message })); }
    };
    recorder.start();
  } catch (e) {
    starting = false;
    setMicUI(false);
    micNote(t('mic.unavailable', { e: e.message }));
  }
}
const MIC_ERRORS = { 'not-allowed': 'mic.denied', 'service-not-allowed': 'mic.denied', 'no-speech': 'mic.noSpeech', network: 'mic.network', 'audio-capture': 'mic.noMic' };
function liveDictation() {
  const box = $('story');
  if (!box) return;
  const base = box.value.trim();
  const r = new SpeechRec();
  recognition = r;
  recognition.lang = getLang() === 'hi' ? 'hi-IN' : 'en-IN';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.onresult = (e) => {
    let said = '';
    for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
    box.value = (base + ' ' + said).trim();
  };
  recognition.onerror = (e) => {
    if (e.error === 'aborted') return;
    micNote(MIC_ERRORS[e.error] ? t(MIC_ERRORS[e.error]) : t('mic.unavailable', { e: e.error }));
  };
  recognition.onend = () => {
    if (recognition === r) { recognition = null; setMicUI(false); }
    if (box.value.trim() !== base) micNote(t('mic.check'));
  };
  try {
    recognition.start();
    setMicUI(true);
    micNote(t('mic.live'));
  } catch (e) {
    recognition = null;
    micNote(t('mic.unavailable', { e: e.message }));
  }
}

/* ---------------- Sharing, drafts, downloads ---------------- */
function shareSource(d) {
  if (d.src === 'sheet') return sheetText(d.id);
  if (d.src === 'draft') return $('draftText')?.value ?? '';
  if (d.src === 'grv') return $('grvText')?.value ?? '';
  return handoffText();
}
function print() {
  document.body.classList.add('printing');
  window.print();
  setTimeout(() => document.body.classList.remove('printing'), 500);
}
// Opens the owner's own email app with the text. Nothing is sent by this app.
function openMail(text) {
  const lines = text.split('\n');
  const first = lines[0] || '';
  const m = first.match(/^(Subject|विषय)\s*:\s*(.*)$/);
  const subject = m ? m[2] : '';
  const body = (m ? lines.slice(1) : lines).join('\n').trim();
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Re-draw the checklist behind the dialog so its draft buttons show the new state (without moving focus).
function refreshBehindModal(id) { if (location.hash === '#/explore/' + id) view.innerHTML = readyView(id); }

/* ---------------- Actions (event delegation) ---------------- */
const ACTIONS = {
  start: () => startJourney(),
  tile: (d) => startJourney(t('tiles')[+d.i][2]),
  demo: (d) => { $('story').value = t('demos')[+d.i][1]; $('story').focus(); },
  lang: () => switchLang(getLang() === 'hi' ? 'en' : 'hi'),
  mic: (d) => toggleMic(d),
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
  // Options, route detail, checklist, tracking
  filter: (d) => { S.filter = FILTERS.includes(d.f) ? d.f : 'all'; save(); route({ keepScroll: true }); },
  explore: (d) => navigate('#/explore/' + d.id),
  save: (d) => { trackedOf(d.id); save(); route({ keepScroll: true }); },
  outcome: (d) => { S.tracked[d.id].outcome = d.v; logEvent(`${tc(byId(d.id).name)}: ${outcomeL(d.v)}`); save(); route({ keepScroll: true }); },
  untrack: (d) => { delete S.tracked[d.id]; save(); route({ keepScroll: true }); },
  enrich: (d) => {
    const v = JSON.parse(d.v);
    const note = changeNote(() => setFact(d.slot, v));
    logEvent(t('log.added', { l: label(d.slot), v: fmt(d.slot, v) }));
    view.innerHTML = dashView(note);
  },
  refresh: () => { const note = changeNote(() => {}); logEvent(t('log.refreshed')); view.innerHTML = dashView(note); },
  // Drafts
  draft: (d) => { trackedOf(d.id); save(); openModal(draftModal(d.id, d.kind)); },
  'draft-reset': (d) => {
    const tr = trackedOf(d.id);
    delete tr.drafts?.[d.kind];
    if (tr.draftState) delete tr.draftState[d.kind];
    save();
    openModal(draftModal(d.id, d.kind));
    refreshBehindModal(d.id);
  },
  'draft-ready': (d) => {
    const tr = trackedOf(d.id);
    tr.drafts = tr.drafts || {}; tr.draftState = tr.draftState || {};
    tr.drafts[d.kind] = $('draftText').value;
    tr.draftState[d.kind] = tr.draftState[d.kind] === 'prepared' ? undefined : 'prepared';
    if (tr.draftState[d.kind]) logEvent(t('log.draft', { k: t('draft.' + d.kind), n: tc(byId(d.id).name) }));
    save();
    openModal(draftModal(d.id, d.kind));
    refreshBehindModal(d.id);
  },
  mailto: (d) => openMail(shareSource(d)),
  // Help, grievance, sharing, glossary, reading
  help: () => navigate('#/help'),
  about: () => openModal(aboutModal()),
  note: () => openModal(noteModal()),
  sheet: (d) => openModal(sheetModal(d.id)),
  term: (d) => openModal(termModal(d.term)),
  'close-modal': closeModal,
  'grv-type': (d) => { S.grvType = d.v; save(); route({ keepScroll: true }); },
  'grv-del': (d) => { S.grievances.splice(+d.i, 1); save(); route({ keepScroll: true }); },
  copy: async (d) => {
    const text = shareSource(d);
    try { await navigator.clipboard.writeText(text); $('copied').textContent = t('saathi.copied'); }
    catch {
      const el = $('draftText') || $('grvText') || $('shareText');
      if (el?.select) el.select();
      else if (el) { const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); }
      $('copied').textContent = t('saathi.selected');
    }
  },
  'share-wa': (d) => window.open('https://wa.me/?text=' + encodeURIComponent(shareSource(d)), '_blank', 'noopener'),
  print,
  speak: (d, el) => speak(d.target, el),
  expert: () => setExpert(!document.body.classList.contains('expert')),
  // Profile
  pf: (d) => profileChange(d.slot, JSON.parse(d.v)),
  'pf-need': (d) => {
    const v = JSON.parse(d.v);
    const cur = Array.isArray(S.facts.need?.v) ? S.facts.need.v : [];
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    profileChange('need', next.length ? next : undefined);
  },
  'pf-clear': (d) => profileChange(d.slot, undefined),
  // Housekeeping
  'export-txt': () => download('msme-navigator-plan.txt', planText(), 'text/plain;charset=utf-8'),
  'export-json': () => download('msme-navigator-data.json', JSON.stringify(S, null, 2), 'application/json'),
  reset: (d, el) => {
    if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = t('dash.clearConfirm'); el.classList.add('primary'); return; }
    resetAll(); navigate('#/');
  },
  'new-need': () => { S.story = ''; S.summary = ''; save(); navigate('#/'); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.matches('select[data-status]')) {
    const tr = trackedOf(el.dataset.id);
    const bag = el.dataset.doc ? (tr.docs = tr.docs || {}) : (tr.items = tr.items || {});
    if (el.value) bag[el.dataset.k] = el.value; else delete bag[el.dataset.k];
    save();
    route({ keepScroll: true });
    // Keep keyboard users where they were.
    [...document.querySelectorAll('select[data-status]')].find((s) => s.dataset.k === el.dataset.k)?.focus();
  } else if (el.matches('select[data-pf]')) {
    profileChange(el.dataset.pf, el.value || undefined);
  } else if (el.matches('textarea[data-note]')) {
    const tr = trackedOf(el.dataset.id);
    tr.notes = tr.notes || {};
    if (el.value.trim()) tr.notes[el.dataset.k] = el.value.trim(); else delete tr.notes[el.dataset.k];
    save();
  }
});
// Draft edits are kept as the owner types, so nothing is lost when the dialog closes.
document.addEventListener('input', (e) => {
  const el = e.target;
  if (!el.matches('textarea[data-draft]')) return;
  const tr = trackedOf(el.dataset.id);
  tr.drafts = tr.drafts || {};
  tr.drafts[el.dataset.kind] = el.value;
  save();
});
document.addEventListener('submit', (e) => {
  const form = e.target;
  const kind = form.dataset.form;
  if (!kind) return;
  e.preventDefault();
  if (kind === 'amount') {
    const a = parseAmount($('amtIn').value);
    if (!a) { $('amtErr').textContent = t('q.amountErr'); return; }
    answer('amount', a);
  } else if (kind === 'pin') {
    const pin = $('pin').value.trim();
    if (/^\d{6}$/.test(pin)) { S.pin = pin; save(); $('near').innerHTML = nearbyHtml(form.dataset.id || null, pin); }
    else $('near').innerHTML = `<p class="small err">${esc(t('pin.err'))}</p>`;
  } else if (kind === 'emi') {
    const P = parseAmount($('emiP').value) ?? parseFloat($('emiP').value);
    const r = parseFloat($('emiR').value), n = parseInt($('emiN').value, 10);
    const ok = P > 0 && r >= 0 && r <= 60 && n >= 1 && n <= 360;
    $('emiOut').innerHTML = ok ? emiHtml(P, r, n) : `<p class="small err">${esc(t('emi.err'))}</p>`;
  } else if (kind === 'grv') {
    const filed = $('grvDate').value || new Date().toISOString().slice(0, 10);
    S.grievances.push({ type: S.grvType, filed, ref: $('grvRef').value.trim(), next: $('grvNext').value || '' });
    logEvent(t('log.grv', { x: t('grv.type.' + S.grvType) }));
    save();
    route({ keepScroll: true });
  } else if (kind === 'pf-amount') {
    const a = parseAmount($('pfAmt').value);
    if (!a) { $('pfAmtErr').textContent = t('q.amountErr'); return; }
    profileChange('amount', a);
  } else if (kind === 'pf-pin') {
    const pin = $('pfPin').value.trim();
    if (pin && !/^\d{6}$/.test(pin)) { $('pinMsg').textContent = t('pin.err'); return; }
    S.pin = pin; save();
    $('pinMsg').textContent = t(pin ? 'pf.pinSaved' : 'pf.pinCleared');
  }
});
// Ctrl/Cmd+Enter submits the story.
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'story' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) startJourney();
});

/* ---------------- Language, expert view, boot ---------------- */
function setPill() {
  const p = $('aiPill');
  p.textContent = !env.checked ? t('ai.checking') : env.ai ? t('ai.on') : t('ai.off');
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
function showMics() {
  for (const id of ['speakBox', 'micInline']) { const el = $(id); if (el) el.hidden = !env.canSpeak; }
  const nv = $('noVoice'); if (nv) nv.hidden = env.canSpeak;
}
function switchLang(l) {
  if (!LANGS[l]) return;
  const draft = $('story')?.value; // keep what the owner has typed
  setLang(l);
  applyStaticText();
  closeModal();
  route({ keepScroll: true });
  if (draft != null && $('story')) $('story').value = draft;
  showMics();
}

if (!env.tts) document.body.classList.add('no-tts');
try { if (localStorage.getItem('msmeNav.expert')) document.body.classList.add('expert'); } catch { /* ignore */ }
applyStaticText();
route();
if (SERVER_AI) {
  import('./api.js').then(async (m) => {
    api = m;
    const h = await m.health();
    env.ai = !!h.ai;
    env.checked = true;
    setPill();
    showMics();
  });
}
