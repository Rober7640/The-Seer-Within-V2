/**
 * Purchase-transcript extractor — READ-ONLY audit of what preceded each purchase.
 *
 * Pulls every completed credit purchase in the last N hours (default 12), and for
 * each buyer writes the full transcripts of their sessions in the 48h before the
 * purchase plus anything started after it, with a 💳 PURCHASE marker inline in the
 * timeline. Also pins the experiment flip time (weights change) so each session's
 * turns can be split pre/post-flip.
 *
 *   npx tsx scripts/eval-purchases.ts --label purchases-12h --hours 12
 *
 * READ-ONLY GUARANTEE: identical to scripts/eval-monitor.ts — every query runs in
 * an explicit `BEGIN TRANSACTION READ ONLY` and the run aborts at startup unless
 * Postgres actively rejects a canary write (SQLSTATE 25006).
 *
 * PII: outputs contain real customer content → improve-v2/transcripts/monitor/
 * (gitignored wholesale). Never commit.
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

const LABEL = arg('label') ?? 'purchases-12h';
const HOURS = parseInt(arg('hours', '12')!, 10);
const EXP_KEY = arg('experiment', 'persona_prompt_evelyn_2026')!;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
  connectionTimeoutMillis: 5000,
});

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

async function proveReadOnly(): Promise<void> {
  try {
    await roQuery(`UPDATE users SET id = id WHERE false`);
  } catch (e: any) {
    if (e.code === '25006' || /read-only transaction/i.test(e.message)) {
      console.log('✓ read-only proven: Postgres rejected the canary write (25006)');
      return;
    }
    throw e;
  }
  console.error('✗ ABORT: canary write was NOT rejected — read-only enforcement is broken.');
  process.exit(1);
}

function isAskOnly(text: string): boolean {
  const plain = text.replace(/[*_]/g, '');
  const sentences = plain.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(s => s.length > 1);
  if (!sentences.length) return false;
  return sentences.every(s => s.endsWith('?'));
}

function mins(a: string, b: string): number {
  return Math.round((new Date(b + 'Z').getTime() - new Date(a + 'Z').getTime()) / 60000);
}

async function main() {
  console.log(`Purchase extractor "${LABEL}" — completed purchases in the last ${HOURS}h, read-only`);
  await proveReadOnly();

  // ── experiment state + flip-time evidence ──────────────────────────────────
  const exp = (await roQuery(
    `select key, status, variants, winner_variant, started_at::text, ended_at::text, updated_at::text
     from experiments where key = $1`, [EXP_KEY])).rows[0];
  const expoStats = (await roQuery(
    `select variant, count(*)::int as n,
            min(created_at)::text as first_at, max(created_at)::text as last_at
     from experiment_exposures where experiment_key = $1
     group by variant order by variant`, [EXP_KEY])).rows;
  // last exposures overall — post-flip every NEW enrolment must be B
  const lastExpos = (await roQuery(
    `select variant, created_at::text from experiment_exposures
     where experiment_key = $1 order by created_at desc limit 15`, [EXP_KEY])).rows;

  console.log('\nEXPERIMENT', JSON.stringify(exp, null, 2));
  console.log('exposures by variant:', JSON.stringify(expoStats));
  console.log('last 15 exposures:', JSON.stringify(lastExpos));

  // ── purchases in window ─────────────────────────────────────────────────────
  const purchases = (await roQuery(
    `select cp.id, cp.user_id, cp.package_type, cp.coins_purchased, cp.bonus_coins,
            cp.price_usd, cp.created_at::text as created_at,
            p.slug as persona_slug,
            u.first_name, u.email,
            hist.n_purchases, hist.total_cents,
            ee.variant as exposure_variant, ee.created_at::text as exposed_at
     from credit_purchases cp
     join users u on u.id = cp.user_id
     left join personas p on p.id = cp.persona_id
     left join lateral (
       select count(*)::int as n_purchases, sum(price_usd)::int as total_cents
       from credit_purchases h
       where h.user_id = cp.user_id and h.status = 'completed'
     ) hist on true
     left join experiment_exposures ee
       on ee.experiment_key = $2 and ee.subject_id = cp.user_id
     where cp.status = 'completed'
       and cp.created_at >= now() - make_interval(hours => $1)
       and u.email not like '%@eval.internal'
     order by cp.created_at`, [HOURS, EXP_KEY])).rows;

  console.log(`\n${purchases.length} completed purchase(s) in the last ${HOURS}h\n`);
  if (!purchases.length) { await pool.end(); process.exit(0); }

  const outDir = path.join(OUT_BASE, LABEL);
  mkdirSync(outDir, { recursive: true });

  const summary: string[] = [
    `# Purchase extractor run: ${LABEL}`,
    `window: last ${HOURS}h   captured: ${new Date().toISOString()}   read-only: canary-verified`,
    `experiment: ${EXP_KEY}   status: ${exp?.status}   variants: ${JSON.stringify(exp?.variants)}`,
    `winner: ${exp?.winner_variant ?? '—'}   started: ${exp?.started_at}   updated: ${exp?.updated_at}`,
    `exposure counts: ${expoStats.map((r: any) => `${r.variant}=${r.n} (last ${r.last_at})`).join('   ')}`,
    '',
    `| # | buyer | package | $ | persona | purchased at | exposure | lifetime |`,
    `|---|---|---|---|---|---|---|---|`,
  ];

  let i = 0;
  for (const cp of purchases) {
    i++;
    const who = (cp.first_name ?? 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '');
    summary.push(`| ${i} | ${cp.first_name ?? '?'} | ${cp.package_type} | $${(cp.price_usd / 100).toFixed(2)} | ${cp.persona_slug ?? '?'} | ${cp.created_at} | ${cp.exposure_variant ?? '—'} (${cp.exposed_at ?? '—'}) | ${cp.n_purchases}× $${(cp.total_cents / 100).toFixed(2)} |`);

    // sessions: 48h before purchase through 12h after
    const sessions = (await roQuery(
      `select cs.id, cs.started_at::text as started_at, cs.ended_at::text as ended_at,
              cs.status, cs.duration_seconds, cs.coins_charged, cs.last_message_at::text as last_message_at,
              p.slug, p.display_name
       from chat_sessions cs
       join personas p on p.id = cs.persona_id
       where cs.user_id = $1
         and cs.started_at >= $2::timestamp - interval '48 hours'
         and cs.started_at <= $2::timestamp + interval '12 hours'
       order by cs.started_at`, [cp.user_id, cp.created_at])).rows;

    const lines: string[] = [];
    lines.push(`# PURCHASE ${cp.id.slice(0, 8)} — ${cp.first_name ?? '?'} <${cp.email}>`);
    lines.push(`purchased: ${cp.created_at}   package: ${cp.package_type} (${cp.coins_purchased}+${cp.bonus_coins} coins, $${(cp.price_usd / 100).toFixed(2)})   persona: ${cp.persona_slug ?? '?'}`);
    lines.push(`lifetime: ${cp.n_purchases} completed purchase(s), $${(cp.total_cents / 100).toFixed(2)} total`);
    lines.push(`experiment exposure: ${cp.exposure_variant ? `variant ${cp.exposure_variant} first-exposed ${cp.exposed_at}` : 'NOT ENROLLED'}`);
    lines.push(`sessions in window (−48h → +12h): ${sessions.length}`);
    lines.push(`\nNOTE: prompt variant is resolved PER MESSAGE by current weights — split turns by`);
    lines.push(`sent_at vs the flip time, not by the (first-exposure-sticky) exposure row.\n`);

    let purchaseMarkerWritten = false;
    for (const s of sessions) {
      const msgs = (await roQuery(
        `select role, content, sent_at::text as sent_at from chat_messages
         where session_id = $1 order by sent_at`, [s.id])).rows;

      const personaMsgs = msgs.filter((m: any) => m.role !== 'user');
      const qOnly = personaMsgs.filter((m: any) => m.content.trim().endsWith('?')).length;
      const askOnly = personaMsgs.filter((m: any) => isAskOnly(m.content)).length;
      const endsOnQ = msgs.length > 0 && msgs[msgs.length - 1].role !== 'user'
        && msgs[msgs.length - 1].content.trim().endsWith('?');
      const lastAt = msgs.length ? msgs[msgs.length - 1].sent_at : s.started_at;
      const rel = mins(lastAt, cp.created_at); // + = session ended before purchase

      lines.push(`\n---\n`);
      lines.push(`## SESSION ${s.id.slice(0, 8)} — ${s.display_name} (${s.slug})   status: ${s.status}`);
      lines.push(`started: ${s.started_at}   last msg: ${lastAt}   (${rel >= 0 ? `${rel} min BEFORE purchase` : `${-rel} min AFTER purchase`})`);
      lines.push(`coins charged: ${s.coins_charged}   duration: ${s.duration_seconds}s   msgs: ${msgs.length}`);
      lines.push(`signals: Q-only ${personaMsgs.length ? Math.round(100 * qOnly / personaMsgs.length) : 0}% (${qOnly}/${personaMsgs.length})   ask-only ${personaMsgs.length ? Math.round(100 * askOnly / personaMsgs.length) : 0}% (${askOnly}/${personaMsgs.length})${endsOnQ ? '   ⚑ ends on persona question' : ''}\n`);

      for (const m of msgs) {
        if (!purchaseMarkerWritten && m.sent_at > cp.created_at) {
          lines.push(`\n>>> 💳 PURCHASE HERE — ${cp.created_at} (${cp.package_type}, $${(cp.price_usd / 100).toFixed(2)}) <<<\n`);
          purchaseMarkerWritten = true;
        }
        lines.push(`**${m.role === 'user' ? 'USER' : 'PERSONA'}** [${m.sent_at}]:\n${m.content}\n`);
      }
      if (!purchaseMarkerWritten && s === sessions[sessions.length - 1]) {
        lines.push(`\n>>> 💳 PURCHASE — ${cp.created_at} (${cp.package_type}, $${(cp.price_usd / 100).toFixed(2)}) — after all captured messages <<<\n`);
        purchaseMarkerWritten = true;
      }
      console.log(`  ${cp.first_name ?? '?'}  session ${s.id.slice(0, 8)} (${s.slug})  ${msgs.length} msgs  last ${rel >= 0 ? `${rel}m before` : `${-rel}m after`} purchase`);
    }

    const file = path.join(outDir, `${who || 'user'}-${cp.id.slice(0, 8)}.md`);
    writeFileSync(file, lines.join('\n'));
    console.log(`  → ${path.relative(ROOT, file)}   (${sessions.length} sessions)`);
  }

  writeFileSync(path.join(outDir, '_summary.md'), summary.join('\n'));
  console.log(`\nTranscripts → improve-v2/transcripts/monitor/${LABEL}/ (gitignored — real customer content)`);
  await pool.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
