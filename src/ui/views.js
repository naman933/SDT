// Pure render functions: state in, HTML string out. Interactions use data-act attributes (see main.js).
// Journey: ① Tell us → ② A few questions → ③ Your options → ④ Get ready → ⑤ Apply & track.
// Around it: route detail, compare, funding dashboard, help & grievance, business profile and My journey.
// All user-visible text goes through t() / td() / tc(); jargon is wrapped by glossify() for tap-to-explain.
import { S } from '../state.js';
import {
  NEEDS, QUESTIONS, MAX_QUESTIONS, CORPUS, INSTITUTIONAL, CHECKED, byId,
  V, needsOf, rank, evaluate, enablersFor, openSlots, fitBand, coverage, isStale, DIMENSIONS,
  LANE, evidenceOf, channelOf, stepsFor, grievanceFor, GRIEVANCE, GRIEVANCE_TYPES, CONTACTS,
  PROFILE_SLOTS, SENSITIVE, STATES, SECTIONS, ITEM_STATES, DOC_STATES, buildChecklist, itemStatus, readiness, isComplete,
} from '../engine/index.js';
import { t, td, tc, money, joinList, getLang, STRINGS } from '../i18n/index.js';
import { glossify, termById } from '../i18n/glossary.js';
import { docHelp } from '../i18n/docs.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const attr = (v) => esc(JSON.stringify(v));
const g = (text, used) => glossify(esc(text), getLang(), used); // escaped + tap-to-explain
const locale = () => (getLang() === 'hi' ? 'hi-IN' : 'en-IN');
export const dateL = (iso) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
const host = (u) => u.replace(/^https?:\/\//, '').replace(/\/$/, '');
const ext = (u, text) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(text)} ↗</a>`;

/* ---------------- Localised data labels ---------------- */
const LABEL_EN = {
  need: 'What it is for', amount: 'Amount', stage: 'Business stage', activity: 'Business', sector: 'Sector', city: 'City', state: 'State / UT',
  urgency: 'Timing', buyer_type: 'Customer who owes you', overdue: 'Payment overdue', udyam: 'Udyam registration', green_tech: 'Kind of equipment',
  dairy_type: 'Dairy type', size: 'Yearly sales', applicant: 'Entrepreneur', artisan_trade: 'Traditional trade',
  entity: 'How the business is set up', gst: 'GST registration', records: 'Financial records', collateral: 'Security for a loan', channel_pref: 'How you prefer to apply',
};
const SECTOR_EN = { manufacturing: 'Manufacturing', services: 'Services', trading: 'Trading', dairy: 'Dairy (allied agriculture)', agri_crop: 'Crop farming' };
export const label = (k) => td('label.' + k, LABEL_EN[k]);
export const hasLabel = (k) => k in LABEL_EN;
export const needL = (n) => td(`need.${n}.l`, NEEDS[n]?.l || n);
export const needS = (n) => td(`need.${n}.s`, NEEDS[n]?.s || '');
export const qText = (slot) => (slot === 'state' ? t('pf.state') : td(`q.${slot}.q`, QUESTIONS[slot].q));
export const qWhy = (slot) => (slot === 'state' ? t('pf.stateWhy') : td(`q.${slot}.why`, QUESTIONS[slot].why));
export const optL = (slot, v) => {
  if (slot === 'need') return needL(v);
  const o = QUESTIONS[slot]?.opts.find((x) => x[0] === v);
  return td(`q.${slot}.opt.${v}`, o ? o[1] : String(v));
};
const activityL = (a) => td('activity.' + a, a);

export function fmt(k, v) {
  if (v === 'declined') return t('pf.declined');
  if (v == null || v === 'unknown') return t('notKnown');
  if (k === 'need') return v.map(needL).join(' · ');
  if (k === 'amount') return money(v);
  if (k === 'sector') return td('sector.' + v, SECTOR_EN[v] || v);
  if (k === 'activity') return activityL(v);
  if (QUESTIONS[k]?.opts.some((x) => x[0] === v)) return optL(k, v);
  return v;
}
const ORIGIN_CLS = { said: 'o-said', ai: 'o-ai', inferred: 'o-inferred', answered: 'o-answered', unknown: 'o-unknown' };
const knownKeys = (f) => Object.keys(f).filter((k) => hasLabel(k) && V(f, k) != null);
const nameOf = (p) => tc(p.name);
const OUTCOMES = ['notyet', 'waiting', 'approved', 'rejected'];
export const outcomeL = (o) => t('track.outcome')[OUTCOMES.indexOf(o)] || '';
const cap = (s) => (getLang() === 'en' && s ? s[0].toUpperCase() + s.slice(1) : s);
const readBtn = (target) => `<button type="button" class="ghost speak" data-act="speak" data-target="${target}">${esc(t('read'))}</button>`;
const ctaBar = (inner) => `<div class="cta-bar">${inner}</div>`;
const backLink = (href, key) => `<p class="back"><a class="link" href="${href}">${esc(t(key))}</a></p>`;

// "You may be looking for …" — built from the facts only, so it works without AI.
export function summaryOf(f) {
  const needs = needsOf(f);
  if (!needs.length) return '';
  const hi = getLang() === 'hi';
  const need = joinList(needs.map((n) => (hi ? needL(n) : needL(n)[0].toLowerCase() + needL(n).slice(1))));
  const st = V(f, 'stage'), act = V(f, 'activity'), place = V(f, 'city') || V(f, 'state'), a = V(f, 'amount');
  const biz = act ? t(st === 'new' ? 'sum.newBiz' : st ? 'sum.runBiz' : 'sum.biz', { a: activityL(act) }) : st ? t(st === 'new' ? 'sum.newAny' : 'sum.runAny') : '';
  return t('sum.line', {
    need,
    biz: biz ? ' ' + t('sum.for', { b: biz }) : '',
    place: place ? ' ' + t('sum.in', { p: place }) : '',
    amount: a != null ? ' ' + t('sum.amount', { a: money(a) }) : '',
  });
}

/* ---------------- Journey bar ---------------- */
export function journeyHtml(step) {
  if (!step) return '';
  return t('journey').map((s, i) => {
    const n = i + 1, cls = n < step ? 'done' : n === step ? 'cur' : '';
    return `<li class="${cls}" ${n === step ? 'aria-current="step"' : ''}><span class="n">${n < step ? '✓' : n}</span><span class="lbl">${esc(s)}</span></li>`;
  }).join('');
}

/* ---------------- Fact chips (the merged "what we understood") ---------------- */
function chipStrip() {
  // Core facts only (plus anything we assumed, so it can be confirmed); the full list lives under "Change my answers".
  const core = ['need', 'amount', 'activity', 'stage', 'city'];
  const keys = [...core, ...Object.keys(S.facts).filter((k) => hasLabel(k) && !core.includes(k) && S.facts[k].o === 'inferred' && !['sector', 'state'].includes(k))];
  const chips = keys.filter((k) => S.facts[k] && V(S.facts, k) != null).map((k) => {
    const assumed = S.facts[k].o === 'inferred';
    return `<button type="button" class="fchip ${assumed ? 'assumed' : ''}" data-act="chip" data-k="${k}" aria-label="${esc(t('chips.edit', { x: label(k) }))}">${esc(fmt(k, V(S.facts, k)))} <span aria-hidden="true">${assumed ? '?' : '✎'}</span></button>`;
  });
  if (!chips.length) return '';
  return `<div class="chips"><span class="small">${esc(t('chips.t'))}</span> ${chips.join('')}</div>`;
}
const coverageLine = (f) => { const c = coverage(f); return `<p class="small cov">${esc(t('cov.line', { k: c.known.length, n: c.total }))} <a class="link" href="#/profile">${esc(t('cov.add'))}</a></p>`; };

/* ---------------- Welcome back ---------------- */
function continueCard() {
  if (!S.story) return '';
  const ids = Object.keys(S.tracked).filter((id) => byId(id)).sort((a, b) => String(S.tracked[b].added).localeCompare(String(S.tracked[a].added)));
  let line, href;
  if (ids.length) {
    const id = ids[0], o = S.tracked[id].outcome;
    if (o && o !== 'notyet') { line = t('welcome.track', { n: nameOf(byId(id)) }) + ` (${outcomeL(o)})`; href = `#/track/${id}`; }
    else { line = t('welcome.getready', { n: nameOf(byId(id)) }); href = `#/explore/${id}`; }
  } else if (S.lastTop.length) { line = t('welcome.options'); href = '#/results'; }
  else return '';
  return `<div class="welcome"><b>${esc(t('welcome.t'))}</b><p>${esc(line)}</p><div class="row"><a class="btn primary" href="${href}">${esc(t('welcome.continue'))}</a><button class="secondary" data-act="new-need">${esc(t('welcome.new'))}</button></div></div>`;
}

