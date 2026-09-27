// Tap-to-explain glossary. Each term matches its English and Hindi forms; the first match in a block
// becomes a button that opens a plain explanation in the current language.
export const GLOSSARY = [
  { id: 'nbfc', rx: /\bNBFCs?\b/, t: { en: 'NBFC', hi: 'NBFC' },
    en: 'Non-Banking Finance Company — a finance company that is not a bank but is registered with the RBI. It can give loans, often faster, but compare the total cost.',
    hi: 'गैर-बैंकिंग फाइनेंस कंपनी — बैंक नहीं, पर RBI में रजिस्टर्ड फाइनेंस कंपनी। यह लोन दे सकती है, अक्सर जल्दी, पर कुल ख़र्च की तुलना ज़रूर करें।' },
  { id: 'collateral', rx: /\bcollateral\b|गिरवी|\bsecurity\b/i, t: { en: 'Collateral / security', hi: 'गिरवी' },
    en: 'Something valuable you pledge to the lender — like property, gold or machinery — which they can keep if the loan is not repaid.',
    hi: 'कोई क़ीमती चीज़ जो आप लेंडर के पास गिरवी रखते हैं — जैसे संपत्ति, सोना या मशीन — लोन न चुकाने पर लेंडर उसे रख सकता है।' },
  { id: 'term', rx: /\bterm loan\b|टर्म लोन/i, t: { en: 'Term loan', hi: 'टर्म लोन' },
    en: 'A loan for a fixed amount that you repay in instalments over a set period — usually for buying a machine or expanding.',
    hi: 'एक तय रकम का लोन जो तय समय में किस्तों में चुकाया जाता है — आमतौर पर मशीन ख़रीदने या विस्तार के लिए।' },
  { id: 'wc', rx: /\bworking[- ]capital\b|वर्किंग कैपिटल/i, t: { en: 'Working capital', hi: 'वर्किंग कैपिटल' },
    en: 'Money to run the business day to day — stock, raw material, wages, rent — before your customers pay you.',
    hi: 'रोज़ का व्यवसाय चलाने का पैसा — स्टॉक, कच्चा माल, मज़दूरी, किराया — ग्राहकों से पैसा आने से पहले।' },
  { id: 'od', rx: /\bcash credit\b|\boverdraft\b|कैश क्रेडिट|ओवरड्राफ्ट/i, t: { en: 'Cash credit / overdraft', hi: 'कैश क्रेडिट / ओवरड्राफ्ट' },
    en: 'A limit the bank sets for you. You take money when needed, up to the limit, and pay interest only on what you use.',
    hi: 'बैंक आपके लिए एक सीमा तय करता है। ज़रूरत पर सीमा तक पैसा निकालें, और ब्याज सिर्फ़ इस्तेमाल की गई रकम पर दें।' },
  { id: 'subsidy', rx: /\bsubsid(y|ies)\b|सब्सिडी/i, t: { en: 'Subsidy', hi: 'सब्सिडी' },
    en: 'Money the government pays towards part of your cost, so you pay back less. It usually comes through the bank after your loan is approved.',
    hi: 'सरकार आपकी लागत का कुछ हिस्सा देती है, जिससे आपको कम चुकाना पड़ता है। यह आमतौर पर लोन मंज़ूर होने के बाद बैंक के ज़रिए मिलती है।' },
  { id: 'subvention', rx: /\binterest subvention\b|\binterest help\b|ब्याज में (छूट|मदद)/i, t: { en: 'Interest help (subvention)', hi: 'ब्याज में छूट' },
    en: 'The government pays part of the interest on your loan, so your interest cost is lower.',
    hi: 'सरकार आपके लोन के ब्याज का कुछ हिस्सा देती है, जिससे आपका ब्याज ख़र्च कम हो जाता है।' },
  { id: 'cgtmse', rx: /\bCGTMSE\b|credit[- ]guarantee|क्रेडिट गारंटी/i, t: { en: 'Credit guarantee (CGTMSE)', hi: 'क्रेडिट गारंटी (CGTMSE)' },
    en: 'A government-backed promise to the lender that covers part of the loan if it is not repaid. It can mean you need less or no property as security.',
    hi: 'लेंडर को सरकार-समर्थित भरोसा कि लोन न चुकने पर उसका कुछ हिस्सा मिल जाएगा। इससे गिरवी की ज़रूरत कम या ख़त्म हो सकती है।' },
  { id: 'udyam', rx: /\bUdyam\b|उद्यम रजिस्ट्रेशन|उद्यम/, t: { en: 'Udyam registration', hi: 'उद्यम रजिस्ट्रेशन' },
    en: "Free, online government registration for small businesses (MSMEs), done with Aadhaar on udyamregistration.gov.in. Never pay an agent for it.",
    hi: 'छोटे व्यवसायों (MSME) के लिए मुफ़्त, ऑनलाइन सरकारी रजिस्ट्रेशन, आधार से udyamregistration.gov.in पर। इसके लिए किसी एजेंट को पैसे न दें।' },
  { id: 'kyc', rx: /\bKYC\b/, t: { en: 'KYC', hi: 'KYC' },
    en: '"Know Your Customer" — proof of who you are and where you live, like Aadhaar, PAN or a voter ID.',
    hi: '"अपने ग्राहक को जानें" — आप कौन हैं और कहाँ रहते हैं इसका प्रमाण, जैसे आधार, PAN या वोटर ID।' },
  { id: 'itr', rx: /\bITR\b/, t: { en: 'ITR', hi: 'ITR' },
    en: 'Income Tax Return — the yearly income statement you file with the tax department. If you do not file one, ask the lender what else they accept.',
    hi: 'इनकम टैक्स रिटर्न — आयकर विभाग में भरा जाने वाला सालाना आय विवरण। अगर आप नहीं भरते, तो लेंडर से पूछें कि वे और क्या मानते हैं।' },
  { id: 'treds', rx: /\bTReDS\b/, t: { en: 'TReDS', hi: 'TReDS' },
    en: 'An RBI-approved online platform where finance companies pay you early for bills raised to large companies or government buyers.',
    hi: 'RBI-मंज़ूर ऑनलाइन प्लेटफ़ॉर्म जहाँ फाइनेंस कंपनियाँ बड़ी कंपनियों या सरकारी ख़रीदारों पर बने आपके बिलों का पैसा जल्दी देती हैं।' },
  { id: 'discount', rx: /\b(bill|invoice) discounting\b|बिल डिस्काउंटिंग/i, t: { en: 'Bill discounting', hi: 'बिल डिस्काउंटिंग' },
    en: 'A lender gives you most of an unpaid bill amount now and collects it from your buyer later, for a fee.',
    hi: 'लेंडर बकाया बिल की ज़्यादातर रकम अभी दे देता है और बाद में आपके ख़रीदार से वसूलता है — एक फ़ीस के बदले।' },
  { id: 'mfi', rx: /\bMFIs?\b|microfinance|माइक्रोफाइनेंस/i, t: { en: 'Microfinance (MFI)', hi: 'माइक्रोफाइनेंस (MFI)' },
    en: 'Institutions that give small loans, often to people without much paperwork or credit history.',
    hi: 'संस्थाएँ जो छोटे लोन देती हैं, अक्सर उन्हें जिनके पास ज़्यादा कागज़ या लोन का पुराना रिकॉर्ड नहीं होता।' },
  { id: 'dic', rx: /\bDIC\b|ज़िला उद्योग केंद्र/, t: { en: 'District Industries Centre (DIC)', hi: 'ज़िला उद्योग केंद्र (DIC)' },
    en: 'A state government office in your district that guides small businesses on schemes and registrations.',
    hi: 'आपके ज़िले में राज्य सरकार का दफ़्तर जो छोटे व्यवसायों को योजनाओं और रजिस्ट्रेशन में मार्गदर्शन देता है।' },
];

