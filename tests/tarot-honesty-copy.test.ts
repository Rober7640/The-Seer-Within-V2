// Copy guards for the /fb-tarot HONESTY/LYING hooks (2026-08-03).
//
// Three headlines on the FACE-DOWN return-mhf deck: "Am I being lied to?",
// "Is he telling me the truth?", "Am I being deceived?".
//
// Why this angle needs its own guard file, beyond the generic ones:
//
//  1. NEAREST-NEIGHBOUR RECYCLING. Two hooks already live sit right next to these —
//     'cards-honest' ("Is he being honest with you?") and 'cards-misled' ("Am I being
//     misled?"). A woman who clicks "Am I being deceived?" must not be handed a
//     repurposed honesty read wearing a new headline. Beat 3 is compared against every
//     existing hook on the deck AND across the three new ones.
//
//  2. THE NO-VERDICT RULE RUNS IN BOTH DIRECTIONS HERE. On this angle "yes, he lied" is
//     an accusation against a real man, and "no, he is telling you the truth" is a
//     reassurance the funnel has no standing to give — and reassurance is the DOCUMENTED
//     failure mode (2026-07-10 buyer audit, cards-real-person). Both are banned.
//
//  3. HER DIGNITY. A woman asking "Am I being deceived?" has usually already started
//     blaming her own trust. Nothing may land as her naivety — the same shape of harm
//     the cards-wont-commit guard exists to prevent, approached from the other side.
//
// 🔴 The banned-language check is NEGATION-AWARE by construction. Almost every correct
// read on this angle contains the harmful phrase inside a negation ("hands down no
// verdict that you have been lied to"), so a naive substring ban would fail the very
// copy it is meant to protect. Assertions are checked per-clause and skipped when that
// clause carries a negator; phrases that are harmful even when negated ("he is not
// lying" — still vouching for him) live in a separate always-banned list.
import { describe, expect, it } from 'vitest';

const { DECKS, HONESTY_HOOKS, TAROT_HOOKS, HEADLINES, angleForHook, openerCStart } = await import(
  '@/content/tarotReads'
);

// Operator scope lock (2026-08-03): FACE-DOWN ONLY. return-mhf is the face-down deck
// the ads actually run (DEFAULT_DECK, clean URLs with no &deck=).
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

