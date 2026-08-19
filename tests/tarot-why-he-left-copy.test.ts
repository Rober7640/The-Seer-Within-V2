// Copy guards for the /fb-tarot WHY-HE-LEFT hooks (2026-08-11).
//
// THREE headlines on the FACE-DOWN return-mhf deck: 'Why did he leave without a word?',
// 'Why did he ghost me?', 'Was I not enough for him to stay?'
//
// Why this angle needs its own guard file, beyond the generic ones:
//
//  1. 🔴🔴 THE MOTIVE BAN IS THE COMMISSION, and NO LIVE FAMILY CARRIES IT. All three headlines
//     ask why a man did something he never explained. The shared decode-him guard names four
//     forbidden claims — lying, faithful, involved with someone else, coming back — and every
//     one of these headlines asks for a FIFTH it does not name. "He was frightened", "he was
//     overwhelmed", "he never valued you" are flat verdicts on a man's interior and all three
//     would pass the shared guard untouched. Refusing to supply a reason IS the reading.
//
//  2. 🔴🔴 THE DIAGNOSIS is the motive wearing a clinical coat, and it is the single most
//     available answer on the internet to "why did he ghost me": narcissist, avoidant,
//     commitment-phobe, emotionally unavailable. Banned separately from the motive because it
//     reads as expertise rather than as a guess, which is exactly what makes it persuasive.
//
//  3. 🔴🔴 NEVER PRESUME HE CHOSE IT. A man who falls silent may have died, been taken ill or
//     be in trouble; "ghosted" is HER account of the silence, not a fact in evidence. So the
//     reads work with THE SILENCE only, and the mediumship failure mode of the
//     soulmate-after-loss family applies here with no frame to carry it — same gap as
//     `missing-him` (2026-08-10): this family runs under decode-him, which bans none of it, and
//     universalSafety.ts screens none of it either.
//
//  4. 🔴🔴 NO TACTIC, IN EITHER DIRECTION. "Why did he ghost me" has the most saturated wrong
//     answer on the internet attached to it — reach out once more, send this, check whether he
//     read it — and its mirror is just as forbidden: telling her he is gone for good is a
//     prediction wearing the clothes of advice.
//
//  5. 🔴🔴 'cards-not-enough' PUTS HER OWN WORTH IN THE QUESTION — the first headline on the
//     funnel to do so — and asks a stranger to rule on it. The comparison is REFUSED, never
//     scored: "you were not enough" is unthinkable, and "you WERE enough" is kind and is still
//     a claim about why he went. No measurement was taken, so no result on her exists.
//
//  6. 🔴 NO SIXTH FRAME WAS ADDED — deliberately, as with `missing-him` (the frame ternary in
//     buildTarotReflectPrompt is documented as being at its limit; the lookup refactor is owed
//     as its own change). The cost is that EVERY ban above lives in the three
//     TAROT_HOOK_TENDENCY strings rather than in a guard clause, so the prompt-surface block
//     below asserts each one string-by-string instead of trusting a frame to supply it.
//
//  7. IT MUST NOT COLLAPSE INTO `reunion`. That family is live and asks about the same man —
//     but forwards ("will he come back?") where these ask backwards ("why did he go?"). Zero
//     shared 6-word runs in beat 3 is what keeps that honest.
//
// 🔴 Negation-aware by construction, as in every sibling guard: the reads state their bans as
// refusals ("I will not tell you what was in his head"), so a naive regex fails on CORRECT copy.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  WHY_HE_LEFT_HOOKS,
  REUNION_HOOKS,
  RECONCILIATION_HOOKS,
  PULLING_AWAY_HOOKS,
  HEALING_HOOKS,
  MISSING_HIM_HOOKS,
  SELF_FRAME_HOOKS,
  TAROT_HOOKS,
  HEADLINES,
  angleForHook,
  openerCStart,
} = await import('@/content/tarotReads');

const DECK = 'return-mhf' as const;
const CARDS = ['a', 'b', 'c'] as const;

