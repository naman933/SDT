// Controlled prototype corpus. NOT every scheme in India.
// Every record states its source; `basis: 'typical'` marks general practice rather than an official requirement.
// Records were recorded in Sep 2026 (see RECORDED) and are not live-verified.
import { L, CR, V, hasNeed } from './core.js';

const isDairy = (f) => V(f, 'sector') === 'dairy' || /dairy|milk|cattle|buffalo|डेयरी|दूध/i.test(V(f, 'activity') || '');
export const ARTISAN_RX =
  /tailor|darzi|stitch|carpent|potter|pottery|blacksmith|lohar|cobbler|mochi|goldsmith|sunar|barber|mason|basket|mat weav|broom|toy|garland|washerman|dhobi|locksmith|sculpt|stone carv|boat|fishing net|armour|hammer|सिलाई|दर्ज़ी|दर्जी|बढ़ई|कुम्हार|लोहार|मोची|सुनार|नाई|धोबी|राजमिस्त्री/i;
const isArtisan = (f) => ARTISAN_RX.test((V(f, 'activity') || '') + ' ' + (V(f, 'story') || ''));

// Condition: test(f) -> 'met' | 'unknown' | 'not_met' | 'todo' | null (not applicable)
// kind: mandatory (a known "not met" hides the route) | conditional | fixable (never blocks; becomes a to-do)
export function C(text, slot, test, kind = 'mandatory', basis = 'official') {
  return { text, slot, test, kind, basis };
}
const stageNew = (t) => C(t, 'stage', (f) => { const s = V(f, 'stage'); return !s ? 'unknown' : s === 'new' ? 'met' : 'not_met'; });
const brownfield = (t) => C(t, 'stage', (f) => { const s = V(f, 'stage'); return !s ? 'unknown' : s === 'new' ? 'not_met' : 'met'; });
const mse = (t = 'Micro or small enterprise (medium enterprises are not covered)') =>
  C(t, 'size', (f) => { const s = V(f, 'size'); return !s ? 'unknown' : s === 'medium' ? 'not_met' : 'met'; });
const udyamFix = (t = 'Udyam registration (free, online) — you can do this when you choose this route') =>
  C(t, 'udyam', (f) => (V(f, 'udyam') === 'yes' ? 'met' : 'todo'), 'fixable');
const lender = () => C("The lender's own assessment — repayment capacity, records and, for larger amounts, collateral", 'lender', () => 'unknown', 'mandatory', 'typical');
const amountMax = (max, t) => C(t, 'amount', (f) => { const a = V(f, 'amount'); return a == null ? 'unknown' : a <= max ? 'met' : 'not_met'; });
const always = (t, slot, kind = 'mandatory', basis = 'official') => C(t, slot, () => 'unknown', kind, basis);

const DOCS_LOAN = [
  ['What the money is for — e.g., quotation or bill estimate', 'typical'],
  ['Identity and address proof (KYC)', 'typical'],
  ['Recent bank statements', 'typical'],
  ['For larger amounts: ITR / financial statements', 'typical'],
];
const MYMSME = { t: 'MyMSME scheme list', u: 'https://my.msme.gov.in/mymsme/Scheme.aspx' };
const MOMSME = { t: 'MoMSME', u: 'https://www.msme.gov.in/' };
const RAMP = { t: 'RAMP portal', u: 'https://ramp.msme.gov.in/ramp/' };

