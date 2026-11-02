/**
 * Runs node 3's real code across thousands of made-up buyers.
 *   node scripts/check-11-draw.mjs [buyers]
 * Free: no model, no network.
 */
import { loadWf, GETBACK, codeOf, runCode, SPEC, report } from './lib-11.mjs';

const N = Number(process.argv[2] || 12000);
const src = codeOf(loadWf(GETBACK), '3 ·');
const FIRST = ['Ann', 'Mary', 'Linda', 'Barbara', 'Sue', 'Carol', 'Joyce', 'Peggy', 'Ruth', 'Gloria', 'Maria',
  'Sharon', 'Debra', 'Nancy', 'Rita', 'Lynn', 'Dolores', 'Yvonne', 'Bev', 'Georgia', 'Hazel', 'Irene'];
const MID = ['', 'Ann', 'Marie', 'Lee', 'Jean', 'Louise', 'May', 'Rose', 'Kay', 'Grace'];
const LAST = ['Smith', 'Johnson', 'Rodriguez', 'Walker', 'Kowalski', 'Nguyen', 'Hill', 'Baker', 'McIntyre', 'Owens',
  "O'Brien", 'Ramirez', 'Foster', 'Bryant', 'Hughes', 'Sanders'];
const pick = (a, i) => a[Math.abs(i) % a.length];
const drive = (i) => {
  const name = [pick(FIRST, i * 7), pick(MID, i * 13), pick(LAST, i * 31 + (i >> 4))].filter(Boolean).join(' ');
  const y = 1938 + (i % 50), m = 1 + (i * 3 % 12), d = 1 + (i * 11 % 28);
  const dob = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { name, dob, order: `cs_live_${i.toString(36)}x${(i * 2654435761 % 4294967296).toString(36)}` };
};
const item = ({ name, dob, order, first = 'Ann' }) => ({ json: { body: { data: { object: {
  id: order, created: 1793620800, customer_details: { email: 'x@example.com' }, metadata: {} } } },
  intake: { fullBirthName: name, dateOfBirth: dob, firstName: first } } });
const go = (b) => runCode(src, { input: [item(b)] })[0].json;

const all = [];
for (let i = 1; i <= N; i++) all.push(go(drive(i)));
const every = (fn) => { const bad = all.filter((j) => !fn(j)); return bad.length ? { ok: false, note: `${bad.length} of ${N} break it` } : true; };

const freq = {}, deck = new Set();
for (const j of all) for (const d of j.deal) { freq[d.card] = (freq[d.card] || 0) + 1; deck.add(d.card); }
const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
const houses = Array.from({ length: 12 }, (_, i) => i + 1);
const pool = Object.values(SPEC.pools).flat();
const seen = new Set(all.map((j) => j.deal.map((d) => d.card).join(',')));