/* ---------------- ① Tell us ---------------- */
const TILE_ICONS = ['❓', '🔧', '🧾', '💰', '🌱', '🛒'];
export function startView({ canSpeak }) {
  const tiles = t('tiles');
  const order = [1, 3, 2, 4, 5, 0]; // "I don't know" last
  return `${continueCard()}
  <h1>${esc(t('start.h1'))}</h1>
  <p class="sub">${esc(t('start.sub'))}</p>
  <div class="reassure">${t('start.reassure').map((x) => `<span>✓ ${esc(x)}</span>`).join('')}</div>
  <div class="speakbox" ${canSpeak ? '' : 'hidden'} id="speakBox"><button class="mic big" id="micBtn" data-act="mic" data-focus="1">${esc(t('start.speak'))}</button><span class="small">${esc(t('start.speakHint'))}</span></div>
  <p class="small note-inline" id="noVoice" ${canSpeak ? 'hidden' : ''}>${esc(t('mic.noVoice'))}</p>
  <div class="small lead">${esc(t('start.orPick'))}</div>
  <div class="tiles">${order.map((i) => `<button class="tile" data-act="tile" data-i="${i}"><span class="ico" aria-hidden="true">${TILE_ICONS[i]}</span><span><b>${esc(tiles[i][0])}</b><span>${esc(tiles[i][1])}</span></span></button>`).join('')}</div>
  <label class="small lead" for="story">${esc(t('start.orType'))}</label>
  <div class="typebox">
    <textarea id="story" rows="3" placeholder="${esc(t('start.ph'))}">${esc(S.story)}</textarea>
    <button type="button" class="mic-inline" id="micInline" data-act="mic" title="${esc(t('mic.inlineTitle'))}" aria-label="${esc(t('mic.inlineTitle'))}" ${canSpeak ? '' : 'hidden'}>${esc(t('mic.inline'))}</button>
  </div>
  <p class="small" id="micNote" aria-live="polite"></p>
  <p class="trust">🔒 ${esc(t('start.trust'))}</p>
  <details><summary class="small">${esc(t('start.demos'))}</summary><div class="demo">${t('demos').map((d, i) => `<button data-act="demo" data-i="${i}">${esc(d[0])}</button>`).join('')}</div></details>
  ${ctaBar(`<button class="primary" id="goBtn" data-act="start">${esc(t('start.continue'))}</button>`)}`;
}

/* ---------------- Full list of understood facts (reached via "Change my answers") ---------------- */
export function understandView() {
  const rows = Object.keys(S.facts).filter(hasLabel).map((k) => {
    const x = S.facts[k];
    const o = x.v === 'unknown' || x.v === 'declined' ? 'unknown' : ORIGIN_CLS[x.o] ? x.o : 'said';
    return `<div class="fact"><div><div class="k">${esc(label(k))}</div><div class="v">${esc(fmt(k, x.v))}</div></div>
      <div class="row"><span class="origin ${ORIGIN_CLS[o]}">${esc(t('origin.' + o))}</span><button class="link" data-act="drop-fact" data-k="${k}">${esc(t('check.remove'))}</button></div></div>`;
  }).join('');
  const summary = summaryOf(S.facts);
  return `<h2>${esc(t('check.h2'))}</h2>
  <p class="sub">${esc(t('check.sub'))}</p>
  ${summary ? `<div class="note"><b>${esc(t('check.summary'))}</b> ${esc(summary)}</div>` : ''}
  <div class="facts">${rows || `<div class="note">${esc(t('check.empty'))}</div>`}</div>
  <p class="small"><span class="origin o-said">${esc(t('origin.said'))}</span> ${esc(t('check.legend.said'))} · <span class="origin o-inferred">${esc(t('origin.inferred'))}</span> ${esc(t('check.legend.inferred'))} · <span class="origin o-answered">${esc(t('origin.answered'))}</span> ${esc(t('check.legend.answered'))}</p>
  <div class="actions"><a class="btn secondary" href="#/">${esc(t('check.back'))}</a><a class="btn secondary" href="#/profile">${esc(t('cov.add'))}</a></div>
  ${ctaBar(`<button class="primary" data-act="confirm">${esc(t('check.ok'))}</button>`)}`;
}

/* ---------------- ② A few questions ---------------- */
export function questionView() {
  const slot = S.curQ;
  const q = QUESTIONS[slot];
  const n = S.asked.filter((s) => s !== 'need').length;
  const R = rank(S.facts);
  const desc = (o) => (slot === 'need' ? needS(o[0]) : '');
  const summary = summaryOf(S.facts);
  const help = S.needHelp
    ? `<div class="banner help"><b>${esc(t('q.helpTitle'))}</b>${esc(t('q.helpText'))}<div class="actions left"><a class="btn ghost" href="#/help">${esc(t('res.talkLower'))}</a></div></div>` : '';
  return `${summary ? `<p class="small">${esc(summary)}</p>` : ''}${chipStrip()}
    <div class="qprog">${esc(slot === 'need' ? t('q.first') : t('q.n', { n: n + 1, max: MAX_QUESTIONS }))}</div>
    <h2>${esc(qText(slot))}</h2>
    <p class="small"><b>${esc(t('q.whyAsk'))}</b> ${esc(qWhy(slot))}</p>
    ${help}
    <div class="opts">${q.opts.map((o, i) => `<button class="opt" data-act="opt" data-i="${i}">${esc(optL(slot, o[0]))}${desc(o) ? `<div class="small">${esc(desc(o))}</div>` : ''}</button>`).join('')}
      <button class="opt dk" data-act="dk">🤷 ${esc(t('q.dk'))}</button></div>
    ${q.amount ? `<form class="row" data-form="amount"><input id="amtIn" class="grow" placeholder="${esc(t('q.amountPh'))}" aria-label="${esc(label('amount'))}"><button class="ghost" type="submit">${esc(t('q.use'))}</button></form><p class="small err" id="amtErr" aria-live="polite"></p>` : ''}
    <p><button class="link" data-act="show-results">${esc(t('q.showNow'))}</button></p>
    <aside class="side expert-only"><b>${esc(t('q.whyTitle'))}</b> ${S.curAffects.map((id) => esc(nameOf(byId(id)))).join(' · ') || '—'}<br>${esc(t('q.considering', { n: R.top.length }))}: ${R.top.slice(0, 5).map((x) => esc(nameOf(x.p))).join(' · ')}</aside>`;
}

/* ---------------- Shared route pieces ---------------- */
function whyBits(r) {
  const f = S.facts, bits = [];
  if (r.need) { const l = needL(r.need); bits.push(t('why.need', { need: getLang() === 'hi' ? l : l[0].toLowerCase() + l.slice(1) })); }
  const a = V(f, 'amount');
  if (a != null && r.p.amount && a >= r.p.amount.min && a <= r.p.amount.max) bits.push(t('why.amount', { a: money(a) }));
  const st = V(f, 'stage');
  if (st) bits.push(t(st === 'new' ? 'why.new' : 'why.existing'));
  const act = V(f, 'activity');
  if (act && (r.p.relevantIf || r.id === 'mudra')) bits.push(t('why.fits', { a: activityL(act) }));
  let s = cap(bits.length ? joinList(bits) : t('why.default')) + (getLang() === 'hi' ? '।' : '.');
  const cat = r.p.category?.(f);
  if (cat) s += ' ' + t('why.cat', { a: money(a), c: td('mudra.' + cat, cat) });
  return s;
}
export function reasonText(r) {
  if (r.p.status === 'verify') return t('reason.verify');
  if (r.blocked) return t('reason.notMet', { x: tc(r.blocked.text) });
  if (r.overMax) return t('reason.over', { max: money(r.p.amount.max), a: money(V(S.facts, 'amount')) });
  return t(r.status === 'weak' ? 'hidden.weak' : 'hidden.lower');
}
const badge = (r) => (fitBand(r.fit) === 'strong' ? `<span class="badge good">${esc(t('badge.good'))}</span>` : `<span class="badge check">${esc(t('badge.check'))}</span>`);
const familyChip = (p) => `<span class="chip ${p.family === 'gov' ? 'b' : ''}">${esc(t(p.family === 'gov' ? 'chip.gov' : 'chip.fin'))}</span>`;
const supportChip = (p) => (p.support ? `<span class="chip ${p.repay ? 'a' : 'g'}">${esc(t('sup.' + p.support))}</span>` : '');
function sourceLine(p) {
  const stale = isStale() ? ` · <b class="warn-text">${esc(t('src.stale'))}</b>` : '';
  if (!p.src) return `${esc(t('card.generic'))}${stale}`;
  return `${esc(t('card.source'))} <a href="${esc(p.src.u)}" target="_blank" rel="noopener">${esc(tc(p.src.t))}</a> · ${esc(t('src.checked', { d: dateL(CHECKED) }))}${stale}`;
}
function condsOf(p) {
  const r = evaluate(p, S.facts);
  return r ? r.conds : p.conditions.map((c) => ({ ...c, state: c.test(S.facts) })).filter((c) => c.state);
}
// The one condition most worth confirming: an unknown required condition other than the lender's own assessment.
function keyCondition(r) {
  const c = r.conds.find((x) => x.state === 'unknown' && x.kind === 'mandatory' && x.slot !== 'lender')
    || r.conds.find((x) => x.state === 'unknown' && x.slot !== 'lender')
    || r.conds.find((x) => x.state === 'todo')
    || r.conds.find((x) => x.slot === 'lender');
  return c ? tc(c.text) : null;
}
// Facts we could ask the owner that would firm up this route.
function missingFacts(r) {
  const slots = [...new Set(r.conds.filter((c) => c.state === 'unknown' && QUESTIONS[c.slot] && S.facts[c.slot] === undefined).map((c) => c.slot))];
  return slots.map(label);
}
function amountText(p) {
  if (!p.amount) return t('terms.check');
  return p.amount.min > 0 ? t('terms.range', { min: money(p.amount.min), max: money(p.amount.max) }) : t('terms.upto', { max: money(p.amount.max) });
}
function condLi(cs, used) {
  return cs.map((c) => `<li>${g(tc(c.text), used)}${c.basis === 'typical' ? ` <span class="chip">${esc(t('chip.typical'))}</span>` : ''}${c.kind === 'conditional' ? ` <span class="chip">${esc(t('chip.ifApplicable'))}</span>` : ''}</li>`).join('');
}
function bars(parts) {
  return Object.entries(parts).map(([k, [v, w]]) => `<div class="small split"><span>${esc(t('dim.' + k))}</span><span>${Math.round(v * w)} / ${w}</span></div><div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div>`).join('');
}

