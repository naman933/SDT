# MSME Navigator

> Tell us what's happening in your business. We'll help you figure out what to explore next.

MSME Navigator helps small-business owners in India find financial and support routes that fit their situation, without needing to know any scheme name. The owner describes their situation in plain words, typed or spoken, in English, Hindi or Hinglish. The app understands it, asks at most 4 follow-up questions, and shows government schemes alongside bank and NBFC options. For each route it explains why it surfaced, what is known, what still needs checking, and the official next step. It then gives the owner a route-specific checklist, drafts and a follow-up trail.

It is built to the project's design spec; see [docs/SPEC_COVERAGE.md](docs/SPEC_COVERAGE.md) for what is covered and what is not.

This is a prototype built on a **controlled corpus**, not a list of every scheme in India. Its results are **decision support, not approval**.

## The owner's journey

Five steps, shown as a bar at the top of every screen:

1. **Tell us:** press and speak, tap a picture tile, or type. The screen says: free, no documents, about 3 minutes.
2. **A few questions:** at most 4, one per screen. "I don't know" is always an answer. What we understood appears as chips the owner can edit, and anything we assumed is marked **?** so they can confirm it.
3. **Your options:** an **"A good place to start"** card first, then cards grouped by kind of help (loans, subsidy, unpaid bills, markets…), each labelled government or bank/NBFC and "loan — must be repaid" or "not a loan", with a 🟢/🟡 badge, the key thing to confirm, and the source date. Filters narrow the list.
4. **Get ready:** the route's own checklist with a status on every item, drafts (enquiry, project summary, one-page summary), questions to ask, and where to go.
5. **Apply & track:** the owner reports *Not applied yet / Waiting / Approved / Not approved*. "Not approved" leads to the other options.

Around the journey:

- **Route detail** (`#/route/:id`): why it appeared, fit panel (known / to confirm / hard gates / evidence), benefits and terms (only recorded values, otherwise "Check current terms"), how to apply. Actions: start checklist, compare, save, draft an enquiry, open official source.
- **Compare** (`#/compare`): routes side by side.
- **Checklist** (`#/explore/:id`): six sections (before you begin, eligibility, documents, steps, after you apply, follow-up), each item with a status and a note. Drafts: enquiry message, project summary, one-page summary.
- **Funding** (`#/funding`): grants, loans and receivables in separate lanes, plus an illustrative EMI calculator that uses the rate the owner enters.
- **Help & grievance** (`#/help`): Saathi note, official complaint route with escalation, evidence list, editable complaint draft, and a record of the date, reference and follow-up.
- **Profile** (`#/profile`): optional details with *Not sure* / *Prefer not to say*; each change shows what it did to the matches.
- **My journey** (`#/my-msme`): progress, follow-ups, source freshness, download plan or data, clear data.

