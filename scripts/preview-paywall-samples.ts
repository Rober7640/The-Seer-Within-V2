/**
 * Preview run for the paywall long-copy test — runs the free-trial wind-down and
 * the "still see" generator (server/lib/paywallTeaser.ts) against REAL Evelyn chats
 * so the copy can be judged before anything is built live.
 *
 *   PREVIEW_RAW_DIR=<scratch dir> npx tsx scripts/preview-paywall-samples.ts pull
 *   PREVIEW_RAW_DIR=<scratch dir> npx tsx scripts/preview-paywall-samples.ts generate
 *
 * pull     — PRODUCTION DB, READ ONLY. Every query runs inside BEGIN TRANSACTION
 *            READ ONLY after a canary write that must be rejected (SQLSTATE 25006).
 *            Writes raw transcripts (contain PII) to PREVIEW_RAW_DIR only — never
 *            into the repo.
 * generate — no DB. Rebuilds each chat's last guide turn (approximating
 *            chatEngine.buildMessageContext), generates a CONTROL ending (today's
 *            WIND_DOWN_INSTRUCTION) and a NEW ending (FREE_TRIAL_TEASER_INSTRUCTION),
 *            the three still-see lines, then strips names/places and writes the
 *            local-only fixture + review doc (both git-excluded).
 *
 * Needs DATABASE_URL (pull) and ANTHROPIC_API_KEY (generate) in the environment.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import { WIND_DOWN_INSTRUCTION } from '../server/lib/minutesMeter';
import {
  FREE_TRIAL_TEASER_INSTRUCTION,
  freeTrialSystemSuffix,
  FREE_TRIAL_FINAL_REPLY_REMINDER,
  FREE_TRIAL_FINAL_REPLY_NOTE,
  FREE_TRIAL_KEEP_READING_INSTRUCTION,
  buildStillSeeSystem,
  buildStillSeeRequest,
  checkStillSeeLines,
  checkTeaserEnding,
  type TranscriptTurn,
} from '../server/lib/paywallTeaser';

const EVELYN_ID = '7f03b55e-9a35-4bb7-ac80-a5dff7228910';
const PROMPT_EXPERIMENT_KEY = 'persona_prompt_evelyn_2026';
// Same class as the 2026-10-11 CRO query ("gave a practice / closed warmly").
const CLOSURE_RE =
  "(one thing to do|one practice|this week|practically|practice:|proud of you|took courage|here.s what to do|try this|tonight,? (write|light|put|say)|say (it )?out loud|both hands|burn it)";

const ENDING_MODEL_FALLBACK = 'claude-sonnet-4-5-20250929'; // live default_conversation_model
const STILL_SEE_MODEL = 'claude-opus-5-5';
const SCRUB_MODEL = 'claude-opus-5-5';

const RAW_DIR = process.env.PREVIEW_RAW_DIR;
if (!RAW_DIR) throw new Error('Set PREVIEW_RAW_DIR to a scratch directory outside the repo.');
const RAW_FILE = path.join(RAW_DIR, 'raw-samples.json');
const RUN_FILE = path.join(RAW_DIR, 'generate-run.json');
const ROUND = process.env.PREVIEW_ROUND ?? '1';

const FIXTURE_FILE = path.resolve('client/src/components/paywall/preview-samples.local.json');
const REVIEW_FILE = path.resolve('improve-v2/paywall-longcopy/samples.local.md');

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
      samples.push({
        userId: p.user_id,
        firstName,
        sessionId: p.session_id,
        wallAt: utcIso(p.t),
        outcome: p.bought ? 'bought' : 'left',
        closure: p.closure,
        promptVariant: exposure,
        messages: msgs.map((m: any) => ({ id: m.id, role: m.role, content: m.content, sentAt: utcIso(m.sent_at) })),
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

// ── generate ────────────────────────────────────────────────────────────────

/** Pull the fixed guard blocks out of chatEngine.ts so the rebuilt system prompt
 *  matches what production sends (they are module-private constants). */
