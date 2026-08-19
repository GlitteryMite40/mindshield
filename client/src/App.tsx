/**
 * App.tsx — MindShield AI root component
 *
 * Creates two WebSocket connections (one per role) and maintains shared
 * conversation state. Both ChatPanes read from the same state but only
 * the recipient's WS connection receives risk_signal events (enforced server-side).
 *
 * Message deduplication: Both WS connections receive 'message' events.
 * We deduplicate by message ID so each message renders exactly once.
 */

import { useState, useCallback } from 'react';
import { Message, RiskSignal, Sender } from './types';
import { useWebSocket } from './hooks/useWebSocket';
import { ChatPane } from './components/ChatPane';
import { DEMO_SCRIPTS } from './demo-scripts';
import './styles/global.css';
import './styles/chat.css';
import './styles/risk.css';

const CONVERSATION_ID = 'mindshield-demo-conv-1';

export default function App() {
  // ── Shared conversation state ──────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [signals, setSignals] = useState<Record<string, RiskSignal>>({});
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set());

  // ── Demo state ─────────────────────────────────────────────────────────────
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);
  const [demoStep, setDemoStep] = useState(0);

  // ── Shared WS event handlers ───────────────────────────────────────────────

  const handleMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      // Deduplicate — both WS connections receive the same 'message' broadcast
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const handleAnalyzing = useCallback((messageId: string) => {
    setAnalyzing((prev) => new Set([...prev, messageId]));
  }, []);

  const handleSignal = useCallback((messageId: string, signal: RiskSignal) => {
    setSignals((prev) => ({ ...prev, [messageId]: signal }));
    setAnalyzing((prev) => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
  }, []);

  const handleAnalysisComplete = useCallback((messageId: string) => {
    setAnalyzing((prev) => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
  }, []);

  // ── Two WebSocket connections — one per role ────────────────────────────────
  const { sendMessage: sendA } = useWebSocket('userA', {
    onMessage: handleMessage,
    onAnalyzing: handleAnalyzing,
    onSignal: handleSignal,
    onAnalysisComplete: handleAnalysisComplete,
  });

  const { sendMessage: sendB } = useWebSocket('userB', {
    onMessage: handleMessage,
    onAnalyzing: handleAnalyzing,
    onSignal: handleSignal,
    onAnalysisComplete: handleAnalysisComplete,
  });

  // ── Unified send (routes to the correct WS connection) ────────────────────
  const sendMessage = useCallback(
    (sender: Sender, text: string) => {
      if (sender === 'userA') {
        sendA(CONVERSATION_ID, sender, text);
      } else {
        sendB(CONVERSATION_ID, sender, text);
      }
    },
    [sendA, sendB]
  );

  // ── Demo controls ──────────────────────────────────────────────────────────

  const handleSelectDemo = useCallback((id: string) => {
    setActiveDemoId(id);
    setDemoStep(0);
    setMessages([]);
    setSignals({});
    setAnalyzing(new Set());
  }, []);

  const handleDemoStep = useCallback(() => {
    if (!activeDemoId) return;
    const script = DEMO_SCRIPTS.find((s) => s.id === activeDemoId);
    if (!script || demoStep >= script.messages.length) return;

    const { sender, text } = script.messages[demoStep];
    // Gap 6: Send through the REAL WS pipeline — not a UI shortcut
    sendMessage(sender, text);
    setDemoStep((prev) => prev + 1);
  }, [activeDemoId, demoStep, sendMessage]);

  const handleDemoReset = useCallback(() => {
    setActiveDemoId(null);
    setDemoStep(0);
    setMessages([]);
    setSignals({});
    setAnalyzing(new Set());
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app">
      {/* ── App header ── */}
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__logo">🛡️</span>
          <div>
            <h1 className="app-header__title">MindShield AI</h1>
            <p className="app-header__subtitle">Personal Digital Safety Companion</p>
          </div>
        </div>
        <div className="app-header__tagline">
          Real-time awareness. You stay in control.
        </div>
        <div className="app-header__meta">
          <span className="app-header__badge">IDEAS 5.0 Prototype</span>
          <span className="app-header__badge app-header__badge--privacy">🔒 Privacy-first</span>
        </div>
      </header>

      {/* ── Two-phone demo layout ── */}
      <main className="app-main">
        <ChatPane
          viewerRole="userA"
          messages={messages}
          signals={signals}
          analyzing={analyzing}
          conversationId={CONVERSATION_ID}
          activeDemoId={activeDemoId}
          demoStep={demoStep}
          onSend={(text) => sendMessage('userA', text)}
          onSelectDemo={handleSelectDemo}
          onDemoStep={handleDemoStep}
          onDemoReset={handleDemoReset}
        />

        <div className="app-divider">
          <div className="app-divider__line" />
          <span className="app-divider__label">LIVE</span>
          <div className="app-divider__line" />
        </div>

        <ChatPane
          viewerRole="userB"
          messages={messages}
          signals={signals}
          analyzing={analyzing}
          conversationId={CONVERSATION_ID}
          activeDemoId={activeDemoId}
          demoStep={demoStep}
          onSend={(text) => sendMessage('userB', text)}
          onSelectDemo={handleSelectDemo}
          onDemoStep={handleDemoStep}
          onDemoReset={handleDemoReset}
        />
      </main>

      <footer className="app-footer">
        <p>MindShield AI does not store conversations after your session ends. · IDEAS 5.0 · 2025</p>
      </footer>
    </div>
  );
}
