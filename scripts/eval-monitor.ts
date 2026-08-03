/**
 * Live-transcript monitor — READ-ONLY audit of real production sessions.
 *
 * Pulls actual customer sessions from the last N days (default 7) and writes the
 * transcripts as-is for rubric scoring. No replay, no eval users, no engine calls,
 * no API cost — this audits what the live AI actually said to real customers.
 *
 *   npx tsx scripts/eval-monitor.ts --label monitor-2026-07-08              # last 7 days
 *   npx tsx scripts/eval-monitor.ts --label x --days 14                     # wider window
 *   npx tsx scripts/eval-monitor.ts --label x --persona evelyn-cross        # one persona
 *   npx tsx scripts/eval-monitor.ts --label x --complaints-only             # only flagged sessions
 *   npx tsx scripts/eval-monitor.ts --label x --min-turns 2 --n 20          # sampling knobs
 *   npx tsx scripts/eval-monitor.ts --label x --experiment persona_prompt_evelyn_2026
 *     # tag each session with its A/B variant (via experiment_exposures) and
 *     # split the aggregate signals per variant — the live A/B readout
 *
 * READ-ONLY GUARANTEE (enforced by Postgres, not by trust in this code):
 *   1. Every query runs inside an explicit `BEGIN TRANSACTION READ ONLY` — the
 *      server rejects any INSERT/UPDATE/DELETE with SQLSTATE 25006. This holds
 *      even behind the Supabase transaction pooler, where session-level SETs
 *      don't stick.
 *   2. Startup canary: the script ATTEMPTS a no-op write and aborts the entire
 *      run unless Postgres refuses it. If enforcement is ever broken, the run
 *      dies before touching any data.
 *
 * Auto-signals per session (mechanical pre-scan; rubric scoring stays human/Claude):
 *   - complaint keywords in USER turns: ai-doubt / refund / extraction-fatigue
 *   - question-only ratio of persona turns, and did the session end on a question
 *   - refund asks: did a reply surface the support inbox (hi@theseerwithin.com) + /refund
 *   - fabricated contact details (any email/handle that isn't the real support path)
 *   - verbatim-repeated persona messages
 *
 * PII: outputs contain real customer content → improve-v2/transcripts/monitor/
 * (inside the transcripts corpus, which is gitignored wholesale). Never commit.
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_BASE = path.join(ROOT, 'improve-v2/transcripts/monitor');

function arg(name: string, dflt?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
}

const LABEL = arg('label') ?? `monitor-${new Date().toISOString().slice(0, 10)}`;
const DAYS = parseInt(arg('days', '7')!, 10);
const MIN_TURNS = parseInt(arg('min-turns', '3')!, 10);
const PERSONA = arg('persona');
const EXP_KEY = arg('experiment');
const COMPLAINTS_ONLY = process.argv.includes('--complaints-only');
// Default: 40 most-recent sessions. --n 0 = everything in the window.
// --complaints-only scans the whole window by default (flagged sessions are rare).
const N = parseInt(arg('n', COMPLAINTS_ONLY ? '0' : '40')!, 10);

// Deliberately NOT importing server/lib/db — that module is shared with the app
// and carries write helpers. This pool is monitor-only.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
  connectionTimeoutMillis: 5000,
});

/** Every statement runs in its own explicit READ ONLY transaction. */
async function roQuery(sql: string, params: any[] = []): Promise<pg.QueryResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN TRANSACTION READ ONLY');
    const res = await client.query(sql, params);
    await client.query('COMMIT');
    return res;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Abort the run unless Postgres actively refuses a write. */
async function proveReadOnly(): Promise<void> {
  try {
    // WHERE false = would touch zero rows even if it ran; Postgres still rejects
    // the statement kind itself inside a READ ONLY transaction.
    await roQuery(`UPDATE users SET id = id WHERE false`);
  } catch (e: any) {
    if (e.code === '25006' || /read-only transaction/i.test(e.message)) {
      console.log('✓ read-only proven: Postgres rejected the canary write (25006)');
      return;
    }
    throw e; // some other failure — surface it
  }
  console.error('✗ ABORT: canary write was NOT rejected — read-only enforcement is broken.');
  process.exit(1);
}

