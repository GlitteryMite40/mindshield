/**
 * ChatPane.tsx
 *
 * One simulated phone/chat window for a single user role.
 * App.tsx renders two of these side-by-side.
 */

import { useEffect, useRef, useState } from 'react';
import { Message, RiskSignal, Sender } from '../types';
import { MessageBubble } from './MessageBubble';
import { DemoControls } from './DemoControls';

interface ChatPaneProps {
  viewerRole: Sender;
  messages: Message[];
  signals: Record<string, RiskSignal>;
  analyzing: Set<string>;
  conversationId: string;
  activeDemoId: string | null;
  demoStep: number;
  onSend: (text: string) => void;
  onSelectDemo: (id: string) => void;
  onDemoStep: () => void;
  onDemoReset: () => void;
}

const USER_LABELS: Record<Sender, string> = {
  userA: 'User A',
  userB: 'User B',
};

const USER_AVATARS: Record<Sender, string> = {
  userA: '👤',
  userB: '👥',
};

export function ChatPane({
  viewerRole,
  messages,
  signals,
  analyzing,
  conversationId,
  activeDemoId,
  demoStep,
  onSend,
  onSelectDemo,
  onDemoStep,
  onDemoReset,
}: ChatPaneProps) {
  const [inputText, setInputText] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message — block:'nearest' prevents page-level scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [messages, signals, analyzing]);


  function handleSend() {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInputText('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Check for any active Layer 3 signals in this conversation (recipient side)
  const hasUnacknowledgedLayer3 = messages.some(
    (m) =>
      m.sender !== viewerRole &&
      signals[m.id]?.layer === 3 &&
      signals[m.id]?.risk_level !== 'none'
  );

  return (
    <div className={`chat-pane chat-pane--${viewerRole}`}>
      {/* ── Phone status bar ── */}
      <div className="chat-pane__statusbar">
        <span className="chat-pane__time">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <div className="chat-pane__signal-icons">
          <span>●●●</span>
          <span>WiFi</span>
        </div>
      </div>

      {/* ── Chat header ── */}
      <div className="chat-pane__header">
        <div className="chat-pane__avatar">{USER_AVATARS[viewerRole]}</div>
        <div className="chat-pane__header-info">
          <h2 className="chat-pane__name">{USER_LABELS[viewerRole]}</h2>
          <p className="chat-pane__subtitle">Personal view · MindShield active</p>
        </div>
        <div className="chat-pane__shield-badge">🛡️</div>
      </div>

      {/* ── Layer 3 top banner (persistent, shown above messages) ── */}
      {hasUnacknowledgedLayer3 && (
        <div className="chat-pane__layer3-topbar">
          🚨 A serious safety concern has been flagged. See below.
        </div>
      )}

      {/* ── Message list ── */}
      <div className="chat-pane__messages">
        {messages.length === 0 && (
          <div className="chat-pane__empty">
            <span className="chat-pane__empty-icon">🛡️</span>
            <p>MindShield AI is active.</p>
            <p>Start typing or load a demo scenario.</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            viewerRole={viewerRole}
            riskSignal={signals[msg.id]}
            isAnalyzing={analyzing.has(msg.id)}
            conversationId={conversationId}
            onSend={onSend}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="chat-pane__input-area">
        <textarea
          className="chat-pane__input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message as ${USER_LABELS[viewerRole]}… (Enter to send)`}
          rows={2}
        />
        <button
          className="chat-pane__send-btn"
          onClick={handleSend}
          disabled={!inputText.trim()}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>

      {/* ── Demo controls toggle ── */}
      <div className="chat-pane__demo-toggle">
        <button
          className={`chat-pane__demo-toggle-btn ${showDemo ? 'active' : ''}`}
          onClick={() => setShowDemo((v) => !v)}
        >
          🎬 Demo Scenarios {showDemo ? '▲' : '▼'}
        </button>
      </div>

      {showDemo && (
        <DemoControls
          activeDemoId={activeDemoId}
          demoStep={demoStep}
          onSelectDemo={onSelectDemo}
          onStep={onDemoStep}
          onReset={onDemoReset}
        />
      )}
    </div>
  );
}
