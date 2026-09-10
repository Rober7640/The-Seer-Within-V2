/**
 * Prove node 3's ARC-GUIDED draw never fails, never repeats a card, and always replays the same.
 *
 *   node improve-v1/v1-one-time-BEs/docs/02/n8n/scripts/check-02-draw.mjs [--seeds N]     (default 3000 per arc)
 *
 * ⭐ WHY. The draw is a seeded backtracking search over per-house candidate lists
 *    (scripts/02-houses.json → arcs). A search can starve: a seed whose shuffles leave a late
 *    room with no unused candidate. Node 3 throws in that case, which on a real order is a
 *    red execution and a buyer who hears nothing. So this runs the workflow's OWN node 3 —
 *    pulled out of the built JSON, not reimplemented — over thousands of order ids per arc
 *    and refuses if any one of them throws, duplicates a card, leaves the pool, breaks a
 *    role list, or replays differently.
 *
 * ⚠ Run it after ANY edit to `arcs` in 02-houses.json, then rebuild. A list that looks
 *   generous can still starve on a specific seed, and only a sweep finds that.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const wf = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/02/02-fulfilment.n8n.json')));
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/02-houses.json')));
const draw3 = wf.nodes.find((n) => n.name.startsWith('3 ·')).parameters.jsCode;
const N = Number((process.argv.find((a) => a === '--seeds')
  ? process.argv[process.argv.indexOf('--seeds') + 1] : 3000)) || 3000;

const pool = new Set(Object.keys(spec.cards).filter((c) => !spec.draw.excluded.includes(c)));
const runNode = (src, input) => {
  const $input = { first: () => ({ json: input }), all: () => [{ json: input }] };
  return new Function('$input', '$', '$runIndex', '$json', src)($input, () => ({}), 0, input);
};
const session = (id, c) => ({ body: { type: 'checkout.session.completed', data: { object: {
  id, payment_status: 'paid', created: 1789162800,
  customer_details: { email: 'dryrun@theseerwithin.com', name: 'Sarah J Mitchell' },
  metadata: { app: 'the-seer-within', product: 'be_twin_flame', offer: 'twin-flame',
              bump: '1', firstName: 'Sarah', ...(c ? { c } : {}) } } } } });

let bad = 0;
const fail = (m) => { bad += 1; if (bad <= 12) console.log('  🔴 ' + m); };

for (const [arc, c] of [['v1', '3'], ['v2', '23'], ['v1 (no c at all)', null]]) {
  const key = arc.slice(0, 2);
  const roles = spec.arcs[key].roles;
  const perHouse = {}, perCard = {};
  let thrown = 0;
  for (let n = 0; n < N; n++) {
    const id = `cs_check_${key}_${n}`;
    let items;
    try { items = runNode(draw3, session(id, c)).map((i) => i.json); }
    catch (e) { thrown += 1; if (thrown <= 3) fail(`${arc} seed ${id}: node 3 threw — ${e.message}`); continue; }
    if (items.length !== 12) fail(`${arc} ${id}: ${items.length} items`);
    if (items[0].arc !== key) fail(`${arc} ${id}: arc came out as ${items[0].arc}`);
    const cards = items.map((i) => i.position.card);
    if (new Set(cards).size !== 12) fail(`${arc} ${id}: duplicate card — ${cards.join(' ')}`);
    for (const it of items) {
      const p = it.position;
      if (!pool.has(p.card)) fail(`${arc} ${id}: house ${p.house} drew ${p.card}, not in the pool`);
      if (!roles[String(p.house)].cards.includes(p.card)) fail(`${arc} ${id}: house ${p.house} drew ${p.card}, outside its role list`);
      if (p.owes !== !!it.draw.find((q) => q.house === p.house).obligation) fail(`${arc} ${id}: owes/obligation disagree in house ${p.house}`);
      (perHouse[p.house] ||= {})[p.card] = ((perHouse[p.house] ||= {})[p.card] || 0) + 1;
      perCard[p.card] = (perCard[p.card] || 0) + 1;
    }
    // the replay branch (node 8c hands the order + draw back) must reproduce the twelve exactly
    const again = runNode(draw3, { order: { ...items[0], position: undefined, draw: undefined }, draw: items[0].draw, attempt: 1 })
      .map((i) => i.json.position.card);
    if (again.join() !== cards.join()) fail(`${arc} ${id}: replay drew a different twelve`);
    // and a second fresh run of the same id must too (determinism)
    const fresh = runNode(draw3, session(id, c)).map((i) => i.json.position.card);
    if (fresh.join() !== cards.join()) fail(`${arc} ${id}: the same order id drew twice differently`);
  }
  console.log(`\n  ${arc}: ${N} seeds · ${thrown} threw`);
  const owed = Object.keys(roles).filter((h) => spec[key === 'v2' ? 'obligations_v2' : 'obligations'][h]);
  for (const h of Object.keys(roles)) {
    const dist = perHouse[h] || {};
    const top = Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k.replace(/^the-/, '')} ${(100 * v / N).toFixed(0)}%`).join(' · ');
    console.log(`    house ${String(h).padStart(2)}${owed.includes(h) ? ' ⭐' : '  '} ${top}`);
  }
  const usage = Object.entries(perCard).sort((a, b) => b[1] - a[1]);
  console.log(`    cards: ${usage.map(([k, v]) => `${k.replace(/^the-/, '')} ${(v / N).toFixed(2)}`).join(' · ')}`);
  console.log(`    (a card's number is how many houses it fills per reading, on average; 12/16 = 0.75 would be perfectly even)`);
}

// the two arcs must NOT coincide for the same buyer — different story, different table
let same = 0;
for (let n = 0; n < 200; n++) {
  const a = runNode(draw3, session(`cs_both_${n}`, '3')).map((i) => i.json.position.card).join();
  const b = runNode(draw3, session(`cs_both_${n}`, '23')).map((i) => i.json.position.card).join();
  if (a === b) same += 1;
}
console.log(`\n  same order id under v1 and v2: identical tables in ${same} of 200`);
if (same > 20) fail('the arcs are not separating the draws');

console.log(bad ? `\n  🔴 ${bad} FAILED\n` : `\n  ✅ the draw holds: no starvation, no repeats, replay-safe, both arcs\n`);
process.exit(bad ? 1 : 0);
