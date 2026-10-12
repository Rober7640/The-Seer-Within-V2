/**
 * Paywall long-copy test ("updated test 1") — PREVIEW ONLY.
 *
 * Two AI pieces for clients who have NEVER bought, written as pure functions so
 * they can be unit-tested and run against real transcripts before anything ships:
 *
 *   (a) The free-trial meter — buildFreeTrialMeterLine replaces
 *       buildMinutesMeterLine (minutesMeter.ts) for a never-bought client. Today
 *       every wallet, the free trial included, gets WIND_DOWN_INSTRUCTION in the
 *       last 60s, and Evelyn's own prompt starts its WIND-DOWN when the meter reads
 *       2 minutes or less — so a 3:00 trial spends most of its time closing the
 *       reading, and the paywall lands right after a practice and a goodbye.
 *       Operator decision (2026-10): no wrap-up at all for a never-bought client.
 *       From 3:00 down to the final reply she just keeps reading; the final reply
 *       answers her last message and then names ONE unread part of her story.
 *
 *   (b) "What I still see for you" — up to three short lines on the first-timer
 *       paywall, taken from her transcript. Generated FIRST; line 1 is then handed
 *       to the final reply as the thread its last sentence names, so the chat's
 *       last sentence and the paywall's first line say the same thing. A thin chat
 *       gives fewer lines (two, one or none — none = the paywall's own line).
 *
 *   Round 6 guards on the final reply (preview 2026-10-12):
 *     - the still-see call also returns HER FACTS + KNOWN BEFORE lists (quotes
 *       checked in code); the final reply may state only those as facts about her;
 *     - finalReplyShapeViolations: PART 2 must be one full sentence (≥ 8 words, no
 *       question-word opener), no question mark, ≤ 110 words;
 *     - buildFactCheckRequest: a short check call that lists invented details and
 *       advice-for-later (it sees the chat, her first name and the facts lists).
 *     Either guard failing → ONE regeneration told what broke (buildFinalReplyRetryNote),
 *     checked the same way; whichever of the two has fewer problems ships.
 *
 * Prompt rule for this file: no quoted example sentences. A quoted example gets
 * copied nearly word for word (seen in 11 of 12 outputs in another project), so
 * every rule describes the move instead of showing a sample of it.
 *
 * NOT imported by any live code path. Wiring it in (an isFreeTrial flag on the
 * meter, the paywall fetch, and the first paid reply picking up line one) is a
 * separate, reviewed change.
 */
import { WIND_DOWN_SECONDS } from './minutesMeter';

// ── (a) Free-trial meter + final reply ──────────────────────────────────────

/**
 * Meter-line pointer for the final free minute. The rules themselves go at the
 * END of the system prompt (buildFreeTrialFinalReplyNote): placed only in RIGHT
 * NOW, near the top of a ~35k-char persona prompt, they lost to the prompt's own
 * later rules in 9 of 10 real chats (preview round 2).
 */
export const FREE_TRIAL_TEASER_INSTRUCTION =
  ' This is her last reply before her trial time ends — do NOT run the WIND-DOWN; follow FINAL REPLY at the very end of these instructions.';

/**
 * Meter-line instruction for a never-bought client with 61–179 s left (the meter
 * reads "about 1/2 minutes"). Evelyn's prompt (THE SESSION ARC) starts its
 * WIND-DOWN — synthesis, takeaway, next opening — whenever the meter reads 2
 * minutes or less; for a 3:00 trial that is every reply after the first. This
 * switches that rule off by name for the free trial.
 */
export const FREE_TRIAL_KEEP_READING_INSTRUCTION =
  ' She has never bought minutes: this is her free trial. For her, the WIND-DOWN in THE SESSION ARC does NOT start at 2 minutes or less — it stays switched off until a reply is marked as her final one. Keep reading exactly as you would with plenty of time: go deeper into what she brought, and ask a question if it serves the reading. In this reply there is no synthesis of the session, no takeaway, practice or step for her to keep, no warm send-off or praise, and nothing about time.';

/**
 * End-of-system-prompt note for a never-bought client with 61–179 s left. Preview
 * round 5a: the meter-line instruction ALONE cut wrap-ups only from 5 to 4 of 9 —
 * the prompt's own later rules (THE OPENING's "one thing to do", CLEAN CLOSE) won,
 * the same way the final-reply rule lost when it lived only in RIGHT NOW (round 2).
 */
export const FREE_TRIAL_KEEP_READING_NOTE = [
  '## FREE TRIAL — KEEP READING (this reply only)',
  'This client has never bought minutes and is still inside her free trial. For her, the minutes number in RIGHT NOW starts no wind-down. For this reply this section overrides the WIND-DOWN in THE SESSION ARC, the practice inside THE OPENING, the CLEAN CLOSE default, and ending big moments on empowerment.',
  'Keep reading the way you would if she had an hour: stay with what she just brought and go one layer deeper. A question that serves the reading is welcome, including as your last line.',
  'Give her nothing to take away yet. In this reply there is no practice, exercise, ritual, step or instruction — nothing for tonight or this week, nothing to watch for or notice — no summary of what the session has shown, no takeaway line, no praise for her courage, and no warm send-off. If THE OPENING comes up, name what is shifting, never what she should do about it.',
  'Say nothing about time or minutes.',
].join('\n');