Available on every screen: **Read aloud** (the browser's own voice), tap-to-explain jargon (NBFC, collateral, working capital…) and the English/हिंदी switch. **Expert view** in the footer shows the 8-dimension relevance breakdown for reviewers.

## Architecture

**Current mode: everything runs in the browser.** Understanding is rule-based, voice typing uses the browser's own speech recognition (Chrome/Edge), read-aloud uses the browser's speech synthesis, and data stays in `localStorage`. No request goes to `/api`. The serverless AI below is kept in the repo and can be switched back on with `SERVER_AI = true` in `src/config.js`.

```
Browser (Vite, vanilla JS)                    Vercel serverless (api/)
┌──────────────────────────────┐              ┌──────────────────────────────┐
│ UI (hash routes)             │  POST text   │ /api/understand              │
│   #/ → #/check → #/question  │ ───────────▶ │   Groq LLM → JSON facts      │
│   → #/results → #/explore/:id│              │   sanitised against enums    │
│   → #/my-msme                │  POST audio  │ /api/transcribe (Whisper)    │
│                              │ ───────────▶ │ /api/health                  │
│ Engine (src/engine, pure JS) │              │ GROQ_API_KEY lives here only │
│   corpus → gates → need fit  │              └──────────────────────────────┘
│   → conditions → actionability│
│   → information-value Qs     │
│ State: localStorage only     │
└──────────────────────────────┘
```

- **The AI only extracts facts from the owner's words.** It never picks schemes or decides eligibility. A transparent rules engine (`src/engine/`) does the matching, and the app falls back to rule-based understanding if the AI is unavailable.
- **Scoring (Policy Relevance Score, from the design spec):**
  1. Hard gates first: a known "not met" condition hides a route and shows the reason. An unknown never does.
  2. Routes are ranked by 8 weighted dimensions: need fit 25, business fit 15, amount 10, location/channel 10, eligibility evidence 15, readiness 10, timing 5, preference/effort 10. Unknown facts score a neutral value, never zero.
  3. Conditions are shown as met / unknown / not met. The score means "worth exploring", never an approval chance.
- **Questions:** the app asks the unanswered question whose answer would most change the top routes, and stops when no answer would change them (max 4).

```
src/config.js             SERVER_AI switch (off = browser-only)
src/engine/core.js        money formatting, fact access, need taxonomy, coverage, source dates
src/engine/corpus.js      programmes, finance route categories, enablers (with sources, support type, mechanism)
src/engine/process.js     broad process steps, before/after items, grievance channels, official contacts
src/engine/checklist.js   route-specific checklists and readiness
src/engine/questions.js   plain-language questions
src/engine/engine.js      evaluate / rank / pickQuestion / openSlots
src/engine/understand.js  rule-based parser, AI prompt + sanitiser
src/ui/views.js           render functions (state → HTML)
src/main.js               router, event delegation, voice, boot
api/                      Vercel functions (understand, transcribe, health)
tests/                    jury scenarios, parser tests, spec guardrails, 100-case audit (docs/AUDIT.md)
```

## Run locally

```bash
npm install
npm run dev                    # http://localhost:5173 — no key needed in browser-only mode
npm test                       # 166 tests: scenarios, spec guardrails, translations, 100-case audit
npm run build                  # production build to dist/
```

## Deploy to Vercel

**Option A: GitHub (recommended)**
1. Push this folder to a GitHub repository. `.env.local` is git-ignored, so the key is not pushed.
2. On vercel.com, go to **Add New → Project** and import the repo. The Vite framework is detected automatically from `vercel.json`.
3. Under **Settings → Environment Variables**, add `GROQ_API_KEY`. Optionally also add `GROQ_MODEL`, `GROQ_FALLBACK_MODEL`, `GROQ_SPEECH_MODEL` and `ALLOWED_ORIGINS` (see `.env.example`).
4. Deploy. Every push to `main` redeploys.

**Option B: CLI**
```bash
npm i -g vercel
vercel                      # first run links the project
vercel env add GROQ_API_KEY # paste the key; choose Production (and Preview if wanted)
vercel --prod
```

In browser-only mode (`SERVER_AI = false`, the current setting) no environment variables are needed; the app never calls `/api`. If you switch the server AI on, set `GROQ_API_KEY` and open `/api/health` after deploying. It should return `{"ai":true}`.

## Languages (English / हिंदी)

The **हिंदी / English** button in the header switches the whole interface, including scheme descriptions, conditions, documents and routes. The choice is remembered per browser, and Hindi is chosen by default when the browser's language is Hindi.

- `src/i18n/strings.js` holds the UI text (`en` and `hi`). Hindi-only keys cover needs, questions and labels; their English text comes from the data itself.
- `src/i18n/corpus.hi.js` holds the Hindi versions of the corpus text, keyed by the exact English string in `corpus.js`. If you edit an English string there, update this file too, or `npm test` will fail.
- The rules understand English, Hinglish and Devanagari Hindi (e.g. "8 लाख", "मशीन", "भुगतान नहीं"). The "we understood" summary is built from the facts, so it is always in the selected language.
- Voice typing uses the browser (best in Chrome or Edge) in Hindi or English. If the browser has none, the page says so and typing still works.
- The page says that the Hindi text is a translation and that the official source takes precedence.

To add a language, add a block to `strings.js` and a `corpus.<lang>.js` file, register the language in `LANGS` (`src/i18n/index.js`), and extend `tests/i18n.test.js`.

## Security & privacy

- The Groq key is only read server-side (`process.env.GROQ_API_KEY`) and is never sent to the browser.
- The `/api` routes have these protections:
  - Only same-origin calls are allowed; add more origins with `ALLOWED_ORIGINS`.
  - A best-effort limit of 20 requests per minute per IP.
  - Input size caps (2,000 characters of text, 4 MB of audio).
  - Timeouts on Groq calls.
  - AI output is validated against fixed enums before use.
- For a public launch, also:
  - set a **spend limit on the Groq account**;
  - add a **Vercel Firewall rate-limit rule** for `/api/*`;
  - rotate any key that has been shared in chat or email.
- The owner's answers are stored only in their browser (`localStorage`). In browser-only mode nothing is sent to our server. The browser's own voice typing may send audio to the browser maker (e.g. Google in Chrome); the About page says so.
- Drafts and complaints are never sent by the app: "Open in my email app" opens the owner's own email client.
- Security headers, including a strict CSP, are set in `vercel.json`.

## Updating the corpus

Each record in `src/engine/corpus.js` has `purposes`, `conditions` (each with a `test(facts)` returning `met | unknown | not_met | todo`), `route`, and `src`. Mark general practice with `basis: 'typical'`, and records whose current status is uncertain with `status: 'verify'` (these are never recommended). After any change, run `npm test`.

## Known limits

- Central programmes only; state, UT and district schemes are not yet included.
- Interface in English and Hindi only; Marathi, Kannada, Gujarati and Tamil need professional translation.
- No file upload (it needs secure server storage); document status and notes are kept instead.
- Records were recorded in Sep 2026 and are not live-verified.
- Nearby support uses a live map search, not a curated list of verified support points.
- Finance Saathi is a proposed service; the app generates a hand-off note.
- Not yet built: reading documents, proactive alerts, accounts and cross-device sync.
