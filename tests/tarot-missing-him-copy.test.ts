// Copy guards for the /fb-tarot MISSING-HIM hooks (2026-08-10).
//
// THREE headlines on the FACE-DOWN return-mhf deck: 'I miss him so much — will this ever stop
// hurting?', 'Will I ever stop missing him?', 'Why do I still miss him after everything?'
//
// Why this angle needs its own guard file, beyond the generic ones:
//
//  1. 🔴🔴 THE TIMEFRAME BAN IS THE COMMISSION, not an aside. Every other angle bans durations
//     in passing. Here TWO OF THE THREE HEADLINES ASK FOR ONE OUTRIGHT — "will this ever stop
//     hurting?" and "will I ever stop missing him?" are WHEN questions, so the visitor's own
//     headline hands the model a request for a date. The refusal IS the reading.
//
//  2. 🔴🔴 THE FOREVER BAN RUNS IN BOTH DIRECTIONS. "You will always miss him" is a life
//     sentence handed down by a stranger; "it will pass" is a promise the funnel cannot keep.
//     Borrowed from the loneliness family, the only other angle that needs it.
//
//  3. 🔴🔴 SHE MAY BE BEREAVED, AND THE HEADLINES DO NOT ASK. "I miss him so much" is exactly
//     what a widow types. A read that assumes he chose to leave is brutal if he died; one that
//     assumes a death is absurd if he left. So nothing may name the MANNER of his going — and
//     the mediumship failure mode of the soulmate-after-loss family applies here with no frame
//     to carry it, because this family runs under decode-him, which bans none of it, and
//     universalSafety.ts screens none of it either. Both asserted below, on the reads AND on
//     the generated prompt.
//
//  4. 🔴 NO SIXTH FRAME WAS ADDED — deliberately (the frame ternary in buildTarotReflectPrompt
//     is documented as being at its limit; the lookup refactor is owed as its own change). The
//     cost is that EVERY ban this family needs lives in the three TAROT_HOOK_TENDENCY strings
//     rather than in a guard clause. That is a real fragility, so the prompt-surface block
//     below asserts each ban string-by-string instead of trusting a frame to supply it.
//
//  5. IT MUST NOT COLLAPSE INTO `healing`. That family is live and 'cards-cant-stop' ("Why
//     can't I stop THINKING about him?") sits one word from 'cards-stop-missing' ("Will I ever
//     stop MISSING him?"). healing reads why the thinking persists; these read what the ache is
//     made of. Zero shared 6-word runs in beat 3 is what keeps that honest.
//
// 🔴 Negation-aware by construction, as in every sibling guard: the reads state their bans as
// refusals ("I will not give you a date"), so a naive regex fails on CORRECT copy.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  MISSING_HIM_HOOKS,
  HEALING_HOOKS,
  REUNION_HOOKS,
  LONELINESS_HOOKS,
  SOULMATE_AFTER_LOSS_HOOKS,
  SELF_FRAME_HOOKS,
  TAROT_HOOKS,
  HEADLINES,
  angleForHook,
  openerCStart,
} = await import('@/content/tarotReads');

const DECK = 'return-mhf' as const;
const CARDS = ['a', 'b', 'c'] as const;

// 🔴 The MANNER OF HIS GOING. Banned outright rather than clause-level: naming it plants the
// premise even inside a denial ("this is not about him walking out" still says walking out),
// and the whole point is that the copy does not know which woman is reading.
const MANNER = /\b(breakup|broke up|break-?up|dumped|he left you|walked out|split up|divorce[d]?|died|death|dead|passed away|passing|funeral|grave|widow(ed)?|loss of him)\b/i;