/**
 * Free-trial version of buildMinutesMeterLine (same signature + same "minutes
 * remaining" wording, so the prompt's RIGHT NOW section reads identically).
 * Use ONLY when the client has never completed a purchase.
 */
export function buildFreeTrialMeterLine(spendableCoins: number, coinsPerMinute: number): string {
  const cpm = Math.max(1, coinsPerMinute);
  const secondsLeft = Math.max(0, Math.floor((spendableCoins * 60) / cpm));
  const wholeMinutes = Math.floor(secondsLeft / 60);
  const remaining = secondsLeft >= 60
    ? `about ${wholeMinutes} minute${wholeMinutes === 1 ? '' : 's'}`
    : 'less than a minute';

  let instruction = '';
  if (secondsLeft <= WIND_DOWN_SECONDS) instruction = FREE_TRIAL_TEASER_INSTRUCTION;
  else if (wholeMinutes <= 2) instruction = FREE_TRIAL_KEEP_READING_INSTRUCTION;
  return `\nClient minutes remaining: ${remaining}.${instruction}`;
}

/** The still-see line the final reply must name (line 1 of the paywall). */
export interface FinalReplyThread {
  line: string;
  basis: string;
  source: StillSeeSource;
}

/** One fact about her life, with the exact words it rests on (checked in code). */
export interface HerFact {
  fact: string;
  quote: string;
}

/**
 * Round 6: what the final reply may state as fact about her life. `hers` = what
 * she wrote in this chat; `knownBefore` = plain facts the guide's messages treat as
 * known from before this chat (usable, never as her words). Built by the still-see
 * call (same request, no extra round trip); every quote is checked in code and a
 * fact whose quote is not found is dropped.
 */
export interface HerFacts {
  hers: HerFact[];
  knownBefore: HerFact[];
}

const FINAL_REPLY_HEADER = [
  '## FINAL REPLY — THIS REPLY ONLY',
  'For this one reply this section overrides: the WIND-DOWN and the rest of THE SESSION ARC, both shapes in THE THREAD, the practice inside THE OPENING, ending big moments on empowerment, and the one-question allowance.',
  'This client has never paid, and her free time ends with this reply. It has exactly two parts and is 110 words or fewer in total — count them. It is shorter than your usual replies, never longer.',
  'PART 1 — ANSWER (two to four sentences). Answer her last message plainly, in your own voice, and hold back no part of what she asked. If her last message gives you nothing new to read, answer it in one or two sentences and do not start a fresh reading. If it only thanks you, agrees, or says she will try, take it in with one plain sentence — no reassurance, praise, encouragement, belief in her, or anything for her to keep doing. PART 1 points nowhere ahead: nothing in it says more is worth reading or still to come.',
];

/** Round 6: the facts lists, rendered into the FINAL REPLY note. Her exact words
 *  sit next to each of her facts so the reply can echo them without upgrading them. */
function renderFactsBlock(facts: HerFacts | null): string[] {
  const hers = facts?.hers ?? [];
  const before = facts?.knownBefore ?? [];
  return [
    'HER FACTS — what she wrote in THIS chat. These, and the KNOWN BEFORE list below, are the only facts about her life you may state:',
    ...(hers.length ? hers.map((f) => `- ${f.fact.trim()} (her words: "${f.quote.trim()}")`) : ['- (nothing beyond her question)']),
    'KNOWN BEFORE THIS CHAT — from your greeting, not from her messages today. You may use these, but never as something she said, told, mentioned or shared:',
    ...(before.length ? before.map((f) => `- ${f.fact.trim()}`) : ['- (none)']),
  ];
}

const FINAL_REPLY_RULES = [
  'FACTS — in both parts:',
  '- State as a fact about her life, or about the people in it, only what the two lists above hold. Everything else you say about her is your reading of what you see — never a new person, relationship, job detail, place, event or fact.',
  '- Where her facts leave something out — who, why, where, what kind, how much, how long — leave it out too. Never fill the gap with a likely explanation.',
  '- What you guessed or read earlier in this chat is your reading, not her fact: never present it as something that happened to her.',
  '- Only what she wrote in THIS chat may be presented as her own words (said, told, mentioned, shared, wrote).',
  '- Use her facts exactly as given. Never upgrade them: not her relationship status, not how many people, not how long, not how much.',
  '- Bring in no person who is not in the two lists above — not as the cause of her pattern, not as someone from her past who shaped her, not as a type of person she keeps meeting.',
  '- Your reading may be stated flatly, including what a pattern like hers tends to lead to. Never promise a reunion or a return, and never give dates or timing.',
  'NEVER in this reply:',
  '- a question of any kind: every sentence is a statement, with no question mark anywhere — not even a rhetorical fragment inside PART 1.',
  '- a request for anything: a name, a birth date, a detail, more information.',
  '- a practice or step, advice for her to follow later, something to watch for, a summary of the session, a takeaway to keep, a goodbye, praise for her courage or effort, a blessing, or any other closing warmth.',
  '- time, minutes, the clock, paying for this chat, a trial, or anything being free. (Her own money worries are part of her story and are fine.)',
  '- dates or timing, a reunion or return, or any hint that more will become clear later or that she should come back.',
  'The reply ends on the PART 2 sentence. Nothing follows it.',
];

