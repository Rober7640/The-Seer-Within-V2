/**
 * The whole test-drive chain, on this machine, with every outside call faked.
 *   node scripts/check-12-chain.mjs [--show]
 *
 * Walks the REAL connections and runs the REAL node code (lib-12 execute()). The writer replies are
 * Testina's four acts, written BY HAND in runs/12-handwritten-testina/act-A..D.json.
 * ⛔ That is a hand-written stand-in, NOT a model run. It proves the measures, the assembly and the
 *    page work on a reading that keeps the rules. It proves nothing about what the model writes.
 *
 * Saves runs/12-handwritten-testina/12-handwritten-testina-NOT-A-MODEL-RUN.html (+ metrics.json).
 */
import fs from 'fs';
import path from 'path';
import { loadWf, TESTINA, FAKETTA, SPEC, HAND_DIR, execute, fakeOpenAI, handActs, withFixture,
  START, replyOf, fakeVerdict, report } from './lib-12.mjs';

const show = process.argv.includes('--show');
const hand = handActs();
const run = (over = {}, wf = loadWf(TESTINA)) => {
  const fake = fakeOpenAI({ acts: (id) => hand[id], ...over });
  const r = execute(wf, { start: START, http: fake.http });
  return { ...r, calls: fake.calls };
};
/** Hand acts with one section swapped or added to. */
const edited = (fn) => (id) => { const a = { ...hand[id] }; fn(a, id); return a; };

const A = run();
const m = A.last('6 ·').metrics;
const v = A.last('7a ·').verdict;
const html = A.last('10 ·').html;
const promptOf = (r, i) => r.runs['4a · Compose the act prompt'][i][0][0].json.prompt;

// ── regenerate: the grader fails the first draft ──────────────────────────────
const R = run({ verdicts: [fakeVerdict(false), fakeVerdict(true)] });
let round = 0;
const R2 = run({
  acts: (id) => (round === 0 ? { ...hand[id], [Object.keys(hand[id])[0]]: `${Object.values(hand[id])[0]}\n\nFIRSTDRAFTMARKER` } : hand[id]),
  verdicts: [fakeVerdict(false), fakeVerdict(true)],
  onAct: ({ calls }) => { round = calls.filter((c) => c.schema === 'verdict').length; return null; },
});

// ── a format failure on act B, once ───────────────────────────────────────────
let spoiled = 0;
const F = run({ onAct: ({ id }) => { if (id === 'B' && !spoiled) { spoiled += 1; return replyOf('Here is the next part.'); } return null; } });

const expectThrow = (fn, re) => { try { fn(); return { ok: false, note: 'it did not stop' }; }
  catch (e) { return { ok: re.test(e.message), note: `${e.node || ''}: ${e.message.slice(0, 110)}` }; } };
const hardOf = (r) => r.last('7a ·').verdict;

