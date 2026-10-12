/**
 * Preview run for the paywall long-copy test — runs the free-trial meter, the
 * final free reply and the "still see" generator (server/lib/paywallTeaser.ts)
 * against REAL Evelyn chats so the copy can be judged before anything is built live.
 *
 *   PREVIEW_RAW_DIR=<scratch dir> npx tsx scripts/preview-paywall-samples.ts pull
 *   PREVIEW_RAW_DIR=<scratch dir> PREVIEW_ROUND=6b npx tsx scripts/preview-paywall-samples.ts generate
 *   PREVIEW_RAW_DIR=<scratch dir> PREVIEW_ROUNDS=6a,6b npx tsx scripts/preview-paywall-samples.ts write
 *
 * Round 6 (2026-10-12): generate runs still-see + HER FACTS first, then each final
 * reply through the round-6 guards (code shape check + Opus fact check → one
 * regeneration); the keep-reading arm is skipped (PREVIEW_KEEP=1 forces it).
 * PREVIEW_ROUND=6a reproduces 6a's checker + ungated regeneration. write for
 * 6x rounds puts the round-6 section on top of PREVIEW_RAW_DIR/samples-r5.md.
 *
 * pull     — PRODUCTION DB, READ ONLY. Every query runs inside BEGIN TRANSACTION
 *            READ ONLY after a canary write that must be rejected (SQLSTATE 25006).
 *            Writes raw transcripts (contain PII) to PREVIEW_RAW_DIR only — never
 *            into the repo. Also records each session's start + starting coins, which
 *            the meter rebuild needs (older raw files: PREVIEW_RAW_DIR/session-meter.json).
 * generate — no DB. Round-5 order, per chat:
 *              1. still-see lines FIRST, from the chat up to her last message
 *                 (validated in code: ≤ 40 chars, quote really in her messages, …;
 *                 one retry with the broken rules listed, then the fallback);
 *              2. the FINAL free reply, TWICE, with still-see line 1 as its thread;
 *              3. the KEEP-READING test: her first guide reply generated while the
 *                 meter read 61–179 s left, regenerated (a) with today's meter and
 *                 prompt and (b) with FREE_TRIAL_KEEP_READING_INSTRUCTION;
 *              then strips names/places. Writes generate-run-r<ROUND>.json to the
 *              scratch dir (holds raw + anonymised text).
 * write    — no API. Builds the local-only fixture (latest round in PREVIEW_ROUNDS)
 *            and the review doc (every round in PREVIEW_ROUNDS + the round-4 history
 *            kept at PREVIEW_RAW_DIR/samples-r4.md). Grades come from
 *            PREVIEW_RAW_DIR/grades-r<ROUND>.json (written by the human/judge read).
 *
 * The meter: checkpointSession bills wall-clock from chat_sessions.started_at in
 * 15-second blocks right before buildMessageContext reads the balance, so the
 * seconds left for a reply = starting coins − secondsToCoins(her message time −
 * started_at), turned back into seconds. The rebuild feeds those coins to the REAL
 * buildMinutesMeterLine / buildFreeTrialMeterLine, so "61–179 s" is exact.
 *
 * Needs DATABASE_URL (pull) and ANTHROPIC_API_KEY (generate) in the environment.
 *
 * Safety: PREVIEW_RAW_DIR must be OUTSIDE any git checkout (it holds raw transcripts
 * with PII) — the script refuses to start otherwise. The fixture and the review doc
 * are written under the repo root whatever folder the script is run from. Every note
 * that quotes generated text (the shape check's opening words, the still-see key-word
 * check) is scrubbed with the rest before it can reach the in-repo review doc.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import { buildMinutesMeterLine } from '../server/lib/minutesMeter';
import { secondsToCoins } from '../shared/types';
import {
  FREE_TRIAL_TEASER_INSTRUCTION,
  FREE_TRIAL_KEEP_READING_INSTRUCTION,
  FREE_TRIAL_KEEP_READING_NOTE,
  FREE_TRIAL_FINAL_REPLY_REMINDER,
  FREE_TRIAL_FINAL_REPLY_NOTE,
  buildFreeTrialFinalReplyNote,
  buildFreeTrialMeterLine,
  freeTrialSystemSuffix,
  buildStillSeeSystem,
  buildStillSeeRequest,
  generateStillSee,
  validateStillSee,
  checkTeaserEnding,
  containsName,
  finalReplyShapeViolations,
  buildFactCheckRequest,
  buildFactCheckSystem,
  buildFinalReplyRetryNote,
  FACT_CHECK_SCHEMA,
  STILL_SEE_MAX_CHARS,
  type FinalReplyThread,
  type HerFacts,
  type InventedDetail,
  type StillSeeLine,
  type TranscriptTurn,
} from '../server/lib/paywallTeaser';

const EVELYN_ID = '7f03b55e-9a35-4bb7-ac80-a5dff7228910';
const PROMPT_EXPERIMENT_KEY = 'persona_prompt_evelyn_2026';
// Same class as the 2026-10-11 CRO query ("gave a practice / closed warmly").
const CLOSURE_RE =
  "(one thing to do|one practice|this week|practically|practice:|proud of you|took courage|here.s what to do|try this|tonight,? (write|light|put|say)|say (it )?out loud|both hands|burn it)";

const ENDING_MODEL_FALLBACK = 'claude-sonnet-4-5-20250929'; // live default_conversation_model
const STILL_SEE_MODEL = 'claude-opus-5-5';
/** Round 6 post-check for invented details (effort low, structured output). */
const FACT_CHECK_MODEL = 'claude-opus-5-5';
const SCRUB_MODEL = 'claude-opus-5-5';
/** ~29 s left: inside the final free minute, where the FINAL REPLY note applies. */
const FINAL_MINUTE_COINS = 149;
const KEEP_MIN_SECONDS = 61;
const KEEP_MAX_SECONDS = 179;
const CONCURRENCY = 4;
/** Round 5a ran the keep-reading arm with the meter-line instruction only; from 5b
 *  the KEEP READING note also goes at the end of the system prompt. */
const KEEP_NOTE_IN_NEW_ARM = ROUND_ENV() !== '5a';
function ROUND_ENV() { return process.env.PREVIEW_ROUND ?? '6a'; }
/** The keep-reading arm is only re-run when its rule changes (not in round 6). */
const RUN_KEEP = process.env.PREVIEW_KEEP === '1' || ROUND_ENV().startsWith('5');

/** The repo root, from this file's own location — never the folder it is run from. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The real path of `p`, resolving symlinks on the part that exists (the raw folder
 *  may not exist yet before `pull`). Lower case on case-insensitive file systems
 *  (for comparing; `fold = false` keeps the case for messages). */
function realish(p: string, fold = true): string {
  let cur = path.resolve(p);
  const rest: string[] = [];
  while (!fs.existsSync(cur)) {
    const up = path.dirname(cur);
    if (up === cur) break;
    rest.unshift(path.basename(cur));
    cur = up;
  }
  const out = path.join(fs.existsSync(cur) ? fs.realpathSync.native(cur) : cur, ...rest);
  return fold && (process.platform === 'darwin' || process.platform === 'win32') ? out.toLowerCase() : out;
}
const isInside = (child: string, parent: string) => {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};
/** The nearest folder at or above `p` that is a git checkout (has a .git entry), if any. */
function enclosingCheckout(p: string): string | null {
  let cur = realish(p, false);
  for (;;) {
    if (fs.existsSync(path.join(cur, '.git'))) return cur;
    const up = path.dirname(cur);
    if (up === cur) return null;
    cur = up;
  }
}

const RAW_DIR_ENV = process.env.PREVIEW_RAW_DIR;
if (!RAW_DIR_ENV) throw new Error('Set PREVIEW_RAW_DIR to a scratch directory outside the repo.');
const RAW_DIR = path.resolve(RAW_DIR_ENV);
// The raw folder holds real transcripts (PII). Inside this repo — or any other git
// checkout, such as the main clone this worktree belongs to — one `git add -A` would
// commit them, so refuse to start.
if (isInside(realish(RAW_DIR), realish(REPO_ROOT))) {
  throw new Error(`PREVIEW_RAW_DIR (${RAW_DIR}) is inside the repo (${REPO_ROOT}). It holds raw transcripts with PII — use a scratch folder outside the repo.`);
}
const rawCheckout = enclosingCheckout(RAW_DIR);
if (rawCheckout) {
  throw new Error(`PREVIEW_RAW_DIR (${RAW_DIR}) is inside a git checkout (${rawCheckout}). It holds raw transcripts with PII — use a scratch folder outside every repo.`);
}
const RAW_FILE = path.join(RAW_DIR, 'raw-samples.json');
const runFile = (round: string) => path.join(RAW_DIR!, `generate-run-r${round}.json`);
const gradesFile = (round: string) => path.join(RAW_DIR!, `grades-r${round}.json`);
const ROUND = process.env.PREVIEW_ROUND ?? '6a';
const ROUNDS = (process.env.PREVIEW_ROUNDS ?? ROUND).split(',').map((r) => r.trim()).filter(Boolean);

// Both are git-ignored (.gitignore) — they hold anonymised real chats.
const FIXTURE_FILE = path.join(REPO_ROOT, 'client/src/components/paywall/preview-samples.local.json');
const REVIEW_FILE = path.join(REPO_ROOT, 'improve-v2/paywall-longcopy/samples.local.md');

interface RawMessage { id: string; role: 'user' | 'assistant'; content: string; sentAt: string }
interface RawSample {
  userId: string;
  firstName: string | null;
  sessionId: string;
  wallAt: string;
  outcome: 'left' | 'bought';
  closure: boolean;
  promptVariant: string | null;
  messages: RawMessage[]; // session messages up to and including the last guide reply before the wall
  /** chat_sessions.started_at (UTC ISO) — the billing clock's zero. */
  sessionStartedAt?: string;
  /** Spendable coins at session start: max(free grant in pricing_applied, coins the session charged). */
  startCoins?: number;
  coinsPerMinute?: number;
}
interface RawFile {
  pulledAt: string;
  canary: string;
  persona: { name: string; slug: string; avatarUrl: string | null; aiModel: string | null; basePrompt: string; variantB: string | null; defaultModel: string | null };
  rating: { avg: number; count: number };
  quotes: { text: string; approved: boolean; persona: string }[];
  samples: RawSample[];
}

// ── pull (read-only) ─────────────────────────────────────────────────────────

/** chat tables store UTC in `timestamp without time zone`. node-pg would parse
 *  those as LOCAL time and shift every round-trip, so keep them as strings. */
pg.types.setTypeParser(1114, (v: string) => v);
const utcIso = (v: string) => new Date(v.replace(' ', 'T') + 'Z').toISOString();