export const CORPUS = [
  /* ---------------- Government programmes ---------------- */
  {
    id: 'mudra', name: 'PM MUDRA Yojana (PMMY)', family: 'gov', type: 'direct', provider: 'Government of India — through banks, NBFCs & MFIs',
    plain: 'Collateral-free business loans up to ₹20 lakh, given through banks, NBFCs and microfinance institutions, for income-generating businesses — including activities allied to agriculture such as dairy.',
    purposes: { startup: 1, equipment: 1, expansion: 0.9, working_capital: 1 }, amount: { min: 0, max: 20 * L }, delivers: ['money'], speed: 'medium', access: 'lender', steps: 3,
    conditions: [
      lender(),
      amountMax(20 * L, 'Loan amount up to ₹20 lakh (Shishu ≤ ₹50k · Kishore ≤ ₹5L · Tarun ≤ ₹10L · Tarun Plus ≤ ₹20L)'),
      C('Tarun Plus (above ₹10 lakh) is only for borrowers who took and repaid an earlier Tarun loan', 'prior_tarun', (f) => { const a = V(f, 'amount'); return a != null && a > 10 * L && a <= 20 * L ? 'unknown' : null; }),
      C('An income-generating business — manufacturing, trading, services, or allied-agriculture activity like dairy (not crop farming)', 'sector', (f) => { const s = V(f, 'sector'); return !s ? 'unknown' : s === 'agri_crop' ? 'not_met' : 'met'; }),
    ],
    // Returns the MUDRA category name for the amount (the UI phrases it).
    category: (f) => { const a = V(f, 'amount'); if (a == null) return null; return a <= 5e4 ? 'Shishu' : a <= 5 * L ? 'Kishore' : a <= 10 * L ? 'Tarun' : a <= 20 * L ? 'Tarun Plus' : null; },
    info: DOCS_LOAN, route: { text: 'Apply at a bank / NBFC / MFI branch, or online via the Udyamimitra portal', url: 'https://www.udyamimitra.in/' },
    src: { t: 'MUDRA', u: 'https://www.mudra.org.in/' }, corpusNote: 'added in v2',
  },
  {
    id: 'standup', name: 'Stand-Up India', family: 'gov', type: 'direct', provider: 'Government of India — through scheduled commercial banks',
    plain: 'Bank loans of ₹10 lakh to ₹1 crore for a first-time (greenfield) enterprise set up by a woman and/or SC/ST entrepreneur.',
    purposes: { startup: 1, equipment: 0.7, expansion: 0.5 }, stages: ['new'], amount: { min: 10 * L, max: CR }, delivers: ['money'], speed: 'medium', access: 'lender', steps: 4,
    conditions: [
      lender(),
      stageNew('A brand-new business (your first venture)'),
      C('Borrower is a woman and/or SC/ST entrepreneur (for companies/firms: at least 51% held by them)', 'applicant', (f) => { const a = V(f, 'applicant'); return !a ? 'unknown' : a === 'none' ? 'not_met' : 'met'; }),
      C('Loan between ₹10 lakh and ₹1 crore', 'amount', (f) => { const a = V(f, 'amount'); return a == null ? 'unknown' : a >= 10 * L && a <= CR ? 'met' : 'not_met'; }),
    ],
    info: [...DOCS_LOAN, ['Project plan for the new enterprise', 'typical']],
    route: { text: 'Apply through a bank branch or the Stand-Up Mitra / Udyamimitra portal', url: 'https://www.standupmitra.in/' },
    src: { t: 'Stand-Up India', u: 'https://www.standupmitra.in/' }, corpusNote: 'added in v2',
  },
  {
    id: 'pmegp', name: 'PMEGP', family: 'gov', type: 'direct', provider: 'MoMSME — implemented by KVIC, KVIBs and District Industries Centres',
    plain: 'A subsidy linked to a bank loan for setting up a new micro-enterprise. You apply online; the application goes through KVIC / KVIB / DIC and then a bank.',
    purposes: { startup: 1, equipment: 0.6, expansion: 0.3 }, stages: ['new'], delivers: ['money', 'subsidy'], speed: 'slow', access: 'agency', steps: 6,
    conditions: [
      stageNew('A new unit — existing units are not covered'),
      C('Project cost within the ceiling: ₹50 lakh (manufacturing) / ₹20 lakh (service)', 'amount', (f) => {
        const a = V(f, 'amount'), s = V(f, 'sector');
        if (a == null) return 'unknown'; if (a <= 20 * L) return 'met'; if (a > 50 * L) return 'not_met';
        return s === 'manufacturing' ? 'met' : s ? 'not_met' : 'unknown';
      }),
      always('Applicant is 18 or older', 'age18'),
      C('Class VIII pass needed for projects above ₹10 lakh (manufacturing) / ₹5 lakh (service)', 'education', (f) => { const a = V(f, 'amount'); return a != null && a > 5 * L ? 'unknown' : null; }, 'conditional'),
      always('The unit has not already received another government subsidy for the same project', 'prior_subsidy', 'conditional'),
      always('Bank sanctions the loan after the agency recommends it', 'lender', 'mandatory', 'typical'),
    ],
    info: [['Project report (what you will make/sell, cost, expected sales)', 'official'], ['Identity proof', 'official'], ['Education certificate — if the project size needs it', 'official'], ['Category certificate — only if claiming a special category', 'official']],
    route: { text: 'Apply on the PMEGP e-portal; an entrepreneurship training step is part of the process', url: 'https://www.kviconline.gov.in/pmegpeportal/' }, src: MYMSME,
  },
  {
    id: 'vishwakarma', name: 'PM Vishwakarma', family: 'gov', type: 'direct', provider: 'MoMSME',
    plain: 'Support for traditional artisans in 18 listed trades (e.g., tailor, carpenter, potter, blacksmith): skill training, a toolkit incentive and collateral-free credit at a concessional rate in two tranches (₹1 lakh, then ₹2 lakh).',
    relevantIf: isArtisan, purposes: { equipment: 0.9, startup: 0.7, expansion: 0.6, training: 1, working_capital: 0.3 }, amount: { min: 0, max: 3 * L }, delivers: ['money', 'training'], speed: 'medium', access: 'mixed', steps: 5,
    conditions: [
      C('Works with hands/tools in one of the 18 covered trades', 'artisan_trade', (f) => { const t = V(f, 'artisan_trade'); return t === 'yes' ? 'met' : t === 'no' ? 'not_met' : 'unknown'; }),
      always('Not a government employee; one beneficiary per family', 'family'),
      always('Has not taken PMEGP, PM SVANidhi or MUDRA loans in the past 5 years (fully repaid MUDRA/SVANidhi borrowers may qualify — verify)', 'prior_loans'),
    ],
    info: [['Aadhaar and mobile number (registration is via Common Service Centres)', 'official'], ['Bank account details', 'official']],
    route: { text: 'Register through a Common Service Centre (CSC)', url: 'https://pmvishwakarma.gov.in/' }, src: { t: 'PM Vishwakarma', u: 'https://pmvishwakarma.gov.in/' },
  },
  {
    id: 'delayed', name: 'Delayed-payment complaint (MSME Samadhaan / MSE-ODR)', family: 'gov', type: 'direct', provider: 'MoMSME · state MSE Facilitation Councils · RAMP',
    plain: 'A formal route when a buyer has not paid a micro or small supplier on time. The MSMED Act caps the payment period at 45 days; Samadhaan sends the case to your state MSE Facilitation Council, and MSE-ODR (under RAMP) offers online dispute resolution.',
    purposes: { receivables: 1 }, delivers: ['recovery'], speed: 'slow', access: 'online', steps: 4,
    conditions: [
      mse('You are a micro or small supplier (medium enterprises are not covered)'),
      C('Payment is overdue beyond the agreed date (the law caps it at 45 days)', 'overdue', (f) => { const o = V(f, 'overdue'); return o === 'over45' ? 'met' : o === 'under45' ? 'not_met' : 'unknown'; }),
      C('Udyam registration — rules on when you registered relative to the sale apply; verify', 'udyam', (f) => (V(f, 'udyam') === 'yes' ? 'met' : 'unknown')),
    ],
    info: [['Invoices and purchase order / contract', 'typical'], ['Proof of delivery', 'typical'], ['Udyam certificate', 'official']],
    route: { text: 'File on MSME Samadhaan; ask about MSE-ODR via the RAMP portal', url: 'https://samadhaan.msme.gov.in/' }, src: { t: 'MSME Samadhaan · RAMP', u: 'https://ramp.msme.gov.in/ramp/' },
  },
  {
    id: 'ahidf', name: 'Animal Husbandry Infrastructure Development Fund (AHIDF)', family: 'gov', type: 'direct', provider: 'Dept. of Animal Husbandry & Dairying',
    plain: 'Interest subvention on loans for dairy processing and value-addition infrastructure (e.g., milk chilling, processing, dairy products), for individual entrepreneurs, MSMEs, FPOs and companies.',
    relevantIf: isDairy, purposes: { equipment: 1, expansion: 1 }, delivers: ['money', 'interest_support'], speed: 'slow', access: 'lender', steps: 5,
    conditions: [
      lender(),
      C('The project is dairy processing / value-addition infrastructure — not cattle purchase or rearing', 'dairy_type', (f) => { const d = V(f, 'dairy_type'); return d === 'processing' ? 'met' : d === 'farm' ? 'not_met' : 'unknown'; }),
    ],
    info: [['Project report for the processing unit', 'typical'], ['Loan sanction from an eligible lender', 'typical']],
    route: { text: 'Apply online on the AHIDF portal with your lender', url: 'https://ahidf.udyamimitra.in/' }, src: { t: 'Dept. of Animal Husbandry & Dairying', u: 'https://dahd.gov.in/' }, corpusNote: 'added in v2',
  },
  {
    id: 'gift', name: 'MSE GIFT (under RAMP)', family: 'gov', type: 'direct', provider: 'MoMSME — RAMP, through participating lenders', parent: 'RAMP',
    plain: 'Interest subvention and credit-guarantee support on loans for green-technology projects of micro and small enterprises.',
    purposeFn: (f, n) => (n === 'green' ? 1 : ['equipment', 'expansion'].includes(n) ? ({ green: 0.95, circular: 0.2, no: 0 }[V(f, 'green_tech')] ?? 0.25) : 0),
    delivers: ['money', 'interest_support'], speed: 'medium', access: 'lender', steps: 4,
    conditions: [lender(), mse(), udyamFix(), always("The technology is on the scheme's eligible green-technology list", 'green_list')],
    info: DOCS_LOAN, route: { text: 'Apply through a participating lender (see RAMP portal)', url: 'https://ramp.msme.gov.in/ramp/' }, src: { t: 'RAMP scheme guidelines', u: 'https://ramp.msme.gov.in/ramp/index.php/scheme-guidelines' },
  },
  {
    id: 'spice', name: 'MSE SPICE (under RAMP)', family: 'gov', type: 'direct', provider: 'MoMSME — RAMP', parent: 'RAMP',
    plain: '25% capital subsidy (capped at ₹12.5 lakh) on eligible plant & machinery for circular-economy projects in existing micro and small units; projects up to ₹2 crore, per the official portal.',
    purposeFn: (f, n) => (n === 'circular' ? 1 : ['equipment', 'expansion'].includes(n) && V(f, 'green_tech') === 'circular' ? 0.95 : 0), amount: { min: 0, max: 2 * CR },
    delivers: ['money', 'subsidy'], speed: 'slow', access: 'lender', steps: 5,
    conditions: [lender(), brownfield('A business that is already running'), mse(), udyamFix(), amountMax(2 * CR, 'Project up to ₹2 crore'), always('Machinery is eligible circular-economy plant & machinery under the scheme', 'spice_list')],
    info: DOCS_LOAN, route: { text: 'See RAMP portal for the application route', url: 'https://ramp.msme.gov.in/ramp/' }, src: RAMP,
  },
  {
    id: 'team', name: 'MSME TEAM (under RAMP)', family: 'gov', type: 'direct', provider: 'MoMSME — RAMP', parent: 'RAMP',
    plain: 'Help for micro and small enterprises to start selling online through ONDC — onboarding, catalogue, account management, logistics and packaging support.',
    purposes: { market: 1 }, delivers: ['market'], speed: 'medium', access: 'online', steps: 3, conditions: [mse(), udyamFix()],
    info: [['Product list with photos and prices', 'typical']], route: { text: 'Register through the RAMP / MSME TEAM portal', url: 'https://ramp.msme.gov.in/ramp/' }, src: RAMP,
  },
  {
    id: 'gem', name: 'Sell to government — GeM & Public Procurement Policy', family: 'gov', type: 'direct', provider: 'GeM · MoMSME',
    plain: 'Register as a seller on the Government e-Marketplace to sell to government buyers. The Public Procurement Policy sets a target share of government purchases from micro and small enterprises.',
    purposes: { market: 0.85 }, delivers: ['market'], speed: 'medium', access: 'online', steps: 3, conditions: [udyamFix('Udyam registration — MSE benefits on GeM use it')],
    info: [['PAN, bank details and product/service details', 'typical']], route: { text: 'Register as a seller on GeM', url: 'https://gem.gov.in/' }, src: MOMSME, corpusNote: 'GeM added in v2',
  },
  {
    id: 'marketing', name: 'Procurement & Marketing Support', family: 'gov', type: 'direct', provider: 'MoMSME',
    plain: 'Support for marketing activities such as trade fairs, exhibitions and market-development programmes.',
    purposes: { market: 0.6 }, delivers: ['market'], speed: 'medium', access: 'agency', steps: 4, conditions: [always('Your activity/event fits the current scheme component', 'component')],
    info: [['Details of the fair/event you want to attend', 'typical']], route: { text: 'Contact your MSME-DFO / DIC for current calls', url: MYMSME.u }, src: MYMSME,
  },
  {
    id: 'intl', name: 'International Cooperation scheme', family: 'gov', type: 'direct', provider: 'MoMSME',
    plain: 'Support for eligible international trade fairs, buyer-seller meets and market-development activities.',
    purposes: { export: 1 }, delivers: ['market'], speed: 'slow', access: 'agency', steps: 4, conditions: [always('The activity/event is covered under current guidelines', 'component')],
    info: [['Details of the event / market you are targeting', 'typical']], route: { text: 'See the MoMSME scheme page', url: MYMSME.u }, src: MOMSME,
  },
  {
    id: 'zed', name: 'ZED Certification', family: 'gov', type: 'direct', provider: 'MoMSME',
    plain: 'Zero Defect Zero Effect — a quality and sustainability certification for MSMEs, with support on certification cost.',
    purposes: { quality: 1, productivity: 0.5, export: 0.5 }, delivers: ['cert'], speed: 'medium', access: 'online', steps: 3, conditions: [udyamFix('Udyam registration — needed to apply')],
    info: [['Udyam number', 'official']], route: { text: 'Apply on the ZED portal', url: 'https://zed.msme.gov.in/' }, src: MOMSME,
  },
  {
    id: 'lean', name: 'MSME LEAN scheme', family: 'gov', type: 'direct', provider: 'MoMSME',
    plain: 'Support to implement lean-manufacturing / productivity practices, with certification levels.',
    purposes: { productivity: 1, quality: 0.5 }, delivers: ['advisory', 'cert'], speed: 'medium', access: 'online', steps: 3, conditions: [udyamFix('Udyam registration — needed to apply')],
    info: [['Udyam number', 'official']], route: { text: 'See the MoMSME scheme page', url: MYMSME.u }, src: MOMSME,
  },
  {
    id: 'esdp', name: 'Entrepreneurship & Skill Development Programme (ESDP)', family: 'gov', type: 'direct', provider: 'MoMSME',
    plain: 'Entrepreneurship and skill-development training for aspiring and existing entrepreneurs. Training — not finance.',
    purposes: { training: 1, startup: 0.5 }, delivers: ['training'], speed: 'medium', access: 'agency', steps: 2, conditions: [],
    info: [], route: { text: 'Contact MSME-DFO for current programmes', url: MYMSME.u }, src: MOMSME,
  },
  {
    id: 'fof', name: 'Fund of Funds for MSMEs', family: 'gov', type: 'direct', provider: 'MoMSME — via participating venture funds',
    plain: 'Equity / quasi-equity for growth-stage MSMEs, invested through participating funds (not directly by the government).',
    purposes: { equity: 1 }, delivers: ['equity'], speed: 'slow', access: 'agency', steps: 6, conditions: [always('A participating fund decides to invest in your business', 'fund')],
    info: [['Business plan and financials for investors', 'typical']], route: { text: 'Approach funds participating in the Fund of Funds', url: MOMSME.u }, src: MOMSME,
  },
  {
    id: 'nssh', name: 'National SC-ST Hub', family: 'gov', type: 'direct', provider: 'MoMSME',
    plain: 'Capacity-building, market-access and procurement support for SC/ST-owned micro and small enterprises.',
    relevantIf: (f) => ['scst', 'both'].includes(V(f, 'applicant')), purposes: { market: 0.8, startup: 0.5, training: 0.6 }, delivers: ['market', 'training'], speed: 'medium', access: 'agency', steps: 3,
    conditions: [C('SC/ST-owned micro or small enterprise', 'applicant', (f) => (['scst', 'both'].includes(V(f, 'applicant')) ? 'met' : 'unknown'))],
    info: [], route: { text: 'See the National SC-ST Hub', url: MOMSME.u }, src: MOMSME,
  },
  {
    id: 'sclcss', name: 'SCLCSS (technology-upgradation capital subsidy)', family: 'gov', type: 'direct', provider: 'MoMSME', status: 'verify',
    plain: 'Capital subsidy linked to credit for eligible technology upgradation by micro and small enterprises.',
    purposes: { equipment: 0.8, expansion: 0.6 }, delivers: ['money', 'subsidy'], speed: 'slow', access: 'lender', steps: 5, conditions: [], info: [],
    route: { text: 'Check current status first', url: MYMSME.u }, src: MOMSME,
  },

  /* ---------------- Formal finance: route categories (no lender names, no rates) ---------------- */
  {
    id: 'bank_term', name: 'Bank term loan', family: 'fin', type: 'direct', provider: 'Banks',
    plain: 'A loan from a bank for buying a machine or expanding, repaid in instalments over a few years.',
    purposes: { equipment: 1, expansion: 1, startup: 0.6, green: 0.8, circular: 0.8 }, stageScore: { new: 0.5 }, delivers: ['money'], speed: 'medium', access: 'lender', steps: 4, conditions: [lender()],
    info: DOCS_LOAN, route: { text: 'Speak to your bank (start with the one that has your account)', url: null }, enablers: ['cgtmse'], asks: 'loan',
  },
  {
    id: 'bank_wc', name: 'Working-capital limit (cash credit / overdraft)', family: 'fin', type: 'direct', provider: 'Banks',
    plain: 'A revolving limit from a bank you can draw on for stock, raw material and running expenses, paying interest only on what you use.',
    purposes: { working_capital: 1, receivables: 0.5 }, stageScore: { new: 0.4 }, delivers: ['money'], speed: 'medium', access: 'lender', steps: 4, conditions: [lender()],
    info: [...DOCS_LOAN, ['Stock / sales details', 'typical']], route: { text: 'Speak to your bank about a working-capital limit', url: null }, enablers: ['cgtmse'], asks: 'loan',
  },
  {
    id: 'nbfc', name: 'NBFC business or equipment loan', family: 'fin', type: 'direct', provider: 'RBI-registered NBFCs',
    plain: 'A loan from a non-bank finance company. Often quicker with more flexible paperwork, but compare the total cost carefully.',
    purposes: { equipment: 0.85, working_capital: 0.8, expansion: 0.7, startup: 0.4, receivables: 0.4 }, stageScore: { new: 0.5 }, delivers: ['money'], speed: 'fast', access: 'lender', steps: 3, conditions: [lender()],
    info: DOCS_LOAN, route: { text: 'Compare offers from RBI-registered NBFCs', url: null }, enablers: ['cgtmse'], asks: 'loan',
  },
  {
    id: 'vendor', name: 'Machine supplier finance', family: 'fin', type: 'direct', provider: 'Equipment sellers with partner lenders',
    plain: 'Some machine sellers arrange finance through partner lenders at the point of purchase. Convenient — compare the total cost with a direct loan.',
    relevantIf: (f) => hasNeed(f, 'equipment'), purposes: { equipment: 0.7 }, delivers: ['money'], speed: 'fast', access: 'lender', steps: 2, conditions: [lender()],
    info: [['Quotation from the seller', 'typical'], ['KYC and bank statements', 'typical']], route: { text: 'Ask the machine seller which lenders they work with', url: null }, asks: 'loan',
  },
  {
    id: 'treds', name: 'TReDS invoice discounting', family: 'fin', type: 'direct', provider: 'RBI-authorised TReDS platforms',
    plain: 'Upload an invoice raised on a registered buyer; financiers bid to pay you early, and the buyer pays them on the due date.',
    purposes: { receivables: 1, working_capital: 0.4 }, delivers: ['money'], speed: 'fast', access: 'online', steps: 3,
    conditions: [
      C('Your buyer is registered on a TReDS platform (usually larger companies, PSUs, government bodies)', 'buyer_type', (f) => { const b = V(f, 'buyer_type'); return !b ? 'unknown' : b === 'small_business' || b === 'consumers' ? 'not_met' : 'unknown'; }),
      udyamFix('Udyam registration — sellers onboard with it'),
    ],
    info: [['The unpaid invoice(s)', 'typical'], ['KYC and bank details', 'typical']],
    route: { text: 'Register as a seller on an RBI-authorised TReDS platform', url: 'https://www.rbi.org.in/' }, src: { t: 'RBI — TReDS', u: 'https://www.rbi.org.in/' },
  },
  {
    id: 'invoice', name: 'Bill / invoice discounting from a bank or NBFC', family: 'fin', type: 'direct', provider: 'Banks · NBFCs',
    plain: 'A lender advances money against an unpaid invoice, based partly on how reliable your buyer is.',
    purposeFn: (f, n) => (n === 'receivables' ? (V(f, 'buyer_type') === 'consumers' ? 0.2 : 0.85) : 0), delivers: ['money'], speed: 'fast', access: 'lender', steps: 3, conditions: [lender()],
    info: [['The unpaid invoice(s) and buyer details', 'typical'], ['Bank statements', 'typical']], route: { text: 'Ask your bank / an NBFC about bill discounting', url: null }, enablers: ['cgtmse'], asks: 'loan',
  },

  /* ---------------- Enablers: attached to routes, never a standalone answer ---------------- */
  {
    id: 'cgtmse', name: 'CGTMSE credit guarantee', family: 'gov', type: 'enabler', provider: 'Government-backed trust (CGTMSE)',
    plain: 'A government-backed guarantee on eligible loans to micro and small enterprises through member lenders. It can reduce or remove the need for collateral — ask the lender whether your loan can be covered.',
    conditions: [mse(), C('Your activity is covered (some agricultural activities are not) — verify', 'sector', (f) => (V(f, 'sector') === 'dairy' || V(f, 'sector') === 'agri_crop' ? 'unknown' : 'met'))],
    route: { text: 'Ask your lender', url: 'https://www.cgtmse.in/' }, src: { t: 'CGTMSE', u: 'https://www.cgtmse.in/' },
  },
  {
    id: 'udyam', name: 'Udyam Registration', family: 'gov', type: 'enabler', provider: 'MoMSME',
    plain: 'Free, online MSME registration based on Aadhaar. Informal micro units without PAN/GST can use the Udyam Assist Platform.',
    conditions: [], route: { text: 'Register free on the official portal (never pay an agent for it)', url: 'https://udyamregistration.gov.in/' }, src: { t: 'Udyam', u: 'https://udyamregistration.gov.in/' },
  },
];

