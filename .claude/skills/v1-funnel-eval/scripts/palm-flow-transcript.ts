// palm-flow-transcript — headless FULL-CONVERSATION printer for the FB-PALM
// "soulmate" lander (Version C, thumb/a "gathering heart", hook=soulmate-timing).
//
// Answers "how does the conversation actually flow for the fb-palm soulmate
// visitors?" by replaying the WHOLE funnel — greeting → palm reflect → name/email
// → the shared love deepening → crisis → pitch → first objection — and printing
// every message (scripted bot lines verbatim, LLM beats generated live).
//
//   npx tsx .claude/skills/v1-funnel-eval/scripts/palm-flow-transcript.ts
//   npx tsx .claude/skills/v1-funnel-eval/scripts/palm-flow-transcript.ts --hook soulmate-timing --thumb a
//
// FAITHFUL to CURRENT production (post fb-palm derail fix, improve-v1/04):
//   - carries palmReading + palmMark into userData so palmDirective() threads the
//     palm identity through the shared reading/crisis builders (not the old generic
//     love script — that's what flow-transcript.mjs, written pre-fix, still shows).
//   - reuses the REAL prompt builders (server/lib/prompts.ts) and the SAME single
//     user-message model call + sanitizePredictionsV1 the server uses (server/lib/claude.ts).
//
// HEADLESS + SAFE: imports pure builders + calls ONLY the Anthropic API. No server,
// no DB, no browser, no Stripe/FB/AWeber. Never ships to prod. Reads ANTHROPIC_API_KEY
// from .env.
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  buildPalmReflectPrompt,
  buildReading1Prompt,
  buildReading2Prompt,
  buildFutureValidationPrompt,
  buildCrisisRevealPrompt,
  buildCrisisCostPrompt,
  buildCrisisUrgencyPrompt,
  buildValueExplainPrompt,
  buildObjectionPrompt,
} from '../../../../server/lib/prompts';
import { sanitizePredictionsV1 } from '../../../../server/lib/predictionSanitizer';
import { SIGNS, PALM_HOOKS, HEADLINES, cardRead } from '../../../../client/src/content/palmReads';
import type { UserData } from '../../../../shared/types';

