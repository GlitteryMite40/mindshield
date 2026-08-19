import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { Message, RiskSignal, Sender } from './models/types';
import * as store from './services/conversationStore';
import * as baseline from './services/baselineTracker';
import * as llm from './services/llmProvider';

// ─── Connected client registry ────────────────────────────────────────────────
// Maps each role to its current WebSocket connection.
// Gap 7: This registry is what enables recipient-only signal delivery.
const clients = new Map<Sender, WebSocket>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeSend(ws: WebSocket, data: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(data: object): void {
  clients.forEach((ws) => safeSend(ws, data));
}

/** Send data only to the RECIPIENT of a message (not the sender). */
function sendToRecipient(senderRole: Sender, data: object): void {
  const recipientRole: Sender = senderRole === 'userA' ? 'userB' : 'userA';
  const recipientWs = clients.get(recipientRole);
  if (recipientWs) safeSend(recipientWs, data);
}

// ─── Message pipeline ─────────────────────────────────────────────────────────

async function handleSendMessage(payload: {
  conversationId: string;
  sender: Sender;
  text: string;
}): Promise<void> {
  const { conversationId, sender, text } = payload;

  // 1. Build and store the message
  const message: Message = {
    id: uuidv4(),
    conversationId,
    sender,
    text,
    timestamp: Date.now(),
  };
  store.appendMessage(message);

  // 2. Broadcast message to BOTH clients immediately — never block delivery
  broadcast({ type: 'message', payload: message });

  // 3. Update baseline with local (no-LLM) sentiment analysis
  const currentBaseline = baseline.getBaseline(conversationId);
  baseline.updateBaseline(message);
  const updatedBaseline = baseline.getBaseline(conversationId);

  // 4. Decide whether to invoke the LLM
  if (!baseline.shouldCallLLM(message, currentBaseline)) {
    // Most ordinary messages take this path — no LLM call, no latency, no warning.
    return;
  }

  // 5. Notify RECIPIENT ONLY that analysis is in progress (pulsing indicator)
  //    Gap 2 & 7: Only the recipient's socket gets this event.
  sendToRecipient(sender, { type: 'analyzing', payload: { messageId: message.id } });

  // 6. Run LLM analysis asynchronously — does not block message delivery
  (async () => {
    try {
      const history = store.getHistory(conversationId, 15);
      const signal: RiskSignal = await llm.analyzeMessage(
        message,
        history,
        updatedBaseline
      );

      // 7. Store the signal
      store.storeSignal(message.id, signal);

      if (signal.risk_level !== 'none') {
        // Gap 2 & 7: Risk signal goes to recipient ONLY — never the sender.
        sendToRecipient(sender, {
          type: 'risk_signal',
          payload: { messageId: message.id, signal },
        });
      } else {
        // Still need to clear the recipient's "analyzing" indicator
        sendToRecipient(sender, {
          type: 'analysis_complete',
          payload: { messageId: message.id },
        });
      }
    } catch (err) {
      // analyzeMessage already catches and logs errors internally.
      // This outer catch handles truly unexpected failures.
      console.error('[WS] Unexpected pipeline error:', err);
      sendToRecipient(sender, {
        type: 'analysis_complete',
        payload: { messageId: message.id },
      });
    }
  })();
}

// ─── Connection handler ───────────────────────────────────────────────────────

export function handleConnection(ws: WebSocket, req: IncomingMessage): void {
  // Extract role from query string: ws://host/ws?role=userA
  const rawUrl = req.url ?? '/';
  const url = new URL(rawUrl, `http://${req.headers.host ?? 'localhost'}`);
  const role = url.searchParams.get('role') as Sender | null;

  if (!role || !['userA', 'userB'].includes(role)) {
    console.warn(`[WS] Connection rejected — invalid or missing role: "${role}"`);
    ws.close(1008, 'role query param must be "userA" or "userB"');
    return;
  }

  // Register this connection
  clients.set(role, ws);
  console.log(`[WS] ${role} connected (${clients.size} client(s) connected)`);

  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === 'send_message') {
        await handleSendMessage({
          conversationId: data.conversationId,
          sender: data.sender,
          text: data.text,
        });
      }
    } catch (err) {
      console.error(`[WS:${role}] Message handling error:`, err);
    }
  });

  ws.on('close', () => {
    clients.delete(role);
    console.log(`[WS] ${role} disconnected (${clients.size} client(s) remaining)`);
  });

  ws.on('error', (err) => {
    console.error(`[WS:${role}] Socket error:`, err.message);
  });
}
