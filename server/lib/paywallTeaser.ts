/**
 * Paywall long-copy test ("updated test 1") — PREVIEW ONLY.
 *
 * Two AI pieces for first-time buyers, written as pure functions so they can be
 * unit-tested and run against real transcripts before anything ships:
 *
 *   (a) buildFreeTrialMeterLine — the free-trial replacement for
 *       buildMinutesMeterLine (minutesMeter.ts). Today every wallet, the free
 *       trial included, gets WIND_DOWN_INSTRUCTION in the last 60s, and Evelyn's
 *       own prompt starts its WIND-DOWN when the meter reads 2 minutes or less —
 *       so a 3:00 trial spends two of its three minutes closing the reading, and
 *       the paywall lands right after a practice and a goodbye. The free-trial
 *       line keeps the reading open and, in the final minute, ends on ONE real
 *       unread thread instead.
 *
 *   (b) buildStillSeeRequest — the "What I still see for you" generator: three
 *       short lines shown on the first-timer paywall, taken from her transcript.
 *
 * NOT imported by any live code path. Wiring it in (an isFreeTrial flag on the
 * meter, the paywall fetch, and the first paid reply picking up line one) is a
 * separate, reviewed change.
 */
import { WIND_DOWN_SECONDS } from './minutesMeter';

// ── (a) Free-trial wind-down ────────────────────────────────────────────────

/**
 * Meter-line pointer for the final free minute. The rules themselves go at the
 * END of the system prompt (FREE_TRIAL_FINAL_REPLY_NOTE): placed only in RIGHT
 * NOW, near the top of a ~35k-char persona prompt, they lost to the prompt's own
 * later rules (GIVE THEN ASK, "The opening:", the closing question) in 9 of 10
 * real chats (preview round 2).
 */
export const FREE_TRIAL_TEASER_INSTRUCTION =
  ' This is her last reply before her trial time ends — do NOT run the WIND-DOWN; follow FINAL REPLY at the very end of these instructions.';

/**
 * Appended to the end of the system prompt for the final free reply only (same
 * mechanism sendMessage already uses for its soft-crisis note). Overrides, for
 * this one reply, the code's WIND_DOWN_INSTRUCTION and the persona prompt's
 * WIND-DOWN, CLEAN CLOSE default and "one question" allowance. It does NOT
 * override the honesty rules (no invented futures, no dates, no reunion yes, no
 * "not ready yet" hook) — it restates them, because a teaser is exactly where a
 * model reaches for them.
 */
export const FREE_TRIAL_FINAL_REPLY_NOTE = [
  '## FINAL REPLY — THIS REPLY ONLY (overrides WIND-DOWN, THE THREAD shapes, THE SESSION ARC and the question allowance)',
  'This client has never paid and her trial time is about to end. This reply has exactly two parts and is UNDER 110 WORDS in total — count them. It is shorter than your usual replies, not longer.',
  'PART 1 — ANSWER (two to four sentences). Answer her last message plainly, in your own voice. Never hold back any part of what she just asked for. If her message gave you nothing new to read, answer what she said in one or two sentences — do not start a fresh reading.',
  'PART 2 — WHAT YOU SEE NEXT (a new paragraph, one or two sentences, REQUIRED). Name ONE specific thing in her situation that you have not read for her yet and could read right now: a person, a choice, an event or a worry SHE named earlier in this chat, in her own plain terms. It is a real, still-unread part of HER story — not a held-back piece of the answer you just gave, not a future event, not a feeling inside someone else.',
  'Never in this reply:',
  '- a question of any kind. Not one question mark, not even a tag like "didn\'t it".',
  '- a request for anything: no name, no birth date, no detail, no "tell me".',
  '- a practice, "the opening", "one thing to do", a watch-for, "this week", a summary, a goodbye, "I\'m proud of you".',
  '- time, minutes, the clock, money, paying, a trial, or anything being free.',
  '- dates or timing, a reunion or return, a prediction of what anyone else will do, "not ready yet", "still forming", "whenever you\'re ready", "bring it to me", "come back".',
  'Your last sentence is the PART 2 statement. Nothing follows it.',
].join('\n');

/** One line appended after her final message (as a second text block in that
 *  user turn) so the rules sit right next to generation — the system note alone
 *  still lost to the persona prompt's reply habits in preview round 3. */
