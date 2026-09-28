// Matching engine: hard gates -> Policy Relevance Score (8 dimensions, ranks the list) -> conditions shown as met / unknown / not met.
// Relevance organises exploration; it is never an eligibility or approval probability.
// Pure functions of the facts object; no DOM, no network. Heuristic prototype weights — not validated.
import { V, needsOf, NEEDS, inr } from './core.js';
import { CORPUS, byId, channelOf } from './corpus.js';
import { QUESTIONS, ASK_ORDER, MAX_QUESTIONS } from './questions.js';

const MIN_PURPOSE = 0.5; // below this a route is not a candidate at all
const MIN_CORE = 0.5; // need + beneficiary + amount below half → "weak match", not shown

// Weights from the design spec (sum 100). Unknown facts score a neutral value — never zero.
export const DIMENSIONS = {
  need: 25, beneficiary: 15, amount: 10, geo: 10, evidence: 15, readiness: 10, timing: 5, preference: 10,
};
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

function purposeFor(p, f, n) {
  return p.purposeFn ? p.purposeFn(f, n) : p.purposes?.[n] || 0;
}

// How much user-confirmed information supports the route's own conditions (unknown = neutral 0.5).
// The lender's own assessment applies to every loan and is left out, so loans are not marked down for it.
function evidenceScore(conds) {
  const cs = conds.filter((c) => c.kind !== 'fixable' && c.slot !== 'lender');
  return cs.length ? mean(cs.map((c) => (c.state === 'met' ? 1 : 0.5))) : 0.5;
}

// Are key prerequisites already in place? Only facts the owner gave count; nothing known → neutral.
function readinessScore(p, f, conds) {
  const signals = [];
  const u = V(f, 'udyam');
  if (u && conds.some((c) => c.slot === 'udyam')) signals.push(u === 'yes' ? 1 : 0.3);
  const rec = V(f, 'records');
  if (rec && p.repay) signals.push({ itr: 1, bank: 0.6, none: 0.3 }[rec]);
  return signals.length ? mean(signals) : 0.5;
}

function preferenceScore(p, f) {
  const pref = V(f, 'channel_pref');
  const ch = channelOf(p);
  const fit = !pref || pref === 'any' ? 0.7 : ch === 'both' ? 0.8 : ch === pref ? 1 : 0.4;
  const effort = Math.max(0, Math.min(1, 1 - (p.steps - 2) / 8)); // fewer steps = less effort
  return (fit + effort) / 2;
}

export function evaluate(p, f) {
  if (p.type !== 'direct') return null;
  if (p.relevantIf && !p.relevantIf(f)) return null;
  const needs = needsOf(f);
  if (!needs.length) return null;
  let purpose = 0, need = null;
  for (const n of needs) {
    const v = purposeFor(p, f, n);
    if (v > purpose) { purpose = v; need = n; }
  }
  if (purpose < MIN_PURPOSE) return null;

  const conds = p.conditions.map((c) => ({ ...c, state: c.test(f) })).filter((c) => c.state);
  const a = V(f, 'amount'), stageV = V(f, 'stage'), u = V(f, 'urgency');
  const st = stageV === 'expanding' ? 'existing' : stageV;

  let scale = 0.6; // amount unknown: neutral, never a penalty to zero
  if (!p.amount) scale = 0.8;
  else if (a != null) scale = a < p.amount.min ? 0.5 : a <= p.amount.max ? 1 : Math.max(0, p.amount.max / a);

  let stage = 0.6;
  if (st) stage = p.stages ? (p.stages.includes(st) ? 1 : 0) : p.stageScore?.[st] ?? 1;

  const want = new Set(needs.flatMap((n) => NEEDS[n]?.want || []));
  const outcome = (p.delivers || []).some((d) => want.has(d)) ? 1 : 0.5;
  // A targeted route (dairy, artisans, SC/ST) that passed its relevance check fits the beneficiary profile.
  const beneficiary = p.relevantIf ? Math.max(stage, 0.8) : stage;

  const access = { online: 1, lender: 0.8, mixed: 0.7, agency: 0.6 }[p.access] ?? 0.6;
  const timing = !u ? 0.8 : u === 'week' ? { fast: 1, medium: 0.5, slow: 0.2 }[p.speed] : u === 'month' ? { fast: 1, medium: 0.9, slow: 0.5 }[p.speed] : 1;
  const values = {
    need: 0.75 * purpose + 0.25 * outcome,
    beneficiary,
    amount: scale,
    geo: (1 + access) / 2, // every route in the corpus is national, so only the channel varies
    evidence: evidenceScore(conds),
    readiness: readinessScore(p, f, conds),
    timing,
    preference: preferenceScore(p, f),
  };
  const parts = Object.fromEntries(Object.entries(DIMENSIONS).map(([k, w]) => [k, [values[k], w]]));
  const fit = Math.round(Object.values(parts).reduce((s, [v, w]) => s + v * w, 0));
  const core = (values.need * 25 + values.beneficiary * 15 + values.amount * 10) / 50;

  const blocked = conds.find((c) => c.kind === 'mandatory' && c.state === 'not_met');
  const unknownMandatory = conds.filter((c) => c.kind === 'mandatory' && c.state === 'unknown');
  let status;
  if (p.status === 'verify' || blocked) status = 'no';
  else if (core < MIN_CORE) status = 'weak';
  else status = unknownMandatory.length ? 'check' : 'yes';

  const overMax = a != null && !!p.amount && a > p.amount.max;
  let reason = '';
  if (p.status === 'verify') reason = 'Current status of this scheme needs to be confirmed before we can recommend it.';
  else if (blocked) reason = 'Not met: ' + blocked.text;
  else if (overMax) reason = `Covers up to ${inr(p.amount.max)}; you mentioned ${inr(a)}`;

  return { id: p.id, p, purpose, need, fit, parts, core, conds, status, reason, blocked, overMax };
}

