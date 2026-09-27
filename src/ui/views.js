// Pure render functions: state in, HTML string out. Interactions use data-act attributes (see main.js).
// All user-visible text goes through t() / td() / tc() so the page follows the language toggle.
import { S } from '../state.js';
import {
  NEEDS, QUESTIONS, MAX_QUESTIONS, CORPUS, INSTITUTIONAL, SUPPORT, RECORDED, byId,
  V, needsOf, rank, evaluate, enablersFor, openSlots, fitBand, actBand, STATUS_TONE,
} from '../engine/index.js';
import { t, td, tc, money, joinList, getLang, STRINGS } from '../i18n/index.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const attr = (v) => esc(JSON.stringify(v));

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
const fitL = (s) => t('fit.' + fitBand(s));
const actL = (s) => t('act.' + actBand(s));
const nameOf = (p) => tc(p.name);

/* ---------------- Start ---------------- */
export function startView({ ai, canRecord }) {
  return `<h1>${esc(t('start.h1'))}</h1>
  <p class="sub">${esc(t('start.sub'))}</p>
  <label class="small" for="story"><b>${esc(t('start.label'))}</b></label>
  <textarea id="story" placeholder="${esc(t('start.ph'))}">${esc(S.story)}</textarea>
  <div class="row" style="margin-top:8px"><button class="mic" id="micBtn" data-act="mic" ${ai && canRecord ? '' : 'hidden'}>${esc(t('start.mic'))}</button><span class="small" id="micNote" aria-live="polite"></span></div>
  <div class="small" style="margin-top:14px;font-weight:700">${esc(t('start.or'))}</div>
  <div class="tiles">${t('tiles').map((x, i) => `<button class="tile" data-act="tile" data-i="${i}"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></button>`).join('')}</div>
  <div class="actions"><button class="primary" id="goBtn" data-act="start">${esc(t('start.continue'))}</button></div>
  <details><summary class="small">${esc(t('start.demos'))}</summary><div class="demo">${t('demos').map((d, i) => `<button data-act="demo" data-i="${i}">${esc(d[0])}</button>`).join('')}</div></details>`;
}