async function pull() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let canary = 'not run';
  try {
    await client.query('BEGIN TRANSACTION READ ONLY');
    await client.query('SAVEPOINT canary');
    try {
      await client.query('CREATE TEMP TABLE _preview_canary(x int)');
      throw new Error('CANARY WRITE SUCCEEDED — transaction is NOT read-only. Aborting.');
    } catch (e: any) {
      if (e?.code !== '25006') throw e;
      canary = 'rejected (SQLSTATE 25006)';
      await client.query('ROLLBACK TO SAVEPOINT canary');
    }

    const persona = (await client.query(
      `select display_name, slug, avatar_url, ai_model, base_system_prompt from personas where id=$1`, [EVELYN_ID],
    )).rows[0];
    const variantB = (await client.query(
      `select v->'payload'->>'systemPrompt' sp from experiments e, jsonb_array_elements(e.variants) v where e.key=$1 and v->>'key'='B'`,
      [PROMPT_EXPERIMENT_KEY],
    )).rows[0]?.sp ?? null;
    const defaultModel = (await client.query(
      `select config_value from system_config where config_key='default_conversation_model'`,
    )).rows[0]?.config_value ?? null;

    const picks = (await client.query(
      `with v as (
         select user_id, min(created_at) t from checkout_views
         where source='buy_credits_modal' and created_at > now() - interval '30 days' group by 1),
       f as (select v.* from v where not exists (
         select 1 from credit_purchases p where p.user_id=v.user_id and p.status='completed' and p.created_at < v.t)),
       lm as (select f.user_id, f.t, m.session_id, m.sent_at last_msg from f
         cross join lateral (select session_id, sent_at from chat_messages m
           where m.user_id=f.user_id and m.sent_at < f.t order by sent_at desc limit 1) m),
       la as (select lm.*, a.content last_ai, a.sent_at ai_at from lm
         cross join lateral (select content, sent_at from chat_messages a
           where a.session_id=lm.session_id and a.role='assistant' and a.sent_at < lm.t
           order by sent_at desc, id desc limit 1) a),
       x as (select la.*,
           exists (select 1 from credit_purchases p where p.user_id=la.user_id and p.status='completed'
                   and p.created_at between la.t and la.t + interval '24 hours') bought,
           (la.last_ai ~* $2) closure
         from la join chat_sessions s on s.id=la.session_id
         where s.persona_id=$1 and la.last_msg > la.t - interval '3 minutes'
           and la.last_ai ~* '\\m(the|you|your)\\M'
           and exists (select 1 from chat_messages u where u.session_id=la.session_id and u.role='user' and u.sent_at < la.ai_at)),
       r as (select x.*, row_number() over (partition by bought, (case when bought then false else closure end)
                                            order by md5(x.user_id)) rn from x)
       select user_id, session_id, t, ai_at, bought, closure from r
       where (not bought and closure and rn <= 3) or (not bought and not closure and rn <= 4) or (bought and rn <= 3)
       order by bought, closure desc, rn`,
      [EVELYN_ID, CLOSURE_RE],
    )).rows;

    const samples: RawSample[] = [];
    for (const p of picks) {
      if (typeof p.ai_at !== 'string') throw new Error('timestamp parser not applied');
      const firstName = (await client.query(`select first_name from users where id=$1`, [p.user_id])).rows[0]?.first_name ?? null;
      const exposure = (await client.query(
        `select variant from experiment_exposures where experiment_key=$1 and subject_id=$2 limit 1`,
        [PROMPT_EXPERIMENT_KEY, p.user_id],
      )).rows[0]?.variant ?? null;
      const msgs = (await client.query(
        `select id, role, content, sent_at from chat_messages where session_id=$1 and sent_at <= $2 order by sent_at, id`,
        [p.session_id, p.ai_at],
      )).rows;
      const sess = (await client.query(
        `select s.started_at, s.coins_charged, s.pricing_applied, p.coins_per_minute
         from chat_sessions s join personas p on p.id=s.persona_id where s.id=$1`, [p.session_id],
      )).rows[0];
      let freeCoins = 0;
      try { freeCoins = Number(JSON.parse(sess?.pricing_applied ?? '{}').freeCoins) || 0; } catch { /* no snapshot */ }
      samples.push({
        userId: p.user_id,
        firstName,
        sessionId: p.session_id,
        wallAt: utcIso(p.t),
        outcome: p.bought ? 'bought' : 'left',
        closure: p.closure,
        promptVariant: exposure,
        messages: msgs.map((m: any) => ({ id: m.id, role: m.role, content: m.content, sentAt: utcIso(m.sent_at) })),
        sessionStartedAt: sess ? utcIso(sess.started_at) : undefined,
        // A session that ran out charged its whole starting balance (5:00 for some
        // trials); one that ended early charged less than the free grant.
        startCoins: sess ? Math.max(freeCoins, Number(sess.coins_charged) || 0) : undefined,
        coinsPerMinute: sess ? Number(sess.coins_per_minute) : undefined,
      });
    }

    const rating = (await client.query(
      `select round(avg(star_rating)::numeric, 2)::float avg, count(*)::int count from session_feedback where persona_id=$1`, [EVELYN_ID],
    )).rows[0];
    const approved = (await client.query(
      `select sf.feedback_text text, p.slug persona from session_feedback sf left join personas p on p.id=sf.persona_id
       where sf.approved and length(coalesce(sf.feedback_text,'')) > 0 order by sf.created_at desc`,
    )).rows;
    const extra = (await client.query(
      `select feedback_text text from session_feedback where persona_id=$1 and star_rating=5 and not coalesce(approved,false)
       and length(coalesce(feedback_text,'')) > 30 order by created_at desc limit 5`, [EVELYN_ID],
    )).rows;

    const raw: RawFile = {
      pulledAt: new Date().toISOString(),
      canary,
      persona: {
        name: persona.display_name, slug: persona.slug, avatarUrl: persona.avatar_url, aiModel: persona.ai_model,
        basePrompt: persona.base_system_prompt, variantB, defaultModel,
      },
      rating,
      quotes: [
        ...approved.map((q: any) => ({ text: q.text, approved: true, persona: q.persona ?? 'unknown' })),
        ...extra.map((q: any) => ({ text: q.text, approved: false, persona: 'evelyn-cross' })),
      ],
      samples,
    };
    fs.mkdirSync(RAW_DIR!, { recursive: true });
    fs.writeFileSync(RAW_FILE, JSON.stringify(raw, null, 2));
    console.log(`canary: ${canary}`);
    console.log(`picked ${samples.length} samples: ${samples.map((s) => `${s.outcome}${s.closure ? '+closure' : ''}/${s.promptVariant ?? 'no-exposure'}`).join(', ')}`);
    console.log(`rating ${rating.avg} from ${rating.count}; quotes ${approved.length} approved + ${extra.length} unapproved`);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
}

// ── meter ───────────────────────────────────────────────────────────────────

interface SessionMeter { startedAt: string; startCoins: number; coinsPerMinute: number }

function loadSessionMeter(s: RawSample): SessionMeter {
  if (s.sessionStartedAt && s.startCoins && s.coinsPerMinute) {
    return { startedAt: s.sessionStartedAt, startCoins: s.startCoins, coinsPerMinute: s.coinsPerMinute };
  }
  const f = path.join(RAW_DIR!, 'session-meter.json');
  const m = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8'))[s.sessionId] : null;
  if (!m) throw new Error(`no session start/coins for ${s.sessionId}: re-run pull or add session-meter.json`);
  return { startedAt: m.startedAt, startCoins: m.startCoins, coinsPerMinute: m.coinsPerMinute };
}

/** Coins she could still spend when the message sent at `at` reached the server. */
function spendableAt(m: SessionMeter, at: string): number {
  const elapsed = Math.max(0, Math.floor((Date.parse(at) - Date.parse(m.startedAt)) / 1000));
  return Math.max(0, m.startCoins - secondsToCoins(elapsed, m.coinsPerMinute));
}
const secondsLeftFor = (coins: number, cpm: number) => Math.floor((coins * 60) / Math.max(1, cpm));

/** The first guide reply (after the greeting) generated with 61–179 s on the meter. */
function findKeepReadingReply(s: RawSample, m: SessionMeter) {
  const msgs = s.messages;
  for (let k = 1; k < msgs.length; k++) {
    if (msgs[k].role !== 'assistant') continue;
    let u = k - 1;
    while (u >= 0 && msgs[u].role !== 'user') u--;
    if (u < 0) continue;
    const coins = spendableAt(m, msgs[u].sentAt);
    const secondsLeft = secondsLeftFor(coins, m.coinsPerMinute);
    if (secondsLeft >= KEEP_MIN_SECONDS && secondsLeft <= KEEP_MAX_SECONDS) {
      const replyNo = msgs.slice(1, k + 1).filter((x) => x.role === 'assistant').length; // replies after the greeting
      return { idx: k, userIdx: u, coins, secondsLeft, replyNo };
    }
  }
  return null;
}

// ── turn rebuild ────────────────────────────────────────────────────────────

/** Pull the fixed guard blocks out of chatEngine.ts so the rebuilt system prompt
 *  matches what production sends (they are module-private constants). */
function loadEngineBlocks() {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'server/lib/chatEngine.ts'), 'utf8');
  const tpl = (name: string) => {
    const m = src.match(new RegExp(`const ${name} = \`([\\s\\S]*?)\`;`));
    if (!m) throw new Error(`could not extract ${name} from chatEngine.ts`);
    return m[1];
  };
  const prelude = src.match(/const CONTEXT_SECURITY_PRELUDE = '([^']*)';/)?.[1];
  if (!prelude) throw new Error('could not extract CONTEXT_SECURITY_PRELUDE');
  const tarot = src.match(/const tarotInstruction = isTarotPersona\s*\?\s*`([\s\S]*?)`\s*:\s*hasCardDrawTool\s*\?\s*`([\s\S]*?)`/);
  if (!tarot) throw new Error('could not extract tarotInstruction');
  const unescape = (s: string) => s.replace(/\\n/g, '\n');
  const reinforcement = src.match(/const PERSONA_REINFORCEMENT = `([\s\S]*?)`;/)?.[1];
  if (!reinforcement) throw new Error('could not extract PERSONA_REINFORCEMENT');
  return {
    prelude,
    guards: ['IDENTITY_PROTECTION', 'READING_ACCURACY_GUARD', 'REPETITION_GUARD', 'PREDICTION_GUARDRAIL', 'PERSONALIZATION_GUARD', 'CONSISTENCY_GUARD'].map(tpl),
    tarotLegacy: unescape(tarot[1]),
    cardDrawTool: unescape(tarot[2]),
    reinforcement,
  };
}

interface TurnOpts {
  /** Index in s.messages of the guide reply being regenerated (it and everything after are dropped). */
  uptoIdx: number;
  /** Full meter line as buildMinutesMeterLine / buildFreeTrialMeterLine return it (leading \n). */
  meterLine: string;
  systemSuffix?: string;
  finalReminder?: string;
  /** Round 6: the one regeneration's note on what the first draft broke. */
  retryNote?: string;
}

/** Approximation of chatEngine.buildMessageContext for the turn that produced the
 *  guide reply at `uptoIdx`. Missing on purpose (documented in the review doc):
 *  intent context, user memories, arrival brief, email canon, soft-crisis note. */
