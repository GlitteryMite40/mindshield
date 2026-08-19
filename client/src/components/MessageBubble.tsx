/**
 * MessageBubble.tsx
 *
 * Renders a single message bubble. Handles:
 * - Alignment (sent messages right, received left) based on viewerRole
 * - Animated "analyzing" pulsing dot (recipient side only — Gap 2)
 * - RiskBadge rendering (recipient side only — Gap 2)
 * - HelpMeRespond modal trigger
 */

import { useState } from 'react';
import { Message, RiskSignal, Sender } from '../types';
import { RiskBadge } from './RiskBadge';
import { HelpMeRespond } from './HelpMeRespond';

interface MessageBubbleProps {
  message: Message;
  /** The role of the person viewing this pane. */
  viewerRole: Sender;
  riskSignal?: RiskSignal;
  isAnalyzing?: boolean;
  conversationId: string;
  onSend: (text: string) => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({
  message,
  viewerRole,
  riskSignal,
  isAnalyzing = false,
  conversationId,
  onSend,
}: MessageBubbleProps) {
  const [hmrOpen, setHmrOpen] = useState(false);

  // Gap 2: "sent by me" vs "received from other"
  const isSentByViewer = message.sender === viewerRole;
  // Gap 2: Only show analysis UI (pulsing dot + badge) when viewer is the RECIPIENT
  const isRecipient = !isSentByViewer;

  return (
    <div
      className={`bubble-wrapper ${isSentByViewer ? 'bubble-wrapper--sent' : 'bubble-wrapper--received'}`}
    >
      <div className={`bubble ${isSentByViewer ? 'bubble--sent' : 'bubble--received'}`}>
        <p className="bubble__text">{message.text}</p>
        <span className="bubble__time">{formatTime(message.timestamp)}</span>
      </div>

      {/* ── Analysis UI — recipient only (Gap 2) ── */}
      {isRecipient && (
        <>
          {/* Pulsing "analyzing" indicator */}
          {isAnalyzing && !riskSignal && (
            <div className="bubble-analyzing" aria-label="Analyzing message…">
              <span className="bubble-analyzing__dot" />
              <span className="bubble-analyzing__dot" />
              <span className="bubble-analyzing__dot" />
              <span className="bubble-analyzing__label">Analyzing…</span>
            </div>
          )}

          {/* Risk badge (only for non-none signals) */}
          {riskSignal && riskSignal.risk_level !== 'none' && (
            <RiskBadge
              signal={riskSignal}
              messageId={message.id}
              conversationId={conversationId}
              onHelpMeRespond={() => setHmrOpen(true)}
            />
          )}
        </>
      )}

      {/* Help Me Respond modal */}
      {riskSignal && (
        <HelpMeRespond
          isOpen={hmrOpen}
          messageId={message.id}
          conversationId={conversationId}
          viewerRole={viewerRole}
          riskSignal={riskSignal}
          onSend={onSend}
          onClose={() => setHmrOpen(false)}
        />
      )}
    </div>
  );
}
