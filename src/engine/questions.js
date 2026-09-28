import { L, CR, NEEDS } from './core.js';

// Plain-language questions. Every one also offers "I don't know" and "Skip" in the UI.
export const QUESTIONS = {
  need: {
    q: 'What would the money or help be used for?',
    why: 'This is the one thing we need to start. Pick the closest.',
    opts: Object.entries(NEEDS).map(([k, v]) => [k, v.l, v.s]),
  },
  amount: {
    q: 'Roughly how much do you need?',
    why: 'Different routes cover very different amounts. A rough range is fine.',
    amount: true,
    opts: [[3e4, 'Under ₹50,000'], [3 * L, '₹50,000 – ₹5 lakh'], [8 * L, '₹5 – 10 lakh'], [15 * L, '₹10 – 20 lakh'], [50 * L, '₹20 lakh – ₹1 crore'], [2 * CR, 'More than ₹1 crore']],
  },
  stage: {
    q: 'Is this for a business that is already running, or one you are starting?',
    why: 'Some routes are only for new businesses; others only for existing ones.',
    opts: [['new', 'Starting a new business'], ['existing', 'Already running'], ['expanding', 'Running and expanding']],
  },
  buyer_type: {
    q: "Who is the customer that hasn't paid?",
    why: 'Some routes only work when the buyer is a large company or government body.',
    opts: [['govt_psu', 'A government department or PSU'], ['large_company', 'A large company'], ['small_business', 'Another small business'], ['consumers', 'Individual customers']],
  },
  overdue: {
    q: 'How long past the agreed date is the payment?',
    why: 'The law gives micro & small suppliers a formal route once payment is overdue (max 45 days).',
    opts: [['over45', 'More than 45 days'], ['under45', 'Less than 45 days']],
  },
  size: {
    q: 'Roughly what are your yearly sales?',
    why: 'Some routes are only for micro and small businesses. (The official category also depends on investment — Udyam confirms it.)',
    opts: [['micro', 'Under ₹10 crore'], ['small', '₹10 – 100 crore'], ['medium', 'More than ₹100 crore']],
  },
  applicant: {
    q: 'Are you a woman or SC/ST entrepreneur?',
    why: 'Optional. Used only to check programmes reserved for these groups (e.g., Stand-Up India). Skip if you prefer.',
    opts: [['women', 'Woman entrepreneur'], ['scst', 'SC/ST entrepreneur'], ['both', 'Both'], ['none', 'Neither']],
  },
  dairy_type: {
    q: 'What does your dairy mainly do?',
    why: 'Processing units and cattle-rearing units are covered by different routes.',
    opts: [['farm', 'Keep cattle and sell milk'], ['processing', 'Chill, process or package milk / make dairy products']],
  },
  green_tech: {
    q: 'Is the new equipment meant to save energy, use clean energy, or recycle waste?',
    why: 'Green and recycling projects have extra support options.',
    opts: [['green', 'Save energy / clean energy'], ['circular', 'Recycle or reuse waste'], ['no', 'Neither']],
  },
  artisan_trade: {
    q: 'Do you work with your hands in a traditional trade (e.g., tailor, carpenter, potter, cobbler, goldsmith)?',
    why: 'There is a dedicated programme for traditional artisans.',
    opts: [['yes', 'Yes'], ['no', 'No']],
  },
  urgency: {
    q: 'How soon do you need it?',
    why: 'Some routes take weeks, others months.',
    opts: [['week', 'Within a week or two'], ['month', 'Within 1–2 months'], ['flexible', 'No fixed deadline']],
  },
  // Asked only on the dashboard ("firm up your matches"), never during discovery.
  udyam: {
    q: 'Do you have Udyam registration?',
    why: 'It can matter for some routes. It never stops you exploring.',
    opts: [['yes', 'Yes'], ['no', 'No']],
    dashboardOnly: true,
  },

  // Optional business profile ("Add details"). Never asked during discovery; each says why it is asked.
  sector: {
    q: 'What kind of business is it?',
    why: 'Some routes cover only certain activities (for example, crop farming is treated differently).',
    opts: [['manufacturing', 'Making things (manufacturing)'], ['services', 'Services'], ['trading', 'Buying and selling (trading)'], ['dairy', 'Dairy or animal husbandry'], ['agri_crop', 'Crop farming']],
    profileOnly: true,
  },
  entity: {
    q: 'How is the business set up?',
    why: 'Used only to prepare your checklist — the papers asked for can differ. It never hides a route.',
    opts: [['proprietor', 'Sole owner (proprietorship)'], ['partnership', 'Partnership'], ['company', 'LLP or company']],
    profileOnly: true,
  },
  gst: {
    q: 'Do you have GST registration?',
    why: 'Not every business needs GST, and no route here requires it for everyone. It helps us prepare your checklist.',
    opts: [['yes', 'Yes'], ['no', 'No'], ['not_needed', 'Not needed for my business']],
    profileOnly: true,
  },
  records: {
    q: 'Which financial records do you have?',
    why: 'Lenders often ask for records. Having some ready can make a loan route easier to start. It never hides a route.',
    opts: [['itr', 'Income tax returns or business accounts'], ['bank', 'Only bank statements'], ['none', 'None yet']],
    profileOnly: true,
  },
  collateral: {
    q: 'Could you offer property, gold or machinery as security for a loan?',
    why: 'Optional. Used only to suggest questions for the lender, such as a CGTMSE guarantee. Many routes do not need collateral.',
    opts: [['yes', 'Yes'], ['no', 'No']],
    profileOnly: true,
  },
  channel_pref: {
    q: 'How would you prefer to apply?',
    why: 'We show routes that suit how you like to work a little higher. Nothing is hidden.',
    opts: [['online', 'Online'], ['inperson', 'In person, at a branch or office'], ['any', 'Either is fine']],
    profileOnly: true,
  },
};
// Profile editor order. `applicant` and `collateral` also offer "Prefer not to say".
export const PROFILE_SLOTS = ['need', 'amount', 'stage', 'sector', 'state', 'size', 'urgency', 'channel_pref', 'udyam', 'gst', 'records', 'entity', 'collateral', 'applicant'];
export const SENSITIVE = ['applicant', 'collateral'];

// Tie-break order when two questions have equal information value.
export const ASK_ORDER = ['amount', 'stage', 'buyer_type', 'overdue', 'dairy_type', 'green_tech', 'applicant', 'artisan_trade', 'size', 'urgency'];
export const MAX_QUESTIONS = 4;
