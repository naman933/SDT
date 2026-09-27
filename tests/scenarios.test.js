// Jury scenarios from the project brief, run through rule-based understanding + the adaptive question loop.
import { describe, it, expect } from 'vitest';
import { ruleUnderstand, finaliseFacts, pickQuestion, rank, enablersFor, MAX_QUESTIONS } from '../src/engine/index.js';

function journey(story, answers = {}) {
  const f = finaliseFacts(ruleUnderstand(story), story);
  const asked = [];
  let q;
  while ((q = pickQuestion(f, asked))) {
    const a = answers[q.slot] ?? 'unknown';
    if (q.slot === 'need' && a === 'unknown') break;
    f[q.slot] = { v: a, o: 'answered' };
    asked.push(q.slot);
  }
  const R = rank(f);
  return { f, asked, R, gov: R.gov.map((r) => r.id), fin: R.fin.map((r) => r.id), hidden: R.hidden.map((r) => r.id) };
}

describe('jury scenarios', () => {
  it('1 · existing dairy, ₹8L machine → MUDRA + AHIDF + bank; PMEGP hidden (not a new unit)', () => {
    const j = journey('I run a dairy near Pune in Maharashtra. I need about 8 lakh for a new milk chilling machine.', { dairy_type: 'processing' });
    expect(j.f.stage.v).toBe('existing'); // "new machine" must not make the business "new"
    expect(j.gov).toEqual(expect.arrayContaining(['mudra', 'ahidf']));
    expect(j.fin).toContain('bank_term');
    expect(j.hidden).toContain('pmegp');
  });

  it('1b · dairy farm (not processing) → AHIDF excluded with a reason', () => {
    const j = journey('I have a dairy farm in Maharashtra and need 8 lakh for a milking machine.', { dairy_type: 'farm' });
    expect(j.gov).not.toContain('ahidf');
    expect(j.R.hidden.find((r) => r.id === 'ahidf').reason).toMatch(/Not met/);
  });

  it('2 · Pune manufacturer ₹25L expansion → formal finance with CGTMSE; says no direct government scheme', () => {
    const j = journey('We manufacture auto parts in Pune and have more orders than we can handle. We want to expand capacity with new machines worth about 25 lakh.', { green_tech: 'no' });
    expect(j.fin[0]).toBe('bank_term');
    expect(enablersFor(j.R.fin[0], j.f).map((x) => x.e.id)).toContain('cgtmse');
    expect(j.R.noGov).toBe(true);
    expect(j.hidden).toContain('mudra'); // above the ₹20L cap
  });

  it('2b · same expansion but energy-saving machines → MSE GIFT appears', () => {
    const j = journey('We manufacture auto parts in Pune and want to expand capacity with new machines worth about 25 lakh.', { green_tech: 'green' });
    expect(j.gov).toContain('gift');
  });

  it('3 · Mumbai retailer ₹3L stock → working capital; no subsidy force-fit', () => {
    const j = journey('I have a kirana shop in Mumbai and need around 3 lakh for stock before the festive season.');
    expect(j.fin).toContain('bank_wc');
    expect(j.gov).toEqual(['mudra']);
    expect(j.gov).not.toContain('pmegp');
  });

  it('4 · new entrepreneur ₹10L → business-creation routes; asks the optional applicant question', () => {
    const j = journey('I want to start my own tailoring and boutique business and need about 10 lakh.', { applicant: 'women' });
    expect(j.asked).toContain('applicant');
    expect(j.gov).toEqual(expect.arrayContaining(['pmegp', 'standup', 'mudra']));
    expect(j.R.hidden.find((r) => r.id === 'vishwakarma')?.reason).toMatch(/Covers up to/);
  });

  it('5 · customer has not paid → receivables routes, not a generic loan first', () => {
    const j = journey("My customer hasn't paid me and I need cash.", { buyer_type: 'large_company', overdue: 'over45', size: 'micro' });
    expect(j.f.need.v).toEqual(['receivables']);
    expect(j.asked).toContain('buyer_type');
    expect(j.gov).toContain('delayed');
    expect(j.fin.slice(0, 2)).toEqual(expect.arrayContaining(['treds']));
  });

  it('5b · buyer is individual consumers → TReDS excluded', () => {
    const j = journey("My customer hasn't paid me and I need cash.", { buyer_type: 'consumers', overdue: 'over45' });
    expect(j.fin).not.toContain('treds');
  });

  it('6 · no Udyam never blocks; it becomes a to-do', () => {
    const j = journey("I need money to grow my business but I don't have Udyam registration.", { amount: 500000 });
    expect(j.f.udyam.v).toBe('no');
    expect(j.R.top.length).toBeGreaterThan(0);
    for (const r of j.R.all) expect(r.conds.find((c) => c.slot === 'udyam')?.state).not.toBe('not_met');
  });

  it('7 · ₹1.5 crore working capital → explicit "no government pathway", formal finance shown', () => {
    const j = journey('We are a wholesale trader in Surat with about 60 crore annual sales. We need 1.5 crore working capital for festive stock, urgently.');
    expect(j.f.amount.v).toBe(1.5e7); // sales figure is not the amount needed
    expect(j.f.size.v).toBe('small');
    expect(j.R.noGov).toBe(true);
    expect(j.fin).toContain('bank_wc');
  });

  it('"I don\'t know" → first question is the need, and it never asks more than the budget', () => {
    const j = journey("I'm not sure what support or funding is right for my business. Help me figure it out.", { need: ['equipment'], amount: 300000 });
    expect(j.asked[0]).toBe('need');
    expect(j.asked.filter((s) => s !== 'need').length).toBeLessThanOrEqual(MAX_QUESTIONS);
    expect(j.R.top.length).toBeGreaterThan(0);
  });
});

describe('guardrails', () => {
  it('unknown never hides a route', () => {
    const j = journey('I want to start a new business and need 10 lakh.');
    for (const r of j.R.hidden) if (r.status === 'no') expect(r.conds.some((c) => c.state === 'not_met') || r.p.status === 'verify').toBe(true);
  });
  it('status-to-verify records are never recommended', () => {
    const j = journey('I run a factory and need 8 lakh for a new machine.');
    expect(j.R.top.map((r) => r.id)).not.toContain('sclcss');
  });
  it('never asks Udyam, GST, ITR or personal income during discovery', () => {
    const j = journey('I need money.', { need: ['working_capital'] });
    for (const s of j.asked) expect(['udyam', 'gst', 'itr', 'income']).not.toContain(s);
  });
});
