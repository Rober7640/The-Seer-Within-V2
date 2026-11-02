/**
 * Static contract for the built 12 workflow: every loop the sales letters open (12-E2-esl-A/B,
 * L1–L9, plus L10 on arm A) has a section that closes it, every ban is stated where the model
 * reads it, the arms get the right promise, and no hand-written reading text leaked into a prompt.
 *   node scripts/check-12-promises.mjs
 * Checks plumbing and prompts, never prose quality.
 */
import { loadWf, TESTINA, FAKETTA, SPEC, report, execute, fakeOpenAI, handActs, START, engine, fixture } from './lib-12.mjs';

const S = SPEC.sections;
const closers = (loop) => Object.entries(S).filter(([, v]) => (v.closes || []).some((c) => c.split(' ')[0] === loop)).map(([k]) => k);
const promptsFor = (file, acts) => {
  const fake = fakeOpenAI(acts ? { acts } : {});
  execute(loadWf(file), { start: START, http: fake.http });
  return fake.calls.filter((c) => c.schema !== 'verdict').map((c) => ({ sys: c.body.messages[0].content, user: c.body.messages[1].content }));
};
const hand = handActs();
const T = promptsFor(TESTINA, (id) => hand[id]);
const F = promptsFor(FAKETTA);
const briefOf = (calls, key) => { const u = calls.map((c) => c.user).join('\n'); const i = u.indexOf(`[${key}]`);
  return i < 0 ? '' : u.slice(i, u.indexOf('\n\n[', i + 3) > 0 ? u.indexOf('\n\n[', i + 3) : undefined); };

const norm = (t) => t.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);
const grams = (t, n) => { const w = norm(t), s = new Set(); for (let i = 0; i <= w.length - n; i++) s.add(w.slice(i, i + n).join(' ')); return s; };
// Twelve words in a row is a copied sentence; nine is often just the brief's own job wording echoed.
const LEAK_N = 12;
const handGrams = grams(Object.values(hand).flatMap(Object.values).join('\n\n'), LEAK_N);
// The rules and briefs only: the letter's facts and her worked-out numbers are handed over to be
// used, so the reading may repeat them; what must not happen is a SAMPLE LINE in a rule or brief.
const rulesOnly = T[0].sys.split('WHAT YOUR LETTER TOLD HER')[0];
const briefsOnly = T.map((c) => c.user.slice(c.user.indexOf('\nNOW WRITE'))).join('\n');
const before = `${rulesOnly}\n${briefsOnly}`;
// The clock rule is a fixed rule she's meant to read word for word, like a sum.
const fixedRules = grams("Ten o'clock counts as a 1, eleven as a 2, twelve as a 3.", LEAK_N);
const leaks = [...grams(before, LEAK_N)].filter((g) => handGrams.has(g) && !fixedRules.has(g));
const sweep = Array.from({ length: 200 }, (_, i) => {
  const y = 1940 + (i % 50), m = 1 + (i % 12), d = 1 + ((i * 7) % 28);
  const od = new Date(Date.UTC(2026, 10, 1) + i * 3 * 864e5).toISOString().slice(0, 10);
  return engine({ birthName: ['Ann Marie Jones', 'Testina Rose Testerly', 'Lou Kay', 'Bethany Grace Oyelaran-Smith'][i % 4],
    birthDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, orderDate: od });
});

