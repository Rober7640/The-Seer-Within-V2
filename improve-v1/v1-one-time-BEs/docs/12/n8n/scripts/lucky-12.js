/* lucky-12.js — the lucky-numbers engine for backend offer 12 "Lucky Numbers".
 *
 * ⛔ Every number and date in her reading comes from here. The model only writes around them.
 *    A wrong number is a refund. Proven by check-12-numbers.mjs (plain node, no network).
 *
 * HOW IT IS USED
 *   This whole file is pasted, as is, into an n8n Code node by the 12 generator, which then adds
 *   one line such as `return [{ json: luckyNumbers12({ birthName, birthDate, orderDate }) }];`.
 *   So: plain JavaScript, no import, no export, no TypeScript, no clock, no randomness. It defines
 *   ONE name, `luckyNumbers12`. The tests load it the same way (the file text + one line).
 *
 * INPUT   luckyNumbers12({ birthName, birthDate, orderDate, game? })
 *   birthName  full name on her birth certificate. Any case. Spaces, hyphens and apostrophes are
 *              fine. Accents are stripped (é → e, ß → ss, ø → o). Digits and other marks are
 *              ignored. Letters from another alphabet (e.g. Cyrillic) are REFUSED, because
 *              dropping them would give a wrong number.
 *   birthDate  YYYY-MM-DD, a real date (29 Feb only in a leap year), year 1900 or later,
 *              before orderDate.
 *   orderDate  YYYY-MM-DD, the day she paid.
 *   game       optional { min, max, pick }, default { min: 1, max: 49, pick: 6 }.
 *              Whole numbers, 1 ≤ min < max ≤ 99, 1 ≤ pick ≤ 10, pick ≤ how many numbers fit.
 *   Bad input throws an Error starting "LUCKY12:". The message names the field, never her data.
 *
 * THE RULES, IN PLAIN WORDS
 *   "Reduce" = add the digits, and keep adding until one digit is left. ALWAYS 1–9.
 *   ⛔ No master numbers: 11 → 2, 22 → 4, 33 → 6. The sales letter teaches her this method, so
 *   the reading must agree with what she worked out on her envelope.
 *
 *   Letter values (Pythagorean, copied from server/lib/numerologyEngine.ts, the test proves they
 *   match): A J S = 1 · B K T = 2 · C L U = 3 · D M V = 4 · E N W = 5 · F O X = 6 · G P Y = 7 ·
 *   H Q Z = 8 · I R = 9. Vowels are A E I O U. Y is a consonant, as in the engine.
 *   Only if her name has NO A, E, I, O or U at all does Y count as a vowel (so a name like
 *   "Glynn Wyn" still gets a third number). No vowels and no Y → refused.
 *
 *   1. N1, her first number: add every digit of the month, the day and the full year, then
 *      reduce. 03/14/1961 → 3+1+4+1+9+6+1 = 25 → 2+5 = 7. Same as the letter's method.
 *   2. N2: add the letter values of every letter of her full birth name, then reduce.
 *   3. N3: add the letter values of the vowels only, then reduce.
 *      N1–N3 may repeat. `numbers.repeats` says which, so the writer can say "your 7 comes twice".
 *   4. Birthday root: the day of the month, reduced (21 → 3). Used as a fallback below.
 *   5. Ticket numbers: `pick` different numbers inside [min, max] that reduce to N1, N2 or N3,
 *      SPREAD across the game, not bunched at the low end.
 *      ⚠ CHANGED 2026-11-03 (operator): the old rule took each family's smallest in turn, so every
 *      buyer got low, bunched numbers (Testina: 7 8 9 16 17 18). It looked counted up, not hers.
 *      Cut [min, max] into `pick` equal slices. Ticket k takes the number nearest the middle of
 *      slice k (a tie goes to the smaller), choosing among her DISTINCT numbers' families that
 *      have the fewest tickets so far (so three numbers get 2 each, two get 3 each).
 *      Two looks are kept where they can be: no ticket next to another (16 and 17), and no third
 *      ticket with the same last digit (7, 17, 27). Sharing comes first: if the fewest-so-far
 *      families have no number that keeps both looks, the looks are dropped for this ticket
 *      rather than giving it to a number that already has more. A lucky number is never passed
 *      over for a top-up.
 *      If all families run dry first (e.g. all three are 7: 1–49 holds only 7 16 25 34 43), top
 *      up, in this order, from: the birthday root's family (source "birthday"), then the family
 *      of reduce(N1+N2+N3) (source "sum"), then families 1 → 9 (source "fill"), the same nearest-
 *      the-slice way. Lucky ones carry source "lucky". Returned smallest first, each with the
 *      root it reduces to.
 *   6. Stop number (one digit 1–9, NEVER one of N1–N3), the first rule that gives one:
 *      a. "karmic-lesson": the smallest digit 1–9 that no letter of her birth name carries,
 *         leaving out her three.
 *      b. "first-challenge": |reduce(month) − reduce(day)|, if it is 1–9 and not one of her three.
 *      c. "fallback": the smallest digit 1–9 that is not one of her three and not her birthday root.
 *   7. PIN (4 digits): start from N1, N2, N3, birthday root, in that order, then try the other
 *      orders of those four digits (a fixed order: every arrangement of the four slots, in
 *      dictionary order of slot positions, repeats skipped). Take the first that passes ALL of:
 *        no digit is the stop number · not all four the same · not a straight run up or down
 *        (1234, 4321, 2345 …) · not her birth year · not her MMDD or DDMM · no 0.
 *      If no order passes, swap in digits from her ticket numbers' roots (smallest ticket
 *      first), one slot at a time, the birthday-root slot first, then two slots, and so on,
 *      trying every order each time. If even that fails (only possible when every ticket has the
 *      same root), swap in digits 1 → 9 the same way. Always returns one PIN, with a `why`.
 *   8. Personal year / month / day, for any calendar date, all reduced:
 *        PY = reduce( reduce(birth month) + reduce(birth day) + reduce(calendar year) )
 *        PM = reduce( PY + calendar month number )
 *        PD = reduce( PM + calendar day of month )
 *        UD (universal day) = reduce( every digit of the calendar date )
 *   9. The window (12 calendar months):
 *        orderDate on or before 2027-01-17 → January to December 2027, label "2027".
 *        Later → the 12 months starting with the month after orderDate, label like
 *        "March 2027 to February 2028" (or just "2028" when that run is January–December).
 *      ⚠ BENT: the brief said "on or before 2027-01-31". An order from 18 January on would then
 *      have no allowed day left in January (see the 14-day rule), breaking "one in every month".
 *      So those days roll forward instead. (17 Jan + 14 = 31 Jan, the last day that still fits.)
 *  10. Twelve open days, exactly one in each month of the window. No day before orderDate + 14.
 *      Why 14 (coordinator, 2026-11-02): upsell 1 posts a citrine bracelet and promises it reaches
 *      her before her first open day, so the first one must leave room for the post.
 *      Each month is for one of her distinct numbers, shared out (operator, 2026-11-02): going
 *      month by month, the month goes to the number with the fewest months so far that has an
 *      allowed day whose PD equals it (a tie goes to the order N1, N2, N3). Three distinct numbers
 *      get 4 months each, two get 6 each. Only a short first month (an order 10–17 Jan 2027) can
 *      have no day for any of them; then every allowed day is a candidate and the month is for none.
 *      ⚠ CHANGED 2026-11-02: the old score (+3 for PD = N1, +2 for N2/N3, +1 for a weekend) gave
 *      about half of buyers all twelve months on N1, nearly all at a weekend, and ran the month
 *      actions out (6 per number), so months repeated.
 *      Among that number's days, score:
 *        +2 if it is Monday to Friday (most of the month actions need an office open)
 *        +1 if UD is one of her three
 *      Highest score wins. A tie goes to the earliest date.
 *  11. Full year (the order bump): every allowed day in the window where PD AND UD are both one
 *      of her three, by month, plus the 12 open days (flagged `open`, and listed even when they
 *      don't match both, since some months have no day that does). `count` = all listed days,
 *      `matchCount` = the days that match both.
 *  12. Lucky hours: clock hours 1–12 that reduce to one of her three (10 → 1, 11 → 2, 12 → 3).
 *      Slots: the same hours as daytime times from 9:00 to 21:00 (7 → 19:00; 9 → 9:00 and 21:00;
 *      12 → 12:00 noon only).
 *  13. Uses: three house-number examples under 200 that reduce to her numbers, a phone tip (aim
 *      for N1, avoid the stop number), and her open days for the wedding / interview / business
 *      opening / signing / travel / ticket-buying lines.
 */