/* ---------------- Understanding (echo-back) ---------------- */
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
  <div class="actions"><a class="btn secondary" href="#/">${esc(t('check.back'))}</a><button class="primary" data-act="confirm">${esc(t('check.ok'))}</button></div>`;
}

/* ---------------- Adaptive question ---------------- */
export function questionView() {
  const slot = S.curQ;
  const q = QUESTIONS[slot];
  const n = S.asked.filter((s) => s !== 'need').length;
  const R = rank(S.facts);
  const side = S.needHelp
    ? `<b>${esc(t('q.helpTitle'))}</b><p class="small">${esc(t('q.helpText'))}</p><button class="ghost" data-act="saathi">${esc(t('res.talkLower'))}</button>`
    : `<b>${esc(t('q.whyTitle'))}</b><p style="margin:6px 0">${esc(t('q.whyText'))}${S.curAffects.length ? ':' : getLang() === 'hi' ? '।' : '.'}</p>
      ${S.curAffects.length ? '<ul>' + S.curAffects.slice(0, 4).map((id) => '<li>' + esc(nameOf(byId(id))) + '</li>').join('') + '</ul>' : ''}
      <hr><b>${esc(t('q.considering', { n: R.top.length }))}</b><div class="small" style="margin-top:4px">${R.top.slice(0, 5).map((x) => esc(nameOf(x.p))).join(' · ') || esc(t('q.waiting'))}</div>
      <hr><div class="small">${esc(t('q.stop', { max: MAX_QUESTIONS }))}</div>`;
  const desc = (o) => (slot === 'need' ? needS(o[0]) : '');
  return `<div class="qwrap"><div>
    <div class="qprog">${esc(slot === 'need' ? t('q.first') : t('q.n', { n: n + 1, max: MAX_QUESTIONS }))}</div>
    <h2>${esc(qText(slot))}</h2><p class="sub">${esc(qWhy(slot))}</p>
    <div class="opts">${q.opts.map((o, i) => `<button class="opt" data-act="opt" data-i="${i}">${esc(optL(slot, o[0]))}${desc(o) ? `<div class="small">${esc(desc(o))}</div>` : ''}</button>`).join('')}</div>
    ${q.amount ? `<form class="row" data-form="amount"><input id="amtIn" class="grow" placeholder="${esc(t('q.amountPh'))}" aria-label="${esc(label('amount'))}"><button class="ghost" type="submit">${esc(t('q.use'))}</button></form><p class="small err" id="amtErr" aria-live="polite"></p>` : ''}
    <div class="row" style="margin-top:10px"><button class="secondary" data-act="dk">${esc(t('q.dk'))}</button><button class="secondary" data-act="dk" data-skip="1">${esc(t('q.skip'))}</button><span class="grow"></span><button class="link" data-act="show-results">${esc(t('q.showNow'))}</button></div>
  </div><aside class="side">${side}</aside></div>`;
}

/* ---------------- Results ---------------- */
function whyText(r) {
  const f = S.facts, bits = [];
  if (r.need) { const l = needL(r.need); bits.push(t('why.need', { need: getLang() === 'hi' ? l : l[0].toLowerCase() + l.slice(1) })); }
  const a = V(f, 'amount');
  if (a != null && r.p.amount && a >= r.p.amount.min && a <= r.p.amount.max) bits.push(t('why.amount', { a: money(a) }));
  const st = V(f, 'stage');
  if (st) bits.push(t(st === 'new' ? 'why.new' : 'why.existing'));
  const act = V(f, 'activity');
  if (act && (r.p.relevantIf || r.id === 'mudra')) bits.push(t('why.fits', { a: activityL(act) }));
  let s = t('why.because', { x: bits.length ? joinList(bits) : t('why.default') });
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
function condLi(cs) {
  return cs.map((c) => `<li>${esc(tc(c.text))}${c.basis === 'typical' ? ` <span class="chip">${esc(t('chip.typical'))}</span>` : ''}${c.kind === 'conditional' ? ` <span class="chip">${esc(t('chip.ifApplicable'))}</span>` : ''}</li>`).join('');
}
function knownFacts(r) {
  const f = S.facts, out = [];
  if (r.need) out.push(t('known.need', { x: needL(r.need) }));
  const a = V(f, 'amount'); if (a != null) out.push(t('known.amount', { x: money(a) }));
  const st = V(f, 'stage'); if (st) out.push(t('known.stage', { x: fmt('stage', st) }));
  const act = V(f, 'activity'); if (act) out.push(t('known.biz', { x: activityL(act) }));
  return out;
}
function bars(parts) {
  return Object.entries(parts).map(([k, [v, w]]) => `<div class="small split"><span>${esc(t('part.' + k))}</span><span>${Math.round(v * w)} / ${w}</span></div><div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div>`).join('');
}
function scorePanel(r) {
  const m = r.conds.filter((c) => c.kind === 'mandatory');
  const n = (st) => m.filter((c) => c.state === st).length;
  return `<div class="sgrid">
    <div><b>${esc(t('score.fit', { n: r.fit }))}</b> <span class="small">${esc(t('score.ranks'))}</span>${bars(r.parts)}</div>
    <div><b>${esc(t('score.conds'))}</b> <span class="small">${esc(t('score.shown'))}</span><p class="small">${esc(t('score.condText', { m: n('met'), t: m.length, u: n('unknown'), n: n('not_met') }))}<br>${esc(t('score.unknownNo'))}</p></div>
    <div><b>${esc(t('score.act', { n: r.act }))}</b> <span class="small">${esc(t('score.tie'))}</span>${bars(r.aparts)}</div>
  </div><p class="small">${esc(t('score.note'))}</p>`;
}
function card(r) {
  const p = r.p, f = S.facts;
  const g = (s) => r.conds.filter((c) => c.state === s);
  const en = enablersFor(r, f);
  const known = knownFacts(r).map((x) => `<li>${esc(x)}</li>`).join('') + condLi(g('met'));
  const toCheck = g('unknown').length || g('todo').length
    ? `<ul class="list unk">${condLi(g('unknown'))}</ul><ul class="list todo">${condLi(g('todo'))}</ul>`
    : `<p class="small">${esc(t('card.nothing'))}</p>`;
  const host = (u) => u.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `<article class="card" id="c-${r.id}">
    <div class="top"><div><div class="name">${esc(nameOf(p))}</div>
      <div><span class="chip ${p.family === 'gov' ? 'b' : ''}">${esc(t(p.family === 'gov' ? 'chip.gov' : 'chip.fin'))}</span>${p.parent ? `<span class="chip">${esc(t('card.partOf', { p: p.parent }))}</span>` : ''}<span class="chip ${STATUS_TONE[r.status]}">${esc(t('status.' + r.status))}</span></div></div>
      <div class="fitbox"><div class="fitlabel">${esc(fitL(r.fit))}</div><div class="small">${esc(actL(r.act))}</div></div></div>
    <p style="margin:10px 0 0">${esc(tc(p.plain))}</p>
    <div class="why">${esc(whyText(r))}</div>
    <div class="cols"><div><b class="small">${esc(t('card.know'))}</b><ul class="list met">${known || `<li>${esc(t('card.only'))}</li>`}</ul></div>
      <div><b class="small">${esc(t('card.check'))}</b>${toCheck}</div></div>
    ${en.map(({ e, conds }) => { const u = conds.filter((c) => c.state === 'unknown'); return `<div class="enabler"><b>${esc(t('card.alsoAsk', { n: nameOf(e) }))}</b> — ${esc(tc(e.plain))}${u.length ? `<div class="small">${esc(t('card.toCheck', { x: u.map((c) => tc(c.text)).join('; ') }))}</div>` : ''}</div>`; }).join('')}
    <div class="small" style="margin-top:10px"><b>${esc(t('card.route'))}</b> ${esc(tc(p.route.text))}${p.route.url ? ` — <a href="${p.route.url}" target="_blank" rel="noopener">${esc(host(p.route.url))} ↗</a>` : ''}<br>
      <b>${esc(t('card.source'))}</b> ${p.src ? `<a href="${p.src.u}" target="_blank" rel="noopener">${esc(tc(p.src.t))}</a> · ${esc(t('card.recorded', { d: RECORDED }))} · <span style="color:var(--amber)">${esc(t('card.notVerified'))}</span>` : esc(t('card.generic'))}${p.corpusNote ? ` · <span class="chip">${esc(tc(p.corpusNote))}</span>` : ''}</div>
    <div class="actions left" style="margin-top:12px"><button class="primary" data-act="explore" data-id="${r.id}">${esc(t('card.explore'))}</button><button class="ghost" data-act="toggle-score" data-id="${r.id}" aria-expanded="false">${esc(t('card.how'))}</button></div>
    <div class="score" id="sc-${r.id}" hidden>${scorePanel(r)}</div>
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
  const basis = ['need', 'amount', 'stage', 'activity', 'city'].map((k) => (V(f, k) != null ? fmt(k, V(f, k)) : null)).filter(Boolean);
  let h = `<h2>${esc(t('res.h2'))}</h2><p class="sub">${esc(t('res.basis', { b: basis.join(' · ') || t('res.yourDesc') }))}</p>`;
  if (t('translationNote')) h += `<p class="small">${esc(t('translationNote'))}</p>`;
  if (!needsOf(f).length) {
    h += `<div class="banner"><b>${esc(t('res.needMore.t'))}</b>${esc(t('res.needMore.b'))} <button class="link" data-act="confirm">${esc(t('res.answerOne'))}</button> ${esc(t('res.or'))} <button class="link" data-act="saathi">${esc(t('res.talkLower'))}</button>.</div>`;
  } else if (!R.top.length) {
    h += `<div class="banner"><b>${esc(t('res.none.t'))}</b>${esc(t('res.none.b'))}<div class="actions left"><button class="primary" data-act="saathi">${esc(t('res.talkLower'))}</button></div></div>`;
  } else if (R.noGov && R.wantsMoney) {
    const cg = R.fin.some((r) => enablersFor(r, f).length);
    h += `<div class="banner"><b>${esc(t('res.noGov.t'))}</b>${esc(t('res.noGov.b'))}${cg ? esc(t('res.noGov.cg')) : ''}<div class="small" style="margin-top:6px">${esc(t('res.noGov.cov', { n: CORPUS.filter((p) => p.family === 'gov').length }))}</div></div>`;
  }
  if (V(f, 'udyam') === 'no') {
    const needU = R.top.filter((r) => r.conds.some((c) => c.slot === 'udyam'));
    h += `<div class="note"><b>${esc(t('res.udyam.t'))}</b> ${esc(needU.length ? t('res.udyam.some', { list: needU.map((r) => nameOf(r.p)).join(', ') }) : t('res.udyam.none'))} <a href="https://udyamregistration.gov.in/" target="_blank" rel="noopener">udyamregistration.gov.in ↗</a></div>`;
  }
  if (R.gov.length) h += `<section class="group"><h3>${esc(t('res.gov'))} <span class="chip b">${R.gov.length}</span></h3><div class="cards">${R.gov.map(card).join('')}</div></section>`;
  if (R.fin.length) h += `<section class="group"><h3>${esc(t('res.fin'))} <span class="chip">${R.fin.length}</span></h3><p class="small">${esc(t('res.finNote'))}</p><div class="cards">${R.fin.map(card).join('')}</div></section>`;
  if (R.top.length) {
    const check = (r) => r.conds.filter((c) => (c.state === 'unknown' || c.state === 'todo') && c.slot !== 'lender').map((c) => tc(c.text).split(' — ')[0]).slice(0, 2).join('; ') || t(r.conds.some((c) => c.slot === 'lender') ? 'check.lender' : 'check.confirmTerms');
    h += `<section class="group"><h3>${esc(t('res.side'))}</h3><div class="tablewrap"><table><thead><tr><th>${esc(t('th.route'))}</th><th>${esc(t('th.why'))}</th><th>${esc(t('th.check'))}</th><th>${esc(t('th.how'))}</th><th>${esc(t('th.next'))}</th></tr></thead><tbody>
      ${R.top.map((r) => `<tr><td><b>${esc(nameOf(r.p))}</b><br><span class="small">${esc(fitL(r.fit))}</span></td><td>${esc(r.need ? needL(r.need) : '')}</td><td>${esc(check(r))}</td><td>${esc(t('speed.' + r.p.speed))} · ${esc(t('steps', { n: r.p.steps }))}</td><td>${esc(tc(r.p.route.text))}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small">${esc(t('res.noBest'))}</p></section>`;
  }
  const help = helpReasons(R);
  if (help.length) h += `<div class="banner help"><b>${esc(t('help.t'))}</b>${esc(help.join(' '))}<div class="actions left"><button class="ghost" data-act="saathi">${esc(t('res.talkLower'))}</button></div></div>`;
  if (R.hidden.length) h += `<details><summary>${esc(t('hidden.sum', { n: R.hidden.length }))}</summary><ul class="list no">${R.hidden.map((r) => `<li><b>${esc(nameOf(r.p))}</b> — ${esc(reasonText(r))}</li>`).join('')}</ul></details>`;
  h += `<div class="warn"><b>${esc(t('res.warn.t'))}</b> ${esc(t('res.warn.b'))}</div>
    <div class="actions"><a class="btn secondary" href="#/check">${esc(t('res.back'))}</a><a class="btn primary" href="#/my-msme">${esc(t('res.openMy'))}</a></div>`;
  return h;
}

