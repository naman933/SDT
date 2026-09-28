# 100-case audit

Generated from `tests/audit-cases.js` (the same cases run by `npm test`). Each case goes through rule-based understanding
and the adaptive question loop. Three answer patterns are used: **answers** (the owner answers the questions set for the case), **dontknow**
("I don't know" to everything) and **partial** (only the first answer is given).

## Summary

- Cases: 100 (en 82, hi 15, hinglish 3)
- Checks that run on every case: no input loss; the question loop ends within 4 questions; at most 3 government + 3 finance routes, with no duplicates;
  an unknown fact never hides a route; "status to verify" records are never shown; no shown route has an unmet hard gate.
- All checks pass (`npm test`).
- Cases with no route shown: 15. In every one, the rules could not read the need from the words. Most are deliberately vague inputs ("I need money", "8 lakh", "I don't know"); two are short sentences the rules miss ("We need 200 crore to build a new steel plant", "I need 5000 rupees for my shop"). The app's recovery is to ask "What would the money or help be used for?". The audit answers "I don't know" to that question, so no route is shown, and the app then offers a person to help.
- Cases showing both government and bank/NBFC routes: 69.
- Average routes shown per case: 3.2.
- Missed expected pathways (in cases with an expectation): none.

## Known limits found by the audit

- Rule-based understanding misses needs described only with words it doesn't know (e.g. "build a new plant", "for my shop"). Such cases fall back to the "What would the money or help be used for?" question, which is the intended recovery path.
- Crop farming is not detected from the words alone. The sector question in the profile covers it.
- Text in Marathi, Kannada, Gujarati or Tamil is not understood by the rules. Only English, Hindi (Devanagari) and Hinglish are.

## All cases

