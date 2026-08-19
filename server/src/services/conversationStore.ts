import { Message, RiskSignal } from '../models/types';

// ─── In-memory stores (per-demo session, cleared on server restart) ──────────
// Note: MindShield's "minimal retention" privacy principle means no persistent
// database is used. See NOTES.md for future work on on-device storage.

const messageStore = new Map<string, Message[]>();   // conversationId → messages
const signalStore  = new Map<string, RiskSignal>();  // messageId       → signal

// ─── Messages ─────────────────────────────────────────────────────────────────

export function appendMessage(message: Message): void {
  const messages = messageStore.get(message.conversationId) ?? [];
  messages.push(message);
  messageStore.set(message.conversationId, messages);
}

export function getHistory(conversationId: string, limit = 15): Message[] {
  const messages = messageStore.get(conversationId) ?? [];
  return messages.slice(-limit);
}

export function getMessageById(conversationId: string, messageId: string): Message | undefined {
  return (messageStore.get(conversationId) ?? []).find(m => m.id === messageId);
}

export function getMessageCount(conversationId: string): number {
  return (messageStore.get(conversationId) ?? []).length;
}

export function clearConversation(conversationId: string): void {
  messageStore.delete(conversationId);
  // Note: signals for cleared messages are NOT deleted here intentionally
  // (they could be orphaned, but the store is fully in-memory and small).
}

// ─── Risk Signals ─────────────────────────────────────────────────────────────

export function storeSignal(messageId: string, signal: RiskSignal): void {
  signalStore.set(messageId, signal);
}

export function getSignal(messageId: string): RiskSignal | undefined {
  return signalStore.get(messageId);
}