/** Shape rule shared by both PART 2 versions (round 6: a heading or half-sentence
 *  slipped through in round 5; the code check below backs this up). */
const PART2_SHAPE =
  'Write PART 2 as one complete sentence that you, the speaker, say to her — with its own subject and verb, at least eight words, ending in a full stop. It never opens with a question word and never stands as a bare heading or topic.';

/**
 * Appended to the end of the system prompt for the final free reply only (same
 * mechanism sendMessage already uses for its soft-crisis note). With a thread
 * (still-see line 1), PART 2 points to that thread; with none (a thin chat gave no
 * line, or still-see fell back), PART 2 names the next, deeper layer of her own
 * question. `facts` = the round-6 facts lists (null = none built).
 */
export function buildFreeTrialFinalReplyNote(thread: FinalReplyThread | null, facts: HerFacts | null = null): string {
  const part2 = thread
    ? [
        'PART 2 — THE NEXT THING (a new paragraph, exactly ONE sentence in your own voice). It points ahead to this still-unread part of her story — the same words open the screen she sees next:',
        `  ${thread.line.trim()}`,
        thread.source === 'her_words'
          ? '  She wrote about this herself in this chat.'
          : '  This comes from what you knew about her before this chat, not from her messages today — never say she said, told or mentioned it.',
        `Say plainly that you have not read this for her yet, and name this same part of her story. Reusing the line's own words is fine. ${PART2_SHAPE} Add nothing to it: no new detail, no other person's side of it, no guess about where it leads. Do not swap in a different thread.`,
      ]
    : [
        'PART 2 — THE NEXT THING (a new paragraph, exactly ONE sentence in your own voice). Name the next, deeper layer of the question she brought to this chat — the part of it your answer in PART 1 has not reached yet, such as where it began in her or what sits underneath it — and say plainly that you have not read it for her yet.',
        `${PART2_SHAPE} Build it only from her own words and your reading: no person, event, place or detail that is not in HER FACTS.`,
      ];
  return [...FINAL_REPLY_HEADER, ...part2, ...renderFactsBlock(facts), ...FINAL_REPLY_RULES].join('\n');
}

/** The no-thread, no-facts version (kept for the doc + callers without facts). */
export const FREE_TRIAL_FINAL_REPLY_NOTE = buildFreeTrialFinalReplyNote(null);

/** One line appended after her final message (as a second text block in that
 *  user turn) so the rules sit right next to generation — the system note alone
 *  still lost to the persona prompt's reply habits in preview round 3. */
export const FREE_TRIAL_FINAL_REPLY_REMINDER =
  '[FINAL REPLY rules apply to your next reply: PART 1 answers this message; PART 2 is ONE full sentence of yours (never a bare heading) pointing to the unread part given in FINAL REPLY; 110 words or fewer; no question mark; no request, practice, advice for later, summary, goodbye, praise or blessing; nothing about time, minutes or paying; state as fact about her life only what HER FACTS or KNOWN BEFORE holds — no new person, place, job detail or event.]';

/** Added after the reminder on the one regeneration: tells the model exactly what
 *  its first draft broke (the code guard and/or the fact check). */
export function buildFinalReplyRetryNote(problems: string[]): string {
  return `[Your first draft of this reply broke these rules: ${problems.join('; ')}. Write the reply again from scratch, keeping every FINAL REPLY rule.]`;
}

/** System-prompt suffix for a never-bought client, in the same windows as
 *  buildFreeTrialMeterLine: the FINAL REPLY note in the final free minute, the
 *  KEEP READING note while the meter reads 1–2 minutes, otherwise nothing. */
export function freeTrialSystemSuffix(
  spendableCoins: number,
  coinsPerMinute: number,
  thread: FinalReplyThread | null = null,
  facts: HerFacts | null = null,
): string {
  const secondsLeft = Math.max(0, Math.floor((spendableCoins * 60) / Math.max(1, coinsPerMinute)));
  if (secondsLeft <= WIND_DOWN_SECONDS) return `\n\n${buildFreeTrialFinalReplyNote(thread, facts)}`;
  if (Math.floor(secondsLeft / 60) <= 2) return `\n\n${FREE_TRIAL_KEEP_READING_NOTE}`;
  return '';
}

// ── (b) "What I still see for you" ──────────────────────────────────────────

export interface TranscriptTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** her_words = rests on her own message in this chat; known_before = a plain fact
 *  about her life that the guide's messages treat as known from before this chat
 *  (only allowed when her messages hold fewer than three separate things). */
export type StillSeeSource = 'her_words' | 'known_before';

export interface StillSeeLine {
  line: string;
  source: StillSeeSource;
  /** Exact words copied from the message the line rests on (checked in code). */
  quote: string;
  /** What in her chat the line comes from. Never shown to her; used for QA and
   *  so the final reply / first paid reply can open line one. */
  basis: string;
}

/** The phone layout fits three lines of this length on one screen. */
export const STILL_SEE_MAX_CHARS = 40;

const FACT_ITEM_SCHEMA = {
  type: 'object',
  properties: { fact: { type: 'string' }, quote: { type: 'string' } },
  required: ['fact', 'quote'],
  additionalProperties: false,
} as const;

