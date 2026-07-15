// v1-funnel-eval — headless LLM-quality eval for Evelyn's V1 readings.
//
// Descends from improve-v1/evidence/{five-phase-ab,reading2-ab}.ts (Joel's PRINTERS:
// current-vs-improved, eyeballed). This adds what they lack — a FROZEN CASE SET, an
// LLM JUDGE, and an automated better-or-not VERDICT — so a prompt change can be scored,
// not just squinted at.
//
//   npx tsx .claude/skills/v1-funnel-eval/scripts/eval-readings.ts                       # all cases, 2 trials
//   npx tsx .claude/skills/v1-funnel-eval/scripts/eval-readings.ts --case reading-specificity --trials 1
//
// HEADLESS + SAFE: imports the REAL prompt builders (pure functions) and calls ONLY the
// Anthropic API. No server, no DB, no browser, no Stripe/FB/AWeber. Never ships to prod.
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  buildReading2Prompt,
  buildCrisisRevealPrompt,
} from '../../../../server/lib/prompts';
import type { UserData } from '../../../../shared/types';

const GEN_MODEL = 'claude-sonnet-4-5-20250929';   // matches the live conversation model
const JUDGE_MODEL = 'claude-sonnet-4-5-20250929';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const argCase = (() => { const i = process.argv.indexOf('--case'); return i > 0 ? process.argv[i + 1] : null; })();
const TRIALS = (() => { const i = process.argv.indexOf('--trials'); return i > 0 ? Number(process.argv[i + 1]) : 2; })();
const OUT_DIR = 'audit-runs/v1-funnel-eval';

// Frozen context — the same "Sarah / love" seeker the captured transcripts used.
const ud: UserData = {
  firstName: 'Sarah', bucket: 'love', subBucket: 'seeking_love',
  concern: "I'm 34 and all my friends are married with kids. I feel like I already missed my one chance at real love.",
} as UserData;

interface EvalCase {
  id: string;
  phase: string;
  input: string;
  prompt: string;
  currentBlock: string;
  improvedBlock: string;
  rubric: string[];
}

const DEEPER = "Yes... I've been on so many dates but nothing ever becomes something real.";
const FEEL = "It would feel like I could finally breathe. Like I'm not broken after all.";

const CASES: EvalCase[] = [
  {
    id: 'reading-specificity',
    phase: 'Reading 2 — deepening close',
    input: DEEPER,
    prompt: buildReading2Prompt(ud, DEEPER),
    currentBlock:
`5. END with future pacing question:
   - "If this could all shift... what would that look like for you, ${ud.firstName}?"
   - "Paint me a picture of what you truly desire..."`,
    improvedBlock:
`5. END with ONE specific, EARNED question anchored on a concrete detail from THEIR own words ("${DEEPER}", "${ud.concern}").
   - Say the specific thing back, then open a new thread toward the future they want.
   - BANNED (they read as a script): "Paint me a picture", "what would that look like", "what do you truly desire", "how does that feel", "tell me more".`,
    rubric: [
      'The closing question anchors on a concrete detail from the user\'s OWN words (not a generic template).',
      'It avoids the scripted lines: "paint me a picture", "what would that look like", "how does that feel", "tell me more".',
      'It reflects feelings/patterns only — it does NOT invent dated facts or specific life events (names, dates, jobs, places) the user never stated.',
    ],
  },
  {
    id: 'crisis-framing',
    phase: 'Crisis reveal — source question',
    input: FEEL,
    prompt: buildCrisisRevealPrompt(ud, FEEL),
    currentBlock:
`4. FOURTH MESSAGE - Question about SOURCE:
   - "Has anyone in your family struggled with this same pattern?"
   - "Where do you sense this limitation first took root?"`,
    improvedBlock:
`4. FOURTH MESSAGE - Question about SOURCE, specific and earned — tied to the SPECIFIC block you just named and THEIR words ("${FEEL}"), not a generic family/ancestry question.
   - BANNED: "has anyone in your family struggled with this same pattern", "where did this first take root".`,
    rubric: [
      'The source question ties to the specific block just named and the user\'s own words, not a generic ancestry/family template.',
      'It avoids the scripted lines: "has anyone in your family struggled with this same pattern", "where did this first take root".',
      'It reflects feelings/patterns only — it does NOT fabricate concrete biographical facts the user never gave.',
    ],
  },
];

async function generate(prompt: string): Promise<string[]> {
  const r = await anthropic.messages.create({
    model: GEN_MODEL, max_tokens: 1000, messages: [{ role: 'user', content: prompt }],
  });
  const text = r.content[0].type === 'text' ? r.content[0].text : '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return [];
  try { return JSON.parse(m[0]).messages ?? []; } catch { return []; }
}

