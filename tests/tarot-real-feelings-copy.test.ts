// Copy guards for the /fb-tarot REAL FEELINGS hooks (2026-08-12).
//
// Three headlines on the FACE-DOWN return-mhf deck under the operator's Feelings/Commitment
// FRAME: 'Does he really love me?', 'How does he really feel about me?', and
// 'Does he love me, or am I imagining it?'
//
// ⭐⭐ THIS FAMILY ASKS THE ONE THING THE FUNNEL MOST FIRMLY REFUSES — report a real man's
// heart back to her. Every other family can answer its headline somehow; these three cannot,
// so the whole set is built as a sustained refusal that still has to pay her out. The route
// through is the only honest channel a feeling has: CONDUCT, which she already observes.
//
// ⚠️ 'cards-feel-about-me' IS A PRONOUN VARIANT of the live 'cards-feels' ("about YOU" vs
// "about ME"). Operator call 2026-08-12: ship it as a you/me framing test read HOOK-LEVEL
// against that incumbent. This file pins the incumbent in place as hard as the challenger —
// if 'cards-feels' ever changed angle, the control for the pair would be gone.
//
// 🔴🔴 'cards-feels' IS NOW A CONTROL FOR TWO TESTS AT ONCE — twin-flame's 'cards-twin-feels'
// and this family's 'cards-feel-about-me'. Moving it out of decode-him breaks BOTH in one
// edit. Pinned below.
//
// 🔴🔴 THE COMPARISON IS CONFOUNDED, DELIBERATELY AND UNAVOIDABLY. 'cards-feels' is seeded
// 2026-07-28 copy from before the current guardrails: its reads assert his interior outright
// ("the warmth you've felt from him is intended", "what he feels is real"). Nothing written
// today may do that. So the challenger differs in COPY STANDARD as well as pronoun, and the
// result must be read as "new lander vs old lander", never as a clean pronoun test. It cannot
// be fixed by rewriting the incumbent — that would break the twin-flame control too. A test
// below documents the confound so nobody later reads the number as clean.
//
// Four refusals across all nine reads, and the third and fourth are what make this family
// need its own guard file:
//   1. NEVER narrate his interior (the 'cards-twin-feels' ban, here at its sharpest).
//   2. NEVER diagnose him — avoidant, emotionally unavailable, commitment-phobic — which is
//      the internet's stock answer to all three headlines.
//   3. NEVER grade HER for having loved first (naive, foolish, too much, too soon).
//   4. On 'cards-imagining-it', NEVER walk through EITHER door: "he loves you" narrates his
//      interior, and "you imagined it" is the gaslighting 'cards-feels-off' forbids — except
//      that here the headline actively invites it.
//
// 🔴 Negation-aware by construction: correct copy routinely contains a banned phrase inside
// its own refusal ("I will not tell you that you invented it"), so a naive substring ban
// would fail the very copy it protects.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  REAL_FEELINGS_HOOKS,
  HIDDEN_INTUITION_HOOKS,
  TWIN_FLAME_HOOKS,
  COMMITMENT_HOOKS,
  SELF_FRAME_HOOKS,
  LONELINESS_HOOKS,
  SEARCHING_HOOKS,
  SOULMATE_WHERE_HOOKS,
  SOULMATE_AFTER_LOSS_HOOKS,
  TAROT_HOOKS,
  HEADLINES,
  angleForHook,
  openerCStart,
} = await import('@/content/tarotReads');