/** JSON schema for structured output (output_config.format). String length is
 *  not expressible there (maxLength is unsupported), so it is checked in code.
 *  Round 6: the two facts lists come first, so the lines are picked from them. */
export const STILL_SEE_SCHEMA = {
  type: 'object',
  properties: {
    her_facts: { type: 'array', items: FACT_ITEM_SCHEMA },
    known_before: { type: 'array', items: FACT_ITEM_SCHEMA },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          line: { type: 'string' },
          source: { type: 'string', enum: ['her_words', 'known_before'] },
          quote: { type: 'string' },
          basis: { type: 'string' },
        },
        required: ['line', 'source', 'quote', 'basis'],
        additionalProperties: false,
      },
    },
  },
  required: ['her_facts', 'known_before', 'lines'],
  additionalProperties: false,
} as const;

export const STILL_SEE_BANNED_WORDS = [
  'energy', 'energies', 'pattern', 'patterns', 'block', 'blocks', 'blockage', 'alignment',
  'abundance', 'destiny', 'journey', 'healing', 'karma', 'soul', 'universe', 'vibration',
  'manifest', 'manifestation', 'path', 'shift', 'spirit', 'cosmic', 'divine',
];

export function buildStillSeeSystem(personaName: string): string {
  const first = personaName.split(' ')[0];
  const FIRST = first.toUpperCase();
  return [
    `You write the short lines for the payment screen of a psychic-reading chat. A woman has just used her free minutes with ${personaName}, a warm, plain-spoken intuitive advisor. The screen tells her that her free minutes are over but her reading is not, then lists your lines — up to three — under the heading "What I still see for you:", in ${first}'s voice. Each line names one part of her story that ${first} will read for her next if she stays.`,
    '',
    `The transcript labels her messages CLIENT and ${first}'s messages ${FIRST}. ${first}'s first message is a greeting that may recall things from before this chat.`,
    '',
    `FIRST, TWO LISTS. They are never shown to her; ${first}'s next reply may state only what they hold as facts about her life, so they must hold nothing she did not write.`,
    'A. her_facts — every separate concrete thing she wrote about her life in her CLIENT messages: a person, a relationship, an event, a situation, a worry, what she wants, what she asks. One item each, in plain words that add nothing to what she wrote: no who, why, where, how much or how long unless she wrote it, and no meaning or reading. People keep the words she used for them.',
    `B. known_before — plain facts about her life that ${first}'s messages treat as already known from before this chat: a person, a job, a place, a plan. Never anything ${first} says she sees, senses, feels, guesses or reads, and never a mood or a feeling. Often empty.`,
    `For every item also give quote: the exact words it rests on, copied character for character with her spelling — from a CLIENT message for A, from a ${FIRST} message for B.`,
    '',
    'THEN THE LINES.',
    'Where a line may come from:',
    '1. Her own CLIENT messages come first (list A). Each line rests on words she wrote.',
    '2. Only if her messages hold fewer than three separate things, a line may use a fact from list B.',
    `3. Her last message will be answered in ${first}'s next reply, so no line may be about what her last message asks or answers.`,
    `4. Each line names something ${first} has not finished reading. A thing she only touched on is fine; leave out anything she already settled with a clear verdict or a step. The question she opened the chat with is often settled by now — use it only if ${first} never actually answered it.`,
    '',
    'How many lines:',
    '5. Three when her chat gives three separate, concrete things that keep every rule here. Otherwise only as many as it truly gives — two, one or none. Never stretch one thing into two lines, and never fill a place with a vague line: a missing line is better than a weak one. When the only concrete thing she wrote is the question her last message asks, return no lines; the screen then shows its own general line.',
    '',
    'Each line:',
    `6. ${STILL_SEE_MAX_CHARS} characters or fewer, counting spaces and punctuation — about six short words. Count the characters before you answer.`,
    '7. Concrete: it names the actual person, thing or event from her story, in her own words where they fit, and names people by their role (him, your ex, your husband, your kids, your boss). A line about love in general, a line that only points back at an earlier conversation, or a line built only on an inner state — a fear, a feeling, a wanting, a lesson, a cost — without the person, thing or event it is about, is not allowed.',
    '8. A topic, not a question: start with Why, What, Whether, How, Who or Where, or name the thing directly. No question mark.',
    '9. No names of people, no places, no ages, no dates, no lengths of time.',
    '10. No predictions and no promises: nothing about what will happen, when, or whether anyone comes back, calls, changes, returns or reaches out; nothing about being fated or meant for each other.',
    '11. Never offer to read what another person feels, thinks or wants about her. A line about another person may only ask why they do something she said they do.',
    '12. Never make waiting for someone the frame (waiting until he is ready, holding on while you wait). If she is waiting on someone, the waiting itself is what to look at.',
    '13. Never start with It, That, This or There. Never use these words: ' + STILL_SEE_BANNED_WORDS.join(', ') + '.',
    '14. Never mention minutes, time, paying, buying, continuing or the reading itself.',
    '',
    'The lines together:',
    '15. Each line is a different part of her story. No key word — a noun, verb or adjective that carries the idea — appears in two lines (pronouns and small words aside), and two lines about the same person doing the same thing, or the same feeling in other words, count as one line.',
    `16. Order by how much she seems to care, most first. Line 1 is also the thread ${first} names at the end of her last chat message, so it must be the part she cares about most that is still unread.`,
    '',
    'For each line also return:',
    '- source: her_words (rule 1) or known_before (rule 2).',
    `- quote: the exact words, copied character for character with her spelling, from the message the line rests on — 2 to 8 words from a CLIENT message for her_words, or from a ${FIRST} message for known_before.`,
    '- basis: at most 12 plain words on what she said (or what was known) that the line comes from, adding nothing she did not write. Never shown to her.',
    'If she wrote in another language, still write the facts, lines and basis in English; the quotes stay in her language.',
  ].join('\n');
}

