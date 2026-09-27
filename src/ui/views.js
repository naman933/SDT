// Pure render functions: state in, HTML string out. Interactions use data-act attributes (see main.js).
import { S } from '../state.js';
import {
  NEEDS, QUESTIONS, MAX_QUESTIONS, CORPUS, INSTITUTIONAL, SUPPORT, RECORDED, byId,
  V, needsOf, inr, rank, evaluate, enablersFor, openSlots, fitLabel, actLabel, STATUS,
} from '../engine/index.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const attr = (v) => esc(JSON.stringify(v));

export const LABEL = {
  need: 'What it is for', amount: 'Amount', stage: 'Business stage', activity: 'Business', sector: 'Sector', city: 'City', state: 'State / UT',
  urgency: 'Timing', buyer_type: 'Customer who owes you', overdue: 'Payment overdue', udyam: 'Udyam registration', green_tech: 'Kind of equipment',
  dairy_type: 'Dairy type', size: 'Yearly sales', applicant: 'Entrepreneur', artisan_trade: 'Traditional trade',
};
const EXTRA = {
  sector: { manufacturing: 'Manufacturing', services: 'Services', trading: 'Trading', dairy: 'Dairy (allied agriculture)', agri_crop: 'Crop farming' },
};
export function fmt(k, v) {
  if (v == null || v === 'unknown') return 'Not known yet';
  if (k === 'need') return v.map((n) => NEEDS[n]?.l || n).join(' · ');
  if (k === 'amount') return inr(v);
  const o = QUESTIONS[k]?.opts.find((x) => x[0] === v);
  if (o) return o[1];
  return EXTRA[k]?.[v] || v;
}
const ORIGIN = { said: ['o-said', 'You said'], ai: ['o-ai', 'Understood'], inferred: ['o-inferred', 'We assumed'], answered: ['o-answered', 'You answered'], unknown: ['o-unknown', 'Not known'] };
const knownKeys = (f) => Object.keys(f).filter((k) => LABEL[k] && V(f, k) != null);

export const TILES = [
  ["I don't know", 'Help me figure it out', "I'm not sure what support or funding is right for my business. Help me figure it out."],
  ['Buy a machine', 'Equipment / tools / upgrade', 'I need money to buy a machine for my business.'],
  ["A customer hasn't paid", 'Stuck payment, cash is tight', "A customer hasn't paid me and I need cash."],
  ['Money to run the business', 'Stock, raw material, wages', 'I need money for stock and day-to-day running of my business.'],
  ['Start something new', 'New business', 'I want to start a new business.'],
  ['Get more customers', 'Sell more / online / to government', 'I want to find more customers and sell more.'],
];
export const DEMOS = [
  ['1 · Dairy, ₹8L machine', 'I run a dairy near Pune in Maharashtra. I need about 8 lakh for a new milk chilling machine.'],
  ['2 · Pune manufacturer, ₹25L expansion', 'We manufacture auto parts in Pune and have more orders than we can handle. We want to expand capacity with new machines worth about 25 lakh.'],
  ['3 · Mumbai retailer, ₹3L stock', 'I have a kirana shop in Mumbai and need around 3 lakh for stock before the festive season.'],
  ['4 · New entrepreneur, ₹10L', 'I want to start my own tailoring and boutique business and need about 10 lakh.'],
  ["5 · Customer hasn't paid", "My customer hasn't paid me and I need cash."],
  ['6 · No Udyam', "I need money to grow my business but I don't have Udyam registration."],
  ['7 · No government route', 'We are a wholesale trader in Surat with about 60 crore annual sales. We need 1.5 crore working capital for festive stock, urgently.'],
  ['Hindi', 'Main Pune mein dairy chalata hoon, 8 lakh ki nayi milk chilling machine leni hai'],
];