// Plain-language summary for owners: `short` = what it is (one line), `next` = what to do.
const PLAIN = {
  mudra: ['Government-backed business loan up to ₹20 lakh, without property as security.', 'Ask your bank for a MUDRA loan, or apply on the Udyamimitra portal.'],
  standup: ['Bank loan of ₹10 lakh–₹1 crore for new businesses of women or SC/ST entrepreneurs.', 'Ask your bank about Stand-Up India, or apply on the Stand-Up Mitra portal.'],
  pmegp: ['Government subsidy on a bank loan to start a new small business.', 'Apply on the PMEGP portal. Your District Industries Centre can help.'],
  vishwakarma: ['Training, toolkit support and a low-interest loan for traditional artisans.', 'Register at your nearest Common Service Centre (CSC).'],
  delayed: ["Official complaint when a buyer doesn't pay you within 45 days.", 'File a complaint on the MSME Samadhaan portal.'],
  ahidf: ['Help with loan interest for dairy processing units, like milk chilling.', 'Apply on the AHIDF portal together with your bank.'],
  gift: ['Interest help on loans for energy-saving or clean technology.', 'Ask a participating bank about MSE GIFT (see the RAMP portal).'],
  spice: ['25% subsidy on recycling or waste-reuse machines for running businesses.', 'Check the RAMP portal and ask your bank about MSE SPICE.'],
  team: ['Help to start selling online through ONDC.', 'Register on the RAMP / MSME TEAM portal.'],
  gem: ['Sell your products or services to government offices online.', 'Register as a seller on the GeM portal.'],
  marketing: ['Support to take part in trade fairs and exhibitions.', 'Ask your DIC or MSME-DFO about current trade fairs.'],
  intl: ['Support to attend international trade fairs and buyer meets.', 'Ask your MSME-DFO about current international events.'],
  zed: ['A quality certificate for your business, with help on the cost.', 'Apply on the ZED portal.'],
  lean: ['Expert help to cut waste and improve productivity.', 'See the MSME LEAN scheme on the MSME ministry website.'],
  esdp: ['Training programmes to start or run a business.', 'Ask your MSME-DFO about upcoming training.'],
  fof: ['Investment (not a loan) from venture funds backed by the government.', 'Approach funds that take part in the Fund of Funds.'],
  nssh: ['Help for SC/ST-owned businesses to grow and sell to government.', 'Contact the National SC-ST Hub.'],
  sclcss: ['Subsidy for upgrading technology — current status to be confirmed.', 'Check the current status first.'],
  bank_term: ['A bank loan for a machine or expansion, repaid in instalments.', 'Talk to your bank — start with the one where you have your account.'],
  bank_wc: ['A running credit limit from your bank for stock and daily expenses.', 'Ask your bank for a working-capital limit (cash credit or overdraft).'],
  nbfc: ['A loan from a finance company that is not a bank — often faster; compare the total cost.', 'Compare offers from 2–3 RBI-registered finance companies.'],
  vendor: ['Finance arranged by the machine seller when you buy.', 'Ask the machine seller which lenders they work with.'],
  treds: ['Get paid early on bills raised to big companies or government buyers.', 'Register as a seller on an RBI-approved TReDS platform.'],
  invoice: ['Get money now against an unpaid bill, from a bank or finance company.', 'Ask your bank about bill discounting.'],
};
for (const p of CORPUS) if (PLAIN[p.id]) [p.short, p.next] = PLAIN[p.id];

