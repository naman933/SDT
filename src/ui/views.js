// Pure render functions: state in, HTML string out. Interactions use data-act attributes (see main.js).
// Journey: ① Tell us → ② A few questions → ③ Your options → ④ Get ready → ⑤ Apply & track.
// All user-visible text goes through t() / td() / tc(); jargon is wrapped by glossify() for tap-to-explain.
import { S } from '../state.js';
import {
  NEEDS, QUESTIONS, MAX_QUESTIONS, CORPUS, INSTITUTIONAL, SUPPORT, RECORDED, byId,
  V, needsOf, rank, evaluate, enablersFor, openSlots, fitBand, actBand,
} from '../engine/index.js';
import { t, td, tc, money, joinList, getLang, STRINGS } from '../i18n/index.js';
import { glossify, termById } from '../i18n/glossary.js';
import { docHelp } from '../i18n/docs.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const attr = (v) => esc(JSON.stringify(v));
const g = (text, used) => glossify(esc(text), getLang(), used); // escaped + tap-to-explain

/* ---------------- Localised data labels ---------------- */
const LABEL_EN = {
  need: 'What it is for', amount: 'Amount', stage: 'Business stage', activity: 'Business', sector: 'Sector', city: 'City', state: 'State / UT',
  urgency: 'Timing', buyer_type: 'Customer who owes you', overdue: 'Payment overdue', udyam: 'Udyam registration', green_tech: 'Kind of equipment',
  dairy_type: 'Dairy type', size: 'Yearly sales', applicant: 'Entrepreneur', artisan_trade: 'Traditional trade',
};
const SECTOR_EN = { manufacturing: 'Manufacturing', services: 'Services', trading: 'Trading', dairy: 'Dairy (allied agriculture)', agri_crop: 'Crop farming' };
export const label = (k) => td('label.' + k, LABEL_EN[k]);
export const hasLabel = (k) => k in LABEL_EN;
export const needL = (n) => td(`need.${n}.l`, NEEDS[n]?.l || n);
export const needS = (n) => td(`need.${n}.s`, NEEDS[n]?.s || '');
export const qText = (slot) => td(`q.${slot}.q`, QUESTIONS[slot].q);
export const qWhy = (slot) => td(`q.${slot}.why`, QUESTIONS[slot].why);
export const optL = (slot, v) => {
  if (slot === 'need') return needL(v);
  const o = QUESTIONS[slot]?.opts.find((x) => x[0] === v);
  return td(`q.${slot}.opt.${v}`, o ? o[1] : String(v));
};
const activityL = (a) => td('activity.' + a, a);

export function fmt(k, v) {
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

/* ---------------- Welcome back ---------------- */
function continueCard() {
  if (!S.story) return '';
  const ids = Object.keys(S.tracked).sort((a, b) => String(S.tracked[b].added).localeCompare(String(S.tracked[a].added)));
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
  <div class="reassure">${t('start.reassure').map((x) => `<span>✓ ${esc(x)}</span>`).join('')}</div>
  <p class="sub">${esc(t('start.sub'))}</p>
  <div class="speakbox" ${canSpeak ? '' : 'hidden'} id="speakBox"><button class="mic big" id="micBtn" data-act="mic" data-focus="1">${esc(t('start.speak'))}</button><span class="small">${esc(t('start.speakHint'))}</span></div>
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
    const o = x.v === 'unknown' ? 'unknown' : ORIGIN_CLS[x.o] ? x.o : 'said';
    return `<div class="fact"><div><div class="k">${esc(label(k))}</div><div class="v">${esc(fmt(k, x.v))}</div></div>
      <div class="row"><span class="origin ${ORIGIN_CLS[o]}">${esc(t('origin.' + o))}</span><button class="link" data-act="drop-fact" data-k="${k}">${esc(t('check.remove'))}</button></div></div>`;
  }).join('');
  return `<h2>${esc(t('check.h2'))}</h2>
  <p class="sub">${esc(t('check.sub'))}</p>
  ${S.summary ? `<div class="note"><b>${esc(t('check.summary'))}</b> ${esc(S.summary)}</div>` : ''}
  <div class="facts">${rows || `<div class="note">${esc(t('check.empty'))}</div>`}</div>
  <p class="small"><span class="origin o-said">${esc(t('origin.said'))}</span> ${esc(t('check.legend.said'))} · <span class="origin o-ai">${esc(t('origin.ai'))}</span> ${esc(t('check.legend.ai'))} · <span class="origin o-inferred">${esc(t('origin.inferred'))}</span> ${esc(t('check.legend.inferred'))}</p>
  <div class="actions"><a class="btn secondary" href="#/">${esc(t('check.back'))}</a></div>
  ${ctaBar(`<button class="primary" data-act="confirm">${esc(t('check.ok'))}</button>`)}`;
}

