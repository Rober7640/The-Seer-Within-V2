/**
 * Churn transcript exporter — builds the study corpus for improve-v2.
 *
 * Shortlists users who did NOT continue purchasing credits, ranks them by
 * study value, and exports their full V2 chat transcripts + a CSV index to
 * improve-v2/transcripts/ (gitignored — contains PII, never commit).
 *
 * Cohorts:
 *   C  paid-and-bailed   — 1 purchase, >=10 min balance stranded, inactive 7d+   (strongest signal)
 *   B  one-and-done      — 1 purchase >14d ago, credits consumed, never rebought
 *   A  free-trial churn  — never bought, burned free minutes, >=20 messages
 *   X  complaint-flagged — refund/scam/unhelpful/AI-doubt/question-fatigue language, any cohort
 *   D  contrast          — 3+ purchases (what a WORKING relationship looks like)
 *
 * Usage:
 *   npx tsx scripts/churn-transcript-export.ts             # default caps (C:all B:50 A:40 X:40 D:8)
 *   npx tsx scripts/churn-transcript-export.ts --caps 17,20,20,20,5
 *
 * Read-only against the DB. Re-run any time; it rebuilds the folder.
 */
import 'dotenv/config';
import pg from 'pg';
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../improve-v2/transcripts');
const capsArg = process.argv.indexOf('--caps');
const [CAP_C, CAP_B, CAP_A, CAP_X, CAP_D] =
  capsArg > -1 ? process.argv[capsArg + 1].split(',').map(Number) : [Infinity, 50, 40, 40, 8];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const ts = (d: any) => (d ? new Date(d).toISOString().replace('T', ' ').slice(0, 16) + 'Z' : '—');
const min = (coins: number) => (coins / 60).toFixed(1);

type Row = {
  id: string; email: string; first_name: string; coin_balance: number; total_coins_used: number;
  created_at: Date; n_purchases: number; last_p: Date | null; spent_cents: number;
  n_msgs: number; last_msg: Date | null;
  refund_flag: boolean; scam_flag: boolean; qfatigue_flag: boolean; unhelpful_flag: boolean; aidoubt_flag: boolean;
  cohort?: string;
};

const FLAGS: [keyof Row, string][] = [
  ['refund_flag', 'refund'], ['scam_flag', 'scam'], ['qfatigue_flag', 'question-fatigue'],
  ['unhelpful_flag', 'unhelpful'], ['aidoubt_flag', 'ai-doubt'],
];
const flagList = (r: Row) => FLAGS.filter(([k]) => r[k]).map(([, label]) => label);

