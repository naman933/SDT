// Guided-journey pieces: best next step per scenario, glossary, document help.
import { describe, it, expect } from 'vitest';
import { ruleUnderstand, finaliseFacts, rank, CORPUS } from '../src/engine/index.js';
import { GLOSSARY, glossify } from '../src/i18n/glossary.js';
import { DOC_HELP, DOC_KEY, docHelp } from '../src/i18n/docs.js';

const best = (story, extra = {}) => {
  const f = finaliseFacts(ruleUnderstand(story), story);
  for (const [k, v] of Object.entries(extra)) f[k] = { v, o: 'answered' };
  return rank(f).top[0];
};

describe('best next step', () => {
  it('dairy ₹8L machine → MUDRA', () => {
    expect(best('I run a dairy near Pune. I need about 8 lakh for a new milk chilling machine.', { dairy_type: 'processing' }).id).toBe('mudra');
  });
  it('retailer stock ₹3L → a working-capital route', () => {
    expect(['mudra', 'bank_wc']).toContain(best('I have a kirana shop in Mumbai and need 3 lakh for stock.').id);
  });
  it('unpaid customer → a receivables route, not a new loan', () => {
    expect(['treds', 'delayed', 'invoice']).toContain(best("My customer hasn't paid me and I need cash.", { buyer_type: 'large_company', overdue: 'over45', size: 'micro' }).id);
  });
  it('₹1.5 crore working capital → bank working capital (no government scheme)', () => {
    expect(best('We are a wholesale trader in Surat with 60 crore annual sales. We need 1.5 crore working capital.').id).toBe('bank_wc');
  });
  it('every direct route has a one-line summary and a next step', () => {
    for (const p of CORPUS.filter((x) => x.type === 'direct')) {
      expect(p.short, p.id).toBeTruthy();
      expect(p.next, p.id).toBeTruthy();
      expect(p.short.split(' ').length, p.id).toBeLessThanOrEqual(18);
    }
  });
});

describe('glossary', () => {
  it('every term has English and Hindi text', () => {
    for (const g of GLOSSARY) { expect(g.en, g.id).toBeTruthy(); expect(g.hi, g.id).toBeTruthy(); expect(g.t.hi, g.id).toBeTruthy(); }
  });
  it('wraps a term once and never nests buttons or touches attributes', () => {
    const html = glossify('Ask an NBFC about a term loan; the NBFC may need collateral.', 'en');
    expect((html.match(/data-term="nbfc"/g) || []).length).toBe(1);
    expect(html).toContain('data-term="term"');
    expect(html).toContain('data-term="collateral"');
    expect(html).not.toMatch(/<button[^>]*>[^<]*<button/);
  });
  it('finds Hindi terms', () => {
    expect(glossify('बिना संपत्ति गिरवी रखे, वर्किंग कैपिटल लिमिट', 'hi')).toContain('data-term="wc"');
  });
});

describe('document help', () => {
  it('every mapped document has help in both languages', () => {
    for (const [doc, key] of Object.entries(DOC_KEY)) {
      expect(DOC_HELP[key], doc).toBeTruthy();
      expect(docHelp(doc, 'hi').how, doc).toBeTruthy();
    }
  });
  it('covers every loan document in the corpus', () => {
    const docs = new Set(CORPUS.flatMap((p) => (p.info || []).map(([d]) => d)));
    const missing = [...docs].filter((d) => !DOC_KEY[d]);
    expect(missing).toEqual([]);
  });
});

describe('glossary word boundaries (Devanagari)', () => {
  it('does not split "उद्यमी" to wrap "उद्यम"', () => {
    const html = glossify('उद्यमी मित्र पोर्टल पर आवेदन करें', 'hi');
    expect(html).not.toContain('data-term="udyam"');
  });
  it('still wraps a standalone "उद्यम रजिस्ट्रेशन"', () => {
    expect(glossify('उद्यम रजिस्ट्रेशन मुफ़्त है', 'hi')).toContain('data-term="udyam"');
  });
});
