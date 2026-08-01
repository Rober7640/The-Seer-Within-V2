// Copy guards for the /fb-tarot COMMITMENT hooks (2026-07-31).
//
//   npx vitest run tests/tarot-commitment-copy.test.ts
//
// Why these exist as tests rather than a one-off check at authoring time:
//
//  1. The 7/30 sign-off instruction was "don't reuse exact same wordings… stick to the
//     headlines and generate appropriate relevant responses accordingly". That was
//     verified mechanically once and then pinned, because eyeballing 9 reads against 21
//     existing ones does not scale and quietly degrades on the next edit.
//
//  2. Commitment is the highest-risk angle on this funnel. Every other hook asks about
//     the present ("is he honest", "who is he really"); these ask outright for a
//     PREDICTION — "will he ever", "is he ever going to be ready". The pull when writing
//     them is to answer the question, and answering it IS the verdict the whole funnel
//     forbids. A promise that he will commit is the worst possible outcome for a woman
//     paying for clarity; a pronouncement that he never will is a verdict on a man the
//     reader loves, delivered by a stranger who has never met him.
//
//  3. 'cards-wont-commit' carries a second failure mode the others do not: the headline
//     PRESUPPOSES his refusal, so the natural next move is to explain it — and the
//     cheapest explanation available is her. Anything implying she was too much, too
//     available or not enough would be the single most harmful reading this funnel could
//     produce, and it is exactly what an unguarded LLM reaches for.
import { describe, expect, it } from 'vitest';

const { DECKS, COMMITMENT_HOOKS, TAROT_HOOKS, HEADLINES, angleForHook, openerCStart } = await import(
  '@/content/tarotReads'
);

// Decks that carry commitment reads. Face-down shipped first, face-up ported the same
// day (2026-07-31); every assertion below covers whichever decks are listed here.
const DECKS_WITH_COMMITMENT = (['return-mhf', 'arcana-mfh'] as const).filter((d) =>
  COMMITMENT_HOOKS.some((h) => DECKS[d].reads[h]),
);