if (show) {
  console.log('metrics', JSON.stringify({ ...m, repeated_8grams: m.repeated_8grams.length }, null, 1));
  console.log('verdict', JSON.stringify(v, null, 1));
}
const bad = report('12 · the chain, faked outside calls, real nodes and wiring', [
  ['TESTINA\'S HAND-WRITTEN ACTS THROUGH THE REAL MEASURES (a stand-in, not a model run)', [
    ['all sections arrive, in order', () => Object.keys(A.last('6 ·').sections).join() === SPEC.segments.flatMap((x) => x.sections).join()],
    ['word count sits inside the contract', () => ({ ok: m.words >= SPEC.floor_words && m.words <= SPEC.ceiling_words, note: `${m.words} words (${SPEC.floor_words}-${SPEC.ceiling_words})` })],
    ['every required line is present', () => { const miss = Object.entries(m.exact).filter(([, x]) => !x).map(([k]) => k);
      return { ok: !miss.length, note: miss.join(', ') || `${Object.keys(m.exact).length} lines` }; }],
    ['it passes every hard check', () => ({ ok: v.pass === true && v.numbers_ok === true, note: v.pass ? `grade ${m.reading_grade}, contractions ${m.contraction_share}` : v.why })],
    ['no numeral, date or weekday that is not hers', () => !m.numerals.length && !m.dates.length && !m.day_dates.length && !m.weekdays.length],
    ['no two months share an eight-word run or an opening', () => ({ ok: !m.repeated_8grams.length && !m.same_openings.length, note: `${m.repeated_8grams.length} runs` })],
    ['her name about eight times, never opening a section after the first', () => ({ ok: Math.abs(m.name_uses - SPEC.devices.name_uses_total) <= 2 && !m.name_starts.length, note: `${m.name_uses}` })],
    ['the candidate lists a human reads are empty', () => { const k = ['banned', 'jargon', 'win', 'found', 'miracle', 'tarot', 'clients', 'more_tickets', 'number_words'].filter((x) => m[x].length);
      return { ok: !k.length, note: k.map((x) => `${x} ${m[x].length}`).join(', ') || 'all empty' }; }],
  ]],
  ['THE WRITING LOOP', [
    ['four act calls, then one grade', () => { const seq = A.calls.map((c) => c.schema).join(' ');
      return { ok: seq === 'act_a act_b act_c act_d verdict', note: seq }; }],
    ['each act is handed everything before it', () => promptOf(A, 0).includes('Nothing is written yet')
      && promptOf(A, 1).includes(hand.A.n3.slice(0, 80)) && promptOf(A, 2).includes(hand.B.stop.slice(0, 80))
      && promptOf(A, 3).includes(hand.C.day12.slice(0, 80))],
    ['the system block is byte-identical on every act, so it can cache', () => {
      const sys = new Set(A.calls.filter((c) => c.schema !== 'verdict').map((c) => c.body.messages[0].content));
      return { ok: sys.size === 1, note: `${[...sys][0].length} characters` }; }],
    ['every act asks for a strict schema with exactly its sections', () => A.calls.filter((c) => c.schema !== 'verdict')
      .every((c) => c.body.response_format.json_schema.strict === true
        && c.body.response_format.json_schema.schema.required.join() === SPEC.segments.find((s) => `act_${s.id.toLowerCase()}` === c.schema).sections.join())],
    ['every prompt carries her engine numbers', () => [0, 1, 2, 3].every((i) => /First number: 7/.test(promptOf(A, i)) && /Her PIN: 7893/.test(promptOf(A, i)))],
  ]],
  ['REGENERATE', [
    ['a failed first draft writes all four acts again', () => ({ ok: R.calls.filter((c) => c.schema !== 'verdict').length === 8, note: `${R.calls.length} calls` })],
    ['attempt 2 sees only attempt 2', () => [4, 5, 6, 7].every((i) => !promptOf(R2, i).includes('FIRSTDRAFTMARKER'))],
    ['attempt 2 still sees its own earlier acts', () => promptOf(R, 7).includes(hand.C.day12.slice(0, 80))],
    ['the engine runs once, the numbers do not move', () => R.runs['3 · The engine (lucky-12.js)'].length === 1
      && JSON.stringify(R.last('10 ·').lucky) === JSON.stringify(A.last('10 ·').lucky)],
    ['two failed grades ship anyway rather than strand a paying buyer', () => {
      const T = run({ verdicts: [fakeVerdict(false), fakeVerdict(false)] });
      return T.last('10 ·')?.html?.length > 1000 && T.calls.filter((c) => c.schema === 'verdict').length === 2; }],
  ]],
  ['⛔ A WRONG NUMBER NEVER SHIPS', [
    ['a stray numeral in a month fails the grade, even when the grader says pass, and it writes again', () => {
      let k = 0;
      const r = run({ acts: (id) => (k === 0 && id === 'C' ? { ...hand.C, day05: `${hand.C.day05} Bring 42 bags.` } : hand[id]),
        verdicts: [fakeVerdict(true), fakeVerdict(true)], onAct: ({ calls }) => { k = calls.filter((c) => c.schema === 'verdict').length; return null; } });
      const first = r.runs['7a · Read the verdict'][0][0][0].json.verdict;
      return { ok: !first.pass && first.failed.includes(11) && r.last('10 ·').attempt === 2, note: first.why.slice(-70) }; }],
    ['…and on the second attempt it HOLDS at node 10 for a person', () => expectThrow(() =>
      run({ acts: edited((a, id) => { if (id === 'C') a.day05 += ' Bring 42 bags.'; }) }), /^HOLD: the prose has a number/)],
    ['a date that is not hers holds', () => expectThrow(() =>
      run({ acts: edited((a, id) => { if (id === 'D') a.use_wedding += ' June 5 is lovely.'; }) }), /^HOLD/)],
    ['a wrong weekday in a month holds', () => expectThrow(() =>
      run({ acts: edited((a, id) => { if (id === 'C') a.day03 += ' Or the Friday.'; }) }), /^HOLD/)],
    ['her birth date in the PIN warning is allowed', () => run({ acts: edited((a, id) => { if (id === 'B') a.pin += ' Not July 21, not 1968.'; }) }).last('7a ·').verdict.numbers_ok === true],
    ['…but not in a month', () => expectThrow(() =>
      run({ acts: edited((a, id) => { if (id === 'C') a.day07 += ' Not July 21.'; }) }), /^HOLD/)],
  ]],
  ['THE MEASURED CONTRACT BEATS A GREEN GRADE', [
    ['"jackpot" fails line 10', () => { const f = hardOf(run({ acts: edited((a, id) => { if (id === 'D') a.use_lottery += ' Here comes the jackpot.'; }) }));
      return { ok: !f.pass && f.failed.includes(10), note: f.why.slice(0, 90) }; }],
    ['"buy more tickets" fails line 10', () => !hardOf(run({ acts: edited((a, id) => { if (id === 'D') a.use_lottery += ' So buy more tickets this year.'; }) })).pass],
    ['…but "don\'t buy more tickets" is fine', () => hardOf(run({ acts: edited((a, id) => { if (id === 'D') a.use_lottery += " Don't buy more tickets."; }) })).pass],
    ['"miracle" on arm B fails line 10', () => !hardOf(run({ acts: edited((a, id) => { if (id === 'A') a.n2 += ' A small miracle.'; }) })).pass],
    ['a hedge fails line 12; "May" the month does not', () => !hardOf(run({ acts: edited((a, id) => { if (id === 'A') a.n2 += ' It may come.'; }) })).pass
      && hardOf(run({ acts: edited((a, id) => { if (id === 'D') a.use_days += ' May is a good month.'; }) })).pass],
    ['jargon fails line 12', () => !hardOf(run({ acts: edited((a, id) => { if (id === 'A') a.n1 += ' Your life path agrees.'; }) })).pass],
    ['claiming to have found the stop number fails line 6', () => { const f = hardOf(run({ acts: edited((a, id) => { if (id === 'B') a.stop += " It's in your phone number."; }) }));
      return !f.pass && f.failed.includes(6); }],
    ['the stop number named late fails line 6', () => !hardOf(run({ acts: edited((a, id) => { if (id === 'B') a.stop = `${'Here is a long run of plain words. '.repeat(8)}\n\n${a.stop}`; }) })).pass],
    ['a PIN with no birth-date warning fails line 5', () => !hardOf(run({ acts: edited((a, id) => { if (id === 'B') a.pin = 'Your PIN is 7893. Use it at the bank.'; }) })).pass],
    ['the six without her promise fails line 4', () => !hardOf(run({ acts: edited((a, id) => { if (id === 'B') a.six = a.six.replace(/promise/g, 'word').replace(/chase/g, 'push').replace(/money you need/g, 'cash').replace(/Not ten\./, ''); }) })).pass],
    ['a ticket month with no ticket fails line 9', () => !hardOf(run({ acts: edited((a, id) => { if (id === 'C') a.day03 = a.day03.replace(/[^.]*ticket[^.]*\./g, ''); }) })).pass],
    ['the opening with no "read it all first" fails line 1', () => !hardOf(run({ acts: edited((a, id) => { if (id === 'A') a.opening = a.opening.replace(/read it all the way through once/, 'look at it').replace(/read to the end/, 'looked'); }) })).pass],
    ['a markdown heading or bullet never reaches the page', () => { const r = run({ acts: edited((a, id) => { if (id === 'D') a.use_home = `## Home\n\n- ${a.use_home}`; }) });
      return !/##|^- /m.test(r.last('6 ·').sections.use_home); }],
  ]],
  ['FAILURES', [
    ['a broken act format retries once and carries on', () => F.runs['4s · Retry the act once']?.length === 1 && F.last('10 ·')?.html?.length > 1000],
    ['the retry does not lose its place: act C still sees act B', () => {
      const p = F.runs['4a · Compose the act prompt'].map((x) => x[0][0].json.prompt).find((x) => x.includes('NOW WRITE HER TWELVE OPEN DAYS'));
      return p.includes(hand.B.stop.slice(0, 80)); }],
    ['a refusal stops the run, no retry', () => expectThrow(() => run({ onAct: () => ({ choices: [{ finish_reason: 'content_filter', message: { content: '', refusal: 'no' } }] }) }), /declined|FORMAT/)],
    ['a broken act twice stops the run', () => expectThrow(() => run({ onAct: () => replyOf('not json') }), /FORMAT/)],
    ['hitting the token ceiling never ships half a reading', () => expectThrow(() => run({ onAct: () => replyOf('{"opening":"half', 'length') }), /FORMAT|ceiling/)],
    ['a grader that returns junk fails open, loudly', () => { const x = run({ verdicts: ['not json'] }).last('7a ·').verdict;
      return { ok: x.pass === true && /^UNGRADED/.test(x.why), note: x.why }; }],
    ['no birth name holds at the engine', () => expectThrow(() => run({}, withFixture(loadWf(TESTINA), {}, { fullBirthName: '' })), /^HOLD: no full_birth_name/)],
    ['a bad birth date holds at the engine', () => expectThrow(() => run({}, withFixture(loadWf(TESTINA), {}, { dateOfBirth: '21/07/1968' })), /^HOLD/)],
  ]],
  ['ARM AND BUMP COME FROM STRIPE METADATA', [
    ['c=11 → arm B, bump=1 → Full Year page', () => A.last('10 ·').arm === 'B' && A.last('10 ·').bump === true && html.includes('The Full Year')],
    ['c=1 → arm A, bump=0 → no Full Year page', () => { const r = execute(loadWf(FAKETTA), { start: START, http: fakeOpenAI().http }).last('10 ·');
      return r.arm === 'A' && r.bump === false && !r.html.includes('The Full Year'); }],
    ['bumpProduct=full_year alone also counts as the bump', () => run({}, withFixture(loadWf(TESTINA), { metadata: { bump: '0', bumpProduct: 'full_year' } })).last('10 ·').bump === true],
    ['no c at all → arm B (no win promised)', () => run({}, withFixture(loadWf(TESTINA), { metadata: { c: '' } })).last('10 ·').arm === 'B'],
  ]],
  ['THE HTML', [
    ['cover, three numbers, six, PIN, stop, twelve months, hours, nine uses, close, keep page, colophon', () => {
      const need = ['class="cover"', 'Testina Rose Testerly', 'data-number="n1"', 'data-number="n3"', 'data-ticket="43"', 'data-pin-digit',
        'data-stop="4"', 'data-open-date="2027-12-03"', 'data-hour="21:00"', 'class="close"', '&mdash; Evelyn', 'class="keep"', 'class="colophon"'];
      const miss = need.filter((x) => !html.includes(x)); return miss.length ? { ok: false, note: miss.join(' | ') } : true; }],
    ['nine uses', () => (html.match(/<section class="use">/g) || []).length === 9],
    ['nothing with a double brace or undefined reaches the page', () => !/undefined|\{\{|\}\}|\[object|NaN/.test(html.split('</style>')[1])],
    ['no image fetches: the calendar is drawn, not downloaded', () => !/<img /.test(html)],
  ]],
]);

fs.writeFileSync(path.join(HAND_DIR, '12-handwritten-testina-NOT-A-MODEL-RUN.html'), html);
fs.writeFileSync(path.join(HAND_DIR, 'metrics.json'), JSON.stringify({ note: 'HAND-WRITTEN STAND-IN, NOT A MODEL RUN', metrics: m, verdict: v }, null, 2));
process.exit(bad ? 1 : 0);
