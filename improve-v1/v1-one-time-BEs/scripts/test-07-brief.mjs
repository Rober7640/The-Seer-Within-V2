/**
 * Run node "4 · Build the brief" — the REAL code, pulled out of the generated workflow JSON —
 * against every spread in the registry at every tier.
 *
 *   node scripts/test-07-brief.mjs
 *
 * ⛔ It reads the jsCode out of docs/07-marcus/07-fulfilment.n8n.json, so it tests what would
 *    actually be imported. A copy of the logic here would prove nothing.
 *
 * ⭐ Every spread, count and free flag comes from scripts/07-spreads.json, and the run is
 *    asserted against `resolve` in scripts/07-registry.mjs. That is the point: the number the
 *    booking page SELLS and the number n8n DELIVERS are proved equal here, rather than being two
 *    hand-maintained tables that happen to match today.
 */
import fs from 'fs';
import { spreads, spread, resolve, ORDER, TIER_MODEL } from './07-registry.mjs';

const wf = JSON.parse(fs.readFileSync(new URL('../docs/07-marcus/07-fulfilment.n8n.json', import.meta.url)));
const brief = wf.nodes.find(n => n.name.startsWith('4 · Build the brief')).parameters.jsCode;

// ⛔ The registry is on 07-C5 (a rung is how many of HER questions get answered). If node 4 is
//    still the C2 block ladder there is nothing meaningful to assert — every count would differ
//    by construction — so say which model each side is on and stop.
if (/const IS_SPREAD\b/.test(brief) && TIER_MODEL.id === 'questions-asked') {
  console.log('❌ node 4 and the registry are on different tier models.\n');
  console.log('   registry  scripts/07-spreads.json   →  questions-asked  (07-C5, locked 2026-09-04)');
  console.log('   node 4    07-fulfilment.n8n.json    →  blocks           (07-C2, IS_SPREAD present)\n');
  console.log('   07-C5 §7.1 deletes IS_SPREAD, resolve, blocks, skipped, ORDER and the');
  console.log('   cheaper-tier throw — about 25 lines — and §7.2 is the replacement.');
  console.log('   Edit BRIEF_JS in scripts/build-07-n8n.py, regenerate, then re-run this.');
  process.exit(1);
}

const run = new Function('$input', `${brief}`);

// A draw record as the server will hand it over: the day's spread, plus the morning's open six.
const asBlock = (key) => spread(key).positions.map(p => ({
  number: p.n, name: p.name, job: p.job, card_name: 'The Fool', reversed: false, free: !!p.free,
}));
const openSix = Array.from({ length: TIER_MODEL.open_draw_size }, (_, i) => ({
  number: i + 1, card_name: 'The Fool', reversed: false,
}));

let fail = 0;
for (const [key, s] of spreads()) {
  const out = [];
  for (const tier of ORDER) {
    const want = resolve(key, tier);
    const qs = { question: 'q1', question_2: 'q2', question_3: 'q3' };
    const o = {
      order_id: 'x', email: 'a@b.c', first_name: 'Sarah', topic: 'love', tier,
      paid_at: '2026-09-03T00:00:00Z', email_free_read: '…', ...qs,
      draw: {
        spread_name: s.name, spread_key: key, draw_date: '2026-09-03',
        day: asBlock(key), open: openSix,
      },
    };
    try {
      const items = run({ first: () => ({ json: o }) });
      const seen = new Set(items.map(i => `${i.json.position.name}#${i.json.answer ?? 1}`));
      const dup = items.length - seen.size;
      out.push(`${tier}:${String(items.length).padStart(2)}${dup ? ` DUP:${dup}` : ''}`);
      if (dup) fail++;
      // ⭐ The assertion this file exists for: n8n writes exactly what the booking page priced.
      const wantPaid = want.positions.length;
      if (items.length !== wantPaid) { out.push(`✗ n8n ${items.length} ≠ registry ${wantPaid}`); fail++; }
    } catch (e) {
      out.push(`${tier}:THREW ✗`); fail++;
      console.log(`    ${e.message}`);
    }
  }
  const free = s.positions.filter(p => p.free).length;
  console.log(`${s.day}  ${s.name.padEnd(22)} ${free}f+${s.positions.length - free}p   ${out.join('   ')}`);
}

// ⛔ A paid second question with no text is a refund, not a reading. Fulfilment never invents one.
try {
  run({ first: () => ({ json: {
    order_id: 'x', email: 'a@b.c', first_name: 'S', topic: 'love', tier: 'pattern',
    question: 'q1', question_2: '', paid_at: '2026-09-03T00:00:00Z',
    draw: { spread_name: 'The Weight', spread_key: 'the-weight', draw_date: '2026-09-03',
            day: asBlock('the-weight'), open: openSix },
  } }) });
  console.log('\n❌ a missing second question was accepted — it must hold the order');
  fail++;
} catch { console.log('\n✓ a missing second question holds the order'); }

console.log(fail ? `\n❌ ${fail} problem(s)` : `\n✅ all 7 spreads × ${ORDER.length} rungs behave, and every count matches the registry`);
process.exit(fail ? 1 : 0);
