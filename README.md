# MSME Navigator

> Tell us what's happening in your business. We'll help you figure out what to explore next.

MSME Navigator helps small-business owners in India find financial and support routes that fit their situation, without needing to know any scheme name. The owner describes their situation in plain words (any language, typed or spoken). The app understands it, asks at most 4 follow-up questions, and shows government schemes alongside bank and NBFC options. For each route it explains why it surfaced, what is known, what still needs checking, and the official next step.

This is a prototype built on a **controlled corpus**, not a list of every scheme in India. Its results are **decision support, not approval**.

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
npm test                       # 25 scenario + guardrail tests
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
- Not yet built: reading documents, proactive alerts, and a Hindi interface. Spoken and typed input already works in any language.