function loadEngineBlocks() {
  const src = fs.readFileSync(path.resolve('server/lib/chatEngine.ts'), 'utf8');
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

/** Approximation of chatEngine.buildMessageContext for the turn that produced the
 *  last guide reply before the wall. Missing on purpose (documented in the review
 *  doc): intent context, user memories, arrival brief, email canon, soft-crisis note. */
function rebuildTurn(raw: RawFile, s: RawSample, meterInstruction: string, systemSuffix = '', finalReminder = '') {
  const blocks = loadEngineBlocks();
  const authored = s.promptVariant === 'A' || !raw.persona.variantB ? raw.persona.basePrompt : raw.persona.variantB;
  let prompt = authored;
  if (prompt.includes('[RUNTIME_CONTEXT]')) {
    const wall = new Date(s.wallAt);
    const dateLine = `Today's date is ${wall.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })} (UTC).`;
    // Both arms are rebuilt at the final free minute ("less than a minute"), where
    // the wind-down fires today.
    prompt = prompt.replace('[RUNTIME_CONTEXT]', `${dateLine}\nClient minutes remaining: less than a minute.${meterInstruction}`);
  }
  const isTarot = authored.toLowerCase().includes('tarot');
  const hasCardDrawTool = authored.includes('[CARD_DRAW_TOOL]');
  const tarotInstruction = isTarot ? blocks.tarotLegacy : hasCardDrawTool ? blocks.cardDrawTool : '';
  // systemSuffix sits where sendMessage appends its soft-crisis note: the very end.
  const system = [blocks.prelude, prompt, ...blocks.guards, tarotInstruction].filter(Boolean).join('\n\n') + systemSuffix;

  // History = everything before the final user message, which is appended last
  // (sendMessage excludes the in-flight message from the window, then pushes it).
  const msgs = s.messages.slice(0, -1); // drop the actual last guide reply
  const lastUserIdx = msgs.map((m) => m.role).lastIndexOf('user');
  const inflight = msgs[lastUserIdx];
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
  messages.push(finalReminder
    ? { role: 'user', content: [{ type: 'text', text: inflight.content }, { type: 'text', text: finalReminder }] }
    : { role: 'user', content: inflight.content });
  return { system, messages, authoredVariant: authored === raw.persona.variantB ? 'B' : 'base' };
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

async function generateEnding(anthropic: Anthropic, model: string, raw: RawFile, s: RawSample, instr: string, systemSuffix = '', finalReminder = '') {
  const { system, messages } = rebuildTurn(raw, s, instr, systemSuffix, finalReminder);
  const res = await anthropic.messages.create({ model, max_tokens: 1000, system, messages });
  return parseReply(textOf(res.content));
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
  '- Change nothing else: keep wording, tone, typos, punctuation and length. Return the same keys in the same order.',
].join('\n');

async function scrub(anthropic: Anthropic, fields: Record<string, string>) {
  const schema = {
    type: 'object',
    properties: Object.fromEntries(Object.keys(fields).map((k) => [k, { type: 'string' }])),
    required: Object.keys(fields),
    additionalProperties: false,
  };
  const { json } = await structuredCall(anthropic, SCRUB_MODEL, SCRUB_SYSTEM, JSON.stringify(fields, null, 2), schema, 4000);
  return json as Record<string, string>;
}

const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

async function generate() {
  const raw: RawFile = JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'));
  const anthropic = new Anthropic();
  const endingModel = raw.persona.aiModel || raw.persona.defaultModel || ENDING_MODEL_FALLBACK;
  const out: any[] = [];
  let i = 0;
  for (const s of raw.samples) {
    i += 1;
    const id = `s${String(i).padStart(2, '0')}`;
    const turns: TranscriptTurn[] = s.messages.map((m) => ({ role: m.role, content: m.content }));
    const actualEnding = s.messages[s.messages.length - 1].content;
    const herLast = [...s.messages].reverse().find((m) => m.role === 'user')!.content;

    const [controlEnding, newEnding] = await Promise.all([
      generateEnding(anthropic, endingModel, raw, s, WIND_DOWN_INSTRUCTION),
      // 0 coins left = inside the final free minute → the FINAL REPLY note applies.
      generateEnding(anthropic, endingModel, raw, s, FREE_TRIAL_TEASER_INSTRUCTION, freeTrialSystemSuffix(0, 299), FREE_TRIAL_FINAL_REPLY_REMINDER),
    ]);
    const req = buildStillSeeRequest(turns, raw.persona.name);
    const ss = await structuredCall(anthropic, STILL_SEE_MODEL, req.system, req.user, req.schema);
    const lines: { line: string; basis: string }[] = ss.json.lines ?? [];

    const names = [s.firstName ?? ''].filter(Boolean);
    const clean = await scrub(anthropic, {
      herLastMessage: short(herLast, 140),
      actualEnding,
      controlEnding,
      newEnding,
      ...Object.fromEntries(lines.map((l, k) => [`line${k + 1}`, l.line])),
      ...Object.fromEntries(lines.map((l, k) => [`basis${k + 1}`, l.basis])),
    });
    const stillSee = lines.map((_, k) => clean[`line${k + 1}`]);
    out.push({
      id,
      outcome: s.outcome,
      closure: s.closure,
      promptVariant: s.promptVariant,
      herLastMessage: short(clean.herLastMessage, 140),
      actualEnding: clean.actualEnding,
      controlEnding: clean.controlEnding,
      newEnding: clean.newEnding,
      stillSee,
      stillSeeBasis: lines.map((_, k) => clean[`basis${k + 1}`]),
      stillSeeLatencyMs: ss.ms,
      stillSeeServedBy: ss.servedBy,
      checks: {
        stillSee: checkStillSeeLines(lines.map((l) => l.line), { forbiddenNames: names }),
        newEnding: checkTeaserEnding(newEnding),
        controlEnding: checkTeaserEnding(controlEnding),
        actualEnding: checkTeaserEnding(actualEnding),
        // A leaked first name in any output after scrubbing is a hard failure.
        nameLeak: names.some((n) => n.length > 1 && new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(JSON.stringify(clean))),
      },
    });
    console.log(`${id} ${s.outcome}${s.closure ? '+closure' : ''} still-see ${ss.ms}ms (${ss.servedBy}) | lines: ${stillSee.join(' / ')}`);
  }
  fs.writeFileSync(RUN_FILE.replace('.json', `-r${ROUND}.json`), JSON.stringify({ endingModel, samples: out }, null, 2));
  console.log(`\nwrote ${RUN_FILE.replace('.json', `-r${ROUND}.json`)} (round ${ROUND}, ending model ${endingModel})`);
}

// ── write fixture + review doc from a finished round ─────────────────────────

function writeOutputs() {
  const raw: RawFile = JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'));
  const run = JSON.parse(fs.readFileSync(RUN_FILE.replace('.json', `-r${ROUND}.json`), 'utf8'));
  const grades: Record<string, { stillSee: boolean; newEnding: boolean; note: string }> =
    fs.existsSync(path.join(RAW_DIR!, `grades-r${ROUND}.json`)) ? JSON.parse(fs.readFileSync(path.join(RAW_DIR!, `grades-r${ROUND}.json`), 'utf8')) : {};
  const quotesClean: { text: string; approved: boolean }[] =
    fs.existsSync(path.join(RAW_DIR!, 'quotes-clean.json')) ? JSON.parse(fs.readFileSync(path.join(RAW_DIR!, 'quotes-clean.json'), 'utf8')) : [];

  const fixture = {
    generatedAt: new Date().toISOString(),
    model: STILL_SEE_MODEL,
    endingModel: run.endingModel,
    persona: { name: raw.persona.name, slug: raw.persona.slug, avatarUrl: raw.persona.avatarUrl, rating: raw.rating.avg, ratingCount: raw.rating.count },
    quotes: quotesClean,
    samples: run.samples.map((s: any) => ({
      id: s.id, outcome: s.outcome, herLastMessage: s.herLastMessage,
      actualEnding: s.actualEnding, controlEnding: s.controlEnding, newEnding: s.newEnding, stillSee: s.stillSee,
    })),
  };
  fs.mkdirSync(path.dirname(FIXTURE_FILE), { recursive: true });
  fs.writeFileSync(FIXTURE_FILE, JSON.stringify(fixture, null, 2) + '\n');

  const lat = run.samples.map((s: any) => s.stillSeeLatencyMs).sort((a: number, b: number) => a - b);
  const pct = (p: number) => lat[Math.min(lat.length - 1, Math.floor(p * lat.length))];
  const passSS = run.samples.filter((s: any) => grades[s.id]?.stillSee).length;
  const passNE = run.samples.filter((s: any) => grades[s.id]?.newEnding).length;

  const md: string[] = [];
  md.push('# Paywall long-copy test — 10 real Evelyn chats (LOCAL ONLY, anonymised)', '');
  md.push(`Generated ${fixture.generatedAt}. Round ${ROUND}. Endings: \`${run.endingModel}\` (live chat model, no thinking, max_tokens 1000). Still-see lines: \`${STILL_SEE_MODEL}\` (effort low, structured output, server-side fallback "default").`, '');
  md.push(`Source: production DB, read-only (canary ${raw.canary}), pulled ${raw.pulledAt}. First-time paywall viewers, last 30 days, mid-chat at the wall, Evelyn sessions, deterministic md5 pick: 3 left + closing practice/goodbye, 4 left other, 3 bought.`, '');
  md.push(`**Pass counts (my grading, mechanical checks + a read of each):** still-see ${passSS}/10 · new ending ${passNE}/10. Still-see latency: median ${pct(0.5)} ms, slowest ${lat[lat.length - 1]} ms (target < 8,000).`, '');
  md.push('Columns per sample: her last message · ACTUAL live ending (what she really saw) · CONTROL (today\'s wind-down, rebuilt) · NEW (free-trial ending) · still-see lines. Control vs actual shows how much drift the rebuild itself adds.', '');
  for (const s of run.samples) {
    const g = grades[s.id];
    md.push(`## ${s.id} — she ${s.outcome === 'bought' ? 'BOUGHT' : 'left'}${s.closure ? ' (live ending gave a practice/goodbye)' : ''}`, '');
    md.push(`**Her last message:** ${s.herLastMessage}`, '');
    md.push(`**Actual live ending:**\n> ${s.actualEnding.replace(/\n+/g, '\n> ')}`, '');
    md.push(`**Control (today's wind-down, rebuilt):**\n> ${s.controlEnding.replace(/\n+/g, '\n> ')}`, '');
    md.push(`**New (free-trial ending):**\n> ${s.newEnding.replace(/\n+/g, '\n> ')}`, '');
    md.push('**What I still see for you:**');
    s.stillSee.forEach((l: string, k: number) => md.push(`- ➤ ${l}  _(from: ${s.stillSeeBasis[k]})_`));
    md.push('');
    md.push(`Checks — still-see: ${s.checks.stillSee.length ? s.checks.stillSee.join('; ') : 'clean'} · new ending: ${s.checks.newEnding.length ? s.checks.newEnding.join('; ') : 'clean'} · control: ${s.checks.controlEnding.join('; ') || 'clean'} · actual: ${s.checks.actualEnding.join('; ') || 'clean'} · latency ${s.stillSeeLatencyMs} ms`);
    if (g) md.push(`Grade — still-see ${g.stillSee ? 'PASS' : 'FAIL'} · new ending ${g.newEnding ? 'PASS' : 'FAIL'}${g.note ? ` — ${g.note}` : ''}`);
    md.push('');
  }
  md.push('## Round history', '');
  md.push('- Round 1: crashed at s09 (timestamps shifted by node-pg local-time parsing; fixed, data re-pulled). Still-see v1 lines for s01–s08 showed "meant for you / meant to last" and "What he feels when he thinks of you".');
  md.push('- Round 2: ending rule only in the RIGHT NOW meter line → ~1/10 followed it (questions, practices, a goodbye, and one leaked "This IS your FREE minute wrapping"). Still-see v2 fixed the prediction/feelings lines.');
  md.push('- Round 3: rule moved to a FINAL REPLY block at the END of the system prompt (where sendMessage appends its soft-crisis note) → 4/10. Remaining: practices, a closing question, an intake ask, a "whenever you\'re ready" hook, overlong replies.');
  md.push('- Round 4 (this file): tighter FINAL REPLY block + a one-line reminder appended after her last message → shape now holds 10/10 (no practice, goodbye, question-to-her, request, time or money; all ≤ 90 words). The 5 fails are about WHICH thread gets named: invented or misattributed details, a prediction, another person\'s wants.', '');
  md.push('## Recommendation from the failures', '');
  md.push('Generate the still-see lines FIRST (they are grounded — each carries a basis), then hand line 1 to the final reply as the thread to name in Part 2. That stops the chat model inventing the "next thing" and makes the chat ending and the paywall say the same thing. Not run in this preview.', '');
  md.push('## Final prompts (in full)', '');
  md.push('### Meter line, final free minute (FREE_TRIAL_TEASER_INSTRUCTION, appended to "Client minutes remaining: less than a minute.")', '', '```', FREE_TRIAL_TEASER_INSTRUCTION.trim(), '```', '');
  md.push('### Meter line, 61–179 s left on a never-bought client (FREE_TRIAL_KEEP_READING_INSTRUCTION) — not exercised by this run', '', '```', FREE_TRIAL_KEEP_READING_INSTRUCTION.trim(), '```', '');
  md.push('### End of system prompt, final free reply only (FREE_TRIAL_FINAL_REPLY_NOTE)', '', '```', FREE_TRIAL_FINAL_REPLY_NOTE, '```', '');
  md.push('### Appended after her last message (FREE_TRIAL_FINAL_REPLY_REMINDER)', '', '```', FREE_TRIAL_FINAL_REPLY_REMINDER, '```', '');
  md.push('### Still-see generator system prompt (buildStillSeeSystem)', '', '```', buildStillSeeSystem(raw.persona.name), '```', '');
  md.push('User turn: `<transcript>` with CLIENT / EVELYN labels, then "Write the three lines." Structured output schema: `{lines: [{line, basis}]}`.', '');
  md.push('## What the rebuild misses (approximation)', '');
  md.push('- Rebuilt from the RUNNING Evelyn prompt test (variant B, weight 100, 34,570 chars; all 10 users were exposed to B) + the six fixed guard blocks + the [CARD_DRAW_TOOL] mechanics, extracted verbatim from chatEngine.ts. Model, max_tokens and the head-10/tail-30 window + every-6 reinforcement match sendMessage.');
  md.push('- NOT included: intent context (buildIntentContext / conversation state), user memories (loadUserContext writes on read, so it was not called), the email arrival brief, the email canon "today\'s letter", the soft-crisis note. The date line uses the wall time.');
  md.push('- Both arms are rebuilt at "less than a minute". Some ACTUAL live endings were written earlier (82–175 s before the wall for s01, s02, s04, s09), so actual vs control differs for that reason too.');
  md.push('- Evelyn\'s greeting carries facts from her intake (e.g. a city, a music dream). The rebuild sees them as Evelyn\'s words, which is how the new ending came to say "you said" about them (s07).', '');
  md.push('## Real proof for the paywall', '');
  md.push(`Evelyn: ${raw.rating.avg}★ from ${raw.rating.count} ratings (session_feedback, real post-session ratings).`, '');
  quotesClean.forEach((q) => md.push(`- "${q.text}" — ${q.approved ? 'APPROVED for display' : 'NOT approved yet'}`));
  md.push('');
  fs.mkdirSync(path.dirname(REVIEW_FILE), { recursive: true });
  fs.writeFileSync(REVIEW_FILE, md.join('\n') + '\n');
  console.log(`wrote ${FIXTURE_FILE}\nwrote ${REVIEW_FILE}`);
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