| Case | Lang | Owner's words | Need understood | Questions asked | Routes shown | Result |
|---|---|---|---|---|---|---|
| eq-dairy/answers/Pune | en | I run a dairy near Pune. I need about 8 lakh for a new milk chillin… | equipment | green_tech, urgency | mudra, ahidf, bank_term, nbfc, vendor | expected route found |
| eq-auto/answers/Mumbai | en | We manufacture auto parts in Mumbai and need new machines worth 25 … | equipment, expansion | green_tech, urgency | bank_term, nbfc, vendor | expected route found |
| eq-bakery/answers/Surat | en | My bakery in Surat has been running for 6 years. I need an oven tha… | equipment | green_tech, urgency | mudra, bank_term, nbfc, vendor | expected route found |
| eq-solar/answers/Jaipur | en | Our small factory in Jaipur wants solar panels and energy saving ma… | equipment, green | stage, applicant, size, urgency | gift, bank_term, vendor, nbfc, standup, pmegp | expected route found |
| eq-recycle/answers/Lucknow | en | We run a plastic unit in Lucknow and want recycling machinery to re… | equipment, circular | size, urgency | spice, bank_term, nbfc, vendor | expected route found |
| eq-hi/answers/Chennai | hi | मेरी Chennai में फैक्ट्री है। नई मशीन के लिए 12 लाख चाहिए। | equipment | green_tech, urgency | mudra, bank_term, nbfc, vendor | expected route found |
| eq-hinglish/answers/Kolkata | hinglish | Main Kolkata mein dairy chalata hoon, 8 lakh ki nayi milk chilling … | equipment | green_tech, urgency | mudra, ahidf, bank_term, nbfc, vendor | expected route found |
| wc-kirana/answers/Indore | en | I have a kirana shop in Indore and need around 3 lakh for stock bef… | working_capital | urgency | mudra, bank_wc, nbfc | expected route found |
| wc-trader-big/answers/Patna | en | We are a wholesale trader in Patna with 60 crore annual sales. We n… | working_capital | — | nbfc, bank_wc | expected route found |
| wc-wages/answers/Guwahati | en | Our workshop in Guwahati needs 2 lakh to pay wages and buy raw mate… | working_capital | urgency | mudra, bank_wc, nbfc | expected route found |
| wc-hi/answers/Pune | hi | मेरी Pune में किराना दुकान है, स्टॉक के लिए 2 लाख चाहिए। | working_capital | urgency | mudra, bank_wc, nbfc | expected route found |
| new-tailor/answers/Mumbai | en | I want to start my own tailoring and boutique business in Mumbai an… | startup | applicant | mudra, standup, pmegp, bank_term | expected route found |
| new-small/answers/Surat | en | I want to start a small tea stall in Surat. I need 40 thousand. | startup | applicant | mudra, pmegp, esdp, bank_term | expected route found |
| new-scst/answers/Jaipur | en | I am planning to set up a new printing unit in Jaipur for 50 lakh. | startup | applicant | standup, pmegp, nssh, bank_term | expected route found |
| new-hi/answers/Lucknow | hi | मैं Lucknow में नया व्यवसाय शुरू करना चाहती हूँ, 5 लाख चाहिए। | startup | applicant | mudra, pmegp, esdp, bank_term | expected route found |
| new-artisan/answers/Chennai | en | I am a carpenter in Chennai and want to buy better tools, about 1 l… | equipment | stage, green_tech, artisan_trade, urgency | mudra, vishwakarma, bank_term, vendor, nbfc, pmegp | expected route found |
| rc-large/answers/Kolkata | en | A large company in Kolkata hasn't paid my invoices for 90 days. I n… | receivables | urgency, size | delayed, treds, invoice, bank_wc | expected route found |
| rc-govt/answers/Indore | en | A government department has not paid my bills for 4 months. | receivables | urgency, size | delayed, treds, invoice, bank_wc | expected route found |
| rc-consumer/answers/Patna | en | My customers haven't paid me and I need cash. | receivables | overdue, buyer_type | bank_wc | expected route found |
| rc-hi/answers/Guwahati | hi | मेरे ग्राहक ने भुगतान नहीं किया है और मुझे पैसों की ज़रूरत है। | receivables | overdue, urgency, buyer_type, size | delayed, treds, invoice, bank_wc | expected route found |
| mk-online/answers/Pune | en | I make handmade soaps in Pune and want to sell online to more custo… | market | size, applicant | team, gem, marketing | expected route found |
| mk-export/answers/Mumbai | en | We want to export our textiles abroad and meet international buyers. | export | — | intl, zed | expected route found |
| q-cert/answers/Surat | en | We need a quality certification like ZED for our unit in Surat. | quality | — | zed, lean | expected route found |
| q-lean/answers/Jaipur | en | I want to improve productivity and reduce waste in my factory. | circular, productivity | amount, size | lean, spice, bank_term, zed | expected route found |
| sk-train/answers/Lucknow | en | I want to learn business skills before I start. | startup, training | amount, applicant, urgency | esdp, standup, pmegp, bank_term | expected route found |
| eq-investor/answers/Chennai | en | We are a growing company and want to bring in an investor for equity. | expansion, equity | amount, green_tech, urgency | bank_term, fof, mudra, nbfc | expected route found |
| reg-udyam/answers/Kolkata | en | I need money to grow my business but I do not have Udyam registration. | expansion | amount, green_tech | mudra, bank_term, nbfc | — |
| vague-1/answers/Indore | en | I'm not sure what support is right for my business. Help me figure … | — | — | — | no route (acceptable) |
| vague-hi/answers/Patna | hi | मुझे नहीं पता मेरे व्यवसाय के लिए कौन-सी मदद सही है। | — | — | — | no route (acceptable) |
| money-only/answers/Guwahati | en | I need money. | — | — | — | no route (acceptable) |
| huge/answers/Pune | en | We need 200 crore to build a new steel plant. | — | — | — | — |
| tiny/answers/Mumbai | en | I need 5000 rupees for my shop. | — | — | — | — |
| numbers-only/answers/Surat | en | 8 lakh | — | — | — | no route (acceptable) |
| emoji/answers/Jaipur | en | 🙏 machine chahiye 🙏 | equipment | amount, stage, green_tech, urgency | bank_term, vendor, mudra, nbfc, standup, pmegp | — |
| long/answers/Lucknow | en | I run a small printing press in Lucknow. I run a small printing pre… | equipment | green_tech, urgency | mudra, bank_term, nbfc, vendor | expected route found |
| eq-dairy/dontknow/Chennai | en | I run a dairy near Chennai. I need about 8 lakh for a new milk chil… | equipment | green_tech, urgency | mudra, ahidf, bank_term, nbfc, vendor | — |
| eq-auto/dontknow/Kolkata | en | We manufacture auto parts in Kolkata and need new machines worth 25… | equipment, expansion | green_tech, urgency | bank_term, nbfc, vendor | — |
| eq-bakery/dontknow/Indore | en | My bakery in Indore has been running for 6 years. I need an oven th… | equipment | green_tech, urgency | mudra, bank_term, nbfc, vendor | — |
| eq-solar/dontknow/Patna | en | Our small factory in Patna wants solar panels and energy saving mac… | equipment, green | stage, applicant, size, urgency | gift, bank_term, vendor, nbfc, standup, pmegp | — |
| eq-recycle/dontknow/Guwahati | en | We run a plastic unit in Guwahati and want recycling machinery to r… | equipment, circular | size, urgency | spice, bank_term, nbfc, vendor | — |
| eq-hi/dontknow/Pune | hi | मेरी Pune में फैक्ट्री है। नई मशीन के लिए 12 लाख चाहिए। | equipment | green_tech, urgency | mudra, bank_term, nbfc, vendor | — |
| eq-hinglish/dontknow/Mumbai | hinglish | Main Mumbai mein dairy chalata hoon, 8 lakh ki nayi milk chilling m… | equipment | green_tech, urgency | mudra, ahidf, bank_term, nbfc, vendor | — |
| wc-kirana/dontknow/Surat | en | I have a kirana shop in Surat and need around 3 lakh for stock befo… | working_capital | urgency | mudra, bank_wc, nbfc | — |
| wc-trader-big/dontknow/Jaipur | en | We are a wholesale trader in Jaipur with 60 crore annual sales. We … | working_capital | — | nbfc, bank_wc | — |
| wc-wages/dontknow/Lucknow | en | Our workshop in Lucknow needs 2 lakh to pay wages and buy raw mater… | working_capital | urgency | mudra, bank_wc, nbfc | — |
| wc-hi/dontknow/Chennai | hi | मेरी Chennai में किराना दुकान है, स्टॉक के लिए 2 लाख चाहिए। | working_capital | urgency | mudra, bank_wc, nbfc | — |
| new-tailor/dontknow/Kolkata | en | I want to start my own tailoring and boutique business in Kolkata a… | startup | applicant | mudra, standup, pmegp, bank_term | — |
| new-small/dontknow/Indore | en | I want to start a small tea stall in Indore. I need 40 thousand. | startup | applicant | mudra, pmegp, esdp, bank_term | — |
| new-scst/dontknow/Patna | en | I am planning to set up a new printing unit in Patna for 50 lakh. | startup | applicant | standup, pmegp, esdp, bank_term | — |
| new-hi/dontknow/Guwahati | hi | मैं Guwahati में नया व्यवसाय शुरू करना चाहती हूँ, 5 लाख चाहिए। | startup | applicant | mudra, pmegp, esdp, bank_term | — |
| new-artisan/dontknow/Pune | en | I am a carpenter in Pune and want to buy better tools, about 1 lakh. | equipment | stage, green_tech, artisan_trade, urgency | mudra, vishwakarma, bank_term, vendor, nbfc, pmegp | — |
| rc-large/dontknow/Mumbai | en | A large company in Mumbai hasn't paid my invoices for 90 days. I ne… | receivables | urgency, size | delayed, treds, invoice, bank_wc | — |
| rc-govt/dontknow/Surat | en | A government department has not paid my bills for 4 months. | receivables | urgency, size | delayed, treds, invoice, bank_wc | — |
| rc-consumer/dontknow/Jaipur | en | My customers haven't paid me and I need cash. | receivables | overdue, size, urgency, buyer_type | treds, delayed, invoice, bank_wc | — |
| rc-hi/dontknow/Lucknow | hi | मेरे ग्राहक ने भुगतान नहीं किया है और मुझे पैसों की ज़रूरत है। | receivables | overdue, size, urgency, buyer_type | treds, delayed, invoice, bank_wc | — |
| mk-online/dontknow/Chennai | en | I make handmade soaps in Chennai and want to sell online to more cu… | market | size, applicant | team, gem, marketing | — |
| mk-export/dontknow/Kolkata | en | We want to export our textiles abroad and meet international buyers. | export | — | intl, zed | — |
| q-cert/dontknow/Indore | en | We need a quality certification like ZED for our unit in Indore. | quality | — | zed, lean | — |
| q-lean/dontknow/Patna | en | I want to improve productivity and reduce waste in my factory. | circular, productivity | amount, size | lean, spice, bank_term, zed | — |
| sk-train/dontknow/Guwahati | en | I want to learn business skills before I start. | startup, training | amount, applicant, urgency | esdp, standup, pmegp, bank_term | — |
| eq-investor/dontknow/Pune | en | We are a growing company and want to bring in an investor for equity. | expansion, equity | amount, green_tech, urgency | bank_term, fof, mudra, nbfc | — |
| reg-udyam/dontknow/Mumbai | en | I need money to grow my business but I do not have Udyam registration. | expansion | amount, green_tech, urgency | bank_term, mudra, nbfc | — |
| vague-1/dontknow/Surat | en | I'm not sure what support is right for my business. Help me figure … | — | — | — | — |
| vague-hi/dontknow/Jaipur | hi | मुझे नहीं पता मेरे व्यवसाय के लिए कौन-सी मदद सही है। | — | — | — | — |
| money-only/dontknow/Lucknow | en | I need money. | — | — | — | — |
| huge/dontknow/Chennai | en | We need 200 crore to build a new steel plant. | — | — | — | — |
| tiny/dontknow/Kolkata | en | I need 5000 rupees for my shop. | — | — | — | — |
| numbers-only/dontknow/Indore | en | 8 lakh | — | — | — | — |
| emoji/dontknow/Patna | en | 🙏 machine chahiye 🙏 | equipment | amount, stage, green_tech, urgency | bank_term, vendor, mudra, nbfc, standup, pmegp | — |
| long/dontknow/Guwahati | en | I run a small printing press in Guwahati. I run a small printing pr… | equipment | green_tech, urgency | mudra, bank_term, nbfc, vendor | — |
| eq-dairy/partial/Pune | en | I run a dairy near Pune. I need about 8 lakh for a new milk chillin… | equipment | green_tech, urgency | mudra, ahidf, bank_term, nbfc, vendor | — |
| eq-auto/partial/Mumbai | en | We manufacture auto parts in Mumbai and need new machines worth 25 … | equipment, expansion | green_tech, urgency | bank_term, nbfc, vendor | — |
| eq-bakery/partial/Surat | en | My bakery in Surat has been running for 6 years. I need an oven tha… | equipment | green_tech, urgency | mudra, bank_term, nbfc, vendor | — |
| eq-solar/partial/Jaipur | en | Our small factory in Jaipur wants solar panels and energy saving ma… | equipment, green | stage, applicant, size, urgency | gift, bank_term, vendor, nbfc, standup, pmegp | — |
| eq-recycle/partial/Lucknow | en | We run a plastic unit in Lucknow and want recycling machinery to re… | equipment, circular | size, urgency | spice, bank_term, nbfc, vendor | — |
| eq-hi/partial/Chennai | hi | मेरी Chennai में फैक्ट्री है। नई मशीन के लिए 12 लाख चाहिए। | equipment | green_tech, urgency | mudra, bank_term, nbfc, vendor | — |
| eq-hinglish/partial/Kolkata | hinglish | Main Kolkata mein dairy chalata hoon, 8 lakh ki nayi milk chilling … | equipment | green_tech, urgency | mudra, ahidf, bank_term, nbfc, vendor | — |
| wc-kirana/partial/Indore | en | I have a kirana shop in Indore and need around 3 lakh for stock bef… | working_capital | urgency | mudra, bank_wc, nbfc | — |
| wc-trader-big/partial/Patna | en | We are a wholesale trader in Patna with 60 crore annual sales. We n… | working_capital | — | nbfc, bank_wc | — |
| wc-wages/partial/Guwahati | en | Our workshop in Guwahati needs 2 lakh to pay wages and buy raw mate… | working_capital | urgency | mudra, bank_wc, nbfc | — |
| wc-hi/partial/Pune | hi | मेरी Pune में किराना दुकान है, स्टॉक के लिए 2 लाख चाहिए। | working_capital | urgency | mudra, bank_wc, nbfc | — |
| new-tailor/partial/Mumbai | en | I want to start my own tailoring and boutique business in Mumbai an… | startup | applicant | mudra, standup, pmegp, bank_term | — |
| new-small/partial/Surat | en | I want to start a small tea stall in Surat. I need 40 thousand. | startup | applicant | mudra, pmegp, esdp, bank_term | — |
| new-scst/partial/Jaipur | en | I am planning to set up a new printing unit in Jaipur for 50 lakh. | startup | applicant | standup, pmegp, nssh, bank_term | — |
| new-hi/partial/Lucknow | hi | मैं Lucknow में नया व्यवसाय शुरू करना चाहती हूँ, 5 लाख चाहिए। | startup | applicant | mudra, pmegp, esdp, bank_term | — |
| new-artisan/partial/Chennai | en | I am a carpenter in Chennai and want to buy better tools, about 1 l… | equipment | stage, green_tech, artisan_trade, urgency | mudra, vishwakarma, bank_term, vendor, nbfc, pmegp | — |
| rc-large/partial/Kolkata | en | A large company in Kolkata hasn't paid my invoices for 90 days. I n… | receivables | urgency, size | delayed, treds, invoice, bank_wc | — |
| rc-govt/partial/Indore | en | A government department has not paid my bills for 4 months. | receivables | urgency, size | delayed, treds, invoice, bank_wc | — |
| rc-consumer/partial/Patna | en | My customers haven't paid me and I need cash. | receivables | overdue, size, urgency, buyer_type | delayed, bank_wc | — |
| rc-hi/partial/Guwahati | hi | मेरे ग्राहक ने भुगतान नहीं किया है और मुझे पैसों की ज़रूरत है। | receivables | overdue, size, urgency, buyer_type | treds, delayed, invoice, bank_wc | — |
| mk-online/partial/Pune | en | I make handmade soaps in Pune and want to sell online to more custo… | market | size, applicant | team, gem, marketing | — |
| mk-export/partial/Mumbai | en | We want to export our textiles abroad and meet international buyers. | export | — | intl, zed | — |
| q-cert/partial/Surat | en | We need a quality certification like ZED for our unit in Surat. | quality | — | zed, lean | — |
| q-lean/partial/Jaipur | en | I want to improve productivity and reduce waste in my factory. | circular, productivity | amount, size | lean, spice, bank_term, zed | — |
| sk-train/partial/Lucknow | en | I want to learn business skills before I start. | startup, training | amount, applicant, urgency | esdp, standup, pmegp, bank_term | — |
| eq-investor/partial/Chennai | en | We are a growing company and want to bring in an investor for equity. | expansion, equity | amount, green_tech, urgency | bank_term, fof, mudra, nbfc | — |
| reg-udyam/partial/Kolkata | en | I need money to grow my business but I do not have Udyam registration. | expansion | amount, green_tech | mudra, bank_term, nbfc | — |
| vague-1/partial/Indore | en | I'm not sure what support is right for my business. Help me figure … | — | — | — | — |
| vague-hi/partial/Patna | hi | मुझे नहीं पता मेरे व्यवसाय के लिए कौन-सी मदद सही है। | — | — | — | — |
| money-only/partial/Guwahati | en | I need money. | — | — | — | — |