export const FREE_TRIAL_FINAL_REPLY_REMINDER =
  '[FINAL REPLY rules apply to your next reply: two parts, under 110 words, Part 2 names one unread thing from her story, no question, no request, no practice, no goodbye, nothing about time or money.]';

/** Between the final minute and the prompt's own 2-minute WIND-DOWN trigger. */
export const FREE_TRIAL_KEEP_READING_INSTRUCTION =
  ' These are her FREE minutes — she has never bought time. Do NOT begin the WIND-DOWN yet, whatever the minutes number says: keep reading, unhurried, and say nothing about time.';

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

/** System-prompt suffix for a never-bought client: the FINAL REPLY note in the
 *  final free minute, otherwise nothing. Pair with buildFreeTrialMeterLine. */
export function freeTrialSystemSuffix(spendableCoins: number, coinsPerMinute: number): string {
  const secondsLeft = Math.max(0, Math.floor((spendableCoins * 60) / Math.max(1, coinsPerMinute)));
  return secondsLeft <= WIND_DOWN_SECONDS ? `\n\n${FREE_TRIAL_FINAL_REPLY_NOTE}` : '';
}

// ── (b) "What I still see for you" ──────────────────────────────────────────

export interface TranscriptTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface StillSeeLine {
  line: string;
  /** What in her chat the line comes from. Never shown to her; used for QA and
   *  so the first paid reply can open line one. */
  basis: string;
}

/** JSON schema for structured output (output_config.format). */
export const STILL_SEE_SCHEMA = {
  type: 'object',
  properties: {
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          line: { type: 'string' },
          basis: { type: 'string' },
        },
        required: ['line', 'basis'],
        additionalProperties: false,
      },
    },
  },
  required: ['lines'],
  additionalProperties: false,
} as const;

export const STILL_SEE_BANNED_WORDS = [
  'energy', 'energies', 'pattern', 'patterns', 'block', 'blocks', 'blockage', 'alignment',
  'abundance', 'destiny', 'journey', 'healing', 'karma', 'soul', 'universe', 'vibration',
  'manifest', 'manifestation', 'path', 'shift', 'spirit', 'cosmic', 'divine',
];

export function buildStillSeeSystem(personaName: string): string {
  const first = personaName.split(' ')[0];
  return [
    `You write three short lines for the payment screen of a psychic-reading chat. A woman has just used her free minutes with ${personaName}, a warm, plain-spoken intuitive advisor. The screen says "Your free minutes are up, but your reading isn't." and then, under the heading "What I still see for you:", shows your three lines in ${first}'s voice. They tell her what ${first} will read for her next if she stays.`,
    '',
    'Rules for the lines:',
    '1. Exactly three lines. Each line is 8 words or fewer — count them.',
    `2. Each line names ONE thing in her situation that the chat has NOT answered yet. Take it only from what she actually told ${first} — her people, her choices, her worries. If ${first} already answered it or already gave her a step for it, leave it out.`,
    '3. Write each line as a topic, not a question: start with Why, What, Whether, How, Who or Where, or name the thing directly. No question marks.',
    '4. Plain words a ten-year-old knows. Name the real thing by its role: him, your ex, your husband, your sister, your boss, your kids, the money, the house.',
    '5. No names of people, no places, no ages, no dates, no "how long".',
    '6. No predictions and no promises. Never say what will happen, when, or that anyone will come back, call, change, return or reach out. No "meant to be", "meant for you", "the one" or "meant to last". Name the question she is carrying, not its answer.',
    `6b. Never offer to read what another person feels, thinks or wants about her — whether he loves her, misses her, still thinks of her. That is the comforting yes ${first} never gives. A line about another person may only ask WHY they do something she described them doing.`,
    '7. Never start a line with It, That, This or There. Never use these words: ' + STILL_SEE_BANNED_WORDS.join(', ') + '.',
    '8. Never mention minutes, time, paying, buying, continuing or the reading itself.',
    '9. The three lines are three different threads — not the same feeling said three ways. If she said little, use the different things she did name (a person, her kids, her work, the money, her past) before her feelings. Order them by how much she seems to care, most first.',
    '10. Never accept the waiting as the frame: no "while you wait", "until he\'s ready", "before he\'s ready", "hold on to hope". If she is waiting on someone, name the waiting itself as the thing to look at.',
    '11. Prefer lines that name a real person or thing from her story over lines about a feeling.',
    '',
    'For each line also give a "basis" of at most 10 words: the thing she said that the line comes from. The basis is never shown to her.',
    'If she wrote in another language, still write the lines and basis in English.',
  ].join('\n');
}

