// 100 audit cases for the design spec's QA checklist: varied sectors, geographies, new/existing units,
// missing data, three input languages (English, Hindi, Hinglish), edge cases and ineligible cases.
// Each case is run through rule-based understanding and the adaptive question loop (answers given where set).
import { ruleUnderstand, finaliseFacts, pickQuestion, rank } from '../src/engine/index.js';

const cities = ['Pune', 'Mumbai', 'Surat', 'Jaipur', 'Lucknow', 'Chennai', 'Kolkata', 'Indore', 'Patna', 'Guwahati'];

// [id, language, story, answers, expectation]
// expectation: a set of route ids of which at least one should appear, 'none-ok' (no route is acceptable), or null.
const base = [
  // Equipment, existing units
  ['eq-dairy', 'en', 'I run a dairy near {c}. I need about 8 lakh for a new milk chilling machine.', { dairy_type: 'processing' }, ['mudra', 'ahidf', 'bank_term']],
  ['eq-auto', 'en', 'We manufacture auto parts in {c} and need new machines worth 25 lakh to expand.', { green_tech: 'no' }, ['bank_term', 'nbfc']],
  ['eq-bakery', 'en', 'My bakery in {c} has been running for 6 years. I need an oven that costs 4 lakh.', {}, ['mudra', 'bank_term']],
  ['eq-solar', 'en', 'Our small factory in {c} wants solar panels and energy saving machines for 30 lakh.', { size: 'micro' }, ['gift', 'bank_term']],
  ['eq-recycle', 'en', 'We run a plastic unit in {c} and want recycling machinery to reuse scrap, about 60 lakh.', { size: 'small' }, ['spice', 'bank_term']],
  ['eq-hi', 'hi', 'मेरी {c} में फैक्ट्री है। नई मशीन के लिए 12 लाख चाहिए।', {}, ['mudra', 'bank_term']],
  ['eq-hinglish', 'hinglish', 'Main {c} mein dairy chalata hoon, 8 lakh ki nayi milk chilling machine leni hai', { dairy_type: 'processing' }, ['mudra', 'ahidf']],
  // Working capital
  ['wc-kirana', 'en', 'I have a kirana shop in {c} and need around 3 lakh for stock before the festive season.', {}, ['mudra', 'bank_wc']],
  ['wc-trader-big', 'en', 'We are a wholesale trader in {c} with 60 crore annual sales. We need 1.5 crore working capital urgently.', {}, ['bank_wc']],
  ['wc-wages', 'en', 'Our workshop in {c} needs 2 lakh to pay wages and buy raw material this month.', {}, ['mudra', 'bank_wc', 'nbfc']],
  ['wc-hi', 'hi', 'मेरी {c} में किराना दुकान है, स्टॉक के लिए 2 लाख चाहिए।', {}, ['mudra', 'bank_wc']],
  // New business
  ['new-tailor', 'en', 'I want to start my own tailoring and boutique business in {c} and need about 10 lakh.', { applicant: 'women' }, ['pmegp', 'standup', 'mudra']],
  ['new-small', 'en', 'I want to start a small tea stall in {c}. I need 40 thousand.', {}, ['mudra']],
  ['new-scst', 'en', 'I am planning to set up a new printing unit in {c} for 50 lakh.', { applicant: 'scst' }, ['standup', 'pmegp']],
  ['new-hi', 'hi', 'मैं {c} में नया व्यवसाय शुरू करना चाहती हूँ, 5 लाख चाहिए।', {}, ['mudra', 'pmegp']],
  ['new-artisan', 'en', 'I am a carpenter in {c} and want to buy better tools, about 1 lakh.', { artisan_trade: 'yes' }, ['vishwakarma', 'mudra']],
  // Receivables
  ['rc-large', 'en', "A large company in {c} hasn't paid my invoices for 90 days. I need cash.", { size: 'micro' }, ['delayed', 'treds', 'invoice']],
  ['rc-govt', 'en', 'A government department has not paid my bills for 4 months.', { size: 'micro' }, ['delayed', 'treds']],
  ['rc-consumer', 'en', "My customers haven't paid me and I need cash.", { buyer_type: 'consumers', overdue: 'under45' }, ['bank_wc', 'invoice', 'none-ok']],
  ['rc-hi', 'hi', 'मेरे ग्राहक ने भुगतान नहीं किया है और मुझे पैसों की ज़रूरत है।', { buyer_type: 'large_company', overdue: 'over45', size: 'micro' }, ['delayed', 'treds']],
  // Market, quality, skills, investment
  ['mk-online', 'en', 'I make handmade soaps in {c} and want to sell online to more customers.', { size: 'micro' }, ['team', 'gem']],
  ['mk-export', 'en', 'We want to export our textiles abroad and meet international buyers.', {}, ['intl', 'zed']],
  ['q-cert', 'en', 'We need a quality certification like ZED for our unit in {c}.', {}, ['zed', 'lean']],
  ['q-lean', 'en', 'I want to improve productivity and reduce waste in my factory.', {}, ['lean', 'zed']],
  ['sk-train', 'en', 'I want to learn business skills before I start.', {}, ['esdp']],
  ['eq-investor', 'en', 'We are a growing company and want to bring in an investor for equity.', {}, ['fof']],
  ['reg-udyam', 'en', 'I need money to grow my business but I do not have Udyam registration.', { amount: 500000 }, null],
  // Missing data, vague, edge
  ['vague-1', 'en', "I'm not sure what support is right for my business. Help me figure it out.", {}, 'none-ok'],
  ['vague-hi', 'hi', 'मुझे नहीं पता मेरे व्यवसाय के लिए कौन-सी मदद सही है।', {}, 'none-ok'],
  ['money-only', 'en', 'I need money.', {}, 'none-ok'],
  ['huge', 'en', 'We need 200 crore to build a new steel plant.', {}, null],
  ['tiny', 'en', 'I need 5000 rupees for my shop.', {}, null],
  ['numbers-only', 'en', '8 lakh', {}, 'none-ok'],
  ['emoji', 'en', '🙏 machine chahiye 🙏', {}, null],
  ['long', 'en', 'I run a small printing press in {c}. '.repeat(20) + 'Need 6 lakh for a machine.', {}, ['mudra', 'bank_term']],
];

// Answer patterns applied to each base case: owner answers everything / says "I don't know" / only amount known.
const variants = [
  ['answers', (a) => a],
  ['dontknow', () => ({})],
  ['partial', (a) => Object.fromEntries(Object.entries(a).slice(0, 1))],
];

export const CASES = [];
for (let i = 0; CASES.length < 100; i++) {
  const [id, lang, story, answers, expect] = base[i % base.length];
  const [vName, vFn] = variants[Math.floor(i / base.length) % variants.length];
  const city = cities[i % cities.length];
  CASES.push({ id: `${id}/${vName}/${city}`, lang, story: story.replaceAll('{c}', city), answers: vFn(answers), expect: vName === 'answers' ? expect : null });
}

export function runCase(c) {
  const f = finaliseFacts(ruleUnderstand(c.story), c.story);
  const asked = [];
  let q, guard = 0;
  while ((q = pickQuestion(f, asked)) && guard++ < 20) {
    const a = c.answers[q.slot] ?? 'unknown';
    if (q.slot === 'need' && a === 'unknown') break;
    f[q.slot] = { v: a, o: 'answered' };
    asked.push(q.slot);
  }
  return { f, asked, R: rank(f), loops: guard };
}
