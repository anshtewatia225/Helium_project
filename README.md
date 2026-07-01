# Ecommerce Personalization Rules Engine

Classifies a mock shopper event stream into one of five behavioral states —
**Browser, Comparer, Discount Seeker, Cart Abandoner, Loyal Customer** — with
evidence, a confidence score, and a recommended nudge. A live simulator lets you
load preset sessions or add/delete events and watch the classification update in
real time.

Demo: `<vercel-url>` · Groq model: `llama-3.3-70b-versatile`

## The idea: hybrid, not an LLM wrapper

Two independent classifiers run on every session:

- **A deterministic rule engine** — features are extracted from the event stream
  (coupon attempts, funnel depth, deal-intent searches, etc.), and weighted,
  individually toggleable rules vote on a state with calibrated-by-construction
  confidence. Instant, free, and fully explainable.
- **An LLM second opinion** (Groq / Llama 3.3 70B) that reads the free-text event
  details — signal the rules are blind to.

A reconciliation layer trusts the rules when they're confident and defers to the
LLM only on ambiguous sessions. Both verdicts and their agreement/disagreement
are always surfaced, because a disagreement is itself the signal for what to
route to human review.

The two run independently (the LLM never sees the rules) so agreement means
something. I tested injecting state definitions into the prompt, measured no
accuracy lift, and removed it.

## Features

- **Live simulator** — presets + add/delete events, re-classifies instantly.
- **Signals tab** — the deterministic features the rules read against.
- **Rules tab** — every rule with its weight and fired status; toggle one and
  watch the vote tally and decision shift.
- **Timeline tab** — per-step classification showing how the shopper moved
  between states across the session.
- **Evaluation tab** — batch accuracy against labeled sessions (rules scored
  instantly, LLM on demand), including a deliberately ambiguous "Torn Shopper"
  session so results aren't a rigged 100%.
- **Recommended actions** — deterministic and templated from real session data
  (product name, failed coupon code), so they're safe to automate; the LLM's
  suggestion stays advisory.

## Project structure

```
src/
  data/presets.js       # event types, states, labeled sessions
  lib/
    features.js         # deterministic signal extraction
    rules.js            # weighted rule engine
    engine.js           # rules + LLM reconciliation, timeline
    actions.js          # templated, session-aware nudges
    classify.js         # Groq call + prompt
  components/           # UI (panels + tabs)
server/                 # Express proxy that holds the Groq key (Render)
```

## Run locally

```bash
npm install
cp .env.example .env        # add VITE_GROQ_API_KEY (leave VITE_API_BASE_URL blank)
npm run dev
```

Locally, the Vite dev server proxies `/api/groq` to Groq with your key attached
server-side, so the key never ships to the browser. Get a free key at
https://console.groq.com/keys.

## Deploy (Render backend + Vercel frontend)

The browser must never hold the Groq key, so a small proxy on Render attaches it
server-side. The static frontend on Vercel calls that proxy.

```
Browser → Vercel (static Vite app) → Render (Express proxy, holds key) → Groq
```

**Backend on Render**
1. New Web Service from this repo, **Root Directory** = `server` (or use the
   included `render.yaml`). Build command `npm install`, start command `npm start`.
2. Add env vars: `GROQ_API_KEY` (your key, no `VITE_` prefix) and `CORS_ORIGIN`
   (your Vercel URL, or `*` temporarily).
3. Deploy. The root URL should return `{"ok":true}`.

**Frontend on Vercel**
1. Import this repo (auto-detects Vite via `vercel.json`).
2. Set `VITE_API_BASE_URL` = your Render URL **plus `/api/groq`**
   (e.g. `https://your-proxy.onrender.com/api/groq`, no trailing slash).
3. Deploy.

**Close the loop** — set `CORS_ORIGIN` on Render to your exact Vercel origin and
redeploy the backend.

Notes: `VITE_API_BASE_URL` is baked in at build time, so redeploy the frontend
after changing it. Render's free tier sleeps when idle, so the first request
after a pause can take ~30s.