/** Render the transcript the generator reads. Labels are role names, not her name. */
export function renderTranscript(turns: TranscriptTurn[], personaName: string): string {
  const first = personaName.split(' ')[0].toUpperCase();
  return turns
    .map((t) => `${t.role === 'user' ? 'CLIENT' : first}: ${t.content.trim()}`)
    .join('\n\n');
}

export function buildStillSeeRequest(turns: TranscriptTurn[], personaName: string) {
  return {
    system: buildStillSeeSystem(personaName),
    user: `<transcript>\n${renderTranscript(turns, personaName)}\n</transcript>\n\nWrite the three lines.`,
    schema: STILL_SEE_SCHEMA,
  };
}

// ── Mechanical checks (QA + the preview run's grader) ──────────────────────

/** Mechanical rule check for one set of still-see lines. Returns violations;
 *  an empty array means it passed the checkable rules (judgment rules — "not
 *  already answered", "grade 5" — still need a human or judge read). */
export function checkStillSeeLines(lines: string[], opts: { forbiddenNames?: string[] } = {}): string[] {
  const v: string[] = [];
  if (lines.length !== 3) v.push(`expected 3 lines, got ${lines.length}`);
  const banned = new RegExp(`\\b(${STILL_SEE_BANNED_WORDS.join('|')})\\b`, 'i');
  const names = (opts.forbiddenNames ?? []).filter((n) => n && n.length > 1);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    const n = i + 1;
    const words = line.split(/\s+/).filter(Boolean).length;
    if (words > 9) v.push(`line ${n}: ${words} words`);
    if (line.includes('?')) v.push(`line ${n}: question mark`);
    if (/^(it|that|this|there)\b/i.test(line)) v.push(`line ${n}: banned opener`);
    const b = line.match(banned);
    if (b) v.push(`line ${n}: banned word "${b[1]}"`);
    if (/\b(will|won't|going to|soon|come back|comes back|coming back|return|returns|reach out|reaches out|meant|the one)\b/i.test(line)) {
      v.push(`line ${n}: prediction/return wording`);
    }
    if (/\b(minutes?|pay|paying|buy|buying|continue|reading)\b/i.test(line)) v.push(`line ${n}: mentions the sale`);
    if (/(while you wait|until he.s ready|before he.s ready|hold (on to )?(the )?hop)/i.test(line)) v.push(`line ${n}: accepts the waiting`);
    if (/\b(feels?|thinks?|misses|loves?|wants?) (about|for|of|toward|towards)? ?(you|her)\b|\bthinks of you\b/i.test(line)) {
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
  return v;
}

/** Mechanical flags for a final free reply (the teaser ending). */
export function checkTeaserEnding(text: string): string[] {
  const v: string[] = [];
  const t = text.trim();
  if (/\?["'”’)\s]*$/.test(t)) v.push('ends on a question');
  if (/\b(minutes?|pay|paying|buy|buying|top.?up|credits?)\b/i.test(t)) v.push('mentions minutes/money');
  if (/(still forming|ripens|bring (it|that) (back )?to me|not ready (yet|to)|hasn.t (fully )?formed|when the dust settles|next time|next session|whenever you.re ready|when you.re ready)/i.test(t)) {
    v.push('banned unformed-future/hook wording');
  }
  if (/\b(he|she|they)('ll| will) (come back|return|reach out|call|text|message)\b/i.test(t)) v.push('reunion/return prediction');
  if (/\b(tell me (his|her|your|the|more|about)|give me (his|her|your|their)|what('s| is) (his|her|your) (name|birth))/i.test(t)) v.push('asks her for something');
  if (t.split(/\s+/).filter(Boolean).length > 120) v.push(`long (${t.split(/\s+/).filter(Boolean).length} words)`);
  if (/\b(this|next) (week|month|fall|spring|summer|winter)\b|\bby (january|february|march|april|may|june|july|august|september|october|november|december)\b|\bin a few (days|weeks|months)\b/i.test(t)) {
    v.push('calendar timing');
  }
  if (/(one thing to do|one practice|practice:|practically|here.s what to do|try this|both hands|say (it )?out loud|burn it)/i.test(t)) v.push('gives a practice');
  if (/(proud of you|took courage|take care|be gentle with yourself|i.m (always )?here (for you|whenever)|until next time)/i.test(t)) v.push('says goodbye / warm close');
  return v;
}
