/**
 * RiskBadge.tsx
 *
 * Inline expandable safety analysis card shown below a flagged message.
 * Gap 3: Always shows confidence disclaimer when expanded.
 * Layer 3 signals render a persistent banner instead of an inline badge.
 */

import { useState } from 'react';
import { RiskSignal } from '../types';

interface RiskBadgeProps {
  signal: RiskSignal;
  messageId: string;
  conversationId: string;
  onHelpMeRespond: () => void;
}

const RISK_LABELS: Record<string, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
};

const RISK_ICONS: Record<string, string> = {
  low: '🟡',
  medium: '🟠',
  high: '🔴',
};

const LAYER_LABELS: Record<number, string> = {
  1: 'Awareness',
  2: 'Intervention',
  3: 'Safety',
};

export function RiskBadge({ signal, onHelpMeRespond }: RiskBadgeProps) {
  const [expanded, setExpanded] = useState(signal.layer >= 2);
  const [layer3Acknowledged, setLayer3Acknowledged] = useState(false);

  if (signal.risk_level === 'none') return null;

  const isLayer3 = signal.layer === 3;
  const showLayer3Banner = isLayer3 && !layer3Acknowledged;

  return (
    <div className={`risk-badge risk-badge--${signal.risk_level}`} data-layer={signal.layer}>
      {/* ── Layer 3 persistent banner ── */}
      {showLayer3Banner && (
        <div className="risk-layer3-banner">
          <div className="risk-layer3-banner__icon">🚨</div>
          <div className="risk-layer3-banner__content">
            <p className="risk-layer3-banner__title">Safety Alert</p>
            <p className="risk-layer3-banner__body">{signal.explanation}</p>
            {signal.recommended_action && (
              <p className="risk-layer3-banner__action">
                <strong>Suggested action:</strong> {signal.recommended_action}
              </p>
            )}
          </div>
          <button
            className="risk-layer3-banner__ack"
            onClick={() => setLayer3Acknowledged(true)}
          >
            I Understand & Continue
          </button>
        </div>
      )}

      {/* ── Inline badge header ── */}
      <button
        className="risk-badge__header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="risk-badge__icon">{RISK_ICONS[signal.risk_level]}</span>
        <span className="risk-badge__label">{RISK_LABELS[signal.risk_level]}</span>
        <span className="risk-badge__layer-pill">Layer {signal.layer} — {LAYER_LABELS[signal.layer]}</span>
        {signal.category && (
          <span className="risk-badge__category">{signal.category.replace(/_/g, ' ')}</span>
        )}
        <span className="risk-badge__chevron">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="risk-badge__body">
          <p className="risk-badge__explanation">{signal.explanation}</p>

          {signal.recommended_action && signal.layer < 3 && (
            <p className="risk-badge__rec-action">
              <span className="risk-badge__rec-label">Suggested:</span>{' '}
              {signal.recommended_action}
            </p>
          )}

          {/* Confidence score + mandatory disclaimer (Gap 3) */}
          <div className="risk-badge__confidence">
            <span>Confidence: {Math.round(signal.confidence * 100)}%</span>
            <span className="risk-badge__disclaimer">
              ⚠️ Confidence scores are AI-estimated and not a certainty measure.
            </span>
          </div>

          {/* "Why am I seeing this?" signals toggle */}
          <details className="risk-badge__signals">
            <summary>Why am I seeing this?</summary>
            <ul>
              {signal.signals.map((s) => (
                <li key={s}>
                  <span className="risk-badge__signal-tag">{s}</span>
                </li>
              ))}
            </ul>
          </details>

          {/* Help Me Respond button */}
          <button className="risk-badge__help-btn" onClick={onHelpMeRespond}>
            💬 Help Me Respond
          </button>
        </div>
      )}
    </div>
  );
}
