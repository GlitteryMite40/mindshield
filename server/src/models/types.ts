// ─── Core domain types ────────────────────────────────────────────────────────

export type Sender = 'userA' | 'userB';
export type RiskLevel = 'none' | 'low' | 'medium' | 'high';

export interface Message {
  id: string;
  conversationId: string;
  sender: Sender;
  text: string;
  timestamp: number;
}

export interface RiskSignal {
  risk_level: RiskLevel;
  /** e.g. "emotional_pressure", "phishing", "guilt", "isolation_language",
   *  "conditional_affection", "escalation" — null when risk_level is 'none' */
  category: string | null;
  /** 0–1, model-reported. NOT a calibrated probability. Always display with disclaimer. */
  confidence: number;
  /** Short descriptive tags, e.g. ["guilt", "urgency"] */
  signals: string[];
  /** One or two plain-language sentences explaining the pattern. */
  explanation: string;
  recommended_action: string | null;
  /** 1 = Awareness, 2 = Intervention, 3 = Safety */
  layer: 1 | 2 | 3;
}

export interface ConversationBaseline {
  conversationId: string;
  messageCount: number;
  avgMessageLength: number;
  /** Rolling average sentiment, -1..1 */
  avgSentiment: number;
  /** Messages from A vs B ratio over recent window */
  reciprocityRatio: number;
  /** Sliding window of last ~20 message sentiment scores */
  recentSentiments: number[];
}

// ─── WebSocket protocol types ─────────────────────────────────────────────────

export interface WSSendMessage {
  type: 'send_message';
  conversationId: string;
  sender: Sender;
  text: string;
}

export type WSClientEvent = WSSendMessage;

export interface WSMessageEvent {
  type: 'message';
  payload: Message;
}

export interface WSAnalyzingEvent {
  type: 'analyzing';
  payload: { messageId: string };
}

export interface WSRiskSignalEvent {
  type: 'risk_signal';
  payload: { messageId: string; signal: RiskSignal };
}

export interface WSAnalysisCompleteEvent {
  type: 'analysis_complete';
  payload: { messageId: string };
}

export type WSServerEvent =
  | WSMessageEvent
  | WSAnalyzingEvent
  | WSRiskSignalEvent
  | WSAnalysisCompleteEvent;
