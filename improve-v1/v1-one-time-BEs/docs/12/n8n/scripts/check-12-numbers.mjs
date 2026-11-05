/**
 * 12 · the lucky-numbers engine (lucky-12.js), checked.
 *   node scripts/check-12-numbers.mjs                    # run every check
 *   node scripts/check-12-numbers.mjs --write-fixtures   # (re)write fixtures/testina.json + faketta.json, then check
 * Free: no model, no network, no database. Exits 1 on any failure.
 *
 * The engine is loaded the way n8n runs it: the file's text plus one `return` line. Where a check
 * needs the "right answer", it works it out a second, independent way (its own reduce, its own
 * weekday sum, its own day-by-day search), or from server/lib/numerologyEngine.ts, never from the
 * engine's own helpers.
 */
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'url';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const N8N = path.dirname(SCRIPTS);
const FIXTURES = path.join(N8N, 'fixtures');
const REPO = path.resolve(SCRIPTS, '../../../../../..');
const ENGINE_TS = path.join(REPO, 'server/lib/numerologyEngine.ts');
const SRC = fs.readFileSync(path.join(SCRIPTS, 'lucky-12.js'), 'utf8');
// eslint-disable-next-line no-new-func
const L = new Function(`${SRC}\nreturn luckyNumbers12;`)();
const I = L.internals;
const eng = await import(pathToFileURL(ENGINE_TS).href).catch(() => null);

// ─── independent references ──────────────────────────────────────────────────────
const refReduce = (n) => 1 + ((n - 1) % 9);
const digitsSum = (s) => String(s).replace(/\D/g, '').split('').reduce((a, b) => a + Number(b), 0);
// Sakamoto's weekday sum: 0 = Sunday. No Date object.
const refWeekday = (y, m, d) => {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  if (m < 3) y -= 1;
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + d) % 7;
};
const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const dim = (y, m) => [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
const isoOf = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const addDays = (isoDate, k) => {
  let [y, m, d] = isoDate.split('-').map(Number);
  for (let i = 0; i < k; i++) { d += 1; if (d > dim(y, m)) { d = 1; m += 1; if (m > 12) { m = 1; y += 1; } } }
  return isoOf(y, m, d);
};
/** The open days, worked out from scratch: brute force, string digits, Sakamoto weekdays. */
function refCalendar(birthDate, orderDate, three) {
  const [, bm, bd] = birthDate.split('-').map(Number);
  const [n1, n2, n3] = three;
  const [oy, om] = orderDate.split('-').map(Number);
  let y = 2027, m = 1;
  if (orderDate > '2027-01-17') { y = oy; m = om + 1; if (m > 12) { m = 1; y += 1; } }
  const earliest = addDays(orderDate, 14);
  const months = [], open = [], both = [];
  // Rule 10, written fresh: hand each month to whichever of her distinct numbers has had fewest
  // (N1, N2, N3 order on a tie) among those the month can offer; then weekday +2, UD hers +1, earliest.
  const own = [n1, n2, n3].filter((x, i, a) => a.indexOf(x) === i);
  const had = new Map(own.map((x) => [x, 0]));
  for (let i = 0; i < 12; i++) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    const cands = [];
    for (let d = 1; d <= dim(y, m); d++) {
      const date = isoOf(y, m, d);
      if (date < earliest) continue;
      const py = refReduce(refReduce(bm) + refReduce(bd) + refReduce(digitsSum(y)));
      const pd = refReduce(refReduce(py + m) + d);
      const ud = refReduce(digitsSum(date));
      const wd = refWeekday(y, m, d);
      cands.push({ date, score: (wd === 0 || wd === 6 ? 0 : 2) + (three.includes(ud) ? 1 : 0), pd, ud, wd });
      if (three.includes(pd) && three.includes(ud)) both.push(date);
    }
    const can = own.filter((x) => cands.some((c) => c.pd === x)).sort((a, b) => had.get(a) - had.get(b) || own.indexOf(a) - own.indexOf(b));
    const forNumber = can.length ? can[0] : null;
    if (forNumber !== null) had.set(forNumber, had.get(forNumber) + 1);
    const pool = cands.filter((c) => forNumber === null || c.pd === forNumber);
    const best = pool.reduce((a, c) => (c.score > a.score ? c : a));
    open.push({ ...best, forNumber });
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return { months, open, both, earliest };
}
/** Rule 5, written fresh: for slice k, sort every allowed number by (lucky first, fewest-so-far
 *  root, both looks kept, nearest the slice middle, smaller) and take the first. Top-ups rank by
 *  birthday → sum → 1..9. Returns the list, smallest first, with each number's source. */
function refTickets(three, birthdayRoot, sumRoot, { min, max, pick }) {
  const own = [...new Set(three)];
  const order = ['birthday', 'sum', 'fill'];
  const topRank = (n) => {
    const r = refReduce(n);
    if (r === birthdayRoot) return 0;
    if (r === sumRoot) return 1;
    return 2 + r; // fill 1..9
  };
  const out = [];
  for (let k = 0; k < pick; k++) {
    const mid2 = 2 * min * pick + (2 * k + 1) * (max - min + 1); // the middle, times 2·pick
    const taken = new Set(out.map((o) => o.n));
    const luckyHad = (r) => out.filter((o) => o.lucky && o.r === r).length;
    const ok = (n) => !out.some((o) => Math.abs(o.n - n) === 1) && out.filter((o) => o.n % 10 === n % 10).length < 2;
    const rows = [];
    for (let n = min; n <= max; n++) {
      if (taken.has(n)) continue;
      const r = refReduce(n), lucky = own.includes(r);
      // lucky: fewest-so-far root · looks kept · nearest the slice middle · smaller
      // top-up (only once no lucky number is left): looks kept · source rank · nearest · smaller
      const look = ok(n) ? 0 : 1, near = Math.abs(2 * pick * n - mid2);
      rows.push({ n, r, lucky, key: lucky ? [0, luckyHad(r), look, near, n] : [1, look, topRank(n), near, n] });
    }
    rows.sort((a, b) => { for (let i = 0; i < a.key.length; i++) if (a.key[i] !== b.key[i]) return a.key[i] - b.key[i]; return 0; });
    const best = rows[0];
    out.push({ n: best.n, r: best.r, lucky: best.lucky, source: best.lucky ? 'lucky' : order[Math.min(2, topRank(best.n))] });
  }
  return out.sort((a, b) => a.n - b.n);
}
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── seeded random buyers ────────────────────────────────────────────────────────
let seed = 20261102;
const rnd = (n) => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) % n; };
const lets = 'abcdefghijklmnopqrstuvwxyz';
// Random letters, with one A/E/I/O/U forced in: a real birth name has vowels (no-vowel names are refused, tested below).
const word = () => {
  const len = 3 + rnd(9);
  const w = Array.from({ length: len }, () => lets[rnd(26)]);
  w[rnd(len)] = 'aeiou'[rnd(5)];
  return w[0].toUpperCase() + w.slice(1).join('');
};
const randomDate = (y0, span) => { const y = y0 + rnd(span), m = 1 + rnd(12); return isoOf(y, m, 1 + rnd(dim(y, m))); };
const BUYERS = Array.from({ length: 2000 }, () => ({
  birthName: Array.from({ length: 2 + rnd(3) }, word).join(' '),
  birthDate: randomDate(1930, 75),
  orderDate: randomDate(2026, 2),
}));
const RUNS = BUYERS.map((b) => {
  try { return { b, r: L(b) }; } catch (e) { return { b, err: e.message }; }
});
const ok = RUNS.filter((x) => x.r);

