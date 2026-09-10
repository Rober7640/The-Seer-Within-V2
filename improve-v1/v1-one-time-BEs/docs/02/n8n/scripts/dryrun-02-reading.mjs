/**
 * Run one 02 order through the fulfilment logic, for real, without n8n.
 *
 *   node improve-v1/v1-one-time-BEs/docs/02/n8n/scripts/dryrun-02-reading.mjs [options]
 *
 * Controlled comparison:
 *   --order ID          Deterministic order seed used by the draw and prompt rotations.
 *   --artifact NAME     Output filename label. It does not affect generation.
 *   --draw FILE         Reuse the twelve card identities in a saved dry-run draw JSON.
 *   --inspect           Print replay provenance and exit before any paid model call.
 *   --regrade FILE      Re-run only the current metrics and grader on a saved reading.
 *
 * Keep --order fixed when comparing prompt revisions. Give each revision a different
 * --artifact label. --draw accepts the array written by this script, or an envelope with a
 * `draw` array and an optional future `architecture`/`architecture_plan` value. Replayed card
 * identities are combined with the CURRENT workflow's house jobs, obligations and lore.
 *
 * Existing behaviour is unchanged when the new options are omitted. Use --help for all flags.
 *
 * ⭐ --arc v2 is the SECOND letter's buyer: the fixture carries c=23, which node 3 reads as the
 *    v2 arc — a different story shape, both letters' debts, its own default order id.
 *
 * ⭐ THE CODE NODES ARE NOT REIMPLEMENTED HERE. `3 · Draw the twelve`, `4a`, `4c`, `6`, `6b`
 *    and `7a` are pulled out of docs/02/02-fulfilment.n8n.json and executed, and the model
 *    calls use the nodes' own request bodies. So this tests the workflow, not a copy of it.
 *
 * What it cannot test: Stripe, PDFShift, Supabase, AWeber, the Wait node, and the two server
 * endpoints that do not exist. Those are integrations, not logic.
 *
 * ⛔ Costs real money — one Opus call per house plus a joiner and a grade.
 *    `--houses 3` runs a cheap shape check first; the full twelve is the real test.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPO = path.resolve(ROOT, "../../../../..");

const hasArg = (name) => process.argv.includes(name);
const argValue = (...names) => {
  const name = names.find((n) => hasArg(n));
  if (!name) return null;
  const value = process.argv[process.argv.indexOf(name) + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
  return value;
};
const HELP = `
02 fulfilment dry run (paid unless --inspect is used)

Usage:
  node scripts/dryrun-02-reading.mjs [options]

Options:
  --order ID            Deterministic order seed. Keep this fixed across comparisons.
  --artifact NAME       Output artifact label; never changes the order seed or draw.
  --draw FILE           Reuse card identities from a saved dry-run draw JSON.
  --arc v1|v2           Sales-letter arc (default: v1).
  --select 3,5,12       Isolated concurrent house experiment; requires --baseline FILE.\n  --baseline FILE       Freeze earlier signatures from a saved reading for --select.
  --assemble PREFIX     Join twelve saved editorial outputs with matching provenance.
  --repair FILE         Local editorial experiment: per-house JSON draft paths and issues.
  --houses N            Incomplete plumbing check using the first N houses.
  --inspect             Validate and print build/order/draw provenance, then exit free.
  --regrade FILE        Run one paid grade call on an existing reading; no prose generation.
  --help                Show this help without reading an API key.

Examples:
  node scripts/dryrun-02-reading.mjs --order cs_x --artifact before --arc v2
  node scripts/dryrun-02-reading.mjs --order cs_x --artifact after --arc v2 \\
    --draw docs/02/dryrun-02-draw-before.json
  node scripts/dryrun-02-reading.mjs --order cs_x --arc v2 \\
    --draw docs/02/dryrun-02-draw-before.json --inspect

This harness executes only workflow nodes 3 through 7a. It never reaches PDF, upload,
email, wait, retry, or production integration nodes.
`.trim();
if (hasArg('--help') || hasArg('-h')) {
  console.log(HELP);
  process.exit(0);
}

let KEY;
function apiKey() {
  if (KEY) return KEY;
  let envFile = '';
  try { envFile = fs.readFileSync(path.join(REPO, '.env'), 'utf8'); } catch {}
  KEY = process.env.ANTHROPIC_API_KEY || (envFile
    .match(/^\s*ANTHROPIC_API_KEY\s*=\s*(.+)$/m) || [])[1]?.trim().replace(/^['"]|['"]$/g, '');
  if (!KEY) throw new Error('no ANTHROPIC_API_KEY in the environment or the repo .env');
  return KEY;
}

const workflowPath = path.join(ROOT, 'docs/02/02-fulfilment.n8n.json');
const workflowBytes = fs.readFileSync(workflowPath);
const wf = JSON.parse(workflowBytes);
const nodeBy = (p) => wf.nodes.find((n) => n.name.startsWith(p));
const code = (p) => nodeBy(p).parameters.jsCode;
const body = (p) => nodeBy(p).parameters.jsonBody;

const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort()
    .map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
};
const shortHash = (value, raw = false) => crypto.createHash('sha256')
  .update(raw ? value : stableJson(value)).digest('hex').slice(0, 16);
const BUILD_REVISION = shortHash(workflowBytes, true);

const argHouses = Number(argValue('--houses') || 0) || 0;
// ⭐ THE ORDER ID IS THE SEED. Node 4a rotates the essay emphasis and the two optional
//    cross-reading rooms off `order_id`. Vary it whenever comparing readings; reuse it only
//    when testing deterministic regeneration of the same order.
const ARC = argValue('--arc') || 'v1';
if (!['v1', 'v2'].includes(ARC)) throw new Error('--arc must be v1 or v2');
const ORDER_ID = argValue('--order')
  || (ARC === 'v2' ? 'cs_test_dryrun_02_v2' : 'cs_test_dryrun_02');
const ARTIFACT_NAME = argValue('--artifact', '--artifact-name');
const DRAW_FILE = argValue('--draw', '--replay-draw');
const INSPECT_ONLY = hasArg('--inspect');
const REGRADE_FILE = argValue('--regrade');
const safeLabel = (value, flag) => {
  const cleaned = String(value).replace(/[^\w-]/g, '');
  if (!cleaned) throw new Error(`${flag} must contain at least one letter, number, _ or -`);
  return cleaned;
};
const suffix = ARTIFACT_NAME
  ? `-${safeLabel(ARTIFACT_NAME, '--artifact')}`
  : (ORDER_ID === 'cs_test_dryrun_02' ? '' : `-${safeLabel(ORDER_ID, '--order')}`);
const out = path.join(ROOT, `docs/02/dryrun-02-reading${suffix}.md`);

// ── the webhook, as Stripe would send it ─────────────────────────────────────
// ⚠ Shaped from server/routes/backendOffers.ts `checkout` — the metadata keys are the ones
//    that route actually writes, not a guess.
const WEBHOOK = { body: {
  type: 'checkout.session.completed',
  data: { object: {
    id: ORDER_ID,
    payment_status: 'paid',
    created: Math.floor(Date.parse('2026-09-07T21:40:00Z') / 1000),
    customer_details: { email: 'dryrun@theseerwithin.com', name: 'Sarah J Mitchell' },
    metadata: { app: 'the-seer-within', product: 'be_twin_flame', offer: 'twin-flame',
                treatment: 'page', readingCents: '3500', bump: '1',
                bumpProduct: 'astro_force', firstName: 'Sarah',
                c: ARC === 'v2' ? '23' : '3' },   // the letter's CTA code — node 3 reads the arc off it
  } },
} };

// ── a tiny n8n shim: enough for these Code nodes ─────────────────────────────
function runNode(src, { input, runs = {}, runIndex = 0 }) {
  const $input = { first: () => ({ json: input }), all: () => [{ json: input }] };
  const $ = (name) => ({
    first: () => ({ json: runs[name]?.[0]?.[0] ?? {} }),
    all: (_b, r) => {
      const got = runs[name]?.[r];
      if (!got) throw new Error('run not reached');
      return got.map((json) => ({ json }));
    },
  });
  return new Function('$input', '$', '$runIndex', '$json', src)($input, $, runIndex, input);
}

// Evaluate an n8n jsonBody: JSON text with {{ }} slots, each slot stringifying its own value.
const evalBody = (expr, $json) => {
  const filled = expr.replace(/^=/, '').replace(/\{\{([\s\S]*?)\}\}/g,
    (_, js) => String(new Function('$json', `return (${js})`)($json)));
  try { return JSON.parse(filled); }
  catch (e) { throw new Error(`node body did not fill to valid JSON: ${e.message}`); }
};

let calls = 0, inTok = 0, outTok = 0, cacheRead = 0, cacheWrite = 0;
async function claude(payload, label) {
  let r, j;
  for (let attempt = 0; attempt < 4; attempt++) {
    calls += 1;
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey(),
                 'anthropic-version': '2023-06-01',
                 'anthropic-beta': 'server-side-fallback-2026-07-01' },
      body: JSON.stringify(payload),
    });
    j = await r.json();
    if (r.ok) break;
    const retryable = r.status === 429 || r.status === 529 || r.status >= 500;
    if (!retryable || attempt === 3) {
      throw new Error(`${label}: ${r.status} ${JSON.stringify(j).slice(0, 500)}`);
    }
    const waitMs = 1500 * (2 ** attempt);
    console.log(`    ${label} · provider ${r.status}; retry ${attempt + 1}/3 in ${waitMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  const u = j.usage || {};
  inTok += u.input_tokens || 0; outTok += u.output_tokens || 0;
  cacheRead += u.cache_read_input_tokens || 0;
  cacheWrite += u.cache_creation_input_tokens || 0;
  const words = (j.content || []).filter((b) => b.type === 'text')
    .map((b) => b.text).join('').trim().split(/\s+/).length;
  console.log(`    ${label} · ${j.stop_reason} · ${words}w · ` +
    `in ${u.input_tokens} (cache r${u.cache_read_input_tokens || 0}/` +
    `w${u.cache_creation_input_tokens || 0}) out ${u.output_tokens}`);
  return j;
}

// ── regrade a saved reading without regenerating paid prose ──────────────────
if (REGRADE_FILE) {
  const readingPath = path.resolve(process.cwd(), REGRADE_FILE);
  const drawPath = readingPath.replace(/reading/, 'draw').replace(/\.md$/, '.json');
  if (!fs.existsSync(readingPath) || !fs.existsSync(drawPath)) {
    throw new Error('--regrade requires a reading Markdown file and its adjacent draw JSON');
  }
  let reading = fs.readFileSync(readingPath, 'utf8');
  reading = reading.replace(/^[\s\S]*?\n---\n/, '').trim();
  const draw = JSON.parse(fs.readFileSync(drawPath, 'utf8'));
  const target = Number((fs.readFileSync(readingPath, 'utf8')
    .match(/against a target of (\d+)/) || [])[1]) || 8000;
  const brief = { draw, target_words: target };
  const measured = runNode(code('6b ·'), {
    input: { content: [{ type: 'text', text: reading }], stop_reason: 'end_turn' },
    runs: { '6 · Compose the joiner': [[brief]] },
  })[0].json;
  const graded = await claude(evalBody(body('7 ·'), measured), 'regrade');
  const result = runNode(code('7a ·'), {
    input: graded, runs: { '6b · Keep the reading': [[measured]] },
  })[0].json;
  const reportPath = readingPath.replace(/reading/, 'regrade').replace(/\.md$/, '.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    build_revision: BUILD_REVISION,
    reading: readingPath,
    draw: drawPath,
    metrics: measured.metrics,
    verdict: result.verdict,
  }, null, 2));
  console.log(JSON.stringify(result.verdict, null, 2));
  console.log(`\n  ${reportPath}\n`);
  process.exit(0);
}

// ── 3 · the draw ─────────────────────────────────────────────────────────────
console.log('\n  3 · Draw the twelve + build the brief');
let items = runNode(code('3 ·'), { input: WEBHOOK.body ? WEBHOOK : {} }).map((i) => i.json);

let savedArchitecture = null;
if (DRAW_FILE) {
  const drawPath = path.resolve(process.cwd(), DRAW_FILE);
  let saved;
  try { saved = JSON.parse(fs.readFileSync(drawPath, 'utf8')); }
  catch (e) { throw new Error(`cannot read --draw ${drawPath}: ${e.message}`); }
  const savedDraw = Array.isArray(saved) ? saved : saved.draw;
  savedArchitecture = Array.isArray(saved) ? null
    : (saved.architecture ?? saved.architecture_plan ?? null);
  if (!Array.isArray(savedDraw)) {
    throw new Error('--draw must contain a JSON array or an object with a draw array');
  }

  const positions = savedDraw.map((row) => row?.position || row);
  const byHouse = new Map();
  for (const p of positions) {
    const house = Number(p?.house);
    if (!Number.isInteger(house) || house < 1 || house > 12) {
      throw new Error('--draw contains a row without a valid house number 1..12');
    }
    if (byHouse.has(house)) throw new Error(`--draw repeats house ${house}`);
    if (!p.card || !p.card_name) {
      throw new Error(`--draw house ${house} needs card and card_name`);
    }
    byHouse.set(house, p);
  }
  if (byHouse.size !== items.length) {
    throw new Error(`--draw has ${byHouse.size} houses; current workflow requires ${items.length}`);
  }
  const cardSet = new Set(positions.map((p) => p.card));
  if (cardSet.size !== positions.length) throw new Error('--draw repeats a card');

  // Reuse only the dealt facts. Current jobs, obligations, agency lines and other prompt inputs
  // stay current. A saved architecture is replayed when present so a prompt comparison changes
  // the writing instruction rather than silently changing the rhetorical allocation as well.
  const architectureRows = Array.isArray(savedArchitecture) ? savedArchitecture : [];
  const architectureByHouse = new Map(architectureRows.map((row) =>
    [Number(row.house ?? row.position?.house), row.architecture ?? row]));
  const replayedDraw = items.map((item) => {
    const savedPosition = byHouse.get(item.position.house);
    const savedRoomArchitecture = savedPosition.architecture
      ?? architectureByHouse.get(item.position.house) ?? item.position.architecture;
    return {
      ...item.position,
      card: savedPosition.card,
      card_name: savedPosition.card_name,
      reversed: !!savedPosition.reversed,
      architecture: savedRoomArchitecture,
      ...(savedPosition.fixed === undefined ? {} : { fixed: !!savedPosition.fixed }),
    };
  });
  const replayedArchitecture = replayedDraw.map((p) => ({
    house: p.house, card: p.card, architecture: p.architecture, claim_ledger: p.claim_ledger,
  }));
  items = items.map((item, i) => ({
    ...item,
    position: replayedDraw[i],
    draw: replayedDraw,
    architecture_plan: replayedArchitecture,
  }));
  console.log(`    replay draw: ${path.relative(process.cwd(), drawPath) || path.basename(drawPath)}`);
}

const drawIdentity = items.map((item) => ({
  house: item.position.house,
  card: item.position.card,
  reversed: !!item.position.reversed,
}));
const DRAW_HASH = shortHash(drawIdentity);
const architectureOf = (...values) => {
  for (const value of values) {
    if (!value) continue;
    const found = value.architecture ?? value.architecture_plan ?? value.reading_architecture;
    if (found !== undefined && found !== null) return found;
  }
  return null;
};
let architecture = savedArchitecture ?? architectureOf(items[0]);

console.log(`    build revision: ${BUILD_REVISION}`);
console.log(`    order id:       ${ORDER_ID}`);
console.log(`    draw hash:      ${DRAW_HASH}`);
if (architecture !== null) console.log(`    architecture:   ${shortHash(architecture)}`);
if (argHouses) {
  // ⚠ A SHAPE CHECK, NOT A READING. Fewer houses means the joiner is told a smaller total and
  //    the grade will fail line 1. Use it to prove the plumbing, never to judge the writing.
  items = items.slice(0, argHouses).map((it) => ({ ...it, total: argHouses }));
  console.log(`    ⚠ --houses ${argHouses}: PLUMBING ONLY, the reading will be incomplete`);
}
for (const it of items) {
  const p = it.position;
  console.log(`    house ${String(p.house).padStart(2)} · ${p.house_name.padEnd(38)} ` +
    `${p.card_name}${p.reversed ? ' (reversed)' : ''}${p.fixed ? '   ⭐ HERS' : ''}`);
}
if (INSPECT_ONLY) {
  console.log('\n  INSPECT ONLY · no model calls, files, uploads, or production nodes\n');
  process.exit(0);
}

// Controlled editorial experiment: three isolated calls with frozen earlier signatures.
// This intentionally skips the joiner; it cannot establish whole-reading quality.
if (hasArg('--select')) {
  const selected = argValue('--select').split(',').map(Number);
  const baselinePath = argValue('--baseline');
  if (!argValue('--order') || !baselinePath || selected.some(n => !Number.isInteger(n) || n < 1 || n > 12) || new Set(selected).size !== selected.length) throw new Error('--select needs explicit --order, --baseline and unique houses 1..12');
  const baseline = fs.readFileSync(path.resolve(baselinePath), 'utf8');
  const parts = baseline.split(/\[(\d+) · [^·]+ · [^\]]+\]/);
  const old = new Map();
  for (let i=1;i<parts.length;i+=2) old.set(Number(parts[i]),parts[i+1].split('[CLOSE]')[0].trim());
  if (old.size !== 12) throw new Error('baseline needs twelve house markers');
  const frozen = items.map(it => [{ position: it.position, prose: old.get(it.position.house), keynote: it.position.keynote || '' }]);
  const outputBase = path.join(ROOT, `docs/02/experiment${suffix}`);
  const results = await Promise.allSettled(selected.map(async n => {
    const brief = items.find(it => it.position.house === n);
    const prompted = runNode(code('4a ·'), {input:brief,runs:{'4c · Keep the prose':frozen},runIndex:n-1})[0].json;
    if (hasArg('--repair')) {
      const repair = JSON.parse(fs.readFileSync(path.resolve(argValue('--repair')), 'utf8'));
      const entry = repair.houses[String(n)];
      if (!entry || !Array.isArray(entry.issues)) throw new Error(`missing repair instructions for house ${n}`);
      const draft = JSON.parse(fs.readFileSync(path.resolve(entry.draft), 'utf8'));
      const sourceStart = prompted.prompt.indexOf('THE SOURCE THE BUYER');
      const sourceEnd = prompted.prompt.indexOf("THIS ROOM'S ESSAY ARCHITECTURE");
      const source = prompted.prompt.slice(sourceStart,sourceEnd);
      prompted.voice = 'You are a literary editor of a paid tarot reading in Evelyn Cross\'s voice, addressing one intelligent adult. Preserve useful writing while correcting specific defects. Explain with warmth and precision; avoid scolding, invented biography and self-announcing argument stages. The exact promises supplied are firm genre commitments. They do not establish surrounding private facts or remove the buyer\'s choices. No psychic hedging. No sample prose or new narrative.';
      prompted.prompt = `Edit house ${n}: ${brief.position.house_name}; card ${brief.position.card_name}. Preserve the useful argument and wording. Correct the listed defects with deletion and local edits; do not introduce a new story or replace a good analogy. Keep 500–800 words by developing existing teaching rather than adding facts.\n${source}\nREQUIRED PROMISE: ${brief.position.obligation || 'None. Personal applications remain conditional.'}\nCROSS-REFERENCE: ${brief.position.owes ? 'Keep one named dealt card and its house as interpretive evidence, without inferring additional personal facts.' : 'Preserve only an existing useful cross-reference; introduce none.'}\nTIMING: ${n===5 ? 'One relative week for recognition. Any first sign is undated here.' : 'No countdown or action deadline.'}\nOUTPUT: KEYNOTE: three to eight words; complete prose; ${brief.position.architecture.emphasis_position !== 'none' ? 'one TAKEAWAY: line of 8–15 words, a practical distinction without prediction, urgent advice or private claim.' : 'no takeaway.'}\nREPAIR FINDINGS\n` + entry.issues.map((x,i)=>`${i+1}. ${x}`).join('\n') + '\nDRAFT\n' + draft.prose;
    }
    fs.writeFileSync(`${outputBase}-house-${n}-prompt.txt`,prompted.prompt);
    const resp = await claude(evalBody(body('4b ·'),prompted),`house ${n}`);
    fs.writeFileSync(`${outputBase}-house-${n}-raw.json`,JSON.stringify(resp,null,2));
    const kept = runNode(code('4c ·'),{input:resp,runs:{'4 · Each house':[[brief]]}})[0].json;
    fs.writeFileSync(`${outputBase}-house-${n}.json`,JSON.stringify({order:ORDER_ID,build:BUILD_REVISION,drawHash:DRAW_HASH,position:brief.position,keynote:kept.keynote,prose:kept.prose,takeaway:kept.takeaway},null,2));
    return {house:n,prose:kept.prose,takeaway:kept.takeaway};
  }));
  for (const r of results) if(r.status==='rejected') console.error(r.reason);
  const complete = results.filter(r=>r.status==='fulfilled').map(r=>r.value);
  fs.writeFileSync(`${outputBase}.md`, `# Three-house editorial experiment\n\nOrder: ${ORDER_ID}\nBuild: ${BUILD_REVISION}\nDraw: ${DRAW_HASH}\n\n` + complete.map(r=>`## House ${r.house}\n\n${r.prose}\n\nTakeaway: ${r.takeaway || '(none)'}`).join('\n\n'));
  console.log(`Saved ${complete.length}/${selected.length} houses to ${outputBase}.md; no joiner or whole-reading grade.`);
  process.exit(complete.length===selected.length?0:1);
}

let rows;
if (hasArg('--assemble')) {
  const prefix = path.resolve(argValue('--assemble'));
  rows = items.map(brief => {
    const saved = JSON.parse(fs.readFileSync(`${prefix}-house-${brief.position.house}.json`, 'utf8'));
    if (saved.order !== ORDER_ID || saved.drawHash !== DRAW_HASH || saved.position.card !== brief.position.card || stableJson(saved.position.architecture) !== stableJson(brief.position.architecture)) throw new Error('assembled house provenance mismatch');
    const raw = `KEYNOTE: ${saved.keynote || brief.position.card_name}\n\n${saved.prose}` + (saved.takeaway ? `\nTAKEAWAY: ${saved.takeaway}` : '');
    return runNode(code('4c ·'), {input:{content:[{type:'text',text:raw}],stop_reason:'end_turn'},runs:{'4 · Each house':[[brief]]}})[0].json;
  });
  console.log('  Assembled twelve saved editorial outputs; no house-generation calls.');
} else {
// ── 4 · one call per house ───────────────────────────────────────────────────
console.log('\n  4 · Each house');
const keptRuns = {};                                   // '4c · Keep the prose' → run → items
for (let i = 0; i < items.length; i++) {
  const brief = items[i];
  const prompted = runNode(code('4a ·'),
    { input: brief, runs: { '4c · Keep the prose': keptRuns['4c · Keep the prose'] || [] },
      runIndex: i }).map((x) => x.json)[0];
  const resp = await claude(evalBody(body('4b ·'), prompted), `house ${brief.position.house}`);
  // 🔴 `brief`, NOT `prompted`. n8n's node 4c reads $('4 · Each house') — the LOOP's output,
  //    which has never been through 4a and therefore carries no `voice`. Handing it 4a's
  //    output made the harness more forgiving than n8n and hid a real break at the joiner
  //    (n8n execution 30471). A shim that is kinder than the thing it stands in for is worse
  //    than no shim.
  const kept = runNode(code('4c ·'),
    { input: resp, runs: { '4 · Each house': [[brief]] } }).map((x) => x.json);
  (keptRuns['4c · Keep the prose'] ||= []).push(kept);
}
rows = (keptRuns['4c · Keep the prose'] || []).flat();

}

// ── 6 · the joiner ───────────────────────────────────────────────────────────
console.log('\n  6 · Compose the joiner');
const joinBrief = runNode(code('6 ·'), { input: { data: rows } }).map((x) => x.json)[0];
const joined = await claude(evalBody(body('6a ·'), joinBrief), 'joiner');
const read = runNode(code('6b ·'),
  { input: joined, runs: { '6 · Compose the joiner': [[joinBrief]] } }).map((x) => x.json)[0];
architecture ??= architectureOf(joinBrief, read);
const ARCHITECTURE_HASH = architecture === null ? null : shortHash(architecture);

// Write the completed prose before calling the grader. A grader schema or API failure must not
// discard fourteen successful paid calls or make the evidence impossible to inspect.
fs.writeFileSync(out, [
  `# 02 dry run checkpoint — UNGRADED`, '',
  `| | |`, `|---|---|`,
  `| Order | \`${ORDER_ID}\` |`,
  `| Artifact | \`${ARTIFACT_NAME || '(derived from order id)'}\` |`,
  `| Build revision | \`${BUILD_REVISION}\` |`,
  `| Draw hash | \`${DRAW_HASH}\` |`,
  ...(ARCHITECTURE_HASH ? [`| Architecture hash | \`${ARCHITECTURE_HASH}\` |`] : []),
  `| Grade | UNGRADED CHECKPOINT |`, '', '---', '', read.reading,
].join('\n'));
fs.writeFileSync(path.join(ROOT, `docs/02/dryrun-02-draw${suffix}.json`),
  JSON.stringify(read.draw, null, 2));
fs.writeFileSync(path.join(ROOT, `docs/02/dryrun-02-architecture${suffix}.json`),
  JSON.stringify(read.architecture_plan || architecture || [], null, 2));
fs.writeFileSync(path.join(ROOT, `docs/02/dryrun-02-claims${suffix}.json`),
  JSON.stringify((read.draw || []).map((p) => ({
    house: p.house, card: p.card, claim_ledger: p.claim_ledger || null,
  })), null, 2));

// ── 7 · the grade ────────────────────────────────────────────────────────────
console.log('\n  7 · Grade it');
const graded = await claude(evalBody(body('7 ·'), read), 'grade');
const verdict = runNode(code('7a ·'),
  { input: graded, runs: { '6b · Keep the reading': [[read]] } }).map((x) => x.json)[0];

// ── out ──────────────────────────────────────────────────────────────────────
const words = read.reading.trim().split(/\s+/).length;
const v = verdict.verdict;
fs.writeFileSync(out, [
  `# 02 dry run — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '',
  `| | |`, `|---|---|`,
  `| Order | \`${ORDER_ID}\` — the seed behind essay emphasis and optional cross-reading |`,
  `| Artifact | \`${ARTIFACT_NAME || '(derived from order id)'}\` — filename only; not a seed |`,
  `| Build revision | \`${BUILD_REVISION}\` — SHA-256 of the executed workflow JSON |`,
  `| Draw hash | \`${DRAW_HASH}\` — house, card, and reversal identities |`,
  ...(ARCHITECTURE_HASH ? [`| Architecture hash | \`${ARCHITECTURE_HASH}\` |`] : []),
  `| Arc | ${items[0].arc} — "${items[0].mechanism}" |`,
  `| Draw | ${items.map((i) => `${i.position.house}:${i.position.card_name}` +
    `${i.position.reversed ? '(r)' : ''}${i.position.fixed ? '⭐' : ''}`).join(' · ')} |`,
  `| Words | ${words} against a target of ${read.target_words}` +
    ` (${(((words / read.target_words) - 1) * 100).toFixed(0)}%) |`,
  `| Grade | ${v.pass ? 'PASS' : 'FAIL'}${v.failed.length ? ` — lines ${v.failed.join(', ')}` : ''} |`,
  `| Prose scores | weighted ${v.weighted_score ?? 'ungraded'}/10 · recommend ${v.recommend ?? 'ungraded'}/10 |`,
  `| Why | ${v.why} |`,
  `| Model | ${calls} calls · ${inTok} in (${cacheRead} from cache) · ${outTok} out |`,
  '', '---', '', read.reading,
].join('\n'));

const auditPath = path.join(ROOT, `docs/02/dryrun-02-audit${suffix}.json`);
const audit = execFileSync(process.execPath,
  [path.join(ROOT, 'scripts/audit-02-prose.mjs'), '--json', out], { encoding: 'utf8' });
fs.writeFileSync(auditPath, audit);

console.log(`\n  RESULT`);
console.log(`    ${words} words against ${read.target_words} ` +
  `(${(((words / read.target_words) - 1) * 100).toFixed(0)}%)`);
console.log(`    grade: ${v.pass ? 'PASS' : 'FAIL'}` +
  `${v.failed.length ? ` — rubric lines ${v.failed.join(', ')}` : ''}`);
console.log(`    why:   ${v.why}`);
console.log(`    prose: weighted ${v.weighted_score ?? 'ungraded'}/10 · `
  + `recommend ${v.recommend ?? 'ungraded'}/10`);
console.log(`    build ${BUILD_REVISION} · order ${ORDER_ID} · draw ${DRAW_HASH}`);
if (ARCHITECTURE_HASH) console.log(`    architecture ${ARCHITECTURE_HASH}`);
console.log(`    ${calls} calls · in ${inTok} (${cacheRead} cached, ${cacheWrite} written) · out ${outTok}`);
if (cacheRead === 0 && items.length > 1) {
  console.log(`    🔴 CACHE NEVER HIT — every house paid full price for the voice block.`);
}
console.log(`    ${path.relative(REPO, out)}\n`);
console.log(`    audit ${path.relative(REPO, auditPath)}\n`);
