// "What is this?" and "I don't have it" help for common papers, keyed by the English document text in corpus.js.
// Kept general on purpose: exact requirements vary by lender/scheme, so every tip ends with "ask them".
const HELP = {
  quote: {
    en: ['A written price for what you want to buy — from the seller or supplier.', 'Ask the seller for a quotation on their letterhead or bill book.'],
    hi: ['आप जो ख़रीदना चाहते हैं उसकी लिखित क़ीमत — विक्रेता या सप्लायर से।', 'विक्रेता से उनके लेटरहेड या बिल बुक पर कोटेशन माँगें।'],
  },
  kyc: {
    en: ['Proof of who you are and where you live — for example Aadhaar, PAN, voter ID.', 'Usually papers you already have. Ask the lender which ones they accept.'],
    hi: ['आप कौन हैं और कहाँ रहते हैं इसका प्रमाण — जैसे आधार, PAN, वोटर ID।', 'आमतौर पर ये आपके पास पहले से होते हैं। लेंडर से पूछें कि कौन-से मान्य हैं।'],
  },
  bank: {
    en: ["A printout of your account's money in and out, usually for the last several months.", 'Download it from net banking or ask at your bank branch.'],
    hi: ['आपके खाते में आए-गए पैसों का प्रिंटआउट, आमतौर पर पिछले कई महीनों का।', 'नेट बैंकिंग से डाउनलोड करें या अपनी बैंक शाखा में माँगें।'],
  },
  itr: {
    en: ['Your income tax return and business accounts (profit & loss, balance sheet).', "Your CA or tax preparer can give copies. If you don't file ITR, ask the lender what else they accept."],
    hi: ['आपका इनकम टैक्स रिटर्न और व्यवसाय के हिसाब (लाभ-हानि, बैलेंस शीट)।', 'आपके CA या टैक्स भरने वाले से कॉपी मिल जाएगी। अगर ITR नहीं भरते, तो लेंडर से पूछें कि वे और क्या मानते हैं।'],
  },
  plan: {
    en: ['A short document: what you will make or sell, what it costs, and expected sales.', 'Your District Industries Centre, a CA or a Finance Saathi can help you prepare it.'],
    hi: ['एक छोटा दस्तावेज़: आप क्या बनाएँगे या बेचेंगे, लागत क्या है, और अनुमानित बिक्री।', 'आपका ज़िला उद्योग केंद्र, कोई CA या फाइनेंस साथी इसे बनाने में मदद कर सकते हैं।'],
  },
  udyam: {
    en: ['Your free government registration as a small business (MSME).', 'Register free on udyamregistration.gov.in using Aadhaar. Never pay an agent for it.'],
    hi: ['छोटे व्यवसाय (MSME) के रूप में आपका मुफ़्त सरकारी रजिस्ट्रेशन।', 'udyamregistration.gov.in पर आधार से मुफ़्त रजिस्टर करें। इसके लिए किसी एजेंट को पैसे न दें।'],
  },
  invoice: {
    en: ["The bills you raised and the buyer's order or agreement.", 'Take copies from your bill book, records or billing software.'],
    hi: ['आपके बनाए बिल और ख़रीदार का ऑर्डर या समझौता।', 'अपनी बिल बुक, रिकॉर्ड या बिलिंग सॉफ़्टवेयर से कॉपी निकालें।'],
  },
  delivery: {
    en: ['A signed delivery note, challan or receipt showing the buyer received the goods.', 'Check your delivery challans or transport receipts.'],
    hi: ['हस्ताक्षर वाला डिलीवरी नोट, चालान या रसीद जिससे पता चले कि ख़रीदार को माल मिला।', 'अपने डिलीवरी चालान या ट्रांसपोर्ट की रसीदें देखें।'],
  },
  account: {
    en: ['Your bank account number, IFSC code and account holder name.', 'Printed on your passbook or cheque book.'],
    hi: ['आपका बैंक खाता नंबर, IFSC कोड और खाताधारक का नाम।', 'यह आपकी पासबुक या चेकबुक पर छपा होता है।'],
  },
  aadhaar: {
    en: ['Your Aadhaar card and the mobile number linked to it.', 'If your mobile is not linked, update it at an Aadhaar centre first.'],
    hi: ['आपका आधार कार्ड और उससे जुड़ा मोबाइल नंबर।', 'अगर मोबाइल जुड़ा नहीं है, तो पहले आधार केंद्र पर अपडेट कराएँ।'],
  },
  pan: {
    en: ['Your PAN card, bank account details, and a short description of what you sell.', 'PAN and bank details are usually with you already; the product list you can write yourself.'],
    hi: ['आपका PAN कार्ड, बैंक खाते का विवरण, और आप क्या बेचते हैं उसका छोटा विवरण।', 'PAN और बैंक विवरण आमतौर पर आपके पास होते हैं; उत्पादों की सूची आप ख़ुद लिख सकते हैं।'],
  },
  stock: {
    en: ['A simple record of the stock you hold and your recent sales.', 'Your stock register, billing software or a written summary is fine. Ask the bank what format they want.'],
    hi: ['आपके पास रखे स्टॉक और हाल की बिक्री का सरल रिकॉर्ड।', 'स्टॉक रजिस्टर, बिलिंग सॉफ़्टवेयर या लिखा हुआ सारांश चलेगा। बैंक से पूछें कि किस रूप में चाहिए।'],
  },
  cert: {
    en: ['A certificate that proves your education or category, needed only in some cases.', 'Use the certificate you already have; ask the office whether it is needed for your project size or category.'],
    hi: ['आपकी पढ़ाई या श्रेणी का प्रमाणपत्र — सिर्फ़ कुछ मामलों में ज़रूरी।', 'जो प्रमाणपत्र आपके पास है वही लें; दफ़्तर से पूछें कि आपके प्रोजेक्ट या श्रेणी के लिए ज़रूरी है या नहीं।'],
  },
  catalogue: {
    en: ['A list of what you sell, with a clear photo and price for each item.', 'Take photos on your phone in good light and write the price next to each.'],
    hi: ['आप जो बेचते हैं उसकी सूची, हर सामान की साफ़ फ़ोटो और दाम के साथ।', 'अच्छी रोशनी में फ़ोन से फ़ोटो लें और हर एक के आगे दाम लिखें।'],
  },
  event: {
    en: ['Name, place and dates of the fair or market you want to attend.', 'Note these from the organiser; your DIC or MSME-DFO can tell you about current events.'],
    hi: ['जिस मेले या बाज़ार में जाना है उसका नाम, जगह और तारीख़।', 'आयोजक से यह लिखें; आपका DIC या MSME-DFO मौजूदा कार्यक्रमों के बारे में बता सकता है।'],
  },
  sanction: {
    en: ['A letter from the bank saying your loan is approved.', 'You get this from the bank after it approves your loan.'],
    hi: ['बैंक का पत्र जिसमें लिखा हो कि आपका लोन मंज़ूर है।', 'लोन मंज़ूर होने के बाद यह बैंक से मिलता है।'],
  },
};