// ─── the fixtures ────────────────────────────────────────────────────────────────
const FIX = {
  testina: { birthName: 'Testina Rose Testerly', birthDate: '1968-07-21', orderDate: '2026-11-10' },
  faketta: { birthName: 'Faketta Ann Testerly', birthDate: '1975-03-09', orderDate: '2027-03-15' },
};
if (process.argv.includes('--write-fixtures')) {
  fs.mkdirSync(FIXTURES, { recursive: true });
  for (const [k, input] of Object.entries(FIX)) {
    const out = { _note: 'Written by check-12-numbers.mjs --write-fixtures. The check fails if the engine drifts from this.', input, output: L(input) };
    fs.writeFileSync(path.join(FIXTURES, `${k}.json`), JSON.stringify(out, null, 2) + '\n');
  }
  console.log(`\n  wrote ${Object.keys(FIX).map((k) => `fixtures/${k}.json`).join(', ')}`);
}
const T = L(FIX.testina);
const F = L(FIX.faketta);

// ─── the runner (same shape as 11's report) ─────────────────────────────────────
function report(title, groups) {
  let bad = 0, total = 0;
  console.log(`\n  ${title}`);
  for (const [head, rows] of groups) {
    console.log(`\n    ${head}`);
    for (const [label, fn] of rows) {
      total += 1;
      let pass = false, note = '';
      try {
        const r = fn();
        pass = r === undefined || r === true || (r && r.ok === true);
        if (r && typeof r === 'object' && 'note' in r) note = ` — ${r.note}`;
        if (r === false) note = ' — returned false';
      } catch (e) { note = ` — ${e.message.split('\n')[0]}`; }
      if (!pass) bad += 1;
      console.log(`      ${pass ? 'ok  ' : 'FAIL'} ${label}${note}`);
    }
  }
  console.log(`\n    ${total - bad}/${total} passed\n`);
  return bad;
}
const throwsClean = (input, re) => {
  assert.throws(() => L(input), (e) => /^LUCKY12: /.test(e.message) && (!re || re.test(e.message)));
};

