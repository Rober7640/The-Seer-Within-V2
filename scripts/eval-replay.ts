/**
 * Real-conversation replay — before/after on ACTUAL customer questions.
 *
 * Takes real sessions from the churn corpus, extracts the customer's messages in
 * original order, and feeds the EXACT same questions to the live engine with a
 * throwaway eval user. Output interleaves, per turn:
 *   USER (real customer message) → THEN (historical reply) → NOW (replay reply)
 *
 *   npx tsx scripts/eval-replay.ts --label replay-baseline               # auto-select churn set
 *   npx tsx scripts/eval-replay.ts --label x --sessions <uuid,uuid>      # explicit sessions
 *   npx tsx scripts/eval-replay.ts --label x --max-turns 30              # cap turns/session
 *   npx tsx scripts/eval-replay.ts --label x --pick recent --n 8         # freshest real sessions
 *   npx tsx scripts/eval-replay.ts --label x --pick random --n 8         # random real sessions
 *   npx tsx scripts/eval-replay.ts --label x --pick long   --n 8         # longest real sessions
 *   npx tsx scripts/eval-replay.ts --label x --pick persona:marcus-stone --n 5
 *   npx tsx scripts/eval-replay.ts --label x --pick buyer  --n 8         # sessions from paying users
 *
 * Selection (auto): the founding-case user's paid session + longest session of the
 * top users per churn cohort (C, B, A, X) + 1 D contrast, from improve-v2/transcripts/shortlist.csv.
 *
 * PII: outputs contain real customer content → written to improve-v2/transcripts/replays/
 * (gitignored). Never commit.
 *
 * Caveat: historical turns responded to the OLD replies; late turns can drift out of
 * context under a changed system. Weight early turns highest; drift on complaint
 * lines ("you ask too many questions") often means the new system fixed the cause.
 */
import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, pool } from '../server/lib/db';
import { users, userMemory, experimentExposures } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { initSession, sendMessage } from '../server/lib/chatEngine';
import { endChatSession } from '../server/lib/creditTracking';
import { assign } from '../server/lib/experiments';