/** Render the transcript the generator reads. Labels are role names, not her name. */
export function renderTranscript(turns: TranscriptTurn[], personaName: string): string {
  const first = personaName.split(' ')[0].toUpperCase();
  return turns
    .map((t) => `${t.role === 'user' ? 'CLIENT' : first}: ${t.content.trim()}`)
    .join('\n\n');
}

/**
 * The still-see request. `turns` = the chat up to and including her last message
 * (the final reply has not been written yet — it is written AFTER, from line 1).
 * `retryViolations` = what the previous attempt broke, for the single retry.
 */
export function buildStillSeeRequest(turns: TranscriptTurn[], personaName: string, retryViolations: string[] = []) {
  const retry = retryViolations.length
    ? `\n\nA first attempt broke these rules: ${retryViolations.join('; ')}. Write new lines that keep every rule (fewer lines is fine when her chat does not give more).`
    : '';
  return {
    system: buildStillSeeSystem(personaName),
    user: `<transcript>\n${renderTranscript(turns, personaName)}\n</transcript>\n\nWrite the two lists, then the lines.${retry}`,
    schema: STILL_SEE_SCHEMA,
  };
}

// ── Mechanical checks (QA, the retry trigger, and the preview run's grader) ──

const normalise = (s: string) =>
  s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9\u00c0-\u024f' ]+/g, ' ').replace(/\s+/g, ' ').trim();

const STOPWORDS = new Set((
  'the a an and or but to of in on for with from about at into onto by as so then than when while ' +
  'you your yours he him his she her hers they them their it its i me my we us our ' +
  'why what whether how who where which is are was were be been being am do does did doing ' +
  'keeps keep kept still just not no can could would should will much more most very really ' +
  'that this these those there here one ones ' +
  'youre youve youll youd hes shes theyre theyve dont doesnt didnt isnt wasnt cant wont hasnt havent im ive ' +
  'life really actually thing things way also even ever every always never yet now get got make made'
).split(' '));

function contentWords(line: string): Set<string> {
  return new Set(
    normalise(line).replace(/'/g, '').split(' ')
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
      .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w)),
  );
}

/** Mechanical rule check for one set of still-see lines. Returns violations; an
 *  empty array means it passed the checkable rules (judgment rules — concrete,
 *  not already answered — still need a human or judge read). */
export function checkStillSeeLines(lines: string[], opts: { forbiddenNames?: string[] } = {}): string[] {
  const v: string[] = [];
  // Round 6: a thin chat may give fewer lines (zero = the paywall's own line).
  if (lines.length > 3) v.push(`expected at most 3 lines, got ${lines.length}`);
  const banned = new RegExp(`\\b(${STILL_SEE_BANNED_WORDS.join('|')})\\b`, 'i');
  const names = (opts.forbiddenNames ?? []).filter((n) => n && n.length > 1);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    const n = i + 1;
    if (line.length > STILL_SEE_MAX_CHARS) v.push(`line ${n}: ${line.length} characters (max ${STILL_SEE_MAX_CHARS})`);
    if (!line) v.push(`line ${n}: empty`);
    if (line.includes('?')) v.push(`line ${n}: question mark`);
    if (/^(it|that|this|there)\b/i.test(line)) v.push(`line ${n}: banned opener`);
    const b = line.match(banned);
    if (b) v.push(`line ${n}: banned word "${b[1]}"`);
    if (/\b(will|won't|going to|soon|come back|comes back|coming back|return|returns|reach out|reaches out|meant|the one|fated)\b/i.test(line)) {
      v.push(`line ${n}: prediction/return wording`);
    }
    if (/\b(minutes?|pay|paying|buy|buying|continue|reading)\b/i.test(line)) v.push(`line ${n}: mentions the sale`);
    if (/(while you wait|until he.s ready|before he.s ready|until he is ready|before he is ready|ready first|hold (on to )?(the )?hop)/i.test(line)) v.push(`line ${n}: accepts the waiting`);
    // Allowed: why he SAYS/does something she reported ("why he says he loves you").
    if (!/\b(says?|said|tells?|told|saying|telling)\b/i.test(line) && /\b(feels?|thinks?|misses|loves?|wants?) (about|for|of|toward|towards)? ?(you|her)\b|\bthinks of you\b/i.test(line)) {
      v.push(`line ${n}: reads someone else's feelings about her`);
    }
    if (/\b(19|20)\d\d\b|\b(january|february|march|april|may|june|july|august|september|october|november|december|weeks?|months?|years?)\b/i.test(line)) {
      v.push(`line ${n}: time/date wording`);
    }
    for (const name of names) {
      if (new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line)) v.push(`line ${n}: contains a name`);
    }
  });
  const openers = lines.map((l) => l.trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase());
  if (new Set(openers).size < openers.length) v.push('two lines open the same way');
  // Same idea twice: two lines sharing a key word (stopwords and pronouns removed).
  for (let a = 0; a < lines.length; a++) {
    for (let b = a + 1; b < lines.length; b++) {
      const wa = contentWords(lines[a]);
      const shared = Array.from(contentWords(lines[b])).filter((w) => wa.has(w));
      if (shared.length >= 1) v.push(`lines ${a + 1} and ${b + 1} share a key word (${shared.join(', ')})`);
    }
  }
  return v;
}