const bad = report('12 · promises, bans and prompt rules', [
  ['EVERY LOOP THE LETTERS OPEN HAS A CLOSER (12-E2-esl-A/B; see 12-P1-plan.md "Loop check")', [
    ...['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'].map((L) => [`${L} closes in: ${closers(L).join(', ') || 'NOWHERE'}`, () => closers(L).length > 0]),
    ['L10 (arm A, small miracles) is in each number\'s brief on arm A', () => ['n1', 'n2', 'n3'].every((k) => /small miracle/i.test(briefOf(F, k)))],
    ['…and arm B\'s number briefs ban the word', () => ['n1', 'n2', 'n3'].every((k) => /Never the word miracle/.test(briefOf(T, k)))],
  ]],
  ['WHAT THE LETTERS CLAIM, THE ENGINE MAKES TRUE (200 made-up buyers)', [
    ['twelve open days, one in each month of her window', () => sweep.every((L) => L.openDays.length === 12 && new Set(L.openDays.map((o) => o.date.slice(0, 7))).size === 12)],
    ['every open day carries one of her three', () => sweep.every((L) => L.openDays.every((o) => L.numbers.three.includes(o.pd)))],
    ['six numbers to play; the honest note says when some are topped up', () => sweep.every((L) => L.tickets.list.length === 6
      && (L.tickets.shortfall ? L.tickets.numbers.some((t) => t.source !== 'lucky') : L.tickets.numbers.every((t) => t.source === 'lucky')))],
    ['a four-digit PIN, never her birth year or day-month', () => sweep.every((L) => /^\d{4}$/.test(L.pin.value)
      && L.pin.value !== L.input.birthDate.slice(0, 4) && L.pin.value !== L.input.birthDate.slice(8, 10) + L.input.birthDate.slice(5, 7)
      && L.pin.value !== L.input.birthDate.slice(5, 7) + L.input.birthDate.slice(8, 10))],
    ['one stop number, never one of her three', () => sweep.every((L) => Number.isInteger(L.stopNumber.value) && !L.numbers.three.includes(L.stopNumber.value))],
    ['no open day sooner than 14 days after the order (the bracelet arrives first)', () => sweep.every((L) => L.openDays[0].date >= new Date(Date.parse(L.input.orderDate) + 14 * 864e5).toISOString().slice(0, 10))],
    ['lucky hours exist for every buyer (the interview line)', () => sweep.every((L) => L.luckyHours.slots.length > 0)],
    ['Testina: window 2027, Faketta: April 2027 to March 2028', () => engine(fixture('testina').input).windowLabel === '2027' && /April 2027.*March 2028/.test(engine(fixture('faketta').input).windowLabel)],
  ]],
  ['BANS THE MODEL IS TOLD', [
    ['no win promised; no jackpot, guaranteed or winning numbers', () => /No win is promised/.test(T[0].sys) && /jackpot, guaranteed or winning numbers/.test(T[0].sys)],
    ['never tell her to buy more tickets', () => /buy more tickets/.test(T[0].sys)],
    ['never compute or change a number', () => /Never add, reduce, work out, round or change a number/.test(T[0].sys)],
    ['each section names the numerals it may write', () => T.every((c) => (c.user.match(/Numerals you may write in this section, and no others/g) || []).length === (c.user.match(/^\[[a-z0-9_]+\]/gm) || []).length)],
    ['no tarot, no clients, no jargon, no markdown', () => /Tarot cards/.test(T[0].sys) && /Past clients/.test(T[0].sys) && /life path/.test(T[0].sys) && /markdown/.test(T[0].sys)],
    ['the stop number: never claim it was found', () => /Never say it's there, never say you found it there or saw it/.test(briefOf(T, 'stop'))],
    ['the PIN: never the birth date, never kept with the card', () => /never to use her birth date/.test(briefOf(T, 'pin')) && /never keep it written down with her card/.test(briefOf(T, 'pin'))],
    ['the six: her promise is repeated', () => /won't chase it/.test(briefOf(T, 'six'))],
    ['the system block is the same for every buyer of an arm (cacheable): no name in it', () => !T[0].sys.includes('Testina') && !F[0].sys.includes('Faketta')],
  ]],
  ['PROMPT HYGIENE (examples become templates)', [
    ['no twelve-word run of the hand-written reading sits in a rule or brief', () => ({ ok: !leaks.length, note: leaks.slice(0, 2).join(' | ') || '0 shared' })],
    ['the month briefs hand an action, never a sample line', () => !/e\.g\.|for example:|like this:/i.test(briefOf(T, 'day01') + briefOf(T, 'day07'))],
    ['no two months get the same action or the same opener-and-ending pair', () => {
      const u = T[2].user; const acts = [...u.matchAll(/What she does on it: ([^.]+)\./g)].map((m) => m[1]);
      const pairs = [...u.matchAll(/How it opens: ([^\n]+)\nHow it ends: ([^\n]+)/g)].map((m) => m[1] + m[2]);
      return { ok: new Set(acts).size === 12 && new Set(pairs).size >= 6, note: `${new Set(acts).size} actions, ${new Set(pairs).size} shapes` }; }],
  ]],
]);
process.exit(bad ? 1 : 0);