// 🔴 MEDIUMSHIP. Also outright — this family has no frame banning it, so the reads must not
// go near it in any form.
const MEDIUM = /\b(at peace|watching over|looking down on|in a better place|crossed over|the other side|he sent you|from beyond|his spirit|his soul)\b/i;

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const runsOf = (s: string, n = 6) => {
  const w = words(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
};
const shared = (a: string, b: string) => [...runsOf(a)].filter((r) => runsOf(b).has(r));

describe('missing-him hooks are wired end to end', () => {
  it('all three hooks are in the roster, have headlines, and report angle=missing-him', () => {
    expect(MISSING_HIM_HOOKS.length).toBe(3);
    for (const h of MISSING_HIM_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=missing-him`).toBe('missing-him');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-stop-hurting']).toBe('I miss him so much — will this ever stop hurting?');
    expect(HEADLINES['cards-stop-missing']).toBe('Will I ever stop missing him?');
    expect(HEADLINES['cards-still-miss-him']).toBe('Why do I still miss him after everything?');
  });

  // 🔴 The whole reason for a separate angle. healing is LIVE and one word away.
  it('is not merged into healing, and healing is left exactly as it was', () => {
    for (const h of MISSING_HIM_HOOKS) {
      expect(HEALING_HOOKS, `${h} leaked into healing`).not.toContain(h);
      expect(REUNION_HOOKS, `${h} leaked into reunion`).not.toContain(h);
      expect(LONELINESS_HOOKS, `${h} leaked into loneliness`).not.toContain(h);
      expect(SOULMATE_AFTER_LOSS_HOOKS, `${h} leaked into soulmate-after-loss`).not.toContain(h);
      // 🔴 A real man is in the picture, so the no-verdict-on-him guardrails must stay ON.
      // Filing any of these as self-frame swaps them for "affirm with CERTAINTY".
      expect(SELF_FRAME_HOOKS, `${h} leaked into self-frame`).not.toContain(h);
    }
    expect(HEALING_HOOKS.length, 'HEALING_HOOKS must stay exactly three').toBe(3);
    expect(angleForHook('cards-cant-stop')).toBe('healing');
    expect(angleForHook('cards-on-my-mind')).toBe('healing');
    expect(angleForHook('cards-who-hurt-me')).toBe('healing');
  });

  it('reuses no existing hook id and no existing headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    const others = TAROT_HOOKS.filter((h) => !MISSING_HIM_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of MISSING_HIM_HOOKS) {
      expect(others, `${h} headline collides with an existing lander`).not.toContain(HEADLINES[h]);
    }
  });

  it('leaves every previously shipped family exactly where it was', () => {
    expect(angleForHook('cards-honest')).toBe('decode-him');
    expect(angleForHook('cards-misled')).toBe('trust');
    expect(angleForHook('cards-lied-to')).toBe('honesty');
    expect(angleForHook('cards-will-commit')).toBe('commitment');
    expect(angleForHook('cards-come-back')).toBe('reunion');
    expect(angleForHook('cards-pulling-away')).toBe('pulling-away');
    expect(angleForHook('cards-back-together')).toBe('reconciliation');
    expect(angleForHook('cards-new-soulmate')).toBe('soulmate-after-loss');
    expect(angleForHook('cards-where-soulmate')).toBe('soulmate-where');
    expect(angleForHook('cards-alone-forever')).toBe('loneliness');
    expect(angleForHook('cards-someone-else')).toBe('fidelity');
    expect(angleForHook('cards-love-again')).toBe('self-frame');
  });

  // 🔴 Same no-manufactured-despair rule as loneliness, binding harder: 'cards-stop-hurting'
  // says "hurting" in the headline, so an opener asking her to rate the pain would produce the
  // exact phrasings SOFT_CRISIS_PATTERNS screens for, on a page that invited them.
  it('the openers ask for a concrete detail and never manufacture despair', () => {
    for (const h of MISSING_HIM_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      expect(q, `${h} opener fishes for despair`).not.toMatch(/how (bad|much|painful)|how do you (feel|cope)|what are the nights|cry|worst|unbearable|hopeless|can you go on/i);
      // 🔴 And none may ask HOW he came to be gone.
      expect(q, `${h} opener presumes the manner of his going`).not.toMatch(MANNER);
      expect(q, `${h} opener asks her to recount the harm`).not.toMatch(/what did he do|what happened between|why did he/i);
    }
  });

  // ⚠ The nearest live openers. Sharing wording collapses the families at the first line.
  it('the openers rhyme with none of the healing openers', () => {
    const body = (s: string) => s.replace(/^Before I look closer, tell me…\s*/, '');
    for (const h of MISSING_HIM_HOOKS) for (const oh of HEALING_HOOKS) {
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
  // ⚠ This family's exposure is different from fidelity's. It is not the infidelity
  // vocabulary that puts it at risk; it is DISTRESS vocabulary, because 'cards-stop-hurting'
  // is a first-person statement of emotional pain. Both sets are swept here: nothing may put
  // clinical-depression or self-harm language on a page the platform reads, and nothing may
  // reintroduce the word the fidelity family exists to avoid.
  it('no platform-flagged term on any of the four surfaces', () => {
    const FLAGGED = /\b(cheat\w*|affairs?|infidelity|suicid\w*|kill yourself|self[- ]harm|depress\w*|worthless|hopeless|breakdown)\b/i;
    const hits: string[] = [];
    for (const h of MISSING_HIM_HOOKS) {
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
    for (const h of MISSING_HIM_HOOKS) {
      // 🔑 A hook with no reads on the resolved deck silently falls back to DEFAULT_HOOK, so
      // PostHog would report every visitor on the new ad as cards-honest. This is that gate.
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — missing-him reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = MISSING_HIM_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !MISSING_HIM_HOOKS.includes(h));

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
  const NEGATOR = /\b(no|not|never|n't|nor|rather than|instead of|does not|is not|nothing|neither|without)\b/i;
  const clausesOf = (s: string) => s.split(/[—;:,]/);

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

  // ⭐⭐ THE COMMISSION. Two headlines ask for a duration; none may be supplied.
  it('never gives a TIMEFRAME — the refusal is the reading', () => {
    const hits = scan(
      [
        [/\bwithin (a|the|\d)/i, 'timeframe'],
        [/\bin (a few|the next|another|\d+) (day|week|month|year)/i, 'timeframe'],
        [/\bsoon\b/i, 'timeframe'],
        [/\btime heals\b/i, 'the folk timeframe'],
        [/\bgive it (time|a year|six months|another)/i, 'timeframe as instruction'],
        [/\bone day you('ll| will)\b/i, 'a dated promise'],
        [/\bI promise\b/i, 'a promise the funnel cannot keep'],
        [/\bby (next|this) (week|month|year|spring|summer|autumn|winter)/i, 'timeframe'],
      ],
      [
        [/\bit (will|does) (pass|fade|ease|get easier)\b/i, 'promises the ache ends'],
        [/\byou (will|'ll) (feel better|be over (him|it)|heal)\b/i, 'promises recovery'],
        [/\bthese things take\b/i, 'a rule of thumb about duration'],
      ],
    );
    expect(hits, `timeframe language:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ Both poles. "Always" is a life sentence; "it stops" is a promise.
  it('rules on FOREVER in neither direction', () => {
    const hits = scan(
      [],
      [
        [/\byou will always (miss|love|feel|hurt)\b/i, 'life sentence: rules that it lasts'],
        [/\byou('ll| will) never (stop|get over|be free)\b/i, 'life sentence'],
        [/\ba part of you always will\b/i, 'life sentence in a softer coat'],
        // ⚠ Must catch a PREDICTION, not the reads quoting her own question back to her —
        // 'cards-stop-hurting'/b opens beat 3 with "You asked when it stops", which is the
        // question being named before it is refused. A bare /it stops/ fired on that and
        // caught nothing real. These require the claim form instead, and cover more of the
        // actual prediction space than the pattern they replace.
        [/\bit will (end|stop|be over|be gone)\b/i, 'promises an end'],
        [/\bthe (ache|hurt|pain|missing|grief) (will )?(end|stop|pass|fade|lift)(s|es)?\b/i, 'promises an end'],
        [/\byou will stop (missing|hurting|feeling)\b/i, 'promises an end'],
      ],
    );
    expect(hits, `forever language:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ She may be a widow. The copy does not know, and must not guess.
  it('never states or implies HOW he came to be gone', () => {
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const [i, beat] of reads[h]![c].entries()) {
      if (MANNER.test(beat)) hits.push(`${h}/${c} beat ${i + 1}: "${beat}"`);
    }
    expect(hits, `presumes the manner of his going:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ No frame carries this ban for this family — see the header note.
  it('never speaks for him, and never speaks for the dead', () => {
    const mediumHits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const [i, beat] of reads[h]![c].entries()) {
      if (MEDIUM.test(beat)) mediumHits.push(`${h}/${c} beat ${i + 1}: "${beat}"`);
    }
    expect(mediumHits, `MEDIUMSHIP on a family with no frame to ban it:\n${mediumHits.join('\n')}`).toEqual([]);

    const hits = scan(
      [],
      [
        [/\bhe (is|must be|will be) thinking (of|about) you\b/i, 'claims his thoughts'],
        [/\bhe misses you\b/i, 'claims his feeling'],
        [/\bhe (feels|felt) it too\b/i, 'claims mutuality'],
        [/\bhe (will|is going to) (come back|return)\b/i, 'forecasts a return'],
        [/\bhe (would want|wanted) you to\b/i, 'speaks for him'],
        [/\byou are still connected\b/i, 'asserts a bond'],
      ],
    );
    expect(hits, `speaks for him:\n${hits.join('\n')}`).toEqual([]);
  });

  it('never issues a DIRECTIVE about how she should live', () => {
    const hits = scan(
      [],
      [
        [/\blet him go\b/i, 'directive: tells her to release him'],
        [/\byou (need|have|ought) to (let (him )?go|move on|forgive|forget|grieve)\b/i, 'directive'],
        [/\bit('s| is) time to (let (him )?go|move on|heal)\b/i, 'directive'],
        [/\byou (should|must) (move on|forget|stop|forgive)\b/i, 'directive'],
        [/\b(find|get|seek) closure\b/i, 'directive'],
        [/\b(delete|block|unfollow) (his|him|the photos)\b/i, 'a tactic, not a reading'],
        [/\bstart dating\b/i, 'a tactic, not a reading'],
      ],
    );
    expect(hits, `directive language:\n${hits.join('\n')}`).toEqual([]);
  });

  it('never PATHOLOGISES the missing and never lands as her failing', () => {
    const hits = scan(
      [],
      [
        [/\b(obsessed|obsession|obsessive)\b/i, 'pathologises'],
        [/\b(unhealthy|toxic|dysfunctional)\b/i, 'pathologises'],
        [/\byou are stuck\b/i, 'pathologises'],
        [/\b(trauma[- ]bond|codependen|attachment (issue|disorder|style)|abandonment issues)/i, 'clinical label'],
        [/\byou (are|were) (weak|naive|foolish|desperate|pathetic)\b/i, 'lands as her failing'],
        [/\b(low )?self[- ]worth\b/i, 'lands as her failing'],
        [/\byour (poor |weak )?boundaries\b/i, 'lands as her failing'],
        [/\byou (did not|didn't) love yourself\b/i, 'lands as her failing'],
        [/\byou are not over him\b/i, 'grades her progress'],
      ],
    );
    expect(hits, `pathologising language:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⚠ cards-still-miss-him only: she has ALREADY named a harm. Two opposite pulls.
  it('cards-still-miss-him neither minimises the harm nor pronounces on him', () => {
    const beats = CARDS.flatMap((c) => reads['cards-still-miss-him']![c]);
    const hits: string[] = [];
    const BANS: Array<[RegExp, string]> = [
      [/\bit (was|wasn't) (that|so) bad\b/i, 'minimises what she named'],
      [/\bhe (did not|didn't) mean\b/i, 'excuses him'],
      [/\bhe was (doing his best|hurting too|struggling)\b/i, 'excuses him'],
      [/\bhe (is|was) (a good man|toxic|a narcissist|abusive|not worth)\b/i, 'pronounces on him'],
      [/\btry to see it from his\b/i, 'directs her to excuse him'],
      [/\bin the past\b.*\bleave it\b/i, 'directive'],
    ];
    for (const beat of beats) for (const clause of clausesOf(beat)) {
      if (NEGATOR.test(clause)) continue;
      for (const [re, why] of BANS) if (re.test(clause)) hits.push(`(${why}): "${clause.trim()}"`);
    }
    expect(hits, `minimising or convicting:\n${hits.join('\n')}`).toEqual([]);
  });

  // ── Distinctness ───────────────────────────────────────────────────────────
  it('beat 3 shares no 6-word run with any EXISTING hook on this deck', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of existing) {
      for (const r of shared(reads[nh]![c][2], reads[oh]![c][2])) found.push(`${nh}/${c} ~ ${oh}/${c}: "${r}"`);
    }
    expect(found, `recycled wording:\n${found.join('\n')}`).toEqual([]);
  });

  // 🔴 Called out separately: healing is the family these three are measured against.
  it('beat 3 shares no 6-word run with the HEALING family on any card', () => {
    const found: string[] = [];
    for (const nh of present) for (const c1 of CARDS) for (const oh of HEALING_HOOKS) for (const c2 of CARDS) {
      const other = reads[oh]?.[c2];
      if (!other) continue;
      for (const r of shared(reads[nh]![c1][2], other[2])) found.push(`${nh}/${c1} ~ ${oh}/${c2}: "${r}"`);
    }
    expect(found, `rhymes with the live healing landers:\n${found.join('\n')}`).toEqual([]);
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
// 🔴 THIS BLOCK CARRIES MORE WEIGHT HERE THAN IN ANY SIBLING GUARD. No sixth frame was added,
// so the shared decode-him guard supplies NONE of this family's four bans — they live only in
// the TAROT_HOOK_TENDENCY strings. If one is edited away, nothing else catches it.
describe('missing-him — the generated Version-C prompt', () => {
  const userData = { firstName: 'Sarah', bucket: 'love', timeOfDay: 'evening' };

  it('runs under the decode-him frame and picks up no other angle guard', async () => {
    const { buildTarotReflectPrompt } = await import('../server/lib/prompts');
    const ud = userData as Parameters<typeof buildTarotReflectPrompt>[0];
    for (const h of MISSING_HIM_HOOKS) {
      const p = buildTarotReflectPrompt(ud, DECK, h, 'a', 'It has been about eight months now.');
      // A real man is in the picture, so the no-verdict-on-him guardrails must stay ON.
      expect(p, `${h} must run under the decode-him guard`).toMatch(/TENDENCY, NEVER A VERDICT/);
      expect(p, `${h} picked up another family's frame`).not.toMatch(
        /Affirm the hopeful yes with warmth and certainty|NEVER PLACE A PERSON|NOTHING IS FATED|NEVER SPEAK FOR THE PERSON SHE LOST/,
      );
      // The hook has to resolve — a missing TAROT_HOOK_CONTEXT entry silently yields ''.
      expect(p, `${h} has no her_situation context`).not.toMatch(/her_situation:\s*\n/);
    }
  });

  it('every hook carries the TIMEFRAME refusal into the prompt', async () => {
    const { buildTarotReflectPrompt } = await import('../server/lib/prompts');
    const ud = userData as Parameters<typeof buildTarotReflectPrompt>[0];
    for (const h of MISSING_HIM_HOOKS) {
      const p = buildTarotReflectPrompt(ud, DECK, h, 'a', 'A long time.');
      expect(p, `${h} prompt does not ban a duration`).toMatch(/NEVER give a (duration|date|timeframe)/i);
    }
  });

  it('every hook carries the FOREVER refusal in both directions', async () => {
    const { buildTarotReflectPrompt } = await import('../server/lib/prompts');
    const ud = userData as Parameters<typeof buildTarotReflectPrompt>[0];
    const p1 = buildTarotReflectPrompt(ud, DECK, 'cards-stop-hurting', 'a', 'x');
    expect(p1).toMatch(/NEVER say it will pass and NEVER say it will not/i);
    const p2 = buildTarotReflectPrompt(ud, DECK, 'cards-stop-missing', 'a', 'x');
    expect(p2).toMatch(/never say she will always miss him and never promise that she will stop/i);
  });

  it('every hook bans presuming the manner of his going, and bans mediumship', async () => {
    const { buildTarotReflectPrompt } = await import('../server/lib/prompts');
    const ud = userData as Parameters<typeof buildTarotReflectPrompt>[0];
    for (const h of MISSING_HIM_HOOKS) {
      const p = buildTarotReflectPrompt(ud, DECK, h, 'a', 'x');
      expect(p, `${h} prompt does not ban presuming how he came to be gone`).toMatch(
        /NEVER state or imply (how he came to be gone|HOW he came to be gone)/i,
      );
    }
    // 🔴 The two hooks whose headline a bereaved woman is most likely to click carry the
    // mediumship ban explicitly, because no frame supplies it.
    for (const h of ['cards-stop-hurting', 'cards-stop-missing'] as const) {
      const p = buildTarotReflectPrompt(ud, DECK, h, 'a', 'x');
      expect(p, `${h} prompt does not ban speaking for the dead`).toMatch(/at peace/i);
    }
  });

  it('cards-still-miss-him bans BOTH minimising the harm and convicting him', async () => {
    const { buildTarotReflectPrompt } = await import('../server/lib/prompts');
    const ud = userData as Parameters<typeof buildTarotReflectPrompt>[0];
    const p = buildTarotReflectPrompt(ud, DECK, 'cards-still-miss-him', 'a', 'x');
    expect(p).toMatch(/NEVER minimise, excuse, reframe or explain away the harm she has already named/i);
    expect(p).toMatch(/NEVER pronounce on him as a person/i);
    expect(p).toMatch(/trauma bonding|attachment disorder/i);
  });

  // 🔴 The shared decode-him guard is used by every other angle too. Assert it did not get
  // quietly reworded while this family was being added.
  it('leaves the shared decode-him guard exactly as it was', async () => {
    const { buildTarotReflectPrompt } = await import('../server/lib/prompts');
    const ud = userData as Parameters<typeof buildTarotReflectPrompt>[0];
    const p = buildTarotReflectPrompt(ud, DECK, 'cards-honest', 'a', 'not sure');
    expect(p).toMatch(/Never declare he is lying, faithful, involved with someone else, or coming back as a fact/);
    // The 2026-08-07 fidelity rewording must survive.
    expect(p).not.toMatch(/\bcheating\b/i);
  });
});
