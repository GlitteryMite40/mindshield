/**
 * llmProvider.ts
 *
 * Single module wrapping ALL @google/genai calls.
 * No other file in the codebase should import from @google/genai directly.
 * The provider interface is intentionally minimal so it can be swapped later.
 *
 * Gap 1 — Pinned model: resolved once at module load from env var with a
 *   hard default. The SDK never chooses the model — we always specify it.
 *
 * Gap 4 — Rate-limit handling: 429 / RESOURCE_EXHAUSTED errors are caught
 *   specifically and fall back to a safe no-signal response so a rate-limit
 *   hit during a live demo never crashes the pipeline or blocks message delivery.
 */

import { GoogleGenAI } from '@google/genai';
import { ConversationBaseline, Message, RiskSignal } from '../models/types';

// ─── Model configuration & candidates ─────────────────────────────────────────
const CANDIDATE_MODELS: string[] = Array.from(
  new Set(
    [
      process.env.GEMINI_MODEL,
      'gemini-3.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.5-flash',
      'gemini-1.5-flash-8b',
    ].filter((m): m is string => Boolean(m) && m.length > 0)
  )
);

let ACTIVE_MODEL: string = CANDIDATE_MODELS[0] || 'gemini-2.0-flash';
export const MODEL_ID = ACTIVE_MODEL;

// ─── Fallback signal (returned on any error) ──────────────────────────────────
const FALLBACK_SIGNAL: RiskSignal = {
  risk_level: 'none',
  category: null,
  confidence: 0,
  signals: [],
  explanation: '',
  recommended_action: null,
  layer: 1,
};

// ─── Singleton client ─────────────────────────────────────────────────────────
let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

// ─── Structured output schema for RiskSignal ─────────────────────────────────
const RISK_SIGNAL_SCHEMA = {
  type: 'object',
  properties: {
    risk_level: {
      type: 'string',
      enum: ['none', 'low', 'medium', 'high'],
    },
    category: { type: 'string', nullable: true },
    confidence: { type: 'number' },
    signals: {
      type: 'array',
      items: { type: 'string' },
    },
    explanation: { type: 'string' },
    recommended_action: { type: 'string', nullable: true },
    layer: { type: 'number' },
  },
  required: [
    'risk_level',
    'category',
    'confidence',
    'signals',
    'explanation',
    'recommended_action',
    'layer',
  ],
};

// ─── Error classification ─────────────────────────────────────────────────────

function isRateLimitError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  );
}

function isNotFoundError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return msg.includes('404') || msg.includes('not_found') || msg.includes('not available');
}

// ─── Prompt builders ─────────────────────────────────────────────────────────