// Higher relevance first; fewer steps breaks ties.
const byRelevance = (a, b) => b.fit - a.fit || a.p.steps - b.p.steps;

export function rank(f) {
  const all = CORPUS.map((p) => evaluate(p, f)).filter(Boolean);
  const shown = all.filter((r) => r.status === 'yes' || r.status === 'check').sort(byRelevance);
  const gov = shown.filter((r) => r.p.family === 'gov').slice(0, 3);
  const fin = shown.filter((r) => r.p.family === 'fin').slice(0, 3);
  const top = [...gov, ...fin].sort(byRelevance);
  const hidden = [...all.filter((r) => r.status === 'no'), ...shown.filter((r) => !top.includes(r)), ...all.filter((r) => r.status === 'weak')];
  const want = new Set(needsOf(f).flatMap((n) => NEEDS[n]?.want || []));
  const govDirect = gov.filter((r) => (r.p.delivers || []).some((d) => want.has(d)));
  return { all, gov, fin, top, hidden, noGov: govDirect.length === 0, wantsMoney: want.has('money') || want.has('recovery') };
}

export function enablersFor(r, f) {
  const out = [];
  for (const id of r.p.enablers || []) {
    const e = byId(id);
    const conds = e.conditions.map((c) => ({ ...c, state: c.test(f) })).filter((c) => c.state);
    if (conds.some((c) => c.state === 'not_met')) continue;
    out.push({ e, conds });
  }
  return out;
}

const topIds = (f) => rank(f).top.slice(0, 4);
const signature = (f) => topIds(f).map((r) => r.id + ':' + r.status).join('|');

// Choose the unanswered question whose answer would most change the leading routes.
// Returns null when no remaining question would change anything, or the budget is spent.
export function pickQuestion(f, asked) {
  if (!needsOf(f).length) return { slot: 'need', value: 1, affects: [] };
  if (asked.filter((s) => s !== 'need').length >= MAX_QUESTIONS) return null;
  const base = signature(f);
  const baseTop = topIds(f).map((r) => r.id);
  let best = null;
  for (const slot of ASK_ORDER) {
    if (f[slot] !== undefined) continue;
    const opts = QUESTIONS[slot].opts;
    const affected = new Set();
    let changes = 0;
    for (const [val] of opts) {
      const g = { ...f, [slot]: { v: val, o: 'sim' } };
      if (signature(g) === base) continue;
      changes++;
      const t = topIds(g);
      t.forEach((r, i) => { if (baseTop[i] !== r.id || !baseTop.includes(r.id)) affected.add(r.id); });
      baseTop.forEach((id) => { if (!t.some((r) => r.id === id)) affected.add(id); });
    }
    const value = changes / opts.length;
    if (value > 0 && (!best || value > best.value)) best = { slot, value, affects: [...affected] };
  }
  return best;
}

// Slots whose answers would firm up the current matches (used on the dashboard).
export function openSlots(f) {
  const R = rank(f);
  const slots = new Set();
  for (const r of R.top.slice(0, 4)) {
    const conds = [...r.conds, ...enablersFor(r, f).flatMap((x) => x.conds)];
    for (const c of conds) if (c.state === 'unknown' && QUESTIONS[c.slot] && f[c.slot] === undefined) slots.add(c.slot);
  }
  if (V(f, 'udyam') == null && f.udyam === undefined && R.top.some((r) => r.conds.some((c) => c.slot === 'udyam'))) slots.add('udyam');
  return [...slots];
}

// Bands are keys; the UI turns them into words in the current language.
export const fitBand = (s) => (s >= 80 ? 'strong' : s >= 65 ? 'worth' : s >= 50 ? 'possible' : 'unlikely');
