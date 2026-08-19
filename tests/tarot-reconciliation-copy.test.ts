// Copy guards for the /fb-tarot RECONCILIATION hooks (2026-08-06).
//
// Three headlines on the FACE-DOWN return-mhf deck: 'Will we get back together?',
// 'Is there still a chance for us?', 'Is it really over between us?'
//
// Why this angle needs its own guard file, beyond the generic ones:
//
//  1. IT IS THE US-FRAMED SIBLING OF `reunion`, AND THAT IS THE WHOLE EXPERIMENT. The
//     reunion trio casts him as the agent and her as the one waiting on his decision
//     ('will HE come back'). These cast the relationship as a joint thing with two people
//     in it ('will WE get back together'). Operator call 2026-08-06: separate angles, so
//     him-framing and us-framing are comparable at ANGLE level. If either family ever
//     absorbs the other, the comparison silently disappears — pinned below in both
//     directions, including REUNION_HOOKS.length.
//
//  2. THE FORBIDDEN VERDICT IS ON THE RELATIONSHIP, NOT ON HIM — and that is harder, not
//     softer. A claim about a man can at least be measured against his behaviour; a claim
//     that 'it is over' or 'it is not over' is unfalsifiable to her and lands as a ruling
//     on her life from someone who has never met either of them.
//
//  3. FOUR FAILURE MODES.
//       a. VERDICT ON THE RELATIONSHIP, BOTH WAYS. 'It is over' is a death notice
//          delivered to a woman who came here asking. 'It is not over' is a promise the
//          funnel cannot keep, aimed at the person least able to discount it.
//       b. ODDS. cards-still-a-chance asks for a number outright. There is no number, and
//          producing one — 'a strong chance', 'the odds are good', any percentage — is the
//          specific harm of that headline.
//       c. DIRECTIVES. Move on, let go, accept it, fight for him, reach out first. She
//          arrives braced to be told what to do about it. That is not a reading.
//       d. HER RESPONSIBILITY FOR THE OUTCOME. The us-framing makes it easy to imply the
//          result turns on what she does next. It does not, and implying it hands her the
//          blame for a decision that was never wholly hers. Same shape of harm as
//          cards-wont-commit and cards-deceived, arriving from a third direction.
//
//  4. cards-really-over MUST REFUSE ITS OWN HEADLINE, like cards-moved-on and
//     cards-losing-interest before it. Asserted directly.
//
// 🔴 Negation-aware by construction, as in the honesty, reunion, healing and pulling-away
// guards: correct copy here routinely contains a banned phrase inside a refusal ('withholds
// the word you came for', 'is not the same as being over'), so a naive substring ban would
// fail the very copy it protects.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  RECONCILIATION_HOOKS,
  REUNION_HOOKS,
  PULLING_AWAY_HOOKS,
  HEALING_HOOKS,
  COMMITMENT_HOOKS,
  TAROT_HOOKS,
  HEADLINES,
  SELF_FRAME_HOOKS,
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