/* ---------------- Action plan ---------------- */
export function checklistItems(id) {
  const p = byId(id);
  const r = evaluate(p, S.facts);
  const conds = r ? r.conds : [];
  // Keys stay in English so ticks survive a language switch.
  return [
    ...conds.filter((c) => c.state === 'unknown' || c.state === 'todo').map((c) => ['v:' + c.text, t('act.confirm', { x: tc(c.text) }), c.basis]),
    ...(p.info || []).map(([d, b]) => ['d:' + d, tc(d), b]),
  ];
}
function stepper(id) {
  const st = S.tracked[id], names = t('stages');
  return `<div class="steps">${names.map((s, i) => `<button class="step ${i < st.stage ? 'done' : i === st.stage ? 'cur' : ''}" data-act="stage" data-id="${id}" data-i="${i}">${esc(s)}</button>${i < names.length - 1 ? '<span class="arrow">→</span>' : ''}`).join('')}</div>`;
}
export function actionView(id) {
  const p = byId(id), st = S.tracked[id];
  const items = checklistItems(id);
  const inPerson = p.access !== 'online';
  return `<h2>${esc(t('act.h2', { n: nameOf(p) }))}</h2><p class="sub">${esc(t('act.sub'))}</p>${stepper(id)}
  <div class="dash"><div class="box"><h3>${esc(t('act.verify'))}</h3>
    ${items.map(([k, l, b]) => `<label class="check"><input type="checkbox" data-act="tick" data-id="${id}" data-k="${esc(k)}" ${st.done[k] ? 'checked' : ''}><span>${esc(l)} ${b === 'typical' ? `<span class="chip">${esc(t('act.typicalConfirm'))}</span>` : ''}</span></label>`).join('') || `<p class="small">${esc(t('act.nothing'))}</p>`}
    <h3 style="margin-top:16px">${esc(t('act.route'))}</h3><p>${esc(tc(p.route.text))}${p.route.url ? `<br><a href="${p.route.url}" target="_blank" rel="noopener">${esc(p.route.url)} ↗</a>` : ''}</p>
    <h3 style="margin-top:16px">${esc(t(p.asks === 'loan' ? 'act.askLender' : 'act.askOffice'))}</h3><ul class="small">${t(p.asks === 'loan' ? 'lenderAsks' : 'officeAsks').map((q) => '<li>' + esc(q) + '</li>').join('')}</ul></div>
  <div class="box">${inPerson
    ? `<h3>${esc(t('act.nearT'))}</h3><p class="small">${esc(t('act.nearS'))}</p><form class="row" data-form="pin" data-id="${id}"><input id="pin" class="grow" maxlength="6" inputmode="numeric" placeholder="${esc(t('act.pinPh'))}" aria-label="${esc(t('act.pinPh'))}"><button class="ghost" type="submit">${esc(t('act.search'))}</button></form><div id="near" aria-live="polite"></div>`
    : `<h3>${esc(t('act.onlineT'))}</h3><p class="small">${esc(t('act.onlineS'))}</p>`}
    <hr><h3>${esc(t('act.helpT'))}</h3><p class="small">${esc(t('act.helpS'))}</p><button class="ghost" data-act="saathi">${esc(t('act.note'))}</button></div></div>
  <div class="actions"><a class="btn secondary" href="#/results">${esc(t('act.back'))}</a><a class="btn primary" href="#/my-msme">${esc(t('act.save'))}</a></div>`;
}
export function nearbyHtml(id, pin) {
  const p = byId(id);
  const kinds = [p.access === 'lender' || p.asks === 'loan' ? 'bank' : null, 'dic', 'dfo', p.access === 'mixed' ? 'csc' : null].filter(Boolean);
  // Map queries stay in English (better results); labels follow the UI language.
  return `<ul class="small">${kinds.map((k) => `<li><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STRINGS.en['near.' + k] + ' near ' + pin)}">${esc(t('near.fmt', { x: t('near.' + k), pin }))} ↗</a></li>`).join('')}</ul><p class="small">${esc(t('near.note'))}</p>`;
}

