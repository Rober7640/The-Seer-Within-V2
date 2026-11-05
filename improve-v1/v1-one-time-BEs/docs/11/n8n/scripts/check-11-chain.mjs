/**
 * The whole test-drive chain, on this machine, with every outside call faked.
 *   node scripts/check-11-chain.mjs [--show]
 *
 * Walks the REAL connections and runs the REAL node code (lib-11 execute()). Writer replies are
 * Diane's hand-written test reading, cut into the same sections a model returns. That reading is
 * the gold standard: if a hard check fails on it, the check is what's wrong.
 *
 * Proves: wiring, the act loop, "each act sees what came before", the format retry, regenerate
 * with the same cards, fail-open grading, the bump hold, the HTML.
 * Does NOT prove: n8n's own runner, a real model's replies, or what PDFShift does.
 */
import fs from 'fs';
import path from 'path';
import { loadWf, GETBACK, GIVING, SPEC, RUNS, execute, fakeOpenAI, goldReading, withFixture,
  DIANE_TWELVE, START, replyOf, fakeVerdict, report, runCode, nodeOf } from './lib-11.mjs';

const show = process.argv.includes('--show');
const gold = goldReading();
const dianeWf = () => withFixture(loadWf(GIVING), { id: 'cs_test_n8n_chain_diane' },
  { fullBirthName: 'Diane Ruth Marshall', dateOfBirth: '1967-09-02', firstName: 'Diane' });
// Her twelve were laid by hand, so the seeded deal is swapped for the hand deal on this run only.
const handDeal = (items) => {
  const j = items[0].json;
  j.deal = j.deal.map((d, i) => ({ ...d, card: DIANE_TWELVE[i], card_name: SPEC.cards[DIANE_TWELVE[i]].name }));
  return items;
};
const NODE3 = '3 · Numbers, answers, the deal';
const SECTIONS = (k) => gold[k];
const dianeRun = (over = {}) => {
  const fake = fakeOpenAI({ sections: SECTIONS, ...over });
  const r = execute(dianeWf(), { start: START, http: fake.http, patch: { [NODE3]: handDeal } });
  return { ...r, calls: fake.calls };
};

const A = dianeRun();
const m = A.last('6 ·').metrics;
const v = A.last('7a ·').verdict;
const html = A.last('10 ·').html;

// ── regenerate: the grader fails the first draft ──────────────────────────────
const R = dianeRun({ verdicts: [fakeVerdict(false), fakeVerdict(true)] });
const acts4a = R.runs['4a · Compose the act prompt'];
const promptOf = (run) => run[0][0].json.prompt;
const attempts = (node) => node.map((run) => run[0][0].json.attempt);
const drafts = { first: 'FIRSTDRAFTMARKER' };
// Second regenerate run: first-draft text must not reach the second attempt's prompts.
let round = 0;
const R2 = (() => {
  const fake = fakeOpenAI({
    sections: (k) => (round === 0 ? `${gold[k]}\n\n${drafts.first}` : gold[k]),
    verdicts: [fakeVerdict(false), fakeVerdict(true)],
    onAct: ({ calls }) => { round = calls.filter((c) => c.schema === 'verdict').length; return null; },
  });
  const r = execute(dianeWf(), { start: START, http: fake.http, patch: { [NODE3]: handDeal } });
  return { ...r, calls: fake.calls };
})();

// ── a format failure on the second act, once ──────────────────────────────────
let spoiled = 0;
const F = dianeRun({ onAct: ({ marks }) => {
  if (marks[0] === '[CARD 4]' && !spoiled) { spoiled += 1; return replyOf('Here is the next part of your reading.'); }
  return null; } });

// ── two bad drafts: logs nothing in the test drive, ships anyway (02's rule) ──
const T = dianeRun({ verdicts: [fakeVerdict(false), fakeVerdict(false)] });

const expectThrow = (fn, re) => { try { fn(); return { ok: false, note: 'it did not stop' }; }
  catch (e) { return { ok: re.test(e.message), note: `${e.node || ''}: ${e.message.slice(0, 100)}` }; } };

const fixtureCards = (wf) => {
  const fake = fakeOpenAI({ sections: SECTIONS, verdicts: [fakeVerdict(), fakeVerdict()] });
  return execute(wf, { start: START, http: fake.http });
};
const hard = (x) => (x.failed || []);

