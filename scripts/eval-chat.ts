/**
 * Eval harness runner — improve-v2/eval
 *
 * Runs the frozen test cases in improve-v2/eval/cases.json against the REAL chat
 * engine (initSession → sendMessage) using throwaway eval users, and saves full
 * transcripts to improve-v2/eval/runs/<label>/.
 *
 *   npx tsx scripts/eval-chat.ts --label baseline-preflight          # full suite
 *   npx tsx scripts/eval-chat.ts --label smoke --case refund-support # one case
 *   npx tsx scripts/eval-chat.ts --dry                               # list cases
 *
 * Rules:
 *  - Run the FULL suite once as `baseline-preflight` BEFORE any Wave-1 fix ships.
 *  - Never edit an existing case after baseline capture; add new ones instead.
 *  - Eval users are real DB rows (email *@eval.internal) — exclude from KPI queries.
 */
import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/lib/db';
import { users, personas, userMemory, experimentExposures } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { initSession, sendMessage } from '../server/lib/chatEngine';
import { endChatSession } from '../server/lib/creditTracking';
import { assign } from '../server/lib/experiments';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVAL_DIR = path.join(ROOT, 'improve-v2/eval');

type EvalCase = {
  id: string;
  persona: string;
  firstName: string;
  title: string;
  tests: string[];
  memory?: string;
  turns: string[];
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function runCase(
  c: EvalCase,
  label: string,
  personaId: string,
  experiment?: { key: string; variant: string },
): Promise<string> {
  const email = `eval-${c.id}-${label}@eval.internal`.toLowerCase();

  // Fresh eval user per case per run (re-runs of same label reuse the user — delete first)
  await db.delete(users).where(eq(users.email, email));
  const insertUser = async () => {
    const [u] = await db.insert(users).values({
      email,
      firstName: c.firstName,
      coinBalance: 6000, // 100 min — billing never interferes
      confirmed18Plus: true,
      emailVerified: true,
      accountStatus: 'active',
    }).returning({ id: users.id });
    return u;
  };
  let user = await insertUser();

  // --experiment mode: sticky bucketing is a hash of (userId, key), so re-roll the
  // user id until this eval user lands on the REQUESTED arm. Requires the runner
  // to have force-listed the (draft) key in EXPERIMENT_FORCE_RUNNING (main() does).
  if (experiment) {
    let assigned = '';
    for (let attempt = 0; attempt < 60; attempt++) {
      const a = await assign(experiment.key, user.id, { personaId });
      if (!a?.enrolled) throw new Error(`experiment ${experiment.key} did not enrol eval user — is it draft+force-listed or running, and scoped to this persona?`);
      assigned = a.variant;
      if (assigned === experiment.variant) break;
      await db.delete(users).where(eq(users.id, user.id));
      user = await insertUser();
    }
    if (assigned !== experiment.variant) {
      throw new Error(`could not bucket eval user onto variant ${experiment.variant} of ${experiment.key} after 60 attempts (weights too skewed?)`);
    }
  }

  // Seed saga memory for returning-user cases
  if (c.memory) {
    await db.insert(userMemory).values({
      userId: user.id,
      personaId,
      memoryType: 'session_summary',
      summary: c.memory,
      importance: 8,
      category: 'general',
    });
  }

  const lines: string[] = [];
  lines.push(`# ${c.id} — ${c.title}`);
  lines.push(`run: ${label}   persona: ${c.persona}   captured: ${new Date().toISOString()}`);
  lines.push(`checks: ${c.tests.join(' · ')}`);
  if (experiment) lines.push(`experiment: ${experiment.key} → variant ${experiment.variant} (forced for eval)`);
  if (c.memory) lines.push(`seeded memory: ${c.memory}`);
  lines.push('\n---\n');

  let sessionId: string | null = null;
  try {
    const init = await initSession({ userId: user.id, personaId });
    sessionId = init.sessionId;
    lines.push(`**GREETING (${init.personaName}):**\n${init.greeting}\n`);

    for (let i = 0; i < c.turns.length; i++) {
      const turn = c.turns[i];
      lines.push(`**USER [${i + 1}/${c.turns.length}]:**\n${turn}\n`);
      try {
        const res = await sendMessage(sessionId, user.id, turn);
        lines.push(`**${c.persona.toUpperCase()}:**\n${res.message}\n`);
        // The engine strips [TAROT_DRAW] from the text and returns it as a flag —
        // without this line, card-draw offers are invisible in eval transcripts.
        if (res.tarotDraw) lines.push(`_(offered an interactive card draw — [TAROT_DRAW])_\n`);
        if (!res.sessionActive) {
          lines.push(`_(session ended by engine after this turn)_\n`);
          break;
        }
      } catch (e: any) {
        lines.push(`**[ERROR on turn ${i + 1}]:** ${e.message}\n`);
        break;
      }
    }
  } catch (e: any) {
    lines.push(`**[INIT ERROR]:** ${e.message}\n`);
  } finally {
    if (sessionId) {
      try { await endChatSession(sessionId); } catch { /* best effort */ }
    }
    // Eval exposures must never pollute the live experiment's tally.
    if (experiment) {
      try { await db.delete(experimentExposures).where(eq(experimentExposures.subjectId, user.id)); } catch { /* best effort */ }
    }
  }
  return lines.join('\n');
}

async function main() {
  const label = arg('label') ?? 'unlabeled';
  const onlyCase = arg('case');
  const onlyPersona = arg('persona'); // filter to one persona's cases (e.g. evelyn-cross)
  const dry = process.argv.includes('--dry');

  // --experiment <key> [--variant B]: run cases against a prompt-experiment arm.
  // Force-list the key in THIS process only, so a draft experiment resolves for
  // eval users while staying byte-identical (draft) for production traffic.
  const expKey = arg('experiment');
  const expVariant = arg('variant') ?? 'B';
  const experiment = expKey ? { key: expKey, variant: expVariant } : undefined;
  if (expKey) {
    process.env.EXPERIMENT_FORCE_RUNNING = [process.env.EXPERIMENT_FORCE_RUNNING, expKey]
      .filter(Boolean)
      .join(',');
  }

  const { cases } = JSON.parse(readFileSync(path.join(EVAL_DIR, 'cases.json'), 'utf8')) as { cases: EvalCase[] };
  let selected = onlyCase ? cases.filter(c => c.id === onlyCase) : cases;
  if (onlyPersona) selected = selected.filter(c => c.persona === onlyPersona);
  if (!selected.length) { console.error(`No case matches ${onlyCase ? `"${onlyCase}"` : ''}${onlyPersona ? ` persona="${onlyPersona}"` : ''}`); process.exit(1); }

  console.log(`Eval run "${label}" — ${selected.length} case(s), ${selected.reduce((a, c) => a + c.turns.length, 0)} total turns`);
  if (dry) { selected.forEach(c => console.log(`  ${c.id} (${c.persona}, ${c.turns.length} turns)`)); process.exit(0); }

  const personaRows = await db.select({ id: personas.id, slug: personas.slug }).from(personas);
  const personaBySlug = new Map(personaRows.map(p => [p.slug, p.id]));

  const outDir = path.join(EVAL_DIR, 'runs', label);
  // Guard the frozen synthetic baseline.
  if (label === 'baseline-preflight' && existsSync(path.join(outDir, '_summary.md')) && !process.argv.includes('--force')) {
    console.error(`Refusing to overwrite the frozen baseline "${label}". Use a new --label, or --force to override.`);
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });

  const summary: string[] = [`# Eval run: ${label}`, `captured: ${new Date().toISOString()}`, ''];
  for (const c of selected) {
    const personaId = personaBySlug.get(c.persona);
    if (!personaId) { console.log(`SKIP ${c.id}: persona ${c.persona} not found`); continue; }
    process.stdout.write(`running ${c.id} (${c.turns.length} turns)... `);
    const t0 = Date.now();
    const transcript = await runCase(c, label, personaId, experiment);
    writeFileSync(path.join(outDir, `${c.id}.md`), transcript);
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    const errored = transcript.includes('[ERROR') || transcript.includes('[INIT ERROR]');
    console.log(`done in ${secs}s${errored ? '  ⚠ contains errors' : ''}`);
    summary.push(`- ${c.id} — ${c.turns.length} turns, ${secs}s${errored ? ' — ⚠ ERRORS' : ''}`);
  }
  writeFileSync(path.join(outDir, '_summary.md'), summary.join('\n'));
  console.log(`\nTranscripts → improve-v2/eval/runs/${label}/`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
