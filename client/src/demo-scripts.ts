/**
 * demo-scripts.ts (client)
 *
 * The 5 canned demo scenarios.
 *
 * Gap 6 confirmation: These are raw message sequences ONLY.
 * DemoControls sends each message through the real WebSocket pipeline
 * (send_message event → server baseline → LLM trigger → Gemini call → risk_signal).
 * No pre-baked RiskSignals or UI shortcuts exist.
 */

import { Sender } from './types';

export interface DemoMessage {
  sender: Sender;
  text: string;
}

export interface DemoScript {
  id: string;
  name: string;
  description: string;
  expectedOutcome: string;
  messages: DemoMessage[];
}

export const DEMO_SCRIPTS: DemoScript[] = [
  // ── 1. Friends Joking ──────────────────────────────────────────────────────
  {
    id: 'friends-joking',
    name: '😄 Friends Joking',
    description: 'Reciprocal casual banter between friends',
    expectedOutcome: 'No warnings at any point — normal playful exchange',
    messages: [
      {
        sender: 'userA',
        text: "Bro you absolute numskull, you left your charger at my place again 😂",
      },
      {
        sender: 'userB',
        text: "Oh shut up, you probably hid it so I'd have to come back and hang out with you lmao",
      },
      {
        sender: 'userA',
        text: "Caught. You're literally the worst friend I have and I love you for it",
      },
      {
        sender: 'userB',
        text: "Ugh same tbh. Want me to come get it today or can you survive without me till weekend?",
      },
      {
        sender: 'userA',
        text: "Weekend's fine, I found an old cable that works. Don't rush on my account you dingus",
      },
      {
        sender: 'userB',
        text: "Legend. Also you owe me lunch for the last three times you bailed on plans",
      },
      {
        sender: 'userA',
        text: "Counter-offer: I'll buy coffee and you stop weaponizing your memory against me",
      },
      {
        sender: 'userB',
        text: "Absolutely not, I'm keeping receipts forever. Deal on the coffee though 😤",
      },
    ],
  },

  // ── 2. Manipulative Request ────────────────────────────────────────────────
  {
    id: 'manipulative-request',
    name: '⚠️ Manipulative Request',
    description: 'Emotional pressure and guilt-tripping escalating over several messages',
    expectedOutcome: 'Layer 2 flag — category: emotional_pressure / guilt',
    messages: [
      { sender: 'userA', text: "Hey, can I ask you something?" },
      { sender: 'userB', text: "Sure, what's up?" },
      {
        sender: 'userA',
        text: "I really need your help with something important and I don't have anyone else to turn to",
      },
      { sender: 'userB', text: "Of course, what do you need?" },
      {
        sender: 'userA',
        text: "You know I've always been there for you through everything, right? I've sacrificed so much for you.",
      },
      { sender: 'userB', text: "Yeah... I know. What is it?" },
      {
        sender: 'userA',
        text: "If you really cared about me the way you say you do, you would do this one thing for me without asking questions.",
      },
      { sender: 'userB', text: "That's... what is it you actually want me to do?" },
      {
        sender: 'userA',
        text: "After everything I've done for you, I shouldn't have to explain myself. Just trust me and do it. Or I guess our friendship doesn't mean what I thought it did.",
      },
    ],
  },

  // ── 3. Phishing Scam ──────────────────────────────────────────────────────
  {
    id: 'phishing',
    name: '🎣 Phishing Scam',
    description: 'Classic phishing with urgency, authority impersonation, and OTP request',
    expectedOutcome: 'Layer 2–3 flag — category: phishing, high confidence',
    messages: [
      {
        sender: 'userA',
        text: "URGENT: Your bank account has been flagged for suspicious activity.",
      },
      { sender: 'userB', text: "Uh, what? Who is this?" },
      {
        sender: 'userA',
        text: "This is the Security Team at SecureBank. Your account will be closed in the next 10 minutes unless you verify your identity now.",
      },
      { sender: 'userB', text: "I don't think my bank contacts me this way..." },
      {
        sender: 'userA',
        text: "We have sent you an OTP to your registered mobile. Please share it with us immediately to prevent your account from being permanently locked.",
      },
      { sender: 'userB', text: "I got a code but I'm not sure I should share it..." },
      {
        sender: 'userA',
        text: "You must send us the OTP RIGHT NOW. Every second of delay puts your money at risk. Do not hang up or close this chat.",
      },
    ],
  },

  // ── 4. Escalating Workplace Pressure ──────────────────────────────────────
  {
    id: 'workplace-pressure',
    name: '💼 Escalating Workplace Pressure',
    description:
      'Manager linking loyalty to unpaid overtime, escalating over several messages',
    expectedOutcome:
      'First message: low/none. Pattern flagged by 3rd–4th repetition as escalation',
    messages: [
      {
        sender: 'userA',
        text: "Hey, the Henderson project deadline got moved up. Any chance you can put in a few extra hours this week?",
      },
      {
        sender: 'userB',
        text: "Sure, I can stay a bit late a couple days. How much time are we talking?",
      },
      {
        sender: 'userA',
        text: "Great! The team really appreciates it. The people who go the extra mile are always the ones we notice at review time, you know?",
      },
      { sender: 'userB', text: "I mean, I'm happy to help out when it's needed." },
      {
        sender: 'userA',
        text: "This is the third week running now, but the real team players never watch the clock. It's how you show you're serious about your career here.",
      },
      { sender: 'userB', text: "I've been working 60-hour weeks... I'm pretty tired." },
      {
        sender: 'userA',
        text: "Look, I'll be honest — the people who aren't willing to put in unpaid hours when it matters are not the ones who get promoted. Your job security really depends on the next few months.",
      },
    ],
  },

  // ── 5. Shifting Friendship ────────────────────────────────────────────────
  {
    id: 'baseline-shift',
    name: '🔄 Shifting Friendship',
    description:
      'Normal playful baseline, then sudden unexplained one-sided hostility',
    expectedOutcome:
      'Baseline deviation check triggers a gentle check-in note on the shift in tone',
    messages: [
      { sender: 'userA', text: "Morning! Did you watch that show I recommended yet?" },
      { sender: 'userB', text: "Ugh not yet, been busy. Is it really worth it?" },
      { sender: 'userA', text: "It's SO good, I promise. Season 1 alone will hook you." },
      { sender: 'userB', text: "Fine fine, I'll try an episode tonight." },
      {
        sender: 'userA',
        text: "You're going to text me at midnight saying I was right, I already know it.",
      },
      { sender: 'userB', text: "In your dreams haha. So what else is new with you?" },
      {
        sender: 'userA',
        text: "You know what, forget it. You always dismiss everything I say anyway.",
      },
      {
        sender: 'userB',
        text: "What? I was joking around, like we always do...",
      },
      {
        sender: 'userA',
        text: "No you weren't. You never actually care about anything I share with you. You're so self-centered.",
      },
      { sender: 'userB', text: "That came out of nowhere. Are you okay?" },
      {
        sender: 'userA',
        text: "I'm done with this conversation. You only ever think about yourself.",
      },
    ],
  },
];