function rebuildTurn(raw: RawFile, s: RawSample, o: TurnOpts) {
  const blocks = loadEngineBlocks();
  const authored = s.promptVariant === 'A' || !raw.persona.variantB ? raw.persona.basePrompt : raw.persona.variantB;
  const msgs = s.messages.slice(0, o.uptoIdx);
  const lastUserIdx = msgs.map((m) => m.role).lastIndexOf('user');
  const inflight = msgs[lastUserIdx];
  let prompt = authored;
  if (prompt.includes('[RUNTIME_CONTEXT]')) {
    const at = new Date(inflight.sentAt);
    const dateLine = `Today's date is ${at.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })} (UTC).`;
    prompt = prompt.replace('[RUNTIME_CONTEXT]', `${dateLine}${o.meterLine}`); // same join as chatEngine
  }
  const isTarot = authored.toLowerCase().includes('tarot');
  const hasCardDrawTool = authored.includes('[CARD_DRAW_TOOL]');
  const tarotInstruction = isTarot ? blocks.tarotLegacy : hasCardDrawTool ? blocks.cardDrawTool : '';
  // systemSuffix sits where sendMessage appends its soft-crisis note: the very end.
  const system = [blocks.prelude, prompt, ...blocks.guards, tarotInstruction].filter(Boolean).join('\n\n') + (o.systemSuffix ?? '');

  // History = everything before the in-flight message, which is appended last
  // (sendMessage excludes the in-flight message from the window, then pushes it).
  const history = msgs.filter((_, i) => i !== lastUserIdx);
  const HEAD = 10, TAIL = 30;
  const head = history.slice(0, HEAD);
  const tail = history.slice(-TAIL).filter((m) => !head.some((h) => h.id === m.id));
  const omitted = Math.max(0, history.length - head.length - tail.length);
  const window = [...head, ...tail];
  const reinforcement = blocks.reinforcement.replace('${personaConfig.displayName}', raw.persona.name);
  const messages: Anthropic.MessageParam[] = [];
  window.forEach((m, i) => {
    if (omitted > 0 && i === head.length) {
      messages.push({ role: 'user', content: `[CONVERSATION NOTE: ${omitted} earlier messages from the middle of this session are not shown. If the client refers to something you can't see, ask them to remind you rather than denying it was said.]` });
      messages.push({ role: 'assistant', content: '(Understood.)' });
    }
    messages.push({ role: m.role, content: m.content });
    if ((i + 1) % 6 === 0 && i < window.length - 1) {
      messages.push({ role: 'user', content: reinforcement });
      messages.push({ role: 'assistant', content: '(Understood, continuing as myself.)' });
    }
  });
  messages.push(o.finalReminder
    ? {
        role: 'user',
        content: [
          { type: 'text', text: inflight.content },
          { type: 'text', text: o.finalReminder },
          ...(o.retryNote ? [{ type: 'text' as const, text: o.retryNote }] : []),
        ],
      }
    : { role: 'user', content: inflight.content });
  return { system, messages };
}

/** Mirrors sendMessage's post-processing of the reply text. */
function parseReply(text: string): string {
  let out = text.trim();
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) out = (JSON.parse(m[0]).message || text).trim();
  } catch { /* keep raw text */ }
  return out.replace(/\[TAROT_DRAW\]/g, '').trim();
}

function textOf(content: Anthropic.ContentBlock[] | any[]): string {
  return content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
}

async function generateReply(anthropic: Anthropic, model: string, raw: RawFile, s: RawSample, o: TurnOpts) {
  return (await generateReplyTimed(anthropic, model, raw, s, o)).text;
}

async function generateReplyTimed(anthropic: Anthropic, model: string, raw: RawFile, s: RawSample, o: TurnOpts) {
  const { system, messages } = rebuildTurn(raw, s, o);
  const t0 = Date.now();
  const res = await anthropic.messages.create({ model, max_tokens: 1000, system, messages });
  return { text: parseReply(textOf(res.content)), ms: Date.now() - t0 };
}

/** Opus 5.5 call with structured output + server-side refusal fallback. The SDK
 *  pinned here (0.71) predates these fields' types, so the body is passed through. */
async function structuredCall(anthropic: Anthropic, model: string, system: string, user: string, schema: object, maxTokens = 2000) {
  const t0 = Date.now();
  const res: any = await (anthropic.beta.messages.create as any)({
    model,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    system,
    messages: [{ role: 'user', content: user }],
  });
  const ms = Date.now() - t0;
  if (res.stop_reason === 'refusal') throw new Error(`refusal: ${JSON.stringify(res.stop_details)}`);
  return { json: JSON.parse(textOf(res.content)), ms, servedBy: res.model as string };
}

const SCRUB_SYSTEM = [
  'You anonymise short texts for an internal review document. For every string you are given:',
  '- Replace every personal name (the client, partners, exes, family, friends, coworkers) with a plain role: "him", "her", "your ex", "your husband", "your sister", "her friend", "the other man". Keep "Evelyn" (the advisor) as is.',
  '- Remove or generalise places (cities, countries, workplaces), exact ages, phone numbers and emails.',
  '- Change nothing else: keep wording, tone, typos, punctuation and length. Return the same keys in the same order. An empty string stays empty.',
].join('\n');

async function scrub(anthropic: Anthropic, fields: Record<string, string>) {
  const schema = {
    type: 'object',
    properties: Object.fromEntries(Object.keys(fields).map((k) => [k, { type: 'string' }])),
    required: Object.keys(fields),
    additionalProperties: false,
  };
  const { json } = await structuredCall(anthropic, SCRUB_MODEL, SCRUB_SYSTEM, JSON.stringify(fields, null, 2), schema, 8000);
  return json as Record<string, string>;
}