function buildAnalysisPrompt(
  message: Message,
  history: Message[],
  baseline: ConversationBaseline
): string {
  const baselineSummary = {
    messageCount: baseline.messageCount,
    avgMessageLength: Math.round(baseline.avgMessageLength),
    avgSentiment: baseline.avgSentiment.toFixed(2),
    recentSentimentWindow: baseline.recentSentiments.slice(-10).map((s) => s.toFixed(2)),
  };

  const historyLog = history.map((m) => ({
    sender: m.sender,
    text: m.text,
  }));

  return `You are the safety-analysis engine inside MindShield AI, a personal digital safety companion. Your job is to analyze ONE new message in the context of a conversation and detect potential manipulation, coercion, scam/phishing attempts, bullying/harassment, or threats — WITHOUT deciding whether a person is good or bad.

Rules:
- Judge patterns and context, not isolated words. The same phrase can be playful between friends and harmful elsewhere — use the provided conversation history and baseline to judge what's normal for THIS conversation.
- Do not diagnose the sender's mental state or character. Describe the pattern, not the person.
- Do not flag ordinary disagreement, negotiation, or venting as manipulation.
- If nothing concerning is present, return risk_level "none" and category null — this should be the majority of outputs.
- Escalate risk_level only when a pattern is repeated, escalating, or combined with a high-risk category (financial/credential requests, coercion, threats). A single mildly pressuring message is usually "low", not "medium" or "high".
- layer 1 (Awareness) = worth a subtle note, layer 2 (Intervention) = worth actively surfacing and offering help, layer 3 (Safety) = credible indicator of serious harm — for layer 3, recommended_action must point toward real-world help/support, not just "set a boundary".

Conversation baseline: ${JSON.stringify(baselineSummary)}
Recent conversation history (oldest to newest): ${JSON.stringify(historyLog)}
New message to analyze: ${JSON.stringify(message.text)}
Sender: ${message.sender}

Return ONLY a JSON object with exactly these fields: risk_level, category, confidence, signals, explanation, recommended_action, layer. No text outside the JSON.`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Helper to call Gemini generateContent trying candidate models if a 404 occurs.
 */
async function generateContentWithFallback(contents: string, responseSchema?: object) {
  const ai = getClient();
  let lastErr: unknown = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const config: { responseMimeType?: string; responseSchema?: object } = {};
      if (responseSchema) {
        config.responseMimeType = 'application/json';
        config.responseSchema = responseSchema;
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        ...(responseSchema ? { config } : {}),
      });

      if (modelName !== ACTIVE_MODEL) {
        console.log(`[MindShield] Successfully failed over to Gemini model: ${modelName}`);
        ACTIVE_MODEL = modelName;
      }
      return response;
    } catch (err) {
      lastErr = err;
      if (isNotFoundError(err)) {
        console.warn(`[MindShield] Model ${modelName} returned 404, trying next candidate model...`);
        continue;
      }
      throw err;
    }
  }

  throw lastErr;
}

/**
 * Analyze a message for manipulation/coercion/scam patterns.
 * Returns a RiskSignal — on any error (including rate limits), returns the
 * safe FALLBACK_SIGNAL so message delivery is never blocked.
 */
export async function analyzeMessage(
  message: Message,
  history: Message[],
  baseline: ConversationBaseline
): Promise<RiskSignal> {
  try {
    const prompt = buildAnalysisPrompt(message, history, baseline);
    const response = await generateContentWithFallback(prompt, RISK_SIGNAL_SCHEMA);

    const rawText = response.text;
    if (!rawText) {
      console.warn('[MindShield] Gemini returned empty response — using fallback');
      return FALLBACK_SIGNAL;
    }

    const parsed = JSON.parse(rawText) as RiskSignal;

    // Sanitise layer value — must be 1, 2, or 3
    if (![1, 2, 3].includes(parsed.layer)) parsed.layer = 1;
    // Sanitise confidence — must be 0–1
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0));

    return parsed;
  } catch (err) {
    if (isRateLimitError(err)) {
      console.warn('[MindShield] Gemini rate limit hit — skipping analysis, falling back to no-signal');
    } else {
      console.error('[MindShield] Gemini analyzeMessage error:', err);
    }
    return FALLBACK_SIGNAL;
  }
}

/**
 * Generate a calm, boundary-setting reply draft for the "Help Me Respond" feature.
 * Returns a plain string (no schema). On error returns a safe default.
 */
export async function generateResponse(
  signal: RiskSignal,
  history: Message[]
): Promise<string> {
  try {
    const historyLog = history.map((m) => ({ sender: m.sender, text: m.text }));
    const prompt = `The user received a message flagged with this analysis: ${JSON.stringify(signal)}
The recent conversation: ${JSON.stringify(historyLog)}

Draft ONE short, calm, boundary-setting or safety-oriented reply the user could send back. It should be respectful, not accusatory, and appropriate to the risk level (a "low" flag gets a gentle, low-key response; a "high"/layer-3 flag should prioritize the user's safety over politeness). Return only the drafted message text, nothing else.`;

    const response = await generateContentWithFallback(prompt);

    return response.text?.trim() ?? "I need a moment to think about this.";
  } catch (err) {
    if (isRateLimitError(err)) {
      console.warn('[MindShield] Gemini rate limit hit — cannot generate response draft');
    } else {
      console.error('[MindShield] Gemini generateResponse error:', err);
    }
    return "I need some time to think about this.";
  }
}