const bad = report(`11 · the deal, ${N} made-up buyers`, [
  ['THE TWELVE', [
    ['twelve distinct cards every time', () => every((j) => new Set(j.deal.map((d) => d.card)).size === 12 && j.deal.length === 12)],
    ['Hermit, Judgement, Devil never laid', () => every((j) => !j.deal.some((d) => SPEC.excluded.includes(d.card)))],
    ['every card comes from its own act', () => every((j) => j.deal.every((d) => SPEC.pools[d.act].includes(d.card)))],
    ['houses 8, 10 and 12 always hold an allowed card', () => every((j) => Object.entries(SPEC.deal_rules.must)
      .every(([h, list]) => list.includes(j.deal.find((d) => d.house === Number(h)).card)))],
    ['Death only ever lands at 8 or 10', () => every((j) => {
      const d = j.deal.find((x) => x.card === 'death');
      return !d || SPEC.deal_rules.death_only_at.includes(d.house); })],
    ['reversals are off: no reversed field anywhere', () => every((j) => !j.deal.some((d) => 'reversed' in d))],
    ['all 19 cards get used across the run', () => (deck.size === 19 ? true : { ok: false, note: `${deck.size} used` })],
    ['no card takes more than three times the rate of the rarest', () => {
      const hi = sorted[0][1], lo = sorted[sorted.length - 1][1];
      return { ok: hi / lo <= 3, note: `most ${sorted[0][0]} ${(hi / N * 100).toFixed(1)}%, least ${sorted[sorted.length - 1][0]} ${(lo / N * 100).toFixed(1)}%` };
    }],
    ['a pool holds every card it needs', () => pool.length >= 12 && SPEC.acts.every((a) => SPEC.pools[a.key].length >= a.houses.length)],
    ['deals vary', () => ({ ok: seen.size > N * 0.5, note: `${seen.size} different deals in ${N} buyers` })],
  ]],
  ['SAME BUYER, SAME CARDS', [
    ['replay gives the same numbers, answers and cards', () => {
      for (let i = 1; i <= 2000; i++) { const b = drive(i * 3);
        const x = go(b), y = go(b);
        if (JSON.stringify([x.deal, x.numbers, x.answers]) !== JSON.stringify([y.deal, y.numbers, y.answers])) return false; }
      return true; }],
    ['a different order id never changes her cards', () => {
      const b = drive(5), x = go(b), y = go({ ...b, order: 'cs_live_other' });
      return JSON.stringify(x.deal) === JSON.stringify(y.deal); }],
    ['spacing and case in her name never change her cards', () => {
      const x = go({ ...drive(9), name: 'Ann  MARIE smith' }), y = go({ ...drive(9), name: 'ann marie Smith' });
      return JSON.stringify(x.deal) === JSON.stringify(y.deal); }],
    ['a different order id does change the rotations', () => {
      const b = drive(11), x = go(b), y = go({ ...b, order: 'cs_live_other2' });
      return JSON.stringify(x.devices) !== JSON.stringify(y.devices); }],
  ]],
  ['THE ROTATIONS (§8)', [
    ['flat opening forced at 1, 9, 10', () => every((j) => [1, 9, 10].every((h) => j.devices.opening[h] === 'flat'))],
    ['no two opening styles alike in a row, except 9 then 10', () => every((j) => houses.slice(1).every((h) =>
      h === 10 || j.devices.opening[h] !== j.devices.opening[h - 1]))],
    ['at least 2 sections with no table moment', () => every((j) => houses.filter((h) => j.devices.moment[h] === 'none').length >= 2)],
    ['no-moment sections sit where the night has no fixed beat', () => every((j) => houses.filter((h) => j.devices.moment[h] === 'none')
      .every((h) => SPEC.devices.none_eligible.includes(h)))],
    ['table moment never alike in a row', () => every((j) => houses.slice(1).every((h) =>
      j.devices.moment[h] === 'none' || j.devices.moment[h] !== j.devices.moment[h - 1]))],
    ['endings never alike in a row, 7 → 8 paper excepted', () => every((j) => houses.slice(1).every((h) =>
      h === 8 || j.devices.ending[h] !== j.devices.ending[h - 1]))],
    ['"stop" ends at most 5 sections', () => every((j) => Object.values(j.devices.ending).filter((e) => e === 'stop').length <= 5)],
    ['paper endings only at 7 and 8', () => every((j) => houses.filter((h) => j.devices.ending[h] === 'paper').join() === '7,8')],
    ['the list sits at 2 or 7, once', () => every((j) => [2, 7].includes(j.devices.list_house))],
    ['dear in three sections, one per act', () => every((j) => j.devices.dear_houses.length === 3
      && j.devices.dear_houses.every((h, i) => SPEC.acts[i].houses.includes(h)))],
    ['20 name uses in all', () => every((j) => Object.values(j.devices.names).reduce((a, b) => a + b, 0) === 20)],
    ['one card-8 place, one drink, one swear, one prop', () => every((j) => SPEC.devices.card8_place.includes(j.devices.card8_place)
      && SPEC.devices.drink.includes(j.devices.drink) && SPEC.devices.swears_at.includes(j.devices.swears_at) && SPEC.devices.prop.includes(j.devices.prop))],
    ['no three cards in a row within 20 words', () => every((j) => {
      const w = houses.map((h) => j.devices.words[h]);
      return !w.some((_, i) => i > 1 && Math.max(w[i], w[i - 1], w[i - 2]) - Math.min(w[i], w[i - 1], w[i - 2]) <= 20); })],
    ['the card targets always total the same', () => {
      const t = new Set(all.map((j) => houses.reduce((a, h) => a + j.devices.words[h], 0)));
      return { ok: t.size === 1, note: `${[...t].join(', ')} words across the 12 cards` }; }],
    ['the art links only ever name cards that are down', () => every((j) => { const d = new Set(j.deal.map((x) => x.card));
      return j.links.every((l) => d.has(l.a) && (!l.b || d.has(l.b))); })],
  ]],
]);
console.log('    card frequency: ' + sorted.map(([k, v]) => `${k} ${(v / N * 100).toFixed(1)}%`).join(', '));
process.exit(bad ? 1 : 0);