// --experiment <key> [--variant B]: replay against a prompt-experiment arm. The
// key is force-listed in THIS process only (EXPERIMENT_FORCE_RUNNING), so a draft
// experiment resolves for replay users while production stays on the base prompt.
const EXP_KEY = (() => {
  const i = process.argv.indexOf('--experiment');
  return i > -1 ? process.argv[i + 1] : undefined;
})();
const EXP_VARIANT = (() => {
  const i = process.argv.indexOf('--variant');
  return i > -1 ? process.argv[i + 1] : 'B';
})();
if (EXP_KEY) {
  process.env.EXPERIMENT_FORCE_RUNNING = [process.env.EXPERIMENT_FORCE_RUNNING, EXP_KEY]
    .filter(Boolean)
    .join(',');
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_BASE = path.join(ROOT, 'improve-v2/transcripts/replays');
const SHORTLIST = path.join(ROOT, 'improve-v2/transcripts/shortlist.csv');

function arg(name: string, dflt?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
}

const MAX_TURNS = parseInt(arg('max-turns', '40')!, 10);

async function pickSessions(): Promise<string[]> {
  const explicit = arg('sessions');
  if (explicit) return explicit.split(',').map(s => s.trim());

  // --pick <mode> [--n <count>]: sample FRESH real sessions from the DB each run.
  // Excludes eval/replay synthetic users. min 6 user-messages per session.
  const pick = arg('pick');
  if (pick) {
    const n = parseInt(arg('n', '8')!, 10);
    const [mode, param] = pick.split(':');
    const base = `
      from chat_sessions cs
      join users u on u.id = cs.user_id
      join personas p on p.id = cs.persona_id
      join (select session_id, count(*) uc from chat_messages where role='user' group by session_id having count(*) >= 6) m
        on m.session_id = cs.id
      where u.email not like '%@eval.internal'`;
    let q: string, params: any[] = [n];
    if (mode === 'recent')      q = `select cs.id ${base} order by cs.started_at desc limit $1`;
    else if (mode === 'long')   q = `select cs.id ${base} order by m.uc desc limit $1`;
    else if (mode === 'random') q = `select cs.id ${base} order by md5(cs.id) limit $1`;
    else if (mode === 'buyer')  q = `select cs.id ${base} and cs.user_id in (select user_id from credit_purchases where status='completed') order by md5(cs.id) limit $1`;
    else if (mode === 'persona'){ q = `select cs.id ${base} and p.slug = $2 order by cs.started_at desc limit $1`; params = [n, param]; }
    else throw new Error(`unknown --pick mode "${mode}" (recent|long|random|buyer|persona:<slug>)`);
    const r = await pool.query(q, params);
    if (!r.rows.length) throw new Error(`--pick ${pick} matched no sessions`);
    return r.rows.map(x => x.id);
  }

  // From shortlist.csv: top-2 users by message count per cohort C/B/A/X + top-1 D
  const rows = readFileSync(SHORTLIST, 'utf8').trim().split('\n').slice(1)
    .map(l => { const p = l.split(','); return { cohort: p[0], userId: p[1], msgs: parseInt(p[4], 10) }; });
  const wanted: string[] = [];
  for (const [cohort, take] of [['C', 2], ['B', 2], ['A', 2], ['X', 2], ['D', 1]] as [string, number][]) {
    const top = rows.filter(r => r.cohort === cohort).sort((a, b) => b.msgs - a.msgs).slice(0, take);
    wanted.push(...top.map(t => t.userId));
  }
  // Longest session (by user-message count, min 6) for each selected user
  const sessions: string[] = [];
  for (const uid of wanted) {
    const r = await pool.query(
      `select cm.session_id, count(*) n from chat_messages cm
       where cm.user_id = $1 and cm.role = 'user'
       group by cm.session_id having count(*) >= 6
       order by n desc limit 1`, [uid]);
    if (r.rows[0]) sessions.push(r.rows[0].session_id);
  }
  return sessions;
}

async function replaySession(origSessionId: string, label: string): Promise<{ file: string; turns: number; errors: boolean }> {
  // Original session context
  const meta = (await pool.query(
    `select cs.user_id, cs.persona_id, p.slug, p.display_name, u.first_name
     from chat_sessions cs
     join personas p on p.id = cs.persona_id
     join users u on u.id = cs.user_id
     where cs.id = $1`, [origSessionId])).rows[0];
  if (!meta) throw new Error(`session ${origSessionId} not found`);

  // Full original message stream, in order
  const orig = (await pool.query(
    `select role, content, sent_at from chat_messages
     where session_id = $1 order by sent_at`, [origSessionId])).rows;

  // Pair each user turn with the historical assistant reply(ies) that followed it
  type Pair = { user: string; then: string[] };
  const pairs: Pair[] = [];
  let current: Pair | null = null;
  for (const m of orig) {
    if (m.role === 'user') { current = { user: m.content, then: [] }; pairs.push(current); }
    else if (current) current.then.push(m.content);
  }
  const turns = pairs.slice(0, MAX_TURNS);

  // Eval user, with the original user's memory for this persona copied in (fidelity approximation)
  const email = `replay-${origSessionId.slice(0, 8)}-${label}@eval.internal`.toLowerCase();
  await db.delete(users).where(eq(users.email, email));
  const insertUser = async () => {
    const [u] = await db.insert(users).values({
      email, firstName: meta.first_name, coinBalance: 12000,
      confirmed18Plus: true, emailVerified: true, accountStatus: 'active',
    }).returning({ id: users.id });
    return u;
  };
  let evalUser = await insertUser();

  // Bucketing is a sticky hash of (userId, key) — re-roll the user id until this
  // replay user lands on the requested experiment arm.
  if (EXP_KEY) {
    let assigned = '';
    for (let attempt = 0; attempt < 60; attempt++) {
      const a = await assign(EXP_KEY, evalUser.id, { personaId: meta.persona_id });
      if (!a?.enrolled) throw new Error(`experiment ${EXP_KEY} did not enrol replay user — draft+force-listed or running, and scoped to this persona?`);
      assigned = a.variant;
      if (assigned === EXP_VARIANT) break;
      await db.delete(users).where(eq(users.id, evalUser.id));
      evalUser = await insertUser();
    }
    if (assigned !== EXP_VARIANT) throw new Error(`could not bucket replay user onto variant ${EXP_VARIANT} of ${EXP_KEY} after 60 attempts`);
  }

  const mems = (await pool.query(
    `select memory_type, summary, full_context, importance, category from user_memory
     where user_id = $1 and (persona_id = $2 or persona_id is null)`,
    [meta.user_id, meta.persona_id])).rows;
  for (const m of mems) {
    await db.insert(userMemory).values({
      userId: evalUser.id, personaId: meta.persona_id, memoryType: m.memory_type,
      summary: m.summary, fullContext: m.full_context, importance: m.importance, category: m.category,
    });
  }

  const lines: string[] = [];
  lines.push(`# REPLAY ${origSessionId.slice(0, 8)} — ${meta.display_name} (${meta.slug})`);
  lines.push(`run: ${label}   original session: ${origSessionId}   original user: ${meta.user_id}`);
  if (EXP_KEY) lines.push(`experiment: ${EXP_KEY} → variant ${EXP_VARIANT} (forced for replay)`);
  lines.push(`turns replayed: ${turns.length}/${pairs.length}   memories copied: ${mems.length}   captured: ${new Date().toISOString()}`);
  lines.push(`\nFormat per turn: USER (real customer) → THEN (historical reply) → NOW (this replay)\n\n---\n`);

  let errors = false;
  let sessionId: string | null = null;
  try {
    const init = await initSession({ userId: evalUser.id, personaId: meta.persona_id });
    sessionId = init.sessionId;
    lines.push(`**NOW-GREETING:**\n${init.greeting}\n`);

    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      lines.push(`\n### Turn ${i + 1}/${turns.length}`);
      lines.push(`**USER:**\n${t.user}\n`);
      lines.push(`**THEN:**\n${t.then.join('\n\n') || '(no historical reply recorded)'}\n`);
      try {
        const res = await sendMessage(sessionId, evalUser.id, t.user);
        lines.push(`**NOW:**\n${res.message}\n`);
        // [TAROT_DRAW] is stripped from text and returned as a flag — log it or
        // draw offers are invisible in replay transcripts.
        if (res.tarotDraw) lines.push(`_(offered an interactive card draw — [TAROT_DRAW])_\n`);
        if (!res.sessionActive) { lines.push(`_(engine ended session here)_`); break; }
      } catch (e: any) {
        lines.push(`**NOW:** [ERROR] ${e.message}\n`);
        errors = true;
        if (/SESSION_ENDED|OUT_OF_CREDITS/.test(e.message)) break;
      }
    }
  } catch (e: any) {
    lines.push(`**[INIT ERROR]** ${e.message}`);
    errors = true;
  } finally {
    if (sessionId) { try { await endChatSession(sessionId); } catch { /* best effort */ } }
    // Replay exposures must never pollute the live experiment's tally.
    if (EXP_KEY) {
      try { await db.delete(experimentExposures).where(eq(experimentExposures.subjectId, evalUser.id)); } catch { /* best effort */ }
    }
  }

  const outDir = path.join(OUT_BASE, label);
  mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${meta.slug.split('-')[0]}-${origSessionId.slice(0, 8)}.md`);
  writeFileSync(file, lines.join('\n'));
  return { file, turns: turns.length, errors };
}

async function main() {
  const label = arg('label') ?? 'unlabeled';
  // Guard the frozen baseline — it is the permanent "before" reference.
  const existing = path.join(OUT_BASE, label, '_summary.md');
  if (label === 'replay-baseline' && existsSync(existing) && !process.argv.includes('--force')) {
    console.error(`Refusing to overwrite the frozen baseline "${label}". Use a new --label (e.g. after-window-fix), or --force to override.`);
    process.exit(1);
  }
  const sessions = await pickSessions();
  console.log(`Replay run "${label}" — ${sessions.length} real sessions, max ${MAX_TURNS} turns each`);
  const summary: string[] = [`# Replay run: ${label}`, `captured: ${new Date().toISOString()}`, ''];
  for (const s of sessions) {
    process.stdout.write(`replaying ${s.slice(0, 8)}... `);
    const t0 = Date.now();
    try {
      const r = await replaySession(s, label);
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`${r.turns} turns in ${secs}s${r.errors ? '  ⚠ errors' : ''}`);
      summary.push(`- ${s} — ${r.turns} turns, ${secs}s${r.errors ? ' — ⚠ ERRORS' : ''}`);
    } catch (e: any) {
      console.log(`FAILED: ${e.message}`);
      summary.push(`- ${s} — FAILED: ${e.message}`);
    }
  }
  mkdirSync(path.join(OUT_BASE, label), { recursive: true });
  writeFileSync(path.join(OUT_BASE, label, '_summary.md'), summary.join('\n'));
  console.log(`\nReplays → improve-v2/transcripts/replays/${label}/ (gitignored — real customer content)`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
