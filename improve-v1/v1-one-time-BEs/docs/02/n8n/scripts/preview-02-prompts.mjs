/**
 * Render 02's prompts WITHOUT calling a model, and check what a dry run cannot check cheaply.
 *
 *   node improve-v1/v1-one-time-BEs/docs/02/n8n/scripts/preview-02-prompts.mjs [--house N] [--seed ORDERID] [--arc v1|v2]
 *   node improve-v1/v1-one-time-BEs/docs/02/n8n/scripts/preview-02-prompts.mjs --spread   # draws only
 *   node improve-v1/v1-one-time-BEs/docs/02/n8n/scripts/preview-02-prompts.mjs --architecture --seed ORDERID
 *   node improve-v1/v1-one-time-BEs/docs/02/n8n/scripts/preview-02-prompts.mjs --metrics FILE.md
 *
 * ⭐ WHY. A full dry run spends model tokens and several minutes, so it is the wrong instrument for
 *    "does the prompt say what I think it says". Every fault the tarot reader found came out of
 *    a PROMPT, and a prompt can be read for nothing. Run this first, every time.
 *
 * ⚠ It runs the BUILT workflow's own Code nodes through the same shim the dry run uses — it is
 *   not a reimplementation. A prompt that renders here is the prompt n8n sends.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const wf = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/02/02-fulfilment.n8n.json')));
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/02-houses.json')));
const code = (p) => wf.nodes.find((n) => n.name.startsWith(p)).parameters.jsCode;
const arg = (f, d) => (process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : d);

function runNode(src, { input, runs = {}, runIndex = 0 }) {
  const $input = { first: () => ({ json: input }), all: () => [{ json: input }] };
  const $ = (name) => ({
    first: () => ({ json: runs[name]?.[0]?.[0] ?? {} }),
    all: (_b, r) => { const got = runs[name]?.[r]; if (!got) throw new Error('run not reached');
      return got.map((json) => ({ json })); },
  });
  return new Function('$input', '$', '$runIndex', '$json', src)($input, $, runIndex, input);
}

// ⭐ --arc v2 = the second letter's buyer (c inside 02-E3's CTA range). Default v1.
const ARC = arg('--arc', 'v1');
if (!['v1', 'v2'].includes(ARC)) throw new Error('--arc must be v1 or v2');
const session = (id) => ({ body: { type: 'checkout.session.completed', data: { object: {
  id, payment_status: 'paid', created: Math.floor(Date.parse('2026-09-07T21:40:00Z') / 1000),
  customer_details: { email: 'dryrun@theseerwithin.com', name: 'Sarah J Mitchell' },
  metadata: { app: 'the-seer-within', product: 'be_twin_flame', offer: 'twin-flame',
              bump: '1', firstName: 'Sarah', c: ARC === 'v2' ? '23' : '3' } } } } });

// ── --metrics: run node 6b's counters over a reading that already exists ──────
// ⭐ The regexes in 6b decide whether the grader is told the truth about dates and cross-refs.
//    Point this at an OLD reading and the counts should be BAD — that is how you know they work.
if (process.argv.includes('--metrics')) {
  const file = arg('--metrics');
  let text = fs.readFileSync(path.isAbsolute(file) ? file : path.join(ROOT, file), 'utf8');
  text = text.replace(/^[\s\S]*?\n---\n/, '');                      // drop a dry-run header
  // 🔴 THE DRAW MUST MATCH THE READING. This used to read `dryrun-02-draw.json` whatever file it
  //    was given, so a reading run under `--order X` was measured against the LAST run's cards:
  //    it reported the dated room as house 11 when the Lovers had fallen in 7, and every
  //    cross-reference count with it. ⛔ A measuring tool that quietly measures the wrong thing
  //    is worse than no tool — it was about to cost a real prompt change.
  // ⛔ GENERIC, not `dryrun-`-only. This was hardcoded to the dry-run filename, so pointing
  //    it at an n8n artefact refused to run — the one case it most needs to handle, since
  //    an n8n reading is the only evidence of what a buyer actually receives.
  const drawFile = file.replace(/reading/, 'draw').replace(/\.md$/, '.json');
  const drawPath = path.isAbsolute(drawFile) ? drawFile : path.join(ROOT, drawFile);
  if (!fs.existsSync(drawPath)) {
    console.error(`\n  ⛔ no draw beside that reading: ${drawFile}\n     Every count below would `
      + `be measured against a different set of twelve cards.\n`);
    process.exit(1);
  }
  const draw = JSON.parse(fs.readFileSync(drawPath));
  const out = runNode(code('6b ·'), {
    input: { content: [{ type: 'text', text }], stop_reason: 'end_turn' },
    runs: { '6 · Compose the joiner': [[{ draw, target_words: spec.target_words }]] },
  })[0].json.metrics;
  console.log(`\n  ${file}\n  drawn from ${path.basename(drawPath)}\n`);
  console.log(`    words              ${out.words}`);
  console.log(`    house words        ${out.house_words.map((h) => `${h.house}:${h.words}`).join(' · ')}`);
  console.log(`    close marker       ${out.close_marker ? '✅ present' : '🔴 missing'}`);
  console.log(`    teaching conditionals ${out.conditional_words}`);
  console.log(`    refusal-shaped I   ${out.i_wont}`);
  for (const w of out.withholds) console.log(`      🔴 house ${w.house} — ${w.phrase}`);
  console.log(`    sentence mean      ${out.sentence_mean.toFixed(1)} words · SD ${out.sentence_sd.toFixed(1)}`);
  console.log(`    paragraph mean     ${out.paragraph_mean.toFixed(1)} words`);
  console.log(`    dear               ${out.dear} ${out.dear <= 3 ? '✅' : '🔴'}`);
  console.log(`    generic women      ${out.generic_women.length} ${out.generic_women.length <= 2 ? '✅' : '🔴'}`);
  for (const x of out.generic_women) console.log(`      house ${x.house} — ${x.phrase}`);
  console.log(`    repeated 8-grams   ${out.repeated_8grams.length} ${out.repeated_8grams.length ? '🔴' : '✅'}`);
  for (const x of out.repeated_8grams) console.log(`      houses ${x.houses.join(',')} — ${x.phrase}`);
  console.log(`    method announcements ${out.method_announcements.length}`);
  console.log(`    biography candidates ${out.biography_candidates.length}`);
  for (const x of out.biography_candidates) console.log(`      ⚠ house ${x.house} — ${x.phrase}`);
  console.log(`    consequential candidates ${out.consequential_candidates.length}`);
  for (const x of out.consequential_candidates) console.log(`      ⚠ house ${x.house} — ${x.phrase}`);
  // ⭐ the single number that ranked three blind human grades correctly
  const fogRate = out.words ? out.fog / out.words * 1000 : 0;
  console.log(`    fog (abstract nouns) ${out.fog} · ${fogRate.toFixed(1)}/1k   ${fogRate <= 17 ? '✅ clean' : fogRate >= 30 ? '🔴 fog' : '⚠ middling'}`);
  console.log(`    the dated room     house ${out.dated_room} (the love answer)`);
  console.log(`    dated claims       ${out.dated.length}`);
  for (const d of out.dated) {
    const ok = d.house === out.dated_room || d.house === -1 || d.kind === 'action';
    console.log(`      ${ok ? '✅' : '🔴'} house ${String(d.house).padStart(2)} [${d.kind}] — ${d.phrase}`);
  }
  const cr = out.crossrefs.filter((c) => c.names.length);
  console.log(`    passages arguing   ${cr.length} of ${out.crossrefs.length}`);
  for (const c of cr) console.log(`       house ${String(c.house).padStart(2)} names ${c.names.join(', ')}`);
  console.log(`    majors marvel      ${out.majors_marvel ? '🔴 YES' : '✅ no'}\n`);
  process.exit(0);
}

// ── --spread: draw N orders and show only the twelve, to eyeball the draw rules ──
if (process.argv.includes('--spread')) {
  for (let n = 0; n < Number(arg('--spread', 6)) || n < 6; n++) {
    const items = runNode(code('3 ·'), { input: session(`cs_preview_${n}`) }).map((i) => i.json);
    console.log(`  ${items.map((i) => `${i.position.house}:${i.position.card_name.replace(/^the /, '')}`
      + `${i.position.reversed ? '(r)' : ''}${i.position.fixed ? '⭐' : ''}`).join(' · ')}`);
  }
  process.exit(0);
}

// ── --architecture: inspect the seeded prose allocation and claim ledgers ─────
if (process.argv.includes('--architecture')) {
  const orderId = arg('--seed', 'cs_test_dryrun_02');
  const items = runNode(code('3 ·'), { input: session(orderId) }).map((i) => i.json);
  console.log(JSON.stringify({
    order_id: orderId,
    arc: items[0].arc,
    architecture_plan: items[0].architecture_plan,
  }, null, 2));
  process.exit(0);
}

// ── the default: render one house prompt in full ─────────────────────────────
const orderId = arg('--seed', 'cs_test_dryrun_02');
const want = Number(arg('--house', 0));
const items = runNode(code('3 ·'), { input: session(orderId) }).map((i) => i.json);
console.log(`\n  ORDER ${orderId} · arc ${items[0].arc}`);
for (const it of items) {
  const p = it.position;
  console.log(`    house ${String(p.house).padStart(2)} · ${p.house_name.padEnd(38)} `
    + `${p.card_name}${p.reversed ? ' (reversed)' : ''}${p.fixed ? '   ⭐ HERS' : ''}`
    + ` · ${p.architecture.target_words}w · buyer ${p.architecture.customer_entry}`);
}

const pick = want ? items.find((i) => i.position.house === want) : items.find((i) => i.position.owes);
const prompted = runNode(code('4a ·'), { input: pick, runs: {}, runIndex: 0 })[0].json;
console.log(`\n${'═'.repeat(96)}\n  HOUSE ${pick.position.house} PROMPT `
  + `(${(prompted.prompt.split(/\s+/).length)} words, voice block `
  + `${prompted.voice.split(/\s+/).length} words)\n${'═'.repeat(96)}\n`);
console.log(prompted.prompt);
