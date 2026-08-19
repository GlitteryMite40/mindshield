/**
 * useWebSocket.ts
 *
 * Custom hook managing a single WebSocket connection for one user role.
 * App.tsx creates two instances — one for 'userA' and one for 'userB'.
 *
 * Design notes:
 * - Each role gets its own WS connection so the server's recipient-only
 *   routing (Gap 7) is architecturally correct, not just a client-side filter.
 * - Callbacks are stored in a ref so they never need to be in the dep array
 *   (avoids unnecessary reconnects).
 * - Reconnection is not implemented for the demo (single-session assumption).
 */

import { useEffect, useRef, useCallback } from 'react';
import { Message, RiskSignal, Sender, WSServerEvent } from '../types';

const WS_URL = 'ws://localhost:3001/ws';

export interface WebSocketCallbacks {
  onMessage: (message: Message) => void;
  onAnalyzing: (messageId: string) => void;
  onSignal: (messageId: string, signal: RiskSignal) => void;
  onAnalysisComplete: (messageId: string) => void;
}

export function useWebSocket(role: Sender, callbacks: WebSocketCallbacks) {
  const wsRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef(callbacks);

  // Keep the callbacks ref up-to-date without triggering reconnects
  callbacksRef.current = callbacks;

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}?role=${role}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[WS:${role}] Connected`);
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as WSServerEvent;
        const cb = callbacksRef.current;

        switch (data.type) {
          case 'message':
            cb.onMessage(data.payload);
            break;
          case 'analyzing':
            cb.onAnalyzing(data.payload.messageId);
            break;
          case 'risk_signal':
            cb.onSignal(data.payload.messageId, data.payload.signal);
            break;
          case 'analysis_complete':
            cb.onAnalysisComplete(data.payload.messageId);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error(`[WS:${role}] Parse error:`, err);
      }
    };

    ws.onclose = (event) => {
      console.log(`[WS:${role}] Disconnected (code: ${event.code})`);
    };

    ws.onerror = (err) => {
      console.error(`[WS:${role}] Error:`, err);
    };

    return () => {
      ws.close();
    };
  }, [role]); // Only reconnect if role changes (never in practice for this demo)

  /** Send a message through this user's WebSocket connection. */
  const sendMessage = useCallback(
    (conversationId: string, sender: Sender, text: string) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({ type: 'send_message', conversationId, sender, text })
        );
      } else {
        console.warn(`[WS:${role}] Cannot send — socket not open`);
      }
    },
    [role]
  );

  return { sendMessage };
}
