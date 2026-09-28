// Each route owns its checklist, built from its own conditions, documents, process and grievance channel.
// Sections follow the design spec. Text is English; the UI translates it with tc().
import { evaluate } from './engine.js';
import { beforeFor, stepsFor, AFTER, grievanceFor } from './process.js';

export const SECTIONS = ['before', 'elig', 'docs', 'steps', 'after', 'follow'];
export const ITEM_STATES = ['todo', 'doing', 'done', 'na']; // not started · in progress · complete · not applicable
export const DOC_STATES = ['missing', 'have', 'update', 'review', 'ready']; // not available · available · needs update · needs review · prepared
const COMPLETE = new Set(['done', 'have', 'ready']);

// Conditions for a route even when it no longer matches the need (e.g. a saved route after the need changed).
function condsFor(p, f) {
  const r = evaluate(p, f);
  return r ? r.conds : p.conditions.map((c) => ({ ...c, state: c.test(f) })).filter((c) => c.state);
}

export function buildChecklist(p, f) {
  const item = (prefix, text, extra = {}) => ({ key: prefix + text, text, ...extra });
  return {
    before: beforeFor(p).map((x) => item('b:', x)),
    elig: condsFor(p, f).map((c) => item('e:', c.text, { basis: c.basis, state: c.state, kind: c.kind, slot: c.slot })),
    docs: (p.info || []).map(([d, basis]) => item('d:', d, { basis, doc: true })),
    steps: stepsFor(p).map((x) => item('s:', x)),
    after: AFTER.map((x) => item('a:', x)),
    follow: grievanceFor(p).steps.map((x) => item('g:', x)),
  };
}

// Stored status, or a default: a condition the owner has already confirmed starts as complete.
export function itemStatus(tracked, it) {
  const stored = it.doc ? tracked?.docs?.[it.key] : tracked?.items?.[it.key];
  if (stored) return stored;
  if (it.doc) return null;
  return it.state === 'met' ? 'done' : 'todo';
}

// Share of applicable items that are complete. Readiness is preparation — never approval.
export function readiness(checklist, tracked) {
  const all = SECTIONS.flatMap((s) => checklist[s]);
  const applicable = all.filter((it) => itemStatus(tracked, it) !== 'na');
  const done = applicable.filter((it) => COMPLETE.has(itemStatus(tracked, it))).length;
  const docs = checklist.docs;
  const docsReady = docs.filter((it) => COMPLETE.has(itemStatus(tracked, it))).length;
  return { done, total: applicable.length, pct: applicable.length ? Math.round((done / applicable.length) * 100) : 0, docsReady, docsTotal: docs.length };
}

export const isComplete = (st) => COMPLETE.has(st);
