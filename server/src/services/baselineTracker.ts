/**
 * baselineTracker.ts
 *
 * Maintains a per-conversation ConversationBaseline using only local computation
 * (the `sentiment` npm package) — no LLM calls. Also implements the trigger
 * logic that decides whether to call the LLM for a full contextual read.
 *
 * Alert-fatigue control: most ordinary messages MUST NOT trigger an LLM call.
 * The LLM is invoked only when meaningful signals are present.
 */

import Sentiment from 'sentiment';
import { ConversationBaseline, Message, Sender } from '../models/types';

const sentimentAnalyzer = new Sentiment();
const baselines = new Map<string, ConversationBaseline>();

// ─── High-signal trigger phrases ──────────────────────────────────────────────
// Used ONLY to decide whether to invoke the LLM. Never used as the verdict.
// Keep this list short — false positives here cost an API call, not a user warning.
const TRIGGER_PATTERNS: RegExp[] = [
  /\botp\b/i,
  /\bpassword\b/i,
  /send.{0,20}(money|cash|upi|wire|transfer)/i,
  /account.{0,25}(clos|suspend|lock|verif)/i,
  /verif.{0,30}(account|identity|payment)/i,
  /if you (really )?(cared?|loved?|trusted?) me/i,
  /after everything i'?ve? done for you/i,
  /gift.?card/i,
  /wire.?transfer/i,
  /(credit|debit) card.{0,20}(number|detail|cvv)/i,
  /your (job|position|role).{0,20}(at risk|safe|depend)/i,
  /unpaid (overtime|hours|work)/i,
  /share.{0,20}(code|otp|pin)/i,
  /click.{0,30}link.{0,20}(now|immediately|urgent)/i,
  /you (never|always|don'?t).{0,25}(care|listen|help)/i,
];

// ─── Math helpers ─────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getBaseline(conversationId: string): ConversationBaseline {
  return (
    baselines.get(conversationId) ?? {
      conversationId,
      messageCount: 0,
      avgMessageLength: 0,
      avgSentiment: 0,
      reciprocityRatio: 1,
      recentSentiments: [],
    }
  );
}

/** Update the baseline with a new message using only local computation. */
export function updateBaseline(message: Message): void {
  const baseline = getBaseline(message.conversationId);

  const score = sentimentAnalyzer.analyze(message.text);
  // .comparative is score / word-count — a rough -1..1 normalized value
  const normalized = Math.max(-1, Math.min(1, score.comparative));

  const n = baseline.messageCount;
  baseline.messageCount = n + 1;
  baseline.avgMessageLength =
    (baseline.avgMessageLength * n + message.text.length) / (n + 1);
  baseline.avgSentiment =
    (baseline.avgSentiment * n + normalized) / (n + 1);

  // Sliding window of last 20 sentiments
  baseline.recentSentiments = [
    ...baseline.recentSentiments.slice(-19),
    normalized,
  ];

  // Simple reciprocity: count A vs B messages in the last 10
  // (tracked implicitly via avgSentiment — full reciprocity tracking
  //  would require storing sender history; approximated here)
  baseline.reciprocityRatio = 1; // TODO: track sender window for v2

  baselines.set(message.conversationId, baseline);
}

/**
 * Decide whether to invoke the LLM for a full contextual read.
 * Returns true only when a meaningful signal is present.
 * Most ordinary messages return false — this is the alert-fatigue control.
 */
export function shouldCallLLM(message: Message, baseline: ConversationBaseline): boolean {
  // 1. Always analyze the first 3 messages to establish a baseline read
  if (baseline.messageCount <= 3) return true;

  // 2. Trigger phrase check (forces LLM, never used as verdict)
  if (TRIGGER_PATTERNS.some((re) => re.test(message.text))) return true;

  // 3. Sentiment deviation — only check once we have a meaningful window
  const sentiments = baseline.recentSentiments;
  if (sentiments.length >= 5) {
    const newScore = sentimentAnalyzer.analyze(message.text).comparative;
    const normalized = Math.max(-1, Math.min(1, newScore));
    const sd = stddev(sentiments);
    const avg = mean(sentiments);
    // Minimum threshold prevents triggering on tiny numeric noise in neutral text
    const threshold = Math.max(sd * 1.5, 0.25);
    if (Math.abs(normalized - avg) > threshold) return true;
  }

  return false;
}

export function clearBaseline(conversationId: string): void {
  baselines.delete(conversationId);
}
