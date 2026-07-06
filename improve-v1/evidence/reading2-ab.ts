// A/B proof: does the vagueness come from the LLM, or from the prompt?
// Same phase (reading2), same user input, same model. Only the closing-question
// instruction differs: CURRENT (canned examples) vs IMPROVED (specificity-forced).
//
// Run from repo root: npx tsx improve-v1/evidence/reading2-ab.ts
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { buildReading2Prompt } from '../../server/lib/prompts';
import type { UserData } from '../../shared/types';

const MODEL = 'claude-sonnet-4-5-20250929'; // live conversation model
const TRIALS = 3;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Same context the transcript used at the reading2 beat.
const userData: UserData = {
  firstName: 'Sarah',
  bucket: 'love',
  subBucket: 'seeking_love',
  concern: "I'm 34 and all my friends are married with kids. I feel like I already missed my one chance at real love.",
} as UserData;
const deeperResponse = "Yes... I've been on so many dates but nothing ever becomes something real.";

// The CURRENT prompt, verbatim from the codebase.
const CURRENT = buildReading2Prompt(userData, deeperResponse);

// The IMPROVED prompt = current, with ONLY step 5 (the closing question) swapped
// from canned examples to a specificity-forcing instruction. Nothing else changes,
// so any difference in output is attributable to that one block.
const currentStep5 =
  `5. END with future pacing question:
   - "If this could all shift... what would that look like for you, ${userData.firstName}?"
   - "Paint me a picture of what you truly desire..."`;
const improvedStep5 =
  `5. END with ONE specific, EARNED question — the kind only a reader who actually heard THIS person could ask:
   - It MUST anchor on a concrete detail from their own words. Their latest: "${deeperResponse}". Their concern: "${userData.concern}".
   - Say the specific thing back to them, then open a NEW thread from it that pulls toward the future they want.
   - It still serves future-pacing — but through THEIR specifics, never a generic prompt.
   - BANNED outputs (they read as a script, instantly break the spell): "Paint me a picture", "what would that look like", "what do you truly desire", "how does that feel", "tell me more", "what does your heart want".
   - SHAPE only (do NOT copy — build yours from what THEY actually said): if someone said "so many dates but nothing becomes real" → "Which of those almost-connections got closest before it thinned out — and were you the one who felt it fade first?"`;

if (!CURRENT.includes(currentStep5)) {
  console.error('!! step-5 block not found verbatim — prompt text changed; update the script.');
  process.exit(1);
}
const IMPROVED = CURRENT.replace(currentStep5, improvedStep5);

async function run(prompt: string): Promise<string[]> {
  const r = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = r.content[0].type === 'text' ? r.content[0].text : '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return ['<<no JSON parsed>>'];
  try { return JSON.parse(m[0]).messages ?? ['<<no messages>>']; }
  catch { return ['<<JSON parse error>>']; }
}

function show(tag: string, msgs: string[]) {
  const q = msgs[msgs.length - 1];
  console.log(`\n  [${tag}] closing question →  ${q}`);
  console.log(`         full: ${msgs.map((m) => `“${m}”`).join('  ')}`);
}

async function main() {
  console.log('='.repeat(90));
  console.log(`READING_2 A/B — same input, same model (${MODEL}), ${TRIALS} trials each`);
  console.log(`User just said: "${deeperResponse}"`);
  console.log('='.repeat(90));

  console.log('\n### CURRENT PROMPT  (step 5 = canned examples)');
  for (let i = 0; i < TRIALS; i++) show(`current ${i + 1}`, await run(CURRENT));

  console.log('\n\n### IMPROVED PROMPT  (step 5 = specificity-forced, generic banned)');
  for (let i = 0; i < TRIALS; i++) show(`improved ${i + 1}`, await run(IMPROVED));

  console.log('\n' + '='.repeat(90));
  console.log('Read the closing questions. Current → generic/parroted. Improved → anchored on her words.');
  console.log('='.repeat(90));
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