// ---------- complaint keyword scan (USER turns) ----------

const COMPLAINT_PATTERNS: { cat: string; re: RegExp }[] = [
  { cat: 'ai-doubt', re: /\bbots?\b|\brobots?\b|chat ?bot|\bA\.?I\.?\b|artificial intelligence|are you (even )?(real|human)|not (a )?real person|talking to a (machine|computer)|automated|copy.?past\w*|scripted|generic (answer|response|message)|same (answer|message|thing|response)s? (again|every|each)/i },
  { cat: 'refund', re: /refunds?|money back|charged? me|dispute|chargeback|get my money|cancel my (subscription|account|membership)/i },
  { cat: 'extraction-fatigue', re: /too many questions|stop asking|just tell me|quit asking|you keep asking|another question|so many questions|answer (my|the) question/i },
];

function scanComplaints(text: string): string[] {
  return COMPLAINT_PATTERNS.filter(p => p.re.test(text)).map(p => p.cat);
}

// Canonical support inbox = hi@theseerwithin.com since 2026-07-10 (dev commits
// deaf79d/e479288/1931134). Older transcripts legitimately contain the previous
// address, so a refund ask counts as answered if EITHER was surfaced.
const SUPPORT_EMAILS = ['hi@theseerwithin.com', 'support@cosmonumerology.com'];
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const HANDLE_RE = /\$[A-Za-z][A-Za-z0-9_]{3,}/g; // cashtag-style invented payment handles

/** Ask-only = every sentence in the turn is a question (pure interrogation).
 * Distinct from Q-only (ends in "?"): give-then-ask turns — a verdict/insight
 * followed by a question — end in "?" too, and repeat-buyer evidence says those
 * are the GOOD pattern. Ask-only is the one the v2 prompt must eliminate. */
function isAskOnly(text: string): boolean {
  // strip markdown emphasis so ".*" / "._" don't hide sentence boundaries
  const plain = text.replace(/[*_]/g, '');
  const sentences = plain.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(s => s.length > 1);
  if (!sentences.length) return false;
  return sentences.every(s => s.endsWith('?'));
}