async function main() {
  console.log('Loading per-user stats (messages, purchases, complaint flags)...');
  const { rows } = await pool.query<Row>(`
    with buyer as (
      select user_id, count(*)::int n_purchases, max(created_at) last_p, sum(price_usd)::int spent_cents
      from credit_purchases where status = 'completed' group by user_id
    ),
    msg as (
      select user_id, count(*)::int n_msgs, max(sent_at) last_msg,
        bool_or(role='user' and content ~* 'refund|money back|my money') refund_flag,
        bool_or(role='user' and content ~* '\\mscam|waste of|rip.?off') scam_flag,
        bool_or(role='user' and content ~* 'too many questions|so many questions|stop asking|100 questions') qfatigue_flag,
        bool_or(role='user' and content ~* 'not help|no help|didn.t help|useless') unhelpful_flag,
        bool_or(role='user' and content ~* '\\man ai\\M|a robot|chatbot|chat bot|is this ai|are you ai|are you real') aidoubt_flag
      from chat_messages group by user_id
    )
    select u.id, u.email, u.first_name, u.coin_balance, u.total_coins_used, u.created_at,
           coalesce(b.n_purchases,0) n_purchases, b.last_p, coalesce(b.spent_cents,0) spent_cents,
           m.n_msgs, m.last_msg,
           coalesce(m.refund_flag,false) refund_flag, coalesce(m.scam_flag,false) scam_flag,
           coalesce(m.qfatigue_flag,false) qfatigue_flag, coalesce(m.unhelpful_flag,false) unhelpful_flag,
           coalesce(m.aidoubt_flag,false) aidoubt_flag
    from users u
    join msg m on m.user_id = u.id
    left join buyer b on b.user_id = u.id`);
  console.log(`${rows.length} users with at least one chat message.`);

  const now = Date.now(), day = 864e5;
  const age = (d: Date | null) => (d ? (now - new Date(d).getTime()) / day : Infinity);
  const anyFlag = (r: Row) => FLAGS.some(([k]) => r[k]);

  // Cohort assignment (first match wins; X catches flagged users from any bucket)
  const picked = new Map<string, Row>();
  const take = (cohort: string, list: Row[], cap: number) => {
    let n = 0;
    for (const r of list) {
      if (picked.has(r.id)) continue;
      if (n >= cap) break;
      r.cohort = cohort; picked.set(r.id, r); n++;
    }
    console.log(`cohort ${cohort}: ${n}`);
  };

  const C = rows.filter(r => r.n_purchases === 1 && r.coin_balance >= 600 && age(r.last_p) > 7 && age(r.last_msg) > 7)
                .sort((a, b) => b.coin_balance - a.coin_balance);
  const B = rows.filter(r => r.n_purchases === 1 && age(r.last_p) > 14 && r.coin_balance < 300)
                .sort((a, b) => (+anyFlag(b) - +anyFlag(a)) || b.n_msgs - a.n_msgs);
  const A = rows.filter(r => r.n_purchases === 0 && age(r.created_at) > 7 && r.n_msgs >= 20)
                .sort((a, b) => (+anyFlag(b) - +anyFlag(a)) || b.n_msgs - a.n_msgs);
  const X = rows.filter(anyFlag)
                .sort((a, b) => new Date(b.last_msg!).getTime() - new Date(a.last_msg!).getTime());
  const D = rows.filter(r => r.n_purchases >= 3).sort((a, b) => b.n_msgs - a.n_msgs);

  take('C', C, CAP_C); take('B', B, CAP_B); take('A', A, CAP_A); take('X', X, CAP_X); take('D', D, CAP_D);

  // Wipe previous export (keep .gitignore), write fresh corpus
  mkdirSync(OUT_DIR, { recursive: true });
  for (const f of readdirSync(OUT_DIR)) if (f !== '.gitignore') unlinkSync(path.join(OUT_DIR, f));

  const csv: string[] = ['cohort,user_id,email,first_name,messages,purchases,spent_usd,balance_min,used_min,signed_up,last_active,flags'];
  let done = 0;
  for (const r of [...picked.values()].sort((a, b) => a.cohort!.localeCompare(b.cohort!) || b.n_msgs - a.n_msgs)) {
    const purchases = (await pool.query(
      `select package_type, coins_purchased, bonus_coins, price_usd, status, created_at
       from credit_purchases where user_id = $1 order by created_at`, [r.id])).rows;
    const sessions = (await pool.query(
      `select cs.id, cs.started_at, cs.ended_at, cs.duration_seconds, cs.coins_charged, cs.status,
              cs.last_bucket, p.display_name persona
       from chat_sessions cs left join personas p on p.id = cs.persona_id
       where cs.user_id = $1 order by cs.started_at`, [r.id])).rows;
    const personaBySession = new Map(sessions.map((s: any) => [s.id, s.persona || 'SEER']));
    const msgs = (await pool.query(
      `select session_id, role, content, sent_at from chat_messages
       where user_id = $1 order by sent_at`, [r.id])).rows;

    const out: string[] = [];
    out.push(`COHORT ${r.cohort}   user ${r.id}`);
    out.push(`name: ${r.first_name}   signed_up: ${ts(r.created_at)}   last_active: ${ts(r.last_msg)}`);
    out.push(`purchases: ${r.n_purchases} ($${(r.spent_cents / 100).toFixed(2)})   balance: ${min(r.coin_balance)} min   used: ${min(r.total_coins_used)} min   messages: ${r.n_msgs}`);
    out.push(`flags: ${flagList(r).join(', ') || '—'}`);
    out.push(`\n--- PURCHASES (${purchases.length}) ---`);
    for (const p of purchases)
      out.push(`${ts(p.created_at)}  $${(p.price_usd / 100).toFixed(2)}  ${p.package_type}  ${p.coins_purchased}+${p.bonus_coins} coins  [${p.status}]`);
    out.push(`\n--- SESSIONS (${sessions.length}) ---`);
    for (const s of sessions)
      out.push(`${s.persona ?? '?'}  ${ts(s.started_at)} → ${ts(s.ended_at)}  ${s.duration_seconds}s  ${s.coins_charged} coins  ${s.status}  bucket:${s.last_bucket ?? '—'}`);
    out.push(`\n--- TRANSCRIPT (${msgs.length} messages) ---`);
    let lastSession = '';
    for (const m of msgs) {
      if (m.session_id !== lastSession) { out.push(`\n===== session ${m.session_id.slice(0, 8)} (${personaBySession.get(m.session_id) ?? '?'}) =====`); lastSession = m.session_id; }
      out.push(`\n[${ts(m.sent_at)}] ${m.role === 'user' ? 'USER' : String(personaBySession.get(m.session_id) ?? 'SEER').toUpperCase()}:`);
      out.push(m.content);
    }

    const fname = `${r.cohort}-${String(r.n_msgs).padStart(3, '0')}msgs-${r.id.slice(0, 8)}.txt`;
    writeFileSync(path.join(OUT_DIR, fname), out.join('\n'));
    csv.push([r.cohort, r.id, r.email, JSON.stringify(r.first_name), r.n_msgs, r.n_purchases,
      (r.spent_cents / 100).toFixed(2), min(r.coin_balance), min(r.total_coins_used),
      ts(r.created_at), ts(r.last_msg), JSON.stringify(flagList(r).join('|'))].join(','));
    done++;
  }

  writeFileSync(path.join(OUT_DIR, 'shortlist.csv'), csv.join('\n'));
  console.log(`\nExported ${done} transcripts + shortlist.csv → ${OUT_DIR}`);
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
