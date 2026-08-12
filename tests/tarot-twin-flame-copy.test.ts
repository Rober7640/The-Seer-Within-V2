// Copy guards for the /fb-tarot TWIN FLAME hooks (2026-08-11).
//
// Three headlines on the FACE-DOWN return-mhf deck: 'Is my twin flame ready for me?',
// 'Does my twin flame feel this too?', 'Is my twin flame coming back to me?'
//
// ⭐⭐ THIS FAMILY IS A VOCABULARY TEST, which no other angle on the funnel is. All three
// are questions already running, with "my twin flame" substituted for "he":
//
//     cards-twin-ready  ~ cards-ready-commit   (commitment)
//     cards-twin-feels  ~ cards-feels          (decode-him)
//     cards-twin-back   ~ cards-ever-back      (reunion)
//
// So the comparison is HOOK-level against three named incumbents in three different
// families. This file pins the incumbents in place as much as it pins the challengers —
// if one of them silently changed angle, the control for that pair would be gone.
//
// Why it needs its own guard file beyond the generic decode-him ones:
//
//  1. 🔴🔴 THE LABEL. All three headlines PRESUPPOSE the bond. Certifying it — "yes, he is
//     your twin flame" — is a verdict on a real, specific person AND an unfalsifiable one,
//     so she can never test it against anything he actually does. It is the claim
//     cards-meant-alone bans, pointed hopefully rather than cruelly. Denying it is equally
//     out. The reads affirm the PULL as real information about her and leave the cosmology
//     alone, the same move cards-not-enough makes on its own premise.
//
//  2. 🔴🔴 THE RUNNER SCRIPT. In the twin-flame community his distance is taught AS PROOF
//     of the connection. A woman who accepts that reads being ignored as evidence she is
//     loved. Nothing anywhere on this funnel bans it, and it is the most harmful sentence
//     this family could produce.
//
//  3. 🔴🔴 THE SEPARATION PHASE + ASCENSION HOMEWORK. "This is a stage of the journey" turns
//     an absence into progress toward a reunion; "he returns once you have healed enough"
//     turns his absence into her failure and hands her an open-ended job. Both are banned
//     in ALL THREE hooks, not only cards-twin-back, because she arrives carrying the whole
//     script whichever headline she clicked.
//
// 🔴 Negation-aware by construction, as in every sibling guard: correct copy here routinely
// contains a banned phrase inside a refusal ("nothing about being apart is doing quiet work
// toward a reunion"), so a naive substring ban would fail the very copy it protects.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  TWIN_FLAME_HOOKS,
  SEARCHING_HOOKS,
  LONELINESS_HOOKS,
  SOULMATE_WHERE_HOOKS,
  SOULMATE_AFTER_LOSS_HOOKS,
  SELF_FRAME_HOOKS,
  REUNION_HOOKS,
  COMMITMENT_HOOKS,
  TAROT_HOOKS,
  HEADLINES,
  angleForHook,
  openerCStart,
} = await import('@/content/tarotReads');