// 🔴 THE MANNER OF HIS GOING. Banned outright rather than clause-level: naming it plants the
// premise even inside a denial ("this is not about him walking out" still says walking out).
// She has not said which she is and the copy must not sort her.
const MANNER = /\b(breakup|broke up|break-?up|dumped|he left you|walked out|abandoned you|split up|divorce[d]?|died|death|dead|passed away|funeral|grave|widow(ed)?)\b/i;

// 🔴 MEDIUMSHIP. Also outright — no frame bans it for this family.
const MEDIUM = /\b(at peace|watching over|looking down on|in a better place|crossed over|the other side|he sent you|from beyond|his spirit|his soul)\b/i;

// 🔴🔴 THE MOTIVE, in every register it turns up in. Asserted at CLAUSE level and skipped in
// negated clauses, because the reads name the banned thing in order to refuse it.
const MOTIVE: Array<[RegExp, string]> = [
  [/\bhe (was|felt|got) (scared|afraid|frightened|overwhelmed|confused|bored|ashamed|guilty)\b/i, 'supplies his state of mind'],
  [/\bhe (could not|couldn't|was unable to) (cope|handle|face|commit)\b/i, 'supplies his reason'],
  [/\bhe (never|did not|didn't) (love|value|deserve|appreciate) you\b/i, 'verdict on his feeling'],
  [/\bhe (was|is) (a coward|cruel|selfish|weak|immature|broken|damaged|a user)\b/i, 'verdict on his person'],
  [/\bhe (left|went|disappeared|pulled away) because\b/i, 'states a reason outright'],
  [/\bthe reason (he|for his)\b/i, 'states a reason outright'],
  [/\bwhat he (was really|was actually) (feeling|thinking)\b/i, 'claims his interior'],
  [/\bhe (was|had) (met|found) someone\b/i, 'invents a third person'],
  [/\bit was never about you\b/i, 'a motive claim wearing reassurance'],
  [/\bhe was protecting you\b/i, 'a motive claim wearing kindness'],
];

// 🔴🔴 THE DIAGNOSIS — the motive in a clinical coat, and the most confident-sounding wrong
// answer a model can produce for these three headlines.
const DIAGNOSIS = /\b(narcissist(ic)?|sociopath|avoidant|anxious attachment|attachment (style|issue|disorder)|commitment[- ]phobe|emotionally unavailable|love[- ]bomb|breadcrumb|gaslight)/i;

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const runsOf = (s: string, n = 6) => {
  const w = words(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
};
const shared = (a: string, b: string) => [...runsOf(a)].filter((r) => runsOf(b).has(r));

describe('why-he-left hooks are wired end to end', () => {
  it('all three hooks are in the roster, have headlines, and report angle=why-he-left', () => {
    expect(WHY_HE_LEFT_HOOKS.length).toBe(3);
    for (const h of WHY_HE_LEFT_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=why-he-left`).toBe('why-he-left');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-left-without-word']).toBe('Why did he leave without a word?');
    expect(HEADLINES['cards-ghosted']).toBe('Why did he ghost me?');
    expect(HEADLINES['cards-not-enough']).toBe('Was I not enough for him to stay?');
  });

  // 🔴 The whole reason for a separate angle. The operator's CATEGORY is "Reunion/Return", and
  // filing on the category rather than the topic would mix "why did he go" into numbers that
  // have been answering "will he come back" since 2026-08-04.
  it('is not merged into reunion, and reunion is left exactly as it was', () => {
    for (const h of WHY_HE_LEFT_HOOKS) {
      expect(REUNION_HOOKS, `${h} leaked into reunion`).not.toContain(h);
      expect(RECONCILIATION_HOOKS, `${h} leaked into reconciliation`).not.toContain(h);
      // 🔴 pulling-away is the only family about a man who is STILL THERE. These three have no
      // ongoing behaviour to read at all, only the silence he left.
      expect(PULLING_AWAY_HOOKS, `${h} leaked into pulling-away`).not.toContain(h);
      expect(HEALING_HOOKS, `${h} leaked into healing`).not.toContain(h);
      expect(MISSING_HIM_HOOKS, `${h} leaked into missing-him`).not.toContain(h);
      // 🔴 A real man is in the picture — including in 'cards-not-enough', which is only
      // PHRASED about her. Filing any of these as self-frame swaps the no-verdict guard for
      // "affirm the hopeful yes with CERTAINTY", which here would mean certainty about why a
      // man went silent.
      expect(SELF_FRAME_HOOKS, `${h} leaked into self-frame`).not.toContain(h);
    }
    expect(REUNION_HOOKS.length, 'REUNION_HOOKS must stay exactly three').toBe(3);
    expect(RECONCILIATION_HOOKS.length, 'RECONCILIATION_HOOKS must stay exactly three').toBe(3);
    expect(angleForHook('cards-come-back')).toBe('reunion');
    expect(angleForHook('cards-ever-back')).toBe('reunion');
    expect(angleForHook('cards-moved-on')).toBe('reunion');
  });

  it('reuses no existing hook id and no existing headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    const others = TAROT_HOOKS.filter((h) => !WHY_HE_LEFT_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of WHY_HE_LEFT_HOOKS) {
      expect(others, `${h} headline collides with an existing lander`).not.toContain(HEADLINES[h]);
    }
  });

  it('leaves every previously shipped family exactly where it was', () => {
    expect(angleForHook('cards-honest')).toBe('decode-him');
    expect(angleForHook('cards-return')).toBe('decode-him');
    expect(angleForHook('cards-misled')).toBe('trust');
    expect(angleForHook('cards-lied-to')).toBe('honesty');
    expect(angleForHook('cards-will-commit')).toBe('commitment');
    expect(angleForHook('cards-cant-stop')).toBe('healing');
    expect(angleForHook('cards-pulling-away')).toBe('pulling-away');
    expect(angleForHook('cards-back-together')).toBe('reconciliation');
    expect(angleForHook('cards-new-soulmate')).toBe('soulmate-after-loss');
    expect(angleForHook('cards-where-soulmate')).toBe('soulmate-where');
    expect(angleForHook('cards-alone-forever')).toBe('loneliness');
    expect(angleForHook('cards-someone-else')).toBe('fidelity');
    expect(angleForHook('cards-stop-hurting')).toBe('missing-him');
    expect(angleForHook('cards-love-again')).toBe('self-frame');
  });

  // 🔴 The openers may not invite her to THEORISE. She has been guessing for weeks; one more
  // theory in her own words hands the model a motive to confirm, which is the banned thing.
  it('the openers ask for first-hand detail, never for a theory about him', () => {
    for (const h of WHY_HE_LEFT_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      expect(q, `${h} opener asks her to theorise his motive`).not.toMatch(
        /why do you think|what do you think (he|his|was going)|what was going through his|what made him|do you think he/i,
      );
      // 🔴 No manufactured despair — binding hardest on 'cards-not-enough', whose headline
      // already contains the self-accusation. Asking what she lacked would produce the exact
      // phrasings SOFT_CRISIS_PATTERNS screens for, on a page that asked for them.
      expect(q, `${h} opener fishes for despair or for her deficits`).not.toMatch(
        /how (bad|much|painful)|what (did|do) you (lack|lose)|what was wrong with|worst|unbearable|hopeless|cry|blame yourself/i,
      );
      expect(q, `${h} opener presumes the manner of his going`).not.toMatch(MANNER);
    }
  });

  // ⚠ The nearest live openers. Sharing wording collapses the families at the first line.
  it('the openers rhyme with none of the reunion or pulling-away openers', () => {
    const body = (s: string) => s.replace(/^Before I look closer, tell me…\s*/, '');
    for (const h of WHY_HE_LEFT_HOOKS) for (const oh of [...REUNION_HOOKS, ...PULLING_AWAY_HOOKS]) {
      expect(
        shared(body(openerCStart(DECK, h, 'a')[1]), body(openerCStart(DECK, oh, 'a')[1])),
        `${h} opener rhymes with ${oh}`,
      ).toEqual([]);
    }
  });

  // ⭐⭐ THE FOUR-SURFACE FLAGGED-WORD SWEEP, carried over from the fidelity commission
  // (2026-08-07). The ad platform reviews the LANDING PAGE, not just the ad, and the hook slug
  // travels in the destination URL — so headline, slug, opener and every read beat all count.
  //
  // ⚠ This family's exposure is SELF-WORTH vocabulary. 'cards-not-enough' is a first-person
  // statement of inadequacy, which is the register the platform's personal-attributes review
  // looks at, and it is also the register that shades into clinical-distress language.
  it('no platform-flagged term on any of the four surfaces', () => {
    const FLAGGED = /\b(cheat\w*|affairs?|infidelity|suicid\w*|kill yourself|self[- ]harm|depress\w*|worthless|hopeless|breakdown|abus\w*)\b/i;
    const hits: string[] = [];
    for (const h of WHY_HE_LEFT_HOOKS) {
      const surfaces: Array<[string, string]> = [
        ['slug', h],
        ['headline', HEADLINES[h]],
        ['opener', openerCStart(DECK, h, 'a')[1]],
      ];
      for (const c of CARDS) {
        DECKS[DECK].reads[h]![c].forEach((beat, i) => surfaces.push([`read ${c} beat ${i + 1}`, beat]));
      }
      for (const [what, s] of surfaces) {
        const m = s.match(FLAGGED);
        if (m) hits.push(`${h} ${what}: "${m[0]}"`);
      }
    }
    expect(hits, `flagged term on a reviewed surface:\n${hits.join('\n')}`).toEqual([]);
  });

  it('is FACE-DOWN ONLY — not ported to the face-up decks', () => {
    for (const h of WHY_HE_LEFT_HOOKS) {
      // 🔑 A hook with no reads on the resolved deck silently falls back to DEFAULT_HOOK, so
      // PostHog would report every visitor on the new ad as cards-honest. This is that gate.
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — why-he-left reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = WHY_HE_LEFT_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !WHY_HE_LEFT_HOOKS.includes(h));

  it('every read has all 3 cards and the full 4-beat structure', () => {
    expect(present.length).toBe(3);
    for (const h of present) {
      for (const c of CARDS) {
        expect(reads[h]![c], `${h}/${c} missing`).toBeTruthy();
        expect(reads[h]![c], `${h}/${c} is not 4 beats`).toHaveLength(4);
        for (const beat of reads[h]![c]) expect(beat.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it('opener phrasing matches the facing — she TURNED a face-down card', () => {
    expect(DECKS[DECK].facing).toBe('down');
    for (const h of present) for (const c of CARDS) {
      expect(reads[h]![c][0], `${h}/${c}`).toMatch(/^You turned /);
      expect(reads[h]![c][3], `${h}/${c} beat 4 must hand into the deeper reading`).toMatch(/^Let me look closer at /);
    }
  });

  // ── The compliance core ────────────────────────────────────────────────────
  const NEGATOR = /\b(no|not|never|none|nobody|no one|cannot|can't|unable|n't|nor|rather than|instead of|does not|is not|nothing|neither|without)\b/i;
  // 🔴 FIXED 2026-08-19 — this used to split on /[—;:,]/ only, which does NOT break on a
  // full stop or a newline. Beat 3 carries four bubbles joined by '\n' since the migration, so
  // a single negator in the first of them ('it was never you') put the whole of the remaining
  // three behind the negation exemption and every clause ban in them was skipped silently.
  // Found by feeding the gate a deliberate violation rather than trusting its green tick.
  const clausesOf = (s: string) => s.split(/[—;:,.\n]/);

  const scan = (always: Array<[RegExp, string]>, clauseLevel: Array<[RegExp, string]>) => {
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of always) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat}"`);
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of clauseLevel) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    return hits;
  };

  // ⭐⭐ THE COMMISSION. All three headlines ask for a reason; none may be supplied.
  it('never supplies a MOTIVE for his going', () => {
    const hits = scan([], MOTIVE);
    expect(hits, `supplies a motive:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ The motive in a clinical coat. Banned outright — a denial still plants the label.
  it('never DIAGNOSES him', () => {
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const [i, beat] of reads[h]![c].entries()) {
      if (DIAGNOSIS.test(beat)) hits.push(`${h}/${c} beat ${i + 1}: "${beat}"`);
    }
    expect(hits, `clinical label on him:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ She may be bereaved and the headlines do not ask. "Ghosted" is her account, not a fact.
  it('never states or implies he CHOSE the silence, or how he came to be gone', () => {
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const [i, beat] of reads[h]![c].entries()) {
      if (MANNER.test(beat)) hits.push(`${h}/${c} beat ${i + 1}: "${beat}"`);
    }
    expect(hits, `presumes the manner of his going:\n${hits.join('\n')}`).toEqual([]);

    const chose = scan([], [
      [/\bhe (chose|decided|made the choice) to\b/i, 'states he chose it'],
      [/\bhe (walked|turned his back|gave up on you)\b/i, 'states he chose it'],
    ]);
    expect(chose, `states he chose it:\n${chose.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ No frame carries this ban for this family — see the header note.
  it('never speaks for him, and never speaks for the dead', () => {
    const mediumHits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const [i, beat] of reads[h]![c].entries()) {
      if (MEDIUM.test(beat)) mediumHits.push(`${h}/${c} beat ${i + 1}: "${beat}"`);
    }
    expect(mediumHits, `MEDIUMSHIP on a family with no frame to ban it:\n${mediumHits.join('\n')}`).toEqual([]);

    const hits = scan([], [
      [/\bhe (is|must be) thinking (of|about) you\b/i, 'claims his thoughts'],
      [/\bhe (misses|regrets|is sorry)\b/i, 'claims his feeling'],
      [/\bhe (will|is going to) (come back|return|explain|reach out)\b/i, 'forecasts him'],
      [/\bhe (will|is) never (coming back|going to explain)\b/i, 'forecasts the other way'],
      [/\byou (will|'ll) (get|have) (your )?(answers?|closure|an explanation)\b/i, 'promises an explanation'],
      [/\byou are still connected\b/i, 'asserts a bond'],
    ]);
    expect(hits, `speaks for him or forecasts him:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ Both directions. Chasing him is the internet's answer; declaring him gone is a forecast.
  it('never hands her a TACTIC, in either direction', () => {
    const hits = scan([], [
      [/\b(reach out|message him|text him|call him|send him|one last)\b/i, 'a tactic: contact'],
      [/\bcheck (if|whether) he\b/i, 'a tactic: surveillance'],
      [/\b(block|delete|unfollow) (him|his)\b/i, 'a tactic: the mirror image'],
      [/\bno[- ]contact\b/i, 'a tactic'],
      [/\byou (need|have) to (accept|move on|let (him )?go|stop (waiting|trying))\b/i, 'directive'],
      [/\bit('s| is) time to (move on|let (him )?go|accept)\b/i, 'directive'],
      [/\b(find|get|seek) closure\b/i, 'directive'],
      [/\bwork on yourself\b/i, 'coaching, not a reading'],
    ]);
    expect(hits, `tactic or directive:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ 'cards-not-enough' only. THE COMPARISON IS REFUSED, NEVER SCORED — including the kind
  // direction, because "you were enough" is still a claim about why he went.
  it('cards-not-enough refuses the comparison rather than scoring it', () => {
    const beats = CARDS.flatMap((c) => reads['cards-not-enough']![c]);
    const hits: string[] = [];
    const BANS: Array<[RegExp, string]> = [
      [/\byou were (more than )?enough\b/i, 'scores the comparison — still a claim about why he went'],
      [/\byou were not enough\b/i, 'scores the comparison'],
      [/\byou (gave|loved) too (much|hard|deeply)\b/i, 'a verdict on her wearing sympathy'],
      [/\byou lost yourself\b/i, 'a verdict on her wearing sympathy'],
      [/\byou (should have|could have|needed to)\b/i, 'enumerates what she should have done'],
      [/\bif you had (only )?\b/i, 'enumerates what she should have done'],
      [/\b(low )?self[- ]worth\b/i, 'lands as her deficiency'],
      [/\byour (poor |weak )?boundaries\b/i, 'lands as her deficiency'],
      [/\b(people[- ]pleas|codependen|too available|too much for him)/i, 'lands as her deficiency'],
      [/\blove yourself (first|more)\b/i, 'coaching, not a reading'],
      [/\bhis loss\b/i, 'a verdict on him wearing comfort'],
      [/\byou (dodged|deserved better|are better off)\b/i, 'a verdict on him wearing comfort'],
    ];
    for (const beat of beats) for (const clause of clausesOf(beat)) {
      if (NEGATOR.test(clause)) continue;
      for (const [re, why] of BANS) if (re.test(clause)) hits.push(`(${why}): "${clause.trim()}"`);
    }
    expect(hits, `scores her worth:\n${hits.join('\n')}`).toEqual([]);
  });

  // ── Distinctness ───────────────────────────────────────────────────────────
  it('beat 3 shares no 6-word run with any EXISTING hook on this deck', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of existing) {
      for (const r of shared(reads[nh]![c][2], reads[oh]![c][2])) found.push(`${nh}/${c} ~ ${oh}/${c}: "${r}"`);
    }
    expect(found, `recycled wording:\n${found.join('\n')}`).toEqual([]);
  });

  // 🔴 Called out separately: reunion is the family these three are measured against, and
  // pulling-away is the one they are most likely to be confused with.
  it('beat 3 shares no 6-word run with the REUNION or PULLING-AWAY families on any card', () => {
    const found: string[] = [];
    for (const nh of present) for (const c1 of CARDS) {
      for (const oh of [...REUNION_HOOKS, ...PULLING_AWAY_HOOKS]) for (const c2 of CARDS) {
        const other = reads[oh]?.[c2];
        if (!other) continue;
        for (const r of shared(reads[nh]![c1][2], other[2])) found.push(`${nh}/${c1} ~ ${oh}/${c2}: "${r}"`);
      }
    }
    expect(found, `rhymes with the live landers it is measured against:\n${found.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run BETWEEN the three hooks either', () => {
    const found: string[] = [];
    for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) for (const c of CARDS) {
      for (const r of shared(reads[present[i]]![c][2], reads[present[j]]![c][2])) {
        found.push(`${present[i]}/${c} ~ ${present[j]}/${c}: "${r}"`);
      }
    }
    expect(found, `the three landers rhyme with each other:\n${found.join('\n')}`).toEqual([]);
  });

  it('every card framing in beat 1 is distinct across the whole deck', () => {
    const framings = new Map<string, string>();
    const dupes: string[] = [];
    for (const h of TAROT_HOOKS) {
      if (!reads[h]) continue;
      for (const c of CARDS) {
        const m = reads[h]![c][0].match(/the card of (.+?)\.?$/i);
        if (!m) continue;
        const key = m[1].toLowerCase().trim();
        if (framings.has(key)) dupes.push(`"${key}" used by both ${framings.get(key)} and ${h}/${c}`);
        else framings.set(key, `${h}/${c}`);
      }
    }
    expect(dupes, dupes.join('\n')).toEqual([]);
  });
});

// ── The generated prompt ─────────────────────────────────────────────────────
// 🔴 THIS BLOCK CARRIES THE WHOLE FAMILY. No sixth frame was added, so the shared decode-him
// guard supplies NONE of the five bans — they live only in the TAROT_HOOK_TENDENCY strings, and
// if one is edited away nothing else catches it.
describe('why-he-left — the generated Version-C prompt', () => {
  const userData = { firstName: 'Sarah', bucket: 'love', timeOfDay: 'evening' };
  const build = async () => (await import('../server/lib/prompts')).buildTarotReflectPrompt;

  it('runs under the decode-him frame and picks up no other angle guard', async () => {
    const buildTarotReflectPrompt = await build();
    const ud = userData as Parameters<typeof buildTarotReflectPrompt>[0];
    for (const h of WHY_HE_LEFT_HOOKS) {
      const p = buildTarotReflectPrompt(ud, DECK, h, 'a', 'It was about three weeks ago.');
      expect(p, `${h} must run under the decode-him guard`).toMatch(/TENDENCY, NEVER A VERDICT/);
      expect(p, `${h} picked up another family's frame`).not.toMatch(
        /Affirm the hopeful yes with warmth and certainty|NEVER PLACE A PERSON|NOTHING IS FATED|NEVER SPEAK FOR THE PERSON SHE LOST/,
      );
      // The hook has to resolve — a missing TAROT_HOOK_CONTEXT entry silently yields ''.
      expect(p, `${h} has no her_situation context`).not.toMatch(/her_situation:\s*\n/);
    }
  });

  // ⭐⭐ The commission, and the ban the shared guard does not carry.
  it('every hook carries the MOTIVE refusal into the prompt', async () => {
    const buildTarotReflectPrompt = await build();
    const ud = userData as Parameters<typeof buildTarotReflectPrompt>[0];
    for (const h of WHY_HE_LEFT_HOOKS) {
      const p = buildTarotReflectPrompt(ud, DECK, h, 'a', 'x');
      expect(p, `${h} prompt does not ban supplying a reason`).toMatch(/NEVER supply/);
      expect(p, `${h} prompt does not ban diagnosing him`).toMatch(/diagnose/i);
    }
    // Named explicitly on the two hooks whose question is literally "why".
    const p1 = buildTarotReflectPrompt(ud, DECK, 'cards-left-without-word', 'a', 'x');
    expect(p1).toMatch(/anyone naming it is inventing it/i);
    const p2 = buildTarotReflectPrompt(ud, DECK, 'cards-ghosted', 'a', 'x');
    expect(p2).toMatch(/the refusal is the reading/i);
  });

  it('every hook bans presuming he chose it, and bans mediumship', async () => {
    const buildTarotReflectPrompt = await build();
    const ud = userData as Parameters<typeof buildTarotReflectPrompt>[0];
    for (const h of WHY_HE_LEFT_HOOKS) {
      const p = buildTarotReflectPrompt(ud, DECK, h, 'a', 'x');
      expect(p, `${h} prompt does not ban presuming he chose it`).toMatch(/chose/i);
      expect(p, `${h} prompt does not ban speaking for the dead`).toMatch(/at peace|for the dead/i);
    }
  });

  it('every hook bans tactics in both directions', async () => {
    const buildTarotReflectPrompt = await build();
    const ud = userData as Parameters<typeof buildTarotReflectPrompt>[0];
    for (const h of WHY_HE_LEFT_HOOKS) {
      const p = buildTarotReflectPrompt(ud, DECK, h, 'a', 'x');
      expect(p, `${h} prompt does not ban tactics`).toMatch(/NEVER (hand her|give her) a tactic/i);
    }
    // 🔴 The mirror image, on the hook that attracts it most.
    const p = buildTarotReflectPrompt(ud, DECK, 'cards-ghosted', 'a', 'x');
    expect(p).toMatch(/never instruct her to stop, to block him or to accept he is gone/i);
  });

  it('cards-not-enough refuses the comparison in BOTH directions', async () => {
    const buildTarotReflectPrompt = await build();
    const ud = userData as Parameters<typeof buildTarotReflectPrompt>[0];
    const p = buildTarotReflectPrompt(ud, DECK, 'cards-not-enough', 'a', 'x');
    expect(p).toMatch(/REFUSE THE COMPARISON, NEVER SCORE IT/);
    // The kind direction is banned too, and that is the easy one to lose in an edit.
    expect(p).toMatch(/NEVER answer that she WAS enough either/);
    expect(p).toMatch(/NEVER enumerate anything she lacked/i);
    expect(p).toMatch(/NEVER tell her she gave too much, loved too hard/i);
  });

  // 🔴 The shared decode-him guard is used by every other angle too. Assert it did not get
  // quietly reworded while this family was being added.
  it('leaves the shared decode-him guard exactly as it was', async () => {
    const buildTarotReflectPrompt = await build();
    const ud = userData as Parameters<typeof buildTarotReflectPrompt>[0];
    const p = buildTarotReflectPrompt(ud, DECK, 'cards-honest', 'a', 'not sure');
    expect(p).toMatch(/Never declare he is lying, faithful, involved with someone else, or coming back as a fact/);
    // The 2026-08-07 fidelity rewording must survive.
    expect(p).not.toMatch(/\bcheating\b/i);
  });
});
