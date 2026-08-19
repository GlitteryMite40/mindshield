# MindShield AI — Engineering Notes & Assumptions

## Assumptions / Deviations from Spec

### Model ID
- **Spec mentioned**: `gemini-3.1-flash-lite` and `gemini-3.5-flash`
- **Actual model used**: `gemini-2.0-flash-lite` (default)
- **Reason**: As of the build date (August 2025), `gemini-3.1-flash-lite` and `gemini-3.5-flash` are not publicly available model IDs in the Gemini API. `gemini-2.0-flash-lite` is the current Flash-tier model optimized for fast, cheap structured output. The model is configurable via `GEMINI_MODEL` env var, so it can be changed trivially when newer models become available.

### Single conversation per session
- **Assumption**: The demo uses a single hardcoded `conversationId` (`mindshield-demo-conv-1`). This is appropriate for a two-user demo in one browser tab.
- **Future work**: Multi-conversation support would require a conversation-selection UI and per-conversation WebSocket routing.

### Two WebSocket connections per tab
- **Decision**: App.tsx creates two WebSocket connections — one for `userA`, one for `userB` — even though both are in the same browser tab.
- **Reason**: This ensures the server-side recipient-only routing (Gap 7) is architecturally correct. Both WS connections behave exactly as they would in a real two-device scenario. If the app were deployed to two actual devices, zero server-side changes would be needed.

### Demo script placement
- **Decision**: Demo scripts are defined only on the client side (`client/src/demo-scripts.ts`). The server doesn't know about demo scripts.
- **Reason**: Demo scripts contain only raw message data. Since Step Forward sends through the real WebSocket pipeline, no server-side knowledge of the script is needed. This keeps the server stateless w.r.t. demos.

### `reciprocityRatio` tracking
- **Current state**: `reciprocityRatio` is tracked in the baseline schema but currently defaults to 1.0 and is not updated per-message.
- **Reason**: Tracking sender counts in the baseline requires storing a sender-window history, which adds complexity. The LLM prompt receives full conversation history and can detect imbalanced reciprocity from the message log directly.
- **Future work**: Maintain a `Map<Sender, number>` of recent-window message counts and compute ratio properly.

### `@types/sentiment` package
- **Issue**: The `sentiment` npm package may not have a separate `@types/sentiment` package that installs cleanly.
- **Mitigation**: If type errors occur, a `sentiment.d.ts` declaration file can be added:
  ```typescript
  declare module 'sentiment' {
    interface SentimentResult { score: number; comparative: number; }
    export default class Sentiment {
      analyze(phrase: string): SentimentResult;
    }
  }
  ```

### Vite proxy for WebSocket
- **Decision**: WebSocket connections go directly to `ws://localhost:3001` rather than through the Vite dev proxy.
- **Reason**: Vite's WebSocket proxy can interfere with the app's own WebSocket HMR connection and requires extra configuration to distinguish. Connecting directly is simpler and sufficient for a local demo. In production, a reverse proxy (nginx, Caddy) would handle WS routing.

### Layer 3 "non-dismissible" interpretation
- **Implementation**: Layer 3 banners require clicking "I Understand & Continue" to collapse. They do not block message delivery or any other UI interaction — only the banner itself requires acknowledgment.
- **Reason**: The spec says "never be dismissible without acknowledgment". This is implemented as a per-banner acknowledgment state in the RiskBadge component.

### Help Me Respond — sender identification
- **Implementation**: The `POST /api/respond` endpoint does not receive the `viewerRole` parameter. The draft is generated from the risk signal and conversation history without knowing which user is replying.
- **Reason**: The draft content doesn't change based on which user is the viewer — it's always a response to the flagged message. The `viewerRole` is used only for the "Send as User X" button label in the frontend.

---

## Explicitly Out of Scope (not implemented)

Per spec §9, the following are intentionally absent:

- **Grooming-risk detection** — A single disabled stub UI button is present in DemoControls. No detection logic, no test content, no LLM prompts related to this.
- **Intimate-image coercion detection** — Same as above. No implementation, no stubs beyond the shared future-capability button.
- **Real WhatsApp/Instagram integration** — This is a standalone simulated chat only.
- **Persistent database** — All state is in-memory. This is intentional per the "minimal retention" privacy principle. A real deployment would use on-device encrypted storage.
- **Authentication** — No auth system. Two named local sessions only.
- **Parental controls** — Not implemented, not planned.
- **On-device inference** — All AI inference is server-side via the Gemini API. On-device models (e.g., Gemma via MediaPipe) are the target for a privacy-first production version.

---

## Future Work (non-prototype version)

### Privacy & Data
- [ ] On-device inference (Gemma/MediaPipe) so conversation data never leaves the device
- [ ] End-to-end encrypted local storage for conversation logs (with configurable retention limits)
- [ ] Granular user consent flows for what data is used for analysis
- [ ] Option to completely disable AI analysis per-conversation or per-contact

### Technical
- [ ] Persistent conversation store (SQLite or IndexedDB client-side)
- [ ] Real authentication with session tokens
- [ ] Multi-conversation support with conversation switching UI
- [ ] Proper `reciprocityRatio` tracking in baseline
- [ ] Calibrated confidence scores (model output is not calibrated; Platt scaling or isotonic regression would help)
- [ ] WebSocket reconnect with exponential backoff
- [ ] Production reverse proxy configuration (nginx/Caddy) for WS routing
- [ ] Rate-limit handling with a queue/retry mechanism for high-volume use
- [ ] Unit tests for `baselineTracker.shouldCallLLM()` and `llmProvider` fallback paths

### Product
- [ ] Real messaging platform integration (WhatsApp Business API, Signal protocol)
- [ ] Mobile app (React Native or Flutter) for actual device deployment
- [ ] Grooming / intimate-image-coercion detection (requires specialist trauma-informed design review before implementation — DO NOT prototype without that process)
- [ ] Offline mode with cached analysis for previously seen patterns
- [ ] User-configurable sensitivity thresholds
- [ ] Accessibility review (screen reader support for risk badges)

---

## Build Date & Environment

- Built: August 2025
- Node.js target: ≥ 18.x
- TypeScript: 5.4.x
- Gemini SDK: `@google/genai` ^1.3.0
- Default model: `gemini-2.0-flash-lite`