describe('reconciliation hooks are wired end to end', () => {
  it('every hook is in the roster, has a headline, and reports angle=reconciliation', () => {
    expect(RECONCILIATION_HOOKS.length).toBe(3);
    for (const h of RECONCILIATION_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=reconciliation`).toBe('reconciliation');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-back-together']).toBe('Will we get back together?');
    expect(HEADLINES['cards-still-a-chance']).toBe('Is there still a chance for us?');
    expect(HEADLINES['cards-really-over']).toBe('Is it really over between us?');
  });

  // ⭐ THE VARIABLE UNDER TEST. Every reunion headline is about HIM; every reconciliation
  // headline is about US. If a future edit blurs that, the two angles stop measuring
  // different things while still reporting as though they do — the worst kind of failure,
  // because the dashboard keeps looking fine.
  it('is US-framed where the reunion family is HIM-framed', () => {
    for (const h of RECONCILIATION_HOOKS) {
      expect(HEADLINES[h], `${h} headline must be us-framed`).toMatch(/\b(we|us)\b/i);
      expect(HEADLINES[h], `${h} headline must not centre him`).not.toMatch(/\bhe\b/i);
    }
    for (const h of REUNION_HOOKS) {
      expect(HEADLINES[h], `${h} is the him-framed control arm`).toMatch(/\bhe\b/i);
    }
  });

  // Operator call 2026-08-06: same topic as reunion, deliberately NOT merged into it.
  // Merging in either direction destroys the him-vs-us comparison this was built for.
  it('does NOT merge into the existing reunion family, in either direction', () => {
    for (const h of RECONCILIATION_HOOKS) {
      expect(REUNION_HOOKS, `${h} leaked into the reunion family`).not.toContain(h);
      expect(PULLING_AWAY_HOOKS, `${h} leaked into the pulling-away family`).not.toContain(h);
      expect(HEALING_HOOKS, `${h} leaked into the healing family`).not.toContain(h);
      expect(COMMITMENT_HOOKS, `${h} leaked into the commitment family`).not.toContain(h);
      expect(SELF_FRAME_HOOKS, `${h} leaked into the self-frame family`).not.toContain(h);
    }
    // The 8/04 reunion landers keep reporting exactly as they did.
    expect(REUNION_HOOKS.length).toBe(3);
    for (const h of REUNION_HOOKS) expect(angleForHook(h)).toBe('reunion');
    // And the original 'Will he come back?' lander stays in decode-him, untouched.
    expect(angleForHook('cards-return')).toBe('decode-him');
  });

  it('reuses no existing hook id and no existing headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    // cards-come-back duplicates cards-return ON PURPOSE as a copy test. This family is
    // not one — its variable is the pronoun, not the wording.
    const others = TAROT_HOOKS.filter((h) => !RECONCILIATION_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of RECONCILIATION_HOOKS) {
      expect(others, `${h} headline collides with an existing lander`).not.toContain(HEADLINES[h]);
    }
  });

  // The us-framing includes her, but a real man is in the picture and every
  // no-verdict-on-him guardrail stays on. Self-frame drops them. Same warning as healing.
  it('is NOT self-frame — the no-verdict-on-him guardrails must stay on', () => {
    for (const h of RECONCILIATION_HOOKS) expect(angleForHook(h)).not.toBe('self-frame');
  });

  it('leaves every previously shipped family exactly where it was', () => {
    expect(angleForHook('cards-honest')).toBe('decode-him');
    expect(angleForHook('cards-feels')).toBe('decode-him');
    expect(angleForHook('cards-come-back')).toBe('reunion');
    expect(angleForHook('cards-misled')).toBe('trust');
    expect(angleForHook('cards-lied-to')).toBe('honesty');
    expect(angleForHook('cards-will-commit')).toBe('commitment');
    expect(angleForHook('cards-cant-stop')).toBe('healing');
    expect(angleForHook('cards-pulling-away')).toBe('pulling-away');
    expect(angleForHook('cards-love-again')).toBe('self-frame');
  });

  it('the opener asks about the JOINT thing, never for a forecast or a justification', () => {
    for (const h of RECONCILIATION_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      // She must never be asked to justify not having accepted it, nor to estimate odds.
      expect(q, `${h} opener asks her to justify hoping`).not.toMatch(/why (have|haven't) you|why do you still|what makes you think there/i);
      expect(q, `${h} opener asks her for odds`).not.toMatch(/how likely|what are the chances|do you think he will/i);
    }
  });

  it('is FACE-DOWN ONLY — not ported to the face-up deck', () => {
    for (const h of RECONCILIATION_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — reconciliation reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = RECONCILIATION_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !RECONCILIATION_HOOKS.includes(h));

  it('every read has all 3 cards and the full 4-beat structure', () => {
    for (const h of present) {
      for (const c of CARDS) {
        expect(reads[h]![c], `${h}/${c} missing`).toBeTruthy();
        expect(reads[h]![c], `${h}/${c} is not 4 beats`).toHaveLength(4);
        for (const beat of reads[h]![c]) expect(beat.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it('beat 3 shares no 6-word run with any EXISTING hook on this deck', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of existing) {
      for (const r of shared(reads[nh]![c][2], reads[oh]![c][2])) found.push(`${nh}/${c} ~ ${oh}/${c}: "${r}"`);
    }
    expect(found, `recycled wording:\n${found.join('\n')}`).toEqual([]);
  });

  // 🔴 Called out separately. The reunion trio asks the SAME question of the same deck and
  // is the control arm of this very test — if the two families rhyme, the copy variable is
  // contaminated and the angle comparison measures nothing.
  it('beat 3 shares no 6-word run with the REUNION family specifically', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of [...REUNION_HOOKS, 'cards-return'] as const) {
      if (!reads[oh]) continue;
      for (const r of shared(reads[nh]![c][2], reads[oh]![c][2])) found.push(`${nh}/${c} ~ ${oh}/${c}: "${r}"`);
    }
    expect(found, `reconciliation rhymes with its control arm:\n${found.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run BETWEEN the three reconciliation hooks either', () => {
    const found: string[] = [];
    for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) for (const c of CARDS) {
      for (const r of shared(reads[present[i]]![c][2], reads[present[j]]![c][2]))
        found.push(`${present[i]}/${c} ~ ${present[j]}/${c}: "${r}"`);
    }
    expect(found, `reconciliation hooks repeat each other:\n${found.join('\n')}`).toEqual([]);
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
      expect(reads[h]![c][0], `${h}/${c}`).toMatch(/^You turned /);
    }
  });

  // ── The compliance core ────────────────────────────────────────────────────
  const NEGATOR = /\b(no|not|never|none|nobody|no one|cannot|can't|unable|without|n't|nor|rather than|instead of|does not|is not|nothing|refuses|declines|will not|withholds|neither)\b/i;
  // 🔴 FIXED 2026-08-19 — this used to split on /[—;:,]/ only, which does NOT break on a
  // full stop or a newline. Beat 3 carries four bubbles joined by '\n' since the migration, so
  // a single negator in the first of them ('it was never you') put the whole of the remaining
  // three behind the negation exemption and every clause ban in them was skipped silently.
  // Found by feeding the gate a deliberate violation rather than trusting its green tick.
  const clausesOf = (s: string) => s.split(/[—;:,.\n]/);

  // 🔴 The failure mode unique to this angle: the verdict is on the RELATIONSHIP.
  // 🔄 LOOSENED 2026-08-19, operator call, and now DIRECTIONAL. Refusing both answers is
  // what forced cards-really-over to visibly decline its own headline. The hopeful direction
  // is now allowed; the burial is not, because "it is over" from a stranger on a card is the
  // one answer that ends her question and sells nothing after it.
  it('never pronounces the relationship DEAD, and never puts a date on it', () => {
    const ASSERTIONS: Array<[RegExp, string]> = [
      [/\bit (is|really is|has been) over\b/i, 'verdict: pronounces the relationship dead'],
      [/\b(this|it) (is|has) (finished|ended|done)\b/i, 'verdict: pronounces the relationship dead'],
      [/\bhe (does not|doesn't) (love|want) you\b/i, 'verdict: convicts him'],
      [/\bthere is (no|nothing) (chance|hope|left)\b/i, 'verdict: pronounces it dead'],
      [/\bhe (is|has) moved on\b/i, 'verdict: pronounces it dead'],
    ];
    const ALWAYS: Array<[RegExp, string]> = [
      [/\bwithin (a|the|\d)/i, 'a dated prediction'],
      [/\bin (a few|the next|\d+) (day|week|month|year)/i, 'a dated prediction'],
      [/\bby (the end of|christmas|new year|spring|summer|autumn|winter)\b/i, 'a dated prediction'],
      [/\bI promise\b/i, 'a promise the funnel cannot keep'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of ALWAYS) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat}"`);
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of ASSERTIONS) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, `verdict on the relationship:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 cards-still-a-chance asks for a number outright. There is no number.
  // 🔄 LOOSENED 2026-08-19 — "a real chance" and "likely" are now allowed; they are how a
  // reading talks, not a measurement. QUANTIFIED odds stay banned for the same reason dates
  // do: a number is checkable, and a checkable claim that fails comes back as a refund.
  it('never quotes a NUMBER on it', () => {
    const ODDS: Array<[RegExp, string]> = [
      [/\b\d+\s*(%|percent)/i, 'odds: a percentage'],
      [/\bthe odds are\b/i, 'odds stated as a measurement'],
      [/\b(nine|eight|seven|six|five|four|three|two) (in|out of) (ten|five|three)\b/i, 'odds: a ratio'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of ODDS) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, `odds language:\n${hits.join('\n')}`).toEqual([]);
  });

  it('never hands her a DIRECTIVE about what to do next', () => {
    const ASSERTIONS: Array<[RegExp, string]> = [
      [/\b(you (need|have|ought) to|you should) (move on|let go|accept|wait|reach out|call him|text him|fight)\b/i, 'directive'],
      [/\bit is time to (move on|let go|accept|walk away)\b/i, 'directive'],
      [/\b(move on|let go of him|let him go|walk away|close this chapter)\b/i, 'directive'],
      [/\bfight for (him|this|it)\b/i, 'directive'],
      [/\breach out (to him )?first\b/i, 'directive'],
      [/\bgive him (space|time)\b/i, 'strategy'],
      [/\bdon't give up (on him|on this)\b/i, 'directive'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of ASSERTIONS) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, `directive language:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 Unique to the us-framing: because she is half of 'us', it is easy to imply the
  // outcome rests on her. It does not, and implying it hands her the blame.
  it('never makes the OUTCOME her responsibility, and never lands as her fault', () => {
    const ASSERTIONS: Array<[RegExp, string]> = [
      [/\bit (is|will be) up to you\b/i, 'hands her the outcome'],
      [/\bdepends on (what you|you)\b/i, 'hands her the outcome'],
      [/\bif you (only |just )?(tried|showed|reached|opened)\b/i, 'hands her the outcome'],
      [/\byou (were|are) too (much|available|eager|needy|sensitive)\b/i, 'her fault'],
      [/\byou (were|are) not enough\b/i, 'her fault'],
      [/\byou (pushed him|drove him) away\b/i, 'her fault'],
      [/\byou (are|were) (clinging|desperate|deluding yourself)\b/i, 'her fault'],
      [/\b(unable|refusing) to (accept|face) reality\b/i, 'her fault'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of ASSERTIONS) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, `blame/responsibility language:\n${hits.join('\n')}`).toEqual([]);
  });

  // Like cards-moved-on and cards-losing-interest before it, this headline hands over a
  // question whose only two answers are both forbidden. The read must visibly decline it.
  it('cards-really-over visibly REFUSES to answer its own headline', () => {
    const refusals = /withhold|neither|not .*(mine|the Magician's) to|nothing in the Fool closes|will not|refuse|declines|no amount/i;
    for (const c of CARDS) {
      const beat = reads['cards-really-over']![c][2];
      expect(beat, `cards-really-over/${c} must decline the verdict outright`).toMatch(refusals);
    }
  });

  // The finding that replaces the forbidden verdict: nobody ever SAID it to her. If this
  // ever drops out, the read has no answer left and becomes an evasion instead of a
  // reading — which is the difference between refusing a verdict and refusing to help.
  it('cards-really-over routes to the conversation she was never given', () => {
    const joined = CARDS.map((c) => reads['cards-really-over']![c][2]).join(' ').toLowerCase();
    expect(joined).toMatch(/said|say|spoken|told|words|plainly|unfinished/);
  });

  it('cards-still-a-chance affirms hoping without promising an outcome', () => {
    const joined = CARDS.map((c) => reads['cards-still-a-chance']![c][2]).join(' ').toLowerCase();
    expect(joined, 'must not treat hope as a failure of realism').toMatch(/hope|unsettled|unanswered|not been (spent|sealed|answered)/);
  });
});