/* ---------------- ③ Your options ---------------- */
function bestCard(r) {
  const p = r.p, used = new Set();
  const missing = missingFacts(r);
  return `<section class="best" id="best">
    <div class="best-t">${esc(t('best.t'))}</div>
    <div class="name">${esc(nameOf(p))}</div><div>${badge(r)} ${familyChip(p)} ${supportChip(p)}</div>
    <p class="big">${g(tc(p.next), used)}</p>
    <p>${g(tc(p.short), used)}</p>
    <p class="small"><b>${esc(t('card.whyYou'))}</b> ${esc(whyBits(r))}</p>
    ${keyCondition(r) ? `<p class="small"><b>${esc(t('card.keyCond'))}</b> ${g(keyCondition(r), used)}</p>` : ''}
    ${missing.length ? `<p class="small"><b>${esc(t('card.missing'))}</b> ${esc(missing.join(', '))}</p>` : ''}
    <p class="small src">${sourceLine(p)}</p>
    <div class="row"><button class="primary" data-act="explore" data-id="${r.id}">${esc(t('card.getReady'))}</button><a class="btn ghost" href="#/route/${r.id}">${esc(t('card.details'))}</a>${readBtn('best')}</div>
  </section>`;
}
function optionCard(r) {
  const p = r.p, used = new Set();
  const key = keyCondition(r), missing = missingFacts(r);
  return `<article class="card" id="c-${r.id}">
    <div class="top"><div class="name">${esc(nameOf(p))}</div><div>${badge(r)} ${familyChip(p)} ${supportChip(p)}</div></div>
    <p>${g(tc(p.short), used)}</p>
    <p class="small"><b>${esc(t('card.whyYou'))}</b> ${esc(whyBits(r))}</p>
    ${key ? `<p class="small"><b>${esc(t('card.keyCond'))}</b> ${g(key, used)}</p>` : ''}
    ${missing.length ? `<p class="small"><b>${esc(t('card.missing'))}</b> ${esc(missing.join(', '))}</p>` : ''}
    <p class="small"><b>${esc(t('card.todo'))}</b> ${g(tc(p.next), used)}</p>
    <p class="small src">${sourceLine(p)}</p>
    <div class="row"><a class="btn ghost" href="#/route/${r.id}">${esc(t('card.details'))}</a><button class="ghost" data-act="explore" data-id="${r.id}">${esc(t('card.getReady'))}</button></div>
  </article>`;
}
function helpReasons(R) {
  const w = [];
  if (S.dk >= 2) w.push(t('help.dk'));
  const top = R.top[0];
  if (top && top.conds.filter((c) => c.state === 'unknown' && c.kind === 'mandatory').length >= 3) w.push(t('help.conds'));
  if (top && top.p.steps >= 5) w.push(t('help.steps'));
  if (!R.top.length) w.push(t('help.none'));
  return w;
}
export const FILTERS = ['all', 'gov', 'fin', 'online', 'inperson', 'fast'];
function passes(r, f) {
  const ch = channelOf(r.p);
  switch (f) {
    case 'gov': return r.p.family === 'gov';
    case 'fin': return r.p.family === 'fin';
    case 'online': return ch !== 'inperson';
    case 'inperson': return ch !== 'online';
    case 'fast': return r.p.speed === 'fast';
    default: return true;
  }
}
export function resultsView() {
  const f = S.facts, R = rank(f);
  const reviewed = CORPUS.filter((p) => p.type === 'direct').length;
  const summary = summaryOf(f);
  let h = `<h2>${esc(t('res.h2'))}</h2>
    <p class="sub">${summary ? esc(summary) + ' ' : ''}${esc(t('res.lead', { n: reviewed, m: R.top.length }))}</p>
    ${chipStrip()}${coverageLine(f)}`;
  if (!needsOf(f).length) {
    h += `<div class="banner"><b>${esc(t('res.needMore.t'))}</b>${esc(t('res.needMore.b'))} <button class="link" data-act="confirm">${esc(t('res.answerOne'))}</button> ${esc(t('res.or'))} <a class="link" href="#/help">${esc(t('res.talkLower'))}</a>.</div>`;
  } else if (!R.top.length) {
    h += `<div class="banner"><b>${esc(t('res.none.t'))}</b>${esc(t('res.none.b'))}<div class="actions left"><a class="btn primary" href="#/help">${esc(t('res.talkLower'))}</a></div></div>`;
  } else if (R.noGov && R.wantsMoney) {
    const cg = R.fin.some((r) => enablersFor(r, f).length);
    h += `<div class="banner"><b>${esc(t('res.noGov.t'))}</b>${esc(t('res.noGov.b'))}${cg ? g(t('res.noGov.cg')) : ''}<div class="small expert-only">${esc(t('res.noGov.cov', { n: CORPUS.filter((p) => p.family === 'gov').length }))}</div></div>`;
  }
  if (V(f, 'udyam') === 'no') {
    const needU = R.top.filter((r) => r.conds.some((c) => c.slot === 'udyam'));
    h += `<div class="note"><b>${esc(t('res.udyam.t'))}</b> ${esc(needU.length ? t('res.udyam.some', { list: needU.map((r) => nameOf(r.p)).join(', ') }) : t('res.udyam.none'))} ${ext('https://udyamregistration.gov.in/', 'udyamregistration.gov.in')}</div>`;
  }
  const filter = FILTERS.includes(S.filter) ? S.filter : 'all';
  const list = R.top.filter((r) => passes(r, filter));
  if (R.top.length > 2) {
    h += `<div class="filters" role="group" aria-label="${esc(t('filter.label'))}">${FILTERS.map((k) => `<button class="fbtn ${k === filter ? 'sel' : ''}" data-act="filter" data-f="${k}" aria-pressed="${k === filter}">${esc(t('filter.' + k))}</button>`).join('')}</div>`;
  }
  if (R.top.length && !list.length) h += `<div class="note">${esc(t('filter.none'))} <button class="link" data-act="filter" data-f="all">${esc(t('filter.clear'))}</button></div>`;
  const [best, ...others] = list;
  if (best) h += bestCard(best);
  // Group the rest by what they help with, strongest group first.
  const groups = [];
  for (const r of others) {
    let grp = groups.find((x) => x.k === r.p.support);
    if (!grp) groups.push((grp = { k: r.p.support, items: [] }));
    grp.items.push(r);
  }
  for (const grp of groups) {
    h += `<section class="group"><h3>${esc(t('grp.' + grp.k))}</h3><p class="small">${esc(t('grp.' + grp.k + 'S'))}</p><div class="cards">${grp.items.map(optionCard).join('')}</div></section>`;
  }
  if (R.top.length > 1) h += `<div class="actions left"><a class="btn secondary" href="#/compare">${esc(t('res.compare'))}</a><a class="btn secondary" href="#/funding">${esc(t('nav.funding'))}</a></div>`;
  if (R.hidden.length) h += `<details><summary>${esc(t('hidden.sum', { n: R.hidden.length }))}</summary><ul class="list no">${R.hidden.map((r) => `<li><a href="#/route/${r.id}"><b>${esc(nameOf(r.p))}</b></a> — ${esc(reasonText(r))}</li>`).join('')}</ul></details>`;
  const help = helpReasons(R);
  if (help.length) h += `<div class="banner help"><b>${esc(t('help.t'))}</b>${esc(help.join(' '))}<div class="actions left"><a class="btn ghost" href="#/help">${esc(t('res.talkLower'))}</a></div></div>`;
  h += `<div class="warn"><b>${esc(t('res.warn.t'))}</b> ${esc(t('res.warn.b'))}${t('translationNote') ? ' ' + esc(t('translationNote')) : ''}</div>
    <p><a class="link" href="#/check">${esc(t('res.back'))}</a></p>`;
  if (best) h += ctaBar(`<button class="primary" data-act="explore" data-id="${best.id}">${esc(t('cta.getReady', { n: nameOf(best.p) }))}</button>`);
  return h;
}

