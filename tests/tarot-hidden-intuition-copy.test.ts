// Copy guards for the /fb-tarot HIDDEN / INTUITION hooks (2026-08-12).
//
// TWO headlines on the FACE-DOWN return-mhf deck — 'Is he hiding something from me?' and
// 'Something feels off — is my intuition right?' — under the operator's Trust/Honesty FRAME.
//
// ⚠ TWO, not three. Every family before this shipped three landers; only two headlines were
// commissioned here and the pair is deliberate. The count is pinned below so that a later
// well-meaning third does not appear without a decision.
//
// The topic is what is NOT said, and how she is supposed to know. It is held apart from the
// two nearest live families on a real distinction, and this file pins that apart-ness:
//
//     trust   = who he IS                ('Is he really who he says he is?')
//     honesty = a specific untruth TOLD  ('Am I being lied to?')
//     here    = an OMISSION, plus her own reading of it. Nobody has been caught in anything.
//
// Why it needs its own guard file beyond the generic decode-him ones — four bans, of which
// the last two exist nowhere else on the funnel:
//
//  1. 🔴 THE VERDICT. Never that he IS hiding something, never that he is not. The first is
//     a ruling on a real man from a card; the second also tells her that what she noticed
//     was never there.
//
//  2. 🔴🔴 THE CONTENTS. 'Is he hiding something' invites Evelyn to say WHAT — another woman,
//     money, a past, a feeling. Every answer is invention. This is `searching`'s no-CAUSE ban
//     pointed at a man rather than at her life, and here it is worse: naming contents
//     manufactures a crisis inside a relationship that is still running.
//
//  3. 🔴🔴 THE TACTIC. No family has needed the standing never-hand-her-a-tactic rule this
//     sharply, because this headline supplies the move itself: check his phone, test him,
//     catch him out. It must never come from us in any form.
//
//  4. 🔴🔴 GRADING HER FACULTY. 'cards-feels-off' is the only headline on the funnel that
//     submits HER JUDGEMENT for a verdict, and all three available answers do harm:
//       · "yes, your intuition is right" convicts him by proxy of whatever she concluded;
//       · "no" tells a woman her own observation is imaginary — the gaslighting this funnel
//         may never do, and which she may already have had done to her;
//       · "intuition is never wrong" is the flattering third option, and it is the most
//         dangerous, because it turns every fear into a finding and licences her to act on
//         a guess. Nothing anywhere else on this funnel bans it.
//     The move is to SPLIT the question: the noticing is affirmed, the meaning stays open.
//
// 🔴 Negation-aware by construction, as in every sibling guard: correct copy here routinely
// contains a banned phrase inside its own refusal ("Nor will I tell you that intuition is
// never wrong"), so a naive substring ban would fail the very copy it protects.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  HIDDEN_INTUITION_HOOKS,
  HONESTY_HOOKS,
  TRUST_HOOKS,
  TWIN_FLAME_HOOKS,
  SEARCHING_HOOKS,
  LONELINESS_HOOKS,
  SOULMATE_WHERE_HOOKS,
  SOULMATE_AFTER_LOSS_HOOKS,
  SELF_FRAME_HOOKS,
  TAROT_HOOKS,
  HEADLINES,
  angleForHook,
  openerCStart,
} = await import('@/content/tarotReads');

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

