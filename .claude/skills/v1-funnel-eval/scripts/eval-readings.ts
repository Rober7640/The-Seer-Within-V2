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
  buildReading1Prompt,
  buildReading2Prompt,
  buildCrisisRevealPrompt,
  buildValueExplainPrompt,
  buildObjectionPrompt,
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

// Same seeker, but carrying the VISION she gave at FUTURE_VALIDATION.
//
// ⚠ Why this fixture exists: buildValueExplainPrompt's whole job is to paint the
// seeker's vision back to them ("Their vision was: \"${userData.desires}\""), but the
// shared `ud` fixture has no `desires`. The pitch case was therefore rendering
// `Their vision was: "undefined"` and asking the model to make "undefined" vivid —
// which is most of why it scored 0.5/5, and is a HARNESS bug, not a prompt defect.
// Kept as a separate fixture (like palmUd) so the other cases' scores stay comparable
// with previous runs.
const pitchUd: UserData = {
  ...ud,
  desires:
    "I want to stop feeling like I'm auditioning on every date — to just be easy with someone who already knows me.",
} as UserData;

// Same seeker, but carrying the palm identity the derail fix persists into userData.
const palmUd: UserData = {
  ...ud,
  palmReading: 'the gathering heart',
  palmMark: 'a trident, three lines rising to one',
} as UserData;

interface EvalCase {
  id: string;
  phase: string;
  input: string;
  prompt: string;
  rubric: string[];
  currentBlock?: string;   // present ⇒ before/after A/B; absent ⇒ baseline-only scoring
  improvedBlock?: string;
  improvedPrompt?: string; // alternative to block-swap: a full candidate prompt (e.g. a
                           // different userData) — used when the change is data-driven, not text.
}

const DEEPER = "Yes... I've been on so many dates but nothing ever becomes something real.";
const FEEL = "It would feel like I could finally breathe. Like I'm not broken after all.";

/**
 * Apply block swaps to a prompt and HARD FAIL if any didn't land.
 *
 * The block-swap path in main() guards `prompt.includes(currentBlock)` and skips the
 * candidate on drift. `improvedPrompt` has no such guard — a stale block would silently
 * evaluate the UNCHANGED prompt against itself and report "no clear diff", which reads
 * like a real negative result. This makes that failure loud instead.
 */
function swapAll(prompt: string, swaps: Array<[string, string]>): string {
  let out = prompt;
  for (const [from, to] of swaps) {
    if (!out.includes(from)) {
      throw new Error(
        `v1-funnel-eval: candidate block not found verbatim — prompts.ts drifted.\n` +
        `Expected block:\n---\n${from}\n---\nUpdate the case in eval-readings.ts.`,
      );
    }
    out = out.replace(from, to);
  }
  return out;
}

// ── pitch candidate: the two block swaps ─────────────────────────────────────
const PITCH_VISION_CURRENT =
`1. Paint their SPECIFIC vision vividly - use their exact words:
   - Their vision was: "${pitchUd.desires}"
   - "I see you [specific detail from their vision]... [add sensory detail]..."
   - Examples:
     - "I see you at 50, ${ud.firstName}... passport in hand, that weight of bills finally lifted."
     - "I see the connection between you restored... the distance melting away."
   - Make it feel REAL and IMMINENT`;

const PITCH_VISION_IMPROVED =
`1. Paint their SPECIFIC vision vividly, in THEIR OWN words:
   - Their vision was: "${pitchUd.desires}"
   - Echo the concrete phrase THEY used, then add ONE sensory detail that belongs to that scene.
   - Do NOT open with the stock frame "I see you…" — find a fresher way in.
   - Do NOT borrow another seeker's imagery (travel, passports, bills, a restored distance). Their vision is about ${ud.bucket}, in the words they actually said.
   - No invented biography: no ages, dates, jobs, places, or named people they never gave.
   - Make it feel REAL and IMMINENT`;