const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Mechanical wrap-up markers for the keep-reading test (a human read decides). */
function wrapUpFlags(text: string): string[] {
  const f: string[] = [];
  if (/(this week|tonight,|tomorrow|one thing to do|one practice|practice:|here.s what to do|try this|both hands|hands on your heart|say (it )?out loud|write (one|it|down)|notice (when|what)|watch for|keep choosing|start there|start small)/i.test(text)) f.push('practice/step');
  if (/(take this with you|keep this|hold (on to )?this|remember this|your takeaway|the one thing to hold)/i.test(text)) f.push('takeaway');
  if (/(proud of you|took courage|takes (real )?courage|i.m (always )?here|door stays open|take care|be gentle|until next time|whenever you.re ready|bless)/i.test(text)) f.push('closing warmth');
  if (/(tonight showed|what we.ve (seen|found)|here.s what (tonight|this session|all of this)|so here.s the truth of it|everything you.ve told me)/i.test(text)) f.push('synthesis');
  if (/\b(minutes?|time is|running out|before we close|as we close)\b/i.test(text)) f.push('time talk');
  return f;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

/** Round 6 fact check: a short Opus call listing invented details (and, from 6b,
 *  advice-for-later) in a final reply. */
async function factCheck(anthropic: Anthropic, reply: string, turns: TranscriptTurn[], facts: HerFacts, personaName: string, clientName: string | null) {
  const req = ROUND.startsWith('6a')
    ? buildFactCheckRequest6a(reply, turns, facts, personaName)
    : buildFactCheckRequest(reply, turns, facts, personaName, clientName);
  const res = await structuredCall(anthropic, FACT_CHECK_MODEL, req.system, req.user, req.schema, 1500);
  const list = (xs: any[] | undefined): InventedDetail[] => (xs ?? []).map((d: any) => ({ words: String(d.words ?? ''), why: String(d.why ?? '') }));
  return { invented: list(res.json?.invented), advice: list(res.json?.advice), ms: res.ms, servedBy: res.servedBy };
}

/** 6a's checker, kept so the 6a run stays reproducible: her messages only (no
 *  advisor lines, no name) — it flagged her own first name and context-free "Yes"
 *  answers, and those false flags triggered regenerations that invented details. */
function buildFactCheckRequest6a(reply: string, turns: TranscriptTurn[], facts: HerFacts, personaName: string) {
  const hers = turns.filter((t) => t.role === 'user').map((t) => `- ${t.content.trim().replace(/\s*\n+\s*/g, ' / ')}`);
  const before = facts.knownBefore.length ? facts.knownBefore.map((f) => `- ${f.fact}`) : ['- (none)'];
  const schema = { type: 'object', properties: { invented: FACT_CHECK_SCHEMA.properties.invented }, required: ['invented'], additionalProperties: false };
  return {
    system: FACT_CHECK_SYSTEM_6A(personaName),
    user: ['<client_messages>', ...hers, '</client_messages>', '<known_before>', ...before, '</known_before>', '<reply>', reply.trim(), '</reply>', '', 'List the invented details in the reply.'].join('\n'),
    schema,
  };
}
const FACT_CHECK_SYSTEM_6A = (personaName: string) => {
  const first = personaName.split(' ')[0];
  return [
    `You check one chat reply from ${personaName}, an intuitive advisor, before the client reads it. Find every INVENTED DETAIL: a person, relationship, job detail, place, event or other fact about the client's life, or about the people in it, that the reply states as real but that is not in the client's own messages and not in the KNOWN BEFORE list.`,
    'Invented:',
    '- a person the client never mentioned — a parent, an ex, a friend, someone who hurt her, "the one who…" — or a role or relationship for someone she did mention that she never gave;',
    '- an explanation of her facts that she did not give: who, why, where, how much, how long;',
    '- an upgrade of her facts: work becomes a full-time job, a partner becomes a husband, a year becomes years, once becomes always;',
    '- anything presented as her own words (you said, you told me, you mentioned) that is not in her messages.',
    'Not invented — leave these alone:',
    `- ${first}'s reading: what she sees, senses or reads in the pattern, why it happens, what it means, what a pattern like this tends to lead to, and general statements about people or love;`,
    '- her facts said again in other words, and feelings named as part of the reading;',
    '- facts from the KNOWN BEFORE list, unless the reply presents them as her words.',
    'Return each invented detail with its exact words from the reply and a short reason. Return an empty list when there is none — most replies have none.',
  ].join('\n');
};

type Check = Awaited<ReturnType<typeof factCheck>>;
const problemsOf = (shape: string[], c: Check) => [
  ...shape,
  ...c.invented.map((d) => `it states "${d.words}" as fact, but her messages never give it (${d.why}) — leave it out`),
  ...c.advice.map((d) => `it gives her advice for later: "${d.words}" — leave it out`),
];

/**
 * One final free reply through the round-6 guards, as live would run it:
 *   draft → code shape check (instant) + fact check (one call)
 *   → if either finds a problem: ONE regeneration told what broke.
 * 6a shipped the regeneration unchecked (unless it broke more shape rules). From
 * 6b the regeneration is checked the same way and whichever version has fewer
 * problems ships (a tie goes to the regeneration).
 */
async function finalWithGuards(
  anthropic: Anthropic, model: string, raw: RawFile, s: RawSample, o: TurnOpts,
  turns: TranscriptTurn[], facts: HerFacts,
) {
  const name = s.firstName ?? null;
  const draft = await generateReplyTimed(anthropic, model, raw, s, o);
  const shape = finalReplyShapeViolations(draft.text);
  const check = await factCheck(anthropic, draft.text, turns, facts, raw.persona.name, name);
  const problems = problemsOf(shape, check);
  if (!problems.length) {
    return { draft: draft.text, draftMs: draft.ms, shape, check, regen: null, shipped: 'draft' as const, text: draft.text, liveMs: draft.ms + check.ms };
  }
  const retryNote = buildFinalReplyRetryNote(problems);
  const again = await generateReplyTimed(anthropic, model, raw, s, { ...o, retryNote });
  const shape2 = finalReplyShapeViolations(again.text);
  const check2 = await factCheck(anthropic, again.text, turns, facts, raw.persona.name, name);
  const gated = !ROUND.startsWith('6a');
  const useDraft = gated ? problemsOf(shape2, check2).length > problems.length : shape2.length > shape.length;
  return {
    draft: draft.text, draftMs: draft.ms, shape, check,
    regen: { text: again.text, ms: again.ms, retryNote, shape: shape2, check2 },
    shipped: useDraft ? ('draft' as const) : ('regen' as const),
    text: useDraft ? draft.text : again.text,
    // 6a: live would not wait for the second check; from 6b it does.
    liveMs: draft.ms + check.ms + again.ms + (gated ? check2.ms : 0),
  };
}

async function generate() {
  const raw: RawFile = JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'));
  const anthropic = new Anthropic();
  const endingModel = raw.persona.aiModel || raw.persona.defaultModel || ENDING_MODEL_FALLBACK;

  const samples = await mapLimit(raw.samples, CONCURRENCY, async (s, i) => {
    const id = `s${String(i + 1).padStart(2, '0')}`;
    const meter = loadSessionMeter(s);
    const cpm = meter.coinsPerMinute;
    const last = s.messages.length - 1;
    if (s.messages[last].role !== 'assistant') throw new Error(`${id}: last message is not the guide's`);
    const beforeFinal: TranscriptTurn[] = s.messages.slice(0, last).map((m) => ({ role: m.role, content: m.content }));
    const herLast = [...s.messages].reverse().find((m) => m.role === 'user')!.content;
    const actualEnding = s.messages[last].content;
    const names = [s.firstName ?? ''].filter(Boolean);

    // 3 — keep-reading test, independent of the rest, started first. Round 6 does
    // not re-run it (the rule did not change); PREVIEW_KEEP=1 forces it.
    const pick = RUN_KEEP ? findKeepReadingReply(s, meter) : null;
    const keepP = pick
      ? Promise.all([
          generateReply(anthropic, endingModel, raw, s, { uptoIdx: pick.idx, meterLine: buildMinutesMeterLine(pick.coins, cpm) }),
          generateReply(anthropic, endingModel, raw, s, {
            uptoIdx: pick.idx,
            meterLine: buildFreeTrialMeterLine(pick.coins, cpm),
            systemSuffix: KEEP_NOTE_IN_NEW_ARM ? freeTrialSystemSuffix(pick.coins, cpm) : '',
          }),
        ])
      : Promise.resolve(null);

    // 1 — still-see first (round 6: the same call returns the facts lists).
    const ss = await generateStillSee(
      (req) => structuredCall(anthropic, STILL_SEE_MODEL, req.system, req.user, req.schema),
      beforeFinal, raw.persona.name, { forbiddenNames: names },
    );
    const thread: FinalReplyThread | null = ss.lines?.length
      ? { line: ss.lines[0].line, basis: ss.lines[0].basis, source: ss.lines[0].source }
      : null;

    // 2 — the final free reply, twice, each through the round-6 guards.
    const finalOpts: TurnOpts = {
      uptoIdx: last,
      meterLine: buildFreeTrialMeterLine(FINAL_MINUTE_COINS, cpm),
      systemSuffix: freeTrialSystemSuffix(FINAL_MINUTE_COINS, cpm, thread, ss.facts),
      finalReminder: FREE_TRIAL_FINAL_REPLY_REMINDER,
    };
    const runs = await Promise.all([0, 1].map(() => finalWithGuards(anthropic, endingModel, raw, s, finalOpts, beforeFinal, ss.facts)));
    const finals = runs.map((r) => r.text);
    const keep = await keepP;

    const shown: StillSeeLine[] = ss.lines ?? [];
    const lastAttempt = ss.attempts[ss.attempts.length - 1];
    const keepHer = pick ? s.messages[pick.idx].content : '';
    const factFields = Object.fromEntries([
      ...ss.facts.hers.flatMap((f, k) => [[`hf${k + 1}`, f.fact], [`hq${k + 1}`, f.quote]]),
      ...ss.facts.knownBefore.flatMap((f, k) => [[`kf${k + 1}`, f.fact], [`kq${k + 1}`, f.quote]]),
    ]);
    const runFields = Object.fromEntries(runs.flatMap((r, k) => [
      [`draft${k + 1}`, r.draft],
      [`regen${k + 1}`, r.regen?.text ?? ''],
      ...r.check.invented.map((d, j) => [`c${k + 1}w${j + 1}`, `${d.words} — ${d.why}`]),
      ...r.check.advice.map((d, j) => [`c${k + 1}a${j + 1}`, `${d.words} — ${d.why}`]),
      ...(r.regen?.check2.invented ?? []).map((d, j) => [`d${k + 1}w${j + 1}`, `${d.words} — ${d.why}`]),
      ...(r.regen?.check2.advice ?? []).map((d, j) => [`d${k + 1}a${j + 1}`, `${d.words} — ${d.why}`]),
    ]));
    // Mechanical notes are worked out on the RAW text, and two kinds quote it: the
    // shape check ("…opens with a question word, like a heading ("<her words>…")") and
    // the still-see key-word check ("…share a key word (<word>)"). They go into the
    // review doc, so they are scrubbed with everything else (same call, no extra cost).
    const stillSeeChecks = ss.lines ? validateStillSee(ss.lines, beforeFinal, { forbiddenNames: names }) : lastAttempt.violations;
    const finalChecks = finals.map((f) => checkTeaserEnding(f, { thread: thread?.line ?? null }));
    const actualChecks = checkTeaserEnding(actualEnding);
    const rawNotes = Array.from(new Set([
      ...runs.flatMap((r) => [...r.shape, ...(r.regen?.shape ?? [])]),
      ...ss.attempts.flatMap((a) => a.violations),
      ...stillSeeChecks,
      ...finalChecks.flat(),
      ...actualChecks,
    ]));
    const noteKey = new Map(rawNotes.map((n, k) => [n, `note${k + 1}`]));
    const clean = await scrub(anthropic, {
      ...Object.fromEntries(rawNotes.map((n) => [noteKey.get(n)!, n])),
      // The retry note repeats the raw notes + the fact check's quoted words.
      ...Object.fromEntries(runs.flatMap((r, k) => (r.regen ? [[`retry${k + 1}`, r.regen.retryNote]] : []))),
      herLastMessage: short(herLast, 160),
      actualEnding,
      final1: finals[0],
      final2: finals[1],
      ...Object.fromEntries(shown.flatMap((l, k) => [[`line${k + 1}`, l.line], [`basis${k + 1}`, l.basis], [`quote${k + 1}`, l.quote]])),
      // The failed attempt(s) too, so a fallback or retry is visible in the doc.
      ...Object.fromEntries(ss.attempts.flatMap((a, ai) => a.lines.map((l, k) => [`a${ai + 1}line${k + 1}`, l.line]))),
      ...factFields,
      ...runFields,
      keepHer: short(keepHer, 160),
      keepActual: pick ? s.messages[pick.idx].content : '',
      keepControl: keep?.[0] ?? '',
      keepNew: keep?.[1] ?? '',
    });
    // Unicode-aware whole-word match (José, Zoë…), as the still-see name check.
    const nameLeak = names.some((n) => n.length > 1 && containsName(JSON.stringify(clean), n));
    const sn = (xs: string[]) => xs.map((x) => clean[noteKey.get(x) ?? ''] ?? x);

    const row = {
      id,
      outcome: s.outcome,
      closure: s.closure,
      promptVariant: s.promptVariant,
      trialSeconds: secondsLeftFor(meter.startCoins, cpm),
      herLastMessage: clean.herLastMessage,
      actualEnding: clean.actualEnding,
      finals: [clean.final1, clean.final2],
      finalRejected: [null, null],
      facts: {
        hers: ss.facts.hers.map((_, k) => ({ fact: clean[`hf${k + 1}`], quote: clean[`hq${k + 1}`] })),
        knownBefore: ss.facts.knownBefore.map((_, k) => ({ fact: clean[`kf${k + 1}`], quote: clean[`kq${k + 1}`] })),
        dropped: ss.droppedFacts.length,
      },
      guards: runs.map((r, k) => ({
        shipped: r.shipped,
        draft: clean[`draft${k + 1}`],
        draftWords: wordCount(r.draft),
        draftMs: r.draftMs,
        shape: sn(r.shape),
        check: {
          invented: r.check.invented.map((_, j) => clean[`c${k + 1}w${j + 1}`]),
          advice: r.check.advice.map((_, j) => clean[`c${k + 1}a${j + 1}`]),
          ms: r.check.ms, servedBy: r.check.servedBy,
        },
        regen: r.regen ? {
          text: clean[`regen${k + 1}`],
          ms: r.regen.ms,
          retryNote: clean[`retry${k + 1}`],
          shape: sn(r.regen.shape),
          check2: {
            invented: r.regen.check2.invented.map((_, j) => clean[`d${k + 1}w${j + 1}`]),
            advice: r.regen.check2.advice.map((_, j) => clean[`d${k + 1}a${j + 1}`]),
            ms: r.regen.check2.ms,
          },
        } : null,
        liveMs: r.liveMs,
      })),
      stillSee: ss.lines ? shown.map((l, k) => ({
        line: clean[`line${k + 1}`], rawChars: l.line.length, source: l.source,
        basis: clean[`basis${k + 1}`], quote: clean[`quote${k + 1}`],
      })) : null,
      stillSeeNone: !!ss.lines && ss.lines.length === 0,
      stillSeeAttempts: ss.attempts.map((a, ai) => ({
        lines: a.lines.map((l, k) => ({ line: clean[`a${ai + 1}line${k + 1}`], rawChars: l.line.length, source: l.source })),
        violations: sn(a.violations),
        ms: a.ms,
        servedBy: a.servedBy,
      })),
      stillSeeFallback: !ss.lines,
      stillSeeMs: { first: ss.attempts[0].ms, total: ss.totalMs },
      keep: pick ? {
        replyNo: pick.replyNo,
        secondsLeft: pick.secondsLeft,
        meterControl: buildMinutesMeterLine(pick.coins, cpm).trim(),
        herMessage: clean.keepHer,
        actual: clean.keepActual,
        control: clean.keepControl,
        new: clean.keepNew,
        flags: {
          actual: wrapUpFlags(s.messages[pick.idx].content),
          control: wrapUpFlags(keep![0]),
          new: wrapUpFlags(keep![1]),
        },
      } : null,
      checks: {
        stillSee: sn(stillSeeChecks),
        finals: finalChecks.map(sn),
        finalWords: finals.map(wordCount),
        actualEnding: sn(actualChecks),
        nameLeak,
      },
      /** The notes above went through the scrub (rows from before 2026-10-12 did not —
       *  the doc withholds their quoted words instead; see docNote). */
      notesScrubbed: true,
      // Unscrubbed text for grading. Lives only in the scratch run file (PII) —
      // never written to the fixture or the review doc.
      raw: {
        herLast, finals, thread, facts: ss.facts, droppedFacts: ss.droppedFacts,
        guards: runs,
        lines: ss.lines,
        keepHer, keepActual: pick ? s.messages[pick.idx].content : '', keep,
      },
    };
    const ssTxt = ss.lines ? (shown.length ? shown.map((l) => `${l.line} (${l.line.length})`).join(' / ') : 'NONE (thin chat)') : `FALLBACK after ${ss.attempts.length} attempts`;
    const g = runs.map((r) => `${r.shipped}${r.regen ? `[${[...r.shape, ...r.check.invented.map((d) => `inv:${d.words}`), ...r.check.advice.map((d) => `adv:${d.words}`)].join(',')}]→[${[...r.regen.shape, ...r.regen.check2.invented.map((d) => `inv:${d.words}`), ...r.regen.check2.advice.map((d) => `adv:${d.words}`)].join(',')}]` : ''} ${r.check.ms}ms`).join(' | ');
    console.log(`${id} still-see ${ss.attempts.map((a) => a.ms).join('+')}ms [${ssTxt}] facts ${ss.facts.hers.length}+${ss.facts.knownBefore.length} (dropped ${ss.droppedFacts.length}) | finals ${row.checks.finalWords.join('/')}w | guards ${g}`);
    return row;
  });

  fs.writeFileSync(runFile(ROUND), JSON.stringify({ round: ROUND, generatedAt: new Date().toISOString(), endingModel, factCheckModel: FACT_CHECK_MODEL, samples }, null, 2));
  console.log(`\nwrote ${runFile(ROUND)} (round ${ROUND}, ending model ${endingModel})`);
}

// ── write fixture + review doc from finished rounds ─────────────────────────

/** What changed in each round-5 iteration (shown above that iteration in the doc). */
const ITERATION_NOTES: Record<string, string> = {
  '5a': 'First round-5 version: still-see first (40-char lines, checked quote, retry once then fallback), line 1 handed to the final reply, invention guard, no quoted examples; keep-reading rule in the METER LINE only.',
  '5b': 'Changes from 5a: KEEP READING note added at the END of the system prompt (meter line kept); final reply — one plain sentence for a thanks/agree/"I\'ll try" with no reassurance, no forward hook in PART 1, never upgrade her facts, no general claims about what a man/partner will do, name line 1 in your own words (≤ 2 of its key words), never swap in another thread; still-see — line 1 must not be the question the chat already read or her last message, no key word shared between lines (checked in code), love-in-general counts as not concrete, always 3 lines.',
  '5c': 'Changes tried on top of 5b, then REVERTED because 5c scored worse (final 5/20 vs 9/20; 4 still-see fallbacks, and with no thread the final reply invented one — "your work", "your mother"): the final reply got her exact quote instead of the basis note; a longer reminder; one automatic regeneration when a code check failed (question mark, > 110 words, PART 2 shape, ≥ 80% copy of line 1, a "will" about someone, no "I" in PART 2) — the regenerated draft was not checked again; still-see code checks for a line resting only on her last message, a feeling/love-in-general with no person or thing, and "what we spoke about" wording. The KEEP READING note was unchanged from 5b, so 5c is a second sample of it. Code for 5c is kept outside the repo (scratch).',
};

interface Grade {
  stillSee: { pass: boolean; note: string };
  finals: { pass: boolean; note: string }[];
  keep?: { actual: { wrap: boolean; what: string }; control: { wrap: boolean; what: string }; new: { wrap: boolean; what: string } } | null;
}

const quoteBlock = (s: string) => `> ${s.trim().replace(/\n+/g, '\n> ')}`;
const median = (xs: number[]) => { const a = [...xs].sort((p, q) => p - q); return a.length ? a[Math.floor((a.length - 1) / 2)] : 0; };

function roundStats(run: any, grades: Record<string, Grade>) {
  const s = run.samples as any[];
  const finalRuns = s.flatMap((x) => (grades[x.id]?.finals ?? []).map((g) => g.pass));
  const keepRows = s.filter((x) => x.keep && grades[x.id]?.keep);
  return {
    graded: s.every((x) => grades[x.id]),
    finalPass: finalRuns.filter(Boolean).length,
    finalTotal: s.length * 2,
    bothPass: s.filter((x) => grades[x.id]?.finals?.length === 2 && grades[x.id].finals.every((g) => g.pass)).length,
    stillSeePass: s.filter((x) => grades[x.id]?.stillSee.pass).length,
    keepN: keepRows.length,
    wrapControl: keepRows.filter((x) => grades[x.id].keep!.control.wrap).length,
    wrapNew: keepRows.filter((x) => grades[x.id].keep!.new.wrap).length,
    wrapActual: keepRows.filter((x) => grades[x.id].keep!.actual.wrap).length,
    fallbacks: s.filter((x) => x.stillSeeFallback).length,
    finalRetries: s.reduce((a, x) => a + (x.finalRejected ?? []).filter(Boolean).length, 0),
    retries: s.filter((x) => x.stillSeeAttempts.length > 1).length,
    msFirstMedian: median(s.map((x) => x.stillSeeMs.first)),
    msFirstMax: Math.max(...s.map((x) => x.stillSeeMs.first)),
    msTotalMedian: median(s.map((x) => x.stillSeeMs.total)),
    msTotalMax: Math.max(...s.map((x) => x.stillSeeMs.total)),
  };
}

/**
 * A row's mechanical notes as printed in the review doc. From 2026-10-12 generate
 * scrubs them (notesScrubbed). Older rows hold notes worked out on the RAW text, and
 * two kinds quote it — for those the quoted words are withheld here (no API call at
 * write time) so nothing raw reaches the in-repo doc.
 */
function docNotes(row: any, notes: string[] | undefined): string[] {
  const xs = notes ?? [];
  if (row?.notesScrubbed) return xs;
  return xs.map((n) =>
    n.replace(/like a heading \(".*…"\)/, 'like a heading ("[words withheld]…")').replace(/share a key word \(.*\)$/, 'share a key word'),
  );
}

function writeOutputs() {
  const raw: RawFile = JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'));
  const runs = ROUNDS.map((r) => ({ round: r, run: JSON.parse(fs.readFileSync(runFile(r), 'utf8')) }));
  // Round 6+: its own section on top, the round-5 doc (scratch samples-r5.md) kept below.
  if (runs.every((r) => r.round.startsWith('6'))) return writeRound6(raw, runs);
  const gradesOf = (r: string): Record<string, Grade> => (fs.existsSync(gradesFile(r)) ? JSON.parse(fs.readFileSync(gradesFile(r), 'utf8')) : {});
  // The featured round = the one whose prompts are in the code now (PREVIEW_FEATURED,
  // default the last listed). Every other round is still printed in full below.
  const featured = runs.find((r) => r.round === process.env.PREVIEW_FEATURED) ?? runs[runs.length - 1];
  const fg = gradesOf(featured.round);
  const quotesClean: { text: string; approved: boolean }[] =
    fs.existsSync(path.join(RAW_DIR!, 'quotes-clean.json')) ? JSON.parse(fs.readFileSync(path.join(RAW_DIR!, 'quotes-clean.json'), 'utf8')) : [];
  // Today's wind-down ending did not change in round 5, so the preview's ending=control
  // keeps the round-4 rebuild.
  const r4 = fs.existsSync(runFile('4')) ? JSON.parse(fs.readFileSync(runFile('4'), 'utf8')) : { samples: [] };
  const r4Control = new Map<string, string>(r4.samples.map((x: any) => [x.id, x.controlEnding]));

  const fixture = {
    generatedAt: new Date().toISOString(),
    round: featured.round,
    model: STILL_SEE_MODEL,
    endingModel: featured.run.endingModel,
    persona: { name: raw.persona.name, slug: raw.persona.slug, avatarUrl: raw.persona.avatarUrl, rating: raw.rating.avg, ratingCount: raw.rating.count },
    quotes: quotesClean,
    samples: featured.run.samples.map((s: any) => ({
      id: s.id, outcome: s.outcome, herLastMessage: s.herLastMessage,
      actualEnding: s.actualEnding,
      controlEnding: r4Control.get(s.id) ?? '',
      newEnding: s.finals[0],
      stillSee: s.stillSee ? s.stillSee.map((l: any) => l.line) : [],
    })),
  };
  fs.mkdirSync(path.dirname(FIXTURE_FILE), { recursive: true });
  fs.writeFileSync(FIXTURE_FILE, JSON.stringify(fixture, null, 2) + '\n');

  const st = roundStats(featured.run, fg);
  const md: string[] = [];
  md.push('# Paywall long-copy test — 10 real Evelyn chats (LOCAL ONLY, anonymised)', '');
  md.push(`Updated ${fixture.generatedAt}. **Round 5** (iterations: ${runs.map((r) => r.round).join(', ')}; the per-chat section shows ${featured.round}, the version now in the code; the others follow in full). Endings: \`${featured.run.endingModel}\` (live chat model, no thinking, max_tokens 1000). Still-see lines: \`${STILL_SEE_MODEL}\` (effort low, structured output, server-side fallback "default").`, '');
  md.push(`Source: production DB, read-only (canary ${raw.canary}), pulled ${raw.pulledAt}; session start times + starting coins read 2026-10-12 (read-only, canary rejected with SQLSTATE 25006). The round-4 doc is kept in full at the end.`, '');

  md.push('## Round 5 — results', '');
  md.push('| Iteration | Final reply runs passing | Chats passing BOTH runs | Still-see passing | Keep-reading wrap-ups: control → new (actual live) | Still-see retries / fallbacks | Final-reply auto-retries | Still-see latency, 1st call median / max | incl. retry median / max |');
  md.push('|---|---|---|---|---|---|---|---|---|');
  for (const { round, run } of runs) {
    const x = roundStats(run, gradesOf(round));
    md.push(`| ${round}${x.graded ? '' : ' (not fully graded)'} | ${x.finalPass}/${x.finalTotal} | ${x.bothPass}/10 | ${x.stillSeePass}/10 | ${x.wrapControl}/${x.keepN} → ${x.wrapNew}/${x.keepN} (${x.wrapActual}/${x.keepN}) | ${x.retries} / ${x.fallbacks} | ${round === '5a' || round === '5b' ? 'n/a' : `${x.finalRetries}/20`} | ${x.msFirstMedian} / ${x.msFirstMax} ms | ${x.msTotalMedian} / ${x.msTotalMax} ms |`);
  }
  md.push('');
  md.push('Pass rules. **Final reply:** PART 1 plainly answers her last message; PART 2 is ONE forward sentence about still-see line 1; ≤ 110 words; no question mark; none of the banned items (practice, summary, takeaway, goodbye, praise, blessing, time, minutes, money for the chat, dates, reunion, come-back hooks); no invented facts, people or predictions, and no "you said" about something she did not write in this chat. **Still-see:** all 3 lines ≤ 40 characters, traceable to her, concrete, three different ideas, no predictions. **Wrap-up** (keep-reading test) = any synthesis of the session, takeaway, practice/step, or closing warmth.', '');
  md.push('Every output was graded, then each grade re-read once, skeptically. Mechanical checks are listed under each sample; "(review)" flags are prompts for that read, not fails by themselves.', '');

  md.push('## Round 5 — where the code stands', '');
  md.push(`The code (paywallTeaser.ts + this script) holds iteration **${featured.round}**, the best-scoring version. ${runs.map((r) => `**${r.round}**: ${ITERATION_NOTES[r.round] ?? ''}`).join('\n\n')}`, '');
  md.push(`## Round 5 — per chat (iteration ${featured.round}, the version in the code)`, '');
  for (const s of featured.run.samples) {
    const g = fg[s.id];
    md.push(`### ${s.id} — she ${s.outcome === 'bought' ? 'BOUGHT' : 'left'}${s.closure ? ' (live ending gave a practice/goodbye)' : ''} · ${s.trialSeconds / 60}:00 free`, '');
    md.push(`**Her last message:** ${s.herLastMessage}`, '');
    md.push('**Actual live ending:**', quoteBlock(s.actualEnding), '');
    md.push('**What I still see for you** (generated first):');
    if (s.stillSee) {
      s.stillSee.forEach((l: any, k: number) => md.push(`${k + 1}. ➤ ${l.line} — **${l.rawChars} chars** · ${l.source === 'her_words' ? 'her words' : 'known before this chat'} · from: ${l.basis} · quote: "${l.quote}"`));
    } else {
      md.push('- FALLBACK — no lines passed; the paywall shows its generic line and the final reply got no thread.');
    }
    if (s.stillSeeAttempts.length > 1 || s.stillSeeFallback) {
      s.stillSeeAttempts.forEach((a: any, ai: number) => {
        if (ai === s.stillSeeAttempts.length - 1 && !s.stillSeeFallback) return;
        md.push(`- attempt ${ai + 1} (rejected): ${a.lines.map((l: any) => `"${l.line}" (${l.rawChars})`).join(' / ')} — ${docNotes(s, a.violations).join('; ')}`);
      });
    }
    md.push('');
    s.finals.forEach((f: string, k: number) => {
      const rj = s.finalRejected?.[k];
      if (rj) md.push(`_Run ${k + 1} first draft, rejected by the code check (${docNotes(s, rj.violations).join('; ')}) and regenerated once:_`, quoteBlock(rj.text), '');
      md.push(`**New ending, run ${k + 1}** (${s.checks.finalWords[k]} words; checks: ${docNotes(s, s.checks.finals[k]).join('; ') || 'clean'}):`, quoteBlock(f), '');
      if (g?.finals?.[k]) md.push(`Grade run ${k + 1}: **${g.finals[k].pass ? 'PASS' : 'FAIL'}**${g.finals[k].note ? ` — ${g.finals[k].note}` : ''}`, '');
    });
    if (s.keep) {
      md.push(`**Keep-reading test** — her reply #${s.keep.replyNo} after the greeting, generated with **${s.keep.secondsLeft} s** left (today's meter line: \`${s.keep.meterControl}\`). Her message: ${s.keep.herMessage}`, '');
      md.push(`Actual live reply (flags: ${s.keep.flags.actual.join(', ') || 'none'}):`, quoteBlock(s.keep.actual), '');
      md.push(`(a) Control — today's prompt + meter (flags: ${s.keep.flags.control.join(', ') || 'none'}):`, quoteBlock(s.keep.control), '');
      md.push(`(b) New — ${featured.round === '5a' ? 'FREE_TRIAL_KEEP_READING_INSTRUCTION in the meter line' : 'FREE_TRIAL_KEEP_READING_INSTRUCTION in the meter line + FREE_TRIAL_KEEP_READING_NOTE at the end of the system prompt'} (flags: ${s.keep.flags.new.join(', ') || 'none'}):`, quoteBlock(s.keep.new), '');
      if (g?.keep) {
        const w = (x: { wrap: boolean; what: string }) => `${x.wrap ? 'WRAPS UP' : 'keeps reading'}${x.what ? ` (${x.what})` : ''}`;
        md.push(`Grade — actual: ${w(g.keep.actual)} · control: ${w(g.keep.control)} · new: ${w(g.keep.new)}`, '');
      }
    } else {
      md.push('**Keep-reading test:** skipped — no guide reply in this chat was generated with 61–179 s left (her only reply came at 180 s).', '');
    }
    md.push(`Still-see checks: ${docNotes(s, s.checks.stillSee).join('; ') || 'clean'} · latency ${s.stillSeeMs.first} ms${s.stillSeeAttempts.length > 1 ? ` (+ retry = ${s.stillSeeMs.total} ms)` : ''} · name leak after scrub: ${s.checks.nameLeak ? 'YES' : 'no'}`);
    if (g) md.push(`Grade — still-see **${g.stillSee.pass ? 'PASS' : 'FAIL'}**${g.stillSee.note ? ` — ${g.stillSee.note}` : ''}`);
    md.push('');
  }

  for (const { round, run } of runs.filter((r) => r !== featured)) {
    const g = gradesOf(round);
    md.push(`## Iteration ${round} — every output, graded (not featured; kept so nothing is cherry-picked)`, '');
    if (ITERATION_NOTES[round]) md.push(ITERATION_NOTES[round], '');
    for (const s of run.samples) {
      md.push(`**${s.id}** — still-see: ${s.stillSee ? s.stillSee.map((l: any) => `${l.line} (${l.rawChars})`).join(' / ') : 'FALLBACK'}${g[s.id] ? ` — ${g[s.id].stillSee.pass ? 'PASS' : 'FAIL'}: ${g[s.id].stillSee.note}` : ''}`, '');
      if (s.stillSeeFallback) md.push(`rejected still-see attempts: ${s.stillSeeAttempts.map((a: any) => `${a.lines.map((l: any) => `"${l.line}"`).join(' / ')} (${docNotes(s, a.violations).join('; ')})`).join(' || ')}`, '');
      s.finals.forEach((f: string, k: number) => {
        const rj = s.finalRejected?.[k];
        if (rj) md.push(`_run ${k + 1} first draft, rejected by the code check (${docNotes(s, rj.violations).join('; ')}):_`, quoteBlock(rj.text), '');
        md.push(`run ${k + 1} (${s.checks.finalWords[k]} words; ${docNotes(s, s.checks.finals[k]).join('; ') || 'clean'})${g[s.id]?.finals?.[k] ? ` — **${g[s.id].finals[k].pass ? 'PASS' : 'FAIL'}**: ${g[s.id].finals[k].note}` : ''}`, quoteBlock(f), '');
      });
      if (s.keep && g[s.id]?.keep) md.push(`keep-reading — control ${g[s.id].keep!.control.wrap ? 'WRAPS' : 'reads'} (${g[s.id].keep!.control.what}) · new ${g[s.id].keep!.new.wrap ? 'WRAPS' : 'reads'} (${g[s.id].keep!.new.what})`, '');
    }
  }

  md.push(`## Final prompts (in full — what the code holds now, i.e. iteration ${featured.round})`, '');
  md.push('### Meter line, 61–179 s left on a never-bought client (FREE_TRIAL_KEEP_READING_INSTRUCTION, appended to "Client minutes remaining: about N minutes.")', '', '```', FREE_TRIAL_KEEP_READING_INSTRUCTION.trim(), '```', '');
  md.push('### End of system prompt, 61–179 s left on a never-bought client (FREE_TRIAL_KEEP_READING_NOTE — added from iteration 5b)', '', '```', FREE_TRIAL_KEEP_READING_NOTE, '```', '');
  md.push('### Meter line, final free minute (FREE_TRIAL_TEASER_INSTRUCTION, appended to "Client minutes remaining: less than a minute.")', '', '```', FREE_TRIAL_TEASER_INSTRUCTION.trim(), '```', '');
  md.push('### End of system prompt, final free reply only (buildFreeTrialFinalReplyNote — with a thread; the <…> parts are filled from still-see line 1)', '', '```',
    buildFreeTrialFinalReplyNote({ line: '<still-see line 1>', basis: '<its basis note>', source: 'her_words' }), '```', '');
  md.push('When line 1 is `known_before`, the "She wrote about this herself" line becomes: `This comes from what you knew about her before this chat, not from her messages today — never say she said, told or mentioned it.`', '');
  md.push('### Same, when still-see fell back (FREE_TRIAL_FINAL_REPLY_NOTE)', '', '```', FREE_TRIAL_FINAL_REPLY_NOTE, '```', '');
  md.push('### Appended after her last message (FREE_TRIAL_FINAL_REPLY_REMINDER)', '', '```', FREE_TRIAL_FINAL_REPLY_REMINDER, '```', '');
  md.push('### Still-see generator system prompt (buildStillSeeSystem)', '', '```', buildStillSeeSystem(raw.persona.name), '```', '');
  md.push(`User turn: \`<transcript>\` (CLIENT / EVELYN labels, up to and including her last message — the final reply is written after), then "Write the three lines." On the one retry this is appended: \`${buildStillSeeRequest([], raw.persona.name, ['<violations>']).user.split('Write the three lines.')[1].trim()}\`. Structured output schema: \`{lines: [{line, source: her_words|known_before, quote, basis}]}\`. Checked in code before use: ≤ ${STILL_SEE_MAX_CHARS} chars, exactly 3, quote found in her messages (or the guide's for known_before), no two lines sharing 2+ content words, plus the round-4 word rules. Any failure → one retry → fallback.`, '');

  md.push('## What the rebuild misses (approximation)', '');
  md.push('- Rebuilt from the RUNNING Evelyn prompt test (variant B, weight 100, 34,570 chars; all 10 users were exposed to B) + the six fixed guard blocks + the [CARD_DRAW_TOOL] mechanics, extracted verbatim from chatEngine.ts. Model, max_tokens and the head-10/tail-30 window + every-6 reinforcement match sendMessage.');
  md.push('- NOT included: intent context (buildIntentContext / conversation state), user memories (loadUserContext writes on read, so it was not called), the email arrival brief, the email canon "today\'s letter", the soft-crisis note. The date line uses her message time.');
  md.push('- Meter: exact. Seconds left = starting coins − secondsToCoins(her message time − chat_sessions.started_at), fed to the real buildMinutesMeterLine / buildFreeTrialMeterLine. Two trials (s03, s10) had 5:00 (1,495 coins), the rest 3:00 (897). Every keep-reading pick read "about 2 minutes" (120–165 s); none fell in 61–119 s.');
  md.push('- The final reply is always rebuilt at ~29 s left ("less than a minute"). Four ACTUAL live endings were written earlier (75–90 s left: s01, s02, s04 — she then went quiet), so actual vs new differs for that reason too.');
  md.push('- Still-see reads the chat up to her last message; in production the final reply would wait for it (adds the still-see latency before Evelyn starts typing).', '');

  md.push('## Round history', '');
  md.push('- Round 1: crashed at s09 (timestamps shifted by node-pg local-time parsing; fixed, data re-pulled). Still-see v1 lines for s01–s08 showed "meant for you / meant to last" and "What he feels when he thinks of you".');
  md.push('- Round 2: ending rule only in the RIGHT NOW meter line → ~1/10 followed it.');
  md.push('- Round 3: rule moved to a FINAL REPLY block at the END of the system prompt → 4/10.');
  md.push('- Round 4: tighter block + a one-line reminder after her last message → shape held 10/10; 5/10 passed (invented/misattributed details, a prediction, another person\'s wants, one vague). Still-see 8/10.');
  md.push(`- Round 5: still-see FIRST, line 1 handed to the final reply; 40-char lines with a checked quote; invention guard; quoted examples scrubbed from every prompt; final reply run twice; keep-reading rule tested. Iterations: ${runs.map(({ round, run }) => { const x = roundStats(run, gradesOf(round)); return `${round} = final ${x.finalPass}/${x.finalTotal}, both-runs ${x.bothPass}/10, still-see ${x.stillSeePass}/10, wrap-ups ${x.wrapControl}→${x.wrapNew} of ${x.keepN}`; }).join('; ')}.`, '');

  md.push('## Real proof for the paywall', '');
  md.push(`Evelyn: ${raw.rating.avg}★ from ${raw.rating.count} ratings (session_feedback, real post-session ratings).`, '');
  quotesClean.forEach((q) => md.push(`- "${q.text}" — ${q.approved ? 'APPROVED for display' : 'NOT approved yet'}`));
  md.push('');

  const r4doc = path.join(RAW_DIR!, 'samples-r4.md');
  if (fs.existsSync(r4doc)) {
    md.push('---', '', '# Appendix — Round 4 review doc (as written 2026-10-10, unchanged)', '');
    md.push(...fs.readFileSync(r4doc, 'utf8').split('\n').map((l) => (/^#{1,4} /.test(l) ? `##${l}` : l)));
  }
  fs.mkdirSync(path.dirname(REVIEW_FILE), { recursive: true });
  fs.writeFileSync(REVIEW_FILE, md.join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
  console.log(`wrote ${FIXTURE_FILE} (round ${featured.round})\nwrote ${REVIEW_FILE}`);
  console.log(`featured ${featured.round}: final ${st.finalPass}/${st.finalTotal}, both ${st.bothPass}/10, still-see ${st.stillSeePass}/10, wrap ${st.wrapControl}->${st.wrapNew}/${st.keepN}`);
}

// ── round 6 doc ─────────────────────────────────────────────────────────────

const ITERATION_NOTES_6: Record<string, string> = {
  '6a': 'First round-6 version, on top of 5b. Still-see call also returns HER FACTS + KNOWN BEFORE (quotes checked in code) and may return 0–3 lines (thin chats); the final reply gets the facts lists ("state only these as facts"), the operator\'s new rules (echoing line 1 fine, flat pattern readings fine, only reunion/timing banned), a full-sentence PART 2 rule, and for no-line chats a PART 2 naming the deeper layer of her own question. Guards: a code shape check (PART 2 one sentence, ≥ 8 words, no question-word opener; no "?"; ≤ 110 words) + an Opus fact check that saw ONLY her messages; either failing → one regeneration, shipped without a second check. Keep-reading test not re-run (rule unchanged).',
  '6b': 'Changes from 6a: the fact check now sees the whole chat (labelled), her first name and the facts lists — in 6a it flagged her own name 3 times and a context-free "Yes" once, and those false flags triggered regenerations that INVENTED details (s01 "came to [her city]", s07 "their father" + "shifts"); it also lists advice-for-later now. The regeneration is checked again and whichever version has fewer problems ships (tie → the regeneration). The still-see basis note is no longer passed to the final reply (it carried "long marriage" into both s10 drafts). Shape check: "What I haven\'t read… is …" is a full sentence, no longer flagged. Prompt: "what kind" added to the gaps to leave alone; nothing for her to keep doing after a thanks/"I\'ll try".',
};

interface Grade6 {
  stillSee: { pass: boolean; note: string };
  finals: { pass: boolean; note: string; invented: string | null; fragment: boolean }[];
}

const OPENER_RE = /^(I haven['’]?t|I have not)\b/i;
const lastPara = (t: string) => { const p = t.trim().split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean); return p[p.length - 1] ?? ''; };
const pct = (xs: number[], q: number) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(q * (a.length - 1) + 0.5))] : 0; };
const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

function roundStats6(run: any, grades: Record<string, Grade6>) {
  const S = run.samples as any[];
  const g = (id: string) => grades[id];
  const finals = S.flatMap((x) => (g(x.id)?.finals ?? []));
  const guards = S.flatMap((x) => x.guards.map((gd: any) => ({ ...gd, ss: x.stillSeeMs.total })));
  const lineCounts = [0, 1, 2, 3].map((n) => S.filter((x) => (x.stillSee ?? []).length === n && !x.stillSeeFallback).length);
  return {
    graded: S.every((x) => g(x.id)),
    finalPass: finals.filter((f) => f.pass).length,
    bothPass: S.filter((x) => g(x.id)?.finals.length === 2 && g(x.id).finals.every((f) => f.pass)).length,
    invented: finals.filter((f) => f.invented).length,
    fragments: finals.filter((f) => f.fragment).length,
    stillSeePass: S.filter((x) => g(x.id)?.stillSee.pass).length,
    lineCounts,
    fallbacks: S.filter((x) => x.stillSeeFallback).length,
    regens: guards.filter((x) => x.regen).length,
    regenShipped: guards.filter((x) => x.shipped === 'regen').length,
    openers: S.flatMap((x) => x.finals).filter((f: string) => OPENER_RE.test(lastPara(f))).length,
    ssFirst: S.map((x) => x.stillSeeMs.first),
    ssTotal: S.map((x) => x.stillSeeMs.total),
    draft: guards.map((x) => x.draftMs),
    check: guards.map((x) => x.check.ms),
    regenMs: guards.filter((x) => x.regen).map((x) => x.regen.ms),
    check2: guards.filter((x) => x.regen).map((x) => x.regen.check2.ms),
    live: guards.map((x) => x.liveMs),
    e2e: guards.map((x) => x.ss + x.liveMs),
  };
}

function writeRound6(raw: RawFile, runs: { round: string; run: any }[]) {
  const gradesOf = (r: string): Record<string, Grade6> => (fs.existsSync(gradesFile(r)) ? JSON.parse(fs.readFileSync(gradesFile(r), 'utf8')) : {});
  const featured = runs.find((r) => r.round === process.env.PREVIEW_FEATURED) ?? runs[runs.length - 1];
  const fg = gradesOf(featured.round);
  const quotesClean: { text: string; approved: boolean }[] =
    fs.existsSync(path.join(RAW_DIR!, 'quotes-clean.json')) ? JSON.parse(fs.readFileSync(path.join(RAW_DIR!, 'quotes-clean.json'), 'utf8')) : [];
  const r4 = fs.existsSync(runFile('4')) ? JSON.parse(fs.readFileSync(runFile('4'), 'utf8')) : { samples: [] };
  const r4Control = new Map<string, string>(r4.samples.map((x: any) => [x.id, x.controlEnding]));

  const fixture = {
    generatedAt: new Date().toISOString(),
    round: featured.round,
    model: STILL_SEE_MODEL,
    endingModel: featured.run.endingModel,
    persona: { name: raw.persona.name, slug: raw.persona.slug, avatarUrl: raw.persona.avatarUrl, rating: raw.rating.avg, ratingCount: raw.rating.count },
    quotes: quotesClean,
    samples: featured.run.samples.map((x: any) => ({
      id: x.id, outcome: x.outcome, herLastMessage: x.herLastMessage,
      actualEnding: x.actualEnding,
      controlEnding: r4Control.get(x.id) ?? '',
      newEnding: x.finals[0],
      stillSee: x.stillSee ? x.stillSee.map((l: any) => l.line) : [],
    })),
  };
  fs.writeFileSync(FIXTURE_FILE, JSON.stringify(fixture, null, 2) + '\n');

  const md: string[] = [];
  const st = roundStats6(featured.run, fg);
  md.push('# Paywall long-copy test — 10 real Evelyn chats (LOCAL ONLY, anonymised)', '');
  md.push(`Updated ${fixture.generatedAt}. **Round 6** (iterations ${runs.map((r) => r.round).join(', ')}; the per-chat section shows **${featured.round}**, the version now in the code). Endings: \`${featured.run.endingModel}\` (live chat model, no thinking, max_tokens 1000). Still-see + facts lists and the fact check: \`${STILL_SEE_MODEL}\` (effort low, structured output, server-side fallback "default"). Same 10 chats as round 5 (no new DB read). Round 5 follows below, unchanged.`, '');

  md.push('## Round 6 — results', '');
  md.push('| Iteration | Final replies passing | Chats passing BOTH runs | Shipped replies with an invented detail | Fragment PART 2s | Still-see passing | Lines shown (0 / 1 / 2 / 3) | Replies regenerated (shipped) | PART 2 opens "I haven\'t read yet" |');
  md.push('|---|---|---|---|---|---|---|---|---|');
  for (const { round, run } of runs) {
    const x = roundStats6(run, gradesOf(round));
    md.push(`| ${round}${x.graded ? '' : ' (not fully graded)'} | ${x.finalPass}/20 | ${x.bothPass}/10 | ${x.invented} | ${x.fragments} | ${x.stillSeePass}/10 | ${x.lineCounts.join(' / ')} chats | ${x.regens}/20 (${x.regenShipped}) | ${x.openers}/20 |`);
  }
  md.push('');
  md.push('Latency (median / slowest). Every run of a chat goes through the same still-see call first; "live path" = what she would wait for after her last message, on top of the still-see call.', '');
  md.push('| Iteration | Still-see + facts, 1st call | incl. retry | Final reply draft | Fact check | Regeneration | 2nd fact check | Reply path (draft + check [+ regen + check]) | Total wait after her message |');
  md.push('|---|---|---|---|---|---|---|---|---|');
  for (const { round, run } of runs) {
    const x = roundStats6(run, gradesOf(round));
    const m = (xs: number[]) => (xs.length ? `${secs(pct(xs, 0.5))} / ${secs(Math.max(...xs))}` : '—');
    md.push(`| ${round} | ${m(x.ssFirst)} | ${m(x.ssTotal)} | ${m(x.draft)} | ${m(x.check)} | ${m(x.regenMs)} | ${round === '6a' ? `${m(x.check2)} (not waited for)` : m(x.check2)} | ${m(x.live)} | ${m(x.e2e)} |`);
  }
  md.push('', 'Round 5b for comparison: still-see 1st call 7.8 s median / 13.8 s slowest, no fact check.', '');

  md.push('Pass rules (operator, 2026-10-12). **Final reply:** PART 1 plainly answers her last message; PART 2 is ONE full sentence in Evelyn\'s voice pointing to still-see line 1 (echoing its words is fine; a heading or fragment fails); ≤ 110 words; no question mark; no goodbye, blessing, closing warmth, practice or advice-for-later; nothing about time, minutes, money or paying; no reunion promise or timing; flat readings and pattern predictions are fine; any invented person, relationship, job detail, place, event or fact that is not in HER messages fails (greeting facts may be used, never as "you said"). **Still-see:** every line ≤ 40 characters, traceable, concrete, distinct; a thin chat shows only the lines it supports (0 = the paywall\'s own line). "BORDERLINE" in a note = passed under these rules but worth a look (mostly mild encouragement after a thanks / "I\'ll try" — the same class the round-5 count of 16/20 passed).', '');

  md.push('## Round 6 — what changed', '');
  for (const { round } of runs) md.push(`**${round}**: ${ITERATION_NOTES_6[round] ?? ''}`, '');

  md.push(`## Round 6 — per chat (iteration ${featured.round}, the version in the code)`, '');
  const factsBlock = (x: any) => {
    const out = ['**HER FACTS** (built by the still-see call; given to the final reply as the only facts it may state):'];
    x.facts.hers.forEach((f: any) => out.push(`- ${f.fact} — "${f.quote}"`));
    if (!x.facts.hers.length) out.push('- (none)');
    out.push(`**KNOWN BEFORE:** ${x.facts.knownBefore.length ? x.facts.knownBefore.map((f: any) => `${f.fact} ("${f.quote}")`).join('; ') : 'none'}${x.facts.dropped ? ` · ${x.facts.dropped} fact(s) dropped by the code check (quote not found)` : ''}`);
    return out;
  };
  const guardLine = (x: any, gd: any) => {
    const flags = [...docNotes(x, gd.shape), ...gd.check.invented.map((d: string) => `invented: ${d}`), ...(gd.check.advice ?? []).map((d: string) => `advice: ${d}`)];
    return flags;
  };
  for (const x of featured.run.samples) {
    const g = fg[x.id];
    md.push(`### ${x.id} — she ${x.outcome === 'bought' ? 'BOUGHT' : 'left'} · ${x.trialSeconds / 60}:00 free`, '');
    md.push(`**Her last message:** ${x.herLastMessage}`, '');
    md.push(...factsBlock(x), '');
    md.push('**What I still see for you** (generated first):');
    if (x.stillSeeFallback) md.push('- FALLBACK — no lines passed the checks; the paywall shows its own line.');
    else if (!x.stillSee.length) md.push('- NONE — the chat gives no line (thin chat); the paywall shows its own line: "Evelyn has more to tell you about your question."');
    else x.stillSee.forEach((l: any, k: number) => md.push(`${k + 1}. ➤ ${l.line} — **${l.rawChars} chars** · ${l.source === 'her_words' ? 'her words' : 'known before this chat'} · quote: "${l.quote}"`));
    if (x.stillSeeAttempts.length > 1) x.stillSeeAttempts.slice(0, -1).forEach((a: any, ai: number) => md.push(`- attempt ${ai + 1} (rejected): ${a.lines.map((l: any) => `"${l.line}" (${l.rawChars})`).join(' / ')} — ${docNotes(x, a.violations).join('; ')}`));
    if (g) md.push(`Grade — still-see **${g.stillSee.pass ? 'PASS' : 'FAIL'}** — ${g.stillSee.note}`);
    md.push('');
    x.guards.forEach((gd: any, k: number) => {
      if (gd.regen) {
        md.push(`_Run ${k + 1} draft (${gd.draftWords} words) — flagged: ${guardLine(x, gd).join('; ')}:_`, quoteBlock(gd.draft), '');
        const f2 = [...docNotes(x, gd.regen.shape), ...gd.regen.check2.invented.map((d: string) => `invented: ${d}`), ...(gd.regen.check2.advice ?? []).map((d: string) => `advice: ${d}`)];
        md.push(`_Regenerated once — second check: ${f2.join('; ') || 'clean'} → **${gd.shipped === 'regen' ? 'regeneration ships' : 'draft ships'}**._`, '');
      }
      md.push(`**New ending, run ${k + 1}** (${x.checks.finalWords[k]} words${gd.regen ? `, the ${gd.shipped}` : ''}; code notes: ${docNotes(x, x.checks.finals[k]).join('; ') || 'none'}):`, quoteBlock(x.finals[k]), '');
      if (g?.finals?.[k]) md.push(`Grade run ${k + 1}: **${g.finals[k].pass ? 'PASS' : 'FAIL'}** — ${g.finals[k].note}`, '');
    });
    md.push(`Latency: still-see ${secs(x.stillSeeMs.first)}${x.stillSeeAttempts.length > 1 ? ` (+ retry = ${secs(x.stillSeeMs.total)})` : ''} · reply paths ${x.guards.map((gd: any) => secs(gd.liveMs)).join(' / ')} · name leak after scrub: ${x.checks.nameLeak ? 'YES' : 'no'}`, '');
  }

  for (const { round, run } of runs.filter((r) => r !== featured)) {
    const g = gradesOf(round);
    md.push(`## Iteration ${round} — every output, graded (not featured; kept so nothing is cherry-picked)`, '');
    for (const x of run.samples) {
      md.push(`**${x.id}** — her last message: ${x.herLastMessage}`, '');
      md.push(`HER FACTS: ${x.facts.hers.map((f: any) => f.fact).join(' · ') || '(none)'} · KNOWN BEFORE: ${x.facts.knownBefore.map((f: any) => f.fact).join(' · ') || 'none'}`, '');
      md.push(`still-see: ${x.stillSeeFallback ? 'FALLBACK' : x.stillSee.length ? x.stillSee.map((l: any) => `${l.line} (${l.rawChars})`).join(' / ') : 'NONE (thin chat)'}${g[x.id] ? ` — **${g[x.id].stillSee.pass ? 'PASS' : 'FAIL'}**: ${g[x.id].stillSee.note}` : ''}`, '');
      x.guards.forEach((gd: any, k: number) => {
        if (gd.regen) {
          md.push(`_run ${k + 1} draft — flagged: ${guardLine(x, gd).join('; ')}:_`, quoteBlock(gd.draft), '');
          md.push(`_regenerated; second check (6a did not wait for it): ${[...docNotes(x, gd.regen.shape), ...gd.regen.check2.invented.map((d: string) => `invented: ${d}`), ...(gd.regen.check2.advice ?? []).map((d: string) => `advice: ${d}`)].join('; ') || 'clean'} → ${gd.shipped} ships_`, '');
        }
        md.push(`run ${k + 1} (${x.checks.finalWords[k]} words${gd.regen ? `, the ${gd.shipped}` : ''})${g[x.id]?.finals?.[k] ? ` — **${g[x.id].finals[k].pass ? 'PASS' : 'FAIL'}**: ${g[x.id].finals[k].note}` : ''}`, quoteBlock(x.finals[k]), '');
      });
    }
  }

  md.push(`## Round 6 — final prompts in full (what the code holds now, i.e. iteration ${featured.round})`, '');
  md.push('### End of system prompt, final free reply (buildFreeTrialFinalReplyNote — with a line-1 thread; the <…> parts are filled per chat)', '', '```',
    buildFreeTrialFinalReplyNote({ line: '<still-see line 1>', basis: '', source: 'her_words' }, { hers: [{ fact: '<her fact>', quote: '<her exact words>' }], knownBefore: [{ fact: '<fact known before this chat>', quote: '' }] }), '```', '');
  md.push('When line 1 is `known_before`, the "She wrote about this herself" line becomes: `This comes from what you knew about her before this chat, not from her messages today — never say she said, told or mentioned it.` Empty lists render as `- (nothing beyond her question)` / `- (none)`.', '');
  md.push('### PART 2 when there is no line (thin chat or fallback) — replaces the PART 2 block above', '', '```',
    buildFreeTrialFinalReplyNote(null).split('\n').filter((l) => l.startsWith('PART 2') || l.startsWith('Write PART 2')).join('\n'), '```', '');
  md.push('### Appended after her last message (FREE_TRIAL_FINAL_REPLY_REMINDER)', '', '```', FREE_TRIAL_FINAL_REPLY_REMINDER, '```', '');
  md.push('### Appended after the reminder on the one regeneration (buildFinalReplyRetryNote)', '', '```', buildFinalReplyRetryNote(['<each problem: the shape rule broken, or: it states "<words>" as fact, but her messages never give it (<reason>) — leave it out, or: it gives her advice for later: "<words>" — leave it out>']), '```', '');
  md.push('### Code shape check on the final reply (finalReplyShapeViolations — triggers the regeneration)', '');
  md.push('- a question mark anywhere; over 110 words; PART 2 not a separate paragraph; PART 2 more than one sentence; PART 2 opening with Why/What/How/Where/Whether/Who/When/Which unless the next word is "I" (so "What I haven\'t read for you yet is…" passes and a bare "Why nothing is showing up…" fails); PART 2 under 8 words; PART 2 not ending in a full stop / exclamation mark.', '');
  md.push('### Fact check (buildFactCheckSystem + buildFactCheckRequest, Opus 5.5 effort low, structured output `{invented: [{words, why}], advice: [{words, why}]}`)', '', '```', buildFactCheckSystem(raw.persona.name), '```', '');
  md.push('User turn: `<client_first_name>`, `<transcript>` (CLIENT / ADVISOR lines up to her last message), `<her_facts>`, `<known_before>`, `<reply>`, then "List the invented details and the advice in the reply." Any item → one regeneration; the regeneration is checked the same way; the version with fewer problems ships (tie → the regeneration).', '');
  md.push('### Still-see + facts generator system prompt (buildStillSeeSystem)', '', '```', buildStillSeeSystem(raw.persona.name), '```', '');
  md.push(`User turn: \`<transcript>\` (CLIENT / EVELYN labels, up to her last message), then "Write the two lists, then the lines." Retry suffix: \`${buildStillSeeRequest([], raw.persona.name, ['<violations>']).user.split('then the lines.')[1].trim()}\`. Schema: \`{her_facts: [{fact, quote}], known_before: [{fact, quote}], lines: [{line, source, quote, basis}]}\`. Checked in code: 0–3 lines, ≤ ${STILL_SEE_MAX_CHARS} chars, quotes found, no shared key word, the round-4 word rules; a fact whose quote is not found is dropped. A line failure → one retry → fallback (facts kept).`, '');
  md.push('### Keep-reading note and meter lines', '', 'Unchanged from round 5 (see "Final prompts" in the round-5 doc below); not re-run in round 6.', '');

  md.push('## Round 6 — what the rebuild misses, and what was not verified', '');
  md.push('- Same turn rebuild as round 5 (live prompt variant B + guard blocks + window + reinforcement; no intent context, user memories, arrival brief, email canon or soft-crisis note). The final reply is rebuilt at ~29 s left.');
  md.push('- Latency is from this laptop, 4 chats in parallel, single runs — not production load. The still-see call is on the critical path (the final reply waits for it), and from 6b so is the fact check, plus a regeneration + second check when a draft is flagged.');
  md.push('- Grading is one reader plus one skeptical re-read, not a blind second grader. The fact check was spot-checked on 10 known 6a cases (all 10 right) — not measured for misses on a fresh set.');
  md.push('- Nothing here is wired into live code; the paywall UI was only checked in the local preview.', '');

  const r5doc = path.join(RAW_DIR!, 'samples-r5.md');
  if (fs.existsSync(r5doc)) {
    md.push('---', '', '# Round 5 doc (as written 2026-10-12, unchanged — includes the round-4 appendix)', '');
    md.push(...fs.readFileSync(r5doc, 'utf8').split('\n').map((l) => (/^#{1,5} /.test(l) ? `#${l}` : l)));
  }
  fs.writeFileSync(REVIEW_FILE, md.join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
  console.log(`wrote ${FIXTURE_FILE} (round ${featured.round})\nwrote ${REVIEW_FILE}`);
  console.log(`featured ${featured.round}: final ${st.finalPass}/20, both ${st.bothPass}/10, invented ${st.invented}, fragments ${st.fragments}, still-see ${st.stillSeePass}/10, lines ${st.lineCounts.join('/')}, regens ${st.regens} (${st.regenShipped} shipped), openers ${st.openers}/20`);
}

async function scrubQuotes() {
  const raw: RawFile = JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'));
  const anthropic = new Anthropic();
  const evelyn = raw.quotes.filter((q) => q.persona === 'evelyn-cross');
  const fields = Object.fromEntries(evelyn.map((q, k) => [`q${k + 1}`, q.text]));
  const clean = await scrub(anthropic, fields);
  const out = evelyn.map((q, k) => ({ text: clean[`q${k + 1}`].trim(), approved: q.approved }));
  fs.writeFileSync(path.join(RAW_DIR!, 'quotes-clean.json'), JSON.stringify(out, null, 2));
  console.log(`scrubbed ${out.length} Evelyn quotes (${raw.quotes.length - evelyn.length} approved quotes belong to other guides)`);
}

const mode = process.argv[2];
const run = mode === 'pull' ? pull : mode === 'generate' ? generate : mode === 'quotes' ? scrubQuotes : mode === 'write' ? async () => writeOutputs() : null;
if (!run) {
  console.error('usage: preview-paywall-samples.ts pull|generate|quotes|write');
  process.exit(1);
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
