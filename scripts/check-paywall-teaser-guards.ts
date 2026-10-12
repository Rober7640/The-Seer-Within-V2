// PREVIEW ONLY — offline proof for the live-safety guards in server/lib/paywallTeaser.ts.
// No API calls, no DB: every model is a mock (failing, slow, or scripted).
//
//   npx tsx scripts/check-paywall-teaser-guards.ts
//
// A. still-see: an API error or a timeout gives the no-lines fallback (never a throw),
//    and the final reply then gets the no-thread PART 2.
// B. fact check: an error or a timeout counts as "no findings" (flagged), never a throw.
// C. the whole chain keeps to its time budget: optional steps are capped or skipped,
//    a failed regeneration ships the draft, a good one ships itself.
// D. Unicode: English matching is unchanged (old vs new normalise on an English corpus,
//    plus the local preview fixture when it exists); Russian / Chinese / Hindi quotes
//    now match her messages.
// E. names that start or end with an accented letter are caught (José, Zoë, Élodie),
//    and a name inside a longer word is not.
// F. the sentence splitter does not split on "Mr." / "Mrs." / "Ms." / "Dr.".
// Exits 1 on any failure.

import fs from 'node:fs';
import path from 'node:path';
import {
  buildFreeTrialFinalReplyNote,
  checkFacts,
  checkStillSeeLines,
  finalReplyShapeViolations,
  generateStillSeeSafe,
  normalise,
  runFactCheckSafe,
  runFinalReplyChain,
  splitSentences,
  validateStillSee,
  type FactCheckCaller,
  type StillSeeCaller,
  type TranscriptTurn,
} from '../server/lib/paywallTeaser';