/* ---------------- Dashboard ---------------- */
export function dashView(changed = '') {
  if (!S.story) return `<h2>${esc(t('dash.h2'))}</h2><p class="sub">${esc(t('dash.empty'))}</p><a class="btn primary" href="#/">${esc(t('dash.start'))}</a>`;
  const f = S.facts, R = rank(f), ids = Object.keys(S.tracked);
  const slots = openSlots(f).slice(0, 4);
  const maxStage = Math.max(1, ...ids.map((id) => S.tracked[id].stage));
  const tracked = ids.length
    ? ids.map((id) => {
        const p = byId(id), items = checklistItems(id), st = S.tracked[id];
        const done = items.filter(([k]) => st.done[k]).length;
        return `<div style="border-top:1px solid var(--line);padding:10px 0"><div class="row" style="justify-content:space-between"><b>${esc(nameOf(p))}</b><span class="small">${esc(t('dash.ready', { d: done, n: items.length }))}</span></div>${stepper(id)}
          <a class="link" href="#/explore/${id}">${esc(t('dash.open'))}</a><button class="link mute" data-act="untrack" data-id="${id}">${esc(t('dash.remove'))}</button></div>`;
      }).join('')
    : `<p class="small">${esc(t('dash.none'))} ${R.top.slice(0, 3).map((r) => `<button class="link" data-act="explore" data-id="${r.id}">${esc(nameOf(r.p))}</button>`).join(' · ') || '—'}</p>`;
  return `<h2>${esc(t('dash.h2'))}</h2><p class="sub">${esc(t('dash.sub'))}</p>
  <div class="dash"><div class="stack">
    <div class="box"><h3>${esc(t('dash.need'))}</h3><p style="margin:0 0 8px">“${esc(S.story)}”</p>${knownKeys(f).map((k) => `<span class="chip">${esc(label(k))}: ${esc(fmt(k, V(f, k)))}</span>`).join('')}</div>
    <div class="box"><h3>${esc(t('dash.routes'))}</h3>${tracked}</div>
    <div class="box"><h3>${esc(t('dash.firm'))}</h3>${slots.length
      ? `<p class="small">${esc(t('dash.firmS'))}</p>${slots.map((s) => `<div class="enrich"><b class="small">${esc(qText(s))}</b><div class="row">${QUESTIONS[s].opts.map(([v]) => `<button class="secondary" data-act="enrich" data-slot="${s}" data-v="${attr(v)}">${esc(optL(s, v))}</button>`).join('')}</div></div>`).join('')}`
      : `<p class="small">${esc(t('dash.firmNone'))}</p>`}
      <div id="changed" aria-live="polite">${changed}</div></div>
  </div><div class="stack">
    <div class="box"><h3>${esc(t('dash.journey'))}</h3><div class="steps">${t('journey').map((s, i) => `<span class="step ${i <= maxStage ? 'done' : ''}">${esc(s)}</span>`).join('<span class="arrow">↓</span>')}</div></div>
    <div class="box"><h3>${esc(t('saathi.h2'))}</h3><p class="small">${esc(t('dash.saathiS'))}</p><button class="ghost" data-act="saathi">${esc(t('dash.prepare'))}</button></div>
    <div class="box"><h3>${esc(t('dash.activity'))}</h3><ul class="small" style="padding-left:18px;margin:0">${S.log.slice(0, 8).map((l) => `<li>${esc(l.t)} <span style="color:#98a2b3">· ${esc(l.at)}</span></li>`).join('') || `<li>${esc(t('dash.nothing'))}</li>`}</ul></div>
    <div class="box"><h3>${esc(t('dash.later'))}</h3><p class="small">${esc(t('dash.laterS'))}</p></div>
  </div></div>
  <div class="actions"><a class="btn secondary" href="#/results">${esc(t('dash.view'))}</a><button class="secondary" data-act="reset">${esc(t('dash.clear'))}</button><button class="primary" data-act="new-need">${esc(t('dash.new'))}</button></div>`;
}