/* ---------------- ② A few questions ---------------- */
export function questionView() {
  const slot = S.curQ;
  const q = QUESTIONS[slot];
  const n = S.asked.filter((s) => s !== 'need').length;
  const R = rank(S.facts);
  const desc = (o) => (slot === 'need' ? needS(o[0]) : '');
  const help = S.needHelp
    ? `<div class="banner help"><b>${esc(t('q.helpTitle'))}</b>${esc(t('q.helpText'))}<div class="actions left"><button class="ghost" data-act="help">${esc(t('res.talkLower'))}</button></div></div>` : '';
  return `${S.summary ? `<p class="small">“${esc(S.summary)}”</p>` : ''}${chipStrip()}
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

/* ---------------- ③ Your options ---------------- */
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
function condLi(cs, used) {
  return cs.map((c) => `<li>${g(tc(c.text), used)}${c.basis === 'typical' ? ` <span class="chip">${esc(t('chip.typical'))}</span>` : ''}${c.kind === 'conditional' ? ` <span class="chip">${esc(t('chip.ifApplicable'))}</span>` : ''}</li>`).join('');
}
function bars(parts) {
  return Object.entries(parts).map(([k, [v, w]]) => `<div class="small split"><span>${esc(t('part.' + k))}</span><span>${Math.round(v * w)} / ${w}</span></div><div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div>`).join('');
}
function scorePanel(r) {
  const m = r.conds.filter((c) => c.kind === 'mandatory');
  const n = (st) => m.filter((c) => c.state === st).length;
  return `<div class="score expert-only"><div class="sgrid">
    <div><b>${esc(t('score.fit', { n: r.fit }))}</b> <span class="small">${esc(t('score.ranks'))} · ${esc(t('fit.' + fitBand(r.fit)))}</span>${bars(r.parts)}</div>
    <div><b>${esc(t('score.conds'))}</b> <span class="small">${esc(t('score.shown'))}</span><p class="small">${esc(t('score.condText', { m: n('met'), t: m.length, u: n('unknown'), n: n('not_met') }))}<br>${esc(t('score.unknownNo'))}</p></div>
    <div><b>${esc(t('score.act', { n: r.act }))}</b> <span class="small">${esc(t('score.tie'))} · ${esc(t('act.' + actBand(r.act)))}</span>${bars(r.aparts)}</div>
  </div><p class="small">${esc(t('score.note'))}</p></div>`;
}
function detailsBody(r) {
  const p = r.p, used = new Set();
  const gs = (s) => r.conds.filter((c) => c.state === s);
  const host = (u) => u.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const toCheck = gs('unknown').length || gs('todo').length
    ? `<ul class="list unk">${condLi(gs('unknown'), used)}</ul><ul class="list todo">${condLi(gs('todo'), used)}</ul>` : `<p class="small">${esc(t('card.nothing'))}</p>`;
  return `<p>${g(tc(p.plain), used)}</p>
    <div class="cols"><div><b class="small">${esc(t('card.know'))}</b><ul class="list met">${condLi(gs('met'), used) || `<li>${esc(t('card.only'))}</li>`}</ul></div>
      <div><b class="small">${esc(t('card.check'))}</b>${toCheck}</div></div>
    ${enablersFor(r, S.facts).map(({ e, conds }) => { const u = conds.filter((c) => c.state === 'unknown'); return `<div class="enabler"><b>${esc(t('card.alsoAsk', { n: nameOf(e) }))}</b> — ${g(tc(e.plain), used)}${u.length ? `<div class="small">${esc(t('card.toCheck', { x: u.map((c) => tc(c.text)).join('; ') }))}</div>` : ''}</div>`; }).join('')}
    <p class="small"><b>${esc(t('card.route'))}</b> ${esc(tc(p.route.text))}${p.route.url ? ` — <a href="${p.route.url}" target="_blank" rel="noopener">${esc(host(p.route.url))} ↗</a>` : ''}<br>
      <b>${esc(t('card.source'))}</b> ${p.src ? `<a href="${p.src.u}" target="_blank" rel="noopener">${esc(tc(p.src.t))}</a> · ${esc(t('card.recorded', { d: RECORDED }))} · <span style="color:var(--amber)">${esc(t('card.notVerified'))}</span>` : esc(t('card.generic'))}${p.corpusNote ? `<span class="expert-only-inline"> · ${esc(tc(p.corpusNote))}</span>` : ''}</p>
    ${scorePanel(r)}`;
}
function bestCard(r) {
  const p = r.p, used = new Set();
  return `<section class="best" id="best">
    <div class="best-t">${esc(t('best.t'))}</div>
    <div class="name">${esc(nameOf(p))}</div><div>${badge(r)} ${familyChip(p)}</div>
    <p class="big">${g(tc(p.next), used)}</p>
    <p>${g(tc(p.short), used)}</p>
    <p class="small"><b>${esc(t('card.whyYou'))}</b> ${esc(whyBits(r))}</p>
    ${p.info?.length ? `<p class="small">📄 ${esc(t('best.papers', { n: p.info.length }))}</p>` : ''}
    <div class="row"><button class="primary" data-act="explore" data-id="${r.id}">${esc(t('card.getReady'))}</button>${readBtn('best')}</div>
    <details><summary>${esc(t('card.details'))}</summary>${detailsBody(r)}</details>
  </section>`;
}
function optionCard(r) {
  const p = r.p, used = new Set();
  return `<article class="card" id="c-${r.id}">
    <div class="top"><div class="name">${esc(nameOf(p))}</div><div>${badge(r)} ${familyChip(p)}</div></div>
    <p>${g(tc(p.short), used)}</p>
    <p class="small"><b>${esc(t('card.whyYou'))}</b> ${esc(whyBits(r))}</p>
    <p class="small"><b>${esc(t('card.todo'))}</b> ${g(tc(p.next), used)}</p>
    <div class="row"><button class="ghost" data-act="explore" data-id="${r.id}">${esc(t('card.getReady'))}</button></div>
    <details><summary>${esc(t('card.details'))}</summary>${detailsBody(r)}</details>
  </article>`;
}
function helpReasons(R) {
  const w = [];
  if (S.dk >= 2) w.push(t('help.dk'));
  const top = R.top[0];
  if (top && top.conds.filter((c) => c.state === 'unknown' && c.kind === 'mandatory').length >= 3) w.push(t('help.conds'));
  if (top && top.act < 55) w.push(t('help.steps'));
  if (!R.top.length) w.push(t('help.none'));
  return w;
}
export function resultsView() {
  const f = S.facts, R = rank(f);
  let h = `<h2>${esc(t('res.h2'))}</h2>${chipStrip()}`;
  if (!needsOf(f).length) {
    h += `<div class="banner"><b>${esc(t('res.needMore.t'))}</b>${esc(t('res.needMore.b'))} <button class="link" data-act="confirm">${esc(t('res.answerOne'))}</button> ${esc(t('res.or'))} <button class="link" data-act="help">${esc(t('res.talkLower'))}</button>.</div>`;
  } else if (!R.top.length) {
    h += `<div class="banner"><b>${esc(t('res.none.t'))}</b>${esc(t('res.none.b'))}<div class="actions left"><button class="primary" data-act="help">${esc(t('res.talkLower'))}</button></div></div>`;
  } else if (R.noGov && R.wantsMoney) {
    const cg = R.fin.some((r) => enablersFor(r, f).length);
    h += `<div class="banner"><b>${esc(t('res.noGov.t'))}</b>${esc(t('res.noGov.b'))}${cg ? g(t('res.noGov.cg')) : ''}<div class="small expert-only">${esc(t('res.noGov.cov', { n: CORPUS.filter((p) => p.family === 'gov').length }))}</div></div>`;
  }
  if (V(f, 'udyam') === 'no') {
    const needU = R.top.filter((r) => r.conds.some((c) => c.slot === 'udyam'));
    h += `<div class="note"><b>${esc(t('res.udyam.t'))}</b> ${esc(needU.length ? t('res.udyam.some', { list: needU.map((r) => nameOf(r.p)).join(', ') }) : t('res.udyam.none'))} <a href="https://udyamregistration.gov.in/" target="_blank" rel="noopener">udyamregistration.gov.in ↗</a></div>`;
  }
  const [best, ...others] = R.top;
  if (best) h += bestCard(best);
  if (others.length) h += `<section class="group"><h3>${esc(t('res.others'))}</h3><div class="cards">${others.map(optionCard).join('')}</div></section>`;
  if (R.top.length > 1) {
    const check = (r) => r.conds.filter((c) => (c.state === 'unknown' || c.state === 'todo') && c.slot !== 'lender').map((c) => tc(c.text).split(' — ')[0]).slice(0, 2).join('; ') || t(r.conds.some((c) => c.slot === 'lender') ? 'check.lender' : 'check.confirmTerms');
    h += `<details><summary>${esc(t('res.compare'))}</summary><div class="tablewrap"><table><thead><tr><th>${esc(t('th.route'))}</th><th>${esc(t('th.check'))}</th><th>${esc(t('th.how'))}</th><th>${esc(t('th.next'))}</th></tr></thead><tbody>
      ${R.top.map((r) => `<tr><td><b>${esc(nameOf(r.p))}</b><br>${badge(r)}</td><td>${esc(check(r))}</td><td>${esc(t('speed.' + r.p.speed))} · ${esc(t('steps', { n: r.p.steps }))}</td><td>${esc(tc(r.p.next))}</td></tr>`).join('')}
      </tbody></table></div><p class="small">${esc(t('res.noBest'))}</p></details>`;
  }
  if (R.hidden.length) h += `<details><summary>${esc(t('hidden.sum', { n: R.hidden.length }))}</summary><ul class="list no">${R.hidden.map((r) => `<li><b>${esc(nameOf(r.p))}</b> — ${esc(reasonText(r))}</li>`).join('')}</ul></details>`;
  const help = helpReasons(R);
  if (help.length) h += `<div class="banner help"><b>${esc(t('help.t'))}</b>${esc(help.join(' '))}<div class="actions left"><button class="ghost" data-act="help">${esc(t('res.talkLower'))}</button></div></div>`;
  h += `<div class="warn"><b>${esc(t('res.warn.t'))}</b> ${esc(t('res.warn.b'))}${t('translationNote') ? ' ' + esc(t('translationNote')) : ''}</div>
    <p><a class="link" href="#/check">${esc(t('res.back'))}</a></p>`;
  if (best) h += ctaBar(`<button class="primary" data-act="explore" data-id="${best.id}">${esc(t('cta.getReady', { n: nameOf(best.p) }))}</button>`);
  return h;
}

/* ---------------- ④ Get ready ---------------- */
// Papers = documents to collect (+ fixable to-dos like Udyam). Confirms = conditions to check with the bank/office.
export function readyItems(id) {
  const p = byId(id);
  const r = evaluate(p, S.facts);
  const conds = r ? r.conds : [];
  const lang = getLang();
  const papers = [
    ...(p.info || []).map(([d, b]) => ({ key: 'd:' + d, text: tc(d), basis: b, help: docHelp(d, lang) })),
    ...conds.filter((c) => c.state === 'todo').map((c) => ({ key: 'v:' + c.text, text: tc(c.text), basis: c.basis, help: c.slot === 'udyam' ? docHelp('Udyam certificate', lang) : null })),
  ];
  const confirms = conds.filter((c) => c.state === 'unknown').map((c) => tc(c.text));
  return { p, papers, confirms };
}
export const paperState = (id, key) => {
  const tr = S.tracked[id];
  return tr?.docs?.[key] || (tr?.done?.[key] ? 'have' : null);
};
function paperItem(id, it) {
  const st = paperState(id, it.key);
  return `<div class="paper ${st === 'need' ? 'need' : ''}">
    <div>${g(it.text)} ${it.basis === 'typical' ? `<span class="chip">${esc(t('act.typicalConfirm'))}</span>` : ''}</div>
    <div class="row"><button class="secondary ${st === 'have' ? 'sel' : ''}" data-act="doc" data-id="${id}" data-k="${esc(it.key)}" data-v="have">${esc(t('ready.have'))}</button><button class="secondary ${st === 'need' ? 'sel' : ''}" data-act="doc" data-id="${id}" data-k="${esc(it.key)}" data-v="need">${esc(t('ready.need'))}</button></div>
    ${st === 'need' ? `<p class="small howget"><b>${esc(t('ready.howGet'))}</b> ${g(it.help ? it.help.how : t('ready.noHelp'))}</p>` : ''}
    <details class="what"><summary>${esc(t('ready.what'))}</summary><p class="small">${g(it.help ? it.help.what : t('ready.whatNone'))}</p></details>
  </div>`;
}
export function readyView(id) {
  const { p, papers, confirms } = readyItems(id);
  const pending = papers.filter((it) => paperState(id, it.key) !== 'have');
  const done = papers.filter((it) => paperState(id, it.key) === 'have');
  const asks = t(p.asks === 'loan' ? 'lenderAsks' : 'officeAsks');
  const inPerson = p.access !== 'online';
  const used = new Set();
  return `<h2>${esc(t('ready.h2', { n: nameOf(p) }))}</h2>
  <p>${g(tc(p.short), used)}</p><p class="small">${esc(t('ready.sub'))}</p>
  <section class="box" id="papers"><div class="row split"><h3>${esc(t('ready.papers'))}</h3><span class="small">${esc(t('ready.progress', { d: done.length, n: papers.length }))}</span></div>
    <div class="progress"><i style="width:${papers.length ? Math.round((done.length / papers.length) * 100) : 100}%"></i></div>
    ${pending.map((it) => paperItem(id, it)).join('')}
    ${done.length ? `<details><summary>✓ ${esc(t('ready.done', { n: done.length }))}</summary><ul class="list met">${done.map((it) => `<li>${esc(it.text)} <button class="link mute" data-act="doc" data-id="${id}" data-k="${esc(it.key)}" data-v="">${esc(t('ready.undo'))}</button></li>`).join('')}</ul></details>` : ''}
    ${readBtn('papers')}
  </section>
  <section class="box"><h3>${esc(t('ready.confirm'))}</h3><ul class="small">${[...confirms, ...asks].slice(0, 7).map((q) => `<li>${g(q)}</li>`).join('')}</ul></section>
  <section class="box"><h3>${esc(t('ready.where'))}</h3>
    <p>${g(tc(p.next))}${p.route.url ? `<br><a href="${p.route.url}" target="_blank" rel="noopener">${esc(p.route.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))} ↗</a>` : ''}</p>
    ${inPerson ? `<p class="small">${esc(t('act.nearS'))}</p><form class="row" data-form="pin" data-id="${id}"><input id="pin" class="grow" maxlength="6" inputmode="numeric" placeholder="${esc(t('act.pinPh'))}" aria-label="${esc(t('act.pinPh'))}"><button class="ghost" type="submit">${esc(t('act.search'))}</button></form><div id="near" aria-live="polite"></div>` : ''}
  </section>
  <section class="box sheetbox"><button class="primary" data-act="sheet" data-id="${id}">${esc(t('ready.sheet'))}</button><p class="small">${esc(t('ready.sheetS'))}</p></section>
  <p><a class="link" href="#/results">${esc(t('act.back'))}</a></p>
  ${ctaBar(`<a class="btn primary" href="#/track/${id}">${esc(t('cta.applied'))}</a>`)}`;
}
export function nearbyHtml(id, pin) {
  const p = byId(id);
  const kinds = [p.access === 'lender' || p.asks === 'loan' ? 'bank' : null, 'dic', 'dfo', p.access === 'mixed' ? 'csc' : null].filter(Boolean);
  // Map queries stay in English (better results); labels follow the UI language.
  return `<ul class="small">${kinds.map((k) => `<li><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STRINGS.en['near.' + k] + ' near ' + pin)}">${esc(t('near.fmt', { x: t('near.' + k), pin }))} ↗</a></li>`).join('')}</ul><p class="small">${esc(t('near.note'))}</p>`;
}

/* ---------------- ⑤ Apply & track ---------------- */
export function trackView(id) {
  const p = byId(id), o = S.tracked[id]?.outcome;
  const opts = t('track.opts');
  let resp = '';
  if (o === 'notyet') resp = `<p>${esc(t('track.notyet'))}</p><div class="row"><a class="btn secondary" href="#/explore/${id}">${esc(t('track.notyetBtn'))}</a><button class="ghost" data-act="sheet" data-id="${id}">${esc(t('ready.sheet'))}</button></div>`;
  else if (o === 'waiting') resp = `<p>${esc(t('track.waiting'))}</p>`;
  else if (o === 'approved') resp = `<p class="big">${esc(t('track.approved'))}</p><p>${esc(t('track.approvedQ'))}</p><button class="secondary" data-act="new-need">${esc(t('track.newNeed'))}</button>`;
  else if (o === 'rejected') {
    const others = rank(S.facts).top.filter((r) => r.id !== id).slice(0, 3);
    resp = `<p>${esc(t('track.rejected'))}</p><p class="small">${esc(t('track.rejectedAsk'))}</p>
      ${others.length ? `<h3>${esc(t('track.others'))}</h3>${others.map((r) => `<div class="paper"><b>${esc(nameOf(r.p))}</b> ${badge(r)}<p class="small">${g(tc(r.p.short))}</p><button class="ghost" data-act="explore" data-id="${r.id}">${esc(t('card.getReady'))}</button></div>`).join('')}` : ''}
      <button class="ghost" data-act="help">${esc(t('res.talkLower'))}</button>`;
  }
  return `<h2>${esc(t('track.h2', { n: nameOf(p) }))}</h2><p class="sub">${esc(t('track.sub'))}</p>
    <div class="opts">${OUTCOMES.map((k, i) => `<button class="opt ${o === k ? 'sel' : ''}" data-act="outcome" data-id="${id}" data-v="${k}">${esc(opts[i])}</button>`).join('')}</div>
    ${resp ? `<div class="box" aria-live="polite">${resp}</div>` : ''}
    ${ctaBar(`<a class="btn primary" href="#/my-msme">${esc(t('cta.myMsme'))}</a>`)}`;
}

/* ---------------- My MSME ---------------- */
export function dashView(changed = '') {
  if (!S.story) return `<h2>${esc(t('dash.h2'))}</h2><p class="sub">${esc(t('dash.empty'))}</p>${ctaBar(`<a class="btn primary" href="#/">${esc(t('dash.start'))}</a>`)}`;
  const f = S.facts, R = rank(f), ids = Object.keys(S.tracked);
  const slots = openSlots(f).slice(0, 4);
  const tracked = ids.length
    ? ids.map((id) => {
        const { papers } = readyItems(id), o = S.tracked[id].outcome;
        const done = papers.filter((it) => paperState(id, it.key) === 'have').length;
        return `<div class="trow"><b>${esc(nameOf(byId(id)))}</b><div class="small">${esc(t('dash.papers', { d: done, n: papers.length }))}${o ? ' · ' + esc(t('dash.outcome', { x: outcomeL(o) })) : ''}</div>
          <div class="row"><a class="btn secondary" href="#/explore/${id}">${esc(t('dash.getReady'))}</a><a class="btn secondary" href="#/track/${id}">${esc(t('dash.what'))}</a><button class="link mute" data-act="untrack" data-id="${id}">${esc(t('dash.remove'))}</button></div></div>`;
      }).join('')
    : `<p class="small">${esc(t('dash.none'))} ${R.top.slice(0, 3).map((r) => `<button class="link" data-act="explore" data-id="${r.id}">${esc(nameOf(r.p))}</button>`).join(' · ') || '—'}</p>`;
  return `<h2>${esc(t('dash.h2'))}</h2><p class="sub">${esc(t('dash.sub'))}</p>
  ${continueCard()}
  <div class="dash"><div class="stack">
    <div class="box"><h3>${esc(t('dash.need'))}</h3><p style="margin:0 0 8px">“${esc(S.story)}”</p>${chipStrip()}</div>
    <div class="box"><h3>${esc(t('dash.routes'))}</h3>${tracked}</div>
    <div class="box"><h3>${esc(t('dash.firm'))}</h3>${slots.length
      ? `<p class="small">${esc(t('dash.firmS'))}</p>${slots.map((s) => `<div class="enrich"><b class="small">${esc(qText(s))}</b><div class="row">${QUESTIONS[s].opts.map(([v]) => `<button class="secondary" data-act="enrich" data-slot="${s}" data-v="${attr(v)}">${esc(optL(s, v))}</button>`).join('')}</div></div>`).join('')}`
      : `<p class="small">${esc(t('dash.firmNone'))}</p>`}
      <div id="changed" aria-live="polite">${changed}</div></div>
  </div><div class="stack">
    <div class="box"><h3>${esc(t('saathi.h2'))}</h3><p class="small">${esc(t('dash.saathiS'))}</p><button class="ghost" data-act="help">${esc(t('dash.prepare'))}</button></div>
    <div class="box"><h3>${esc(t('dash.activity'))}</h3><ul class="small" style="padding-left:18px;margin:0">${S.log.slice(0, 8).map((l) => `<li>${esc(l.t)} <span style="color:#98a2b3">· ${esc(l.at)}</span></li>`).join('') || `<li>${esc(t('dash.nothing'))}</li>`}</ul></div>
    <div class="box"><h3>${esc(t('dash.later'))}</h3><p class="small">${esc(t('dash.laterS'))}</p></div>
  </div></div>
  <div class="actions"><a class="btn secondary" href="#/results">${esc(t('dash.view'))}</a><button class="secondary" data-act="reset">${esc(t('dash.clear'))}</button></div>
  ${ctaBar(`<button class="primary" data-act="new-need">${esc(t('dash.new'))}</button>`)}`;
}

/* ---------------- Shareable texts ---------------- */
export function handoffText() {
  const f = S.facts, R = rank(f);
  const known = knownKeys(f).map((k) => `- ${label(k)}: ${fmt(k, V(f, k))}`);
  const tracked = Object.keys(S.tracked).map((id) => `- ${nameOf(byId(id))}${S.tracked[id].outcome ? ` (${outcomeL(S.tracked[id].outcome)})` : ''}`);
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
export function sheetText(id) {
  const f = S.facts;
  const { p, papers, confirms } = readyItems(id);
  const asks = t(p.asks === 'loan' ? 'lenderAsks' : 'officeAsks');
  const a = V(f, 'amount');
  const mark = (it) => { const st = paperState(id, it.key); return st === 'have' ? `✓ ${it.text} (${t('sheet.have')})` : st === 'need' ? `✗ ${it.text} (${t('sheet.need')})` : `• ${it.text}`; };
  return `${t('sheet.title')}

${t('sheet.business')}:
${knownKeys(f).filter((k) => k !== 'need').map((k) => `- ${label(k)}: ${fmt(k, V(f, k))}`).join('\n') || '- ' + t('hand.little')}

${t('sheet.asking')}: ${nameOf(p)}
${needsOf(f).length ? `- ${label('need')}: ${fmt('need', needsOf(f))}\n` : ''}${a != null ? `- ${t('sheet.amount')}: ${money(a)}\n` : ''}
${t('sheet.papers')}:
${papers.map(mark).join('\n')}

${t('sheet.questions')}:
${[...confirms, ...asks].slice(0, 7).map((q) => '- ' + q).join('\n')}

${t('hand.note')}`;
}

/* ---------------- Modals ---------------- */
const shareRow = (src, id = '') => `<div class="actions"><span class="small ok" id="copied" aria-live="polite"></span>
  <button class="secondary" data-act="copy" data-src="${src}" data-id="${id}">${esc(t('share.copy'))}</button>
  <button class="secondary" data-act="print">${esc(t('share.print'))}</button>
  <button class="primary" data-act="share-wa" data-src="${src}" data-id="${id}">${esc(t('share.wa'))}</button></div>`;
export function helpModal() {
  return `<h2>${esc(t('help.h2'))}</h2><p class="sub">${esc(t('help.sub'))}</p>
  <h3>${esc(t('saathi.h2'))}</h3><p class="small">${esc(t('saathi.sub'))}</p>
  <div class="cols"><div><b class="small">${esc(t('saathi.will'))}</b><ul class="list met">${t('saathi.willList').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
  <div><b class="small">${esc(t('saathi.wont'))}</b><ul class="list no">${t('saathi.wontList').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
  ${S.story ? `<h3 style="margin-top:14px">${esc(t('saathi.noteH'))}</h3><pre class="hand printable" id="shareText">${esc(handoffText())}</pre>${shareRow('hand')}` : ''}
  <p class="small">${esc(t('saathi.foot'))}</p>
  <h3>${esc(t('help.official'))}</h3><ul class="small">${SUPPORT.map((s) => `<li>${s.url ? `<a href="${s.url}" target="_blank" rel="noopener">${esc(tc(s.name))}</a>` : esc(tc(s.name))} — ${esc(tc(s.plain))}</li>`).join('')}<li><a href="https://udyamregistration.gov.in/" target="_blank" rel="noopener">${esc(tc('Udyam Registration'))}</a></li></ul>
  <p class="trust">🔒 ${esc(t('start.trust'))}</p>
  <div class="actions"><button class="secondary" data-act="close-modal">${esc(t('saathi.done'))}</button></div>`;
}
export function sheetModal(id) {
  return `<h2>${esc(t('ready.sheet'))}</h2><p class="small">${esc(t('ready.sheetS'))}</p>
  <pre class="hand printable" id="shareText">${esc(sheetText(id))}</pre>${shareRow('sheet', id)}
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
  return `<h2>${esc(t('about.h2'))}</h2><p class="sub">${t('about.sub', { d: RECORDED })}</p>
  <h3>${esc(t('about.gov', { n: gov.length }))}</h3><p class="small">${gov.map((p) => esc(nameOf(p)) + (p.status === 'verify' ? ` <span class="chip a">${esc(t('about.verify'))}</span>` : '')).join(' · ')}</p>
  <h3>${esc(t('about.en', { n: en.length }))}</h3><p class="small">${en.map((p) => esc(nameOf(p))).join(' · ')}</p>
  <h3>${esc(t('about.fin', { n: fin.length }))}</h3><p class="small">${fin.map((p) => esc(nameOf(p))).join(' · ')} ${esc(t('about.finNote'))}</p>
  <h3>${esc(t('about.inst', { n: INSTITUTIONAL.length }))}</h3><p class="small">${INSTITUTIONAL.map((x) => esc(tc(x))).join(' · ')}</p>
  <h3>${esc(t('about.howH'))}</h3><p class="small">${esc(t('about.how'))}</p>
  <h3>${esc(t('about.dataH'))}</h3><p class="small">${esc(t('about.data'))}</p>
  ${t('translationNote') ? `<p class="small">${esc(t('translationNote'))}</p>` : ''}
  <div class="actions"><button class="primary" data-act="close-modal">${esc(t('about.close'))}</button></div>`;
}
