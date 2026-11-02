/**
 * Node 3's numbers against the REAL engine, server/lib/numerologyEngine.ts.
 *   npx tsx scripts/check-11-numbers.mjs [buyers]
 * Free: no model, no network. Masters and the fork rule are checked against 11-P1-plan §4–5.
 */
import { loadWf, GETBACK, GIVING, codeOf, runCode, SPEC, report, REPO, nodeOf } from './lib-11.mjs';
import path from 'path';
import { pathToFileURL } from 'url';

const eng = await import(pathToFileURL(path.join(REPO, 'server/lib/numerologyEngine.ts')).href);
const N = Number(process.argv[2] || 12000);
const src = codeOf(loadWf(GETBACK), '3 ·');
const go = (name, dob, first = 'Ann', order = 'cs_x') => runCode(src, { input: [{ json: { body: { data: { object: {
  id: order, created: 1793620800, customer_details: { email: 'x@example.com' }, metadata: {} } } },
  intake: { fullBirthName: name, dateOfBirth: dob, firstName: first } } }] })[0].json;

const lets = 'abcdefghijklmnopqrstuvwxyz';
let st = 20261102;
const rnd = (n) => { st = (Math.imul(st, 1103515245) + 12345) >>> 0; return (st >>> 8) % n; };
const word = () => { let w = lets[rnd(26)].toUpperCase(); const len = 3 + rnd(8); for (let i = 0; i < len; i++) w += lets[rnd(26)]; return w; };
const buyers = Array.from({ length: N }, () => ({
  name: `${word()} ${word()} ${word()}`,
  dob: `${1935 + rnd(55)}-${String(1 + rnd(12)).padStart(2, '0')}-${String(1 + rnd(28)).padStart(2, '0')}`,
}));
// Names the real engine has to see as well: hyphens, apostrophes, masters.
const engineSays = (name, dob) => {
  const su = eng.calculateSoulUrge ? eng.calculateSoulUrge(name) : null;
  const ex = eng.calculateExpression ? eng.calculateExpression(name) : null;
  const lp = eng.calculateLifePath ? eng.calculateLifePath(dob) : null;
  const num = (v) => (v && typeof v === 'object' ? v.number ?? v.value : v);
  return { su: num(su), ex: num(ex), lp: num(lp) };
};

const rows = { su: {}, fork: { giving: 0, get_back: 0 }, masters: 0, fallback: 0 };
const mismatches = [];
for (const b of buyers) {
  const n = go(b.name, b.dob);
  const e = engineSays(b.name, b.dob);
  if (!n.numbers.number_fallback
    && (e.su !== n.numbers.su || e.ex !== n.numbers.ex || e.lp !== n.numbers.lp)) mismatches.push({ ...b, e, n: n.numbers });
  rows.su[n.numbers.su] = (rows.su[n.numbers.su] || 0) + 1;
  rows.fork[n.answers.fork] += 1;
  if (n.numbers.number_fallback) rows.fallback += 1;
  if ([11, 22, 33].includes(n.numbers.su)) rows.masters += 1;
}

const diane = go('Diane Ruth Marshall', '1967-09-02', 'Diane');
const one = (n) => ({ 11: 2, 22: 4, 33: 6 }[n] || n);