export const byId = (id) => CORPUS.find((p) => p.id === id);

// In the source corpus, but for clusters / institutions — shown for transparency, never matched to an individual owner.
export const INSTITUTIONAL = [
  'RAMP (umbrella for TEAM, GIFT, SPICE, ODR)', 'MSE-CDP (cluster infrastructure)', 'SFURTI (traditional-industry clusters)', 'ASPIRE (rural incubation)',
  'Khadi & Village Industries / ISEC (khadi institutions)', 'Coir Vikas Yojana (coir sector)', 'Assistance to Training Institutions', 'Technology Centres / Tool Rooms',
  'Technology Centre Systems Programme', 'MSME Innovative (incubation/design/IPR)', 'Performance & Credit Rating Scheme', 'NER MSME promotion', 'MSME Champions (umbrella / grievance portal)',
];

export const SUPPORT = [
  { id: 'dic', name: 'District Industries Centre (DIC)', plain: 'State government office in your district — scheme guidance, PMEGP processing, registrations.' },
  { id: 'dfo', name: 'MSME Development & Facilitation Office (MSME-DFO)', plain: 'Central MoMSME field office — scheme information and programmes.' },
  { id: 'champions', name: 'MSME Champions portal', plain: 'Official grievance and handholding portal.', url: 'https://champions.gov.in/' },
];