describe('hidden-intuition hooks are wired end to end', () => {
  // ⚠ THE COUNT PIN. Two headlines were commissioned. A third appearing here without a
  // decision means somebody padded the family to match the others.
  it('is exactly TWO hooks, each in the roster, with a headline and angle=hidden-intuition', () => {
    expect(HIDDEN_INTUITION_HOOKS.length).toBe(2);
    for (const h of HIDDEN_INTUITION_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=hidden-intuition`).toBe('hidden-intuition');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-hiding-something']).toBe('Is he hiding something from me?');
    expect(HEADLINES['cards-feels-off']).toBe('Something feels off — is my intuition right?');
  });

  // ⭐⭐ THE SAFETY PIN, and it binds hardest on 'cards-feels-off'. That headline READS as if
  // it is about her, and it is not — it is her reading of a specific man. Filing it in a
  // no-man family strips the verdict guard, and a card would then be free to certify her
  // suspicion about a real person. This is the exact mistake soulmate-after-loss exists to
  // prevent, arriving from the opposite direction.
  it('keeps the decode-him guards — it is in NO no-man family', () => {
    for (const h of HIDDEN_INTUITION_HOOKS) {
      expect(SELF_FRAME_HOOKS, `${h} leaked into SELF_FRAME_HOOKS`).not.toContain(h);
      expect(LONELINESS_HOOKS, `${h} leaked into LONELINESS_HOOKS`).not.toContain(h);
      expect(SEARCHING_HOOKS, `${h} leaked into SEARCHING_HOOKS`).not.toContain(h);
      expect(SOULMATE_WHERE_HOOKS, `${h} leaked into soulmate-where`).not.toContain(h);
      expect(SOULMATE_AFTER_LOSS_HOOKS, `${h} leaked into soulmate-after-loss`).not.toContain(h);
    }
  });

  // ⭐⭐ THE REPORTING PIN. The honesty landers have run since 2026-08-03. Folding a new
  // topic into them retroactively mixes two commissions inside one set of numbers.
  it('is separate from the honesty and trust families, and leaves both intact', () => {
    for (const h of HIDDEN_INTUITION_HOOKS) {
      expect(HONESTY_HOOKS, `${h} folded into honesty`).not.toContain(h);
      expect(TRUST_HOOKS, `${h} folded into trust`).not.toContain(h);
      expect(TWIN_FLAME_HOOKS, `${h} folded into twin-flame`).not.toContain(h);
    }
    expect(HONESTY_HOOKS).toEqual(['cards-lied-to', 'cards-truth', 'cards-deceived']);
    expect(TRUST_HOOKS).toEqual(['cards-who-he-is', 'cards-real-person', 'cards-misled']);
  });

  it('reuses no existing hook id and no existing headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    const others = TAROT_HOOKS.filter((h) => !HIDDEN_INTUITION_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of HIDDEN_INTUITION_HOOKS) {
      expect(others, `${h} headline collides with an existing lander`).not.toContain(HEADLINES[h]);
    }
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
    expect(angleForHook('cards-love-again')).toBe('self-frame');
  });

  // 🔴 An opener may not put her on trial for her own unease. "What makes you think he is
  // hiding something" demands evidence before the read has run, and it hands the model a
  // list of suspicions to confirm — breaching the no-CAUSE ban in the opener itself.
  it('the openers never demand a case, and never ask WHAT she thinks is hidden', () => {
    for (const h of HIDDEN_INTUITION_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      expect(q, `${h} opener demands evidence`).not.toMatch(
        /what makes you (think|feel|sure|believe)|how do you know|why do you (think|believe|suspect)|what (proof|evidence)/i,
      );
      expect(q, `${h} opener asks her to name the suspicion`).not.toMatch(
        /what (do you think )?(is he|he is) (hiding|keeping)|what are you (afraid|worried)|what do you suspect/i,
      );
      expect(q, `${h} opener presumes guilt`).not.toMatch(/lying|lied|cheat|betray|another woman|someone else/i);
    }
  });

  it('is FACE-DOWN ONLY — not ported to the face-up decks', () => {
    for (const h of HIDDEN_INTUITION_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — hidden-intuition reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = HIDDEN_INTUITION_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !HIDDEN_INTUITION_HOOKS.includes(h));

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

  it('beat 3 shares no 6-word run with any EXISTING hook on this deck', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of existing) {
      for (const r of shared(reads[nh]![c][2], reads[oh]![c][2])) found.push(`${nh}/${c} ~ ${oh}/${c}: "${r}"`);
    }
    expect(found, `recycled wording:\n${found.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run BETWEEN the two hooks either', () => {
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
    /\b(no|not|never|n't|nor|nobody|no one|none|cannot|rather than|instead of|does not|is not|nothing|refuses?|declines?|will not|would not|withholds?|neither|without|unkindness)\b/i;
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

  // 🔴 BAN #1 — the verdict, in either direction.
  it('NEVER rules that he is hiding something, and never that he is not', () => {
    const VERDICT: Array<[RegExp, string]> = [
      [/\bhe (is|has been|must be|really is) (hiding|concealing|keeping something|withholding)\b/i, 'convicts him'],
      [/\byes,? (he|there) (is|does)\b/i, 'flat yes'],
      [/\bthere (is|really is) something (he is )?(hiding|being kept|behind)\b/i, 'asserts the secret exists'],
      [/\bhe (is|has) (lied|lying|deceiv)/i, 'upgrades an omission into a lie'],
      [/\bhe (is|isn't|is not) (being )?(honest|truthful|straight) with you\b/i, 'verdict either way'],
      [/\bhe (is|is not) (secretive|dishonest|a liar|trustworthy)\b/i, 'diagnoses his character'],
      [/\b(nothing|there is nothing) (is )?being (hidden|kept)\b/i, 'dismisses what she noticed'],
    ];
    const hits = sweep(VERDICT);
    expect(hits, `ruled on him:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN #2 — NO PRECEDENT. Never name what is behind the gap. Any answer is invention,
  // and inventing one manufactures a crisis in a relationship that is still running.
  it('NEVER names or guesses the CONTENTS of what might be withheld', () => {
    const CONTENTS: Array<[RegExp, string]> = [
      [/\banother woman\b/i, 'names contents'],
      [/\bsomeone else\b/i, 'names contents'],
      [/\b(an )?affair\b/i, 'names contents'],
      [/\b(is |has )?(cheat|unfaithful|sleeping with)/i, 'names contents'],
      [/\b(money|debt|financial|he owes)\b/i, 'names contents'],
      [/\b(a )?(secret|hidden) (past|family|child|marriage|wife|girlfriend)\b/i, 'names contents'],
      [/\b(text|message|dm)s? from\b/i, 'names contents'],
      [/\bwhat he is hiding is\b/i, 'names contents outright'],
    ];
    const hits = sweep(CONTENTS);
    expect(hits, `supplied contents:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN #3 — NO PRECEDENT at this sharpness. The headline supplies the move; we never do.
  it('NEVER hands her a tactic — no surveillance, no test, no trap', () => {
    const TACTIC: Array<[RegExp, string]> = [
      [/\b(check|go through|going through|look through|read|search) (his|the|a man's) (phone|messages|texts|emails|socials)\b/i, 'surveillance'],
      [/\b(you should|try to|it may help to) (ask|confront|test|watch|catch)\b/i, 'hands her a move'],
      [/\b(test|trap|catch) him\b/i, 'hands her a move'],
      [/\bkeep (an eye|watch) on\b/i, 'surveillance'],
      [/\bpull back|step back to|go quiet on him|stop responding\b/i, 'strategy on a person'],
      [/\bgive him an ultimatum\b/i, 'strategy on a person'],
    ];
    const hits = sweep(TACTIC);
    expect(hits, `handed her a tactic:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN #4a — she arrived already suspecting herself. The funnel does not finish the job.
  it('NEVER pathologises her watchfulness or her perception', () => {
    const PATHOLOGISE: Array<[RegExp, string]> = [
      [/\b(you are|you're|being) (paranoid|insecure|anxious|obsessive|irrational)\b/i, 'diagnoses her'],
      [/\b(over ?think|over ?analys|over ?react|spiral)/i, 'diagnoses her'],
      [/\b(reading|read) too much into\b/i, 'dismisses her'],
      [/\byour (insecurity|anxiety|fear|past hurt|trust issues) (is|are|has|have)\b/i, 'attributes it to her'],
      // ⚠ Must require HER as the subject. An earlier version banned the bare phrase and
      // fired on correct copy — "a stranger with a deck telling a woman what a man conceals
      // is making it up" is the read CONDEMNING invention by readers, which is the opposite
      // of the harm. The harm is only ever "YOU are making it up".
      [/\byou( are|'re| have| had)? ?(imagining|inventing|making|imagined|invented|made) (it|this|them|things) up\b/i, 'tells her it is not real'],
      [/\byou (are|have been|were) imagining\b/i, 'tells her it is not real'],
      [/\bit('s| is) all in your (head|mind)\b/i, 'gaslights'],
      [/\bnothing (is|to) (wrong|worry)\b/i, 'dismisses what she noticed'],
    ];
    const hits = sweep(PATHOLOGISE);
    expect(hits, `pathologised her:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN #4b — NO PRECEDENT ANYWHERE ON THE FUNNEL. The flattering answer is the most
  // dangerous one: it turns every fear into a finding and licences her to act on a guess.
  it('NEVER certifies intuition as infallible, and never certifies her conclusion', () => {
    const FACULTY: Array<[RegExp, string]> = [
      [/\b(intuition|gut|instinct)s?( is| are)? never wrong\b/i, 'infallibility claim'],
      [/\balways trust your (gut|intuition|instinct)/i, 'infallibility claim'],
      [/\byour (intuition|gut|instinct) (is|was) right\b/i, 'certifies the conclusion'],
      [/\byour (intuition|gut) (never|does not) lie/i, 'infallibility claim'],
      [/\b(intuition|gut) (is|are) (proof|evidence)\b/i, 'upgrades a feeling to proof'],
      [/\byou (already )?know (the truth|what he)/i, 'certifies her conclusion'],
      [/\btrust what you (feel|sense) about him\b/i, 'licences acting on a guess'],
    ];
    const hits = sweep(FACULTY);
    expect(hits, `certified her faculty:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐ THE SPLIT — the affirmative half. Having refused the conclusion, each read must still
  // land the thing she came for: that the noticing itself was real. A family that only
  // refuses is a family that abandons her.
  it('still affirms HER — every hook affirms the noticing without certifying the meaning', () => {
    for (const h of present) for (const c of CARDS) {
      const beat = reads[h]![c][2];
      expect(
        beat,
        `${h}/${c} refuses without affirming her`,
      ).toMatch(
        /\breal\b|\bnot (the same as )?imagin|\bdid not line up\b|\bstopped lining up\b|\bfaculty\b|\bnoticed\b|\bnot nothing\b|\bnot evidence\b|\bnot in your imagination\b|\bthe gap is there\b|\bworking\b/i,
      );
    }
  });

  // Standing house rules, checked on every beat regardless of negation.
  it('no dates, no timeframes, no exclamation marks, no emoji, no price or urgency', () => {
    const ALWAYS: Array<[RegExp, string]> = [
      [/!/, 'exclamation mark'],
      [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'emoji'],
      [/\$\d|\bprice\b|\bpay\b|\boffer\b|\bdiscount\b/i, 'price or offer'],
      [/\b(within|in) (the next )?(a )?(few )?(days?|weeks?|months?)\b/i, 'timeframe'],
      [/\bby (monday|tuesday|wednesday|thursday|friday|saturday|sunday|christmas|the end of)\b/i, 'date'],
      [/\b(soon|shortly) (he|it) will\b/i, 'forecast'],
      [/\bhurry|act now|before it(’|')?s too late\b/i, 'urgency'],
    ];
    const hits = sweep([], ALWAYS);
    expect(hits, `house rule broken:\n${hits.join('\n')}`).toEqual([]);
  });
});