let fails = 0;
let passes = 0;
function ok(cond: boolean, what: string, detail = '') {
  if (cond) {
    passes++;
    console.log(`  ok   ${what}`);
  } else {
    fails++;
    console.log(`  FAIL ${what}${detail ? ` — ${detail}` : ''}`);
  }
}
const section = (t: string) => console.log(`\n${t}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** A call that never answers unless aborted (then rejects, like the SDK). */
const hang = (signal?: AbortSignal) =>
  new Promise<never>((_, reject) => signal?.addEventListener('abort', () => reject(new Error('aborted'))));

const PERSONA = 'Evelyn Cross';
const TURNS: TranscriptTurn[] = [
  { role: 'assistant', content: 'Hello love, I am Evelyn. What brings you here tonight?' },
  { role: 'user', content: 'My ex keeps texting me after he left, and I miss my old job at the bakery.' },
  { role: 'assistant', content: 'I see the pull between you. Tell me more.' },
  { role: 'user', content: 'Will he come back?' },
];
const GOOD_STILL_SEE = {
  her_facts: [{ fact: 'her ex keeps texting her after he left', quote: 'My ex keeps texting me' }],
  known_before: [],
  lines: [
    { line: 'Why your ex keeps texting you', source: 'her_words', quote: 'My ex keeps texting me', basis: 'her ex keeps texting' },
    { line: 'What the old bakery job gave you', source: 'her_words', quote: 'my old job at the bakery', basis: 'misses her old job' },
  ],
};
const NO_THREAD_MARK = 'Name the next, deeper layer of the question she brought';
const THREAD_MARK = 'It points ahead to this still-unread part of her story';
const CLEAN_REPLY = 'He keeps reaching for you because the door still feels open to him.\n\nWhat I have not read for you yet is why your ex keeps texting you after leaving.';
const BAD_REPLY = 'Will he come back? I feel he will.\n\nWhy he texts.';

// ── A. still-see ────────────────────────────────────────────────────────────
section('A. still-see falls back instead of failing');
{
  const throwing: StillSeeCaller = async () => {
    throw new Error('529 overloaded');
  };
  const r = await generateStillSeeSafe(throwing, TURNS, PERSONA);
  ok(r.lines === null, 'API error → lines null (fallback)');
  ok(r.failure?.kind === 'error' && /overloaded/.test(r.failure.message), 'API error recorded', JSON.stringify(r.failure));
  ok(r.facts.hers.length === 0 && r.facts.knownBefore.length === 0, 'API error → no facts');

  let aborted = false;
  const slow: StillSeeCaller = async (_req, o) => {
    o?.signal?.addEventListener('abort', () => (aborted = true));
    return hang(o?.signal);
  };
  const t0 = Date.now();
  const r2 = await generateStillSeeSafe(slow, TURNS, PERSONA, { timeoutMs: 80 });
  const took = Date.now() - t0;
  ok(r2.lines === null && r2.failure?.kind === 'timeout', 'slow API → timeout fallback', JSON.stringify(r2.failure));
  ok(took < 500, `timeout returns promptly (${took} ms for an 80 ms limit)`);
  ok(aborted, 'the slow call was told to stop (AbortSignal fired)');

  // A slow-but-not-hung first attempt that then fails validation: the retry must not
  // run past the timeout either.
  let calls = 0;
  const slowBad: StillSeeCaller = async (_req, o) => {
    calls++;
    await sleep(60);
    if (o?.signal?.aborted) throw new Error('aborted');
    return { json: { her_facts: [], known_before: [], lines: [{ line: 'x?', source: 'her_words', quote: 'nope', basis: '' }] }, ms: 60 };
  };
  const r3 = await generateStillSeeSafe(slowBad, TURNS, PERSONA, { timeoutMs: 90 });
  ok(r3.lines === null && r3.failure?.kind === 'timeout', 'timeout during the retry → fallback', `calls=${calls} ${JSON.stringify(r3.failure)}`);

  const good: StillSeeCaller = async () => ({ json: GOOD_STILL_SEE, ms: 5 });
  const r4 = await generateStillSeeSafe(good, TURNS, PERSONA);
  ok(r4.failure === null && r4.lines?.length === 2, 'a good answer still comes through', JSON.stringify(r4.attempts.map((a) => a.violations)));

  // The final reply note with no thread is the no-thread PART 2.
  const note = buildFreeTrialFinalReplyNote(null, r.facts);
  ok(note.includes(NO_THREAD_MARK) && !note.includes(THREAD_MARK), 'fallback → no-thread PART 2 in the final reply note');
}

// ── B. fact check ───────────────────────────────────────────────────────────
section('B. fact check fails open (no findings, flagged) instead of failing');
{
  const facts = { hers: [], knownBefore: [] };
  const throwing: FactCheckCaller = async () => {
    throw new Error('refusal');
  };
  const r = await runFactCheckSafe(throwing, CLEAN_REPLY, TURNS, facts, PERSONA, 'Ana');
  ok(r.failure?.kind === 'error' && r.invented.length === 0 && r.advice.length === 0, 'API error → no findings, flagged', JSON.stringify(r));
  const slow: FactCheckCaller = async (_req, o) => hang(o?.signal);
  const t0 = Date.now();
  const r2 = await runFactCheckSafe(slow, CLEAN_REPLY, TURNS, facts, PERSONA, 'Ana', { timeoutMs: 60 });
  ok(r2.failure?.kind === 'timeout' && Date.now() - t0 < 500, 'slow API → timeout, prompt', JSON.stringify(r2.failure));
  const garbage: FactCheckCaller = async () => ({ json: { invented: 'not a list' } });
  const r3 = await runFactCheckSafe(garbage, CLEAN_REPLY, TURNS, facts, PERSONA, 'Ana');
  ok(r3.failure === null && r3.invented.length === 0, 'malformed answer → empty lists, no throw');
}

// ── C. the chain under one budget ──────────────────────────────────────────
section('C. the whole chain keeps to its budget and always returns her reply');
{
  const cleanCheck: FactCheckCaller = async () => ({ json: { invented: [], advice: [] } });
  const inventedCheck: FactCheckCaller = async (req) =>
    req.user.includes('<reply>\n' + BAD_REPLY) || req.user.includes('Will he come back?\nI feel')
      ? { json: { invented: [{ words: 'I feel he will', why: 'prediction' }], advice: [] } }
      : { json: { invented: [], advice: [] } };

  // C1: still-see throws → no-thread PART 2, draft ships.
  {
    const suffixes: string[] = [];
    const r = await runFinalReplyChain(
      {
        callStillSee: async () => {
          throw new Error('500');
        },
        callFactCheck: cleanCheck,
        writeReply: async ({ systemSuffix }) => {
          suffixes.push(systemSuffix);
          return CLEAN_REPLY;
        },
      },
      { turns: TURNS, personaName: PERSONA, clientFirstName: 'Ana' },
    );
    ok(r.thread === null && r.stillSee.lines === null, 'C1 still-see error → no thread');
    ok(suffixes[0].includes(NO_THREAD_MARK) && !suffixes[0].includes(THREAD_MARK), 'C1 final reply got the no-thread PART 2');
    ok(r.shipped === 'draft' && r.text === CLEAN_REPLY, 'C1 her reply still ships');
    ok(r.skipped.some((x) => x.startsWith('still-see (error')), 'C1 the fallback is named in skipped', JSON.stringify(r.skipped));
  }
  // C2: still-see hangs → capped by its timeout; the reply is not held up past it.
  {
    const t0 = Date.now();
    const r = await runFinalReplyChain(
      {
        callStillSee: async (_req, o) => hang(o?.signal),
        callFactCheck: cleanCheck,
        writeReply: async () => CLEAN_REPLY,
      },
      { turns: TURNS, personaName: PERSONA },
      { stillSeeTimeoutMs: 100 },
    );
    const took = Date.now() - t0;
    ok(r.stillSee.failure?.kind === 'timeout' && r.thread === null, 'C2 hung still-see → timeout fallback');
    ok(took < 600, `C2 chain done in ${took} ms with a 100 ms still-see limit`);
  }
  // C3: still-see is capped by the BUDGET (budget − draft reserve), not only its own limit.
  {
    let t = 0;
    const now = () => t;
    let stillSeeLimit = -1;
    const r = await runFinalReplyChain(
      {
        callStillSee: async (_req, o) => {
          // read the limit off the abort timing: advance fake time, then hang until aborted
          const start = Date.now();
          await hang(o?.signal).catch(() => {});
          stillSeeLimit = Date.now() - start;
          throw new Error('aborted');
        },
        callFactCheck: async () => {
          t += 100_000; // the fact check "takes" far longer than the budget
          return { json: { invented: [], advice: [] } };
        },
        writeReply: async () => BAD_REPLY,
      },
      { turns: TURNS, personaName: PERSONA },
      { budgetMs: 8_150, stillSeeTimeoutMs: 5_000, now },
    );
    ok(stillSeeLimit >= 0 && stillSeeLimit < 1_000, `C3 still-see capped at budget − reserve (~150 ms, took ${stillSeeLimit} ms)`);
    ok(r.shipped === 'draft' && r.regen === null, 'C3 budget spent → no regeneration, draft ships');
    ok(r.skipped.some((x) => x.startsWith('regeneration (no time left)')), 'C3 regeneration skip is named', JSON.stringify(r.skipped));
  }
  // C4: draft has problems, regeneration is clean → regeneration ships, told what broke.
  {
    const notes: (string | null)[] = [];
    const r = await runFinalReplyChain(
      {
        callStillSee: async () => ({ json: GOOD_STILL_SEE, ms: 5 }),
        callFactCheck: inventedCheck,
        writeReply: async ({ retryNote }) => {
          notes.push(retryNote);
          return retryNote ? CLEAN_REPLY : BAD_REPLY;
        },
      },
      { turns: TURNS, personaName: PERSONA, forbiddenNames: ['Ana'] },
    );
    ok(r.thread?.line === 'Why your ex keeps texting you', 'C4 line 1 is the thread', JSON.stringify(r.thread));
    ok(r.systemSuffix.includes(THREAD_MARK) && r.systemSuffix.includes('Why your ex keeps texting you'), 'C4 thread reached the final reply note');
    ok(r.shipped === 'regen' && r.text === CLEAN_REPLY, 'C4 clean regeneration ships');
    ok(!!notes[1] && notes[1]!.includes('question mark') && notes[1]!.includes('I feel he will'), 'C4 regeneration told the shape + fact problems', notes[1] ?? '');
  }
  // C5: regeneration throws → the draft ships, the reply never fails.
  {
    const r = await runFinalReplyChain(
      {
        callStillSee: async () => ({ json: GOOD_STILL_SEE, ms: 5 }),
        callFactCheck: cleanCheck,
        writeReply: async ({ retryNote }) => {
          if (retryNote) throw new Error('overloaded');
          return BAD_REPLY;
        },
      },
      { turns: TURNS, personaName: PERSONA },
    );
    ok(r.shipped === 'draft' && r.text === BAD_REPLY && r.skipped.some((x) => x.startsWith('regeneration (error')), 'C5 failed regeneration → draft ships', JSON.stringify(r.skipped));
  }
  // C6: regeneration hangs → timed out by the remaining budget, draft ships.
  {
    const t0 = Date.now();
    const r = await runFinalReplyChain(
      {
        callStillSee: async () => ({ json: GOOD_STILL_SEE, ms: 5 }),
        callFactCheck: cleanCheck,
        writeReply: async ({ retryNote, signal }) => (retryNote ? hang(signal) : BAD_REPLY),
      },
      { turns: TURNS, personaName: PERSONA },
      { budgetMs: 4_300 },
    );
    const took = Date.now() - t0;
    ok(r.shipped === 'draft' && r.skipped.some((x) => x.startsWith('regeneration (timeout')), 'C6 hung regeneration → timeout, draft ships', JSON.stringify(r.skipped));
    ok(took < 4_800, `C6 chain finished inside its 4.3 s budget (${took} ms)`);
  }
  // C7: fact check fails on the draft → judged on shape only; a clean-shaped draft ships.
  {
    const r = await runFinalReplyChain(
      {
        callStillSee: async () => ({ json: GOOD_STILL_SEE, ms: 5 }),
        callFactCheck: async () => {
          throw new Error('timeout upstream');
        },
        writeReply: async () => CLEAN_REPLY,
      },
      { turns: TURNS, personaName: PERSONA },
    );
    ok(r.shipped === 'draft' && r.regen === null && r.draft.check?.failure?.kind === 'error', 'C7 fact-check error → clean draft ships, failure kept');
  }
}

// ── D. Unicode matching ─────────────────────────────────────────────────────
section('D. normalise: English unchanged, non-Latin quotes now match');
{
  // The pre-fix function, verbatim.
  const oldNormalise = (s: string) =>
    s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9À-ɏ' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const english = [
    "My ex keeps texting me — after he LEFT, he said “we'll see”…",
    "I don't know if he's the one; it's been 3 years (since 2021).",
    'Café owner, naïve, résumé, Zoë, José — accents stay.',
    "Why's he so cold?! I'm tired 😢 #help @evelyn",
    "    spaces   and\ttabs\nand newlines   ",
    "What I haven't read for you yet is why the silence hurts.",
    'He said: "I need space." I said: \'fine\'.',
    "Mr. Smith, Mrs. Jones & Dr. Lee — 50% off, $20/month, 9:30pm.",
    'she wrote “i miss him” and ‘he left’ and `again`',
  ];
  // Plus every English string in the local preview fixture, when present (git-ignored;
  // anonymised real chats). Only the count is printed.
  const fixture = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../client/src/components/paywall/preview-samples.local.json');
  const corpus = [...english];
  if (fs.existsSync(fixture)) {
    const walk = (v: unknown): void => {
      if (typeof v === 'string') corpus.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(JSON.parse(fs.readFileSync(fixture, 'utf8')));
  }
  // Strings in Latin script only (what "English matching" covers).
  const latin = corpus.filter((s) => !/[Ͱ-῿⺀-￿]/.test(s.replace(/[ -⁯₠-⃏←-⏿☀-➿]/g, '').replace(/[\u{1f000}-\u{1faff}]/gu, '')));
  const differ = latin.filter((s) => oldNormalise(s) !== normalise(s));
  ok(differ.length === 0, `old and new normalise agree on all ${latin.length} English strings (${english.length} built-in + ${latin.length - english.length} from the local fixture)`, // On a failure, name built-in strings only: the fixture holds (anonymised) real chats.
    differ.map((s) => (english.includes(s) ? JSON.stringify(s.slice(0, 50)) : `fixture string #${corpus.indexOf(s)}`)).slice(0, 5).join(', '));

  const cases: { lang: string; her: string; quote: string }[] = [
    { lang: 'Russian', her: 'Мой бывший снова пишет мне, а я скучаю по работе.', quote: 'Мой бывший снова пишет' },
    { lang: 'Chinese', her: '我的前男友一直给我发短信，我很想念他。', quote: '前男友一直给我发短信' },
    { lang: 'Hindi', her: 'मेरा पूर्व प्रेमी मुझे संदेश भेजता रहता है।', quote: 'पूर्व प्रेमी मुझे संदेश' },
  ];
  for (const c of cases) {
    const turns: TranscriptTurn[] = [
      { role: 'assistant', content: 'Hello love.' },
      { role: 'user', content: c.her },
    ];
    const lines = [{ line: 'Why your ex keeps writing to you', source: 'her_words' as const, quote: c.quote, basis: 'her ex keeps writing' }];
    const vNew = validateStillSee(lines, turns).filter((x) => /quote/.test(x));
    const herOld = oldNormalise(c.her);
    const qOld = oldNormalise(c.quote);
    const oldFailed = !qOld || !herOld.includes(qOld);
    ok(vNew.length === 0, `${c.lang} quote matches her message now`, vNew.join('; '));
    ok(oldFailed, `${c.lang} quote did NOT match before the fix (old normalise → ${JSON.stringify(qOld)})`);
    const facts = checkFacts({ her_facts: [{ fact: 'her ex keeps writing', quote: c.quote }], known_before: [] }, turns);
    ok(facts.facts.hers.length === 1 && facts.dropped.length === 0, `${c.lang} fact kept by checkFacts`);
  }
  // A made-up quote in Russian is still caught.
  const bad = validateStillSee(
    [{ line: 'Why your ex keeps writing to you', source: 'her_words', quote: 'Совсем другие слова', basis: 'x' }],
    [{ role: 'user', content: 'Мой бывший снова пишет мне.' }],
  );
  ok(bad.some((x) => /quote is not in her messages/.test(x)), 'a quote she never wrote (Russian) is still caught');
}