/**
 * Full validation of a generated set: the line rules above plus traceability —
 * each quote must really appear in her messages (her_words) or in the guide's
 * messages (known_before). Any violation triggers the one retry, then the fallback.
 */
export function validateStillSee(lines: StillSeeLine[], turns: TranscriptTurn[], opts: { forbiddenNames?: string[] } = {}): string[] {
  const v = checkStillSeeLines(lines.map((l) => l.line), opts);
  const herText = normalise(turns.filter((t) => t.role === 'user').map((t) => t.content).join(' \n '));
  const guideText = normalise(turns.filter((t) => t.role === 'assistant').map((t) => t.content).join(' \n '));
  lines.forEach((l, i) => {
    const n = i + 1;
    const q = normalise(l.quote ?? '');
    if (!l.basis?.trim()) v.push(`line ${n}: no basis`);
    if (!q) v.push(`line ${n}: no quote`);
    else if (l.source === 'her_words' && !herText.includes(q)) v.push(`line ${n}: quote is not in her messages`);
    else if (l.source === 'known_before' && !guideText.includes(q)) v.push(`line ${n}: quote is not in the guide's messages`);
  });
  return v;
}

/** Keep only facts whose quote really appears in the messages they claim to come
 *  from (hers for her_facts, the guide's for known_before). */
export function checkFacts(raw: { her_facts?: any[]; known_before?: any[] } | null | undefined, turns: TranscriptTurn[]): { facts: HerFacts; dropped: HerFact[] } {
  const herText = normalise(turns.filter((t) => t.role === 'user').map((t) => t.content).join(' \n '));
  const guideText = normalise(turns.filter((t) => t.role === 'assistant').map((t) => t.content).join(' \n '));
  const dropped: HerFact[] = [];
  const keep = (items: any[] | undefined, text: string) => (items ?? [])
    .map((f) => ({ fact: String(f?.fact ?? '').trim(), quote: String(f?.quote ?? '').trim() }))
    .filter((f) => {
      const ok = !!f.fact && !!normalise(f.quote) && text.includes(normalise(f.quote));
      if (!ok) dropped.push(f);
      return ok;
    });
  return { facts: { hers: keep(raw?.her_facts, herText), knownBefore: keep(raw?.known_before, guideText) }, dropped };
}

export interface StillSeeResult {
  /** null = fallback after a failed retry; [] = a thin chat gave no line on purpose.
   *  Either way the paywall shows its generic line and the final reply gets no thread. */
  lines: StillSeeLine[] | null;
  /** Facts lists from the last attempt (kept even when the lines fell back). */
  facts: HerFacts;
  droppedFacts: HerFact[];
  attempts: { lines: StillSeeLine[]; violations: string[]; ms: number; servedBy?: string }[];
  totalMs: number;
}

/**
 * Generate → validate → retry once (telling the model what it broke) → fallback.
 * `callModel` is injected so this stays testable and transport-agnostic; it must
 * return the parsed structured output plus how long the call took.
 */
export async function generateStillSee(
  callModel: (req: ReturnType<typeof buildStillSeeRequest>) => Promise<{ json: any; ms: number; servedBy?: string }>,
  turns: TranscriptTurn[],
  personaName: string,
  opts: { forbiddenNames?: string[] } = {},
): Promise<StillSeeResult> {
  const attempts: StillSeeResult['attempts'] = [];
  let retryWith: string[] = [];
  let factsOut: ReturnType<typeof checkFacts> = { facts: { hers: [], knownBefore: [] }, dropped: [] };
  const total = () => attempts.reduce((a, x) => a + x.ms, 0);
  for (let i = 0; i < 2; i++) {
    const res = await callModel(buildStillSeeRequest(turns, personaName, retryWith));
    const lines: StillSeeLine[] = (res.json?.lines ?? []).map((l: any) => ({
      line: String(l.line ?? '').trim(),
      source: l.source === 'known_before' ? 'known_before' : 'her_words',
      quote: String(l.quote ?? ''),
      basis: String(l.basis ?? ''),
    }));
    factsOut = checkFacts(res.json, turns);
    const violations = validateStillSee(lines, turns, opts);
    attempts.push({ lines, violations, ms: res.ms, servedBy: res.servedBy });
    if (!violations.length) return { lines, facts: factsOut.facts, droppedFacts: factsOut.dropped, attempts, totalMs: total() };
    retryWith = violations;
  }
  return { lines: null, facts: factsOut.facts, droppedFacts: factsOut.dropped, attempts, totalMs: total() };
}

// ── Round 6: the final-reply guards (code shape check + fact check) ─────────

