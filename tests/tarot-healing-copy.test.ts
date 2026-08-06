// Copy guards for the /fb-tarot HEALING / MOVING-ON hooks (2026-08-04).
//
// Three headlines on the FACE-DOWN return-mhf deck: "Why can't I stop thinking about
// him?", "Why is he always on my mind?", "Why do I still think about someone who hurt me?"
//
// Why this angle needs its own guard file, beyond the generic ones:
//
//  1. IT IS THE FIRST ANGLE AIMED AT HER OWN MIND. Every previous family reads the man.
//     These read her thinking — so the affirmation target moves to her, while the
//     no-verdict-on-him rule must stay ON (a real man is in the picture, and on
//     cards-who-hurt-me she has named him). That combination is asserted here.
//
//  2. THREE FAILURE MODES, NOT TWO.
//       a. DIRECTIVES. "You need to let him go", "it's time to move on" — that is advice
//          about how she should live her life, not a reading, and it is not ours to give.
//       b. PROMISES. "He's thinking of you too" is the reunion angle's forbidden promise
//          wearing a softer coat, and it is the most tempting sentence on this angle.
//       c. PATHOLOGISING. "Obsessed", "stuck", "unhealthy", "you can't let go". A woman
//          still thinking about someone months later is not a diagnosis. This angle sits
//          closer to grief than any other on the funnel.
//
//  3. cards-who-hurt-me PULLS TWO WAYS AT ONCE. Minimising the hurt she has already
//     named ("maybe he didn't mean it") abandons her; pronouncing on him ("he is cruel")
//     is the verdict the funnel forbids. Both are banned, in the same beat.
//
//  4. NEAREST-NEIGHBOUR RECYCLING. The reunion family shipped the same morning, and
//     cards-ever-back speaks to the same long attachment. Beat 3 is compared against
//     every existing hook on the deck, with reunion called out separately.
//
// 🔴 Negation-aware by construction, as in the honesty and reunion guards: correct copy
// here routinely contains the banned phrase inside a refusal ("does not call this a
// failure to move on", "she was not naive for that"), so a naive substring ban would fail
// the very copy it protects.
import { describe, expect, it } from 'vitest';

const { DECKS, HEALING_HOOKS, REUNION_HOOKS, TAROT_HOOKS, HEADLINES, SELF_FRAME_HOOKS, angleForHook, openerCStart } =
  await import('@/content/tarotReads');

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

