/**
 * HelpMeRespond.tsx
 *
 * Modal for the "Help Me Respond" feature.
 * Fetches an AI-drafted reply via POST /api/respond, shows it in an editable
 * textarea. The user MUST click "Send Reply" to send — never auto-sent.
 */

import { useState, useEffect } from 'react';
import { RiskSignal, Sender } from '../types';

interface HelpMeRespondProps {
  isOpen: boolean;
  messageId: string;
  conversationId: string;
  viewerRole: Sender;
  riskSignal: RiskSignal;
  onSend: (text: string) => void;
  onClose: () => void;
}

export function HelpMeRespond({
  isOpen,
  messageId,
  conversationId,
  viewerRole,
  riskSignal,
  onSend,
  onClose,
}: HelpMeRespondProps) {
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch draft when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setDraft('');
    setError(null);
    setLoading(true);

    fetch('/api/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, messageId }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<{ draft: string }>;
      })
      .then(({ draft }) => setDraft(draft))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, messageId, conversationId]);

  if (!isOpen) return null;

  function handleSend() {
    if (!draft.trim()) return;
    onSend(draft.trim());
    onClose();
  }

  const userLabel = viewerRole === 'userA' ? 'User A' : 'User B';

  return (
    <div className="hmr-overlay" onClick={onClose}>
      <div className="hmr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hmr-header">
          <div className="hmr-header__title">
            <span className="hmr-header__icon">💬</span>
            <span>Help Me Respond</span>
          </div>
          <button className="hmr-header__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="hmr-risk-summary">
          <span className={`hmr-risk-pill hmr-risk-pill--${riskSignal.risk_level}`}>
            {riskSignal.risk_level.toUpperCase()}
          </span>
          {riskSignal.category && (
            <span className="hmr-risk-category">
              {riskSignal.category.replace(/_/g, ' ')}
            </span>
          )}
          <p className="hmr-risk-explanation">{riskSignal.explanation}</p>
        </div>

        <div className="hmr-body">
          {loading && (
            <div className="hmr-loading">
              <div className="hmr-spinner" />
              <span>Drafting a calm response…</span>
            </div>
          )}

          {error && (
            <div className="hmr-error">
              ⚠️ Could not generate draft: {error}
              <br />
              <small>You can still type your own response below.</small>
            </div>
          )}

          {!loading && (
            <>
              <label className="hmr-label" htmlFor="hmr-textarea">
                Draft reply for {userLabel} — edit freely before sending:
              </label>
              <textarea
                id="hmr-textarea"
                className="hmr-textarea"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your response here…"
                rows={5}
                autoFocus
              />
            </>
          )}
        </div>

        <div className="hmr-footer">
          <button className="hmr-btn hmr-btn--cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="hmr-btn hmr-btn--send"
            onClick={handleSend}
            disabled={loading || !draft.trim()}
          >
            Send as {userLabel}
          </button>
        </div>

        <p className="hmr-note">
          This draft is AI-generated. Review it carefully — you are always in control of what you send.
        </p>
      </div>
    </div>
  );
}