const CARDS = ['a', 'b', 'c'] as const;

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const runsOf = (s: string, n = 6) => {
  const w = words(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
};
const shared = (a: string, b: string) => [...runsOf(a)].filter((r) => runsOf(b).has(r));

describe('commitment hooks are wired end to end', () => {
  it('every commitment hook is in the roster, has a headline, and reports angle=commitment', () => {
    expect(COMMITMENT_HOOKS.length).toBeGreaterThan(0);
    for (const h of COMMITMENT_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      // Without COMMITMENT_HOOKS these silently report 'decode-him' and become
      // invisible as a family in PostHog and in the gate's per-lander table.
      expect(angleForHook(h), `${h} must report angle=commitment`).toBe('commitment');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-will-commit']).toBe('Will he ever commit?');
    expect(HEADLINES['cards-wont-commit']).toBe("Why won't he commit to me?");
    expect(HEADLINES['cards-ready-commit']).toBe('Is he ever going to be ready for real commitment?');
  });

  it('at least one deck carries the reads (a hook with no reads falls back silently)', () => {
    expect(DECKS_WITH_COMMITMENT.length).toBeGreaterThan(0);
  });

  // The Version C opener question — the FIRST thing Evelyn asks, and the moment a
  // visitor decides whether she is worth answering. TAROT_QUESTION is not exported,
  // so these go through openerCStart (which returns [card line, question]).
  it('the opener question echoes its headline and reads cleanly', () => {
    const q = (h: (typeof COMMITMENT_HOOKS)[number]) => openerCStart('return-mhf', h, 'a')[1];

    // 2026-07-31: was a bare "what would ready actually look like", which the operator
    // read as a typo for "really". The headline's word is still echoed (message scent)
    // but as "being ready" so it cannot scan as a misspelling.
    expect(q('cards-ready-commit')).toBe(
      'Before I look closer, tell me… what would being ready actually look like, coming from him?',
    );
    expect(q('cards-ready-commit'), 'the bare-noun phrasing came back').not.toMatch(
      /what would ready actually/,
    );

    for (const h of COMMITMENT_HOOKS) {
      expect(q(h), `${h} opener must invite HER account, not demand proof`).toMatch(
        /^Before I look closer, tell me… /,
      );
      expect(q(h), `${h} opener must be a question`).toMatch(/\?$/);
    }
  });
});

// The face-up port. Compared per CARD, never per panel.
//
// When this was written the decks ordered their panels differently (face-down b was the
// Hanged Man, face-up b was the Fool), so a letter-for-letter comparison would have
// "passed" on a port that had attached every read to the wrong card. The 2026-07-31 art
// re-order happens to have aligned them, but the comparison stays keyed on card identity
// regardless — the alignment is a coincidence of the current art, not a guarantee, and
// arcana-eef already orders its own cards differently.
describe('face-up port is card-for-card identical to face-down', () => {
  const down = DECKS['return-mhf'];
  const up = DECKS['arcana-mfh'];
  const ported = COMMITMENT_HOOKS.filter((h) => down.reads[h] && up.reads[h]);

  // Panel letter -> card identity, per deck, from each deck's own `mark`.
  const byMark = (d: typeof down) =>
    Object.fromEntries(CARDS.map((k) => [d.mark[k], k])) as Record<string, (typeof CARDS)[number]>;

  it('both decks carry the same commitment hooks', () => {
    expect(ported.sort()).toEqual([...COMMITMENT_HOOKS].sort());
  });

  // Guards the parity test below from becoming meaningless. It used to assert the two
  // decks ordered their panels DIFFERENTLY (face-down b was the Hanged Man, face-up b
  // was the Fool), which is what made a per-card remap necessary rather than decorative.
  //
  // On 2026-07-31 the operator re-ordered the face-up strip art to
  // Magician|HangedMan|Fool, so the two decks now happen to agree panel-for-panel and
  // that assertion was inverted overnight. The precondition that actually matters is
  // not the ORDER — it is that both decks offer the SAME THREE CARDS, which is the only
  // reason a card-for-card comparison is possible at all. That holds whichever order
  // the art ships in, so this version cannot be flipped by a future re-order.
  it('both decks offer the same three cards (what makes a per-card comparison possible)', () => {
    const cards = (d: typeof down) => CARDS.map((k) => d.mark[k]).sort();
    expect(cards(up)).toEqual(cards(down));
    // And the panel mapping is derived from `mark`, never assumed from the letter —
    // so the parity test stays correct whether the orders agree or not.
    expect(new Set(cards(down)).size, 'a deck must not list the same card twice').toBe(3);
  });

  it.each(COMMITMENT_HOOKS)('%s — every beat matches, normalising only turned/chose', (hook) => {
    const d = byMark(down);
    const u = byMark(up);
    for (const mark of Object.keys(d)) {
      const downCard = d[mark];
      const upCard = u[mark];
      expect(upCard, `face-up deck has no card "${mark}"`).toBeTruthy();
      const a = down.reads[hook]![downCard];
      const b = up.reads[hook]![upCard];
      for (let i = 0; i < a.length; i++) {
        expect(
          b[i].replace(/^You chose /, 'YOU_DREW '),
          `${hook} / ${mark} / beat ${i + 1} drifted between facings`,
        ).toBe(a[i].replace(/^You turned /, 'YOU_DREW '));
      }
    }
  });
});

describe.each(DECKS_WITH_COMMITMENT)('%s — commitment reads', (deck) => {
  const reads = DECKS[deck].reads;
  const present = COMMITMENT_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !COMMITMENT_HOOKS.includes(h));

  it('every commitment read has all 3 cards and the full 4-beat structure', () => {
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

  // Caught two real repeats at authoring time that the check above could not see:
  // three hooks on one theme is exactly where a writer repeats themselves.
  it('beat 3 shares no 6-word run BETWEEN the commitment hooks either', () => {
    const found: string[] = [];
    for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) for (const c of CARDS) {
      for (const r of shared(reads[present[i]]![c][2], reads[present[j]]![c][2]))
        found.push(`${present[i]}/${c} ~ ${present[j]}/${c}: "${r}"`);
    }
    expect(found, `commitment hooks repeat each other:\n${found.join('\n')}`).toEqual([]);
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

  // The core guardrail. See the header note on why this angle needs it most.
  it('opener phrasing matches the facing — she TURNED a face-down card, CHOSE a face-up one', () => {
    const facing = DECKS[deck].facing;
    for (const h of present) for (const c of CARDS) {
      const opener = reads[h]![c][0];
      const want = facing === 'up' ? /^You chose / : /^You turned /;
      expect(opener, `${deck} is face-${facing}: ${h}/${c} opener is "${opener.slice(0, 24)}…"`).toMatch(want);
    }
  });

  it('never predicts, never gives a timeframe, never lands as HER fault', () => {
    const BANNED: Array<[RegExp, string]> = [
      [/\bhe will commit\b/i, 'promises he commits'],
      [/\bhe'll commit\b/i, 'promises he commits'],
      [/\bhe will never\b/i, 'pronounces he never will'],
      [/\bnever commit\b/i, 'pronounces he never will'],
      [/\bhe is not capable\b/i, 'verdict on his capacity'],
      [/\bwithin (a|the|\d)/i, 'timeframe'],
      [/\bin (a few|the next|\d+) (day|week|month|year)/i, 'timeframe'],
      [/\bsoon\b/i, 'timeframe'],
      [/\byour fault\b/i, 'blames her'],
      [/\btoo much\b/i, 'blames her'],
      [/\bnot enough\b/i, 'blames her'],
      [/\btoo available\b/i, 'blames her'],
      [/\btoo eager\b/i, 'blames her'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of BANNED) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat}"`);
    }
    expect(hits, `verdict/timeframe/blame language:\n${hits.join('\n')}`).toEqual([]);
  });
});
