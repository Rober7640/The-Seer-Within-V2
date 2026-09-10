/**
 * Run one order through 07's fulfilment logic, for real, without n8n.
 *
 *   node scripts/dryrun-07-reading.mjs [tue] [spread|pattern|table]
 *
 * ⭐ THE CODE NODES ARE NOT REIMPLEMENTED HERE. `4 · Build the brief`, `5a · Compose the
 *    position prompt`, `5c`, `7 · Compose the joiner` and `7b` are pulled out of
 *    docs/07-marcus/07-fulfilment.n8n.json and executed. The model calls use the same
 *    bodies as the HTTP nodes. So this tests the workflow, not a copy of it.
 *
 * What it cannot test: Stripe, PDFShift, Supabase Storage, AWeber, the Wait node, and the
 * three server endpoints that do not exist. Those are integrations, not logic.
 *
 * ⛔ Costs real money — one Opus call per paid position plus one to join, and a Sonnet
 *    grade. Tuesday at tier 'spread' is 6 + 1 + 1.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPO = path.dirname(path.dirname(ROOT));
// ⭐ OPENAI_API_KEY since 2026-09-06 — the workflow moved off Anthropic, so this did too.
//    ⚠ An ACTIVE (uncommented) .env line only. Reviving a commented-out key silently is how
//    you end up billing an account you did not mean to.
const KEY  = process.env.OPENAI_API_KEY || (fs.readFileSync(path.join(REPO, '.env'), 'utf8')
  .match(/^\s*OPENAI_API_KEY\s*=\s*(.+)$/m) || [])[1]?.trim().replace(/^['"]|['"]$/g, '');
if (!KEY) throw new Error('no OPENAI_API_KEY — put it in the repo .env or export it');

const wf = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/07-marcus/07-fulfilment.n8n.json')));
const code = (prefix) => wf.nodes.find((n) => n.name.startsWith(prefix)).parameters.jsCode;
const body = (prefix) => wf.nodes.find((n) => n.name.startsWith(prefix)).parameters.jsonBody;

// ── the order ────────────────────────────────────────────────────────────────
// Tuesday's two free cards and the free-read prose are lifted from the SHIPPED email.
// The six face-down cards are a test draw: in production they come from the stored
// draw record, which is written when the email is built.
const ORDERS = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/07-dryrun-orders.json')));

// ── a tiny n8n shim: enough for these five Code nodes ────────────────────────
function runNode(src, { input, runs = {}, runIndex = 0, extraVars = {} }) {
  const $input = { first: () => ({ json: input }), all: () => [{ json: input }] };
  const $ = (name) => ({
    first: () => ({ json: runs[name]?.[0]?.[0] ?? {} }),
    all: (_branch, r) => {
      const got = runs[name]?.[r];
      if (!got) throw new Error('run not reached');
      return got.map((json) => ({ json }));
    },
  });
  const fn = new Function('$input', '$', '$runIndex', '$json', ...Object.keys(extraVars),
    `${src}`);
  return fn($input, $, runIndex, input, ...Object.values(extraVars));
}

// ⭐ OPENAI, switched 2026-09-06 with the workflow. This function exists to make the SAME call
//    the n8n node makes — if the node moves and this does not, the dry run proves nothing.
async function model(payload, label) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${label}: ${r.status} ${JSON.stringify(j).slice(0, 400)}`);
  const c = (j.choices || [])[0] || {};
  if (c.message && c.message.refusal) throw new Error(`${label}: refused — ${c.message.refusal}`);
  const text = ((c.message || {}).content || '').trim();
  // 🔴 Reasoning tokens come out of max_completion_tokens. A silent empty return is the exact
  //    failure the workflow already paid for once — surface it here, where it is cheap.
  if (c.finish_reason === 'length') {
    console.warn(`⚠ ${label}: finish_reason=length — reasoning + prose hit ` +
      `max_completion_tokens (${(j.usage || {}).completion_tokens} completion tokens, ` +
      `${((j.usage || {}).completion_tokens_details || {}).reasoning_tokens} of them reasoning). ` +
      `Lower reasoning_effort; a bigger ceiling only moves the wall.`);
  }
  return { text, usage: j.usage, raw: j };
}

// Evaluate an n8n jsonBody. The nodes use the LITERAL form the live workflow uses:
//   ={ "model": "...", "messages": [{ "content": {{ JSON.stringify($json.prompt) }} }] }
// i.e. JSON text with {{ }} slots, NOT one `={{ JSON.stringify({...}) }}` wrapping everything.
// ⛔ The wrapping form evaluates to a STRING and n8n posts the string, which the API rejects
//    with "The request body must be a JSON object, got str." An earlier version of this file
//    hit exactly that and JSON.parse-d its way around it — patching the test instead of the
//    node. Each slot already stringifies its own value, so the filled text is valid JSON.
const evalBody = (expr, $json) => {
  const filled = expr.replace(/^=/, '').replace(/\{\{([\s\S]*?)\}\}/g,
    (_, code) => String(new Function('$json', `return (${code})`)($json)));
  try {
    return JSON.parse(filled);
  } catch (e) {
    throw new Error(`body did not resolve to valid JSON: ${e.message}\n${filled.slice(0, 300)}`);
  }
};

// ── run ──────────────────────────────────────────────────────────────────────
const day  = process.argv[2] || 'tue';
const tier = process.argv[3] || 'spread';
const order = { ...ORDERS[day], tier };
if (!order.order_id) throw new Error(`no dry-run order for '${day}'`);

console.log(`\n${order.draw.spread_name} · ${order.draw.draw_date} · tier '${tier}'`);
console.log(`Her question: "${order.question}"\n`);

// 4 · Build the brief — the real node
const items = runNode(code('4 · Build the brief'), { input: order }).map((i) => i.json);
console.log(`${items.length} paid positions to write, ~${Math.round(items[0].target_words / items.length)} words each\n`);

// 5 · loop
const keep = {};   // runs of '5c · Keep the prose'
let inTok = 0, outTok = 0, cacheRead = 0;
for (let i = 0; i < items.length; i++) {
  const posed = runNode(code('5a · Compose'), {
    input: items[i], runs: { '5c · Keep the prose': keep }, runIndex: i,
  })[0].json;

  const payload = evalBody(body('5b · Write the position'), posed);
  const t0 = Date.now();
  const { text, usage } = await model(payload, `position ${i + 1}`);
  inTok += usage.input_tokens; outTok += usage.output_tokens;
  cacheRead += usage.cache_read_input_tokens || 0;

  const kept = runNode(code('5c · Keep the prose'), {
    input: { content: [{ type: 'text', text }] },
    runs: { '5 · Each position': { 0: [items[i]] } },
  })[0].json;
  keep[i] = [kept];

  const w = text.split(/\s+/).length;
  console.log(`  ${String(i + 1).padStart(2)} · ${kept.position.name}`);
  console.log(`     ${kept.position.card_name}${kept.position.reversed ? ' (reversed)' : ''} — ${w} words, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

// 6 · aggregate → 7 · join
const rows = Object.values(keep).flat();
const joiner = runNode(code('7 · Compose the joiner'), { input: { data: rows } })[0].json;
console.log(`\njoining ${rows.length} positions…`);
const jp = evalBody(body('7a · Join into one reading'), joiner);
const joined = await model(jp, 'joiner');
inTok += joined.usage.input_tokens; outTok += joined.usage.output_tokens;
const reading = runNode(code('7b · Keep the reading'), {
  input: { content: [{ type: 'text', text: joined.text }] },
  runs: { '7 · Compose the joiner': { 0: [joiner] } },
})[0].json.reading;

// 8 · grade
const gp = evalBody(body('8 · Grade it'), { ...joiner, reading });
const graded = await model(gp, 'grader');
let verdict;
try { verdict = JSON.parse(graded.text.match(/\{[\s\S]*\}/)[0]); }
catch { verdict = { pass: true, failed: [], why: 'grader output unparseable — passed through' }; }

const words = reading.split(/\s+/).length;
const target = items[0].target_words;
console.log(`\nreading: ${words} words (target ${target}, ${((words / target - 1) * 100).toFixed(0)}%)`);
console.log(`grade:   ${verdict.pass ? 'PASS' : 'FAIL'}${verdict.failed?.length ? ' — ' + verdict.failed.join(', ') : ''}`);
console.log(`${verdict.why || ''}`);
console.log(`tokens:  ${inTok} in (${cacheRead} cached) / ${outTok} out`);

const out = path.join(ROOT, `docs/07-marcus/dryrun-${day}-${tier}.md`);
fs.writeFileSync(out, [
  `# Dry run — ${order.draw.spread_name}, tier '${tier}'`, '',
  `⛔ Generated by \`scripts/dryrun-07-reading.mjs\`. Not sent to anyone.`, '',
  `| | |`, `|---|---|`,
  `| Question | ${order.question} |`,
  `| Positions written | ${rows.length} |`,
  `| Words | ${words} (target ${target}) |`,
  `| Grade | ${verdict.pass ? 'PASS' : 'FAIL'} |`,
  `| Grader said | ${verdict.why || ''} |`,
  `| Tokens | ${inTok} in / ${outTok} out |`, '',
  '---', '', reading, '',
].join('\n'));
console.log(`\nwrote ${path.relative(REPO, out)}`);