const DEV = /[\u0900-\u097F]/;

// Wraps the first glossary term found in already-escaped HTML text. `used` avoids repeating a term in one block.
export function glossify(html, lang, used = new Set()) {
  for (const g of GLOSSARY) {
    if (used.has(g.id)) continue;
    const rx = new RegExp(g.rx.source, g.rx.flags.includes('g') ? g.rx.flags : g.rx.flags + 'g');
    for (const m of html.matchAll(rx)) {
      const before = html.slice(0, m.index);
      const insideTag = before.lastIndexOf('<') > before.lastIndexOf('>');
      const insideButton = (before.match(/<button/g) || []).length > (before.match(/<\/button>/g) || []).length;
      // Devanagari has no \b: don't split a word (e.g. "उद्यम" inside "उद्यमी").
      const next = html[m.index + m[0].length] || '', prev = html[m.index - 1] || '';
      const partOfWord = DEV.test(next) || (DEV.test(m[0][0]) && DEV.test(prev));
      if (insideTag || insideButton || partOfWord) continue;
      used.add(g.id);
      html = before + `<button type="button" class="term" data-act="term" data-term="${g.id}">${m[0]}</button>` + html.slice(m.index + m[0].length);
      break;
    }
  }
  return html;
}
export const termById = (id) => GLOSSARY.find((g) => g.id === id);
