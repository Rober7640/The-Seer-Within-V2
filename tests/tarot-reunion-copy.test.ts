// Copy guards for the /fb-tarot REUNION/RETURN hooks (2026-08-04).
//
// Three headlines on the FACE-DOWN return-mhf deck: "Will he come back?",
// "Will he ever come back to me?", "Is he coming back, or has he moved on?".
//
// Why this angle needs its own guard file, beyond the generic ones:
//
//  1. IT SHARES A HEADLINE WITH A LIVE LANDER. 'cards-come-back' runs the exact same
//     headline string as 'cards-return', on the same face-down deck. The two pages are
//     therefore identical to a visitor except for the READS — which makes this a copy
//     test, and makes "the reads are actually different" a correctness property rather
//     than a style preference. Beat 3 is compared against cards-return specifically.
//
//  2. cards-return MUST NOT MOVE OR CHANGE. Operator instruction 2026-08-04: it stays on
//     both its live ad URLs (clean, and &deck=arcana-mfh), keeps its signed-off reads,
//     and stays in the decode-him angle. Its beat 3s are pinned verbatim below so a
//     careless edit to a neighbouring hook cannot quietly rewrite the live lander.
//
//  3. THIS IS THE MOST PREDICTION-BAITING ANGLE ON THE FUNNEL. Every headline is
//     literally a request for a forecast. "He will come back" is a promise the funnel
//     cannot keep; "he has moved on" is a pronouncement about a real man delivered to a
//     woman already braced for it. Both are banned, and on 'cards-moved-on' the binary
//     itself has to be refused rather than answered.
//
//  4. HER DIGNITY. "Will he EVER come back to me" selects for women who have waited a
//     long time and started blaming themselves for it — the same shape of harm the
//     cards-wont-commit and cards-deceived guards exist to prevent.
//
// 🔴 The banned-language check is NEGATION-AWARE by construction, as in
// tests/tarot-honesty-copy.test.ts: correct copy on this angle routinely contains the
// forecast phrase inside a refusal, so a naive substring ban would fail the very copy it
// protects. Assertions are checked per-clause and skipped when the clause carries a
// negator; phrases harmful in any framing sit in a separate always-banned list.
import { describe, expect, it } from 'vitest';

const { DECKS, REUNION_HOOKS, TAROT_HOOKS, HEADLINES, angleForHook, openerCStart } = await import(
  '@/content/tarotReads'
);

