import { Router, Request, Response } from 'express';
import * as store from '../services/conversationStore';
import * as llm from '../services/llmProvider';

const router = Router();

/**
 * POST /api/respond
 *
 * "Help Me Respond" feature: given a flagged messageId + conversationId,
 * generates a calm, boundary-setting reply draft via the LLM.
 * The draft is returned to the client for editing — never auto-sent.
 */
router.post('/respond', async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId, messageId } = req.body as {
      conversationId?: string;
      messageId?: string;
    };

    if (!conversationId || !messageId) {
      res.status(400).json({ error: 'conversationId and messageId are required' });
      return;
    }

    const signal = store.getSignal(messageId);
    if (!signal) {
      res.status(404).json({ error: 'No risk signal found for this message. It may not have been flagged.' });
      return;
    }

    const history = store.getHistory(conversationId, 15);
    const draft = await llm.generateResponse(signal, history);

    res.json({ draft });
  } catch (err) {
    console.error('[API] POST /respond error:', err);
    res.status(500).json({ error: 'Failed to generate response draft.' });
  }
});

/**
 * GET /api/health
 * Simple health check for the demo.
 */
router.get('/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash-lite',
    timestamp: new Date().toISOString(),
  });
});

export default router;