const DECK = 'return-mhf' as const;
const CARDS = ['a', 'b', 'c'] as const;
// The three incumbents each challenger is measured against.
const PAIRS: Array<[string, string]> = [
  ['cards-twin-ready', 'cards-ready-commit'],
  ['cards-twin-feels', 'cards-feels'],
  ['cards-twin-back', 'cards-ever-back'],
];

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const runsOf = (s: string, n = 6) => {
  const w = words(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
};
const shared = (a: string, b: string) => [...runsOf(a)].filter((r) => runsOf(b).has(r));

describe('twin-flame hooks are wired end to end', () => {
  it('every hook is in the roster, has a headline, and reports angle=twin-flame', () => {
    expect(TWIN_FLAME_HOOKS.length).toBe(3);
    for (const h of TWIN_FLAME_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=twin-flame`).toBe('twin-flame');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-twin-ready']).toBe('Is my twin flame ready for me?');
    expect(HEADLINES['cards-twin-feels']).toBe('Does my twin flame feel this too?');
    expect(HEADLINES['cards-twin-back']).toBe('Is my twin flame coming back to me?');
  });

  // ⭐⭐ THE SAFETY PIN. A real, specific man stands in all three, so every no-man frame is
  // wrong: they strip or invert the verdict guard. self-frame in particular would instruct
  // Evelyn to affirm the hopeful yes with CERTAINTY — about a named living person.
  it('keeps the decode-him guards — it is in NO no-man family', () => {
    for (const h of TWIN_FLAME_HOOKS) {
      expect(SELF_FRAME_HOOKS, `${h} leaked into SELF_FRAME_HOOKS`).not.toContain(h);
      expect(LONELINESS_HOOKS, `${h} leaked into LONELINESS_HOOKS`).not.toContain(h);
      expect(SEARCHING_HOOKS, `${h} leaked into SEARCHING_HOOKS`).not.toContain(h);
      expect(SOULMATE_WHERE_HOOKS, `${h} leaked into soulmate-where`).not.toContain(h);
      expect(SOULMATE_AFTER_LOSS_HOOKS, `${h} leaked into soulmate-after-loss`).not.toContain(h);
    }
  });

  // ⭐⭐ THE MEASUREMENT PIN. This is a vocabulary test: each challenger is read against ONE
  // named incumbent. Merge a challenger into its incumbent's family and the two land in the
  // same bucket, which measures nothing.
  it('challengers are separate from the incumbents they are measured against', () => {
    for (const [challenger, incumbent] of PAIRS) {
      expect(angleForHook(challenger as any)).toBe('twin-flame');
      expect(angleForHook(incumbent as any)).not.toBe('twin-flame');
      expect(TWIN_FLAME_HOOKS, `${incumbent} must NOT be in the challenger set`).not.toContain(incumbent as any);
    }
    // The controls must stay exactly where they are, or the pairs lose their baselines.
    expect(angleForHook('cards-ready-commit')).toBe('commitment');
    expect(angleForHook('cards-feels')).toBe('decode-him');
    expect(angleForHook('cards-ever-back')).toBe('reunion');
    expect(COMMITMENT_HOOKS).toContain('cards-ready-commit');
    expect(REUNION_HOOKS).toContain('cards-ever-back');
  });

  // 🔴 The operator asked explicitly for hooks that do not overlap anything shipped.
  it('reuses no existing hook id and no existing headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    const others = TAROT_HOOKS.filter((h) => !TWIN_FLAME_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of TWIN_FLAME_HOOKS) {
      expect(others, `${h} headline collides with an existing lander`).not.toContain(HEADLINES[h]);
    }
    // …and every headline on the funnel is still unique overall.
    const all = TAROT_HOOKS.map((h) => HEADLINES[h]);
    const dupes = all.filter((x, i) => all.indexOf(x) !== i);
    // cards-return / cards-come-back deliberately share one headline (reunion, 2026-08-04).
    expect(new Set(dupes)).toEqual(new Set(['Will he come back?']));
  });

  it('leaves every previously shipped family exactly where it was', () => {
    expect(angleForHook('cards-honest')).toBe('decode-him');
    expect(angleForHook('cards-misled')).toBe('trust');
    expect(angleForHook('cards-lied-to')).toBe('honesty');
    expect(angleForHook('cards-cant-stop')).toBe('healing');
    expect(angleForHook('cards-pulling-away')).toBe('pulling-away');
    expect(angleForHook('cards-back-together')).toBe('reconciliation');
    expect(angleForHook('cards-new-soulmate')).toBe('soulmate-after-loss');
    expect(angleForHook('cards-where-soulmate')).toBe('soulmate-where');
    expect(angleForHook('cards-alone-forever')).toBe('loneliness');
    expect(angleForHook('cards-stop-searching')).toBe('searching');
    expect(angleForHook('cards-ghosted')).toBe('why-he-left');
    expect(angleForHook('cards-love-again')).toBe('self-frame');
  });

  // 🔴 An opener must not hand her the community script. "When did he pull away" or "how
  // long has the separation been" puts the runner narrative in the transcript as the
  // premise for every later turn.
  it('the openers do not hand her the runner / separation script', () => {
    for (const h of TWIN_FLAME_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      expect(q, `${h} opener invites the runner narrative`).not.toMatch(/pull(ed|ing)? away|run(ning|ner)?\b|push(ed|ing)? you away|go(ne)? (cold|quiet)|block(ed)? you/i);
      expect(q, `${h} opener invites the separation script`).not.toMatch(/separation|how long (has|have) (it|you|the)|apart\b/i);
      expect(q, `${h} opener asks her to justify the label`).not.toMatch(/how do you know|what makes you (sure|think)|why do you believe/i);
    }
  });

  it('is FACE-DOWN ONLY — not ported to the face-up decks', () => {
    for (const h of TWIN_FLAME_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — twin-flame reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = TWIN_FLAME_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !TWIN_FLAME_HOOKS.includes(h));

  it('every read has all 3 cards and the full 4-beat structure', () => {
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
    }
  });

  it('beat 4 keeps the open loop into chat', () => {
    for (const h of present) for (const c of CARDS) {
      expect(reads[h]![c][3], `${h}/${c} beat 4`).toMatch(/^Let me look closer at .*…$/);
    }
  });

  // ⭐ Sharpest version of this check on the funnel: each challenger asks the SAME question
  // as its incumbent, so rhyming with it is the likeliest failure — and it would make the
  // vocabulary test measure two near-identical pages.
  it('beat 3 shares no 6-word run with the incumbent it is measured against', () => {
    const found: string[] = [];
    for (const [challenger, incumbent] of PAIRS) for (const c of CARDS) {
      const inc = reads[incumbent as keyof typeof reads];
      if (!inc) continue;
      for (const r of shared(reads[challenger as keyof typeof reads]![c][2], inc[c][2])) {
        found.push(`${challenger}/${c} ~ ${incumbent}/${c}: "${r}"`);
      }
    }
    expect(found, `challenger rhymes with its own control:\n${found.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run with any EXISTING hook on this deck', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of existing) {
      for (const r of shared(reads[nh]![c][2], reads[oh]![c][2])) found.push(`${nh}/${c} ~ ${oh}/${c}: "${r}"`);
    }
    expect(found, `recycled wording:\n${found.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run BETWEEN the three hooks either', () => {
    const found: string[] = [];
    for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) for (const c of CARDS) {
      for (const r of shared(reads[present[i]]![c][2], reads[present[j]]![c][2]))
        found.push(`${present[i]}/${c} ~ ${present[j]}/${c}: "${r}"`);
    }
    expect(found, `hooks repeat each other:\n${found.join('\n')}`).toEqual([]);
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

  // ── The compliance core ────────────────────────────────────────────────────
  const NEGATOR =
    /\b(no|not|never|n't|nor|nobody|no one|none|cannot|rather than|instead of|does not|is not|nothing|refuses?|declines?|will not|would not|withholds?|neither|without)\b/i;
  const clausesOf = (s: string) => s.split(/[—;:,]/);

  const sweep = (bans: Array<[RegExp, string]>, always: Array<[RegExp, string]> = []) => {
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of always) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat}"`);
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of bans) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    return hits;
  };

  // 🔴🔴 NO PRECEDENT #1 — the label is never certified, in either direction.
  it('NEVER certifies (or denies) that he is her twin flame', () => {
    const LABEL: Array<[RegExp, string]> = [
      [/\bhe (is|really is|truly is) your twin flame\b/i, 'certifies the bond as fact'],
      [/\bthis (is|really is) a twin flame\b/i, 'certifies the bond'],
      [/\byes,? he is (the one|your)\b/i, 'certifies'],
      [/\byou two are (fated|destined|meant|bound)\b/i, 'fate claim about a real person'],
      [/\byour souls (are|were)\b/i, 'certifies the cosmology'],
      [/\b(one|two) halves of\b/i, 'certifies the cosmology'],
      [/\bhe (is not|isn't) your twin flame\b/i, 'denies it — equally a verdict'],
      [/\bthe connection is (real|genuine) between you\b/i, 'certifies mutuality as fact'],
    ];
    const hits = sweep(LABEL);
    expect(hits, `certified the label:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 NO PRECEDENT #2 — the runner script. His distance is never evidence of the bond.
  it('NEVER reads his distance as proof of the connection', () => {
    const RUNNER: Array<[RegExp, string]> = [
      [/\bhe (is )?(running|runs)\b/i, 'the runner trope'],
      [/\bthe runner\b/i, 'the runner trope'],
      [/\bhe (pulls|pulled) away because\b/i, 'explains his distance as the bond'],
      [/\bhis (distance|silence|absence) (is|shows|proves|means)\b/i, 'distance read as evidence'],
      [/\b(overwhelmed|frightened|scared) by (the|this) (intensity|connection|bond)\b/i, 'the runner rationale'],
      [/\bhe (feels|felt) it too\b/i, 'narrates his interior'],
      [/\bhe (thinks|dreams) (of|about) you\b/i, 'narrates his interior'],
      [/\bhe (cannot|can't) (stay away|escape|deny)\b/i, 'narrates his interior'],
      [/\bhe (is|will be) drawn back\b/i, 'forecast + narrates him'],
    ];
    const hits = sweep(RUNNER);
    expect(hits, `ran the runner script:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 NO PRECEDENT #3 — separation as a stage, and reunion as her homework.
  it('NEVER frames the absence as a phase, or his return as her homework', () => {
    const SCRIPT: Array<[RegExp, string]> = [
      [/\b(this|the) separation (is|was)\b/i, 'separation as a stage'],
      [/\b(a|the) (phase|stage|chapter) (of|in) (the|your|this) (journey|process|union)\b/i, 'separation script'],
      [/\bpart of (the|your) journey\b/i, 'separation script'],
      [/\bthe universe is (bringing|preparing|aligning)\b/i, 'fate with intentions'],
      [/\bdivine timing\b/i, 'fate + timeframe'],
      [/\bwhen you (have healed|are healed|heal)\b/i, 'his return as her homework'],
      [/\bonce you (have )?(healed|let go|worked on|raised)\b/i, 'his return as her homework'],
      [/\braise your vibration\b/i, 'homework'],
      [/\b(ascend|ascension)\b/i, 'homework'],
      [/\bstop chasing\b/i, 'tactic + her fault'],
      [/\bno contact\b/i, 'tactic'],
      [/\bhe will (come|be) back\b/i, 'forecast'],
      [/\bhe (is|will be) ready\b/i, 'forecast about a real person'],
    ];
    const ALWAYS: Array<[RegExp, string]> = [
      [/\bwithin (a|the|\d)/i, 'timeframe'],
      [/\bin (a few|the next|\d+) (day|week|month|year)/i, 'timeframe'],
      [/\bsoon\b/i, 'timeframe'],
      [/\bwhen the time is right\b/i, 'timeframe dressed as wisdom'],
      [/\bI promise\b/i, 'a promise the funnel cannot keep'],
    ];
    const hits = sweep(SCRIPT, ALWAYS);
    expect(hits, `ran the separation / homework script:\n${hits.join('\n')}`).toEqual([]);
  });

  // Inherited decode-him rule: he is a real person and is never diagnosed or convicted.
  it('never diagnoses him and never hands her a tactic', () => {
    const DECODE: Array<[RegExp, string]> = [
      [/\bhe (is|'s) (avoidant|a narcissist|emotionally unavailable|commitment[- ]phobic)\b/i, 'diagnosis'],
      [/\bhis attachment\b/i, 'diagnosis'],
      [/\bhe (is|'s) (a coward|selfish|using you|toxic)\b/i, 'character verdict'],
      [/\b(send|text|message|call) him\b/i, 'tactic'],
      [/\bgive him (space|time)\b/i, 'tactic'],
      [/\breach out\b/i, 'tactic'],
      [/\blet him go\b/i, 'tactic in the other direction'],
      [/\bmove on\b/i, 'tactic in the other direction'],
    ];
    const hits = sweep(DECODE);
    expect(hits, `diagnosed him or handed her a tactic:\n${hits.join('\n')}`).toEqual([]);
  });

  it('carries no price, urgency, emoji or exclamation', () => {
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      expect(beat, `${h}/${c} exclamation`).not.toMatch(/!/);
      expect(beat, `${h}/${c} price`).not.toMatch(/\$|\bpay\b|\bprice\b|\boffer\b/i);
      expect(beat, `${h}/${c} urgency`).not.toMatch(/\b(hurry|today only|limited|act now|expires)\b/i);
      expect(beat, `${h}/${c} emoji`).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });
});