/* ---------------- Route detail ---------------- */
export function routeView(id) {
  const p = byId(id), f = S.facts, r = evaluate(p, f), used = new Set();
  const conds = condsOf(p);
  const by = (st) => conds.filter((c) => c.state === st);
  const gates = conds.filter((c) => c.kind === 'mandatory');
  const saved = !!S.tracked[id];
  const cov = coverage(f);
  const icon = { met: '✓', unknown: '?', not_met: '✕', todo: '→' };
  const statusText = p.status === 'verify' ? `<span class="chip a">${esc(t('status.verifyChip'))}</span>` : esc(t('status.recorded'));
  let why;
  if (!r) why = `<p>${esc(t('detail.noMatch'))}</p>`;
  else if (r.status === 'no' || r.status === 'weak') why = `<p>${esc(reasonText(r))}</p>`;
  else why = `<p>${esc(whyBits(r))}</p>`;
  const terms = [
    ['terms.type', g(tc(p.mechanism || p.plain), used)],
    ['terms.amount', esc(amountText(p))],
    ['terms.cost', esc(p.repay ? t('terms.check') : t('terms.notLoan'))],
    ['terms.fees', esc(t('terms.check'))],
    ['terms.repayment', esc(p.repay ? t('terms.repay') : t('terms.noRepay'))],
    ...(p.repay ? [['terms.collateral', esc(p.collateralFree ? t('terms.collFree') : t('terms.collAsk'))]] : []),
    ['terms.time', esc(t('speed.' + p.speed) + ' ' + t('terms.estimate'))],
  ];
  const official = p.src?.u || p.route.url;
  return `${backLink('#/results', 'act.back')}
  <h2>${esc(nameOf(p))}</h2>
  <p class="small">${esc(tc(p.provider))}</p>
  <div>${familyChip(p)} ${supportChip(p)} ${r && (r.status === 'yes' || r.status === 'check') ? badge(r) : ''}</div>
  <p class="small">${esc(t('detail.status'))} ${statusText} · ${sourceLine(p)}</p>
  <p>${g(tc(p.plain), used)}</p>

  <section class="box"><h3>${esc(t('detail.why'))}</h3>${why}</section>

  <section class="box"><h3>${esc(t('detail.fit'))}</h3>
    <p class="small">${esc(t('detail.fitS'))}</p>
    ${r?.blocked ? `<div class="note bad"><b>${esc(t('detail.unmet'))}</b> ${g(tc(r.blocked.text), used)} <span class="small">(${esc(t('card.source'))} ${esc(p.src ? tc(p.src.t) : t('card.generic'))})</span></div>` : ''}
    <div class="cols"><div><b class="small">${esc(t('card.know'))}</b><ul class="list met">${condLi(by('met'), used) || `<li>${esc(t('card.only'))}</li>`}</ul></div>
      <div><b class="small">${esc(t('card.check'))}</b>${by('unknown').length || by('todo').length ? `<ul class="list unk">${condLi(by('unknown'), used)}</ul><ul class="list todo">${condLi(by('todo'), used)}</ul>` : `<p class="small">${esc(t('card.nothing'))}</p>`}</div></div>
    ${gates.length ? `<p class="small"><b>${esc(t('detail.gates'))}</b></p><ul class="small gates">${gates.map((c) => `<li><span aria-hidden="true">${icon[c.state]}</span> ${esc(tc(c.text))} — <i>${esc(t('gate.' + c.state))}</i></li>`).join('')}</ul>` : ''}
    <p class="small"><b>${esc(t('detail.evidence'))}</b> ${esc(t('ev.' + evidenceOf(p)))}</p>
    <p class="small">${esc(t('cov.line', { k: cov.known.length, n: cov.total }))} <a class="link" href="#/profile">${esc(t('cov.add'))}</a></p>
    ${r ? `<div class="score expert-only"><b>${esc(t('score.rel', { n: r.fit }))}</b> <span class="small">${esc(t('fit.' + fitBand(r.fit)))}</span>${bars(r.parts)}<p class="small">${esc(t('score.note'))}</p></div>` : ''}
    ${enablersFor({ p }, f).map(({ e, conds: ec }) => { const u = ec.filter((c) => c.state === 'unknown'); return `<div class="enabler"><b>${esc(t('card.alsoAsk', { n: nameOf(e) }))}</b> — ${g(tc(e.plain), used)}${u.length ? `<div class="small">${esc(t('card.toCheck', { x: u.map((c) => tc(c.text)).join('; ') }))}</div>` : ''}</div>`; }).join('')}
  </section>

  <section class="box"><h3>${esc(t('detail.terms'))}</h3>
    <dl class="kv">${terms.map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${v}</dd>`).join('')}</dl>
    <p class="small">${esc(t('detail.termsNote'))}</p>
  </section>

  <section class="box"><h3>${esc(t('detail.process'))}</h3>
    <p><b>${esc(t('detail.channel'))}</b> ${esc(t('ch.' + channelOf(p)))}</p>
    <ol class="steps-list">${stepsFor(p).map((s) => `<li>${g(tc(s), used)}</li>`).join('')}</ol>
    <p class="small">${esc(t('detail.broad'))}</p>
    <p class="small"><b>${esc(t('card.route'))}</b> ${esc(tc(p.route.text))}${p.route.url ? ` — ${ext(p.route.url, host(p.route.url))}` : ''}</p>
  </section>

  <div class="actions left">
    <a class="btn primary" href="#/explore/${id}">${esc(t('detail.start'))}</a>
    <a class="btn secondary" href="#/compare">${esc(t('detail.compare'))}</a>
    <button class="secondary" data-act="${saved ? 'untrack' : 'save'}" data-id="${id}" aria-pressed="${saved}">${esc(t(saved ? 'detail.saved' : 'detail.save'))}</button>
    <button class="secondary" data-act="draft" data-id="${id}" data-kind="enquiry">${esc(t('detail.draft'))}</button>
    ${official ? `<a class="btn secondary" href="${esc(official)}" target="_blank" rel="noopener">${esc(t('detail.official'))} ↗</a>` : ''}
  </div>`;
}

/* ---------------- Compare ---------------- */
export function compareView() {
  const R = rank(S.facts);
  if (R.top.length < 2) return `${backLink('#/results', 'act.back')}<h2>${esc(t('cmp.h2'))}</h2><div class="note">${esc(t('cmp.few'))}</div>`;
  const check = (r) => r.conds.filter((c) => (c.state === 'unknown' || c.state === 'todo') && c.slot !== 'lender').map((c) => tc(c.text).split(' — ')[0]).slice(0, 2).join('; ') || t(r.conds.some((c) => c.slot === 'lender') ? 'check.lender' : 'check.confirmTerms');
  const rows = R.top.map((r) => `<tr>
    <td><a href="#/route/${r.id}"><b>${esc(nameOf(r.p))}</b></a><br>${badge(r)} ${familyChip(r.p)}</td>
    <td>${esc(t('sup.' + r.p.support))}</td>
    <td>${esc(amountText(r.p))}</td>
    <td>${esc(r.p.repay ? t('cmp.repay') : t('terms.notLoan'))}</td>
    <td>${esc(t('speed.' + r.p.speed))} · ${esc(t('steps', { n: r.p.steps }))}<br><span class="small">${esc(t('terms.estimate'))}</span></td>
    <td>${esc(check(r))}</td>
    <td>${r.p.src ? `<a href="${esc(r.p.src.u)}" target="_blank" rel="noopener">${esc(tc(r.p.src.t))}</a>` : esc(t('cmp.general'))}</td></tr>`).join('');
  return `${backLink('#/results', 'act.back')}<h2>${esc(t('cmp.h2'))}</h2><p class="sub">${esc(t('cmp.sub'))}</p>
  <div class="tablewrap"><table><thead><tr><th>${esc(t('th.route'))}</th><th>${esc(t('th.type'))}</th><th>${esc(t('th.amount'))}</th><th>${esc(t('th.cost'))}</th><th>${esc(t('th.how'))}</th><th>${esc(t('th.check'))}</th><th>${esc(t('th.source'))}</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="small">${esc(t('res.noBest'))}</p>`;
}

/* ---------------- ④ Get ready: route checklist + drafts ---------------- */
function itemHtml(id, it, tr) {
  const st = itemStatus(tr, it);
  const states = it.doc ? DOC_STATES : ITEM_STATES;
  const help = it.doc ? docHelp(it.text, getLang()) : null;
  const note = tr?.notes?.[it.key] || '';
  const tag = it.doc
    ? (it.basis === 'typical' ? `<span class="chip">${esc(t('act.typicalConfirm'))}</span>` : `<span class="chip b">${esc(t('cl.official'))}</span>`)
    : it.state ? `<span class="chip ${{ met: 'g', unknown: 'a', todo: 'b', not_met: 'r' }[it.state]}">${esc(t('cl.state.' + it.state))}</span>` : '';
  return `<div class="clitem ${isComplete(st) ? 'done' : ''} ${st === 'missing' ? 'need' : ''}">
    <div class="cltext">${g(tc(it.text))} ${tag}</div>
    <label class="clstatus"><span>${esc(t('cl.status'))}</span>
      <select data-status data-id="${id}" data-k="${esc(it.key)}" data-doc="${it.doc ? '1' : ''}">
        ${it.doc ? `<option value="" ${st ? '' : 'selected'}>${esc(t('doc.unset'))}</option>` : ''}
        ${states.map((v) => `<option value="${v}" ${st === v ? 'selected' : ''}>${esc(t((it.doc ? 'doc.' : 'st.') + v))}</option>`).join('')}
      </select></label>
    ${it.doc && st === 'missing' ? `<p class="small howget"><b>${esc(t('ready.howGet'))}</b> ${g(help ? help.how : t('ready.noHelp'))}</p>` : ''}
    ${it.doc ? `<details class="what"><summary>${esc(t('ready.what'))}</summary><p class="small">${g(help ? help.what : t('ready.whatNone'))}</p></details>` : ''}
    ${it.state === 'unknown' ? `<p class="small">${esc(t('cl.confirmHow'))}</p>` : ''}
    <details class="what"><summary>${esc(t(note ? 'cl.noteEdit' : 'cl.noteAdd'))}</summary><textarea class="note-in" rows="2" data-note data-id="${id}" data-k="${esc(it.key)}" aria-label="${esc(t('cl.noteAdd'))}">${esc(note)}</textarea></details>
  </div>`;
}
function sectionHtml(id, p, s, items, tr) {
  const extra = {
    docs: `<p class="small">${esc(t('cl.docsS'))}</p>`,
    steps: `<p class="small">${esc(t('detail.broad'))}</p>`,
    follow: `<p class="small">${esc(t('cl.followS', { s: tc(grievanceFor(p).src) }))} <a href="#/help">${esc(t('cl.followLink'))}</a></p>`,
  }[s] || '';
  const body = items.length ? items.map((it) => itemHtml(id, it, tr)).join('') : `<p class="small">${esc(t(s === 'docs' ? 'cl.noDocs' : 'cl.nothing'))}</p>`;
  return `<div class="clsec"><h4>${esc(t('cl.' + s))}</h4>${extra}${body}</div>`;
}
export const draftKinds = (p) => ['enquiry', ...(p.repay || p.support === 'subsidy' ? ['summary'] : []), 'sheet'];
export function readyView(id) {
  const p = byId(id), tr = S.tracked[id], cl = buildChecklist(p, S.facts), rd = readiness(cl, tr);
  const asks = [...t(p.asks === 'loan' ? 'lenderAsks' : 'officeAsks'), ...(p.repay && V(S.facts, 'collateral') === 'no' ? [t('ask.collateral')] : [])];
  const inPerson = channelOf(p) !== 'online';
  const used = new Set();
  return `${backLink('#/route/' + id, 'ready.back')}
  <h2>${esc(t('ready.h2', { n: nameOf(p) }))}</h2>
  <p>${g(tc(p.short), used)}</p><p class="small">${esc(t('ready.sub'))}</p>
  <section class="box" id="papers"><div class="row split"><h3>${esc(t('ready.checklist'))}</h3><span class="small">${esc(t('ready.progress', { d: rd.done, n: rd.total }))}</span></div>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${rd.pct}" aria-label="${esc(t('ready.checklist'))}"><i style="width:${rd.pct}%"></i></div>
    <p class="small">${esc(t('ready.notApproval'))}</p>
    ${SECTIONS.map((s) => sectionHtml(id, p, s, cl[s], tr)).join('')}
    ${readBtn('papers')}
  </section>
  <section class="box" id="drafts"><h3>${esc(t('drafts.h'))}</h3><p class="small">${esc(t('drafts.sub'))}</p>
    <div class="row">${draftKinds(p).map((k) => `<button class="secondary" data-act="${k === 'sheet' ? 'sheet' : 'draft'}" data-id="${id}" data-kind="${k}">${esc(t('draft.' + k))}${tr?.draftState?.[k] === 'prepared' ? ' ✓' : ''}</button>`).join('')}</div></section>
  <section class="box"><h3>${esc(t('ready.confirm'))}</h3><ul class="small">${asks.slice(0, 7).map((q) => `<li>${g(q)}</li>`).join('')}</ul></section>
  <section class="box"><h3>${esc(t('ready.where'))}</h3>
    <p>${g(tc(p.next))}${p.route.url ? `<br>${ext(p.route.url, host(p.route.url))}` : ''}</p>
    ${inPerson ? pinForm(id) : ''}
  </section>
  ${backLink('#/results', 'act.back')}
  ${ctaBar(`<a class="btn primary" href="#/track/${id}">${esc(t('cta.applied'))}</a>`)}`;
}
function pinForm(id = '') {
  return `<p class="small">${esc(t(id ? 'act.nearS' : 'pf.pinWhy'))}</p><form class="row" data-form="pin" data-id="${id}"><input id="pin" class="grow" maxlength="6" inputmode="numeric" autocomplete="postal-code" value="${esc(S.pin)}" placeholder="${esc(t('act.pinPh'))}" aria-label="${esc(t('act.pinPh'))}"><button class="ghost" type="submit">${esc(t('act.search'))}</button></form><div id="near" aria-live="polite"></div>`;
}
export function nearbyHtml(id, pin) {
  const p = id ? byId(id) : null;
  const kinds = p ? [p.access === 'lender' || p.asks === 'loan' ? 'bank' : null, 'dic', 'dfo', p.access === 'mixed' ? 'csc' : null].filter(Boolean) : ['dic', 'dfo', 'bank'];
  // Map queries stay in English (better results); labels follow the UI language.
  return `<ul class="small">${kinds.map((k) => `<li><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STRINGS.en['near.' + k] + ' near ' + pin)}">${esc(t('near.fmt', { x: t('near.' + k), pin }))} ↗</a></li>`).join('')}</ul><p class="small">${esc(t('near.note'))}</p>`;
}

/* ---------------- ⑤ Apply & track ---------------- */
export function trackView(id) {
  const p = byId(id), o = S.tracked[id]?.outcome;
  const opts = t('track.opts');
  let resp = '';
  if (o === 'notyet') resp = `<p>${esc(t('track.notyet'))}</p><div class="row"><a class="btn secondary" href="#/explore/${id}">${esc(t('track.notyetBtn'))}</a><button class="ghost" data-act="sheet" data-id="${id}">${esc(t('draft.sheet'))}</button></div>`;
  else if (o === 'waiting') resp = `<p>${esc(t('track.waiting'))}</p>`;
  else if (o === 'approved') resp = `<p class="big">${esc(t('track.approved'))}</p><p>${esc(t('track.approvedQ'))}</p><button class="secondary" data-act="new-need">${esc(t('track.newNeed'))}</button>`;
  else if (o === 'rejected') {
    const others = rank(S.facts).top.filter((r) => r.id !== id).slice(0, 3);
    resp = `<p>${esc(t('track.rejected'))}</p><p class="small">${esc(t('track.rejectedAsk'))}</p>
      ${others.length ? `<h3>${esc(t('track.others'))}</h3>${others.map((r) => `<div class="paper"><b>${esc(nameOf(r.p))}</b> ${badge(r)}<p class="small">${g(tc(r.p.short))}</p><button class="ghost" data-act="explore" data-id="${r.id}">${esc(t('card.getReady'))}</button></div>`).join('')}` : ''}
      <div class="row"><a class="btn ghost" href="#/help">${esc(t('res.talkLower'))}</a><a class="btn ghost" href="#/help">${esc(t('track.complain'))}</a></div>`;
  }
  return `<h2>${esc(t('track.h2', { n: nameOf(p) }))}</h2><p class="sub">${esc(t('track.sub'))}</p>
    <div class="opts">${OUTCOMES.map((k, i) => `<button class="opt ${o === k ? 'sel' : ''}" data-act="outcome" data-id="${id}" data-v="${k}" aria-pressed="${o === k}">${esc(opts[i])}</button>`).join('')}</div>
    ${resp ? `<div class="box" aria-live="polite">${resp}</div>` : ''}
    <p class="small">${esc(t('track.note'))}</p>
    ${ctaBar(`<a class="btn primary" href="#/my-msme">${esc(t('cta.myMsme'))}</a>`)}`;
}

/* ---------------- Summaries shared by My journey and the funding dashboard ---------------- */
function trackedIds() { return Object.keys(S.tracked).filter((id) => byId(id)); }
export function journeySummary() {
  const ids = trackedIds();
  let done = 0, total = 0, dr = 0, dt = 0, next = null;
  for (const id of ids) {
    const p = byId(id), cl = buildChecklist(p, S.facts), rd = readiness(cl, S.tracked[id]);
    done += rd.done; total += rd.total; dr += rd.docsReady; dt += rd.docsTotal;
    if (!next && rd.done < rd.total) {
      const it = SECTIONS.flatMap((s) => cl[s]).find((x) => { const st = itemStatus(S.tracked[id], x); return st !== 'na' && !isComplete(st); });
      if (it) next = `${nameOf(p)}: ${tc(it.text)}`;
    }
  }
  const follow = S.grievances.filter((x) => x.next).sort((a, b) => a.next.localeCompare(b.next))[0];
  if (!next && follow) next = t('sumy.follow', { d: dateL(follow.next) });
  return { saved: ids.length, pct: total ? Math.round((done / total) * 100) : 0, docs: `${dr} / ${dt}`, next: next || t(ids.length ? 'sumy.allDone' : 'sumy.pick'), updated: S.updated ? dateL(S.updated) : '—' };
}
function summaryTiles() {
  const s = journeySummary();
  const tile = (k, v) => `<div class="stat"><span class="small">${esc(t('sumy.' + k))}</span><b>${esc(v)}</b></div>`;
  return `<div class="stats">${tile('saved', String(s.saved))}${tile('progress', s.pct + '%')}${tile('docs', s.docs)}${tile('updated', s.updated)}</div>
    <p class="small"><b>${esc(t('sumy.next'))}</b> ${esc(s.next)}</p>`;
}

/* ---------------- Funding dashboard ---------------- */
export function fundingView() {
  if (!S.story) return `<h2>${esc(t('fund.h2'))}</h2><p class="sub">${esc(t('dash.empty'))}</p>${ctaBar(`<a class="btn primary" href="#/">${esc(t('dash.start'))}</a>`)}`;
  const f = S.facts, R = rank(f);
  const ids = [...new Set([...trackedIds(), ...R.top.map((r) => r.id)])];
  const lanes = { grant: [], loan: [], receivable: [] }, other = [];
  for (const id of ids) { const p = byId(id); const l = LANE[p.support]; (l ? lanes[l] : other).push(p); }
  const row = (p, lane) => {
    const saved = S.tracked[p.id] ? ` <span class="chip g">${esc(t('fund.saved'))}</span>` : '';
    const buyer = p.conditions.find((c) => c.slot === 'buyer_type');
    const kv = [
      ['fund.how', g(tc(p.mechanism))],
      ['terms.amount', esc(amountText(p))],
      ...(lane === 'loan' ? [['fund.cost', esc(t('terms.check'))], ['terms.collateral', esc(p.collateralFree ? t('terms.collFree') : t('terms.collAsk'))]] : []),
      ...(lane === 'grant' && p.repay ? [['fund.loanPart', esc(t('fund.loanPartV'))]] : []),
      ...(lane === 'receivable' ? [
        ['fund.buyer', buyer ? esc(tc(buyer.text)) : esc(p.support === 'remedy' ? t('fund.remedyBuyer') : t('terms.check'))],
        ['fund.recourse', esc(t('rec.' + (p.recourse || (p.support === 'remedy' ? 'na' : 'check'))))],
        ['terms.fees', esc(p.support === 'remedy' ? t('terms.notLoan') : t('terms.check'))],
      ] : []),
    ];
    return `<div class="lrow"><a href="#/route/${p.id}"><b>${esc(nameOf(p))}</b></a>${saved}<dl class="kv small">${kv.map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${v}</dd>`).join('')}</dl></div>`;
  };
  const lane = (k) => `<section class="box lane"><h3>${esc(t('lane.' + k))}</h3><p class="small">${esc(t('lane.' + k + 'S'))}</p>${lanes[k].map((p) => row(p, k)).join('') || `<p class="small">${esc(t('lane.empty'))}</p>`}</section>`;
  const a = V(f, 'amount');
  return `<h2>${esc(t('fund.h2'))}</h2><p class="sub">${esc(t('fund.sub'))}</p>
  ${summaryTiles()}
  <div class="lanes">${lane('grant')}${lane('loan')}${lane('receivable')}</div>
  <section class="box" id="emi"><h3>${esc(t('emi.h'))}</h3><p class="small">${esc(t('emi.sub'))}</p>
    <form class="emi" data-form="emi">
      <label>${esc(t('emi.p'))}<input id="emiP" inputmode="numeric" value="${a != null ? Math.round(a) : ''}"></label>
      <label>${esc(t('emi.r'))}<input id="emiR" inputmode="decimal" placeholder="${esc(t('emi.rPh'))}"></label>
      <label>${esc(t('emi.n'))}<input id="emiN" inputmode="numeric" placeholder="${esc(t('emi.nPh'))}"></label>
      <button class="primary" type="submit">${esc(t('emi.go'))}</button>
    </form><div id="emiOut" aria-live="polite"></div></section>
  ${other.length ? `<section class="box"><h3>${esc(t('fund.other'))}</h3><p class="small">${esc(t('fund.otherS'))}</p><ul class="small">${other.map((p) => `<li><a href="#/route/${p.id}">${esc(nameOf(p))}</a> — ${esc(t('sup.' + p.support))}</li>`).join('')}</ul></section>` : ''}
  <div class="warn">${esc(t('fund.never'))}</div>
  ${backLink('#/results', 'act.back')}`;
}
export function emiHtml(P, rate, n) {
  const r = rate / 1200;
  const emi = r === 0 ? P / n : (P * r * (1 + r) ** n) / ((1 + r) ** n - 1);
  return `<p class="big">${esc(t('emi.out', { e: money(Math.round(emi)) }))}</p><p class="small">${esc(t('emi.total', { i: money(Math.round(emi * n - P)), n }))}</p><div class="warn small">${esc(t('emi.caveat'))}</div>`;
}

