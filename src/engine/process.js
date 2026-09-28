// Route-specific checklists: broad process steps, grievance channels and official contacts.
// Plain English here; Hindi comes from corpus.hi.js via tc(). Steps are broad on purpose — the office or lender may differ,
// and the UI says so. No phone numbers, addresses, response times or fees are included because none are verified.
export const PROCESS = {
  lender: [
    'Collect the papers on this checklist',
    'Visit the lender, or apply on its website or app, and ask about this route',
    'The lender checks your papers and repayment capacity, and may ask for more',
    'If approved, read the sanction letter — interest, fees, repayment and collateral — before you sign',
  ],
  lender_portal: [
    'Talk to a participating lender about your project',
    'Prepare a project report with the costs',
    'Apply on the official portal together with the lender',
    'The lender and the scheme office review it; the support is linked to the sanctioned loan',
  ],
  pmegp: [
    'Apply online on the PMEGP e-portal with your project details',
    'KVIC, KVIB or the DIC reviews the application and sends it to a bank',
    'The bank decides on the loan',
    'Complete the entrepreneurship training that is part of the process',
    'After the loan is sanctioned, the subsidy is handled through the bank',
  ],
  csc: [
    'Visit a Common Service Centre with your Aadhaar and mobile number',
    'Register; your details are verified in stages',
    'Attend the skill training',
    'Toolkit support and credit follow as the scheme sets out',
  ],
  portal: [
    'Register on the official portal',
    'Fill in your business details and upload what is asked',
    "Follow the portal's steps and note your registration number",
    'Check the portal for updates',
  ],
  office: [
    'Contact the office named in this route (MSME-DFO or DIC)',
    'Ask whether a current call or programme fits your situation',
    'Apply the way they tell you, and keep a copy',
  ],
  complaint: [
    'Send the buyer a written reminder with the invoice details',
    'File a complaint on MSME Samadhaan with your invoices',
    'Your state MSE Facilitation Council takes up the case',
    'Follow the case on the portal and keep all letters',
  ],
  treds: [
    'Register as a seller on an RBI-authorised TReDS platform',
    'Upload the invoice; your buyer must accept it on the platform',
    'Financiers bid; you accept an offer and are paid',
    'The buyer pays the financier on the due date',
  ],
  fund: [
    'Prepare a business plan and financial statements',
    'Find funds that take part in the scheme',
    'Approach the funds; each decides whether to invest after its own checks',
  ],
};

// "Before you begin", by kind of support. A route's own `prep` item is added in front.
export const BEFORE = {
  loan: ['Decide how much you need and how much you can repay each month', 'Remember this is a loan and must be repaid'],
  subsidy: ['Read how the support is paid (see Benefits and terms)', 'Plan your own contribution — support usually covers only part of the cost'],
  invoice: ['List the unpaid invoices, amounts and due dates', 'Note who each buyer is — some routes need a large or government buyer'],
  remedy: ['Collect all invoices and delivery proof for the unpaid amount', 'Note what you have already tried with the buyer'],
  market: ['List what you sell, with prices', 'Decide how many more orders you can handle'],
  capability: ['Decide what you want to improve — quality, productivity or skills', 'Set aside time for the programme'],
  equity: ['Understand that investors take a share of your business', 'Decide how much of the business you are willing to share'],
};

export const AFTER = [
  'Note your application or reference number',
  'Ask when you can expect a decision',
  'Keep copies of everything you submitted',
];

const L = {
  rbi: { t: 'RBI Complaint Management System', u: 'https://cms.rbi.org.in/' },
  champions: { t: 'MSME Champions portal', u: 'https://champions.gov.in/' },
  cpgrams: { t: 'CPGRAMS — public grievance portal', u: 'https://pgportal.gov.in/' },
  samadhaan: { t: 'MSME Samadhaan', u: 'https://samadhaan.msme.gov.in/' },
  ramp: { t: 'RAMP portal (MSE-ODR)', u: 'https://ramp.msme.gov.in/ramp/' },
};

// First-level channel, then escalation. Only steps the official schemes themselves describe.
export const GRIEVANCE = {
  lender: {
    t: 'A bank, NBFC or finance platform',
    steps: [
      "Write to the branch or the lender's grievance officer, and keep the complaint number",
      'If the lender rejects it or does not reply within 30 days, complain to the RBI Ombudsman online',
    ],
    evidence: ['Your loan or account details', 'Letters, emails or messages from the lender', 'Your written complaint and its number'],
    links: [L.rbi], src: 'RBI Integrated Ombudsman Scheme',
  },
  scheme: {
    t: 'A government scheme application',
    steps: [
      'Contact the office handling your application (DIC, KVIC, bank or portal helpdesk) with your application number',
      'If it is not resolved, raise it on the MSME Champions portal',
      "You can also file it on the government's public grievance portal (CPGRAMS)",
    ],
    evidence: ['Your application or registration number', 'Copies of what you submitted', 'Any replies you received'],
    links: [L.champions, L.cpgrams], src: 'MoMSME · DARPG',
  },
  buyer: {
    t: 'A buyer who has not paid',
    steps: [
      'Send the buyer a written reminder with invoice numbers, amounts and due dates',
      'File a delayed-payment complaint on MSME Samadhaan; it goes to your state MSE Facilitation Council',
      'Ask about online dispute resolution (MSE-ODR) through the RAMP portal',
    ],
    evidence: ['Invoices and the purchase order or contract', 'Proof of delivery', 'Udyam certificate', 'Your reminders to the buyer'],
    links: [L.samadhaan, L.ramp], src: 'MSMED Act · MSME Samadhaan',
  },
};
GRIEVANCE.other = {
  t: 'Something else',
  steps: ['Describe the problem on the MSME Champions portal — it handles grievances and handholding for MSMEs'],
  evidence: ['Any letters, numbers or messages related to the problem'],
  links: [L.champions], src: 'MoMSME',
};
export const GRIEVANCE_TYPES = ['buyer', 'lender', 'scheme', 'other'];

// Official contact points (ContactRecord). National portals only — local offices are found via their own directories.
export const CONTACTS = [
  { name: 'MSME Champions portal', role: 'Grievances and handholding for MSMEs', url: 'https://champions.gov.in/' },
  { name: 'MSME Samadhaan', role: 'Delayed-payment complaints by micro and small suppliers', url: 'https://samadhaan.msme.gov.in/' },
  { name: 'RBI Complaint Management System', role: 'Complaints about banks, NBFCs and other RBI-regulated entities', url: 'https://cms.rbi.org.in/' },
  { name: 'CPGRAMS — public grievance portal', role: 'Complaints about any central government office', url: 'https://pgportal.gov.in/' },
  { name: 'Office of the DC (MSME)', role: 'Finds your MSME Development & Facilitation Office', url: 'https://dcmsme.gov.in/' },
  { name: 'Udyam Registration', role: 'Free MSME registration (never pay an agent)', url: 'https://udyamregistration.gov.in/' },
];

export const stepsFor = (p) => PROCESS[p.flow] || [];
export const beforeFor = (p) => [p.prep, ...(BEFORE[p.support] || [])].filter(Boolean);
export const grievanceFor = (p) => GRIEVANCE[p.grievance] || GRIEVANCE.other;