/** The words a regeneration needs: hard, mechanical rules a final reply must keep.
 *  Round 6 guard — PART 2 must be one full sentence (round 5 let a bare heading
 *  through), plus the two rules a code check can settle outright. */
export function finalReplyShapeViolations(text: string): string[] {
  const v: string[] = [];
  const t = text.trim();
  if (t.includes('?')) v.push('it contains a question mark');
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words > 110) v.push(`it is ${words} words, over 110`);
  const paras = t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paras.length < 2) {
    v.push('PART 2 is not a separate paragraph');
    return v;
  }
  const last = paras[paras.length - 1];
  const sentences = last.split(/(?<=[.!…])["'”’)]*\s+(?=\S)/).filter((s) => /\w/.test(s));
  const lastWords = last.split(/\s+/).filter(Boolean).length;
  if (sentences.length > 1) v.push(`PART 2 is ${sentences.length} sentences, not one`);
  // A question-word opener is a heading ("Why nothing is showing up…") unless the
  // speaker follows it ("What I haven't read for you yet is…" is a full sentence).
  if (/^(why|what|how|where|whether|who|when|which)\b(?!\s+I(\b|'))/i.test(last)) v.push(`PART 2 opens with a question word, like a heading ("${last.split(/\s+/).slice(0, 4).join(' ')}…")`);
  if (lastWords < 8) v.push(`PART 2 is only ${lastWords} words, not a full sentence`);
  if (/(\.\.\.|…)\s*$/.test(last) || !/[.!]["'”’)]*\s*$/.test(last)) v.push('PART 2 does not end as a full sentence');
  return v;
}

export interface InventedDetail {
  /** The exact words in the reply. */
  words: string;
  why: string;
}

const DETAIL_LIST_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: { words: { type: 'string' }, why: { type: 'string' } },
    required: ['words', 'why'],
    additionalProperties: false,
  },
} as const;

export const FACT_CHECK_SCHEMA = {
  type: 'object',
  properties: { invented: DETAIL_LIST_SCHEMA, advice: DETAIL_LIST_SCHEMA },
  required: ['invented', 'advice'],
  additionalProperties: false,
} as const;

export function buildFactCheckSystem(personaName: string): string {
  const first = personaName.split(' ')[0];
  return [
    `You check one chat reply from ${personaName}, an intuitive advisor, before the client reads it. The transcript is the chat so far: CLIENT lines are hers, ADVISOR lines are ${first}'s. HER FACTS restates what her messages say, including what each short answer (a yes, a name) is answering.`,
    '',
    '1. invented — every INVENTED DETAIL: a person, relationship, job detail, place, event or other fact about the client\'s life, or about the people in it, that the reply states as real but that her own messages do not give — directly, or as a clear answer to the advisor\'s question — and that is not in KNOWN BEFORE.',
    'Invented:',
    '- a person she never mentioned — a parent, an ex, a friend, someone who hurt her, someone from her past who shaped her — or a role or relationship for someone she did mention that she never gave;',
    '- an explanation of her facts that she did not give: who, why, where, what kind, how much, how long;',
    '- an upgrade of her facts: work becomes a full-time job or shifts, a partner becomes a husband, a long relationship becomes a marriage, a year becomes years;',
    '- something only the advisor said earlier — a guess, a reading, a person the advisor brought up — now stated as a fact of her life, unless her own reply confirmed it;',
    '- anything presented as her own words (you said, you told me, you named) that her messages do not give.',
    'Not invented — leave these alone:',
    '- her first name, and every person and thing her messages name;',
    `- ${first}'s reading: what she sees, senses or reads in the pattern, why it happens, what it means, what a pattern like this tends to lead to, and general statements about people, men or love;`,
    '- her facts said again in other words, rounded the way she put them, and feelings named as part of the reading;',
    '- facts from KNOWN BEFORE, unless the reply presents them as her words.',
    '',
    '2. advice — every instruction or step for her to act on after this chat: something to do, keep doing, try, practise, notice or watch for. Taking in what she said she will do, without telling her what to do, is not advice.',
    '',
    'For each item give its exact words from the reply and a short reason. Return empty lists when there is nothing — most replies have nothing in either list.',
  ].join('\n');
}

/** The fact-check request: the chat so far (labelled), her first name, the facts
 *  lists and the reply. The advisor's lines are context for her short answers; a
 *  guess the advisor made is not her fact unless her reply confirmed it. */
export function buildFactCheckRequest(reply: string, turns: TranscriptTurn[], facts: HerFacts, personaName: string, clientFirstName?: string | null) {
  const transcript = turns.map((t) => `${t.role === 'user' ? 'CLIENT' : 'ADVISOR'}: ${t.content.trim()}`).join('\n\n');
  const hers = facts.hers.length ? facts.hers.map((f) => `- ${f.fact}`) : ['- (none)'];
  const before = facts.knownBefore.length ? facts.knownBefore.map((f) => `- ${f.fact}`) : ['- (none)'];
  return {
    system: buildFactCheckSystem(personaName),
    user: [
      `<client_first_name>${clientFirstName?.trim() || 'unknown'}</client_first_name>`,
      '<transcript>', transcript, '</transcript>',
      '<her_facts>', ...hers, '</her_facts>',
      '<known_before>', ...before, '</known_before>',
      '<reply>', reply.trim(), '</reply>',
      '',
      'List the invented details and the advice in the reply.',
    ].join('\n'),
    schema: FACT_CHECK_SCHEMA,
  };
}

/** Share of `line`'s words that appear, in order, in `text` (longest common
 *  subsequence ÷ line length). ≥ 0.8 = the line pasted in with filler/tense changes. */
export function lineReuseRatio(line: string, text: string): number {
  const x = normalise(line).split(' ').filter(Boolean);
  const y = normalise(text).split(' ').filter(Boolean);
  if (!x.length) return 0;
  const dp: number[][] = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[x.length][y.length] / x.length;
}

const PREDICTION_RE = /\b(he|she|they)('ll| will)\b|\b(man|partner|one|someone|anyone|person)\b[^.!\n]{0,60}?\b(will|'ll)\b|\bgoing to\b|\bwhen (he|she) (arrives|comes|returns|shows up)\b/i;

/** Longest run of consecutive words two texts share (normalised). */
function longestSharedRun(a: string, b: string): number {
  const x = normalise(a).split(' ').filter(Boolean);
  const y = normalise(b).split(' ').filter(Boolean);
  let best = 0;
  for (let i = 0; i < x.length; i++) {
    for (let j = 0; j < y.length; j++) {
      let k = 0;
      while (i + k < x.length && j + k < y.length && x[i + k] === y[j + k]) k++;
      if (k > best) best = k;
    }
  }
  return best;
}

/** Mechanical flags for a final free reply. `thread` = still-see line 1 it was
 *  told to name. Flags marked (review) are prompts for a human read, not fails. */
export function checkTeaserEnding(text: string, opts: { thread?: string | null } = {}): string[] {
  const v: string[] = [];
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean).length;
  if (t.includes('?')) v.push('question mark');
  if (words > 110) v.push(`over 110 words (${words})`);
  const paras = t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paras.length < 2) v.push('no separate PART 2 paragraph');
  const last = paras[paras.length - 1] ?? '';
  const sentences = last.split(/(?<=[.!…])["'”’)]*\s+(?=\S)/).filter((s) => /\w/.test(s));
  if (paras.length >= 2 && sentences.length > 1) v.push(`PART 2 has ${sentences.length} sentences`);
  if (/\b(minutes?|pay|paying|buy|buying|top.?up|credits?|trial)\b/i.test(t)) v.push('mentions minutes/paying/trial');
  if (/\bfree\b/i.test(t)) v.push('says "free" (review)');
  if (/(still forming|ripens|bring (it|that) (back )?to me|not ready yet|you.re not ready to (hear|see|know)|hasn.t (fully )?formed|when the dust settles|next time|next session|whenever you.re ready|when you.re ready|come back)/i.test(t)) {
    v.push('banned unformed-future/hook wording');
  }
  if (/\b(he|she|they)('ll| will) (come back|return|reach out|call|text|message)\b/i.test(t)) v.push('reunion/return prediction');
  // Round 6 rules: a flat pattern reading or prediction is fine; only a reunion or
  // timing fails, so this is a prompt for the human read, not a fail.
  if (PREDICTION_RE.test(t)) v.push('prediction wording (review)');
  else if (/\b(it|you)('ll| will)\b/i.test(t)) v.push('future wording (review)');
  if (/\b(tell me (his|her|your|the|more|about)|give me (his|her|your|their)|what('s| is) (his|her|your) (name|birth))/i.test(t)) v.push('asks her for something');
  if (/\b(this|next) (week|month|fall|spring|summer|winter)\b|\bby (january|february|march|april|may|june|july|august|september|october|november|december)\b|\bin a few (days|weeks|months)\b/i.test(t)) {
    v.push('calendar timing');
  }
  if (/\b(tonight|tomorrow|today)\b/i.test(t)) v.push('day wording (review)');
  if (/(one thing to do|one practice|practice:|practically|here.s what to do|try this|both hands|say (it )?out loud|burn it|the opening)/i.test(t)) v.push('gives a practice');
  if (/(proud of you|took courage|takes (real )?courage|take care|be gentle with yourself|i.m (always )?here (for you|whenever)|until next time|bless)/i.test(t)) v.push('says goodbye / warm close');
  if (/\byou (said|mentioned|told me|shared|wrote|named)\b/i.test(t)) v.push('attributes words to her (review)');
  // Round 6: the shape guard's findings (fragment / question word / too short).
  for (const s of finalReplyShapeViolations(t)) if (!/question mark|over 110|not a separate paragraph|sentences, not one/.test(s)) v.push(s);
  if (opts.thread) {
    // Echoing line 1 is fine from round 6 (operator, 2026-10-12): these are info only.
    const line = normalise(opts.thread);
    if (line && normalise(last).includes(line)) v.push('PART 2 contains line 1 word for word (info)');
    else if (lineReuseRatio(opts.thread, last) >= 0.8) v.push('PART 2 reuses ≥ 80% of line 1 (info)');
    else if (longestSharedRun(opts.thread, last) >= 5) v.push('reuses a 5+ word run of line 1 (info)');
    const want = contentWords(opts.thread);
    const got = contentWords(last);
    if (want.size && !Array.from(want).some((w) => got.has(w))) v.push('PART 2 shares no word with line 1 (review)');
  }
  return v;
}