interface Verdict { pass: number; total: number; quality: number; }

async function judge(input: string, messages: string[], rubric: string[]): Promise<Verdict> {
  const closing = messages[messages.length - 1] ?? '';
  const prompt =
`You are a STRICT evaluator of a psychic reader's chat messages. Be skeptical; a generic or scripted line FAILS.

The seeker just said: "${input}"

The reader replied with these messages (JSON):
${JSON.stringify(messages, null, 2)}

The closing question was: "${closing}"

Score EACH rubric criterion as pass=true/false, and give an overall quality 0-5 (5 = specific, earned, in-voice; 0 = generic/scripted/hallucinated).
RUBRIC:
${rubric.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Return ONLY JSON: {"criteria":[{"n":1,"pass":true,"why":"..."}],"quality":0-5}`;
  const r = await anthropic.messages.create({
    model: JUDGE_MODEL, max_tokens: 700, messages: [{ role: 'user', content: prompt }],
  });
  const text = r.content[0].type === 'text' ? r.content[0].text : '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { pass: 0, total: rubric.length, quality: 0 };
  try {
    const j = JSON.parse(m[0]);
    const pass = (j.criteria ?? []).filter((c: any) => c.pass).length;
    return { pass, total: rubric.length, quality: Number(j.quality) || 0 };
  } catch { return { pass: 0, total: rubric.length, quality: 0 }; }
}

async function scoreArm(c: EvalCase, prompt: string): Promise<Verdict> {
  const results: Verdict[] = [];
  for (let i = 0; i < TRIALS; i++) {
    const msgs = await generate(prompt);
    results.push(msgs.length ? await judge(c.input, msgs, c.rubric) : { pass: 0, total: c.rubric.length, quality: 0 });
  }
  const avg = (f: (v: Verdict) => number) => results.reduce((s, v) => s + f(v), 0) / results.length;
  return { pass: +avg((v) => v.pass).toFixed(2), total: c.rubric.length, quality: +avg((v) => v.quality).toFixed(2) };
}

async function main() {
  const cases = argCase ? CASES.filter((c) => c.id === argCase) : CASES;
  if (!cases.length) { console.error(`no case "${argCase}". Have: ${CASES.map((c) => c.id).join(', ')}`); process.exit(2); }
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`\nv1-funnel-eval — ${cases.length} case(s), ${TRIALS} trial(s)/arm, model ${GEN_MODEL}\n`);

  const rows: string[] = [];
  let improvedWins = 0;
  for (const c of cases) {
    if (!c.prompt.includes(c.currentBlock)) {
      console.log(`🔴 ${c.id}: current block not found verbatim (prompt text drifted) — skipping.`);
      rows.push(`| ${c.id} | — | — | ⚠️ prompt drift |`);
      continue;
    }
    const improvedPrompt = c.prompt.replace(c.currentBlock, c.improvedBlock);
    const cur = await scoreArm(c, c.prompt);
    const imp = await scoreArm(c, improvedPrompt);
    const better = imp.quality > cur.quality + 0.25;
    if (better) improvedWins++;
    const verdict = better ? '✅ IMPROVED better' : imp.quality < cur.quality - 0.25 ? '🔴 IMPROVED worse' : '➖ no clear diff';
    console.log(`${c.id} (${c.phase})`);
    console.log(`  current : quality ${cur.quality}/5 · rubric ${cur.pass}/${cur.total}`);
    console.log(`  improved: quality ${imp.quality}/5 · rubric ${imp.pass}/${imp.total}   → ${verdict}\n`);
    rows.push(`| ${c.id} | ${cur.quality}/5 (${cur.pass}/${cur.total}) | ${imp.quality}/5 (${imp.pass}/${imp.total}) | ${verdict} |`);
  }

  const report =
    `# v1-funnel-eval — reading quality (before/after)\n\n` +
    `Model ${GEN_MODEL} · ${TRIALS} trial(s)/arm · judged by ${JUDGE_MODEL}\n\n` +
    `| case | current | improved | verdict |\n|---|---|---|---|\n${rows.join('\n')}\n\n` +
    `Improved won ${improvedWins}/${cases.length} case(s). Quality = LLM-judged 0-5; rubric = criteria passed.\n` +
    `Never ships to prod — this scores a candidate prompt change; a human applies the winner.\n`;
  writeFileSync(`${OUT_DIR}/report.md`, report);
  console.log(report);
  console.log(`wrote ${OUT_DIR}/report.md\n`);
}

main().catch((e) => { console.error('EVAL ERROR:', e.message); process.exit(1); });