async function main() {
  console.log(`Monitor run "${LABEL}" — real sessions from the last ${DAYS} day(s), read-only`);
  await proveReadOnly();

  const params: any[] = [DAYS, MIN_TURNS];
  let variantSelect = `'-' as variant,`;
  let variantJoin = '';
  if (EXP_KEY) {
    params.push(EXP_KEY);
    variantSelect = `coalesce(ee.variant, '-') as variant,`;
    variantJoin = `left join experiment_exposures ee
       on ee.experiment_key = $${params.length} and ee.subject_id = cs.user_id`;
  }
  let personaFilter = '';
  if (PERSONA) { params.push(PERSONA); personaFilter = `and p.slug = $${params.length}`; }
  let limit = '';
  if (N > 0) { params.push(N); limit = `limit $${params.length}`; }

  const sessions = (await roQuery(
    `select cs.id, cs.started_at::text as started_at, p.slug, p.display_name,
            ${variantSelect}
            u.first_name, u.email, m.uc as user_turns
     from chat_sessions cs
     join users u on u.id = cs.user_id
     join personas p on p.id = cs.persona_id
     join (select session_id, count(*) uc from chat_messages
           where role = 'user' group by session_id) m on m.session_id = cs.id
     ${variantJoin}
     where u.email not like '%@eval.internal'
       and cs.started_at >= now() - make_interval(days => $1)
       and m.uc >= $2
       ${personaFilter}
     order by cs.started_at desc
     ${limit}`, params)).rows;

  if (!sessions.length) {
    console.log('No sessions matched the window/filters.');
    process.exit(0);
  }
  console.log(`${sessions.length} session(s) in window (>= ${MIN_TURNS} user turns)\n`);

  const outDir = path.join(OUT_BASE, LABEL);
  mkdirSync(outDir, { recursive: true });

  const summary: string[] = [
    `# Monitor run: ${LABEL}`,
    `window: last ${DAYS} day(s)   captured: ${new Date().toISOString()}   read-only: canary-verified`,
    `sessions: ${sessions.length}${PERSONA ? `   persona: ${PERSONA}` : ''}${COMPLAINTS_ONLY ? '   (complaints-only)' : ''}`,
    '',
    `| session | persona |${EXP_KEY ? ' variant |' : ''} user turns | Q-only | ask-only | ends on ? | flags |`,
    `|---|---|${EXP_KEY ? '---|' : ''}---|---|---|---|---|`,
  ];
  const newTotals = () => ({ sessions: 0, aiDoubt: 0, refund: 0, extraction: 0, refundUnanswered: 0, fabricated: 0, repeats: 0, qRatioSum: 0, askOnlySum: 0, endsOnQ: 0 });
  const totalsByVariant = new Map<string, ReturnType<typeof newTotals>>();

  for (const s of sessions) {
    const msgs = (await roQuery(
      `select role, content, sent_at::text as sent_at from chat_messages
       where session_id = $1 order by sent_at`, [s.id])).rows;

    // --- mechanical signals ---
    const personaMsgs = msgs.filter(m => m.role !== 'user');
    const userMsgs = msgs.filter(m => m.role === 'user');

    const qOnly = personaMsgs.filter(m => m.content.trim().endsWith('?')).length;
    const qRatio = personaMsgs.length ? qOnly / personaMsgs.length : 0;
    const askOnly = personaMsgs.filter(m => isAskOnly(m.content)).length;
    const askOnlyRatio = personaMsgs.length ? askOnly / personaMsgs.length : 0;
    const endsOnQuestion = msgs.length > 0
      && msgs[msgs.length - 1].role !== 'user'
      && msgs[msgs.length - 1].content.trim().endsWith('?');

    const complaintCats = new Set<string>();
    for (const m of userMsgs) scanComplaints(m.content).forEach(c => complaintCats.add(c));

    // refund ask answered? (real path = support email; /refund link is a plus)
    let refundUnanswered = false;
    if (complaintCats.has('refund')) {
      const surfaced = personaMsgs.some(m =>
        SUPPORT_EMAILS.some(e => m.content.toLowerCase().includes(e)));
      refundUnanswered = !surfaced;
    }

    // fabricated contact details in persona turns
    const fabricated: string[] = [];
    for (const m of personaMsgs) {
      for (const e of m.content.match(EMAIL_RE) ?? []) {
        if (!SUPPORT_EMAILS.includes(e.toLowerCase())) fabricated.push(e);
      }
      fabricated.push(...(m.content.match(HANDLE_RE) ?? []));
    }

    // verbatim-repeated persona messages
    const seen = new Map<string, number>();
    for (const m of personaMsgs) {
      const norm = m.content.trim().toLowerCase();
      if (norm.length > 40) seen.set(norm, (seen.get(norm) ?? 0) + 1);
    }
    const repeats = [...seen.values()].filter(n => n > 1).length;

    if (COMPLAINTS_ONLY && complaintCats.size === 0) continue;

    // --- transcript file ---
    const lines: string[] = [];
    lines.push(`# MONITOR ${s.id.slice(0, 8)} — ${s.display_name} (${s.slug})`);
    lines.push(`run: ${LABEL}   session: ${s.id}   started: ${s.started_at}${EXP_KEY ? `   experiment: ${EXP_KEY} variant ${s.variant}` : ''}`);
    lines.push(`user: ${s.first_name ?? '?'} <${s.email}>   user turns: ${s.user_turns}`);
    lines.push(`signals: Q-only ${(qRatio * 100).toFixed(0)}% (${qOnly}/${personaMsgs.length})   ask-only ${(askOnlyRatio * 100).toFixed(0)}% (${askOnly}/${personaMsgs.length})` +
      `${endsOnQuestion ? '   ⚑ ends on persona question' : ''}` +
      `${complaintCats.size ? `   ⚑ complaints: ${[...complaintCats].join(', ')}` : ''}` +
      `${refundUnanswered ? '   ⚑ REFUND ASKED, SUPPORT PATH NEVER SURFACED' : ''}` +
      `${fabricated.length ? `   ⚑ fabricated contact: ${[...new Set(fabricated)].join(', ')}` : ''}` +
      `${repeats ? `   ⚑ ${repeats} verbatim-repeated persona message(s)` : ''}`);
    lines.push(`\nThis is the LIVE production transcript (what the AI actually sent). Score with the persona-audit rubric.\n\n---\n`);

    for (const m of msgs) {
      const who = m.role === 'user' ? 'USER' : 'PERSONA';
      const cats = m.role === 'user' ? scanComplaints(m.content) : [];
      lines.push(`**${who}${cats.length ? `  ⚑ ${cats.join(', ')}` : ''}:**\n${m.content}\n`);
    }

    const file = path.join(outDir, `${s.slug.split('-')[0]}-${s.id.slice(0, 8)}.md`);
    writeFileSync(file, lines.join('\n'));

    // --- summary row + totals ---
    const flags = [
      ...complaintCats,
      ...(refundUnanswered ? ['REFUND-UNANSWERED'] : []),
      ...(fabricated.length ? ['FABRICATED-CONTACT'] : []),
      ...(repeats ? [`${repeats}x-repeat`] : []),
    ];
    summary.push(`| ${s.id.slice(0, 8)} | ${s.slug} |${EXP_KEY ? ` ${s.variant} |` : ''} ${s.user_turns} | ${(qRatio * 100).toFixed(0)}% | ${(askOnlyRatio * 100).toFixed(0)}% | ${endsOnQuestion ? 'YES' : 'no'} | ${flags.join(', ') || '—'} |`);
    const bucket = EXP_KEY ? s.variant : 'all';
    if (!totalsByVariant.has(bucket)) totalsByVariant.set(bucket, newTotals());
    const totals = totalsByVariant.get(bucket)!;
    totals.sessions++;
    totals.qRatioSum += qRatio;
    totals.askOnlySum += askOnlyRatio;
    if (endsOnQuestion) totals.endsOnQ++;
    if (complaintCats.has('ai-doubt')) totals.aiDoubt++;
    if (complaintCats.has('refund')) totals.refund++;
    if (complaintCats.has('extraction-fatigue')) totals.extraction++;
    if (refundUnanswered) totals.refundUnanswered++;
    if (fabricated.length) totals.fabricated++;
    if (repeats) totals.repeats++;
    console.log(`${s.id.slice(0, 8)}  ${s.slug.padEnd(14)}${EXP_KEY ? ` [${s.variant}]` : ''} ${String(s.user_turns).padStart(3)} turns  Q-only ${(qRatio * 100).toFixed(0).padStart(3)}%  ask-only ${(askOnlyRatio * 100).toFixed(0).padStart(3)}%  ${flags.join(', ') || ''}`);
  }

  for (const [variant, totals] of [...totalsByVariant.entries()].sort()) {
    summary.push('', `## Aggregate${EXP_KEY ? ` — variant ${variant}${variant === '-' ? ' (not enrolled)' : ''}` : ''}`,
      `- sessions written: ${totals.sessions}`,
      `- avg Q-only ratio: ${totals.sessions ? (100 * totals.qRatioSum / totals.sessions).toFixed(0) : 0}%   avg ask-only ratio: ${totals.sessions ? (100 * totals.askOnlySum / totals.sessions).toFixed(0) : 0}%`,
      `- ended on a persona question: ${totals.endsOnQ}/${totals.sessions}`,
      `- ai-doubt complaints: ${totals.aiDoubt}`,
      `- refund asks: ${totals.refund} (${totals.refundUnanswered} never got the support path — must be 0)`,
      `- extraction-fatigue complaints: ${totals.extraction}`,
      `- sessions with fabricated contact details: ${totals.fabricated} (must be 0)`,
      `- sessions with verbatim repeats: ${totals.repeats}`);
  }
  writeFileSync(path.join(outDir, '_summary.md'), summary.join('\n'));
  console.log(`\nTranscripts → improve-v2/transcripts/monitor/${LABEL}/ (gitignored — real customer content)`);
  await pool.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
