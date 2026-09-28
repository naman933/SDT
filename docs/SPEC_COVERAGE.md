# Design spec coverage

This file maps the *MSME Navigator — Coding-Agent Product & Design Specification* (`Design_spec.docx`) to what the app does today.
**Done** = built and tested. **Partial** = built with a stated limit. **Not done** = deliberately left out, with the reason.

The app runs entirely in the browser: rule-based understanding, the browser's own voice typing and read-aloud, and data in `localStorage`.
The serverless AI (`/api`, Groq) is still in the repo but is switched off with `SERVER_AI = false` in `src/config.js`.

## Screens (spec §5)

| Spec screen | Where | Status |
|---|---|---|
| 1 · Need-first home | `#/` | **Done.** "What's happening in your business?" heading, a large text box, clickable example tiles, voice button with a live recording state, "I don't know" tile, "Explore support options" CTA and a trust note. If the browser has no voice typing, a message says so and typing still works. |
| 2 · We understood | `#/question`, `#/check` | **Done.** A plain summary built from the facts, editable chips, and each fact labelled *You said / We assumed / You answered*. One high-value question at a time (max 4), each with *Why we ask* and *I don't know*. "Show me what you have now" skips ahead. |
| 3 · Optional profile | `#/profile` | **Done.** 14 optional fields plus PIN, each with a reason. *Not sure* is on every field and *Prefer not to say* is on sensitive ones. Nothing asks for Aadhaar numbers, passwords or OTPs. Each change shows what it did to the matches. |
| 4 · Discovery results | `#/results` | **Done.** "Support routes that may fit your situation", how many routes were reviewed, data coverage ("Based on X of 8 profile areas") and filters (government / bank-NBFC / online / in person / quicker). Results are grouped by support type. Each card shows: government-or-bank label, support type ("Loan — must be repaid", "Market access — not money"), relevance band, why it appeared, the key thing to confirm, what's still unknown, source with checked date, and the next action. |
| 5 · Pathway detail | `#/route/:id` | **Done.** Provider, status, source and date; *Why this appeared*; a fit panel (known / to confirm / hard gates / evidence type / coverage); benefits and terms showing only recorded values, otherwise "Check current terms"; channel and broad steps. Actions: *Start checklist*, *Compare*, *Save route*, *Draft an enquiry*, *Open official source*. |
| Compare | `#/compare` | **Done.** Side-by-side table: type, verified amount, cost and repayment, time (marked as an estimate), what to check, source. |
| 6 · Route checklist | `#/explore/:id` | **Done.** Built per route from its own conditions, documents, process and grievance channel, so no two routes share a checklist (tested). Sections: Before you begin · Eligibility · Documents · Application steps · After you apply · Follow-up. Each item has a status (not started / in progress / done / not applicable) and an optional note. A readiness bar is shown with "completing it does not mean you are eligible or approved". |
| 7 · Document workspace | `#/explore/:id` → Drafts | **Partial.** Document states: not available / available / needs update / needs review / prepared, with "how to get it" and "what is this". Drafts (enquiry message, project summary, one-page summary) are built only from confirmed facts, with blanks in [brackets], a "generic outline, not an official format" warning, editing, and *Mark as prepared for review*. **No file upload:** there is no backend to store files safely, so the spec's upload option is left out. |
| 8 · Funding dashboard | `#/funding` | **Done.** Three separate lanes (grants/subsidies · loans · receivables) and never a combined total. Mechanism, verified amount, "Check current terms" for rates and fees, collateral note, and recourse for invoice finance. Summary tiles: saved routes, checklist progress, documents ready, last updated, next action. The EMI calculator uses the rate the owner enters (no default rate) and is labelled illustrative. |
| 9 · Help & grievance | `#/help` | **Done.** Finance Saathi note, then a grievance flow: what happened → official first-level channel and escalation (with sources) → evidence list → editable complaint draft → *Open in my email app* (the owner sends it) → record the date, reference number and follow-up date. Official national portals are shown with checked dates. Map search is labelled as not proof that an office is official. |
| 10 · Journey dashboard | `#/my-msme` ("My journey") | **Done.** Saved routes with readiness, follow-ups, activity, source freshness, edit profile, refresh matches (shows what changed), download plan (.txt) and data (.json), and clear data. |

## Other sections

| Spec section | Status |
|---|---|
| §2 Visual system | **Done.** Deep teal `#123B3A`, teal `#167C75`, off-white canvas, amber for caution and red only for blocking errors; 16px body; 8–12px corners; 44px tap targets (checked in the browser test). |
| §3 Navigation | **Done.** Logo/home, Help & grievance, My journey, Funding (appears after results), language switch; About the data in the footer. "Schemes" is not a nav label. |
| §6 Matching and scoring | **Done.** 8 dimensions with the spec weights (25/15/10/10/15/10/5/10). Unknown facts score neutral, never zero (tested). Hard gates are separate from the score, and a gate that appears unmet shows the condition and its source. Evidence type: official source vs general practice. Coverage line. Score changes are explained ("What changed"). Scores are shown only in *Expert view* and are labelled "relevance, not eligibility". |
| §7 Data objects and service boundaries | **Partial.** Route records carry support type, mechanism, flow, grievance channel, prep, conditions, documents, source and status (`src/engine/corpus.js`). Checklists, drafts and grievance records are stored per route. The services are plain modules (`engine/`, `process.js`, `checklist.js`) rather than swappable adapters. The server AI is behind one switch. |
| §8 Catalogue | **Partial.** 18 government programmes, 6 bank/NBFC route categories and 2 enablers, all central. Stand-Up India is flagged "verify current status". **State and district schemes are not included.** |
| §9 Loops | **Done.** Refinement (question loop plus "What changed" on profile and dashboard), per-route checklist loop, document loop (not available → how to get it → available → prepared), grievance loop (record and follow-up date). |
| §10 Microcopy | **Done.** "A good place to start" replaces "best next step". "This is a loan and must be repaid" is on every loan. "Source checked on [date] — verify before acting". Tested: no UI text says "you qualify", "pre-approved" or "best loan". |
| §11 Accessibility and language | **Partial.** Works at 360px without horizontal scroll, 44px targets, visible focus, labelled controls, live regions, status as text plus colour, input kept across language switch (all browser-tested). **The interface is English and Hindi only.** Marathi, Kannada, Gujarati and Tamil need professional translation. The app says this plainly instead of pretending, as the spec asks. |
| §12 Privacy and trust | **Done.** Guest mode only; nothing is sent to a server. Voice typing uses the browser's own speech service, and the About page says it may send audio to the browser maker. Nothing is sent or submitted without the owner acting. Download and delete controls are provided. |
| §14 Acceptance and 100-case audit | **Done.** 166 automated tests including the 100-case audit (`docs/AUDIT.md`). Browser walkthrough of all 13 screens in English and Hindi at 360, 390 and 1200px. |

## Not done, and why

- **State and district schemes, live source checks, and verified local office contacts.** These need a maintained data source. We don't invent addresses or phone numbers.
- **File upload.** It needs secure storage and consent handling on a server.
- **Accounts and cross-device sync, reminders and analytics.** The spec lists these for later phases. Guest mode comes first.
- **Interfaces in Marathi, Kannada, Gujarati and Tamil.** These need professional translation and QA.
