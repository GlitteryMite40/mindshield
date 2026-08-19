// Mirrored from server/src/models/types.ts — kept in sync manually.
// In a real monorepo this would be a shared package.

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
  category: string | null;
  /** 0–1 model-reported — NOT a calibrated probability */
  confidence: number;
  signals: string[];
  explanation: string;
  recommended_action: string | null;
  layer: 1 | 2 | 3;
}

// ─── WebSocket event shapes (received by client) ──────────────────────────────

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