const luckyNumbers12 = (function () {
  'use strict';

  const LETTER_VALUES = {
    a: 1, j: 1, s: 1,
    b: 2, k: 2, t: 2,
    c: 3, l: 3, u: 3,
    d: 4, m: 4, v: 4,
    e: 5, n: 5, w: 5,
    f: 6, o: 6, x: 6,
    g: 7, p: 7, y: 7,
    h: 8, q: 8, z: 8,
    i: 9, r: 9,
  };
  const VOWELS = ['a', 'e', 'i', 'o', 'u'];
  // Letters that NFKD does not split into base + accent.
  const SPECIAL_LETTERS = { 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'ł': 'l', 'đ': 'd', 'ð': 'd', 'þ': 'th', 'ı': 'i', 'ŀ': 'l' };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DEFAULT_GAME = { min: 1, max: 49, pick: 6 };
  const WINDOW_YEAR = 2027;
  const MIN_DAYS_AFTER_ORDER = 14; // rule 10: room for upsell 1's bracelet to arrive by post
  const LAST_ORDER_FOR_WINDOW_YEAR = '2027-01-17'; // rule 9: 31 Jan − 14 days; the brief said 01-31

  function fail(msg) { throw new Error('LUCKY12: ' + msg); }

  // ─── reducing ──────────────────────────────────────────────────────────────────
  function digitsOf(n) { return String(n).split('').map(Number); }
  function digitSum(n) { return digitsOf(n).reduce((a, b) => a + b, 0); }
  /** Add digits until one is left. Always 1–9 for n ≥ 1. No master numbers. */
  function reduce(n) {
    if (!Number.isInteger(n) || n < 1) fail('internal: reduce() got ' + n);
    while (n > 9) n = digitSum(n);
    return n;
  }
  /** The steps she would write: [34, 7]. */
  function chain(n) { const out = [n]; while (n > 9) { n = digitSum(n); out.push(n); } return out; }
  /** "3 + 4 = 7" for every step after the first sum. */
  function chainWords(n) {
    const steps = chain(n);
    const parts = [];
    for (let i = 1; i < steps.length; i++) parts.push(digitsOf(steps[i - 1]).join(' + ') + ' = ' + steps[i]);
    return parts.join(', then ');
  }

  // ─── input ─────────────────────────────────────────────────────────────────────
  function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function parseDate(field, v) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(field + ' must be a date written YYYY-MM-DD');
    const y = Number(v.slice(0, 4)), m = Number(v.slice(5, 7)), d = Number(v.slice(8, 10));
    if (m < 1 || m > 12) fail(field + ' has a month outside 01–12');
    if (d < 1 || d > daysInMonth(y, m)) fail(field + ' has a day that month does not have');
    return { y, m, d, iso: v };
  }
  function cleanName(raw) {
    if (typeof raw !== 'string') fail('birthName must be text');
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    if (!trimmed) fail('birthName is empty');
    if (trimmed.length > 200) fail('birthName is longer than 200 characters');
    let s = trimmed.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
    s = s.replace(/[ßæœøłđðþıŀ]/g, (c) => SPECIAL_LETTERS[c]);
    const foreign = (s.match(/\p{L}/gu) || []).filter((c) => !/^[a-z]$/.test(c));
    if (foreign.length) fail('birthName holds letters outside A–Z, even after removing accents; a person must check it');
    const letters = s.replace(/[^a-z]/g, '');
    if (letters.length < 2) fail('birthName needs at least two letters');
    const words = s.split(' ').map((w) => w.replace(/[^a-z]/g, '')).filter(Boolean);
    return { shown: trimmed, letters, words };
  }
  function cleanGame(g) {
    if (g === undefined || g === null) return { ...DEFAULT_GAME };
    if (typeof g !== 'object') fail('game must be { min, max, pick }');
    const out = { min: g.min ?? DEFAULT_GAME.min, max: g.max ?? DEFAULT_GAME.max, pick: g.pick ?? DEFAULT_GAME.pick };
    for (const k of ['min', 'max', 'pick']) if (!Number.isInteger(out[k])) fail('game.' + k + ' must be a whole number');
    if (out.min < 1 || out.max > 99 || out.min >= out.max) fail('game needs 1 ≤ min < max ≤ 99');
    if (out.pick < 1 || out.pick > 10) fail('game.pick must be 1–10');
    if (out.pick > out.max - out.min + 1) fail('game.pick is more numbers than the game holds');
    return out;
  }

  // ─── dates as day counts (UTC, so no time zone can move a day) ─────────────────
  function dayNum(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / 86400000); }
  function fromDayNum(n) {
    const t = new Date(n * 86400000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() };
  }
  function iso(y, m, d) { return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }

  // ─── name numbers ──────────────────────────────────────────────────────────────
  function nameNumbers(name) {
    const hasVowel = name.letters.split('').some((c) => VOWELS.includes(c));
    const yAsVowel = !hasVowel && name.letters.includes('y');
    const isVowel = (c) => VOWELS.includes(c) || (yAsVowel && c === 'y');
    const vowelLetters = name.letters.split('').filter(isVowel);
    if (!vowelLetters.length) fail('birthName has no vowels (A, E, I, O, U or Y), so it has no third number');
    const sum = (arr) => arr.reduce((a, c) => a + LETTER_VALUES[c], 0);
    const all = sum(name.letters.split(''));
    const vow = sum(vowelLetters);
    return {
      all, vow, yAsVowel,
      words: name.words.map((w) => ({ word: w, all: sum(w.split('')), vowels: sum(w.split('').filter(isVowel)) })),
      carried: new Set(name.letters.split('').map((c) => LETTER_VALUES[c])),
    };
  }

  // ─── tickets ───────────────────────────────────────────────────────────────────
  function familyOf(root, min, max) {
    const out = [];
    for (let n = min; n <= max; n++) if (reduce(n) === root) out.push(n);
    return out;
  }
  /** Twice the distance, in units of 1/pick, from n to the middle of slice k (whole numbers, so no
   *  rounding can change a tie). Slice k of `pick` equal slices of [min, max]. */
  function distTo(n, k, game) {
    const span = game.max - game.min + 1;
    return Math.abs(2 * n * game.pick - (2 * game.min * game.pick + (2 * k + 1) * span));
  }
  /** Rule 5's two looks: no neighbour of a picked number, no third number with the same last digit. */
  function looksOk(n, picked) {
    if (picked.some((p) => Math.abs(p.n - n) === 1)) return false;
    return picked.filter((p) => p.n % 10 === n % 10).length < 2;
  }
  function pickTickets(three, birthdayRoot, sumRoot, game) {
    const roots = [...new Set(three)];
    const labels = ['n1', 'n2', 'n3'];
    const used = new Set();
    const picked = [];
    const fams = roots.map((r) => familyOf(r, game.min, game.max));
    const countOf = (r) => picked.filter((p) => p.source === 'lucky' && p.root === r).length;
    const closest = (cands, k) => cands.reduce((best, n) => {
      if (best === null) return n;
      const a = distTo(n, k, game), b = distTo(best, k, game);
      return a < b || (a === b && n < best) ? n : best;
    }, null);
    const topUps = [['birthday', birthdayRoot], ['sum', sumRoot]];
    for (let r = 1; r <= 9; r++) topUps.push(['fill', r]);
    for (let k = 0; k < game.pick; k++) {
      let got = null;
      // Her own families first: the roots with the fewest tickets so far (sharing beats looks),
      // looks kept if that tier allows, else dropped. A lucky number is never passed over for a top-up.
      const tiers = [...new Set(roots.map(countOf))].sort((a, b) => a - b);
      for (const c of tiers) {
        for (const strict of [true, false]) {
          const cands = [];
          roots.forEach((r, i) => {
            if (countOf(r) !== c) return;
            for (const n of fams[i]) if (!used.has(n) && (!strict || looksOk(n, picked))) cands.push(n);
          });
          const n = closest(cands, k);
          if (n !== null) { const r = reduce(n); got = { n, root: r, source: 'lucky', of: labels.filter((_, j) => three[j] === r) }; break; }
        }
        if (got) break;
      }
      // Her families have run dry: top up, birthday → sum → 1 to 9, looks kept first.
      for (const strict of [true, false]) {
        if (got) break;
        for (const [source, r] of topUps) {
          const cands = familyOf(r, game.min, game.max).filter((n) => !used.has(n) && (!strict || looksOk(n, picked)));
          const n = closest(cands, k);
          if (n !== null) { got = { n, root: r, source, of: [] }; break; }
        }
      }
      used.add(got.n);
      picked.push(got);
    }
    const luckyCount = picked.filter((p) => p.source === 'lucky').length;
    picked.sort((a, b) => a.n - b.n);
    const families = {};
    roots.forEach((r, i) => { families[r] = fams[i]; });
    return {
      game: { ...game },
      numbers: picked,
      list: picked.map((t) => t.n),
      families,
      shortfall: luckyCount < game.pick,
      luckyCount,
      note: luckyCount < game.pick
        ? `Her numbers only make ${luckyCount} in ${game.min}–${game.max}; ${game.pick - luckyCount} topped up (see each number's source).`
        : `All ${game.pick} reduce to one of her three numbers.`,
    };
  }

  // ─── stop number ───────────────────────────────────────────────────────────────
  function chooseStop(carried, three, month, day, birthdayRoot) {
    const missing = [];
    for (let d = 1; d <= 9; d++) if (!carried.has(d)) missing.push(d);
    const lesson = missing.filter((d) => !three.includes(d));
    if (lesson.length) {
      return { value: lesson[0], rule: 'karmic-lesson', missingDigits: missing,
        why: `No letter of her birth name carries a ${lesson[0]}, and it is not one of her three.` };
    }
    const challenge = Math.abs(reduce(month) - reduce(day));
    if (challenge >= 1 && challenge <= 9 && !three.includes(challenge)) {
      return { value: challenge, rule: 'first-challenge', missingDigits: missing,
        why: `Her name carries every digit she could stop, so her first challenge: birth month ${reduce(month)} take away birth day ${reduce(day)} = ${challenge}.` };
    }
    let f = 1;
    while (three.includes(f) || f === birthdayRoot) f++;
    return { value: f, rule: 'fallback', missingDigits: missing,
      why: `Neither her name nor her first challenge gives one, so the smallest digit that is not one of her three and not her birthday root.` };
  }

  // ─── PIN ───────────────────────────────────────────────────────────────────────
  const PERMS = (function () {
    const out = [];
    const go = (pre, rest) => {
      if (!rest.length) { out.push(pre); return; }
      rest.forEach((x, i) => go(pre.concat(x), rest.slice(0, i).concat(rest.slice(i + 1))));
    };
    go([], [0, 1, 2, 3]);
    return out;
  })();
  /** Every reason a 4-digit PIN is refused. Empty = it passes. */
  function pinProblems(digits, ctx) {
    const s = digits.join('');
    const p = [];
    if (digits.length !== 4 || !digits.every((d) => Number.isInteger(d) && d >= 0 && d <= 9)) p.push('not-4-digits');
    if (digits.includes(0)) p.push('has-0');
    if (digits.includes(ctx.stop)) p.push('has-stop-number');
    if (digits.every((d) => d === digits[0])) p.push('all-same');
    if (digits.every((d, i) => i === 0 || d === digits[i - 1] + 1)) p.push('run-up');
    if (digits.every((d, i) => i === 0 || d === digits[i - 1] - 1)) p.push('run-down');
    if (s === String(ctx.birthYear)) p.push('birth-year');
    if (s === ctx.mmdd) p.push('birth-mmdd');
    if (s === ctx.ddmm) p.push('birth-ddmm');
    return p;
  }
  function combos(items, k) {
    if (k === 0) return [[]];
    const out = [];
    items.forEach((x, i) => { for (const c of combos(items.slice(i + 1), k - 1)) out.push([x].concat(c)); });
    return out;
  }
  function products(pool, k) {
    if (k === 0) return [[]];
    const out = [];
    for (const x of pool) for (const rest of products(pool, k - 1)) out.push([x].concat(rest));
    return out;
  }
  function choosePin(slots, ctx, ticketRoots) {
    const tried = [];
    const seen = new Set();
    const tryOrders = (base) => {
      for (const p of PERMS) {
        const arr = p.map((i) => base[i]);
        const s = arr.map((x) => x.d).join('');
        if (seen.has(s)) continue;
        seen.add(s);
        const problems = pinProblems(arr.map((x) => x.d), ctx);
        if (!problems.length) return arr;
        tried.push({ pin: s, problems });
      }
      return null;
    };
    const done = (arr, stage, why) => ({
      value: arr.map((x) => x.d).join(''),
      digits: arr.map((x) => ({ d: x.d, from: x.from })),
      stage, why, tries: tried.length + 1, rejected: tried.slice(0, 8),
    });
    let got = tryOrders(slots);
    if (got) {
      const inOrder = got.every((x, i) => x.from === slots[i].from);
      return done(got, inOrder ? 'in-order' : 'reordered', inOrder
        ? 'Her first, second and third numbers and her birthday root, in that order.'
        : `Her first, second and third numbers and her birthday root, reordered: ${tried.map((t) => `${t.pin} (${t.problems.join(', ')})`).join('; ')} refused first.`);
    }
    const swapIn = (pool, from, stage, label) => {
      const order = [3, 2, 1, 0];
      for (let k = 1; k <= 4; k++) {
        for (const at of combos(order, k)) {
          for (const ds of products(pool, k)) {
            const base = slots.map((x) => ({ ...x }));
            at.forEach((pos, i) => { base[pos] = { d: ds[i], from }; });
            const arr = tryOrders(base);
            if (arr) {
              const names = { n1: 'first number', n2: 'second number', n3: 'third number', birthday: 'birthday root' };
              const swaps = at.map((pos, i) => `a ${ds[i]} for her ${names[slots[pos].from]} (${slots[pos].d})`).join(' and ');
              const baseWhy = `No order of ${slots.map((x) => x.d).join(', ')} passes (${[...new Set(tried.slice(0, 24).flatMap((t) => t.problems))].join(', ')}),`;
              return done(arr, stage, `${baseWhy} so ${label} swapped in: ${swaps}.`);
            }
          }
        }
      }
      return null;
    };
    const ticketPool = [...new Set(ticketRoots)].filter((d) => d >= 1 && d <= 9 && d !== ctx.stop);
    got = swapIn(ticketPool, 'ticket', 'ticket-swap', 'digits from her ticket numbers were');
    if (got) return got;
    const fillPool = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => d !== ctx.stop);
    got = swapIn(fillPool, 'filler', 'filler-swap', 'plain digits (1 → 9) were');
    if (got) return got;
    fail('internal: no PIN passes'); // cannot happen: 8 allowed digits always make one
  }

  // ─── calendar ──────────────────────────────────────────────────────────────────
  function personalYear(bm, bd, y) { return reduce(reduce(bm) + reduce(bd) + reduce(digitSum(y))); }
  function dayFacts(bm, bd, n) {
    const t = fromDayNum(n);
    const py = personalYear(bm, bd, t.y);
    const pm = reduce(py + t.m);
    const pd = reduce(pm + t.d);
    const ud = reduce(digitSum(t.y) + digitSum(t.m) + digitSum(t.d));
    return { date: iso(t.y, t.m, t.d), y: t.y, m: t.m, d: t.d, weekday: WEEKDAYS[t.wd], weekend: t.wd === 0 || t.wd === 6, py, pm, pd, ud };
  }
  function windowFor(order) {
    let y, m;
    if (order.iso <= LAST_ORDER_FOR_WINDOW_YEAR) { y = WINDOW_YEAR; m = 1; }
    else { y = order.y; m = order.m + 1; if (m > 12) { m = 1; y += 1; } }
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.push({ y, m });
      m += 1; if (m > 12) { m = 1; y += 1; }
    }
    const a = months[0], b = months[11];
    const label = a.m === 1 ? String(a.y) : `${MONTHS[a.m - 1]} ${a.y} to ${MONTHS[b.m - 1]} ${b.y}`;
    return {
      months, label,
      start: iso(a.y, a.m, 1),
      end: iso(b.y, b.m, daysInMonth(b.y, b.m)),
      rolled: !(a.y === WINDOW_YEAR && a.m === 1),
    };
  }

  // ─── the entry function ────────────────────────────────────────────────────────
  function run(input) {
    if (!input || typeof input !== 'object') fail('input must be { birthName, birthDate, orderDate, game? }');
    const name = cleanName(input.birthName);
    const birth = parseDate('birthDate', input.birthDate);
    const order = parseDate('orderDate', input.orderDate);
    const game = cleanGame(input.game);
    if (birth.y < 1900) fail('birthDate is before 1900');
    if (order.y < 2020 || order.y > 2100) fail('orderDate year must be 2020–2100');
    if (birth.iso >= order.iso) fail('birthDate must be before orderDate');

    // 1–4. her numbers
    const dateDigits = [...digitsOf(birth.m), ...digitsOf(birth.d), ...digitsOf(birth.y)];
    const n1Raw = dateDigits.reduce((a, b) => a + b, 0);
    const nn = nameNumbers(name);
    const n1 = reduce(n1Raw), n2 = reduce(nn.all), n3 = reduce(nn.vow);
    const three = [n1, n2, n3];
    const labels = ['n1', 'n2', 'n3'];
    const repeats = [...new Set(three)]
      .map((v) => ({ number: v, count: three.filter((x) => x === v).length, which: labels.filter((_, i) => three[i] === v) }))
      .filter((r) => r.count > 1);
    const birthdayRoot = reduce(birth.d);
    const sumRoot = reduce(n1 + n2 + n3);
    const wordsFor = (raw) => (raw > 9 ? `${raw}, then ${chainWords(raw)}` : `${raw}`);

    // 5. tickets
    const tickets = pickTickets(three, birthdayRoot, sumRoot, game);

    // 6. stop number
    const stop = chooseStop(nn.carried, three, birth.m, birth.d, birthdayRoot);

    // 7. PIN
    const pad = (x) => String(x).padStart(2, '0');
    const pin = choosePin(
      [{ d: n1, from: 'n1' }, { d: n2, from: 'n2' }, { d: n3, from: 'n3' }, { d: birthdayRoot, from: 'birthday' }],
      { stop: stop.value, birthYear: birth.y, mmdd: pad(birth.m) + pad(birth.d), ddmm: pad(birth.d) + pad(birth.m) },
      tickets.numbers.map((t) => t.root),
    );

    // 8–10. calendar and open days
    const win = windowFor(order);
    const earliestN = dayNum(order.y, order.m, order.d) + MIN_DAYS_AFTER_ORDER;
    const isHers = (x) => three.includes(x);
    // Rule 10: the months are shared between her numbers (fewest so far goes next), and inside a
    // month a weekday beats a weekend (+2), then a date that adds to one of hers (+1), then earliest.
    const ownNumbers = [...new Set(three)];
    const monthsFor = Object.fromEntries(ownNumbers.map((x) => [x, 0]));
    const scoreOf = (f) => {
      const weekday = f.weekend ? 0 : 2;
      const ud = isHers(f.ud) ? 1 : 0;
      return { total: weekday + ud, parts: { weekday, ud } };
    };
    const openDays = [];
    const fullMonths = [];
    const personalYears = {};
    for (const { y, m } of win.months) {
      personalYears[y] = personalYear(birth.m, birth.d, y);
      const days = [];
      for (let d = 1; d <= daysInMonth(y, m); d++) {
        const n = dayNum(y, m, d);
        if (n < earliestN) continue;
        const f = dayFacts(birth.m, birth.d, n);
        days.push({ f, s: scoreOf(f) });
      }
      if (!days.length) fail('internal: a month in the window has no allowed day');
      // Which of her numbers this month is for. Only a short first month can lack all of them.
      const offered = ownNumbers.filter((x) => days.some(({ f }) => f.pd === x));
      let forNumber = null;
      if (offered.length) {
        const fewest = Math.min(...offered.map((x) => monthsFor[x]));
        forNumber = offered.find((x) => monthsFor[x] === fewest);
        monthsFor[forNumber] += 1;
      }
      let best = null;
      for (const c of days) {
        if (forNumber !== null && c.f.pd !== forNumber) continue;
        if (!best || c.s.total > best.s.total) best = c;
      }
      const o = best.f;
      openDays.push({
        date: o.date, weekday: o.weekday, monthName: MONTHS[o.m - 1], day: o.d, forNumber,
        score: best.s.total, parts: best.s.parts, py: o.py, pm: o.pm, pd: o.pd, ud: o.ud,
      });
      const listed = days
        .filter(({ f }) => (isHers(f.pd) && isHers(f.ud)) || f.date === o.date)
        .map(({ f }) => ({ date: f.date, weekday: f.weekday, pd: f.pd, ud: f.ud, open: f.date === o.date, match: isHers(f.pd) && isHers(f.ud) }));
      fullMonths.push({ month: iso(y, m, 1).slice(0, 7), label: `${MONTHS[m - 1]} ${y}`, days: listed });
    }
    const allListed = fullMonths.flatMap((x) => x.days);

    // 11. lucky hours
    const hours = [];
    for (let h = 1; h <= 12; h++) if (isHers(reduce(h))) hours.push({ hour: h, root: reduce(h), label: `${h} o'clock` });
    const slots = [];
    for (const h of hours) {
      for (const t of (h.hour === 12 ? [12] : [h.hour, h.hour + 12])) {
        if (t < 9 || t > 21) continue;
        slots.push({ time: pad(t) + ':00', label: t < 12 ? `${t}am` : t === 12 ? '12 noon' : `${t - 12}pm`, root: h.root });
      }
    }
    slots.sort((a, b) => a.time.localeCompare(b.time));

    // 12. uses
    const distinct = [...new Set(three)];
    const houseExamples = [3, 11, 16].map((idx, k) => {
      const r = distinct[k % distinct.length];
      return { n: familyOf(r, 1, 199)[idx], root: r };
    });
    const openDates = openDays.map((o) => o.date);

    return {
      engine: 'lucky-12',
      version: 1,
      input: { birthName: name.shown, birthDate: birth.iso, orderDate: order.iso, game },
      name: { letters: name.letters.toUpperCase(), letterCount: name.letters.length, yCountedAsVowel: nn.yAsVowel, words: nn.words },
      numbers: {
        n1: { value: n1, raw: n1Raw, from: 'birth date', working: `${dateDigits.join(' + ')} = ${n1Raw}${n1Raw > 9 ? ', then ' + chainWords(n1Raw) : ''}` },
        n2: { value: n2, raw: nn.all, from: 'every letter of her birth name', working: wordsFor(nn.all) },
        n3: { value: n3, raw: nn.vow, from: 'the vowels of her birth name', working: wordsFor(nn.vow) },
        three,
        distinct,
        repeats,
        birthdayRoot: { value: birthdayRoot, raw: birth.d },
        sumRoot,
      },
      tickets,
      stopNumber: stop,
      pin,
      windowLabel: win.label,
      calendar: {
        window: { start: win.start, end: win.end, label: win.label, rolled: win.rolled },
        earliestAllowed: fromDayNumIso(earliestN),
        personalYears,
      },
      openDays,
      fullYear: {
        count: allListed.length,
        matchCount: allListed.filter((x) => x.match).length,
        openDaysNotMatching: allListed.filter((x) => x.open && !x.match).length,
        months: fullMonths,
      },
      luckyHours: { hours, slots },
      uses: {
        lottery: { numbers: tickets.list, buyOn: openDates, promise: 'none: no win is promised' },
        pin: pin.value,
        house: { aimFor: distinct, examples: houseExamples, rule: 'add the digits of the house number until one digit is left' },
        phone: { aimFor: n1, alsoGood: distinct.filter((x) => x !== n1), avoid: stop.value, rule: 'add every digit of the number until one digit is left' },
        wedding: openDates,
        interview: { days: openDates, hours: slots },
        businessOpening: openDates,
        signing: openDates,
        travel: openDates,
      },
    };
  }
  function fromDayNumIso(n) { const t = fromDayNum(n); return iso(t.y, t.m, t.d); }

  run.internals = { LETTER_VALUES, VOWELS, reduce, chain, cleanName, parseDate, familyOf, pickTickets, chooseStop, pinProblems, choosePin, dayFacts, personalYear, windowFor, PERMS };
  return run;
})();