/* ---------------- Modals ---------------- */
export function handoffText() {
  const f = S.facts, R = rank(f), stages = t('stages');
  const known = knownKeys(f).map((k) => `- ${label(k)}: ${fmt(k, V(f, k))}`);
  const tracked = Object.keys(S.tracked).map((id) => `- ${nameOf(byId(id))} (${stages[S.tracked[id].stage]})`);
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
export function saathiModal() {
  return `<h2>${esc(t('saathi.h2'))}</h2><p class="sub">${esc(t('saathi.sub'))}</p>
  <div class="cols"><div><b class="small">${esc(t('saathi.will'))}</b><ul class="list met">${t('saathi.willList').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
  <div><b class="small">${esc(t('saathi.wont'))}</b><ul class="list no">${t('saathi.wontList').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
  <h3 style="margin-top:14px">${esc(t('saathi.noteH'))}</h3><pre class="hand" id="hand">${esc(handoffText())}</pre>
  <div class="actions"><span class="small ok" id="copied" aria-live="polite"></span><button class="secondary" data-act="copy-hand">${esc(t('saathi.copy'))}</button><button class="primary" data-act="close-modal">${esc(t('saathi.done'))}</button></div>
  <p class="small">${esc(t('saathi.foot'))} ${SUPPORT.map((s) => (s.url ? `<a href="${s.url}" target="_blank" rel="noopener">${esc(tc(s.name))}</a>` : esc(tc(s.name)))).join(' · ')}.</p>`;
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
