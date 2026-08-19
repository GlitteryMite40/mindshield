# 🛡️ MindShield AI

**Personal Digital Safety Companion** — IDEAS 5.0 prototype

A real-time chat demo where every message is analyzed by an AI safety engine that detects manipulation, coercion, and scam patterns, and shows contextual, explainable warnings to the recipient.

> **Core philosophy:** Do not control the user — help them understand what's happening and decide for themselves.

---

## Features

- **Real-time manipulation & scam detection** — powered by Gemini AI, analyzes each message in full conversation context
- **Personalized baseline tracking** — learns the conversation's normal tone; flags meaningful deviations, not just keywords
- **Help Me Respond** — on any flagged message, request an AI-drafted calm, boundary-setting reply (editable before sending, never auto-sent)
- **Two-phone demo mode** — side-by-side User A / User B panes in one browser tab; five canned demo scenarios included

---

## Quick Start

### 1. Get a Gemini API Key

1. Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with a Google account
3. Click **Create API key**
4. Copy the key

### 2. Configure the environment

```bash
# In the mindshield/ directory:
cp .env.example .env
```

Open `.env` and set:

```
GEMINI_API_KEY=your_key_here
```

### 3. Install and run

```bash
# From the mindshield/ directory:
npm run install:all   # installs root + server + client dependencies
npm run dev           # starts both server (port 3001) and client (port 5173)
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```
mindshield/
├── .env.example          # Environment variable template
├── package.json          # Root — starts both services with concurrently
├── README.md
├── NOTES.md
│
├── server/               # Node.js + Express + WebSocket backend
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # Entry point, fail-fast API key check
│       ├── wsHandler.ts          # WebSocket pipeline (message → analysis → signal)
│       ├── models/
│       │   └── types.ts          # Domain types: Message, RiskSignal, Baseline
│       ├── services/
│       │   ├── llmProvider.ts    # All Gemini API calls (single module)
│       │   ├── baselineTracker.ts# Local sentiment + LLM trigger logic
│       │   └── conversationStore.ts # In-memory message + signal store
│       └── routes/
│           └── api.ts            # POST /api/respond, GET /api/health
│
└── client/               # React + Vite + TypeScript frontend
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx               # Root: dual WS, shared state, layout
        ├── types.ts              # Client-side TypeScript types
        ├── demo-scripts.ts       # 5 demo scenarios (raw messages only)
        ├── hooks/
        │   └── useWebSocket.ts   # WS hook (one instance per user role)
        ├── components/
        │   ├── ChatPane.tsx      # Simulated phone UI
        │   ├── MessageBubble.tsx # Bubble + analysis indicator + badge
        │   ├── RiskBadge.tsx     # Expandable risk card + Layer 3 banner
        │   ├── HelpMeRespond.tsx # Draft reply modal
        │   └── DemoControls.tsx  # Scenario selector + step-forward
        └── styles/
            ├── global.css        # Design system, tokens, layout
            ├── chat.css          # Pane, bubbles, input, demo controls
            └── risk.css          # Risk badge, Layer 3 banner
```

---

## Demo Scenarios

Load via the **🎬 Demo Scenarios** toggle in either chat pane. Click **Step Forward →** to inject each message through the real pipeline (real Gemini calls).

| Scenario | Expected Outcome |
|---|---|
| 😄 Friends Joking | No warnings at any point |
| ⚠️ Manipulative Request | Layer 2 — emotional_pressure / guilt |
| 🎣 Phishing Scam | Layer 2–3 — phishing, high confidence |
| 💼 Escalating Workplace Pressure | Low/none early, escalation flag by 3rd–4th message |
| 🔄 Shifting Friendship | Baseline deviation triggers a check-in note |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | **Yes** | — | Your Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.0-flash-lite` | Gemini model ID to use |
| `PORT` | No | `3001` | Server port |

---

## Architecture Notes

- **Two WebSocket connections** per browser tab (one for User A, one for User B) so server-side recipient-only routing is architecturally correct, not just a client-side filter.
- **In-memory storage only** — no database, no persistence. Refreshing the page clears everything (intentional — privacy-first design).
- **Gemini is server-side only** — the API key never reaches the browser bundle.
- **LLM not called on every message** — a local sentiment analysis and trigger-phrase check gates LLM calls. Most ordinary messages skip the LLM entirely.

---

## Limitations (prototype)

- Free-tier Gemini rate limits (5–15 req/min) apply. Rate-limit hits are handled gracefully (message still delivers, analysis skipped).
- No authentication — two named local sessions only.
- Conversation state resets on server restart.
- See `NOTES.md` for a full list of future-work items.
