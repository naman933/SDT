# MSME Navigator

> Tell us what's happening in your business. We'll help you figure out what to explore next.

MSME Navigator helps small-business owners in India find financial and support routes that fit their situation, without needing to know any scheme name. The owner describes their situation in plain words (any language, typed or spoken). The app understands it, asks at most 4 follow-up questions, and shows government schemes alongside bank and NBFC options. For each route it explains why it surfaced, what is known, what still needs checking, and the official next step.

This is a prototype built on a **controlled corpus**, not a list of every scheme in India. Its results are **decision support, not approval**.

## The owner's journey

Five steps, shown as a bar at the top of every screen:

1. **Tell us:** press and speak, tap a picture tile, or type. The screen says: free, no documents, about 3 minutes.
2. **A few questions:** at most 4, one per screen. "I don't know" is always an answer. What we understood appears as chips the owner can edit, and anything we assumed is marked **?** so they can confirm it.
3. **Your options:** a **"Your best next step"** card first, then short three-line cards (what it is / why for you / what to do) with a 🟢/🟡 badge. Full details are behind "See details".
4. **Get ready:** a paper checklist with *I have it / I don't have it / What is this?*, questions to confirm, where to go, and a **"Take this with you"** one-page summary to share on WhatsApp or print.
5. **Apply & track:** the owner reports *Not applied yet / Waiting / Approved / Not approved*. "Not approved" leads to the other options.

Available on every screen: **Help** (Saathi note and official portals), **Read aloud** (the browser's own voice), tap-to-explain jargon (NBFC, collateral, working capital…), and the English/हिंदी switch. **Expert view** in the footer shows the scores and matching logic for reviewers. Returning users get a *Welcome back — continue where you left off* card.

## Architecture

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
- **Scoring:**
  1. Hard gates first: a known "not met" condition hides a route and shows the reason. An unknown never does.
  2. Need fit ranks the routes.
  3. Conditions are shown as met / unknown / not met and are not added to the score.
  4. Actionability breaks ties.
- **Questions:** the app asks the unanswered question whose answer would most change the top routes, and stops when no answer would change them (max 4).

```
src/engine/core.js        money formatting, fact access, need taxonomy, enums
src/engine/corpus.js      programmes, finance route categories, enablers (with sources)
src/engine/questions.js   plain-language questions
src/engine/engine.js      evaluate / rank / pickQuestion / openSlots
src/engine/understand.js  rule-based parser, AI prompt + sanitiser
src/ui/views.js           render functions (state → HTML)
src/main.js               router, event delegation, voice, boot
api/                      Vercel functions (understand, transcribe, health)
tests/                    jury scenarios + parser/sanitiser tests
```

## Run locally

```bash
npm install
cp .env.example .env.local     # add GROQ_API_KEY (optional — rule-based mode without it)
npm run dev                    # http://localhost:5173 — /api works via the dev server
npm test                       # scenario, guardrail and translation-coverage tests
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

After deploying, open `/api/health`. It should return `{"ai":true}`.

## Languages (English / हिंदी)

The **हिंदी / English** button in the header switches the whole interface, including scheme descriptions, conditions, documents and routes. The choice is remembered per browser, and Hindi is chosen by default when the browser's language is Hindi.

- `src/i18n/strings.js` holds the UI text (`en` and `hi`). Hindi-only keys cover needs, questions and labels; their English text comes from the data itself.
- `src/i18n/corpus.hi.js` holds the Hindi versions of the corpus text, keyed by the exact English string in `corpus.js`. If you edit an English string there, update this file too, or `npm test` will fail.
- With AI on, the summary comes back in the selected language. Without AI, the rules also understand Devanagari (e.g. "8 लाख", "मशीन", "भुगतान नहीं").
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
- The owner's answers are stored only in their browser (`localStorage`). Descriptions and audio pass through the server to Groq for understanding and are not stored.
- Security headers, including a strict CSP, are set in `vercel.json`.

## Updating the corpus

Each record in `src/engine/corpus.js` has `purposes`, `conditions` (each with a `test(facts)` returning `met | unknown | not_met | todo`), `route`, and `src`. Mark general practice with `basis: 'typical'`, and records whose current status is uncertain with `status: 'verify'` (these are never recommended). After any change, run `npm test`.

## Known limits

- Central programmes only; state, UT and district schemes are not yet included.
- Records were recorded in Sep 2026 and are not live-verified.
- Nearby support uses a live map search, not a curated list of verified support points.
- Finance Saathi is a proposed service; the app generates a hand-off note.
- Not yet built: reading documents and proactive alerts. The interface is available in English and Hindi, and spoken or typed input works in any language.
