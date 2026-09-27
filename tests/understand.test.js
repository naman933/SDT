import { describe, it, expect } from 'vitest';
import { parseAmount, sanitizeExtraction, factsFromExtraction } from '../src/engine/index.js';

describe('parseAmount', () => {
  it.each([
    ['need 8 lakh', 8e5], ['₹2.5 crore', 2.5e7], ['50k for stock', 5e4], ['Rs 250000', 250000],
    ['60 crore annual sales, need 1.5 crore', 1.5e7], ['running for 12 years, need 3 lakh', 3e5], ['no amount here', null],
  ])('%s → %s', (t, v) => expect(parseAmount(t)).toBe(v));
});

describe('sanitizeExtraction (server-side guard on AI output)', () => {
  it('drops values outside the allowed enums and unknown needs', () => {
    const x = sanitizeExtraction({ need: ['equipment', 'PMEGP'], stage: 'startup', sector: 'dairy', amount_inr: -5, udyam: 'maybe' });
    expect(x.need).toEqual(['equipment']);
    expect(x.stage).toBeNull();
    expect(x.sector).toBe('dairy');
    expect(x.amount_inr).toBeNull();
    expect(x.udyam).toBeNull();
  });
  it('removes receivables-only fields when the need is not receivables', () => {
    const x = sanitizeExtraction({ need: ['working_capital'], buyer_type: 'small_business', overdue: 'over45' });
    expect(x.buyer_type).toBeNull();
    expect(x.overdue).toBeNull();
  });
  it('handles garbage input', () => {
    expect(sanitizeExtraction(null).need).toEqual([]);
    expect(sanitizeExtraction('x').need).toEqual([]);
  });
  it('maps to facts with origins', () => {
    const f = factsFromExtraction(sanitizeExtraction({ need: ['equipment'], amount_inr: 8e5, stage: 'existing', inferred: ['stage'] }));
    expect(f.need).toEqual({ v: ['equipment'], o: 'ai' });
    expect(f.stage.o).toBe('inferred');
  });
});