/* ---------------- Start ---------------- */
export function startView({ ai, canRecord }) {
  return `<h1>Tell us what's happening in your business.</h1>
  <p class="sub">You don't need to know any scheme or loan name. Describe a problem, a plan or a money need in your own words — any language. We'll help you figure out what to explore next.</p>
  <label class="small" for="story"><b>What's happening in your business?</b></label>
  <textarea id="story" placeholder="Example: I run a dairy near Pune and need about ₹8 lakh for a milk chilling machine.">${esc(S.story)}</textarea>
  <div class="row" style="margin-top:8px"><button class="mic" id="micBtn" data-act="mic" ${ai && canRecord ? '' : 'hidden'}>🎙 Speak instead</button><span class="small" id="micNote" aria-live="polite"></span></div>
  <div class="small" style="margin-top:14px;font-weight:700">Or start from a situation:</div>
  <div class="tiles">${TILES.map((t, i) => `<button class="tile" data-act="tile" data-i="${i}"><b>${esc(t[0])}</b><span>${esc(t[1])}</span></button>`).join('')}</div>
  <div class="actions"><button class="primary" id="goBtn" data-act="start">Continue →</button></div>
  <details><summary class="small">Demo scenarios</summary><div class="demo">${DEMOS.map((d, i) => `<button data-act="demo" data-i="${i}">${esc(d[0])}</button>`).join('')}</div></details>`;
}

/* ---------------- Understanding (echo-back) ---------------- */
export function understandView() {
  const keys = Object.keys(S.facts).filter((k) => LABEL[k]);
  const rows = keys.map((k) => {
    const x = S.facts[k];
    const o = x.v === 'unknown' ? ORIGIN.unknown : ORIGIN[x.o] || ORIGIN.said;
    return `<div class="fact"><div><div class="k">${LABEL[k]}</div><div class="v">${esc(fmt(k, x.v))}</div></div>
      <div class="row"><span class="origin ${o[0]}">${o[1]}</span><button class="link" data-act="drop-fact" data-k="${k}">Remove</button></div></div>`;
  }).join('');
  return `<h2>Here's what we understood</h2>
  <p class="sub">Please check this. Anything wrong? Remove it and we'll ask instead. Nothing else is required to start.</p>
  ${S.summary ? `<div class="note"><b>In short:</b> ${esc(S.summary)}</div>` : ''}
  <div class="facts">${rows || `<div class="note">That's okay — let's start with what is happening in your business. We'll ask one short question at a time.</div>`}</div>
  <p class="small"><span class="origin o-said">You said</span> taken from your words · <span class="origin o-ai">Understood</span> read by AI from your words · <span class="origin o-inferred">We assumed</span> implied, not stated — please check</p>
  <div class="actions"><a class="btn secondary" href="#/">← Edit my words</a><button class="primary" data-act="confirm">Looks right →</button></div>`;
}

/* ---------------- Adaptive question ---------------- */
export function questionView() {
  const slot = S.curQ;
  const q = QUESTIONS[slot];
  const n = S.asked.filter((s) => s !== 'need').length;
  const R = rank(S.facts);
  const side = S.needHelp
    ? `<b>That's okay.</b><p class="small">Pick the situation that feels closest — or talk to a Finance Saathi, who can work it out with you.</p><button class="ghost" data-act="saathi">Talk to a Finance Saathi</button>`
    : `<b>Why this question?</b><p style="margin:6px 0">It is the one answer most likely to change what we show you${S.curAffects.length ? ':' : '.'}</p>
      ${S.curAffects.length ? '<ul>' + S.curAffects.slice(0, 4).map((id) => '<li>' + esc(byId(id)?.name) + '</li>').join('') + '</ul>' : ''}
      <hr><b>Routes being considered now: ${R.top.length}</b><div class="small" style="margin-top:4px">${R.top.slice(0, 5).map((x) => esc(x.p.name)).join(' · ') || '— waiting for your first answer'}</div>
      <hr><div class="small">We stop asking as soon as more answers would not change the result — at most ${MAX_QUESTIONS} questions.</div>`;
  return `<div class="qwrap"><div>
    <div class="qprog">${slot === 'need' ? 'First question' : `Question ${n + 1} · up to ${MAX_QUESTIONS}`}</div>
    <h2>${esc(q.q)}</h2><p class="sub">${esc(q.why)}</p>
    <div class="opts">${q.opts.map((o, i) => `<button class="opt" data-act="opt" data-i="${i}">${esc(o[1])}${o[2] ? `<div class="small">${esc(o[2])}</div>` : ''}</button>`).join('')}</div>
    ${q.amount ? `<form class="row" data-form="amount"><input id="amtIn" class="grow" placeholder="Or type an amount, e.g. 8 lakh" aria-label="Amount"><button class="ghost" type="submit">Use this</button></form><p class="small err" id="amtErr" aria-live="polite"></p>` : ''}
    <div class="row" style="margin-top:10px"><button class="secondary" data-act="dk">I don't know</button><button class="secondary" data-act="dk" data-skip="1">Skip</button><span class="grow"></span><button class="link" data-act="show-results">Show me what you have now →</button></div>
  </div><aside class="side">${side}</aside></div>`;
}

