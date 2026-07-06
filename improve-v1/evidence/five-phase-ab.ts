// Full 5-phase A/B: for EACH deepening builder, hold the real prompt constant and
// swap ONLY its closing-question block (canned examples → specificity-forced).
// Same model, same user input per phase. Proves the vagueness is prompt-caused
// across the whole flow, not just reading2.
//
// Run from repo root: npx tsx improve-v1/evidence/five-phase-ab.ts
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  buildReading1Prompt, buildReading2Prompt, buildFutureValidationPrompt,
  buildCrisisRevealPrompt, buildCrisisCostPrompt,
} from '../../server/lib/prompts';
import type { UserData } from '../../shared/types';

const MODEL = 'claude-sonnet-4-5-20250929';
const TRIALS = 2;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Same answers used in the captured transcripts, so this mirrors a real run.
const A = {
  concern: "I'm 34 and all my friends are married with kids. I feel like I already missed my one chance at real love.",
  deeper: "Yes... I've been on so many dates but nothing ever becomes something real.",
  future: "A partner who truly sees me. Building a home and a family together.",
  feel: "It would feel like I could finally breathe. Like I'm not broken after all.",
  source: "I don't know... maybe when my last relationship ended three years ago.",
};
const ud: UserData = {
  firstName: 'Sarah', bucket: 'love', subBucket: 'seeking_love',
  concern: A.concern, desires: A.future,
} as UserData;

// A shared "make it specific" tail, phase-anchored via the `anchor` text.
const specific = (intent: string, anchor: string, banned: string) =>
  `${intent}
   - Anchor it on a concrete detail from their OWN words: ${anchor}. Say that specific thing back, then open a new thread from it.
   - Reflect what they said precisely; NEVER invent facts about their life.
   - BANNED (they read as a script and break the spell): ${banned}. Do not output these or close paraphrases.`;

interface Phase {
  name: string; prompt: string; input: string;
  currentBlock: string; improvedBlock: string;
}

const PHASES: Phase[] = [
  {
    name: 'reading1', input: A.concern, prompt: buildReading1Prompt(ud, A.concern),
    currentBlock:
`4. END with a follow-up question to go deeper:
   - "How long have you been carrying this weight, ${ud.firstName}?"
   - "Has anyone close to you noticed this struggle?"
   - "What have you already tried to change this?"`,
    improvedBlock:
`4. ` + specific(
  'END with ONE specific, earned question that probes deeper:',
  `their concern "${A.concern}"`,
  `"how long have you been carrying this", "has anyone noticed", "what have you tried", "tell me more"`),
  },
  {
    name: 'reading2', input: A.deeper, prompt: buildReading2Prompt(ud, A.deeper),
    currentBlock:
`5. END with future pacing question:
   - "If this could all shift... what would that look like for you, ${ud.firstName}?"
   - "Paint me a picture of what you truly desire..."`,
    improvedBlock:
`5. ` + specific(
  'END with ONE specific, earned question that pulls toward the future they want (future-pacing) — through THEIR specifics:',
  `their latest words "${A.deeper}"`,
  `"paint me a picture", "what would that look like", "what do you truly desire", "how does that feel"`),
  },
  {
    name: 'futureValidation', input: A.future, prompt: buildFutureValidationPrompt(ud, A.future),
    currentBlock:
`3. FINAL MESSAGE MUST BE A QUESTION - ask how it would feel emotionally:
   - "How would that FEEL, ${ud.firstName}? Close your eyes and tell me..."
   - "What would change in how you carry yourself each day?"`,
    improvedBlock:
`3. FINAL MESSAGE MUST BE A QUESTION — ` + specific(
  'specific and earned, drawn from the exact future they described:',
  `their vision "${A.future}"`,
  `"how would that feel", "close your eyes and tell me", "what would change in how you carry yourself"`),
  },
  {
    name: 'crisisReveal', input: A.feel, prompt: buildCrisisRevealPrompt(ud, A.feel),
    currentBlock:
`4. FOURTH MESSAGE - Question about SOURCE:
   - "Has anyone in your family struggled with this same pattern?"
   - "Where do you sense this limitation first took root?"`,
    improvedBlock:
`4. FOURTH MESSAGE - Question about SOURCE — ` + specific(
  'specific and earned, tied to the SPECIFIC block you just named — not a generic family question:',
  `the block + their words "${A.feel}"`,
  `"has anyone in your family struggled with this same pattern", "where did this first take root", generic ancestry questions`),
  },
  {
    name: 'crisisCost', input: A.source, prompt: buildCrisisCostPrompt(ud, A.source),
    currentBlock:
`4. FINAL MESSAGE MUST BE A QUESTION about commitment:
   - "Are you ready to release this once and for all, ${ud.firstName}?"
   - "If you could clear this block today, would you take that step?"`,
    improvedBlock:
`4. FINAL MESSAGE MUST BE A QUESTION about commitment (keep it a clear yes/no) — ` + specific(
  'specific and earned, framed around what THEY reclaim vs. the specific cost of staying stuck:',
  `their vision "${A.future}"`,
  `"are you ready to release this once and for all", "if you could clear this block today would you take that step"`),
  },
];

async function run(prompt: string): Promise<string[]> {
  const r = await anthropic.messages.create({
    model: MODEL, max_tokens: 1000, messages: [{ role: 'user', content: prompt }],
  });
  const text = r.content[0].type === 'text' ? r.content[0].text : '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return ['<<no JSON>>'];
  try { return JSON.parse(m[0]).messages ?? ['<<no messages>>']; } catch { return ['<<parse error>>']; }
}
const closing = (msgs: string[]) => msgs[msgs.length - 1];

async function main() {
  console.log('='.repeat(96));
  console.log(`FULL 5-PHASE A/B — same input & model (${MODEL}), ${TRIALS} trials/arm. Only the closing-question block differs.`);
  console.log('='.repeat(96));

  for (const p of PHASES) {
    if (!p.prompt.includes(p.currentBlock)) {
      console.log(`\n#### ${p.name} — ⚠️ current block NOT found verbatim (prompt text changed); skipping.`);
      continue;
    }
    const improved = p.prompt.replace(p.currentBlock, p.improvedBlock);
    console.log(`\n${'#'.repeat(96)}\n# PHASE: ${p.name}   (user said: "${p.input}")\n${'#'.repeat(96)}`);

    console.log('  --- CURRENT (canned) ---');
    for (let i = 0; i < TRIALS; i++) console.log(`    Q${i + 1}: ${closing(await run(p.prompt))}`);
    console.log('  --- IMPROVED (specificity-forced) ---');
    for (let i = 0; i < TRIALS; i++) console.log(`    Q${i + 1}: ${closing(await run(improved))}`);
  }

  console.log('\n' + '='.repeat(96));
  console.log('Compare the closing questions per phase: CURRENT parrots the canned line; IMPROVED anchors on her words.');
  console.log('='.repeat(96));
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