// Operator scope lock (2026-08-04): FACE-DOWN ONLY, Version C ads. return-mhf is
// DEFAULT_DECK, so the ad URLs are clean with no &deck=.
const DECK = 'return-mhf' as const;
const CARDS = ['a', 'b', 'c'] as const;

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const runsOf = (s: string, n = 6) => {
  const w = words(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
};
const shared = (a: string, b: string) => [...runsOf(a)].filter((r) => runsOf(b).has(r));

describe('reunion hooks are wired end to end', () => {
  it('every reunion hook is in the roster, has a headline, and reports angle=reunion', () => {
    expect(REUNION_HOOKS.length).toBe(3);
    for (const h of REUNION_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      // Without REUNION_HOOKS these silently report 'decode-him' and become invisible as
      // a family in PostHog and in the gate's per-lander table.
      expect(angleForHook(h), `${h} must report angle=reunion`).toBe('reunion');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-come-back']).toBe('Will he come back?');
    expect(HEADLINES['cards-ever-back']).toBe('Will he ever come back to me?');
    expect(HEADLINES['cards-moved-on']).toBe('Is he coming back, or has he moved on?');
  });

  // ── The operator's explicit instruction, encoded ─────────────────────────────
  // "Make sure not to replace/touch them and we will entirely use new hook for these new
  // headlines" (2026-08-04). cards-return keeps its headline, its angle and its copy.
  it('cards-come-back DUPLICATES the cards-return headline on purpose', () => {
    expect(HEADLINES['cards-return']).toBe('Will he come back?');
    expect(HEADLINES['cards-come-back']).toBe(HEADLINES['cards-return']);
    // …but they are separate hooks, so the ad URLs and the reporting stay distinct.
    expect('cards-come-back').not.toBe('cards-return');
  });

  it('leaves cards-return in decode-him — it is NOT absorbed into the reunion angle', () => {
    expect(angleForHook('cards-return')).toBe('decode-him');
    expect(REUNION_HOOKS).not.toContain('cards-return');
    // Consequence, recorded deliberately: an angle=reunion filter EXCLUDES the original
    // lander, so comparing the two "Will he come back?" pages is a HOOK-level breakdown.
  });

  // The signed-off (2026-07-28) reads on the live lander, pinned verbatim. If a future
  // edit to a neighbouring hook rewrites these, this fails rather than shipping silently.
  it('cards-return keeps its signed-off reads on both of its live decks', () => {
    const live = DECKS[DECK].reads['cards-return']!;
    expect(live.a[2]).toBe(
      "The Magician doesn't promise a knock at the door — it says he has the power to return if he chooses it, and the pull you still feel between you is not one-sided."
    );
    expect(live.b[2]).toBe(
      "The Hanged Man doesn't promise a return — it says this is unresolved rather than finished, and the part of you that refuses to call it over is reading the situation accurately."
    );
    expect(live.c[2]).toBe(
      "The Fool doesn't mean he's gone for good — it points to a road still open rather than a door closed; if something does come of this, it begins fresh rather than picking up where it broke."
    );
    // The face-up lander (?hook=cards-return&deck=arcana-mfh) is live too and untouched.
    expect(DECKS['arcana-mfh'].reads['cards-return'], 'the face-up cards-return lander vanished').toBeTruthy();
  });

  it('the opener question invites HER account and never asks for a forecast', () => {
    for (const h of REUNION_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener must invite her account`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
    }
  });

  // The two "Will he come back?" landers must differ from the very first line she reads —
  // that is the entire point of running both.
  it('cards-come-back does not reuse the cards-return opener question', () => {
    expect(openerCStart(DECK, 'cards-come-back', 'a')[1]).not.toBe(
      openerCStart(DECK, 'cards-return', 'a')[1]
    );
  });

  // Not an oversight — a scope decision (operator: "Yes Face down only"), recorded here so
  // a later port is deliberate and a silent half-port fails loudly.
  it('is FACE-DOWN ONLY — not ported to the face-up deck', () => {
    for (const h of REUNION_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — reunion reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = REUNION_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !REUNION_HOOKS.includes(h));

  it('every reunion read has all 3 cards and the full 4-beat structure', () => {
    for (const h of present) {
      for (const c of CARDS) {
        expect(reads[h]![c], `${h}/${c} missing`).toBeTruthy();
        expect(reads[h]![c], `${h}/${c} is not 4 beats`).toHaveLength(4);
        for (const beat of reads[h]![c]) expect(beat.trim().length).toBeGreaterThan(20);
      }
    }
  });

  // Beat 3 is the READ. Beats 1/2/4 necessarily share the mandated template, so comparing
  // them would only ever produce noise.
  it('beat 3 shares no 6-word run with any EXISTING hook on this deck', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of existing) {
      for (const r of shared(reads[nh]![c][2], reads[oh]![c][2])) found.push(`${nh}/${c} ~ ${oh}/${c}: "${r}"`);
    }
    expect(found, `recycled wording:\n${found.join('\n')}`).toEqual([]);
  });

  // Called out separately from the sweep above because this is the whole experiment: same
  // headline, same deck, same card — if beat 3 rhymes with cards-return there is nothing
  // to measure.
  it('beat 3 shares no 6-word run with cards-return, the lander it is testing against', () => {
    const found: string[] = [];
    for (const c of CARDS) {
      for (const r of shared(reads['cards-come-back']![c][2], reads['cards-return']![c][2]))
        found.push(`cards-come-back/${c}: "${r}"`);
    }
    expect(found, `the copy test has no variable:\n${found.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run BETWEEN the three reunion hooks either', () => {
    const found: string[] = [];
    for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) for (const c of CARDS) {
      for (const r of shared(reads[present[i]]![c][2], reads[present[j]]![c][2]))
        found.push(`${present[i]}/${c} ~ ${present[j]}/${c}: "${r}"`);
    }
    expect(found, `reunion hooks repeat each other:\n${found.join('\n')}`).toEqual([]);
  });

  it('every card framing on the deck is distinct across all hooks', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const h of [...existing, ...present]) for (const c of CARDS) {
      const opener = reads[h]![c][0];
      if (seen.has(opener)) dupes.push(`${h}/${c} == ${seen.get(opener)}`);
      seen.set(opener, `${h}/${c}`);
    }
    expect(dupes, dupes.join('\n')).toEqual([]);
  });

  it('opener phrasing matches the facing — she TURNED a face-down card', () => {
    expect(DECKS[DECK].facing).toBe('down');
    for (const h of present) for (const c of CARDS) {
      const opener = reads[h]![c][0];
      expect(opener, `${h}/${c} opener is "${opener.slice(0, 24)}…"`).toMatch(/^You turned /);
    }
  });

  // ── The compliance core ────────────────────────────────────────────────────
  const NEGATOR = /\b(no|not|never|n't|nor|rather than|instead of|does not|is not)\b/i;
  const clausesOf = (s: string) => s.split(/[—;:,]/);

  it('never forecasts the outcome, in EITHER direction', () => {
    // Harmful only when asserted — checked per clause, skipped when negated. "hands down
    // no ruling that he is coming back" is correct copy; the bare clause is a forecast.
    const ASSERTIONS: Array<[RegExp, string]> = [
      [/\bhe (will|is going to) (come back|return)\b/i, 'promise: forecasts a return'],
      [/\bhe (is|will be) coming back\b/i, 'promise: forecasts a return'],
      [/\byou will (get|have|win) him back\b/i, 'promise: forecasts a return'],
      [/\bhe (will|does) come back to you\b/i, 'promise: forecasts a return'],
      [/\bhe has moved on\b/i, 'pronouncement: declares him gone'],
      [/\bhe (is|was) gone for good\b/i, 'pronouncement: declares him gone'],
      [/\bhe (will|is) never (come back|coming back|returning)\b/i, 'pronouncement: declares him gone'],
      [/\bit (is|was) over between you\b/i, 'pronouncement: declares it finished'],
    ];
    // Harmful in any framing. The first is the exact line the 2026-07-30 face-up fix
    // removed — it predicted a return outright and is blanket-banned across every deck
    // and hook (tests/fb-tarot-card-draw.spec.ts). Repeated here so this angle, the one
    // most tempted by it, fails in its own suite too.
    const ALWAYS: Array<[RegExp, string]> = [
      [/what comes back often comes back/i, 'the 2026-07-30 rejected prediction phrasing'],
      [/\bI promise\b/i, 'a promise the funnel cannot keep'],
      [/\bguarantee[sd]? (you )?(that )?he\b/i, 'a guarantee about him'],
      [/\bcertain to (return|come back)\b/i, 'certainty about the outcome'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of ALWAYS) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat}"`);
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of ASSERTIONS) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, `forecast language:\n${hits.join('\n')}`).toEqual([]);
  });

  // The headline hands over an either-or. Answering either half is the failure.
  it('cards-moved-on refuses the binary rather than picking a side', () => {
    const beats = CARDS.map((c) => reads['cards-moved-on']![c][2]);
    for (const beat of beats) {
      expect(beat, `must decline the either-or: "${beat.slice(0, 48)}…"`).toMatch(
        /\b(refuses|will not|declines|no|not)\b/i
      );
    }
  });

  it('never lands as HER fault and never gives a timeframe', () => {
    const ASSERTIONS: Array<[RegExp, string]> = [
      [/\b(naive|naivety|naivete|gullible)\b/i, 'blames her judgment'],
      [/\btoo trusting\b/i, 'blames her trust'],
      [/\bshould have (known|seen|moved on|let go)\b/i, 'blames her for not seeing'],
      [/\byour own fault\b/i, 'blames her'],
      [/\bfoolish\b/i, 'calls her foolish'],
      [/\bwasted your (time|years|life)\b/i, 'calls her waiting wasted'],
      [/\bclinging\b/i, 'calls her clinging'],
      [/\bdesperate\b/i, 'calls her desperate'],
    ];
    const ALWAYS: Array<[RegExp, string]> = [
      [/\bwithin (a|the|\d)/i, 'timeframe'],
      [/\bin (a few|the next|\d+) (day|week|month|year)/i, 'timeframe'],
      [/\bsoon\b/i, 'timeframe'],
      [/\bany day now\b/i, 'timeframe'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of ALWAYS) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat}"`);
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of ASSERTIONS) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, `blame/timeframe language:\n${hits.join('\n')}`).toEqual([]);
  });

  it('carries no exclamation marks, emoji, prices or urgency', () => {
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      if (/!/.test(beat)) hits.push(`${h}/${c}: exclamation mark`);
      if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(beat)) hits.push(`${h}/${c}: emoji`);
      if (/\$\d|\bdiscount\b|\boffer\b|\bhurry\b|\blimited\b/i.test(beat)) hits.push(`${h}/${c}: offer/urgency`);
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });
});