// ── E. names ────────────────────────────────────────────────────────────────
section('E. names with accented first/last letters');
{
  const caught = (line: string, name: string) => checkStillSeeLines([line], { forbiddenNames: [name] }).includes('line 1: contains a name');
  // The pre-fix test, verbatim: ASCII \b boundaries.
  const oldCaught = (line: string, name: string) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line);
  ok(!oldCaught('Why José keeps calling you', 'José') && !oldCaught('What Élodie wants from you', 'Élodie'), 'before the fix: José and Élodie were NOT caught');
  ok(caught('Why José keeps calling you', 'José'), 'José (ends accented)');
  ok(caught('Why ZOË pulls away', 'Zoë'), 'Zoë in capitals (ends accented)');
  ok(caught('What Élodie wants from you', 'Élodie'), 'Élodie (starts accented)');
  ok(caught('Why Óscar left', 'Óscar'), 'Óscar (starts accented)');
  ok(caught('Why José keeps calling', 'José'), 'José typed with a combining accent (NFC)');
  ok(caught('Why Mark keeps calling', 'Mark'), 'plain English name still caught');
  ok(!caught('Why Joséphine keeps calling', 'José'), 'no false hit inside a longer name (Joséphine)');
  ok(!caught('What your annual review means', 'Ann'), 'no false hit inside a word (annual / Ann)');
  ok(!caught('Why Markéta keeps calling', 'Mark'), 'no false hit before an accented letter (Markéta / Mark)');
}