const DOC_KEY = {
  'What the money is for — e.g., quotation or bill estimate': 'quote',
  'Quotation from the seller': 'quote',
  'Identity and address proof (KYC)': 'kyc',
  'Identity proof': 'kyc',
  'KYC and bank statements': 'kyc',
  'KYC and bank details': 'kyc',
  'Recent bank statements': 'bank',
  'Bank statements': 'bank',
  'For larger amounts: ITR / financial statements': 'itr',
  'Business plan and financials for investors': 'plan',
  'Project plan for the new enterprise': 'plan',
  'Project report (what you will make/sell, cost, expected sales)': 'plan',
  'Project report for the processing unit': 'plan',
  'Udyam certificate': 'udyam',
  'Udyam number': 'udyam',
  'Invoices and purchase order / contract': 'invoice',
  'The unpaid invoice(s)': 'invoice',
  'The unpaid invoice(s) and buyer details': 'invoice',
  'Proof of delivery': 'delivery',
  'Bank account details': 'account',
  'Aadhaar and mobile number (registration is via Common Service Centres)': 'aadhaar',
  'Loan sanction from an eligible lender': 'sanction',
  'PAN, bank details and product/service details': 'pan',
  'Stock / sales details': 'stock',
  'Education certificate — if the project size needs it': 'cert',
  'Category certificate — only if claiming a special category': 'cert',
  'Product list with photos and prices': 'catalogue',
  'Details of the fair/event you want to attend': 'event',
  'Details of the event / market you are targeting': 'event',
};

// Returns { what, how } in the given language, or null if we have no help for this paper.
export function docHelp(englishDoc, lang) {
  const h = HELP[DOC_KEY[englishDoc]];
  if (!h) return null;
  const [what, how] = h[lang] || h.en;
  return { what, how };
}
export { HELP as DOC_HELP, DOC_KEY };
