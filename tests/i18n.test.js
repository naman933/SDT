import { describe, it, expect } from 'vitest';
import { CORPUS, INSTITUTIONAL, SUPPORT, QUESTIONS, NEEDS, ruleUnderstand, finaliseFacts, rank } from '../src/engine/index.js';
import { STRINGS } from '../src/i18n/strings.js';
import { CORPUS_HI } from '../src/i18n/corpus.hi.js';

describe('Hindi coverage', () => {
  it('every English UI key has a Hindi translation', () => {
    const missing = Object.keys(STRINGS.en).filter((k) => STRINGS.hi[k] == null);
    expect(missing).toEqual([]);
  });
  it('arrays keep the same length (tiles, demos, stages…)', () => {
    for (const [k, v] of Object.entries(STRINGS.en)) if (Array.isArray(v)) expect(STRINGS.hi[k].length, k).toBe(v.length);
  });
  it('placeholders match between languages', () => {
    const vars = (s) => (typeof s === 'string' ? [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort() : []);
    for (const k of Object.keys(STRINGS.en)) expect(vars(STRINGS.hi[k]), k).toEqual(vars(STRINGS.en[k]));
  });
  it('every need, question, option and label is translated', () => {
    for (const n of Object.keys(NEEDS)) { expect(STRINGS.hi[`need.${n}.l`], n).toBeTruthy(); expect(STRINGS.hi[`need.${n}.s`], n).toBeTruthy(); }
    for (const [slot, q] of Object.entries(QUESTIONS)) {
      expect(STRINGS.hi[`q.${slot}.q`], slot).toBeTruthy();
      expect(STRINGS.hi[`q.${slot}.why`], slot).toBeTruthy();
      if (slot !== 'need') for (const [v] of q.opts) expect(STRINGS.hi[`q.${slot}.opt.${v}`], `${slot}.${v}`).toBeTruthy();
    }
  });
  it('every corpus description, condition, document and route is translated', () => {
    const need = new Set();
    for (const p of CORPUS) {
      need.add(p.plain); need.add(p.route.text);
      if (p.type === 'direct') { expect(p.short, p.id).toBeTruthy(); expect(p.next, p.id).toBeTruthy(); need.add(p.short); need.add(p.next); }
      p.conditions.forEach((c) => need.add(c.text));
      (p.info || []).forEach(([d]) => need.add(d));
    }
    INSTITUTIONAL.forEach((x) => need.add(x));
    SUPPORT.forEach((x) => { need.add(x.name); need.add(x.plain); });
    const missing = [...need].filter((s) => !CORPUS_HI[s]);
    expect(missing).toEqual([]);
  });
});

describe('Hindi input without AI (rule-based)', () => {
  const run = (story) => { const f = finaliseFacts(ruleUnderstand(story), story); return { f, R: rank(f) }; };
  const hiDemo = (i) => STRINGS.hi.demos[i][1];

  it('dairy: need, amount, stage, activity, city', () => {
    const { f } = run(hiDemo(0));
    expect(f.need.v).toContain('equipment');
    expect(f.amount.v).toBe(8e5);
    expect(f.stage.v).toBe('existing');
    expect(f.activity.v).toBe('dairy');
    expect(f.city.v).toBe('Pune');
    expect(f.dairy_type.v).toBe('processing');
  });
  it('wholesale trader: sales figure is not the amount; no government route', () => {
    const { f, R } = run(hiDemo(6));
    expect(f.amount.v).toBe(1.5e7);
    expect(f.size.v).toBe('small');
    expect(f.urgency.v).toBe('week');
    expect(R.noGov).toBe(true);
  });
  it('unpaid customer → receivables', () => {
    expect(run(hiDemo(4)).f.need.v).toEqual(['receivables']);
  });
  it('new tailoring business', () => {
    const { f } = run(hiDemo(3));
    expect(f.stage.v).toBe('new');
    expect(f.amount.v).toBe(1e6);
    expect(f.need.v).toContain('startup');
  });
  it('no Udyam', () => {
    expect(run(hiDemo(5)).f.udyam.v).toBe('no');
  });
  it('Devanagari digits', () => {
    expect(run('मुझे ८ लाख चाहिए मशीन के लिए').f.amount.v).toBe(8e5);
  });
});
