/**
 * DemoControls.tsx
 *
 * Demo scenario selector and step-through controls.
 *
 * Gap 5: Contains a single disabled stub button for "future capability" —
 *   grooming/intimate-image-coercion detection. No detection logic exists.
 *
 * Gap 6: "Step Forward" sends the next script message through the real WS
 *   pipeline via the parent's onSend callback. No shortcuts or pre-baked
 *   RiskSignals are injected into the UI.
 */

import { DEMO_SCRIPTS } from '../demo-scripts';

interface DemoControlsProps {
  activeDemoId: string | null;
  demoStep: number;
  onSelectDemo: (id: string) => void;
  onStep: () => void;
  onReset: () => void;
}

export function DemoControls({
  activeDemoId,
  demoStep,
  onSelectDemo,
  onStep,
  onReset,
}: DemoControlsProps) {
  const activeScript = DEMO_SCRIPTS.find((s) => s.id === activeDemoId) ?? null;
  const isFinished = activeScript ? demoStep >= activeScript.messages.length : false;
  const nextMessage = activeScript?.messages[demoStep] ?? null;

  return (
    <div className="demo-controls">
      <div className="demo-controls__header">
        <span className="demo-controls__title">🎬 Demo Mode</span>
        {activeScript && (
          <button className="demo-controls__reset" onClick={onReset}>
            ↺ Reset
          </button>
        )}
      </div>

      {/* Scenario selector */}
      <div className="demo-controls__scenarios">
        {DEMO_SCRIPTS.map((script) => (
          <button
            key={script.id}
            className={`demo-scenario-btn ${activeDemoId === script.id ? 'demo-scenario-btn--active' : ''}`}
            onClick={() => onSelectDemo(script.id)}
            title={script.expectedOutcome}
          >
            {script.name}
          </button>
        ))}
      </div>

      {/* Active scenario info */}
      {activeScript && (
        <div className="demo-controls__info">
          <p className="demo-controls__description">{activeScript.description}</p>
          <p className="demo-controls__outcome">
            <span>Expected: </span>{activeScript.expectedOutcome}
          </p>
          <div className="demo-controls__progress">
            <div
              className="demo-controls__progress-bar"
              style={{
                width: `${(demoStep / activeScript.messages.length) * 100}%`,
              }}
            />
          </div>
          <p className="demo-controls__step-count">
            Step {demoStep} / {activeScript.messages.length}
          </p>
        </div>
      )}

      {/* Step Forward button — Gap 6: sends through real WS pipeline */}
      {activeScript && !isFinished && (
        <div className="demo-controls__step">
          {nextMessage && (
            <p className="demo-controls__next-preview">
              <span className={`demo-controls__sender demo-controls__sender--${nextMessage.sender}`}>
                {nextMessage.sender === 'userA' ? 'User A' : 'User B'}
              </span>
              {' → '}
              <em>"{nextMessage.text.slice(0, 60)}{nextMessage.text.length > 60 ? '…' : ''}"</em>
            </p>
          )}
          <button className="demo-controls__step-btn" onClick={onStep}>
            Step Forward →
          </button>
        </div>
      )}

      {isFinished && activeScript && (
        <div className="demo-controls__finished">
          ✅ Demo complete — click ↺ Reset to start over
        </div>
      )}

      {/* ── Gap 5: Out-of-scope disabled stub ─────────────────────────────────
           This button has NO detection logic behind it.
           It exists solely to communicate "future capability" per spec §9.
           Do not add any click handler or detection code here.        ──── */}
      <div className="demo-controls__future">
        <button
          className="demo-controls__future-btn"
          disabled
          title="Planned for a future release — not implemented in this prototype. Grooming and intimate-image-coercion detection requires specialist design and trauma-informed review before deployment."
        >
          🔒 Grooming &amp; Image Coercion Detection{' '}
          <span className="demo-controls__future-badge">Future Capability</span>
        </button>
      </div>
    </div>
  );
}