const GEN_MODEL = 'claude-sonnet-4-5-20250929'; // = getModelForOperation('conversation') hardcoded default
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const arg = (flag: string, fallback: string) => {
  const i = process.argv.indexOf(flag);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const HOOK = arg('--hook', 'soulmate-timing');
const SIGN = arg('--sign', 'thumb');
const THUMB = arg('--thumb', 'a');
const OUT_DIR = 'audit-runs/v1-funnel-eval';

// ── The seeker + her answers (same VOC set the prior evidence used, so this is
//    apples-to-apples with improve-v1/evidence/transcript-fb-palm.md) ──────────
const NAME = 'Sarah';
const EMAIL = 'sarah.flowtest@example.com';
const A = {
  concern: "I'm 34 and all my friends are married with kids. I feel like I already missed my one chance at real love.",
  deeper: "Yes... I've been on so many dates but nothing ever becomes something real.",
  future: 'A partner who truly sees me. Building a home and a family together.',
  feel: "It would feel like I could finally breathe. Like I'm not broken after all.",
  source: "I don't know... maybe when my last relationship ended three years ago.",
  cost: "I'm not sure, it's so hard to put a price on it.", // non-positive → urgency beat fires
  objection: "That's a lot of money for me right now",
};

// ── transcript log ───────────────────────────────────────────────────────────
const lines: string[] = [];
let botMsgs = 0, userTurns = 0, llmCalls = 0;
function bot(msgs: string[], meta?: { llm?: boolean; beat?: string }) {
  if (meta?.llm) llmCalls++;
  const tag = meta?.llm ? ` _(LLM · ${meta.beat})_` : '';
  for (const m of msgs) { lines.push(`**Evelyn:**${tag} ${m}`); botMsgs++; }
}
function user(text: string, state: string) {
  userTurns++;
  lines.push(`\n> **👤 USER [turn ${userTurns} · ${state}]:** ${text}\n`);
}
function tap(label: string, state: string) {
  userTurns++;
  lines.push(`\n> **👆 USER taps [turn ${userTurns} · ${state}]:** ${label}\n`);
}
function note(s: string) { lines.push(`\n\`${s}\`\n`); }

// ── the single model call, identical shape to server/lib/claude.ts:callClaude ─
async function gen(prompt: string): Promise<{ messages: string[]; subBucket?: string }> {
  const r = await anthropic.messages.create({
    model: GEN_MODEL, max_tokens: 1000, messages: [{ role: 'user', content: prompt }],
  });
  const text = r.content[0].type === 'text' ? r.content[0].text : '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { messages: ['⚠️ (model returned no parseable JSON)'] };
  try {
    const j = JSON.parse(m[0]);
    return { messages: sanitizePredictionsV1(j.messages ?? []), subBucket: j.subBucket };
  } catch { return { messages: ['⚠️ (JSON parse failed)'] }; }
}

async function main() {
  const sign = SIGNS[SIGN as keyof typeof SIGNS];
  if (!sign) throw new Error(`unknown sign "${SIGN}". Have: ${Object.keys(SIGNS).join(', ')}`);
  if (!PALM_HOOKS.includes(HOOK as any)) throw new Error(`unknown hook "${HOOK}". Have: ${PALM_HOOKS.join(', ')}`);
  const read = sign.reads[HOOK as keyof typeof sign.reads];
  if (!read || !read[THUMB as 'a']) throw new Error(`no read for sign=${SIGN} hook=${HOOK} thumb=${THUMB}`);
  const build = read[THUMB as 'a']; // the 4-sentence palm build
  const mark = sign.mark[THUMB as 'a'];
  const reading = sign.reading[THUMB as 'a'];

  console.log(`\npalm-flow-transcript — sign=${SIGN} hook=${HOOK} thumb=${THUMB} ("${reading}") · model ${GEN_MODEL}\n`);

  // What the visitor saw on the AD + LANDER before the chat (context, not chat msgs)
  note(`AD/LANDER CONTEXT — headline "${HEADLINES[HOOK as keyof typeof HEADLINES]}" · tapped option ${THUMB.toUpperCase()} → mark "${mark}" → "${reading}"`);
  note(`Version-A result card would read: "${cardRead(SIGN as any, HOOK as any, THUMB as any)}"`);

  // userData BEFORE name capture — palm identity NOT yet stored (matches client:
  // palmReflect runs before updateUserData sets palmReading/palmMark).
  const ud: UserData = {} as UserData;

  // ── GREETING → Version-C opener (scripted: mark line + the open question) ──
  bot(['*Evelyn has joined the chat*']);
  // openerCStart(sign, hook, thumb) = [ build[0] (mark line), PALM_QUESTION[hook] ]
  // PALM_QUESTION is module-private; the soulmate-timing text is reproduced from palmReads.ts.
  const openerQuestion = openerQuestionFor(HOOK);
  bot([build[0], openerQuestion]);
  user(A.concern, 'PALM_REFLECT');
  ud.concern = A.concern;

  // ── palmReflect (LLM) — the palm-aware reflect of HER answer ──
  let r = await gen(buildPalmReflectPrompt(ud, SIGN, HOOK, THUMB, A.concern));
  bot(r.messages, { llm: true, beat: 'palmReflect' });
  bot(['Before we go deeper, tell me… what should I call you, dear?']);
  user(NAME, 'NAME_CAPTURE');
  ud.firstName = NAME;
  ud.bucket = 'love';
  // fb-palm DERAIL FIX: store the palm identity so every later builder threads it.
  ud.palmReading = reading;
  ud.palmMark = mark;
  note(`DERAIL FIX — userData now carries palmReading="${reading}", palmMark="${mark}" → palmDirective() threads this through reading1/reading2/futureValidation/crisisReveal/crisisCost below.`);

  // ── palm name-ack (scripted) → email anchor ──
  bot([
    `It's lovely to meet you, ${NAME}.`,
    'Everything we discuss stays between us... our secret.',
    `I can feel warmth radiating from your heart, ${NAME}...`,
    "But there's a flicker of shadow there too...",
  ]);
  bot([
    'Before I look deeper, I need to anchor our connection...',
    'Sometimes the visions continue after we speak...',
    'Where should I send them if more is revealed?',
  ]);
  user(EMAIL, 'EMAIL_CAPTURE');
  ud.email = EMAIL;

  // ── email ack (scripted) → DEEPENING_1 (asks the concern again) ──
  bot([
    `Thank you, ${NAME}. The link is complete.`,
    "Now, tell me more about what's on your mind...",
    "Your thoughts, your feelings... I'm listening.",
  ]);
  user(A.concern, 'DEEPENING_1');
  ud.concern = A.concern;

  // ── shared love deepening — palm identity now woven via palmDirective() ──
  r = await gen(buildReading1Prompt(ud, A.concern));
  if (r.subBucket) ud.subBucket = r.subBucket;
  bot(r.messages, { llm: true, beat: 'reading1' });
  user(A.deeper, 'DEEPENING_2');
  ud.deeperResponse = A.deeper;

  r = await gen(buildReading2Prompt(ud, A.deeper));
  bot(r.messages, { llm: true, beat: 'reading2' });
  user(A.future, 'FUTURE_PACING');
  ud.desires = A.future;

  r = await gen(buildFutureValidationPrompt(ud, A.future));
  bot(r.messages, { llm: true, beat: 'futureValidation' });
  user(A.feel, 'FUTURE_VALIDATION');
  ud.emotionalResponse = A.feel;

  r = await gen(buildCrisisRevealPrompt(ud, A.feel));
  bot(r.messages, { llm: true, beat: 'crisisReveal' });
  user(A.source, 'CRISIS_REVEAL');
  ud.blockSource = A.source;

  r = await gen(buildCrisisCostPrompt(ud, A.source));
  bot(r.messages, { llm: true, beat: 'crisisCost' });
  user(A.cost, 'CRISIS_COST');
  ud.commitmentResponse = A.cost;

  r = await gen(buildCrisisUrgencyPrompt(ud, A.cost));
  bot(r.messages, { llm: true, beat: 'crisisUrgency' });
  tap('✨ Yes, please help me Evelyn!', 'PERMISSION_ASK');

  // ── PITCH / close (LLM) ──
  r = await gen(buildValueExplainPrompt(ud));
  bot(r.messages, { llm: true, beat: 'valueExplain (pitch)' });
  user(A.objection, 'OBJECTION_1');

  // ── first objection (LLM) ──
  r = await gen(buildObjectionPrompt(ud, A.objection, 1));
  bot(r.messages, { llm: true, beat: 'objection #1' });
  note('… flow continues: 2nd/3rd objection → downsell fork → Stripe checkout ($35 main / $25 downsell). Omitted here.');

  // ── write + print ──
  const md =
    `# FB-PALM full transcript — Version C · sign=${SIGN} · hook=${HOOK} ("${HEADLINES[HOOK as keyof typeof HEADLINES]}") · thumb=${THUMB} ("${reading}")\n\n` +
    `Entry: \`/fb-palm/c?hook=${HOOK}&thumb=${THUMB}${SIGN !== 'thumb' ? `&sign=${SIGN}` : ''}\` → PalmBridge → \`/fb-palm/chat\`. ` +
    `Bucket auto-forced to \`love\`. Post fb-palm derail fix: palm identity woven through the whole deepening.\n\n` +
    `**Totals:** ${userTurns} user turns · ${botMsgs} bot messages · ${llmCalls} live LLM calls · model ${GEN_MODEL}\n\n` +
    `_Headless: real prompt builders + Anthropic only. No server/DB/Stripe. Scripted lines verbatim from code; LLM beats generated live._\n\n---\n\n` +
    lines.join('\n') + '\n';

  mkdirSync(OUT_DIR, { recursive: true });
  const file = `${OUT_DIR}/palm-transcript-${HOOK}-${SIGN}-${THUMB}.md`;
  writeFileSync(file, md);
  console.log(md);
  console.log(`\nwrote ${file}\n`);
}

// soulmate-timing opener question is module-private in palmReads.ts (PALM_QUESTION);
// reproduced here verbatim so the greeting matches Version C exactly.
function openerQuestionFor(hook: string): string {
  const Q: Record<string, string> = {
    'already-met': "Before I look closer, tell me… is there already someone your mind keeps returning to?",
    'love-again': "Before I look closer, tell me… what's been weighing on your heart since it happened?",
    'soulmate-timing': "Before I look closer, tell me… what's making the waiting feel so heavy right now?",
    'is-he-true': "Before I look closer, tell me… what is it about him your gut keeps snagging on?",
    'sense-lying': "Before I look closer, tell me… when did the feeling first creep in?",
    'heart-safe': "Before I look closer, tell me… what has he promised that you're still waiting to see?",
  };
  return Q[hook] ?? Q['soulmate-timing'];
}

main().catch((e) => { console.error('TRANSCRIPT ERROR:', e.message); process.exit(1); });