/* ---------------- Results ---------------- */
function whyText(r) {
  const f = S.facts, bits = [];
  if (r.need) { const l = NEEDS[r.need].l; bits.push(`you want to ${l[0].toLowerCase() + l.slice(1)}`); }
  const a = V(f, 'amount');
  if (a != null && r.p.amount && a >= r.p.amount.min && a <= r.p.amount.max) bits.push(`${inr(a)} is within what it covers`);
  const st = V(f, 'stage');
  if (st) bits.push(st === 'new' ? 'you are starting a new business' : 'your business is already running');
  const act = V(f, 'activity');
  if (act && (r.p.relevantIf || r.id === 'mudra')) bits.push(`it fits your business (${act})`);
  let s = 'This surfaced because ' + (bits.length ? bits.join(', ').replace(/, ([^,]*)$/, ' and $1') : 'it matches the kind of need you described') + '.';
  const extra = r.p.why?.(f);
  if (extra) s += ' ' + extra;
  return s;
}
function condLi(cs) {
  return cs.map((c) => `<li>${esc(c.text)}${c.basis === 'typical' ? ' <span class="chip">typical</span>' : ''}${c.kind === 'conditional' ? ' <span class="chip">if applicable</span>' : ''}</li>`).join('');
}
function knownFacts(r) {
  const f = S.facts, out = [];
  if (r.need) out.push('Need: ' + NEEDS[r.need].l);
  const a = V(f, 'amount'); if (a != null) out.push('Amount: about ' + inr(a));
  const st = V(f, 'stage'); if (st) out.push('Stage: ' + fmt('stage', st));
  const act = V(f, 'activity'); if (act) out.push('Business: ' + act);
  return out;
}
function bars(parts) {
  return Object.entries(parts).map(([k, [v, w]]) => `<div class="small split"><span>${esc(k)}</span><span>${Math.round(v * w)} / ${w}</span></div><div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div>`).join('');
}
function scorePanel(r) {
  const m = r.conds.filter((c) => c.kind === 'mandatory');
  const n = (st) => m.filter((c) => c.state === st).length;
  return `<div class="sgrid">
    <div><b>Need fit ${r.fit}/100</b> <span class="small">(ranks the list)</span>${bars(r.parts)}</div>
    <div><b>Conditions</b> <span class="small">(shown, not added)</span><p class="small">${n('met')} of ${m.length} required conditions confirmed · ${n('unknown')} unknown · ${n('not_met')} not met.<br>Unknown never counts as "no".</p></div>
    <div><b>Actionability ${r.act}/100</b> <span class="small">(tie-break)</span>${bars(r.aparts)}</div>
  </div><p class="small">Heuristic prototype weights — not validated, not an approval probability.</p>`;
}
function card(r) {
  const p = r.p, f = S.facts, st = STATUS[r.status];
  const g = (s) => r.conds.filter((c) => c.state === s);
  const en = enablersFor(r, f);
  const known = knownFacts(r).map((x) => `<li>${esc(x)}</li>`).join('') + condLi(g('met'));
  const toCheck = g('unknown').length || g('todo').length
    ? `<ul class="list unk">${condLi(g('unknown'))}</ul><ul class="list todo">${condLi(g('todo'))}</ul>`
    : '<p class="small">Nothing we know of — still confirm on the official source.</p>';
  const host = (u) => u.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `<article class="card" id="c-${r.id}">
    <div class="top"><div><div class="name">${esc(p.name)}</div>
      <div><span class="chip ${p.family === 'gov' ? 'b' : ''}">${p.family === 'gov' ? 'Government' : 'Formal finance'}</span>${p.parent ? `<span class="chip">part of ${esc(p.parent)}</span>` : ''}<span class="chip ${st[0]}">${st[1]}</span></div></div>
      <div class="fitbox"><div class="fitlabel">${fitLabel(r.fit)}</div><div class="small">${actLabel(r.act)}</div></div></div>
    <p style="margin:10px 0 0">${esc(p.plain)}</p>
    <div class="why">${esc(whyText(r))}</div>
    <div class="cols"><div><b class="small">What we know</b><ul class="list met">${known || '<li>Only your description so far</li>'}</ul></div>
      <div><b class="small">What still needs checking</b>${toCheck}</div></div>
    ${en.map(({ e, conds }) => { const u = conds.filter((c) => c.state === 'unknown'); return `<div class="enabler"><b>Also ask about: ${esc(e.name)}</b> — ${esc(e.plain)}${u.length ? `<div class="small">To check: ${u.map((c) => esc(c.text)).join('; ')}</div>` : ''}</div>`; }).join('')}
    <div class="small" style="margin-top:10px"><b>Official route:</b> ${esc(p.route.text)}${p.route.url ? ` — <a href="${p.route.url}" target="_blank" rel="noopener">${esc(host(p.route.url))} ↗</a>` : ''}<br>
      <b>Source:</b> ${p.src ? `<a href="${p.src.u}" target="_blank" rel="noopener">${esc(p.src.t)}</a> · recorded ${RECORDED} · <span style="color:var(--amber)">not live-verified</span>` : 'General route category — no single official source; terms vary by lender'}${p.corpusNote ? ` · <span class="chip">${esc(p.corpusNote)}</span>` : ''}</div>
    <div class="actions left" style="margin-top:12px"><button class="primary" data-act="explore" data-id="${r.id}">Explore this →</button><button class="ghost" data-act="toggle-score" data-id="${r.id}" aria-expanded="false">How was this scored?</button></div>
    <div class="score" id="sc-${r.id}" hidden>${scorePanel(r)}</div>
  </article>`;
}
function helpReasons(R) {
  const w = [];
  if (S.dk >= 2) w.push("You weren't sure about a few things — that's normal.");
  const t = R.top[0];
  if (t && t.conds.filter((c) => c.state === 'unknown' && c.kind === 'mandatory').length >= 3) w.push('The leading route has several conditions to check.');
  if (t && t.act < 55) w.push('The leading route has several steps.');
  if (!R.top.length) w.push('We could not find a route in our coverage.');
  return w;
}
export function resultsView() {
  const f = S.facts, R = rank(f);
  const basis = ['need', 'amount', 'stage', 'activity', 'city'].map((k) => (V(f, k) != null ? fmt(k, V(f, k)) : null)).filter(Boolean);
  let h = `<h2>What may be relevant to you</h2><p class="sub">Based on: ${esc(basis.join(' · ') || 'your description')}. Add or change details any time — the result updates.</p>`;
  if (!needsOf(f).length) {
    h += `<div class="banner"><b>We need one more piece of information.</b>We couldn't tell what the money or help is for. <button class="link" data-act="confirm">Answer one question →</button> or <button class="link" data-act="saathi">talk to a Finance Saathi</button>.</div>`;
  } else if (!R.top.length) {
    h += `<div class="banner"><b>We couldn't find a route in our current coverage for this situation.</b>That doesn't mean there isn't one — our corpus is limited. A person can help you look further.<div class="actions left"><button class="primary" data-act="saathi">Talk to a Finance Saathi</button></div></div>`;
  } else if (R.noGov && R.wantsMoney) {
    const cg = R.fin.some((r) => enablersFor(r, f).length);
    h += `<div class="banner"><b>No directly relevant government scheme found — from the programmes we currently cover.</b>That's common, and your need may still be met through formal finance below.${cg ? ' A government-backed credit guarantee (CGTMSE) may still support a bank or NBFC loan — ask the lender.' : ''}<div class="small" style="margin-top:6px">Our corpus covers ${CORPUS.filter((p) => p.family === 'gov').length} central programmes; state and district schemes are not yet included.</div></div>`;
  }
  if (V(f, 'udyam') === 'no') {
    const needU = R.top.filter((r) => r.conds.some((c) => c.slot === 'udyam'));
    h += `<div class="note"><b>No Udyam? That's fine — it doesn't stop you exploring.</b> ${needU.length ? `It may matter for: ${needU.map((r) => esc(r.p.name)).join(', ')}. It's free and online, and you can do it once you choose a route.` : 'None of the routes below need it right now.'} <a href="https://udyamregistration.gov.in/" target="_blank" rel="noopener">udyamregistration.gov.in ↗</a></div>`;
  }
  if (R.gov.length) h += `<section class="group"><h3>Government support <span class="chip b">${R.gov.length}</span></h3><div class="cards">${R.gov.map(card).join('')}</div></section>`;
  if (R.fin.length) h += `<section class="group"><h3>Formal finance <span class="chip">${R.fin.length}</span></h3><p class="small">Route categories, not specific lenders. We don't rank by interest rate or approval chances because we don't have comparable, verified data.</p><div class="cards">${R.fin.map(card).join('')}</div></section>`;
  if (R.top.length) {
    const check = (r) => r.conds.filter((c) => (c.state === 'unknown' || c.state === 'todo') && c.slot !== 'lender').map((c) => c.text.split(' — ')[0]).slice(0, 2).join('; ') || (r.conds.some((c) => c.slot === 'lender') ? "Lender's assessment and terms" : 'Confirm terms');
    h += `<section class="group"><h3>Side by side</h3><div class="tablewrap"><table><thead><tr><th>Route</th><th>Why relevant</th><th>What to check</th><th>How long / how hard</th><th>Next step</th></tr></thead><tbody>
      ${R.top.map((r) => `<tr><td><b>${esc(r.p.name)}</b><br><span class="small">${fitLabel(r.fit)}</span></td><td>${esc(NEEDS[r.need]?.l || '')}</td><td>${esc(check(r))}</td><td>${{ fast: 'Usually quicker', medium: 'Weeks', slow: 'Can take months' }[r.p.speed]} · ${r.p.steps} steps</td><td>${esc(r.p.route.text)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small">No route is "best" for everyone. It depends on urgency, total cost, collateral, amount, repayment ability and paperwork. If you are also considering borrowing from people you know, compare the total cost and terms the same way.</p></section>`;
  }
  const help = helpReasons(R);
  if (help.length) h += `<div class="banner help"><b>Want a person to go through this with you?</b>${esc(help.join(' '))}<div class="actions left"><button class="ghost" data-act="saathi">Talk to a Finance Saathi</button></div></div>`;
  if (R.hidden.length) h += `<details><summary>Also considered, not shown (${R.hidden.length}) — and why</summary><ul class="list no">${R.hidden.map((r) => `<li><b>${esc(r.p.name)}</b> — ${esc(r.reason || (r.status === 'weak' ? 'Weak match for what you described' : 'Lower match than the routes shown'))}</li>`).join('')}</ul></details>`;
  h += `<div class="warn"><b>This is decision support, not approval.</b> "Strong match" means the route fits what you told us — not that you are eligible or will be approved. Always confirm on the official source.</div>
    <div class="actions"><a class="btn secondary" href="#/check">← Change my answers</a><a class="btn primary" href="#/my-msme">Open My MSME →</a></div>`;
  return h;
}

/* ---------------- Action plan ---------------- */
export const STAGES = ['Discovered', 'Verifying', 'Preparing', 'Applied', 'Outcome'];
const LENDER_ASKS = ['What is the total cost — interest plus all fees?', 'Is collateral or a guarantor needed? Can the loan be covered under CGTMSE?', 'Exactly which documents do you need from me?', 'How long will the decision take?', 'What is the repayment schedule, and what if I pay early or late?', 'If you decline, what is the reason and what can I change?'];
const OFFICE_ASKS = ['Does my situation meet the current eligibility conditions?', 'Which documents are required — is there an official checklist?', 'Is the scheme open now? Any deadline?', 'Who follows up on my application, and how do I track it?'];

export function checklistItems(id) {
  const p = byId(id);
  const r = evaluate(p, S.facts);
  const conds = r ? r.conds : [];
  return [
    ...conds.filter((c) => c.state === 'unknown' || c.state === 'todo').map((c) => ['v:' + c.text, 'Confirm: ' + c.text, c.basis]),
    ...(p.info || []).map(([d, b]) => ['d:' + d, d, b]),
  ];
}
function stepper(id) {
  const t = S.tracked[id];
  return `<div class="steps">${STAGES.map((s, i) => `<button class="step ${i < t.stage ? 'done' : i === t.stage ? 'cur' : ''}" data-act="stage" data-id="${id}" data-i="${i}">${s}</button>${i < STAGES.length - 1 ? '<span class="arrow">→</span>' : ''}`).join('')}</div>`;
}
export function actionView(id) {
  const p = byId(id), t = S.tracked[id];
  const items = checklistItems(id);
  const inPerson = p.access !== 'online';
  return `<h2>Next steps: ${esc(p.name)}</h2><p class="sub">Understand → Verify → Prepare → Apply → Track. Only information this route actually needs is listed.</p>${stepper(id)}
  <div class="dash"><div class="box"><h3>1 · Verify and prepare</h3>
    ${items.map(([k, l, b]) => `<label class="check"><input type="checkbox" data-act="tick" data-id="${id}" data-k="${esc(k)}" ${t.done[k] ? 'checked' : ''}><span>${esc(l)} ${b === 'typical' ? '<span class="chip">typical — confirm</span>' : ''}</span></label>`).join('') || '<p class="small">Nothing specific recorded — confirm on the official source.</p>'}
    <h3 style="margin-top:16px">2 · Official route</h3><p>${esc(p.route.text)}${p.route.url ? `<br><a href="${p.route.url}" target="_blank" rel="noopener">${esc(p.route.url)} ↗</a>` : ''}</p>
    <h3 style="margin-top:16px">3 · Questions to ask ${p.asks === 'loan' ? 'the lender' : 'the office'}</h3><ul class="small">${(p.asks === 'loan' ? LENDER_ASKS : OFFICE_ASKS).map((q) => '<li>' + esc(q) + '</li>').join('')}</ul></div>
  <div class="box">${inPerson
    ? `<h3>Find in-person help nearby</h3><p class="small">This route involves a branch or office, so a location helps. We only ask now.</p><form class="row" data-form="pin" data-id="${id}"><input id="pin" class="grow" maxlength="6" inputmode="numeric" placeholder="6-digit pincode" aria-label="Pincode"><button class="ghost" type="submit">Search</button></form><div id="near" aria-live="polite"></div>`
    : `<h3>This route is online</h3><p class="small">No branch visit needed to start, so we don't ask for your location.</p>`}
    <hr><h3>Want help?</h3><p class="small">A Finance Saathi can go through this with you. They explain — you decide.</p><button class="ghost" data-act="saathi">Prepare a note for a Saathi / bank</button></div></div>
  <div class="actions"><a class="btn secondary" href="#/results">← Back to options</a><a class="btn primary" href="#/my-msme">Save to My MSME →</a></div>`;
}
export function nearbyHtml(id, pin) {
  const p = byId(id);
  const q = [p.access === 'lender' || p.asks === 'loan' ? 'bank branch' : null, 'District Industries Centre', 'MSME Development and Facilitation Office', p.access === 'mixed' ? 'Common Service Centre' : null].filter(Boolean);
  return `<ul class="small">${q.map((x) => `<li><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x + ' near ' + pin)}">${esc(x)} near ${pin} ↗</a></li>`).join('')}</ul><p class="small">Opens a live map search. A production version would use a verified, curated list of official support points.</p>`;
}

/* ---------------- Dashboard ---------------- */
export function dashView(changed = '') {
  if (!S.story) return `<h2>My MSME</h2><p class="sub">Nothing here yet. Start by telling us what's happening in your business.</p><a class="btn primary" href="#/">Start →</a>`;
  const f = S.facts, R = rank(f), ids = Object.keys(S.tracked);
  const slots = openSlots(f).slice(0, 4);
  const maxStage = Math.max(1, ...ids.map((id) => S.tracked[id].stage));
  const tracked = ids.length
    ? ids.map((id) => {
        const p = byId(id), items = checklistItems(id), t = S.tracked[id];
        const done = items.filter(([k]) => t.done[k]).length;
        return `<div style="border-top:1px solid var(--line);padding:10px 0"><div class="row" style="justify-content:space-between"><b>${esc(p.name)}</b><span class="small">Ready: ${done} of ${items.length}</span></div>${stepper(id)}
          <a class="link" href="#/explore/${id}">Open checklist →</a><button class="link mute" data-act="untrack" data-id="${id}">Remove</button></div>`;
      }).join('')
    : `<p class="small">None yet. Current top matches: ${R.top.slice(0, 3).map((r) => `<button class="link" data-act="explore" data-id="${r.id}">${esc(r.p.name)}</button>`).join(' · ') || '—'}</p>`;
  return `<h2>My MSME</h2><p class="sub">Your discovery becomes an ongoing plan. Add information any time — matches update and we show what changed.</p>
  <div class="dash"><div class="stack">
    <div class="box"><h3>Current need</h3><p style="margin:0 0 8px">“${esc(S.story)}”</p>${knownKeys(f).map((k) => `<span class="chip">${LABEL[k]}: ${esc(fmt(k, V(f, k)))}</span>`).join('')}</div>
    <div class="box"><h3>Routes I'm exploring</h3>${tracked}</div>
    <div class="box"><h3>Firm up your matches</h3>${slots.length
      ? `<p class="small">Only questions that could change your current matches:</p>${slots.map((s) => `<div class="enrich"><b class="small">${esc(QUESTIONS[s].q)}</b><div class="row">${QUESTIONS[s].opts.map(([v, l]) => `<button class="secondary" data-act="enrich" data-slot="${s}" data-v="${attr(v)}">${esc(l)}</button>`).join('')}</div></div>`).join('')}`
      : '<p class="small">Nothing more would change your matches right now.</p>'}
      <div id="changed" aria-live="polite">${changed}</div></div>
  </div><div class="stack">
    <div class="box"><h3>Journey</h3><div class="steps">${['Need identified', 'Options discovered', 'Eligibility understood', 'Documents prepared', 'Applied', 'Outcome'].map((s, i) => `<span class="step ${i <= maxStage ? 'done' : ''}">${s}</span>`).join('<span class="arrow">↓</span>')}</div></div>
    <div class="box"><h3>Finance Saathi</h3><p class="small">Get a note summarising your situation to show a Saathi, DIC officer or bank.</p><button class="ghost" data-act="saathi">Prepare note</button></div>
    <div class="box"><h3>Activity</h3><ul class="small" style="padding-left:18px;margin:0">${S.log.slice(0, 8).map((l) => `<li>${esc(l.t)} <span style="color:#98a2b3">· ${esc(l.at)}</span></li>`).join('') || '<li>Nothing yet</li>'}</ul></div>
    <div class="box"><h3>Coming later</h3><p class="small">Alerts when a new programme becomes relevant · document reading (with your consent) to firm up matches · state & district schemes.</p></div>
  </div></div>
  <div class="actions"><a class="btn secondary" href="#/results">View options</a><button class="secondary" data-act="reset">Clear my data</button><button class="primary" data-act="new-need">New need →</button></div>`;
}

/* ---------------- Modals ---------------- */
export function handoffText() {
  const f = S.facts, R = rank(f);
  const known = knownKeys(f).map((k) => `- ${LABEL[k]}: ${fmt(k, V(f, k))}`);
  const tracked = Object.keys(S.tracked).map((id) => `- ${byId(id).name} (${STAGES[S.tracked[id].stage]})`);
  const open = [...new Set(R.top.slice(0, 3).flatMap((r) => r.conds.filter((c) => c.state === 'unknown').map((c) => c.text)))].slice(0, 6).map((t) => '- ' + t);
  return `MSME NAVIGATOR — NOTE FOR SAATHI / BANK
In my words: "${S.story}"

What we know:
${known.join('\n') || '- Very little so far'}

Routes I'm exploring:
${tracked.join('\n') || R.top.slice(0, 3).map((r) => '- ' + r.p.name).join('\n') || '- None yet'}

Still to check:
${open.join('\n') || '- Nothing recorded'}

Note: generated by a prototype decision-support tool. Nothing here confirms eligibility or approval.`;
}
export function saathiModal() {
  return `<h2>Finance Saathi</h2><p class="sub">A trained person who helps translate your business need into the right formal channel.</p>
  <div class="cols"><div><b class="small">A Saathi will</b><ul class="list met"><li>Understand your need</li><li>Explain why a route may be relevant</li><li>Point out what's missing</li><li>Take you to the official channel</li></ul></div>
  <div><b class="small">A Saathi will not</b><ul class="list no"><li>Decide for you</li><li>Promise approval</li><li>Earn commission on any product</li><li>Replace the official application</li></ul></div></div>
  <h3 style="margin-top:14px">Note to show a Saathi, DIC officer or bank</h3><pre class="hand" id="hand">${esc(handoffText())}</pre>
  <div class="actions"><span class="small ok" id="copied" aria-live="polite"></span><button class="secondary" data-act="copy-hand">Copy note</button><button class="primary" data-act="close-modal">Done</button></div>
  <p class="small">The Saathi network is a proposed service; a production version would connect to verified, trained local Saathis (e.g., via associations or DICs). Other official help: ${SUPPORT.map((s) => (s.url ? `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name))).join(' · ')}.</p>`;
}
export function aboutModal() {
  const gov = CORPUS.filter((p) => p.family === 'gov' && p.type === 'direct');
  const fin = CORPUS.filter((p) => p.family === 'fin');
  const en = CORPUS.filter((p) => p.type === 'enabler');
  return `<h2>About the data</h2><p class="sub"><b>Controlled prototype corpus — not every scheme in India.</b> Recorded ${RECORDED} from official sources; records are not live-verified. State, UT and district schemes are not yet included.</p>
  <h3>Government programmes matched to owners (${gov.length})</h3><p class="small">${gov.map((p) => esc(p.name) + (p.status === 'verify' ? ' <span class="chip a">status to verify</span>' : '')).join(' · ')}</p>
  <h3>Enablers — attached to routes, never a standalone answer (${en.length})</h3><p class="small">${en.map((p) => esc(p.name)).join(' · ')}</p>
  <h3>Formal-finance route categories (${fin.length})</h3><p class="small">${fin.map((p) => esc(p.name)).join(' · ')} — no lender names, rates or approval odds.</p>
  <h3>In corpus, not matched to individual owners (${INSTITUTIONAL.length})</h3><p class="small">${INSTITUTIONAL.map(esc).join(' · ')}</p>
  <h3>How matching works</h3><p class="small">1) AI (when available) turns your words into facts — it never picks schemes. 2) Rules check each route's purpose and conditions: met / unknown / not met. 3) A known "not met" hides a route (with the reason); unknown never does. 4) Routes are ranked by need fit; actionability breaks ties. 5) Each extra question is chosen because its answer would change the top routes; we stop when it wouldn't.</p>
  <h3>Your data</h3><p class="small">Your answers are stored only in this browser. When AI understanding is on, your description (and voice, if you use it) is sent to our server and to Groq to be read; we don't store it.</p>
  <div class="actions"><button class="primary" data-act="close-modal">Close</button></div>`;
}