if (show) {
  console.log('metrics', JSON.stringify({ ...m, repeated_8grams: m.repeated_8grams.length }, null, 1));
  console.log('verdict', JSON.stringify(v, null, 1));
}
const bad = report('11 · the chain, faked outside calls, real nodes and wiring', [
  ['THE GOLD READING (Diane) THROUGH THE REAL MEASURES', [
    ['it reassembles in order and all sections arrive', () => A.last('6 ·').sections.close.includes("It's back")],
    ['word count sits inside the contract', () => ({ ok: m.words >= SPEC.floor_words && m.words <= SPEC.ceiling_words, note: `${m.words} words` })],
    ['letter length sits inside the contract', () => ({ ok: m.letter_words >= 400 && m.letter_words <= 600, note: `${m.letter_words} words` })],
    ['a gold reading passes every hard check', () => ({ ok: v.pass === true, note: v.pass ? `reading grade ${m.reading_grade}, contractions ${m.contraction_share}` : `${v.why}` })],
    ['no list a human should have to judge is noisy', () => {
      const noisy = ['therapy', 'british', 'contact', 'turn_up'].filter((k) => m[k].length > 3);
      return { ok: !noisy.length, note: noisy.map((k) => `${k} ${m[k].length}`).join(', ') || `${m.therapy.length + m.british.length + m.contact.length + m.turn_up.length} candidates` }; }],
    ['the five bolds land where they belong', () => ({ ok: m.bold.length === 5 && m.bold.map((b) => b.section).join() === '1,9,10,12,12', note: m.bold.map((b) => b.section).join() })],
  ]],
  ['THE WRITING LOOP', [
    ['story plan first, then five act calls, then one grade', () => {
      const seq = A.calls.map((c) => c.schema || 'act').join(' ');
      return { ok: seq === 'story_plan act act act act act verdict', note: seq }; }],
    ['each act is handed everything before it', () => {
      const p = A.runs['4a · Compose the act prompt'].map(promptOf);
      return p[0].includes('Nothing is written yet') && !p[0].includes('[CARD')  === false
        && p[1].includes(gold[3].slice(0, 80)) && p[2].includes(gold[6].slice(0, 80))
        && p[3].includes(gold[1].slice(0, 80)) && p[4].includes(gold[12].slice(0, 80)); }],
    ['the system block is byte-identical on plan and every act, so it can cache', () => {
      const sys = new Set(A.calls.filter((c) => c.schema !== 'verdict').map((c) => c.body.messages[0].content));
      return { ok: sys.size === 1, note: `${[...sys][0].length} characters` }; }],
    ['the deal printed on each prompt matches the deal', () => A.runs['4a · Compose the act prompt'].map(promptOf)
      .every((p) => DIANE_TWELVE.every((c) => p.includes(SPEC.cards[c].name)))],
  ]],
  ['REGENERATE, SAME CARDS', [
    ['a failed first draft writes the whole thing again', () => ({ ok: R.calls.filter((c) => !c.schema).length === 10, note: `${R.calls.length} calls` })],
    ['attempt 2 sees only attempt 2', () => {
      const second = R2.runs['4a · Compose the act prompt'].slice(5).map(promptOf);
      return second.length === 5 && second.every((p) => !p.includes(drafts.first)); }],
    ['attempt 2 still sees its own earlier acts', () => promptOf(acts4a[9]).includes(gold[12].slice(0, 80))],
    ['the loop resets, so no act is skipped', () => attempts(acts4a).join() === '1,1,1,1,1,2,2,2,2,2'],
    ['the deal is untouched', () => JSON.stringify(R.last('7a ·').deal) === JSON.stringify(A.last('7a ·').deal)],
    ['node 3 runs only once', () => R.runs[NODE3].length === 1],
    ['two failures ship anyway rather than strand a paying buyer', () => T.last('10 ·')?.html?.length > 1000 && T.calls.filter((c) => c.schema === 'verdict').length === 2],
  ]],
  ['FAILURES', [
    ['a broken act format retries once and carries on', () => F.runs['4s · Retry the act once']?.length === 1
      && F.last('10 ·')?.html?.length > 1000],
    ['the retry does not lose its place: act 3 still sees act 2', () => promptOf(F.runs['4a · Compose the act prompt'][2]).includes(gold[6].slice(0, 80))],
    ['a refusal stops the run, no retry', () => expectThrow(() => dianeRun({ onAct: () => ({ choices: [{ finish_reason: 'content_filter', message: { content: '' } }] }) }), /declined/)],
    ['a broken act twice stops the run', () => expectThrow(() => dianeRun({ onAct: () => replyOf('no markers') }), /FORMAT/)],
    ['hitting the token ceiling never ships half a reading', () => expectThrow(() => dianeRun({ onAct: () => replyOf('[OPENING]\nhalf', 'length') }), /ceiling/)],
    ['a grader that returns junk fails open, loudly', () => { const x = dianeRun({ verdicts: ['not json'] }).last('7a ·').verdict;
      return { ok: x.pass === true && /^UNGRADED/.test(x.why), note: x.why }; }],
    ['a green grade cannot beat the measures', () => {
      const fake = fakeOpenAI({ sections: (k) => (k === 'close' ? 'The chair was a chair.' : gold[k]), verdicts: [fakeVerdict(), fakeVerdict()] });
      const r = execute(dianeWf(), { start: START, http: fake.http, patch: { [NODE3]: handDeal } });
      const f = r.last('7a ·').verdict;
      return { ok: f.pass === false && hard(f).includes(6), note: f.why }; }],
    ['banned words are caught', () => {
      const fake = fakeOpenAI({ sections: (k) => (k === '5' ? `${gold[k]}\n\nThe universe wants this. It may help.` : gold[k]), verdicts: [fakeVerdict(), fakeVerdict()] });
      const r = execute(dianeWf(), { start: START, http: fake.http, patch: { [NODE3]: handDeal } });
      return { ok: r.last('7a ·').metrics.banned.length === 2, note: `${r.last('7a ·').metrics.banned.length} hits` }; }],
    ['numerology words are caught', () => {
      const fake = fakeOpenAI({ sections: (k) => (k === '5' ? `${gold[k]}\n\nYour life path told me.` : gold[k]), verdicts: [fakeVerdict(), fakeVerdict()] });
      const r = execute(dianeWf(), { start: START, http: fake.http, patch: { [NODE3]: handDeal } });
      return r.last('7a ·').verdict.pass === false; }],
    ['a word for the person is caught', () => {
      const fake = fakeOpenAI({ sections: (k) => (k === '5' ? `${gold[k]}\n\nYour ex knows it.` : gold[k]), verdicts: [fakeVerdict(), fakeVerdict()] });
      const r = execute(dianeWf(), { start: START, http: fake.http, patch: { [NODE3]: handDeal } });
      return r.last('7a ·').verdict.pass === false; }],
    ['telling her to contact them is caught', () => {
      const fake = fakeOpenAI({ sections: (k) => (k === '11' ? `${gold[k]}\n\nYou should write to them.` : gold[k]), verdicts: [fakeVerdict(), fakeVerdict()] });
      const r = execute(dianeWf(), { start: START, http: fake.http, patch: { [NODE3]: handDeal } });
      return r.last('7a ·').verdict.pass === false; }],
    ['bump buyer holds at node 10 with a clear reason', () => expectThrow(() => {
      const wf = withFixture(dianeWf(), { metadata: { bump: '1' } });
      const fake = fakeOpenAI({ sections: SECTIONS });
      execute(wf, { start: START, http: fake.http, patch: { [NODE3]: handDeal } });
    }, /^HOLD: this buyer took the bump/)],
    ['no birth name holds at node 3', () => expectThrow(() => {
      const wf = withFixture(dianeWf(), {}, { fullBirthName: '' });
      execute(wf, { start: START, http: fakeOpenAI({ sections: SECTIONS }).http });
    }, /^HOLD: no full_birth_name/)],
  ]],
  ['THE HTML', [
    ['cover, title, all twelve headings, letter and sign-off', () => {
      const need = ['class="cover"', 'Written out for Diane Ruth Marshall', 'The first card: the Fool', 'The twelfth card: Strength',
        'The letter they never sent', "Your friend, even when you'd rather I wasn't,", '&mdash; Evelyn'];
      const miss = need.filter((x) => !html.includes(x)); return miss.length ? { ok: false, note: miss.join(' | ') } : true; }],
    ['twelve card images, from the deal', () => { const imgs = html.match(/<img src="[^"]+"/g) || [];
      return imgs.length === 12 && DIANE_TWELVE.every((c) => html.includes(`tarot-rws/${c}.jpg`)); }],
    ['bold comes through and no stray asterisk survives', () => html.includes('<strong>') && !/\*/.test(html.split('</style>')[1])],
    ['Death is cropped when it lands', () => (SPEC.death_crop ? html.includes('<figure class="crop">') : true)],
    ['the bump page is absent on a no-bump order', () => !html.includes('class="bump">')],
    ['the last line of the reading is the last line before the sign-off', () => /What you do with it is on you\.<\/p>\s*<div class="signoff">/.test(html)],
    ['nothing with a double brace or undefined reaches the page', () => !/undefined|\{\{|\}\}|\[object/.test(html.split('</style>')[1])],
  ]],
  ['THE FIXTURES RUN END TO END', [
    ['get-you-back fixture reaches the HTML', () => fixtureCards(loadWf(GETBACK)).last('10 ·').answers.fork === 'get_back'],
    ['giving fixture reaches the HTML', () => fixtureCards(loadWf(GIVING)).last('10 ·').answers.fork === 'giving'],
  ]],
]);

fs.mkdirSync(RUNS, { recursive: true });
fs.writeFileSync(path.join(RUNS, 'chain-diane.html'), html);
fs.writeFileSync(path.join(RUNS, 'chain-diane-metrics.json'), JSON.stringify({ metrics: m, verdict: v }, null, 2));
process.exit(bad ? 1 : 0);