/* ---------------- Help & grievance ---------------- */
export function complaintText(type) {
  const g0 = GRIEVANCE[type];
  return [
    t('cm.subject.' + type), '', t('dr.dear'), '', t('cm.body.' + type), '', t('cm.ask.' + type), '',
    t('cm.attach'), ...g0.evidence.map((e) => '- ' + tc(e)), '', t('dr.thanks'), `[${t('dr.name')}]`, `[${t('dr.phone')}]`,
  ].join('\n');
}
export function helpView() {
  const type = GRIEVANCE_TYPES.includes(S.grvType) ? S.grvType : null;
  const gv = type ? GRIEVANCE[type] : null;
  const today = new Date().toISOString().slice(0, 10);
  const records = S.grievances.map((x, i) => `<li><b>${esc(t('grv.type.' + x.type))}</b> · ${esc(t('grv.filedOn', { d: dateL(x.filed) }))}${x.ref ? ' · ' + esc(t('grv.refIs', { r: x.ref })) : ''}${x.next ? ' · ' + esc(t('grv.nextOn', { d: dateL(x.next) })) : ''} <button class="link mute" data-act="grv-del" data-i="${i}">${esc(t('dash.remove'))}</button></li>`).join('');
  return `<h2>${esc(t('help.h2'))}</h2><p class="sub">${esc(t('help.sub'))}</p>
  <section class="box"><h3>${esc(t('saathi.h2'))}</h3><p class="small">${esc(t('saathi.sub'))}</p>
    <div class="cols"><div><b class="small">${esc(t('saathi.will'))}</b><ul class="list met">${t('saathi.willList').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div><b class="small">${esc(t('saathi.wont'))}</b><ul class="list no">${t('saathi.wontList').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
    ${S.story ? `<div class="actions left"><button class="ghost" data-act="note">${esc(t('dash.prepare'))}</button></div>` : ''}
    <p class="small">${esc(t('saathi.foot'))}</p></section>

  <section class="box" id="grv"><h3>${esc(t('grv.h'))}</h3><p class="small">${esc(t('grv.sub'))}</p>
    <p><b>${esc(t('grv.q'))}</b></p>
    <div class="opts">${GRIEVANCE_TYPES.map((k) => `<button class="opt ${k === type ? 'sel' : ''}" data-act="grv-type" data-v="${k}" aria-pressed="${k === type}">${esc(t('grv.type.' + k))}</button>`).join('')}</div>
    ${gv ? `<h4>${esc(t('grv.steps'))}</h4><ol class="steps-list">${gv.steps.map((s) => `<li>${g(tc(s))}</li>`).join('')}</ol>
      <p class="small">${gv.links.map((l) => ext(l.u, tc(l.t))).join(' · ')}<br>${esc(t('card.source'))} ${esc(tc(gv.src))} · ${esc(t('src.checked', { d: dateL(CHECKED) }))}</p>
      <h4>${esc(t('grv.evidence'))}</h4><ul class="list met small">${gv.evidence.map((e) => `<li>${esc(tc(e))}</li>`).join('')}</ul>
      <p class="small">${esc(t('grv.times'))}</p>
      <h4>${esc(t('grv.draft'))}</h4><div class="warn small">${esc(t('draft.warn'))}</div>
      <textarea id="grvText" rows="12" aria-label="${esc(t('grv.draft'))}">${esc(complaintText(type))}</textarea>
      <p class="small">${esc(t('draft.consent'))}</p>
      <div class="actions left"><span class="small ok" id="copied" aria-live="polite"></span><button class="secondary" data-act="copy" data-src="grv">${esc(t('share.copy'))}</button><button class="secondary" data-act="mailto" data-src="grv">${esc(t('draft.email'))}</button></div>
      <h4>${esc(t('grv.record'))}</h4><p class="small">${esc(t('grv.recordS'))}</p>
      <form class="grvform" data-form="grv">
        <label>${esc(t('grv.date'))}<input type="date" id="grvDate" value="${today}" max="${today}"></label>
        <label>${esc(t('grv.ref'))}<input id="grvRef" maxlength="60"></label>
        <label>${esc(t('grv.next'))}<input type="date" id="grvNext" min="${today}"></label>
        <button class="primary" type="submit">${esc(t('grv.save'))}</button>
      </form>` : ''}
    ${records ? `<h4>${esc(t('grv.saved'))}</h4><ul class="small">${records}</ul>` : ''}
  </section>

  <section class="box"><h3>${esc(t('help.official'))}</h3>
    <ul class="contacts">${CONTACTS.map((c) => `<li>${ext(c.url, tc(c.name))}<div class="small">${esc(tc(c.role))}</div><div class="small mute">${esc(t('contact.meta', { d: dateL(CHECKED) }))}</div></li>`).join('')}</ul>
    <p class="small">${esc(t('contact.none'))}</p>
    <h4>${esc(t('act.nearT'))}</h4>${pinForm('')}
  </section>
  <p class="trust">🔒 ${esc(t('start.trust'))}</p>`;
}