const PITCH_CROSSROADS_CURRENT =
`2. End with a CROSSROADS question (not a statement):
   - "This is your crossroads, dear. Will you step toward that freedom?"
   - "The path is before you, ${ud.firstName}. Will you walk it?"
   - "Your future self is waiting. Will you meet them?"
   - Must END with a question that invites action`;

const PITCH_CROSSROADS_IMPROVED =
`2. End with a CROSSROADS question (not a statement), built from THEIR OWN vision words ("${pitchUd.desires}") — say the specific thing they said they want back to them, then ask them to step toward THAT.
   - It must be a question only THIS seeker could be asked. If it could be pasted onto a different seeker unchanged, it has FAILED.
   - BANNED (they read as a script): "this is your crossroads", "will you step toward that freedom", "the path is before you", "will you walk it", "your future self is waiting", "will you meet them".
   - Must END with a question that invites action`;

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
  {
    id: 'pitch',
    phase: 'The close / offer (valueExplain)',
    // The judge is told "the seeker just said X" — at this beat that is their VISION.
    input: pitchUd.desires!,
    prompt: buildValueExplainPrompt(pitchUd),
    // ⚠ RUBRIC CORRECTED 2026-07-20. The original criterion 1 was
    //   "Names the offering clearly (the clearing ritual + the personalized reading + the guarantee)"
    // which this prompt can NEVER satisfy — it is explicitly instructed
    //   "Do NOT repeat offer details, price, or guarantee" (prompts.ts:1015),
    // because the offer/price/guarantee are delivered by DETERMINISTIC canned copy
    // (getOfferExplanation / getPitchMessages), not by the LLM. The old rubric scored
    // this prompt for a job that belongs to a different component, guaranteeing a fail.
    // "Improving" the prompt to satisfy it would have made the live funnel WORSE by
    // making the close repeat the price it had just quoted.
    // These criteria score what valueExplain is actually FOR: paint THEIR vision, then
    // ask an earned crossroads question.
    rubric: [
      'The vision message reuses the seeker\'s OWN vision words concretely — not a generic "I see you…" template.',
      "The closing question anchors on THIS seeker's stated desire; it could not be pasted onto a different seeker unchanged.",
      'It avoids the scripted crossroads lines: "this is your crossroads", "the path is before you", "your future self is waiting", "will you walk it", "will you meet them".',
      "Stays in Evelyn's warm, invitational voice — never pushy, aggressive, or manipulative.",
      'Correctly does NOT restate the price or the guarantee (delivered separately), and invents no biographical facts the seeker never gave.',
    ],
    // CANDIDATE — BOTH messages. The close is a canned template twice over:
    //   msg 1 opens on the stock frame "I see you…" and offers two worked examples that
    //         are OFF-BUCKET for this seeker (travel/bills = money, restored distance =
    //         someone), inviting the model to borrow another seeker's imagery; and
    //   msg 2 is the crossroads question with three verbatim script lines.
    // Banning the script and forcing an anchor on the seeker's own words is exactly what
    // took reading-specificity 1.5→3 and crisis-framing 1→4. Applied to both here.
    improvedPrompt: swapAll(buildValueExplainPrompt(pitchUd), [
      [PITCH_VISION_CURRENT, PITCH_VISION_IMPROVED],
      [PITCH_CROSSROADS_CURRENT, PITCH_CROSSROADS_IMPROVED],
    ]),
  },
  {
    id: 'objection',
    phase: 'Objection handling — "too expensive" (1st)',
    input: "That's a lot of money for me right now",
    prompt: buildObjectionPrompt(ud, "That's a lot of money for me right now", 1),
    rubric: [
      'Acknowledges the money concern with genuine empathy — never shames or guilt-trips.',
      'Reframes around value / the cost of staying stuck, not high-pressure or fear-only tactics.',
      "Stays in Evelyn's gentle voice and does not turn salesy or aggressive.",
      'Does not fabricate facts the seeker never gave, and does not misquote a price.',
    ],
  },
  {
    id: 'palm-identity',
    phase: 'Reading 1 — fb-palm derail fix (identity carry)',
    input: ud.concern!,
    prompt: buildReading1Prompt(ud, ud.concern!),             // pre-fix: identity NOT carried → generic love read
    improvedPrompt: buildReading1Prompt(palmUd, ud.concern!), // post-fix: palm identity carried into the builder
    rubric: [
      'The reading calls back to the seeker\'s palm identity — their archetype/mark ("the gathering heart", a trident / three lines rising to one) — not just generic love language.',
      'It ties the read to that specific palm image, so it could NOT be swapped verbatim onto a non-palm visitor.',
      'It reflects feelings/patterns only — it does NOT invent dated biographical facts (names, dates, jobs) the seeker never gave.',
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
  let improvedWins = 0, beforeAfter = 0;
  for (const c of cases) {
    const cur = await scoreArm(c, c.prompt);
    if (c.improvedPrompt || (c.currentBlock && c.improvedBlock)) {
      // before/after A/B — either a full candidate prompt (improvedPrompt) or a text block-swap
      let improvedPromptStr: string;
      if (c.improvedPrompt) {
        improvedPromptStr = c.improvedPrompt;
      } else {
        if (!c.prompt.includes(c.currentBlock!)) {
          console.log(`🔴 ${c.id}: current block not found verbatim (prompt drifted) — candidate skipped.`);
          rows.push(`| ${c.id} | ${cur.quality}/5 (${cur.pass}/${cur.total}) | — | ⚠️ prompt drift |`);
          continue;
        }
        improvedPromptStr = c.prompt.replace(c.currentBlock!, c.improvedBlock!);
      }
      beforeAfter++;
      const imp = await scoreArm(c, improvedPromptStr);
      const better = imp.quality > cur.quality + 0.25;
      if (better) improvedWins++;
      const verdict = better ? '✅ IMPROVED better' : imp.quality < cur.quality - 0.25 ? '🔴 IMPROVED worse' : '➖ no clear diff';
      console.log(`${c.id} (${c.phase})`);
      console.log(`  current : quality ${cur.quality}/5 · rubric ${cur.pass}/${cur.total}`);
      console.log(`  improved: quality ${imp.quality}/5 · rubric ${imp.pass}/${imp.total}   → ${verdict}\n`);
      rows.push(`| ${c.id} | ${cur.quality}/5 (${cur.pass}/${cur.total}) | ${imp.quality}/5 (${imp.pass}/${imp.total}) | ${verdict} |`);
    } else {
      // baseline-only: score the LIVE prompt against the rubric (ready for a candidate later)
      console.log(`${c.id} (${c.phase})`);
      console.log(`  baseline: quality ${cur.quality}/5 · rubric ${cur.pass}/${cur.total}\n`);
      rows.push(`| ${c.id} | ${cur.quality}/5 (${cur.pass}/${cur.total}) | (baseline) | — |`);
    }
  }

  const report =
    `# v1-funnel-eval — reading quality\n\n` +
    `Model ${GEN_MODEL} · ${TRIALS} trial(s)/arm · judged by ${JUDGE_MODEL}\n\n` +
    `| case | current | improved | verdict |\n|---|---|---|---|\n${rows.join('\n')}\n\n` +
    `Improved won ${improvedWins}/${beforeAfter} before/after case(s); the rest are baseline scores. ` +
    `Quality = LLM-judged 0-5; rubric = criteria passed.\n` +
    `Never ships to prod — this scores a candidate prompt change; a human applies the winner.\n`;
  writeFileSync(`${OUT_DIR}/report.md`, report);
  console.log(report);
  console.log(`wrote ${OUT_DIR}/report.md\n`);
}

main().catch((e) => { console.error('EVAL ERROR:', e.message); process.exit(1); });