const DECK = 'return-mhf' as const;
const CARDS = ['a', 'b', 'c'] as const;
// The incumbent 'cards-feel-about-me' is measured against.
const INCUMBENT = 'cards-feels' as const;

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const runsOf = (s: string, n = 6) => {
  const w = words(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
};
const shared = (a: string, b: string) => [...runsOf(a)].filter((r) => runsOf(b).has(r));

describe('real-feelings hooks are wired end to end', () => {
  it('every hook is in the roster, has a headline, and reports angle=real-feelings', () => {
    expect(REAL_FEELINGS_HOOKS.length).toBe(3);
    for (const h of REAL_FEELINGS_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=real-feelings`).toBe('real-feelings');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-really-love']).toBe('Does he really love me?');
    expect(HEADLINES['cards-feel-about-me']).toBe('How does he really feel about me?');
    expect(HEADLINES['cards-imagining-it']).toBe('Does he love me, or am I imagining it?');
  });

  // ⭐⭐ THE MEASUREMENT PIN. The challenger and its control must stay in different angles, or
  // they land in one bucket and the pronoun test measures nothing.
  it('cards-feel-about-me is separate from the cards-feels incumbent it is measured against', () => {
    expect(angleForHook('cards-feel-about-me')).toBe('real-feelings');
    expect(angleForHook(INCUMBENT)).toBe('decode-him');
    expect(REAL_FEELINGS_HOOKS, 'the incumbent must NOT be in the challenger set').not.toContain(
      INCUMBENT as never,
    );
  });

  // ⭐⭐ 'cards-feels' now controls TWO tests. Moving it breaks both at once.
  it('cards-feels stays in decode-him — it is the control for twin-flame AND this family', () => {
    expect(angleForHook(INCUMBENT)).toBe('decode-him');
    expect(TWIN_FLAME_HOOKS).toContain('cards-twin-feels');
    expect(angleForHook('cards-twin-feels')).toBe('twin-flame');
    // Both challengers point at the same control, and neither may absorb it.
    expect(TWIN_FLAME_HOOKS).not.toContain(INCUMBENT as never);
    expect(REAL_FEELINGS_HOOKS).not.toContain(INCUMBENT as never);
  });

  // ⭐ THE CONFOUND — RESOLVED 2026-08-19, and this test now pins the resolution.
  //
  // It used to assert the OPPOSITE: that the incumbent still carried pre-guardrail copy which
  // narrated his interior ("feelings that are real", "the warmth you've felt from him is
  // intended"), while both challengers were written under the current ban. The comparison was
  // therefore testing old-standard copy against new-standard copy, not the pronoun.
  //
  // The readability migration rewrote cards-feels, this test fired exactly as designed, and the
  // rewrite was corrected in the same pass — the first draft had swapped one breach for another
  // ("He does feel it, dear"), which is why the check below tests the PROPERTY rather than the
  // old wording. Plain English never required the breach: "You haven't been reading coldness,
  // dear. You've been reading a hold." says it at grade 5, about HER reading.
  //
  // 🔴 WHAT THIS MEANS FOR THE TWO COMPARISONS. Both are now clean on copy standard — and both
  // have a BROKEN BASELINE. Anything collected before 2026-08-19 was measured against the old
  // incumbent. Do not pool across that date; restart the comparison from the deploy.
  it('the incumbent no longer states his interior as fact — the confound is gone', () => {
    const inc = DECKS[DECK].reads[INCUMBENT];
    expect(inc, 'incumbent must exist on this deck for the pairing to be real').toBeTruthy();
    // Negation-aware, as in tarot-honesty-copy.test.ts: a REFUSAL ("doesn't mean he's cold") is
    // the safe form this funnel uses everywhere, so only unnegated clauses are checked.
    const NEGATOR = /\b(no|not|never|n't|nor|rather than|instead of)\b/i;
    const ASSERTS_INTERIOR = /\bhe (does feel|feels|cares|loves|wants)\b|\bwhat he feels is\b|\bhis feelings are\b/i;
    const bad: string[] = [];
    for (const c of CARDS) {
      for (const clause of inc![c][2].split(/[—;:.\n]/)) {
        if (NEGATOR.test(clause)) continue;
        if (ASSERTS_INTERIOR.test(clause)) bad.push(`${c}: "${clause.trim()}"`);
      }
    }
    expect(bad, `incumbent narrates his interior again:\n${bad.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ THE SAFETY PIN. A real, specific man stands in all three, so every no-man frame is
  // wrong. 'cards-imagining-it' is the trap: it sounds like it is about her perception, and
  // it is — but the perception is OF A REAL MAN, so the verdict guard must stay on.
  it('keeps the decode-him guards — it is in NO no-man family', () => {
    for (const h of REAL_FEELINGS_HOOKS) {
      expect(SELF_FRAME_HOOKS, `${h} leaked into SELF_FRAME_HOOKS`).not.toContain(h);
      expect(LONELINESS_HOOKS, `${h} leaked into LONELINESS_HOOKS`).not.toContain(h);
      expect(SEARCHING_HOOKS, `${h} leaked into SEARCHING_HOOKS`).not.toContain(h);
      expect(SOULMATE_WHERE_HOOKS, `${h} leaked into soulmate-where`).not.toContain(h);
      expect(SOULMATE_AFTER_LOSS_HOOKS, `${h} leaked into soulmate-after-loss`).not.toContain(h);
    }
  });

  it('is not folded into commitment or hidden-intuition', () => {
    for (const h of REAL_FEELINGS_HOOKS) {
      expect(COMMITMENT_HOOKS, `${h} folded into commitment`).not.toContain(h);
      expect(HIDDEN_INTUITION_HOOKS, `${h} folded into hidden-intuition`).not.toContain(h);
    }
    expect(COMMITMENT_HOOKS).toEqual(['cards-will-commit', 'cards-wont-commit', 'cards-ready-commit']);
    expect(HIDDEN_INTUITION_HOOKS).toEqual(['cards-hiding-something', 'cards-feels-off']);
  });

  it('reuses no existing hook id, and only the intended headline near-collision exists', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    const others = TAROT_HOOKS.filter((h) => !REAL_FEELINGS_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of REAL_FEELINGS_HOOKS) {
      expect(others, `${h} headline exactly duplicates an existing lander`).not.toContain(HEADLINES[h]);
    }
    // The pair differs by ONE WORD and that is the variable under test.
    expect(HEADLINES[INCUMBENT]).toBe('How does he really feel about you?');
    expect(HEADLINES['cards-feel-about-me']).toBe('How does he really feel about me?');
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
    expect(angleForHook('cards-someone-else')).toBe('fidelity');
    expect(angleForHook('cards-stop-missing')).toBe('missing-him');
    expect(angleForHook('cards-ghosted')).toBe('why-he-left');
    expect(angleForHook('cards-stop-searching')).toBe('searching');
    expect(angleForHook('cards-twin-back')).toBe('twin-flame');
    expect(angleForHook('cards-feels-off')).toBe('hidden-intuition');
    expect(angleForHook('cards-love-again')).toBe('self-frame');
  });

  // 🔴 An opener may not ask her to build a case about a real man's feelings, and on
  // 'cards-imagining-it' may not adopt the headline's crueller branch as its premise.
  it('the openers never demand a case, and never presume she imagined it', () => {
    for (const h of REAL_FEELINGS_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      expect(q, `${h} opener demands evidence about him`).not.toMatch(
        /what makes you think he|how do you know he|why do you (think|believe) he/i,
      );
      expect(q, `${h} opener adopts the imagined-it premise`).not.toMatch(
        /imagin|made it up|invent|seeing things|too much into/i,
      );
      expect(q, `${h} opener diagnoses him`).not.toMatch(/avoidant|unavailable|commitment.phobic/i);
    }
    // 🔴 The paired landers must not open alike, or the pronoun is not the only difference.
    // ⚠️ Compare only the part AFTER the shared house prefix — every opener on the funnel
    // begins "Before I look closer, tell me… ", so comparing raw strings always "collides".
    const PREFIX = /^Before I look closer, tell me… /;
    const mine = openerCStart(DECK, 'cards-feel-about-me', 'a')[1].replace(PREFIX, '');
    const theirs = openerCStart(DECK, INCUMBENT, 'a')[1].replace(PREFIX, '');
    expect(shared(mine, theirs), 'paired openers share a 6-word run').toEqual([]);
  });

  it('is FACE-DOWN ONLY — not ported to the face-up decks', () => {
    for (const h of REAL_FEELINGS_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — real-feelings reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = REAL_FEELINGS_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !REAL_FEELINGS_HOOKS.includes(h));

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

  // ⭐ Sharpest version of this check on the funnel: the challenger asks the SAME question as
  // its incumbent with one word changed, so rhyming with it is the likeliest failure — and it
  // would leave the two landers as near-identical pages.
  it('cards-feel-about-me shares no 6-word run with the incumbent it is measured against', () => {
    const found: string[] = [];
    const inc = reads[INCUMBENT];
    for (const c of CARDS) {
      for (const r of shared(reads['cards-feel-about-me']![c][2], inc![c][2])) {
        found.push(`cards-feel-about-me/${c} ~ ${INCUMBENT}/${c}: "${r}"`);
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
    /\b(no|not|never|n't|nor|nobody|no one|none|cannot|rather than|instead of|does not|is not|nothing|refuses?|declines?|will not|would not|withholds?|neither|without|unkindness|flattery)\b/i;
  const clausesOf = (s: string) => s.split(/[—;:,]/);

  // ⚠️ RESTATEMENT EXEMPTION — needed by this family more than any other. Beat 2 routinely
  // repeats HER question back to her ("You asked whether he really loves you"), and
  // 'cards-imagining-it' must name both doors in order to refuse them. Restating a question
  // is not asserting its answer, so a clause that is explicitly framed as HER asking is
  // exempt. Safe because the sweep is clause-level: a real assertion sitting after the
  // restatement ("...and he does") is a separate clause and is still caught.
  const RESTATES = /\byou (asked|came asking|are asking|have offered|arrived asking|came for)\b/i;

  const sweep = (bans: Array<[RegExp, string]>, always: Array<[RegExp, string]> = []) => {
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of always) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat}"`);
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause) || RESTATES.test(clause)) continue;
        for (const [re, why] of bans) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    return hits;
  };

  // 🔴🔴 BAN #1 — the family's central refusal. This is the whole reason it exists.
  it('NEVER narrates his interior, in any direction or any softened form', () => {
    const INTERIOR: Array<[RegExp, string]> = [
      [/\bhe (really |truly |genuinely )?loves you\b/i, 'confession'],
      [/\bhe (does not|doesn't) love you\b/i, 'denial — equally a verdict'],
      [/\bhe (feels|felt) (it|the same|this too|deeply)\b/i, 'narrates his interior'],
      [/\bhis (feelings|heart) (are|is) (real|genuine|there|deep)\b/i, 'asserts his interior'],
      [/\bhe (cares|cared) (about|for) you\b/i, 'narrates his interior'],
      [/\bhe (is|was) (frightened|scared|afraid) (of|to)\b/i, 'the "loves you but scared" dodge'],
      [/\bhe (thinks|dreams) (of|about) you\b/i, 'narrates his interior'],
      [/\bwhat he feels (for|about) you is\b/i, 'reports his heart'],
      [/\bdeep down (he|inside)\b/i, 'claims privileged access'],
    ];
    const hits = sweep(INTERIOR);
    expect(hits, `narrated his interior:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN #2 — the internet's stock answer to all three headlines is still a verdict.
  it('NEVER diagnoses him', () => {
    const DIAGNOSE: Array<[RegExp, string]> = [
      [/\b(emotionally )?unavailable\b/i, 'diagnosis'],
      [/\bavoidant|attachment style|commitment.?phobic\b/i, 'diagnosis'],
      [/\bhe (is|has) (a )?(narcissist|selfish|incapable|broken)\b/i, 'character verdict'],
      [/\bhe (cannot|can't) love\b/i, 'character verdict'],
      [/\bhe is stringing you along\b/i, 'character verdict'],
      [/\bhe is using you\b/i, 'character verdict'],
    ];
    const hits = sweep(DIAGNOSE);
    expect(hits, `diagnosed him:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN #3 — she loved first and arrived half-expecting to be told off for it.
  it('NEVER grades her for having loved first', () => {
    const GRADE: Array<[RegExp, string]> = [
      [/\byou (were|are|have been) (naive|foolish|silly|blind)\b/i, 'grades her'],
      [/\byou gave (too much|too soon|away too)\b/i, 'grades her'],
      [/\byou (should not|shouldn't) have\b/i, 'grades her'],
      [/\b(lesson|learn from this|next time you)\b/i, 'moralises'],
      [/\byou (are|were) (chasing|clinging|desperate)\b/i, 'grades her'],
      [/\blove yourself first\b/i, 'the self-help tactic'],
    ];
    const hits = sweep(GRADE);
    expect(hits, `graded her:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN #4 — 'cards-imagining-it' specifically. BOTH doors shut, and the second one is
  // the gaslighting 'cards-feels-off' forbids — invited here by the headline itself.
  it('NEVER tells her she imagined it, and never treats a feeling as proof', () => {
    const hits: string[] = [];
    const DOORS: Array<[RegExp, string]> = [
      [/\byou (imagined|invented|made) (it|this|the whole thing)\b/i, 'the crueller door'],
      [/\bit (was|is) all in your (head|mind)\b/i, 'gaslights'],
      [/\byou (are|were) seeing (things|what you want)\b/i, 'gaslights'],
      [/\byour (insecurity|anxiety|past hurt|loneliness) (made|created|is)\b/i, 'attributes it to her'],
      [/\b(a )?feeling (that|this) strong (must|is)\b/i, 'treats a feeling as proof'],
      [/\bif you feel it,? (then )?(he|it)\b/i, 'treats a feeling as proof'],
      [/\byour (heart|intuition) (is|was) right about him\b/i, 'certifies her conclusion'],
    ];
    for (const c of CARDS) for (const beat of reads['cards-imagining-it']![c]) {
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause) || RESTATES.test(clause)) continue;
        for (const [re, why] of DOORS) if (re.test(clause)) hits.push(`cards-imagining-it/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, `walked through a banned door:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐ THE AFFIRMATIVE HALF. Having refused the confession, each read must still land
  // something she came for. A family that only refuses is a family that abandons her.
  it('still affirms HER — every read gives her something back', () => {
    for (const h of present) for (const c of CARDS) {
      const beat = reads[h]![c][2];
      expect(beat, `${h}/${c} refuses without affirming her`).toMatch(
        /\bnot naivety\b|\bcapacity\b|\bnot a flaw in you\b|\breflects nothing (whatever )?about you\b|\bmore honestly\b|\bwas not foolish\b|\bnot assembled out of\b|\byou were present\b|\bnot the only two\b|\bis yours\b|\byou are allowed\b|\bnot proof of anything about him\b|\bsomething real\b|\byour own record\b|\bkeeping it a long time\b/i,
      );
    }
  });

  // Standing house rules, checked on every beat regardless of negation.
  it('no dates, no timeframes, no exclamation marks, no emoji, no price or urgency', () => {
    const ALWAYS: Array<[RegExp, string]> = [
      [/!/, 'exclamation mark'],
      [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'emoji'],
      [/\$\d|\bprice\b|\bdiscount\b/i, 'price or offer'],
      [/\b(within|in) (the next )?(a )?(few )?(days?|weeks?|months?)\b/i, 'timeframe'],
      [/\bby (monday|tuesday|wednesday|thursday|friday|saturday|sunday|christmas|the end of)\b/i, 'date'],
      [/\bhe will (come|say|tell|realise|realize)\b/i, 'forecast about him'],
      [/\bhurry|act now|before it(’|')?s too late\b/i, 'urgency'],
    ];
    const hits = sweep([], ALWAYS);
    expect(hits, `house rule broken:\n${hits.join('\n')}`).toEqual([]);
  });
});