/* ---------------- Business profile ---------------- */
export function profileView(changed = '') {
  if (!S.story) return `<h2>${esc(t('pf.h2'))}</h2><p class="sub">${esc(t('dash.empty'))}</p>${ctaBar(`<a class="btn primary" href="#/">${esc(t('dash.start'))}</a>`)}`;
  const f = S.facts;
  const field = (slot) => {
    const x = f[slot], cur = x?.v;
    let control;
    if (slot === 'state') {
      control = `<select data-pf="state" aria-label="${esc(qText(slot))}"><option value="">${esc(t('pf.notSet'))}</option>${STATES.map((s) => `<option ${cur === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}<option value="unknown" ${cur === 'unknown' ? 'selected' : ''}>${esc(t('pf.notSure'))}</option></select>`;
    } else {
      const opts = QUESTIONS[slot].opts.map(([v]) => {
        const sel = slot === 'need' ? Array.isArray(cur) && cur.includes(v) : cur === v;
        return `<button class="pbtn ${sel ? 'sel' : ''}" data-act="${slot === 'need' ? 'pf-need' : 'pf'}" data-slot="${slot}" data-v="${attr(v)}" aria-pressed="${sel}">${esc(optL(slot, v))}</button>`;
      });
      if (slot !== 'need') opts.push(`<button class="pbtn dk ${cur === 'unknown' ? 'sel' : ''}" data-act="pf" data-slot="${slot}" data-v="${attr('unknown')}" aria-pressed="${cur === 'unknown'}">${esc(t('pf.notSure'))}</button>`);
      if (SENSITIVE.includes(slot)) opts.push(`<button class="pbtn dk ${cur === 'declined' ? 'sel' : ''}" data-act="pf" data-slot="${slot}" data-v="${attr('declined')}" aria-pressed="${cur === 'declined'}">${esc(t('pf.declined'))}</button>`);
      control = `<div class="row">${opts.join('')}</div>`;
      if (slot === 'amount') control += `<form class="row" data-form="pf-amount"><input id="pfAmt" class="grow" placeholder="${esc(t('q.amountPh'))}" aria-label="${esc(label('amount'))}"><button class="ghost" type="submit">${esc(t('q.use'))}</button></form><p class="small err" id="pfAmtErr" aria-live="polite"></p>`;
    }
    const clear = x && slot !== 'need' ? ` <button class="link mute" data-act="pf-clear" data-slot="${slot}">${esc(t('pf.clear'))}</button>` : '';
    return `<div class="pfield"><div class="row split"><b>${esc(qText(slot))}</b><span class="small">${esc(x ? fmt(slot, cur) : t('pf.notSet'))}${clear}</span></div><p class="small">${esc(qWhy(slot))}</p>${control}</div>`;
  };
  return `<h2>${esc(t('pf.h2'))}</h2><p class="sub">${esc(t('pf.sub'))}</p>
  <p class="trust">🔒 ${esc(t('pf.privacy'))}</p>
  ${coverageLine(f).replace(/<a[^>]*>.*?<\/a>/, '')}
  <div id="changed" aria-live="polite">${changed}</div>
  ${PROFILE_SLOTS.map(field).join('')}
  <div class="pfield"><b>${esc(t('pf.pin'))}</b><p class="small">${esc(t('pf.pinWhy'))}</p><form class="row" data-form="pf-pin"><input id="pfPin" class="grow" maxlength="6" inputmode="numeric" autocomplete="postal-code" value="${esc(S.pin)}" aria-label="${esc(t('pf.pin'))}"><button class="ghost" type="submit">${esc(t('pf.savePin'))}</button></form><p class="small" id="pinMsg" aria-live="polite"></p></div>
  ${ctaBar(`<a class="btn primary" href="#/results">${esc(t('pf.done'))}</a>`)}`;
}

/* ---------------- My journey ---------------- */
export function dashView(changed = '') {
  if (!S.story) return `<h2>${esc(t('dash.h2'))}</h2><p class="sub">${esc(t('dash.empty'))}</p>${ctaBar(`<a class="btn primary" href="#/">${esc(t('dash.start'))}</a>`)}`;
  const f = S.facts, R = rank(f), ids = trackedIds();
  const slots = openSlots(f).slice(0, 4);
  const tracked = ids.length
    ? ids.map((id) => {
        const rd = readiness(buildChecklist(byId(id), f), S.tracked[id]), o = S.tracked[id].outcome;
        return `<div class="trow"><b>${esc(nameOf(byId(id)))}</b><div class="small">${esc(t('dash.ready', { p: rd.pct }))} · ${esc(t('dash.papers', { d: rd.docsReady, n: rd.docsTotal }))}${o ? ' · ' + esc(t('dash.outcome', { x: outcomeL(o) })) : ''}</div>
          <div class="progress thin"><i style="width:${rd.pct}%"></i></div>
          <div class="row"><a class="btn secondary" href="#/explore/${id}">${esc(t('dash.getReady'))}</a><a class="btn secondary" href="#/route/${id}">${esc(t('card.details'))}</a><a class="btn secondary" href="#/track/${id}">${esc(t('dash.what'))}</a><button class="link mute" data-act="untrack" data-id="${id}">${esc(t('dash.remove'))}</button></div></div>`;
      }).join('')
    : `<p class="small">${esc(t('dash.none'))} ${R.top.slice(0, 3).map((r) => `<a class="link" href="#/route/${r.id}">${esc(nameOf(r.p))}</a>`).join(' · ') || '—'}</p>`;
  const today = new Date().toISOString().slice(0, 10);
  const follows = S.grievances.filter((x) => x.next).map((x) => `<li class="${x.next <= today ? 'due' : ''}">${esc(t('grv.type.' + x.type))} — ${esc(t('grv.nextOn', { d: dateL(x.next) }))}${x.ref ? ' · ' + esc(t('grv.refIs', { r: x.ref })) : ''}</li>`).join('');
  return `<h2>${esc(t('dash.h2'))}</h2><p class="sub">${esc(t('dash.sub'))}</p>
  ${continueCard()}
  ${summaryTiles()}
  <div class="dash"><div class="stack">
    <div class="box"><h3>${esc(t('dash.need'))}</h3><p style="margin:0 0 8px">“${esc(S.story)}”</p>${chipStrip()}
      <div class="row"><a class="btn secondary" href="#/profile">${esc(t('dash.editProfile'))}</a><button class="secondary" data-act="refresh">${esc(t('dash.refresh'))}</button></div>
      <div id="changed" aria-live="polite">${changed}</div></div>
    <div class="box"><h3>${esc(t('dash.routes'))}</h3>${tracked}</div>
    <div class="box"><h3>${esc(t('dash.firm'))}</h3>${slots.length
      ? `<p class="small">${esc(t('dash.firmS'))}</p>${slots.map((s) => `<div class="enrich"><b class="small">${esc(qText(s))}</b><div class="row">${QUESTIONS[s].opts.map(([v]) => `<button class="secondary" data-act="enrich" data-slot="${s}" data-v="${attr(v)}">${esc(optL(s, v))}</button>`).join('')}</div></div>`).join('')}`
      : `<p class="small">${esc(t('dash.firmNone'))}</p>`}</div>
  </div><div class="stack">
    ${follows ? `<div class="box"><h3>${esc(t('dash.follow'))}</h3><ul class="small follows">${follows}</ul></div>` : ''}
    <div class="box"><h3>${esc(t('saathi.h2'))}</h3><p class="small">${esc(t('dash.saathiS'))}</p><div class="row"><button class="ghost" data-act="note">${esc(t('dash.prepare'))}</button><a class="btn ghost" href="#/help">${esc(t('nav.help'))}</a></div></div>
    <div class="box"><h3>${esc(t('dash.activity'))}</h3><ul class="small" style="padding-left:18px;margin:0">${S.log.slice(0, 8).map((l) => `<li>${esc(l.t)} <span class="mute">· ${esc(l.at)}</span></li>`).join('') || `<li>${esc(t('dash.nothing'))}</li>`}</ul></div>
    <div class="box"><h3>${esc(t('dash.data'))}</h3>
      <p class="small">${esc(t('dash.fresh', { d: dateL(CHECKED) }))}${isStale() ? ' ' + esc(t('src.stale')) : ''}</p>
      <p class="small">${esc(t('dash.guest'))}</p>
      <div class="row"><button class="secondary" data-act="export-txt">${esc(t('dash.exportTxt'))}</button><button class="secondary" data-act="export-json">${esc(t('dash.exportJson'))}</button><button class="secondary" data-act="reset">${esc(t('dash.clear'))}</button></div></div>
  </div></div>
  <div class="actions"><a class="btn secondary" href="#/results">${esc(t('dash.view'))}</a><a class="btn secondary" href="#/funding">${esc(t('nav.funding'))}</a></div>
  ${ctaBar(`<button class="primary" data-act="new-need">${esc(t('dash.new'))}</button>`)}`;
}

/* ---------------- Shareable texts and drafts (built only from what the owner confirmed) ---------------- */
export function handoffText() {
  const f = S.facts, R = rank(f);
  const known = knownKeys(f).map((k) => `- ${label(k)}: ${fmt(k, V(f, k))}`);
  const tracked = trackedIds().map((id) => `- ${nameOf(byId(id))}${S.tracked[id].outcome ? ` (${outcomeL(S.tracked[id].outcome)})` : ''}`);
  const open = [...new Set(R.top.slice(0, 3).flatMap((r) => r.conds.filter((c) => c.state === 'unknown').map((c) => tc(c.text))))].slice(0, 6).map((x) => '- ' + x);
  return `${t('hand.title')}
${t('hand.words')}: "${S.story}"

${t('hand.know')}:
${known.join('\n') || '- ' + t('hand.little')}

${t('hand.routes')}:
${tracked.join('\n') || R.top.slice(0, 3).map((r) => '- ' + nameOf(r.p)).join('\n') || '- ' + t('hand.noneYet')}

${t('hand.check')}:
${open.join('\n') || '- ' + t('hand.nothing')}

${t('hand.note')}`;
}
const docMark = (tr, it) => { const st = itemStatus(tr, it); return `${isComplete(st) ? '✓' : st === 'missing' ? '✗' : '•'} ${tc(it.text)}${st ? ` (${t('doc.' + st)})` : ''}`; };
export function sheetText(id) {
  const f = S.facts, p = byId(id), tr = S.tracked[id], cl = buildChecklist(p, f);
  const asks = t(p.asks === 'loan' ? 'lenderAsks' : 'officeAsks');
  const confirms = cl.elig.filter((it) => it.state === 'unknown').map((it) => tc(it.text));
  const a = V(f, 'amount');
  return `${t('sheet.title')}

${t('sheet.business')}:
${knownKeys(f).filter((k) => k !== 'need').map((k) => `- ${label(k)}: ${fmt(k, V(f, k))}`).join('\n') || '- ' + t('hand.little')}

${t('sheet.asking')}: ${nameOf(p)}
${needsOf(f).length ? `- ${label('need')}: ${fmt('need', needsOf(f))}\n` : ''}${a != null ? `- ${t('sheet.amount')}: ${money(a)}\n` : ''}
${t('sheet.papers')}:
${cl.docs.map((it) => docMark(tr, it)).join('\n') || '- ' + t('cl.noDocs')}

${t('sheet.questions')}:
${[...confirms, ...asks].slice(0, 7).map((q) => '- ' + q).join('\n')}

${t('hand.note')}`;
}
export function draftText(id, kind) {
  const f = S.facts, p = byId(id), tr = S.tracked[id];
  const B = (k) => `[${t(k)}]`;
  const a = V(f, 'amount'), act = V(f, 'activity'), place = V(f, 'city') || V(f, 'state'), st = V(f, 'stage');
  const need = needsOf(f).length ? fmt('need', needsOf(f)) : B('dr.needBlank');
  if (kind === 'summary') {
    const have = buildChecklist(p, f).docs.filter((it) => isComplete(itemStatus(tr, it))).map((it) => tc(it.text));
    return [
      t('ps.title'), '',
      `1. ${t('ps.biz')}: ${act ? activityL(act) : B('dr.bizBlank')}${place ? ', ' + place : ''}${st ? ', ' + fmt('stage', st) : ''}`,
      `2. ${t('ps.for')}: ${need}`,
      `3. ${t('ps.amount')}: ${a != null ? money(a) : B('ps.amountBlank')}`,
      `4. ${t('ps.cost')}: ${B('ps.costBlank')}`,
      `5. ${t('ps.own')}: ${B('ps.ownBlank')}`,
      ...(p.repay ? [`6. ${t('ps.repay')}: ${B('ps.repayBlank')}`] : []),
      `${p.repay ? 7 : 6}. ${t('ps.papers')}: ${have.length ? have.join('; ') : B('ps.papersBlank')}`,
      '', t('ps.note'),
    ].join('\n');
  }
  const asks = t(p.asks === 'loan' ? 'lenderAsks' : 'officeAsks').slice(0, 4);
  return [
    t('dr.subject', { n: nameOf(p) }), '', t('dr.dear'), '',
    t('dr.about', { biz: act ? activityL(act) : B('dr.bizBlank'), place: place ? t('dr.in', { c: place }) : '' }) + (st ? ' ' + t(st === 'new' ? 'dr.new' : 'dr.existing') : ''),
    t('dr.ask', { n: nameOf(p), need }) + (a != null ? ' ' + t('dr.amount', { a: money(a) }) : ''),
    '', t('dr.questions'), ...asks.map((q) => '- ' + q), '',
    t('dr.contact', { phone: B('dr.phone') }), '', t('dr.thanks'), B('dr.name'),
  ].join('\n');
}
export function planText() {
  const f = S.facts;
  const routes = trackedIds().map((id) => {
    const p = byId(id), tr = S.tracked[id], cl = buildChecklist(p, f), rd = readiness(cl, tr);
    const lines = SECTIONS.flatMap((s) => [`  ${t('cl.' + s)}:`, ...cl[s].map((it) => { const stt = itemStatus(tr, it); return `   - ${tc(it.text)}${stt ? ` [${t((it.doc ? 'doc.' : 'st.') + stt)}]` : ''}${tr?.notes?.[it.key] ? ` — ${tr.notes[it.key]}` : ''}`; })]);
    return [`${nameOf(p)} — ${t('dash.ready', { p: rd.pct })}${tr.outcome ? ' · ' + outcomeL(tr.outcome) : ''}`, ...lines].join('\n');
  });
  const grv = S.grievances.map((x) => `- ${t('grv.type.' + x.type)} · ${t('grv.filedOn', { d: dateL(x.filed) })}${x.ref ? ' · ' + t('grv.refIs', { r: x.ref }) : ''}${x.next ? ' · ' + t('grv.nextOn', { d: dateL(x.next) }) : ''}`);
  return [handoffText(), '', `== ${t('dash.routes')} ==`, routes.join('\n\n') || '- ' + t('hand.noneYet'), '', `== ${t('grv.saved')} ==`, grv.join('\n') || '- ' + t('hand.nothing')].join('\n');
}

/* ---------------- Modals ---------------- */
const shareRow = (src, id = '') => `<div class="actions"><span class="small ok" id="copied" aria-live="polite"></span>
  <button class="secondary" data-act="copy" data-src="${src}" data-id="${id}">${esc(t('share.copy'))}</button>
  <button class="secondary" data-act="print">${esc(t('share.print'))}</button>
  <button class="primary" data-act="share-wa" data-src="${src}" data-id="${id}">${esc(t('share.wa'))}</button></div>`;
export function noteModal() {
  return `<h2>${esc(t('saathi.noteH'))}</h2><pre class="hand printable" id="shareText">${esc(handoffText())}</pre>${shareRow('hand')}
  <div class="actions"><button class="secondary" data-act="close-modal">${esc(t('saathi.done'))}</button></div>`;
}
export function sheetModal(id) {
  return `<h2>${esc(t('draft.sheet'))}</h2><p class="small">${esc(t('ready.sheetS'))}</p>
  <pre class="hand printable" id="shareText">${esc(sheetText(id))}</pre>${shareRow('sheet', id)}
  <div class="actions"><button class="secondary" data-act="close-modal">${esc(t('saathi.done'))}</button></div>`;
}
export function draftModal(id, kind) {
  const tr = S.tracked[id];
  const text = tr?.drafts?.[kind] ?? draftText(id, kind);
  const prepared = tr?.draftState?.[kind] === 'prepared';
  return `<h2>${esc(t('draft.' + kind))}: ${esc(nameOf(byId(id)))}</h2>
  <div class="warn small">${esc(t('draft.warn'))}</div>
  <label for="draftText" class="small">${esc(t('draft.edit'))}</label>
  <textarea id="draftText" rows="14" data-draft data-id="${id}" data-kind="${kind}">${esc(text)}</textarea>
  <p class="small">${esc(t(kind === 'enquiry' ? 'draft.consent' : 'draft.consentShare'))}</p>
  <div class="actions"><span class="small ok" id="copied" aria-live="polite"></span>
    <button class="secondary" data-act="draft-reset" data-id="${id}" data-kind="${kind}">${esc(t('draft.reset'))}</button>
    <button class="secondary" data-act="copy" data-src="draft">${esc(t('share.copy'))}</button>
    ${kind === 'enquiry' ? `<button class="secondary" data-act="mailto" data-src="draft">${esc(t('draft.email'))}</button>` : ''}
    <button class="secondary" data-act="share-wa" data-src="draft">${esc(t('share.wa'))}</button>
    <button class="primary" data-act="draft-ready" data-id="${id}" data-kind="${kind}" aria-pressed="${prepared}">${esc(t(prepared ? 'draft.prepared' : 'draft.markReady'))}</button>
  </div>
  <div class="actions"><button class="secondary" data-act="close-modal">${esc(t('saathi.done'))}</button></div>`;
}
export function termModal(id) {
  const x = termById(id);
  if (!x) return '';
  const lang = getLang();
  return `<h2>${esc(x.t[lang] || x.t.en)}</h2><p>${esc(x[lang] || x.en)}</p><div class="actions"><button class="primary" data-act="close-modal">${esc(t('term.close'))}</button></div>`;
}
export function chipModal(k) {
  const assumed = S.facts[k]?.o === 'inferred';
  const val = fmt(k, V(S.facts, k));
  return `<h2>${esc(label(k))}</h2><p>${esc(assumed ? t('chips.confirmQ', { x: val }) : val)}</p>
  <div class="actions">${assumed ? `<button class="secondary" data-act="chip-yes" data-k="${k}">${esc(t('chips.yes'))}</button>` : ''}<button class="primary" data-act="chip-no" data-k="${k}">${esc(assumed ? t('chips.no') : t('chips.edit', { x: label(k) }))}</button></div>`;
}
export function aboutModal() {
  const gov = CORPUS.filter((p) => p.family === 'gov' && p.type === 'direct');
  const fin = CORPUS.filter((p) => p.family === 'fin');
  const en = CORPUS.filter((p) => p.type === 'enabler');
  const w = Object.entries(DIMENSIONS).map(([k, v]) => `${t('dim.' + k)} ${v}`).join(' · ');
  return `<h2>${esc(t('about.h2'))}</h2><p class="sub">${t('about.sub', { d: esc(dateL(CHECKED)) })}</p>
  <h3>${esc(t('about.gov', { n: gov.length }))}</h3><p class="small">${gov.map((p) => esc(nameOf(p)) + (p.status === 'verify' ? ` <span class="chip a">${esc(t('about.verify'))}</span>` : '')).join(' · ')}</p>
  <h3>${esc(t('about.en', { n: en.length }))}</h3><p class="small">${en.map((p) => esc(nameOf(p))).join(' · ')}</p>
  <h3>${esc(t('about.fin', { n: fin.length }))}</h3><p class="small">${fin.map((p) => esc(nameOf(p))).join(' · ')} ${esc(t('about.finNote'))}</p>
  <h3>${esc(t('about.inst', { n: INSTITUTIONAL.length }))}</h3><p class="small">${INSTITUTIONAL.map((x) => esc(tc(x))).join(' · ')}</p>
  <h3>${esc(t('about.howH'))}</h3><p class="small">${esc(t('about.how'))}</p><p class="small">${esc(t('about.weights', { w }))}</p>
  <h3>${esc(t('about.langH'))}</h3><p class="small">${esc(t('about.lang'))}</p>
  <h3>${esc(t('about.dataH'))}</h3><p class="small">${esc(t('about.data'))}</p>
  ${t('translationNote') ? `<p class="small">${esc(t('translationNote'))}</p>` : ''}
  <div class="actions"><button class="primary" data-act="close-modal">${esc(t('about.close'))}</button></div>`;
}
