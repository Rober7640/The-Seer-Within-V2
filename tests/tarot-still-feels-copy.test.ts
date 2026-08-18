// Copy guards for the /fb-tarot STILL-FEELS hooks (2026-08-14).
//
// Three headlines on the FACE-DOWN return-mhf deck. Operator category: "Reunion/Return" ·
// topic: "Does he still feel it" — and as with `why-he-left`, THE TOPIC IS THE ANGLE, not the
// category: 'Does he still think about me?', 'Does he still love me?', and 'Does he still love
// me, or has he moved on?'
//
// ⭐⭐ THE DEFINING WORD IS "STILL", and it splits every headline into two tenses that must be
// treated in opposite ways:
//   · the PAST tense — that the feeling was real — is CONCEDED by the word itself, may be
//     affirmed outright, and is the family's whole payout. It costs nothing, because it is true.
//   · the PRESENT tense — that it persists in him — is the forbidden claim, in BOTH directions.
// A read that refuses both tenses gives her nothing; a read that asserts the present tense is
// the verdict this funnel exists not to give. The line between them is the family.
//
// 🔴🔴 'cards-still-love' IS ONE WORD FROM THE LIVE 'cards-really-love' (real-feelings, shipped
// 2026-08-12), and the word is the entire difference:
//   · "really" = doubt that what she was given ever AMOUNTED to love — a question about a
//     STANDARD, and the man is typically still present.
//   · "still"  = no doubt that it was love — a question about SURVIVAL, and he has gone.
// The incumbent is UNTOUCHED and stays in `real-feelings` (standing rule: a new headline never
// replaces an old lander). They must stay in different angles or challenger and control land in
// one bucket, and they must share no wording — in particular none of the incumbent's ledger /
// record-she-has-been-keeping / chosen-on-ordinary-days vocabulary. Both pinned below.
//
// 🔴 'cards-love-or-moved-on' SHARES THE VERBATIM CLAUSE "or has he moved on?" with reunion's
// live 'cards-moved-on'. Also untouched, also stays put. Its refusal has to be its OWN, and the
// grounds differ from every other refusal on the funnel:
//   · 'cards-moved-on'      refuses because NEITHER branch is knowable.
//   · 'cards-imagining-it'  refuses because the SECOND branch is cruel.
//   · this one refuses because THE TWO ARE NOT OPPOSITES — moving on is something a person DOES
//     with a life; loving is something that happens IN them. Different axes, never a pair.
//
// Bans specific to this family, on top of the shared decode-him no-verdict guard:
//   1. NEVER assert the present tense in EITHER direction — not "he still loves you", not "he
//      has moved on". The first is a promise the funnel cannot keep; the second is a burial
//      performed on a living man by a stranger.
//   2. NEVER instruct her to move on or let go, and NEVER pathologise the asking (the `healing`
//      family's bans — these headlines invite both far harder, since she is asking about a man
//      who has gone).
//   3. NEVER PRESUME HOW HE WENT. "Does he still love me?" is also what a BEREAVED woman types,
//      and the headlines do not say which. The mediumship ban of `soulmate-after-loss` therefore
//      applies with full force — this family runs under the decode-him frame, which bans none
//      of it (see TAROT_HOOK_TENDENCY in server/lib/prompts.ts, where it is carried per-hook).
//   4. NEVER read his conduct as EVIDENCE for a verdict — the new job, the photograph, the
//      silence. On 'cards-love-or-moved-on' that trap is the very thing the read exists to name.
//
// 🔴 Negation-aware by construction: correct copy here routinely contains a banned phrase inside
// its own refusal ("Not 'he has moved on' — that is a burial"), so a naive substring ban would
// fail the very copy it protects.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  STILL_FEELS_HOOKS,
  REAL_FEELINGS_HOOKS,
  REUNION_HOOKS,
  HEALING_HOOKS,
  MISSING_HIM_HOOKS,
  RECONCILIATION_HOOKS,
  WHY_HE_LEFT_HOOKS,
  HIDDEN_INTUITION_HOOKS,
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
// The two live landers this family is measured against. Neither may move.
const NEAREST = 'cards-really-love' as const; // one word from 'cards-still-love'
const CLAUSE_TWIN = 'cards-moved-on' as const; // shares "or has he moved on?"

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const runsOf = (s: string, n = 6) => {
  const w = words(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
};
const shared = (a: string, b: string) => [...runsOf(a)].filter((r) => runsOf(b).has(r));

describe('still-feels hooks are wired end to end', () => {
  it('every hook is in the roster, has a headline, and reports angle=still-feels', () => {
    expect(STILL_FEELS_HOOKS.length).toBe(3);
    for (const h of STILL_FEELS_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=still-feels`).toBe('still-feels');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-still-think']).toBe('Does he still think about me?');
    expect(HEADLINES['cards-still-love']).toBe('Does he still love me?');
    expect(HEADLINES['cards-love-or-moved-on']).toBe('Does he still love me, or has he moved on?');
  });

  // ⭐⭐ MEASUREMENT PIN #1. One word apart, so pooling them would put a challenger in the same
  // bucket as its nearest control and measure nothing.
  it('cards-still-love stays separate from the cards-really-love incumbent', () => {
    expect(angleForHook('cards-still-love')).toBe('still-feels');
    expect(angleForHook(NEAREST)).toBe('real-feelings');
    expect(STILL_FEELS_HOOKS, 'incumbent must NOT be absorbed').not.toContain(NEAREST as never);
    expect(REAL_FEELINGS_HOOKS, 'challenger must NOT be filed with its control').not.toContain(
      'cards-still-love' as never,
    );
    // The single word under test.
    expect(HEADLINES[NEAREST]).toBe('Does he really love me?');
    expect(HEADLINES['cards-still-love']).toBe('Does he still love me?');
  });

  // ⭐⭐ MEASUREMENT PIN #2. Shares a verbatim clause with a live reunion lander.
  it('cards-love-or-moved-on stays separate from the cards-moved-on incumbent', () => {
    expect(angleForHook('cards-love-or-moved-on')).toBe('still-feels');
    expect(angleForHook(CLAUSE_TWIN)).toBe('reunion');
    expect(HEADLINES[CLAUSE_TWIN]).toBe('Is he coming back, or has he moved on?');
    // Both end on the same clause; the FIRST half is the variable (a feeling vs an action).
    expect(HEADLINES['cards-love-or-moved-on'].endsWith('or has he moved on?')).toBe(true);
    expect(HEADLINES[CLAUSE_TWIN].endsWith('or has he moved on?')).toBe(true);
  });

  // ⭐⭐ The reason this family is not filed under the operator's own category. Same call as
  // `why-he-left` (08-11), `missing-him` vs `healing` (08-10), `reconciliation` vs `reunion`.
  it('REUNION_HOOKS stays exactly three — its 08-04 baseline must stay readable', () => {
    expect(REUNION_HOOKS).toEqual(['cards-come-back', 'cards-ever-back', 'cards-moved-on']);
    for (const h of STILL_FEELS_HOOKS) {
      expect(REUNION_HOOKS, `${h} was folded into reunion`).not.toContain(h);
    }
    // The sibling that made the same call first.
    expect(angleForHook('cards-ghosted')).toBe('why-he-left');
  });

  it('REAL_FEELINGS_HOOKS stays exactly three', () => {
    expect(REAL_FEELINGS_HOOKS).toEqual([
      'cards-really-love',
      'cards-feel-about-me',
      'cards-imagining-it',
    ]);
  });

  // ⭐⭐ SAFETY PIN. A real, specific man stands in all three — gone, but real — so every no-man
  // frame is wrong and would strip the verdict guard off a lander that can convict him.
  it('keeps the decode-him guards — it is in NO no-man family', () => {
    for (const h of STILL_FEELS_HOOKS) {
      expect(SELF_FRAME_HOOKS, `${h} leaked into SELF_FRAME_HOOKS`).not.toContain(h);
      expect(LONELINESS_HOOKS, `${h} leaked into LONELINESS_HOOKS`).not.toContain(h);
      expect(SEARCHING_HOOKS, `${h} leaked into SEARCHING_HOOKS`).not.toContain(h);
      expect(SOULMATE_WHERE_HOOKS, `${h} leaked into soulmate-where`).not.toContain(h);
      expect(SOULMATE_AFTER_LOSS_HOOKS, `${h} leaked into soulmate-after-loss`).not.toContain(h);
    }
  });

  it('is not folded into any neighbouring family', () => {
    for (const h of STILL_FEELS_HOOKS) {
      expect(HEALING_HOOKS, `${h} folded into healing`).not.toContain(h);
      expect(MISSING_HIM_HOOKS, `${h} folded into missing-him`).not.toContain(h);
      expect(RECONCILIATION_HOOKS, `${h} folded into reconciliation`).not.toContain(h);
      expect(WHY_HE_LEFT_HOOKS, `${h} folded into why-he-left`).not.toContain(h);
      expect(HIDDEN_INTUITION_HOOKS, `${h} folded into hidden-intuition`).not.toContain(h);
    }
    // 🔴 The mirror it must not absorb: healing reads HER mind producing HIM;
    // 'cards-still-think' reads whether HIS mind produces HER.
    expect(HEALING_HOOKS).toEqual(['cards-cant-stop', 'cards-on-my-mind', 'cards-who-hurt-me']);
    expect(angleForHook('cards-on-my-mind')).toBe('healing');
  });

  it('reuses no existing hook id, and adds no new duplicate headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    const others = TAROT_HOOKS.filter((h) => !STILL_FEELS_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of STILL_FEELS_HOOKS) {
      expect(others, `${h} headline exactly duplicates an existing lander`).not.toContain(HEADLINES[h]);
    }
    const all = TAROT_HOOKS.map((h) => HEADLINES[h]);
    const dupes = all.filter((x, i) => all.indexOf(x) !== i);
    // cards-return / cards-come-back deliberately share one headline (reunion, 2026-08-04).
    // This family must not add a second collision.
    expect(new Set(dupes)).toEqual(new Set(['Will he come back?']));
  });

  it('leaves every previously shipped family exactly where it was', () => {
    expect(angleForHook('cards-honest')).toBe('decode-him');
    expect(angleForHook('cards-misled')).toBe('trust');
    expect(angleForHook('cards-lied-to')).toBe('honesty');
    expect(angleForHook('cards-come-back')).toBe('reunion');
    expect(angleForHook('cards-cant-stop')).toBe('healing');
    expect(angleForHook('cards-pulling-away')).toBe('pulling-away');
    expect(angleForHook('cards-back-together')).toBe('reconciliation');
    expect(angleForHook('cards-new-soulmate')).toBe('soulmate-after-loss');
    expect(angleForHook('cards-where-soulmate')).toBe('soulmate-where');
    expect(angleForHook('cards-alone-forever')).toBe('loneliness');
    expect(angleForHook('cards-someone-else')).toBe('fidelity');
    expect(angleForHook('cards-stop-missing')).toBe('missing-him');
    expect(angleForHook('cards-stop-searching')).toBe('searching');
    expect(angleForHook('cards-twin-back')).toBe('twin-flame');
    expect(angleForHook('cards-feels-off')).toBe('hidden-intuition');
    expect(angleForHook('cards-really-love')).toBe('real-feelings');
    expect(angleForHook('cards-love-again')).toBe('self-frame');
  });

  // 🔴 An opener may not ask her to build a case about what he feels NOW, may not adopt
  // "he has moved on" as a settled premise, and may not presume how he came to be gone.
  it('the openers demand no case, presume no verdict, and presume no manner of going', () => {
    for (const h of STILL_FEELS_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      expect(q, `${h} opener demands evidence about him`).not.toMatch(
        /what makes you think he|how do you know he|why do you (think|believe) he/i,
      );
      expect(q, `${h} opener presumes how he went`).not.toMatch(
        /passed away|died|death|funeral|dumped you|left you for|when he ghosted/i,
      );
      expect(q, `${h} opener diagnoses him`).not.toMatch(/avoidant|unavailable|commitment.?phobic/i);
    }
    // 🔴 'cards-love-or-moved-on' must NOT reuse its incumbent's both-ways case-building opener.
    const PREFIX = /^Before I look closer, tell me… /;
    const mine = openerCStart(DECK, 'cards-love-or-moved-on', 'a')[1].replace(PREFIX, '');
    const theirs = openerCStart(DECK, CLAUSE_TWIN, 'a')[1].replace(PREFIX, '');
    expect(shared(mine, theirs), 'shares a 6-word run with the cards-moved-on opener').toEqual([]);
    // 🔴 And 'cards-still-love' must not open like the lander it is one word from.
    const mineB = openerCStart(DECK, 'cards-still-love', 'a')[1].replace(PREFIX, '');
    const theirsB = openerCStart(DECK, NEAREST, 'a')[1].replace(PREFIX, '');
    expect(shared(mineB, theirsB), 'shares a 6-word run with the cards-really-love opener').toEqual([]);
  });

  it('is FACE-DOWN ONLY — not ported to the face-up decks', () => {
    for (const h of STILL_FEELS_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — still-feels reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = STILL_FEELS_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !STILL_FEELS_HOOKS.includes(h));

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
    }
  });

  it('beat 4 keeps the open loop into chat', () => {
    for (const h of present) for (const c of CARDS) {
      expect(reads[h]![c][3], `${h}/${c} beat 4`).toMatch(/^Let me look closer at .*…$/);
    }
  });

  it('carries no exclamation marks or emoji (house voice)', () => {
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      expect(beat, `${h}/${c}`).not.toMatch(/!/);
      expect(beat, `${h}/${c}`).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });

  // ⭐⭐ THE SHARPEST RECYCLING CHECK ON THE FUNNEL. 'cards-still-love' asks its incumbent's
  // question with ONE word changed, so rhyming with it is the likeliest failure — and it would
  // leave two near-identical pages measuring nothing.
  it('cards-still-love shares no 6-word run with cards-really-love', () => {
    const found: string[] = [];
    const inc = reads[NEAREST];
    expect(inc, 'incumbent must exist on this deck for the pairing to be real').toBeTruthy();
    // ⚠️ Beats 2 and 3 only. Beat 1 is the house card-naming form ("You turned the Magician,
    // dear — the card of …") and beat 4 the house open-loop form ("Let me look closer at …"),
    // both shared by every hook on the funnel by design; beat-1 distinctness is separately
    // pinned as whole strings by the card-framing test above. Beats 2 and 3 carry the finding,
    // which is the thing that must not be recycled.
    for (const c of CARDS) {
      for (const beat of [1, 2]) {
        for (const r of shared(reads['cards-still-love']![c][beat], inc![c][beat])) {
          found.push(`cards-still-love/${c} beat${beat + 1} ~ ${NEAREST}: "${r}"`);
        }
      }
    }
    expect(found, `challenger rhymes with its nearest control:\n${found.join('\n')}`).toEqual([]);
  });

  // ⭐ The incumbent's SIGNATURE VOCABULARY. Its finding is that the honest answer lives in the
  // record of conduct she has been keeping — a STANDARD question. This family asks about
  // SURVIVAL and must not borrow the frame, or the two landers answer the same way.
  it('borrows none of cards-really-love signature vocabulary', () => {
    const hits: string[] = [];
    const SIGNATURE = [
      /\brecord (you|she) (have|has) been keeping\b/i,
      /\bkeeping (a|the|your|her) (private )?record\b/i,
      /\bchosen on ordinary days\b/i,
      /\bthe ledger\b/i,
      /\bdone on purpose and then done again\b/i,
    ];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const re of SIGNATURE) if (re.test(beat)) hits.push(`${h}/${c}: "${beat}"`);
    }
    expect(hits, `reuses the incumbent's frame:\n${hits.join('\n')}`).toEqual([]);
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
    /\b(no|not|never|n't|nor|nobody|no one|none|cannot|rather than|instead of|does not|is not|nothing|refuses?|declines?|will not|would not|withholds?|neither|without|inventing|invent|manufacture|pretend|flattery|would be)\b/i;
  const clausesOf = (s: string) => s.split(/[—;:,.]/);

  // ⚠️ RESTATEMENT EXEMPTION — beat 2 repeats HER question back ("You asked whether it has
  // lasted"), and 'cards-love-or-moved-on' must NAME both branches in order to refuse them.
  // Restating a question is not asserting its answer. Safe because the sweep is clause-level:
  // a real assertion sitting after the restatement is a separate clause and is still caught.
  const RESTATES = /\byou (asked|came asking|are asking|have (asked|set|put|offered|braced)|came for|handed me|did not come)\b/i;

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

  // 🔴🔴 BAN #1 — the family's central refusal, and it runs in BOTH directions. This is the
  // whole reason the family needs its own guard file.
  it('NEVER asserts the present tense — not that it survived, not that it ended', () => {
    const PRESENT_TENSE: Array<[RegExp, string]> = [
      [/\bhe (still |does still )?loves? you\b/i, 'promises the love survived'],
      [/\bhe (has |had )?moved on\b/i, 'issues the burial'],
      [/\bhe (is|has got) over (you|it)\b/i, 'issues the burial'],
      [/\bhe (has )?forgotten you\b/i, 'issues the burial'],
      [/\bhe (still )?(thinks|dreams) (of|about) you\b/i, 'narrates his interior'],
      [/\byou (still )?cross(es)? his mind\b/i, 'narrates his interior'],
      [/\bhe (still )?misses you\b/i, 'narrates his interior'],
      [/\bhe (still )?(carries|holds) you\b/i, 'narrates his interior'],
      [/\ba part of him (still|will always)\b/i, 'the softened confession'],
      [/\bdeep down (he|inside)\b/i, 'claims privileged access'],
      [/\bwhat he feels (for|about) you is\b/i, 'reports his heart'],
      [/\bhis (feelings|heart) (are|is) (real|genuine|there|gone|dead)\b/i, 'asserts his interior'],
      [/\bhe (is|was) (frightened|scared|afraid) (of|to)\b/i, 'the "loves you but scared" dodge'],
    ];
    const hits = sweep(PRESENT_TENSE);
    expect(hits, `asserted the present tense:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ THE PAYOUT, pinned as a REQUIREMENT rather than a ban. A family that refuses both
  // tenses gives her nothing and the lander dies. The word "still" concedes the past tense —
  // every hook must cash that in somewhere.
  it('DOES affirm the past tense — the one thing "still" makes safe to say', () => {
    const AFFIRMS =
      /\bwas real\b|\bit happened\b|\bthat it happened\b|\byou were half of it\b|\bsettled that\b|\bsomething (real )?(was|happened)\b|\bnot in question\b|\breal when it was made\b|\btake that (first part|away) off you\b/i;
    for (const h of present) {
      const joined = CARDS.map((c) => reads[h]![c].join(' ')).join(' ');
      expect(AFFIRMS.test(joined), `${h} never affirms the past tense — it only refuses`).toBe(true);
    }
  });

  // 🔴 BAN #2 — the `healing` family's two bans, which these headlines invite far harder.
  it('NEVER instructs her to move on, and NEVER pathologises the asking', () => {
    const DIRECTIVE: Array<[RegExp, string]> = [
      [/\byou (need|have) to (let (him|it) go|move on|stop)\b/i, 'directive'],
      [/\bit('s| is) time to (let (him|it) go|move on)\b/i, 'directive'],
      [/\byou should (let (him|it) go|move on|stop (asking|waiting))\b/i, 'directive'],
      [/\b(you are|you're) (obsessed|fixated|stuck|clinging)\b/i, 'pathologising'],
      [/\b(unhealthy|obsessive|codependent|desperate)\b/i, 'pathologising'],
      [/\byou (can't|cannot) let (him|it) go\b/i, 'pathologising'],
    ];
    const hits = sweep(DIRECTIVE);
    expect(hits, `instructed or pathologised:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN #3 — he may be DEAD. Nothing may presume the manner of his going, and the
  // mediumship ban applies in full: this family runs the decode-him frame, which bans none of it.
  it('NEVER presumes how he went, and NEVER crosses into mediumship', () => {
    const PRESUMES: Array<[RegExp, string]> = [
      [/\bhe (chose to |decided to )?(walked?|left) (away|out|you)\b/i, 'presumes he chose to go'],
      [/\bwhen he (dumped|abandoned|discarded) you\b/i, 'presumes the manner of going'],
      [/\bhe (passed away|died)\b/i, 'presumes a death'],
      [/\bhe (is|has) (at peace|crossed over|on the other side)\b/i, 'MEDIUMSHIP'],
      [/\bhe (is )?watch(es|ing) over you\b/i, 'MEDIUMSHIP'],
      [/\bhe would want you to\b/i, 'MEDIUMSHIP / speaks for him'],
      [/\bfrom (the other side|beyond)\b/i, 'MEDIUMSHIP'],
    ];
    const hits = sweep(PRESUMES);
    expect(hits, `presumed the going:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN #4 — reading his conduct as EVIDENCE. On 'cards-love-or-moved-on' this is the exact
  // trap the read exists to name, so producing it would invert the lander.
  it('NEVER reads his conduct as proof of a verdict, and NEVER hands her a tactic', () => {
    const EVIDENCE: Array<[RegExp, string]> = [
      [/\b(that|which|it) (means|proves|shows) (he|his)\b/i, 'conduct as proof'],
      [/\ba (clear |sure )?sign (that )?he\b/i, 'conduct as proof'],
      [/\bif he (really )?(loved|cared|wanted)\b/i, 'the if-he-really test'],
      [/\bgive him (space|time)\b/i, 'tactic'],
      [/\b(no contact|stop texting|reach out to him|pull back|make him)\b/i, 'tactic'],
      [/\bhe('ll| will) (come around|realise|realize|miss you|reach out)\b/i, 'forecast + tactic'],
    ];
    const hits = sweep(EVIDENCE);
    expect(hits, `treated conduct as proof, or coached her:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN #5 — the funnel-wide timeframe ban. Every headline here invites one.
  it('NEVER gives a timeframe or a forecast', () => {
    const TIME: Array<[RegExp, string]> = [
      [/\bwithin (a|the) (day|week|month|year)\b/i, 'timeframe'],
      [/\b(in|after) (a few|several|three|six) (days|weeks|months|years)\b/i, 'timeframe'],
      [/\bby (the end of|next) \w+\b/i, 'timeframe'],
      [/\byou will (hear|see|know) (from him|him) (soon|shortly)\b/i, 'forecast'],
      [/\b(soon|any day now|before long), (he|you)\b/i, 'forecast'],
    ];
    const hits = sweep(TIME);
    expect(hits, `gave a timeframe:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN #6 — never grade her, and never diagnose him. Both are verdicts.
  it('NEVER grades her for waiting or asking, and NEVER diagnoses him', () => {
    const GRADE: Array<[RegExp, string]> = [
      [/\byou (were|are|have been) (naive|foolish|silly|weak|needy)\b/i, 'grades her'],
      [/\byou (loved|gave|waited) too (much|long|soon)\b/i, 'grades her'],
      [/\byour (low )?self.?(worth|esteem)\b/i, 'grades her'],
      [/\b(emotionally )?unavailable\b/i, 'diagnosis'],
      [/\b(avoidant|attachment style|commitment.?phobic|narcissist)\b/i, 'diagnosis'],
      [/\bhe (is|was) (a coward|selfish|immature)\b/i, 'verdict on him'],
    ];
    const hits = sweep(GRADE);
    expect(hits, `graded her or diagnosed him:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ THE FAMILY'S OWN FINDING, pinned. 'cards-love-or-moved-on' refuses its binary on
  // grounds no other hook uses — the two branches are NOT OPPOSITES. If this finding ever
  // drifts to "neither is knowable" it has become 'cards-moved-on' and the test is dead.
  it('cards-love-or-moved-on refuses the binary on ITS OWN grounds', () => {
    const joined = CARDS.map((c) => reads['cards-love-or-moved-on']![c][2]).join(' ');
    expect(
      /not opposites|never a pair|two different axes|false hinge|were never a pair/i.test(joined),
      'the not-opposites finding is gone — this hook has collapsed into cards-moved-on',
    ).toBe(true);
    // And it must not simply restate the incumbent's grounds instead.
    const inc = reads[CLAUSE_TWIN];
    const found: string[] = [];
    for (const c of CARDS) {
      for (const r of shared(reads['cards-love-or-moved-on']![c][2], inc![c][2])) found.push(r);
    }
    expect(found, `rhymes with cards-moved-on:\n${found.join('\n')}`).toEqual([]);
  });

  // ⭐ 'cards-still-think' is the mirror of healing's 'cards-on-my-mind'. Its finding is the
  // SMALLEST ASK — she has scaled herself down to wanting to be remembered.
  it('cards-still-think keeps the smallest-ask finding', () => {
    const joined = CARDS.map((c) => reads['cards-still-think']![c][2]).join(' ');
    expect(
      /smallest|too much to ask|scaled|modest|only thing left to ask/i.test(joined),
      'the smallest-ask finding is gone',
    ).toBe(true);
  });
});

// ── The un-synced server rosters ───────────────────────────────────────────────────────────
// 🔴🔴 The bridge renders from the CLIENT registry, so the lander looks perfect even when the
// server side was never touched. Neither roster below is imported from that registry.
describe('still-feels — the hand-maintained server rosters', () => {
  const loadSrc = (rel: string) =>
    import('node:fs').then((fs) => fs.promises.readFile(new URL(rel, import.meta.url), 'utf8'));

  it('every hook has its own context AND tendency entry in prompts.ts', async () => {
    const src = await loadSrc('../server/lib/prompts.ts');
    for (const h of STILL_FEELS_HOOKS) {
      const occurrences = src.split(`'${h}'`).length - 1;
      expect(occurrences, `${h} needs a TAROT_HOOK_CONTEXT and a TAROT_HOOK_TENDENCY entry`).toBe(2);
    }
  });

  // ⭐⭐ THE CLASSIC SILENT HALF-FIX. Miss this roster and Versions A/B still look perfect while
  // Version C's chat handoff 400s {error:"Invalid tarot params"} — and a 400 falls back to a
  // normal-looking read, so it does not announce itself.
  it('the tarot validHooks roster in routes.ts accepts all three (or the chat 400s)', async () => {
    const src = await loadSrc('../server/routes.ts');
    const roster = src.match(/const validHooks = \["cards-honest".*?\];/s);
    expect(roster, 'tarot validHooks roster not found').toBeTruthy();
    for (const h of STILL_FEELS_HOOKS) {
      expect(roster![0], `${h} missing from validHooks — Version-C handoff will 400`).toContain(h);
    }
  });

  // The admin experiments dashboard labels angles by hand too — an unlabelled angle renders
  // as the raw slug in the per-lander table.
  it('the new angle has a label in the admin experiments dashboard', async () => {
    const src = await loadSrc('../client/src/pages/admin/ExperimentsDashboard.tsx');
    expect(src, 'still-feels has no ANGLE_LABELS entry').toMatch(/"still-feels":\s*"/);
  });
});