const bad = report(`11 · the numbers, ${N} made-up buyers against the real engine`, [
  ['SAME SUMS AS THE ENGINE', [
    ['the engine exports what this check needs', () => typeof eng.calculateSoulUrge === 'function'
      || { ok: false, note: `exports: ${Object.keys(eng).join(', ')}` }],
    ['Soul Urge, Expression and Life Path match on every buyer', () => (mismatches.length
      ? { ok: false, note: `${mismatches.length} differ, first: ${JSON.stringify(mismatches[0])}` } : true)],
    ['master numbers survive: name that reduces to 11', () => {
      const name = buyers.map((b) => b.name).find((x) => go(x, '1960-01-01').numbers.su === 11);
      return { ok: !!name && engineSays(name, '1960-01-01').su === 11, note: name || 'none found' }; }],
    ['a date with a master Life Path keeps it', () => {
      const d = buyers.map((b) => b.dob).find((x) => [11, 22, 33].includes(go('Ann Lee', x).numbers.lp));
      return { ok: !!d && go('Ann Lee', d).numbers.lp === engineSays('Ann Lee', d).lp, note: `${d} → ${go('Ann Lee', d).numbers.lp}` }; }],
  ]],
  ['THE WORKED BUYER (test reading, 11-P1 header)', [
    ['Diane is SU 2, EX 4, LP 7', () => diane.numbers.su === 2 && diane.numbers.ex === 4 && diane.numbers.lp === 7],
    ['Diane gets trust, careful, and the giving path', () => diane.answers.took === 'your trust'
      && diane.answers.cover === 'careful' && diane.answers.fork === 'giving'],
    ['Diane gets the "She\'ll be fine" excuse and shame', () => diane.answers.excuse === "She'll be fine."
      && /^shame/.test(diane.answers.reason)],
  ]],
  ['THE RULES (§5)', [
    ['the fork uses one-digit numbers and divides by 3', () => buyers.slice(0, 3000).every((b) => {
      const { su, ex, lp } = go(b.name, b.dob).numbers;
      return go(b.name, b.dob).answers.fork === ((one(su) + one(ex) + one(lp)) % 3 === 0 ? 'get_back' : 'giving'); })],
    ['split is about 2/3 giving, 1/3 get back', () => {
      const g = rows.fork.giving / N;
      return { ok: g > 0.6 && g < 0.73, note: `${(g * 100).toFixed(1)}% giving, ${((1 - g) * 100).toFixed(1)}% get back` }; }],
    ['every Soul Urge row exists, masters included', () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]
      .every((n) => SPEC.soul_urge[n]?.took && SPEC.soul_urge[n]?.do && SPEC.soul_urge[n]?.unsaid && SPEC.soul_urge[n]?.word && SPEC.soul_urge[n]?.cover)],
    ['the row 4 safety line travels with row 4 and no other', () => Object.entries(SPEC.soul_urge)
      .every(([k, r]) => (k === '4') === !!r.safety)],
    ['33 at Expression or Life Path uses the 6 row', () => {
      const ok = SPEC.expression['6'] && SPEC.life_path['6'];
      return !!ok && !SPEC.expression['33'] === !SPEC.life_path['33']; }],
    ['each row\'s word is inside its own "took"', () => Object.entries(SPEC.soul_urge).every(([, r]) => r.took.toLowerCase().includes(r.word.toLowerCase()))],
  ]],
  ['AWKWARD NAMES AND MISSING DATA', [
    ['a name with no vowels still gets a reading', () => { const x = go('Bryn Lynn Wynn', '1960-05-05');
      return { ok: !!x.answers.took && x.numbers.number_fallback === true, note: `SU ${x.numbers.su}` }; }],
    ['a name in another alphabet still gets a reading', () => { const x = go('Мария Иванова', '1960-05-05');
      return { ok: !!x.answers.took && x.numbers.number_fallback === true, note: `SU ${x.numbers.su} EX ${x.numbers.ex}` }; }],
    ['no first name means she is dear, never the card name', () => go('Ann Lee', '1960-05-05', '').first_name === null],
    ['no birth name stops the order, naming the field only', () => {
      try { go('', '1960-05-05'); return false; } catch (e) { return /^HOLD: no full_birth_name/.test(e.message); } }],
    ['no date stops the order, naming the field only', () => {
      try { go('Ann Lee', ''); return false; } catch (e) { return /^HOLD: no valid date_of_birth/.test(e.message); } }],
    ['an error never prints her details', () => {
      try { go('Zebedee Quux', 'nonsense'); return false; } catch (e) { return !/Zebedee|nonsense/.test(e.message); } }],
  ]],
  ['THE FIXTURES', [
    ['the default test drive lands on the get-you-back path', () => {
      const t = runCode(nodeOf(loadWf(GETBACK), 'T1 ·').parameters.jsCode, {})[0].json;
      const x = runCode(src, { input: [{ json: t }] })[0].json;
      return { ok: x.answers.fork === 'get_back', note: `SU ${x.numbers.su} EX ${x.numbers.ex} LP ${x.numbers.lp}, ${x.answers.took}` }; }],
    ['the giving fixture lands on the giving path, same row', () => {
      const t = runCode(nodeOf(loadWf(GIVING), 'T1 ·').parameters.jsCode, {})[0].json;
      const x = runCode(codeOf(loadWf(GIVING), '3 ·'), { input: [{ json: t }] })[0].json;
      return { ok: x.answers.fork === 'giving', note: `SU ${x.numbers.su} EX ${x.numbers.ex} LP ${x.numbers.lp}, ${x.answers.took}` }; }],
  ]],
]);
const rowLine = Object.entries(rows.su).sort((a, b) => Number(a[0]) - Number(b[0])).map(([k, v]) => `${k}:${(v / N * 100).toFixed(1)}%`).join(' ');
console.log(`    Soul Urge rows: ${rowLine}`);
console.log(`    fallback used on ${rows.fallback} of ${N} random-letter names\n`);
process.exit(bad ? 1 : 0);