// ── F. sentence splitter ────────────────────────────────────────────────────
section('F. sentence splitter and titles');
{
  const one = [
    'What I have not read for you yet is what Mr. Hale’s silence is doing to you.',
    'What I have not read for you yet is why Mrs. Grey still matters so much to you.',
    'I have not yet read what Dr. Patel’s words stirred up in you about your body.',
    'What I have not read for you yet is how Ms. Reed changed the way you trust.',
  ];
  for (const p of one) {
    ok(splitSentences(p).length === 1, `one sentence: "${p.slice(0, 48)}…"`, JSON.stringify(splitSentences(p)));
    const v = finalReplyShapeViolations(`Part one answers her.\n\n${p}`);
    ok(!v.some((x) => /sentences, not one/.test(x)), 'shape check does not flag it as two sentences', v.join('; '));
  }
  // The pre-fix splitter, verbatim.
  const oldSplit = (x: string) => x.split(/(?<=[.!…])["'”’)]*\s+(?=\S)/).filter((y) => /\w/.test(y));
  ok(one.every((p) => oldSplit(p).length === 2), 'before the fix: each of these was split in two at the title');
  ok(splitSentences('He left. She stayed.').length === 2, 'two real sentences still split');
  ok(splitSentences('He said "go." Then he left!').length === 2, 'split after a closing quote still works');
  const two = finalReplyShapeViolations('Part one.\n\nWhat I have not read yet is your mother. And your father too, love.');
  ok(two.some((x) => /2 sentences/.test(x)), 'a real two-sentence PART 2 is still flagged', two.join('; '));
  ok(splitSentences('Он ушёл. Она осталась.').length === 2, 'non-Latin sentences are kept (not filtered out)');
}

console.log(`\n${passes} passed, ${fails} failed`);
console.log(fails ? 'FAILURES' : 'ALL CHECKS PASS');
process.exit(fails ? 1 : 0);