const bad = report('12 · the lucky-numbers engine', [
  ['THE FILE PASTES INTO n8n AS IT IS', [
    ['no import, export or require in the file', () => assert.ok(!/^\s*(import|export)\b|\brequire\(/m.test(SRC))],
    ['defines one name, luckyNumbers12, and it is a function', () => assert.equal(typeof L, 'function')],
    ['no clock and no randomness inside', () => assert.ok(!/Date\.now|Math\.random|new Date\(\)/.test(SRC))],
  ]],

  ['SAME LETTERS AS server/lib/numerologyEngine.ts', [
    ['letter table matches the engine, letter by letter', () => {
      const ts = fs.readFileSync(ENGINE_TS, 'utf8');
      const block = ts.match(/LETTER_VALUES[^{]*\{([\s\S]*?)\};/)[1];
      const theirs = Object.fromEntries([...block.matchAll(/([a-z]):\s*(\d)/g)].map((m) => [m[1], Number(m[2])]));
      assert.equal(Object.keys(theirs).length, 26);
      assert.deepEqual({ ...I.LETTER_VALUES }, theirs);
    }],
    ['vowels match the engine (A E I O U; Y is not one)', () => {
      const ts = fs.readFileSync(ENGINE_TS, 'utf8');
      const v = ts.match(/VOWEL_SET = new Set\(\[([^\]]*)\]/)[1].match(/[a-z]/g);
      assert.deepEqual([...I.VOWELS].sort(), v.sort());
    }],
    ['engine loads natively (Node ≥ 23.6 strips types)', () => assert.ok(eng && typeof eng.letterSum === 'function')],
    ['2,000 random names: N2 and N3 = the engine\'s sums, reduced to 1–9', () => {
      let n = 0;
      for (const { b, r } of ok) {
        assert.equal(r.numbers.n2.raw, eng.letterSum(b.birthName, 'all'), b.birthName);
        assert.equal(r.numbers.n2.value, refReduce(eng.letterSum(b.birthName, 'all')));
        if (!r.name.yCountedAsVowel) { assert.equal(r.numbers.n3.raw, eng.letterSum(b.birthName, 'vowel')); n += 1; }
      }
      return { ok: true, note: `${ok.length} names, ${n} vowel sums compared` };
    }],
  ]],

  ['ALWAYS 1–9, NEVER A MASTER NUMBER', [
    ['reduce() = 1 + (n − 1) mod 9 for 1..20000', () => { for (let n = 1; n <= 20000; n++) assert.equal(I.reduce(n), refReduce(n)); }],
    ['11 → 2, 22 → 4, 33 → 6', () => { assert.equal(I.reduce(11), 2); assert.equal(I.reduce(22), 4); assert.equal(I.reduce(33), 6); }],
    ['a date adding to 29 → 11 gives 2, not 11 (1989-01-01)', () => {
      const r = L({ birthName: 'Ann Lee', birthDate: '1989-01-01', orderDate: '2026-11-10' });
      assert.equal(r.numbers.n1.value, 2);
      assert.equal(r.numbers.n1.working, '1 + 1 + 1 + 9 + 8 + 9 = 29, then 2 + 9 = 11, then 1 + 1 = 2');
    }],
    ['every number in 2,000 runs is 1–9', () => {
      for (const { r } of ok) for (const v of [...r.numbers.three, r.numbers.birthdayRoot.value, r.stopNumber.value, ...r.openDays.map((o) => o.pd)]) assert.ok(v >= 1 && v <= 9);
    }],
  ]],

  ['THE LETTER\'S WORKED EXAMPLE (12-E2-esl-B: March 14, 1961)', [
    ['3 + 1 + 4 + 1 + 9 + 6 + 1 = 25, then 2 + 5 = 7', () => {
      const r = L({ birthName: 'Ann Lee', birthDate: '1961-03-14', orderDate: '2026-11-10' });
      assert.equal(r.numbers.n1.value, 7);
      assert.equal(r.numbers.n1.raw, 25);
      assert.equal(r.numbers.n1.working, '3 + 1 + 4 + 1 + 9 + 6 + 1 = 25, then 2 + 5 = 7');
    }],
    ['the 7 family in 1–49 is 7, 16, 25, 34, 43 (the letter\'s list)', () => assert.deepEqual(I.familyOf(7, 1, 49), [7, 16, 25, 34, 43])],
    ['the 4 family in 1–49 is 4, 13, 22, 31, 40, 49 (build notes)', () => assert.deepEqual(I.familyOf(4, 1, 49), [4, 13, 22, 31, 40, 49])],
    ['N1 = all date digits, reduced, on all 2,000 buyers', () => {
      for (const { b, r } of ok) {
        const [y, m, d] = b.birthDate.split('-').map(Number);
        assert.equal(r.numbers.n1.value, refReduce(digitsSum(`${m}${d}${y}`)));
      }
    }],
  ]],

  ['TESTINA ROSE TESTERLY, 1968-07-21, ordered 2026-11-10 (worked by hand)', [
    ['N1: 7 + 2 + 1 + 1 + 9 + 6 + 8 = 34 → 7', () => { assert.equal(T.numbers.n1.value, 7); assert.equal(T.numbers.n1.raw, 34); }],
    ['N2: TESTINA 25 + ROSE 21 + TESTERLY 34 = 80 → 8', () => {
      assert.deepEqual(T.name.words.map((w) => w.all), [25, 21, 34]);
      assert.equal(T.numbers.n2.raw, 80); assert.equal(T.numbers.n2.value, 8);
    }],
    ['N3: E I A 15 + O E 11 + E E 10 (Y is a consonant) = 36 → 9', () => {
      assert.deepEqual(T.name.words.map((w) => w.vowels), [15, 11, 10]);
      assert.equal(T.numbers.n3.raw, 36); assert.equal(T.numbers.n3.value, 9);
      assert.equal(T.name.yCountedAsVowel, false);
    }],
    ['no repeats; birthday root 21 → 3; 7 + 8 + 9 = 24 → 6', () => {
      assert.deepEqual(T.numbers.repeats, []);
      assert.equal(T.numbers.birthdayRoot.value, 3); assert.equal(T.numbers.sumRoot, 6);
    }],
    ['tickets spread: slice middles 5.1 13.3 21.4 29.6 37.8 45.9 → 7 · 17 (8 sits by 7) · 9 (18 sits by 17, 27 = third ending in 7) · 26 · 36 · 43', () => {
      assert.deepEqual(T.tickets.list, [7, 9, 17, 26, 36, 43]);
      assert.deepEqual(T.tickets.numbers.map((t) => t.root), [7, 9, 8, 8, 9, 7]);
      assert.ok(T.tickets.numbers.every((t) => t.source === 'lucky'));
      assert.equal(T.tickets.shortfall, false);
    }],
    ['stop number 4 (her name carries no 4 or 8; 8 is hers)', () => {
      assert.equal(T.stopNumber.value, 4); assert.equal(T.stopNumber.rule, 'karmic-lesson');
      assert.deepEqual(T.stopNumber.missingDigits, [4, 8]);
    }],
    ['PIN 7893, in order, first try', () => { assert.equal(T.pin.value, '7893'); assert.equal(T.pin.stage, 'in-order'); assert.equal(T.pin.tries, 1); }],
    ['window 2027; personal year 2027 = 7 + 3 + 2 = 12 → 3', () => {
      assert.equal(T.windowLabel, '2027'); assert.equal(T.calendar.personalYears[2027], 3);
      assert.equal(T.calendar.earliestAllowed, '2026-11-24');
    }],
    ['January is for N1 (7): PD 7 falls on 3 Sun, 12 Tue, 21 Thu, 30 Sat, all UD 6; Tue 12 is the first weekday', () => {
      const j = T.openDays[0];
      assert.equal(j.date, '2027-01-12'); assert.equal(j.weekday, 'Tuesday'); assert.equal(j.forNumber, 7);
      assert.equal(j.pm, 4); assert.equal(j.pd, 7); assert.equal(j.ud, 6);
      assert.deepEqual(j.parts, { weekday: 2, ud: 0 }); assert.equal(j.score, 2);
    }],
    ['February is for N2 (8): PD 8 on 3 Wed, 12 Fri, 21 Sun; Wed 3 (weekday +2, UD 7 +1) wins on date', () => {
      assert.equal(T.openDays[1].date, '2027-02-03'); assert.equal(T.openDays[1].forNumber, 8); assert.equal(T.openDays[1].score, 3);
    }],
    ['the months go 7, 8, 9 in turn: four each, all twelve on a weekday', () => {
      assert.deepEqual(T.openDays.map((o) => o.forNumber), [7, 8, 9, 7, 8, 9, 7, 8, 9, 7, 8, 9]);
      assert.ok(T.openDays.every((o) => !['Saturday', 'Sunday'].includes(o.weekday)));
    }],
    ['all twelve open days', () => assert.deepEqual(T.openDays.map((o) => o.date), [
      '2027-01-12', '2027-02-03', '2027-03-03', '2027-04-09', '2027-05-18', '2027-06-09',
      '2027-07-06', '2027-08-06', '2027-09-06', '2027-10-12', '2027-11-03', '2027-12-03'])],
    ['full year: 86 days listed, 82 match both, 4 open days (her 7 months: Jan, Apr, Jul, Oct) don\'t', () => {
      assert.equal(T.fullYear.count, 86); assert.equal(T.fullYear.matchCount, 82); assert.equal(T.fullYear.openDaysNotMatching, 4);
      assert.equal(T.fullYear.months.length, 12);
    }],
    ['lucky hours 7, 8, 9 → 9am, 7pm, 8pm, 9pm', () => {
      assert.deepEqual(T.luckyHours.hours.map((h) => h.hour), [7, 8, 9]);
      assert.deepEqual(T.luckyHours.slots.map((s) => s.time), ['09:00', '19:00', '20:00', '21:00']);
      assert.deepEqual(T.luckyHours.slots.map((s) => s.label), ['9am', '7pm', '8pm', '9pm']);
    }],
    ['uses: houses 34, 107, 153; phone aims for 7, avoids 4', () => {
      assert.deepEqual(T.uses.house.examples.map((h) => h.n), [34, 107, 153]);
      assert.equal(T.uses.phone.aimFor, 7); assert.equal(T.uses.phone.avoid, 4);
      assert.deepEqual(T.uses.wedding, T.openDays.map((o) => o.date));
      assert.deepEqual(T.uses.lottery.numbers, T.tickets.list);
    }],
  ]],

  ['FAKETTA ANN TESTERLY, 1975-03-09, ordered 2027-03-15 (worked by hand)', [
    ['N1 3+9+1+9+7+5 = 34 → 7; N2 19+11+34 = 64 → 1; N3 7+1+10 = 18 → 9', () => {
      assert.deepEqual(F.numbers.three, [7, 1, 9]);
      assert.equal(F.numbers.n2.raw, 64); assert.equal(F.numbers.n3.raw, 18);
    }],
    ['tickets 7 10 18 28 36 43; stop 4; PIN 7199', () => {
      assert.deepEqual(F.tickets.list, [7, 10, 18, 28, 36, 43]);
      assert.equal(F.stopNumber.value, 4); assert.equal(F.pin.value, '7199');
    }],
    ['rolled window "April 2027 to March 2028"; April is for 7: PD 7 on 7 Wed, 16 Fri, 25 Sun (UD 4) → Wed 7 Apr', () => {
      assert.equal(F.windowLabel, 'April 2027 to March 2028');
      assert.equal(F.calendar.personalYears[2027], 5);
      assert.equal(F.openDays[0].date, '2027-04-07'); assert.equal(F.openDays[0].score, 2); assert.equal(F.openDays[0].forNumber, 7);
      assert.deepEqual(F.openDays.map((o) => o.forNumber), [7, 1, 9, 7, 1, 9, 7, 1, 9, 7, 1, 9]);
      assert.equal(F.openDays[11].date.slice(0, 7), '2028-03');
    }],
  ]],

  ['ALL THREE NUMBERS THE SAME (the 1–49 shortage)', [
    ['Ann Kay Bell, 1961-03-14: 7 7 7, "your 7 comes three times"', () => {
      const r = L({ birthName: 'Ann Kay Bell', birthDate: '1961-03-14', orderDate: '2026-11-10' });
      assert.deepEqual(r.numbers.three, [7, 7, 7]);
      assert.deepEqual(r.numbers.repeats, [{ number: 7, count: 3, which: ['n1', 'n2', 'n3'] }]);
    }],
    ['…six tickets: 7 16 25 34 43 + 41 from her birthday root (5), tagged', () => {
      const r = L({ birthName: 'Ann Kay Bell', birthDate: '1961-03-14', orderDate: '2026-11-10' });
      assert.deepEqual(r.tickets.list, [7, 16, 25, 34, 41, 43]);
      assert.deepEqual(r.tickets.numbers.map((t) => t.source), ['lucky', 'lucky', 'lucky', 'lucky', 'birthday', 'lucky']);
      assert.equal(r.tickets.shortfall, true); assert.equal(r.tickets.luckyCount, 5);
      assert.equal(r.pin.value, '7775');
    }],
    ['born 1950-03-07 (birthday root 7 too): top-up from 7+7+7 = 21 → 3; PIN 7773', () => {
      const r = L({ birthName: 'Ann Kay Bell', birthDate: '1950-03-07', orderDate: '2026-11-10' });
      assert.deepEqual(r.tickets.list, [7, 16, 25, 34, 43, 48]);
      assert.equal(r.tickets.numbers[5].source, 'sum');
      assert.equal(r.pin.value, '7773'); assert.equal(r.pin.stage, 'ticket-swap');
      assert.ok(/a 3 for her birthday root \(7\)/.test(r.pin.why), r.pin.why);
    }],
    ['a 7-only buyer in a 1–59 game needs no top-up (7 … 52)', () => {
      const r = L({ birthName: 'Ann Kay Bell', birthDate: '1961-03-14', orderDate: '2026-11-10', game: { min: 1, max: 59, pick: 6 } });
      assert.deepEqual(r.tickets.list, [7, 16, 25, 34, 43, 52]); assert.equal(r.tickets.shortfall, false);
    }],
  ]],

  ['AWKWARD NAMES', [
    ['Y, accents, hyphen, apostrophe: "Renée Yolanda O\'Brien-Hayes" = 114 → 6, vowels 49 → 4', () => {
      const r = L({ birthName: "Renée Yolanda O'Brien-Hayes", birthDate: '1961-03-14', orderDate: '2026-11-10' });
      assert.equal(r.numbers.n2.raw, 114); assert.equal(r.numbers.n2.value, 6);
      assert.equal(r.numbers.n3.raw, 49); assert.equal(r.numbers.n3.value, 4);
      assert.equal(r.name.letters, 'RENEEYOLANDAOBRIENHAYES');
      assert.equal(eng.letterSum('Renee Yolanda OBrien Hayes', 'all'), 114);
      assert.equal(eng.letterSum('Renee Yolanda OBrien Hayes', 'vowel'), 49);
    }],
    ['accents stripped = same answer as plain letters', () => {
      const a = L({ birthName: 'Zoë Ångström Müller', birthDate: '1970-05-05', orderDate: '2026-11-10' });
      const b = L({ birthName: 'Zoe Angstrom Muller', birthDate: '1970-05-05', orderDate: '2026-11-10' });
      assert.deepEqual(a.numbers.three, b.numbers.three); assert.equal(a.pin.value, b.pin.value);
    }],
    ['ß → ss, ø → o', () => {
      assert.deepEqual(L({ birthName: 'Greta Strauß', birthDate: '1970-05-05', orderDate: '2026-11-10' }).numbers.three,
        L({ birthName: 'Greta Strauss', birthDate: '1970-05-05', orderDate: '2026-11-10' }).numbers.three);
      assert.deepEqual(L({ birthName: 'Søren Lund', birthDate: '1970-05-05', orderDate: '2026-11-10' }).numbers.three,
        L({ birthName: 'Soren Lund', birthDate: '1970-05-05', orderDate: '2026-11-10' }).numbers.three);
    }],
    ['case and extra spaces change nothing', () => {
      const a = L({ ...FIX.testina, birthName: '  testina   ROSE testerly ' });
      assert.deepEqual(a.openDays, T.openDays); assert.equal(a.pin.value, T.pin.value);
    }],
    ['no A E I O U: Y counts as a vowel ("Glynn Wyn": 44 → 8, Y+Y 14 → 5)', () => {
      const r = L({ birthName: 'Glynn Wyn', birthDate: '1970-05-05', orderDate: '2026-11-10' });
      assert.equal(r.name.yCountedAsVowel, true); assert.equal(r.numbers.n2.value, 8); assert.equal(r.numbers.n3.value, 5);
    }],
    ['no vowels and no Y: refused', () => throwsClean({ birthName: 'Brr Kss', birthDate: '1970-05-05', orderDate: '2026-11-10' }, /no vowels/)],
    ['another alphabet: refused, not half-counted', () => throwsClean({ birthName: 'Мария Smith', birthDate: '1970-05-05', orderDate: '2026-11-10' }, /outside A–Z/)],
  ]],

  ['BAD INPUT THROWS A CLEAR ERROR', [
    ['bad names', () => { for (const n of [42, '', '   ', 'A', null]) throwsClean({ birthName: n, birthDate: '1970-05-05', orderDate: '2026-11-10' }, /birthName/); }],
    ['bad birth dates', () => {
      for (const d of ['1968-13-01', '1968-02-30', '21/07/1968', '1961-02-29', '1968-7-21', '1899-12-31', '2027-01-01', 19680721, undefined]) {
        throwsClean({ birthName: 'Ann Lee', birthDate: d, orderDate: '2026-11-10' }, /birthDate/);
      }
    }],
    ['bad order dates', () => { for (const d of ['2026-11-31', 'tomorrow', '2019-12-31', '']) throwsClean({ birthName: 'Ann Lee', birthDate: '1970-05-05', orderDate: d }, /orderDate/); }],
    ['bad games', () => {
      for (const g of [{ pick: 0 }, { pick: 11 }, { min: 10, max: 5 }, { min: 0 }, { max: 100 }, { min: 1, max: 5, pick: 6 }, { pick: 2.5 }, 'lotto']) {
        throwsClean({ birthName: 'Ann Lee', birthDate: '1970-05-05', orderDate: '2026-11-10', game: g }, /game/);
      }
    }],
    ['no input at all', () => { throwsClean(null); throwsClean(undefined); }],
    ['an error never prints her name or date', () => {
      try { L({ birthName: 'Zebedee Мария', birthDate: '1971-08-08', orderDate: '2026-11-10' }); assert.fail('no throw'); } catch (e) { assert.ok(!/Zebedee|Мария|1971/.test(e.message)); }
      try { L({ birthName: 'Zebedee Quux', birthDate: '1971-02-30', orderDate: '2026-11-10' }); assert.fail('no throw'); } catch (e) { assert.ok(!/Zebedee|1971/.test(e.message)); }
    }],
  ]],

  ['LEAP-DAY BIRTH (1960-02-29)', [
    ['N1 2+2+9+1+9+6+0 = 29 → 11 → 2; birthday root 29 → 2; no master', () => {
      const r = L({ birthName: 'Ann Lee', birthDate: '1960-02-29', orderDate: '2026-11-10' });
      assert.equal(r.numbers.n1.value, 2); assert.equal(r.numbers.birthdayRoot.value, 2);
      assert.equal(r.calendar.personalYears[2027], 6);
      assert.equal(r.openDays.length, 12);
      assert.ok(r.pin.value !== '0229' && r.pin.value !== '2902');
    }],
    ['…and in a rolled window across Feb 2028 (a leap February)', () => {
      const r = L({ birthName: 'Ann Lee', birthDate: '1960-02-29', orderDate: '2027-06-01' });
      assert.equal(r.windowLabel, 'July 2027 to June 2028');
      const feb = r.fullYear.months.find((m) => m.month === '2028-02');
      assert.ok(feb.days.length >= 1);
      const ref = refCalendar('1960-02-29', '2027-06-01', r.numbers.three);
      assert.deepEqual(r.openDays.map((o) => o.date), ref.open.map((o) => o.date));
    }],
  ]],

  ['THE WINDOW (12-A, "the year runs out")', [
    ['ordered Nov 2026 → "2027", Jan to Dec', () => {
      assert.equal(T.calendar.window.start, '2027-01-01'); assert.equal(T.calendar.window.end, '2027-12-31');
      assert.equal(T.calendar.window.rolled, false);
      assert.deepEqual(T.openDays.map((o) => o.date.slice(0, 7)), Array.from({ length: 12 }, (_, i) => `2027-${String(i + 1).padStart(2, '0')}`));
    }],
    ['ordered Mar 2027 → April 2027 to March 2028', () => {
      assert.equal(F.calendar.window.start, '2027-04-01'); assert.equal(F.calendar.window.end, '2028-03-31');
      assert.equal(F.calendar.window.rolled, true);
    }],
    ['ordered Feb 2027 → "March 2027 to February 2028" (the brief\'s example)', () => {
      assert.equal(L({ ...FIX.testina, orderDate: '2027-02-10' }).windowLabel, 'March 2027 to February 2028');
    }],
    ['ordered 2027-01-17 → still 2027, January\'s day is the 31st (the only one left)', () => {
      const r = L({ ...FIX.testina, orderDate: '2027-01-17' });
      assert.equal(r.windowLabel, '2027'); assert.equal(r.openDays[0].date, '2027-01-31');
    }],
    ['ordered 2027-01-18 → rolls to February 2027 to January 2028 (BENT, see rule 9)', () => {
      assert.equal(L({ ...FIX.testina, orderDate: '2027-01-18' }).windowLabel, 'February 2027 to January 2028');
      assert.equal(L({ ...FIX.testina, orderDate: '2027-01-31' }).windowLabel, 'February 2027 to January 2028');
    }],
    ['ordered Dec 2027 → "2028"', () => assert.equal(L({ ...FIX.testina, orderDate: '2027-12-05' }).windowLabel, '2028')],
    ['ordered 31 Dec 2026 → January\'s day is the 14th or later', () => {
      assert.ok(L({ ...FIX.testina, orderDate: '2026-12-31' }).openDays[0].date >= '2027-01-14');
    }],
  ]],

  ['OPEN DAYS AND FULL YEAR, 2,000 random buyers against a from-scratch search', [
    ['every random buyer gets a reading (no throws)', () => ({ ok: ok.length === RUNS.length, note: `${ok.length}/${RUNS.length}${RUNS.find((x) => x.err) ? ', first error: ' + RUNS.find((x) => x.err).err : ''}` })],
    ['exactly 12 open days, one in each window month, in order', () => {
      for (const { b, r } of ok) {
        const ref = refCalendar(b.birthDate, b.orderDate, r.numbers.three);
        assert.equal(r.openDays.length, 12);
        assert.deepEqual(r.openDays.map((o) => o.date.slice(0, 7)), ref.months);
      }
    }],
    ['none before orderDate + 14 (room for upsell 1\'s bracelet to arrive)', () => {
      for (const { b, r } of ok) for (const o of r.openDays) assert.ok(o.date >= addDays(b.orderDate, 14), `${o.date} vs ${b.orderDate}`);
    }],
    ['each is the top score in its month, earliest on a tie (dates, scores, PD, UD)', () => {
      for (const { b, r } of ok) {
        const ref = refCalendar(b.birthDate, b.orderDate, r.numbers.three);
        assert.deepEqual(r.openDays.map((o) => [o.date, o.score, o.pd, o.ud]), ref.open.map((o) => [o.date, o.score, o.pd, o.ud]));
      }
    }],
    ['weekdays agree with Sakamoto\'s sum', () => {
      for (const { r } of ok) for (const o of r.openDays) {
        const [y, m, d] = o.date.split('-').map(Number);
        assert.equal(o.weekday, WEEKDAYS[refWeekday(y, m, d)]);
      }
    }],
    ['the months are shared: each of her distinct numbers gets 12 ÷ how many (4 or 6), and it falls on a weekday', () => {
      let weekend = 0, short = 0;
      for (const { r } of ok) {
        const own = r.numbers.distinct, shareOf = 12 / own.length;
        const got = own.map((x) => r.openDays.filter((o) => o.forNumber === x).length);
        if (r.openDays.some((o) => o.forNumber === null)) { short += 1; continue; } // only a short first month
        assert.ok(got.every((n) => n === shareOf || (own.length === 1 && n === 12)), `${r.input.birthName}: ${own} → ${got}`);
        for (const o of r.openDays) assert.equal(o.pd, o.forNumber);
        weekend += r.openDays.filter((o) => ['Saturday', 'Sunday'].includes(o.weekday)).length;
      }
      const all = ok.length * 12;
      assert.ok(weekend / all < 0.05, `weekend share ${weekend}/${all}`);
      return { ok: true, note: `weekend open days ${weekend}/${all}; ${short} buyers with a short first month` };
    }],
    ['full year = every allowed day where PD and UD are both hers, plus the open days', () => {
      for (const { b, r } of ok) {
        const ref = refCalendar(b.birthDate, b.orderDate, r.numbers.three);
        const listed = r.fullYear.months.flatMap((m) => m.days);
        const want = [...new Set([...ref.both, ...ref.open.map((o) => o.date)])].sort();
        assert.deepEqual(listed.map((x) => x.date), want);
        assert.equal(r.fullYear.count, want.length);
        assert.equal(r.fullYear.matchCount, ref.both.length);
        assert.equal(listed.filter((x) => x.open).length, 12);
      }
    }],
  ]],

  ['TICKETS, 2,000 random buyers', [
    ['six different numbers, 1–49, smallest first', () => {
      for (const { r } of ok) {
        const l = r.tickets.list;
        assert.equal(l.length, 6); assert.equal(new Set(l).size, 6);
        assert.ok(l.every((n, i) => n >= 1 && n <= 49 && (i === 0 || n > l[i - 1])));
      }
    }],
    ['every "lucky" ticket adds down to one of her three; each root is right', () => {
      for (const { r } of ok) for (const t of r.tickets.numbers) {
        assert.equal(t.root, refReduce(t.n));
        if (t.source === 'lucky') assert.ok(r.numbers.three.includes(t.root));
      }
    }],
    ['top-ups only when her families run dry', () => {
      let short = 0;
      for (const { r } of ok) {
        const fam = r.numbers.distinct.reduce((a, x) => a + I.familyOf(x, 1, 49).length, 0);
        assert.equal(r.tickets.shortfall, fam < 6);
        assert.equal(r.tickets.numbers.filter((t) => t.source !== 'lucky').length, Math.max(0, 6 - fam));
        if (fam < 6) short += 1;
      }
      return { ok: true, note: `${short} of ${ok.length} needed a top-up` };
    }],
    ['the spread rule matches a fresh, brute-force copy (numbers and sources)', () => {
      for (const { r } of ok) {
        const want = refTickets(r.numbers.three, r.numbers.birthdayRoot.value, r.numbers.sumRoot, { min: 1, max: 49, pick: 6 });
        assert.deepEqual(r.tickets.list, want.map((t) => t.n), r.input.birthName);
        assert.deepEqual(r.tickets.numbers.map((t) => t.source), want.map((t) => t.source), r.input.birthName);
      }
    }],
    ['spread: her numbers share the six evenly, none bunched low, no neighbours, no three alike', () => {
      let neighbours = 0, threeAlike = 0, tops = [];
      for (const { r } of ok) {
        const l = r.tickets.list;
        if (!r.tickets.shortfall) {
          const per = r.numbers.distinct.map((x) => r.tickets.numbers.filter((t) => t.root === x).length);
          assert.ok(Math.max(...per) - Math.min(...per) <= 1, `${r.input.birthName}: ${per}`);
        }
        assert.ok(l.some((n) => n > 24) && l.some((n) => n <= 24), `${r.input.birthName}: ${l}`);
        if (l.some((n, i) => i && n - l[i - 1] === 1)) neighbours += 1;
        const ends = {}; for (const n of l) ends[n % 10] = (ends[n % 10] || 0) + 1;
        if (Object.values(ends).some((c) => c > 2)) threeAlike += 1;
        tops.push(l[5]);
      }
      tops.sort((a, b) => a - b);
      // A random 6-from-49 draw has a side-by-side pair about half the time; sharing beats looks, so a few stay.
      assert.ok(neighbours / ok.length < 0.05 && threeAlike / ok.length < 0.02, `${neighbours} ${threeAlike}`);
      return { ok: true, note: `neighbours ${neighbours}, three alike ${threeAlike}, top ticket ${tops[0]}–${tops[tops.length - 1]} (median ${tops[tops.length >> 1]})` };
    }],
    ['other games: 1–59 ×6, 1–69 ×5, 1–26 ×1, 1–10 ×10 (and match the fresh copy)', () => {
      for (const game of [{ min: 1, max: 59, pick: 6 }, { min: 1, max: 69, pick: 5 }, { min: 1, max: 26, pick: 1 }, { min: 1, max: 10, pick: 10 }]) {
        for (const { b } of ok.slice(0, 200)) {
          const r = L({ ...b, game }), l = r.tickets.list;
          assert.equal(new Set(l).size, game.pick); assert.ok(l.every((n) => n >= game.min && n <= game.max));
          assert.deepEqual(l, refTickets(r.numbers.three, r.numbers.birthdayRoot.value, r.numbers.sumRoot, game).map((t) => t.n), JSON.stringify(game));
        }
      }
    }],
  ]],

  ['STOP NUMBER', [
    ['never one of her three, always 1–9, across 2,000 random names and dates', () => {
      const rules = {};
      for (const { r } of ok) {
        assert.ok(!r.numbers.three.includes(r.stopNumber.value));
        assert.ok(r.stopNumber.value >= 1 && r.stopNumber.value <= 9);
        rules[r.stopNumber.rule] = (rules[r.stopNumber.rule] || 0) + 1;
      }
      return { ok: true, note: Object.entries(rules).map(([k, v]) => `${k} ${v}`).join(', ') };
    }],
    ['karmic lesson = the smallest digit no letter carries, leaving out her three', () => {
      for (const { b, r } of ok) {
        if (r.stopNumber.rule !== 'karmic-lesson') continue;
        const carried = new Set(r.name.letters.toLowerCase().split('').map((c) => I.LETTER_VALUES[c]));
        assert.equal(r.stopNumber.value, [1, 2, 3, 4, 5, 6, 7, 8, 9].find((d) => !carried.has(d) && !r.numbers.three.includes(d)), b.birthName);
      }
    }],
    ['first challenge when her name carries every spare digit: |9 − 2| = 7', () => {
      const all = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const s = I.chooseStop(all, [1, 2, 3], 9, 2, 2);
      assert.equal(s.value, 7); assert.equal(s.rule, 'first-challenge');
    }],
    ['fallback when the challenge is one of hers or 0', () => {
      const all = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      let s = I.chooseStop(all, [7, 1, 2], 9, 2, 3);
      assert.equal(s.rule, 'fallback'); assert.equal(s.value, 4); // 1, 2 hers, 3 birthday root
      s = I.chooseStop(all, [1, 2, 4], 3, 12, 3);                  // 3 − 3 = 0
      assert.equal(s.rule, 'fallback'); assert.equal(s.value, 5);
    }],
    ['a real name that carries every digit (Jack Bodie Fitzgerald Mervyn)', () => {
      const r = L({ birthName: 'Jack Bodie Fitzgerald Mervyn', birthDate: '1966-09-02', orderDate: '2026-11-10' });
      assert.deepEqual(r.stopNumber.missingDigits, []);
      assert.ok(['first-challenge', 'fallback'].includes(r.stopNumber.rule));
      assert.ok(!r.numbers.three.includes(r.stopNumber.value));
    }],
  ]],

  ['PIN', [
    ['refused: 1111, 1234, 4321, 6789, 9876, 1204, the stop number, birth year, MMDD, DDMM', () => {
      const ctx = { stop: 5, birthYear: 1968, mmdd: '0721', ddmm: '2107' };
      const p = (s) => I.pinProblems(s.split('').map(Number), ctx);
      assert.ok(p('1111').includes('all-same'));
      for (const s of ['1234', '6789', '2345']) assert.ok(p(s).includes('run-up'), s);
      for (const s of ['4321', '9876']) assert.ok(p(s).includes('run-down'), s);
      assert.ok(p('1204').includes('has-0'));
      assert.ok(p('1251').includes('has-stop-number'));
      assert.ok(p('1968').includes('birth-year'));
      assert.ok(p('0721').includes('birth-mmdd'));
      assert.ok(p('2107').includes('birth-ddmm'));
    }],
    ['passed: 7893, 1243, 1379, 2468, 7773', () => {
      const ctx = { stop: 5, birthYear: 1968, mmdd: '0721', ddmm: '2107' };
      for (const s of ['7893', '1243', '1379', '2468', '7773']) assert.deepEqual(I.pinProblems(s.split('').map(Number), ctx), [], s);
    }],
    ['a run is reordered: 1 2 3 4 → 1243 (Mary Cole, 1953-06-22)', () => {
      const r = L({ birthName: 'Mary Cole', birthDate: '1953-06-22', orderDate: '2026-11-10' });
      assert.deepEqual([...r.numbers.three, r.numbers.birthdayRoot.value], [1, 2, 3, 4]);
      assert.equal(r.pin.value, '1243'); assert.equal(r.pin.stage, 'reordered');
      assert.deepEqual(r.pin.rejected, [{ pin: '1234', problems: ['run-up'] }]);
    }],
    ['her birth year is reordered away: 1 9 6 8 for a 1968 baby → 1986', () => {
      const slots = [1, 9, 6, 8].map((d, i) => ({ d, from: ['n1', 'n2', 'n3', 'birthday'][i] }));
      const r = I.choosePin(slots, { stop: 4, birthYear: 1968, mmdd: '0721', ddmm: '2107' }, [1]);
      assert.equal(r.value, '1986'); assert.deepEqual(r.rejected[0].problems, ['birth-year']);
    }],
    ['her MMDD is reordered away: 1 2 2 5 born 25 Dec → 1252', () => {
      const slots = [1, 2, 2, 5].map((d, i) => ({ d, from: ['n1', 'n2', 'n3', 'birthday'][i] }));
      const r = I.choosePin(slots, { stop: 4, birthYear: 1950, mmdd: '1225', ddmm: '2512' }, [1]);
      assert.equal(r.value, '1252'); assert.deepEqual(r.rejected[0].problems, ['birth-mmdd']);
    }],
    ['stop number = birthday root forces a ticket swap (Ann Lee, 1960-01-04 → 3626: her smallest ticket, 6, swapped in)', () => {
      const r = L({ birthName: 'Ann Lee', birthDate: '1960-01-04', orderDate: '2026-11-10' });
      assert.equal(r.stopNumber.value, 4); assert.equal(r.numbers.birthdayRoot.value, 4);
      assert.equal(r.pin.value, '3626'); assert.equal(r.pin.stage, 'ticket-swap');
      assert.ok(!r.pin.value.includes('4'));
    }],
    ['every ticket the same root and 7777 → plain-digit swap still finds one', () => {
      const slots = [7, 7, 7, 7].map((d, i) => ({ d, from: ['n1', 'n2', 'n3', 'birthday'][i] }));
      const r = I.choosePin(slots, { stop: 1, birthYear: 1950, mmdd: '0707', ddmm: '0707' }, [7, 7, 7, 7, 7, 7]);
      assert.equal(r.stage, 'filler-swap'); assert.equal(r.value, '7772');
    }],
    ['2,000 random buyers: 4 digits, passes every rule, digits labelled', () => {
      const stages = {};
      for (const { b, r } of ok) {
        const [y, m, d] = b.birthDate.split('-');
        assert.match(r.pin.value, /^[1-9]{4}$/);
        assert.deepEqual(I.pinProblems(r.pin.value.split('').map(Number), { stop: r.stopNumber.value, birthYear: Number(y), mmdd: m + d, ddmm: d + m }), []);
        assert.equal(r.pin.digits.map((x) => x.d).join(''), r.pin.value);
        assert.ok(r.pin.why.length > 10);
        stages[r.pin.stage] = (stages[r.pin.stage] || 0) + 1;
      }
      return { ok: true, note: Object.entries(stages).map(([k, v]) => `${k} ${v}`).join(', ') };
    }],
  ]],

  ['PERSONAL YEAR / MONTH / DAY AND HOURS', [
    ['PY, PM, PD, UD worked out by hand: Testina, 4 Jan 2027 → PY 3, PM 4, PD 8, UD 7', () => {
      const f = I.dayFacts(7, 21, Math.round(Date.UTC(2027, 0, 4) / 86400000));
      assert.deepEqual([f.py, f.pm, f.pd, f.ud, f.weekday], [3, 4, 8, 7, 'Monday']);
    }],
    ['hours 10, 11, 12 count as 1, 2, 3; slots stay 9:00–21:00', () => {
      const r = L({ birthName: 'Ann Lee', birthDate: '1960-01-01', orderDate: '2026-11-10' }); // check below whatever her three are
      for (const h of r.luckyHours.hours) assert.ok(r.numbers.three.includes(refReduce(h.hour)));
      for (let h = 1; h <= 12; h++) assert.equal(r.luckyHours.hours.some((x) => x.hour === h), r.numbers.three.includes(refReduce(h)));
      for (const { r: x } of ok) for (const s of x.luckyHours.slots) assert.ok(s.time >= '09:00' && s.time <= '21:00');
      const one = L({ birthName: 'Mary Cole', birthDate: '1953-06-22', orderDate: '2026-11-10' }); // 1 2 3
      assert.deepEqual(one.luckyHours.hours.map((h) => h.hour), [1, 2, 3, 10, 11, 12]);
      assert.deepEqual(one.luckyHours.slots.map((s) => s.label), ['10am', '11am', '12 noon', '1pm', '2pm', '3pm']);
    }],
    ['house examples are under 200 and add down to her numbers', () => {
      for (const { r } of ok) for (const h of r.uses.house.examples) { assert.ok(h.n > 0 && h.n < 200); assert.ok(r.numbers.three.includes(refReduce(h.n))); }
    }],
  ]],

  ['DETERMINISM AND THE FIXTURE FILES', [
    ['same input → same output, 200 times over', () => {
      for (const { b, r } of ok.slice(0, 200)) assert.deepEqual(L({ ...b }), r);
    }],
    ['the input object is not changed', () => {
      const inp = { ...FIX.testina, game: { min: 1, max: 49, pick: 6 } };
      const copy = JSON.stringify(inp); L(inp); assert.equal(JSON.stringify(inp), copy);
    }],
    ['fixtures/testina.json and faketta.json match the engine today', () => {
      for (const [k, input] of Object.entries(FIX)) {
        const file = path.join(FIXTURES, `${k}.json`);
        assert.ok(fs.existsSync(file), `missing ${file}: run with --write-fixtures`);
        const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
        assert.deepEqual(saved.input, input);
        assert.deepEqual(saved.output, JSON.parse(JSON.stringify(L(input))));
      }
    }],
  ]],
]);
process.exit(bad ? 1 : 0);