describe('honesty hooks are wired end to end', () => {
  it('every honesty hook is in the roster, has a headline, and reports angle=honesty', () => {
    expect(HONESTY_HOOKS.length).toBe(3);
    for (const h of HONESTY_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      // Without HONESTY_HOOKS these silently report 'decode-him' and become invisible
      // as a family in PostHog and in the gate's per-lander table.
      expect(angleForHook(h), `${h} must report angle=honesty`).toBe('honesty');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-lied-to']).toBe('Am I being lied to?');
    expect(HEADLINES['cards-truth']).toBe('Is he telling me the truth?');
    expect(HEADLINES['cards-deceived']).toBe('Am I being deceived?');
  });

  // The pre-existing honesty-adjacent hooks are deliberately UNTOUCHED — operator's
  // standing rule is that a new headline never replaces an old lander. cards-honest in
  // particular is DEFAULT_HOOK, so moving its angle would silently re-label the
  // fallback traffic of every bare /fb-tarot visit.
  it('leaves the existing trust/decode-him hooks exactly where they were', () => {
    expect(angleForHook('cards-honest')).toBe('decode-him');
    expect(angleForHook('cards-misled')).toBe('trust');
    expect(angleForHook('cards-who-he-is')).toBe('trust');
    expect(angleForHook('cards-real-person')).toBe('trust');
  });

  it('the opener question invites HER account and never demands proof', () => {
    for (const h of HONESTY_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener must invite her account`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
    }
  });

  // Not an oversight — a scope decision, recorded here so a later port is a deliberate
  // act rather than an accident, and so the reverse (a silent half-port) fails loudly.
  it('is FACE-DOWN ONLY — not ported to the face-up deck', () => {
    for (const h of HONESTY_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — honesty reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = HONESTY_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !HONESTY_HOOKS.includes(h));

  it('every honesty read has all 3 cards and the full 4-beat structure', () => {
    for (const h of present) {
      for (const c of CARDS) {
        expect(reads[h]![c], `${h}/${c} missing`).toBeTruthy();
        expect(reads[h]![c], `${h}/${c} is not 4 beats`).toHaveLength(4);
        for (const beat of reads[h]![c]) expect(beat.trim().length).toBeGreaterThan(20);
      }
    }
  });

  // Beat 3 is the READ. Beats 1/2/4 necessarily share the mandated template, so
  // comparing them would only ever produce noise.
  it('beat 3 shares no 6-word run with any EXISTING hook on this deck', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of existing) {
      for (const r of shared(reads[nh]![c][2], reads[oh]![c][2])) found.push(`${nh}/${c} ~ ${oh}/${c}: "${r}"`);
    }
    expect(found, `recycled wording:\n${found.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run BETWEEN the three honesty hooks either', () => {
    const found: string[] = [];
    for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) for (const c of CARDS) {
      for (const r of shared(reads[present[i]]![c][2], reads[present[j]]![c][2]))
        found.push(`${present[i]}/${c} ~ ${present[j]}/${c}: "${r}"`);
    }
    expect(found, `honesty hooks repeat each other:\n${found.join('\n')}`).toEqual([]);
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
  // Clause-level negation awareness: a banned ASSERTION is only a hit when the clause
  // containing it carries no negator. "hands down no verdict that you have been lied
  // to" is the correct read; "you have been lied to" on its own is a verdict.
  const NEGATOR = /\b(no|not|never|none|nobody|no one|cannot|can't|unable|without|n't|nor|rather than|instead of|does not|is not)\b/i;
  // 🔴 FIXED 2026-08-19 — this used to split on /[—;:,]/ only, which does NOT break on a
  // full stop or a newline. Beat 3 carries four bubbles joined by '\n' since the migration, so
  // a single negator in the first of them ('it was never you') put the whole of the remaining
  // three behind the negation exemption and every clause ban in them was skipped silently.
  // Found by feeding the gate a deliberate violation rather than trusting its green tick.
  const clausesOf = (s: string) => s.split(/[—;:,.\n]/);

  it('never hands down a verdict on him, in EITHER direction', () => {
    // Harmful only when asserted — checked per clause, skipped when negated.
    const ASSERTIONS: Array<[RegExp, string]> = [
      [/\bhe (is|was|has been) lying\b/i, 'verdict: states he is lying'],
      [/\bhe lied to you\b/i, 'verdict: states he lied'],
      [/\bhe (is|was) deceiving you\b/i, 'verdict: states he is deceiving her'],
      [/\byou (are|have been|were) being deceived\b/i, 'verdict: states she is deceived'],
      [/\byou have been lied to\b/i, 'verdict: states she was lied to'],
      [/\bhe (is|was) a liar\b/i, 'verdict: names him a liar'],
    ];
    // Harmful even inside a negation — vouching for him is the documented failure mode
    // on this angle, and "he is not lying" vouches just as hard as "he is honest".
    const ALWAYS: Array<[RegExp, string]> = [
      [/\bhe (is|was) not lying\b/i, 'reassurance: vouches for him'],
      [/\bhe (is|was) (telling|speaking) (you )?the truth\b/i, 'reassurance: vouches for him'],
      [/\bhe (is|was) (honest|truthful|sincere) with you\b/i, 'reassurance: vouches for him'],
      [/\byou are not being deceived\b/i, 'reassurance: rules out deception'],
      [/\bhe would never lie\b/i, 'reassurance: vouches for him'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of ALWAYS) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat}"`);
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of ASSERTIONS) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, `verdict/reassurance language:\n${hits.join('\n')}`).toEqual([]);
  });

  it('never lands as HER fault and never gives a timeframe', () => {
    const ASSERTIONS: Array<[RegExp, string]> = [
      [/\b(naive|naivety|naivete|gullible)\b/i, 'blames her judgment'],
      [/\btoo trusting\b/i, 'blames her trust'],
      [/\bshould have (known|seen|noticed|realised|realized)\b/i, 'blames her for not seeing'],
      [/\byour own fault\b/i, 'blames her'],
      [/\bfoolish\b/i, 'calls her foolish'],
    ];
    // 🔄 NARROWED 2026-08-19 — only DATES stay banned here. The blame list above is
    // untouched: this family's verdict ban also stays ON (operator call), because "he is
    // lying" convicts a real man and "he is telling you the truth" vouches for one who may
    // be defrauding her. Both doors are bad and neither is the hopeful one.
    const ALWAYS: Array<[RegExp, string]> = [
      [/\bwithin (a|the|\d)/i, 'a dated prediction'],
      [/\bin (a few|the next|\d+) (day|week|month|year)/i, 'a dated prediction'],
      [/\bby (the end of|christmas|new year|spring|summer|autumn|winter)\b/i, 'a dated prediction'],
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
