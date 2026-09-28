// Design-spec guardrails: relevance scoring, route records, route-specific checklists, translations and the 100-case audit.
import { describe, it, expect } from 'vitest';
import {
  CORPUS, DIMENSIONS, MAX_QUESTIONS, LANE, PROCESS, BEFORE, AFTER, GRIEVANCE, CONTACTS, SECTIONS,
  ruleUnderstand, finaliseFacts, rank, evaluate, coverage, byId, buildChecklist, readiness, itemStatus,
} from '../src/engine/index.js';
import { CORPUS_HI } from '../src/i18n/corpus.hi.js';
import { STRINGS } from '../src/i18n/strings.js';
import { CASES, runCase } from './audit-cases.js';

const DIRECT = CORPUS.filter((p) => p.type === 'direct');
const facts = (story, extra = {}) => {
  const f = finaliseFacts(ruleUnderstand(story), story);
  for (const [k, v] of Object.entries(extra)) f[k] = { v, o: 'answered' };
  return f;
};

describe('Policy Relevance Score', () => {
  it('uses the spec weights (sum 100)', () => {
    expect(DIMENSIONS).toEqual({ need: 25, beneficiary: 15, amount: 10, geo: 10, evidence: 15, readiness: 10, timing: 5, preference: 10 });
  });
  it('every dimension is 0–1 and the total is 0–100', () => {
    for (const r of rank(facts('I run a dairy in Pune and need 8 lakh for a machine.')).all) {
      for (const [v] of Object.values(r.parts)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      expect(r.fit).toBeGreaterThanOrEqual(0); expect(r.fit).toBeLessThanOrEqual(100);
    }
  });
  it('"I don\'t know" and "prefer not to say" score exactly like a missing fact', () => {
    const story = 'I want to start a new business and need 10 lakh.';
    const base = rank(facts(story)).all.map((r) => [r.id, r.fit, r.status]);
    for (const v of ['unknown', 'declined']) {
      const f = facts(story); f.applicant = { v, o: v }; f.records = { v, o: v };
      expect(rank(f).all.map((r) => [r.id, r.fit, r.status])).toEqual(base);
    }
  });
  it('a stated preference moves routes but never hides one', () => {
    const story = 'I want to sell more online.';
    const ids = (f) => rank(f).top.map((r) => r.id).sort();
    expect(ids(facts(story, { channel_pref: 'inperson' }))).toEqual(ids(facts(story)));
  });
  it('data coverage counts known profile areas only', () => {
    const c = coverage(facts('I run a dairy near Pune. I need about 8 lakh for a new machine.'));
    expect(c.total).toBe(8);
    expect(c.known).toEqual(expect.arrayContaining(['need', 'amount', 'stage', 'sector', 'state']));
    expect(c.known).not.toContain('udyam');
  });
});

describe('route records', () => {
  it('every direct route has support type, mechanism, process, grievance channel and its own prep item', () => {
    for (const p of DIRECT) {
      expect(p.support, p.id).toMatch(/^(loan|subsidy|invoice|remedy|market|capability|equity)$/);
      expect(p.mechanism, p.id).toBeTruthy();
      expect(PROCESS[p.flow], p.id).toBeTruthy();
      expect(GRIEVANCE[p.grievance], p.id).toBeTruthy();
      expect(p.prep, p.id).toBeTruthy();
    }
  });
  it('loans say they must be repaid; non-loans say they are not loans', () => {
    for (const p of DIRECT) {
      if (p.support === 'loan' || p.repay) expect(p.mechanism, p.id).toMatch(/repa(y|id)/);
      if (['market', 'capability', 'equity', 'remedy'].includes(p.support)) expect(p.mechanism, p.id).toMatch(/not (a loan|money|finance)/);
    }
  });
  it('no interest rate, fee or processing time is stated for any route', () => {
    for (const p of DIRECT) expect(p.mechanism, p.id).not.toMatch(/%\s*(p\.a|per annum|interest)|\bdays?\b|\bweeks?\b|processing fee/i);
  });
  it('funding lanes cover only loans, subsidies and receivables', () => {
    expect(Object.values(LANE).sort()).toEqual(['grant', 'loan', 'receivable', 'receivable']);
  });
  it('Stand-Up India is flagged "verify current status"', () => {
    const r = evaluate(byId('standup'), facts('I want to start a new business and need 20 lakh.', { applicant: 'women' }));
    expect(r.conds.find((c) => c.slot === 'status').state).toBe('unknown');
  });
  it('official contacts are https links to government or RBI sites, without phone numbers', () => {
    for (const c of CONTACTS) {
      expect(c.url).toMatch(/^https:\/\/[a-z.]+\.(gov\.in|org\.in)\/$/);
      expect(JSON.stringify(c)).not.toMatch(/\d{5,}/);
    }
  });
});

describe('route-specific checklists', () => {
  const f = facts('I run a business and need money for a machine.');
  it('every route has before / steps / after / follow-up sections', () => {
    for (const p of DIRECT) {
      const cl = buildChecklist(p, f);
      for (const s of ['before', 'steps', 'after', 'follow']) expect(cl[s].length, `${p.id}.${s}`).toBeGreaterThan(0);
    }
  });
  it('no two routes share the same checklist', () => {
    const sig = DIRECT.map((p) => JSON.stringify(SECTIONS.map((s) => buildChecklist(p, f)[s].map((it) => it.text))));
    expect(new Set(sig).size).toBe(DIRECT.length);
  });
  it('item keys are unique within a checklist', () => {
    for (const p of DIRECT) {
      const keys = SECTIONS.flatMap((s) => buildChecklist(p, f)[s].map((it) => it.key));
      expect(new Set(keys).size, p.id).toBe(keys.length);
    }
  });
  it('readiness counts complete items, skips "not applicable", and starts confirmed conditions as done', () => {
    const p = byId('mudra');
    const g = facts('I run a dairy and need 8 lakh for a machine.');
    const cl = buildChecklist(p, g);
    const met = cl.elig.find((it) => it.state === 'met');
    expect(itemStatus({}, met)).toBe('done');
    const tr = { items: {}, docs: {} };
    for (const s of SECTIONS) for (const it of cl[s]) (it.doc ? tr.docs : tr.items)[it.key] = it.doc ? 'ready' : 'done';
    expect(readiness(cl, tr).pct).toBe(100);
    tr.items[cl.before[0].key] = 'na';
    const r = readiness(cl, tr);
    expect(r.pct).toBe(100);
    expect(r.total).toBe(SECTIONS.reduce((n, s) => n + cl[s].length, 0) - 1);
  });
});

describe('language coverage for new content', () => {
  it('every route mechanism, prep item, provider, process step, grievance text and contact has Hindi', () => {
    const need = new Set();
    for (const p of CORPUS) { need.add(p.provider); if (p.mechanism) need.add(p.mechanism); if (p.prep) need.add(p.prep); if (p.src) need.add(p.src.t); }
    Object.values(PROCESS).flat().forEach((x) => need.add(x));
    Object.values(BEFORE).flat().forEach((x) => need.add(x));
    AFTER.forEach((x) => need.add(x));
    for (const g of Object.values(GRIEVANCE)) { need.add(g.t); need.add(g.src); [...g.steps, ...g.evidence, ...g.links.map((l) => l.t)].forEach((x) => need.add(x)); }
    CONTACTS.forEach((c) => { need.add(c.name); need.add(c.role); });
    expect([...need].filter((s) => !CORPUS_HI[s])).toEqual([]);
  });
});

describe('microcopy guardrails', () => {
  it('no UI text promises eligibility, approval or a best loan', () => {
    const all = JSON.stringify(STRINGS.en);
    expect(all).not.toMatch(/you qualify|(?<!not mean )you are eligible|pre-approved|guaranteed approval|best loan|apply now/i);
  });
});

describe('100-case audit', () => {
  it('has 100 varied cases', () => {
    expect(CASES.length).toBe(100);
    expect(new Set(CASES.map((c) => c.lang))).toEqual(new Set(['en', 'hi', 'hinglish']));
  });
  it.each(CASES.map((c) => [c.id, c]))('%s', (_id, c) => {
    const { f, asked, R, loops } = runCase(c);
    // No input loss.
    expect(f.story.v).toBe(c.story);
    // Question loop terminates within budget.
    expect(loops).toBeLessThan(20);
    expect(asked.filter((s) => s !== 'need').length).toBeLessThanOrEqual(MAX_QUESTIONS);
    // Shape: at most 3 government + 3 finance routes, no duplicates.
    expect(R.gov.length).toBeLessThanOrEqual(3);
    expect(R.fin.length).toBeLessThanOrEqual(3);
    expect(new Set(R.top.map((r) => r.id)).size).toBe(R.top.length);
    // Unknown never hides a route; "verify" records are never shown.
    for (const r of R.hidden) if (r.status === 'no') expect(r.conds.some((x) => x.state === 'not_met') || r.p.status === 'verify').toBe(true);
    for (const r of R.top) {
      expect(r.p.status).not.toBe('verify');
      expect(r.fit).toBeGreaterThanOrEqual(0);
      expect(r.fit).toBeLessThanOrEqual(100);
      expect(r.conds.some((x) => x.kind === 'mandatory' && x.state === 'not_met')).toBe(false);
    }
    // Expected pathways are not missed.
    if (Array.isArray(c.expect)) {
      const ids = R.top.map((r) => r.id);
      if (!c.expect.includes('none-ok') || ids.length) expect(ids.some((id) => c.expect.includes(id)), `${c.id} → ${ids.join(', ')}`).toBe(true);
    }
  });
});