describe('healing hooks are wired end to end', () => {
  it('every healing hook is in the roster, has a headline, and reports angle=healing', () => {
    expect(HEALING_HOOKS.length).toBe(3);
    for (const h of HEALING_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=healing`).toBe('healing');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-cant-stop']).toBe("Why can't I stop thinking about him?");
    expect(HEADLINES['cards-on-my-mind']).toBe('Why is he always on my mind?');
    expect(HEADLINES['cards-who-hurt-me']).toBe('Why do I still think about someone who hurt me?');
  });

  // Operator instruction 2026-08-04: "make sure not to merge or reuse the same hooks
  // which are already in use for other landers". Three brand-new ids, nothing shared.
  it('reuses NO existing hook id and merges into no existing family', () => {
    for (const h of HEALING_HOOKS) {
      expect(REUNION_HOOKS, `${h} leaked into the reunion family`).not.toContain(h);
      expect(SELF_FRAME_HOOKS, `${h} leaked into the self-frame family`).not.toContain(h);
    }
    // Every id across the whole registry is unique.
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    // And no healing headline duplicates a live one (unlike cards-come-back, which
    // duplicates cards-return ON PURPOSE — that was a deliberate copy test, this is not).
    const others = TAROT_HOOKS.filter((h) => !HEALING_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of HEALING_HOOKS) {
      expect(others, `${h} headline collides with an existing lander`).not.toContain(HEADLINES[h]);
    }
  });

  // 🔴 Deliberately NOT self-frame. Self-frame drops the "reads HIM / never a verdict on
  // him" guardrails, which would be wrong here: a real man is in the picture and on
  // cards-who-hurt-me she has named him. The angle moves who is AFFIRMED, not whether he
  // may be judged. If someone later adds these to SELF_FRAME_HOOKS, this fails.
  it('is NOT self-frame — the no-verdict-on-him guardrails must stay on', () => {
    for (const h of HEALING_HOOKS) expect(angleForHook(h)).not.toBe('self-frame');
  });

  it('leaves every previously shipped family exactly where it was', () => {
    expect(angleForHook('cards-honest')).toBe('decode-him');
    expect(angleForHook('cards-return')).toBe('decode-him');
    expect(angleForHook('cards-come-back')).toBe('reunion');
    expect(angleForHook('cards-misled')).toBe('trust');
    expect(angleForHook('cards-lied-to')).toBe('honesty');
    expect(angleForHook('cards-will-commit')).toBe('commitment');
  });

  it('the opener asks about the SHAPE of her thinking, never for a justification', () => {
    for (const h of HEALING_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
    }
    // She must never be asked to recount the injury in order to be taken seriously.
    expect(openerCStart(DECK, 'cards-who-hurt-me', 'a')[1]).not.toMatch(/what did he do|what happened to you/i);
  });

  it('is FACE-DOWN ONLY — not ported to the face-up deck', () => {
    for (const h of HEALING_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — healing reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = HEALING_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !HEALING_HOOKS.includes(h));

  it('every healing read has all 3 cards and the full 4-beat structure', () => {
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

  // Called out separately: reunion shipped the same morning and cards-ever-back covers
  // the same long attachment. If these rhyme, the two families are one lander.
  it('beat 3 shares no 6-word run with the REUNION family specifically', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const rh of REUNION_HOOKS) {
      if (!reads[rh]) continue;
      for (const r of shared(reads[nh]![c][2], reads[rh]![c][2])) found.push(`${nh}/${c} ~ ${rh}/${c}: "${r}"`);
    }
    expect(found, `healing rhymes with reunion:\n${found.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run BETWEEN the three healing hooks either', () => {
    const found: string[] = [];
    for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) for (const c of CARDS) {
      for (const r of shared(reads[present[i]]![c][2], reads[present[j]]![c][2]))
        found.push(`${present[i]}/${c} ~ ${present[j]}/${c}: "${r}"`);
    }
    expect(found, `healing hooks repeat each other:\n${found.join('\n')}`).toEqual([]);
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
  const NEGATOR = /\b(no|not|never|n't|nor|rather than|instead of|does not|is not|nothing)\b/i;
  const clausesOf = (s: string) => s.split(/[—;:,]/);

  it('never issues a DIRECTIVE about how she should live', () => {
    const ASSERTIONS: Array<[RegExp, string]> = [
      [/\byou (need|have|ought) to (let (him )?go|move on|forgive|forget)\b/i, 'directive'],
      [/\bit('s| is) time to (let (him )?go|move on)\b/i, 'directive'],
      [/\byou must (let (him )?go|move on|stop)\b/i, 'directive'],
      [/\blet him go\b/i, 'directive: tells her to release him'],
      [/\btry to (move on|forget him)\b/i, 'directive'],
      [/\byou should (move on|forget|stop thinking)\b/i, 'directive'],
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

  it('never PROMISES — not his thoughts, not his return, not a timeframe', () => {
    const ASSERTIONS: Array<[RegExp, string]> = [
      [/\bhe (is|must be|will be) thinking (of|about) you\b/i, 'promise: claims his thoughts'],
      [/\bhe misses you\b/i, 'promise: claims his feeling'],
      [/\bhe feels it too\b/i, 'promise: claims mutuality'],
      [/\bhe (will|is going to) (come back|return)\b/i, 'promise: forecasts a return'],
      [/\byou are still connected\b/i, 'promise: asserts a bond'],
    ];
    const ALWAYS: Array<[RegExp, string]> = [
      [/\bwithin (a|the|\d)/i, 'timeframe'],
      [/\bin (a few|the next|\d+) (day|week|month|year)/i, 'timeframe'],
      [/\bsoon\b/i, 'timeframe'],
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
    expect(hits, `promise language:\n${hits.join('\n')}`).toEqual([]);
  });

  it('never PATHOLOGISES the thinking and never lands as her failing', () => {
    const ASSERTIONS: Array<[RegExp, string]> = [
      [/\bobsess(ed|ion|ive|ing)\b/i, 'pathologises'],
      [/\bunhealthy\b/i, 'pathologises'],
      [/\byou (are|have been) stuck\b/i, 'pathologises'],
      [/\byou (cannot|can't) let (him )?go\b/i, 'pathologises'],
      [/\b(dwelling|wallowing|fixated|clinging)\b/i, 'pathologises'],
      [/\b(weak|pathetic|foolish|naive|naivety|gullible)\b/i, 'blames her'],
      [/\byou should have (known|seen|moved on|forgotten)\b/i, 'blames her'],
      [/\byour own fault\b/i, 'blames her'],
      [/\bwasting your (time|life)\b/i, 'blames her'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of ASSERTIONS) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, `pathologising/blame language:\n${hits.join('\n')}`).toEqual([]);
  });

  // The fourth rule, unique to cards-who-hurt-me: it must neither minimise what she has
  // named nor pronounce on the man who did it.
  it('cards-who-hurt-me neither minimises the hurt nor convicts him', () => {
    const BANNED: Array<[RegExp, string]> = [
      [/\bhe did not mean (it|to hurt you)\b/i, 'minimises the hurt she named'],
      [/\bit was not that bad\b/i, 'minimises'],
      [/\byou are overreacting\b/i, 'minimises'],
      [/\bperhaps he did not\b/i, 'minimises'],
      [/\bhe (is|was) (cruel|toxic|a narcissist|abusive|a bad man)\b/i, 'verdict on him'],
      [/\bhe never (loved|cared about) you\b/i, 'verdict on him'],
    ];
    const hits: string[] = [];
    for (const c of CARDS) for (const beat of reads['cards-who-hurt-me']![c]) {
      for (const [re, why] of BANNED) if (re.test(beat)) hits.push(`${c} (${why}): "${beat}"`);
    }
    expect(hits, `minimise/verdict language:\n${hits.join('\n')}`).toEqual([]);
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
