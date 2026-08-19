/**
 * server/src/index.ts — MindShield AI server entry point
 *
 * Startup order:
 *  1. Load environment variables from .env
 *  2. Fail fast if GEMINI_API_KEY is missing (clear error, not silent crash)
 *  3. Start Express HTTP server with WebSocket upgrade
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Load .env from the monorepo root (one directory up from server/)
loadEnv({ path: resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import apiRouter from './routes/api';
import { handleConnection } from './wsHandler';
import { MODEL_ID } from './services/llmProvider';

// ─── Fail-fast API key check ──────────────────────────────────────────────────
if (!process.env.GEMINI_API_KEY) {
  console.error('\n╔══════════════════════════════════════════════════════════════╗');
  console.error('║  ❌  GEMINI_API_KEY is not set                               ║');
  console.error('╠══════════════════════════════════════════════════════════════╣');
  console.error('║  1. Copy mindshield/.env.example  →  mindshield/.env         ║');
  console.error('║  2. Set GEMINI_API_KEY=<your key> in the .env file           ║');
  console.error('║  3. Get a free key at https://aistudio.google.com/apikey     ║');
  console.error('║  4. Restart: npm run dev                                     ║');
  console.error('╚══════════════════════════════════════════════════════════════╝\n');
  process.exit(1);
}

// ─── Express app ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const app = express();

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  })
);
app.use(express.json());
app.use('/api', apiRouter);

// ─── HTTP + WebSocket server ──────────────────────────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => handleConnection(ws, req));

server.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🛡️  MindShield AI — server ready                            ║');
  console.log(`║  HTTP : http://localhost:${PORT}                              ║`);
  console.log(`║  WS   : ws://localhost:${PORT}/ws                             ║`);
  console.log(`║  Model: ${MODEL_ID.padEnd(46)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
});
