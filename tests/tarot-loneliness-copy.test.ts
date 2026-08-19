// Copy guards for the /fb-tarot LONELINESS hooks (2026-08-07).
//
// Three headlines on the FACE-DOWN return-mhf deck: 'Will I be alone forever?',
// 'Am I meant to be alone?', 'Is there really someone out there for me?'
//
// Why this angle needs its own guard file, beyond the generic ones:
//
//  1. 🔴 IT IS THE CLOSEST ANGLE ON THE FUNNEL TO THE CRISIS SURFACE. No other family
//     selects for this emotional state. `SOFT_CRISIS_PATTERNS` in
//     server/lib/universalSafety.ts screens for exactly the phrasing these headlines invite
//     ("nothing left to live for", "i feel hopeless/worthless/empty/numb/broken", "life
//     feels meaningless", "tired of living") and injects the 988/741741 note. That is the
//     system working — but it means the OPENERS carry a constraint no other family has:
//     they must not MANUFACTURE despair. Asserted below.
//
//  2. 🔴 THE FATE BAN, WHICH EXISTS NOWHERE ELSE. 'cards-meant-alone' asks for a ruling on
//     her NATURE, not on a man or a relationship. "Some people are meant to be alone" is
//     the single most harmful sentence this funnel could produce, aimed at the audience
//     least able to discount it — and "you are meant for someone" is a promise wearing
//     destiny's clothes. Both banned, plus fate/destiny/plan/purpose/lesson language.
//
//  3. THE FOREVER VERDICT, BOTH WAYS. Same structure as cards-really-over: "you will be
//     alone" is a life sentence delivered by a stranger, "you will not be" is a promise the
//     funnel cannot keep. cards-alone-forever must visibly REFUSE its own headline.
//
//  4. NOT self-frame — and this is the sharpest instance of that call yet. No man exists in
//     these hooks at all, so self-frame looks like the natural home. Its clause is "affirm
//     the hopeful yes with CERTAINTY", and certainty about whether a person will spend
//     their life alone IS the harm. Nor soulmate-where (whose defining ban is naming a
//     place, irrelevant here) nor soulmate-after-loss (which presumes a bereavement these
//     headlines must not presume).
//
//  5. ⚠ AUDIENCE-AGNOSTIC. None of the three headlines mentions an ex, a loss or a breakup,
//     so the reads may never presume she has had love before AND may never presume she has
//     not. Both "after what you have been through" and "you have never had this" are out.
//
// 🔴 Negation-aware by construction, as in every sibling guard: correct copy here routinely
// contains a banned phrase inside a refusal ("I will not tell you that you are meant for
// solitude", "nobody's forever exists anywhere a card could read it"), so a naive substring
// ban would fail the very copy it protects.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  LONELINESS_HOOKS,
  SOULMATE_WHERE_HOOKS,
  SOULMATE_AFTER_LOSS_HOOKS,
  SELF_FRAME_HOOKS,
  RECONCILIATION_HOOKS,
  REUNION_HOOKS,
  PULLING_AWAY_HOOKS,
  HEALING_HOOKS,
  COMMITMENT_HOOKS,
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

describe('loneliness hooks are wired end to end', () => {
  it('every hook is in the roster, has a headline, and reports angle=loneliness', () => {
    expect(LONELINESS_HOOKS.length).toBe(3);
    for (const h of LONELINESS_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=loneliness`).toBe('loneliness');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-alone-forever']).toBe('Will I be alone forever?');
    expect(HEADLINES['cards-meant-alone']).toBe('Am I meant to be alone?');
    expect(HEADLINES['cards-someone-for-me']).toBe('Is there really someone out there for me?');
  });

  // ⭐⭐ THE SAFETY PIN. No man exists in these hooks, so self-frame is the obvious filing —
  // and its "affirm with CERTAINTY" clause is precisely the harm, since certainty about
  // someone's lifelong solitude is forbidden in both directions.
  it('is NOT self-frame — certainty about a life alone is the harm itself', () => {
    for (const h of LONELINESS_HOOKS) {
      expect(SELF_FRAME_HOOKS, `${h} leaked into SELF_FRAME_HOOKS — it would gain the certainty clause`).not.toContain(h);
      expect(angleForHook(h)).not.toBe('self-frame');
    }
    expect(SELF_FRAME_HOOKS.length).toBe(2);
    expect(angleForHook('cards-soulmate')).toBe('self-frame');
  });

  // Both soulmate families ask about a PERSON who might exist. These ask whether HER LIFE
  // stays as it is. Merging them loses three separately-commissioned families' readability
  // and swaps guards that ban different things.
  it('is neither soulmate family, and does not leak into any other', () => {
    for (const h of LONELINESS_HOOKS) {
      expect(SOULMATE_WHERE_HOOKS, `${h} leaked into soulmate-where`).not.toContain(h);
      expect(SOULMATE_AFTER_LOSS_HOOKS, `${h} leaked into soulmate-after-loss`).not.toContain(h);
      expect(RECONCILIATION_HOOKS, `${h} leaked into reconciliation`).not.toContain(h);
      expect(REUNION_HOOKS, `${h} leaked into reunion`).not.toContain(h);
      expect(PULLING_AWAY_HOOKS, `${h} leaked into pulling-away`).not.toContain(h);
      expect(HEALING_HOOKS, `${h} leaked into healing`).not.toContain(h);
      expect(COMMITMENT_HOOKS, `${h} leaked into commitment`).not.toContain(h);
    }
    expect(SOULMATE_WHERE_HOOKS.length).toBe(3);
    expect(SOULMATE_AFTER_LOSS_HOOKS.length).toBe(3);
  });

  it('reuses no existing hook id and no existing headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    const others = TAROT_HOOKS.filter((h) => !LONELINESS_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of LONELINESS_HOOKS) {
      expect(others, `${h} headline collides with an existing lander`).not.toContain(HEADLINES[h]);
    }
  });

  it('leaves every previously shipped family exactly where it was', () => {
    expect(angleForHook('cards-honest')).toBe('decode-him');
    expect(angleForHook('cards-misled')).toBe('trust');
    expect(angleForHook('cards-lied-to')).toBe('honesty');
    expect(angleForHook('cards-will-commit')).toBe('commitment');
    expect(angleForHook('cards-come-back')).toBe('reunion');
    expect(angleForHook('cards-cant-stop')).toBe('healing');
    expect(angleForHook('cards-pulling-away')).toBe('pulling-away');
    expect(angleForHook('cards-back-together')).toBe('reconciliation');
    expect(angleForHook('cards-new-soulmate')).toBe('soulmate-after-loss');
    expect(angleForHook('cards-where-soulmate')).toBe('soulmate-where');
    expect(angleForHook('cards-love-again')).toBe('self-frame');
  });

  // 🔴🔴 THE CONSTRAINT NO OTHER FAMILY HAS. This angle already selects for the emotional
  // state SOFT_CRISIS_PATTERNS exists to catch. An opener like "what does the loneliness
  // feel like?" or "what do you tell yourself at night?" would actively produce the phrasing
  // it screens for. Each opener must ask her to THINK, not to describe the pain.
  it('the openers do not manufacture despair', () => {
    for (const h of LONELINESS_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      expect(q, `${h} opener digs at the pain directly`).not.toMatch(/how (lonely|alone|bad) (do|does)|what does (the|it) (loneliness|emptiness)|how much does it hurt|tell me about the lonel/i);
      expect(q, `${h} opener invites a despair narrative`).not.toMatch(/what do you tell yourself (at night|when)|how do you cope|worst part|darkest/i);
      // Audience-agnostic: must not sort never-partnered from post-breakup, and must not
      // ask her to account for the duration.
      expect(q, `${h} opener presumes her history`).not.toMatch(/have you ever been|your last relationship|since (he|your ex)|after (he|your)/i);
      expect(q, `${h} opener asks her to justify the duration`).not.toMatch(/how long have you been (alone|single)|why do you think you are still/i);
    }
  });

  it('is FACE-DOWN ONLY — not ported to the face-up decks', () => {
    for (const h of LONELINESS_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — loneliness reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = LONELINESS_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !LONELINESS_HOOKS.includes(h));

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

  it('beat 3 shares no 6-word run with any EXISTING hook on this deck', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of existing) {
      for (const r of shared(reads[nh]![c][2], reads[oh]![c][2])) found.push(`${nh}/${c} ~ ${oh}/${c}: "${r}"`);
    }
    expect(found, `recycled wording:\n${found.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run with the live SELF-FRAME incumbents', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of SELF_FRAME_HOOKS) {
      for (const deck of ['arcana-mfh', 'arcana-eef'] as const) {
        const inc = DECKS[deck].reads[oh];
        if (!inc) continue;
        for (const r of shared(reads[nh]![c][2], inc[c][2])) found.push(`${nh}/${c} ~ ${oh}@${deck}/${c}: "${r}"`);
      }
    }
    expect(found, `rhymes with the running baseline:\n${found.join('\n')}`).toEqual([]);
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
    /\b(no|not|never|can't|unable|n't|nor|nobody|no one|none|cannot|rather than|instead of|does not|is not|nothing|refuses?|declines?|will not|would not|withholds?|neither|without)\b/i;
  // 🔴 FIXED 2026-08-19 — this used to split on /[—;:,]/ only, which does NOT break on a
  // full stop or a newline. Beat 3 carries four bubbles joined by '\n' since the migration, so
  // a single negator in the first of them ('it was never you') put the whole of the remaining
  // three behind the negation exemption and every clause ban in them was skipped silently.
  // Found by feeding the gate a deliberate violation rather than trusting its green tick.
  const clausesOf = (s: string) => s.split(/[—;:,.\n]/);

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

  // 🔴🔴 THE ONE WITH NO PRECEDENT. Every other angle forbids a verdict on a man or a
  // relationship. This forbids a verdict on HER NATURE — whether she is designated for
  // this. Both directions do harm and the "kind" one is still a fate claim.
  // 🔄 LOOSENED 2026-08-19, operator call. Fate language is the GENRE — a tarot lander that
  // may not say "meant to be" is being held to a rule written for regulated products, and the
  // operator has already ruled once that those do not apply here. What stays banned is fate
  // pointed AT HER SUFFERING: being assigned a life alone, or being told the pain has a
  // purpose, which is the same sentence in kinder clothes and makes it her own.
  it('never assigns her the solitude, and never makes her suffering purposeful', () => {
    const FATE: Array<[RegExp, string]> = [
      [/\byou (are|were) meant to be alone\b/i, 'fate: the most harmful sentence available'],
      [/\bsome people are meant to be alone\b/i, 'fate: generalised designation'],
      [/\byou (are|were) meant to (carry|bear|go without)\b/i, 'assigns her the going-without'],
      [/\b(this|it) is (a lesson|a test|preparing you|teaching you)\b/i, 'makes her suffering purposeful'],
      [/\bthere is a reason (for this|you are alone)\b/i, 'makes her suffering purposeful'],
      [/\byou (needed|had) to (learn|lose|go through)\b/i, 'makes her suffering purposeful'],
    ];
    const hits = sweep(FATE);
    expect(hits, `FATE claim:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔄 LOOSENED 2026-08-19, operator call, and now DIRECTIONAL. It used to rule out both
  // answers, which is why cards-alone-forever had to visibly decline its own headline. The
  // two directions are not the same thing: "this is not forever" is what she came for, and
  // "you will be alone" is a stranger handing a woman a life sentence off an ad. Only the
  // second one has a victim, so only the second one stays banned — along with DATED claims,
  // which are the only ones she can check and the only ones that come back as refunds.
  it('never hands her the LIFE SENTENCE, and never puts a date on the arrival', () => {
    const FOREVER: Array<[RegExp, string]> = [
      [/\byou will (be|end up|remain|stay) alone\b/i, 'a life sentence from a stranger'],
      [/\byou will always be (alone|on your own)\b/i, 'a life sentence'],
      [/\byou will be alone forever\b/i, 'a life sentence'],
      [/\bno one (is|will be) coming\b/i, 'a life sentence'],
      [/\bit (is|'s) too late for you\b/i, 'a life sentence'],
    ];
    const ALWAYS: Array<[RegExp, string]> = [
      [/\bwithin (a|the|\d)/i, 'a dated prediction'],
      [/\bin (a few|the next|\d+) (day|week|month|year)/i, 'a dated prediction'],
      [/\bby (the end of|christmas|new year|spring|summer|autumn|winter)\b/i, 'a dated prediction'],
      [/\bit will happen when you\b/i, 'makes the arrival her homework'],
      [/\bI promise\b/i, 'a promise the funnel cannot keep'],
    ];
    const hits = sweep(FOREVER, ALWAYS);
    expect(hits, `life sentence / dated claim:\n${hits.join('\n')}`).toEqual([]);
  });

  // She arrives having already been told every one of these by someone who meant well.
  it('never pathologises her and never hands her a tactic', () => {
    const BANS: Array<[RegExp, string]> = [
      [/\byou (are|'re) (being )?(too )?(negative|defeatist|pessimistic|bitter|closed off|jaded)\b/i, 'pathologising'],
      [/\byou (have|'ve) given up\b/i, 'pathologising'],
      [/\byou (are|'re) (sabotaging|blocking|pushing (people|them) away)\b/i, 'pathologising'],
      [/\byou attract what you\b/i, 'pathologising — the manifesting version'],
      [/\byour (energy|vibration|mindset) is\b/i, 'pathologising'],
      [/\b(work on|heal|love|fix) yourself first\b/i, 'strategy + her fault'],
      [/\b(get|go) out (there )?more\b/i, 'strategy'],
      [/\bput yourself out there\b/i, 'strategy'],
      [/\bstop looking\b/i, 'strategy'],
      [/\bstay positive\b/i, 'the reassurance she has already exhausted'],
      [/\btrust the universe\b/i, 'the reassurance she has already exhausted'],
    ];
    const hits = sweep(BANS);
    expect(hits, `pathologising / strategy:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⚠ Audience-agnostic. The ad does not sort never-partnered from post-breakup, so the
  // read must not presume either — in EITHER direction.
  it('never presumes whether she has had love before', () => {
    const PRESUME: Array<[RegExp, string]> = [
      [/\bafter (what|everything) you (have|'ve) been through\b/i, 'presumes a loss'],
      [/\bthe one who (left|hurt) you\b/i, 'presumes a loss'],
      [/\bsince (he|they) left\b/i, 'presumes a loss'],
      [/\byou (have|'ve) never (had|known|felt) (this|love|it)\b/i, 'presumes she never has'],
      [/\bfor someone who has never\b/i, 'presumes she never has'],
      [/\byour (past|previous) relationships?\b/i, 'presumes a history'],
    ];
    const hits = sweep(PRESUME);
    expect(hits, `presumes her history:\n${hits.join('\n')}`).toEqual([]);
  });

  // Like cards-really-over, cards-moved-on and cards-ready-to-love before it, this headline
  // hands over a question whose only two answers are both forbidden. The read must visibly
  // DECLINE it — a quiet sidestep reads as evasion rather than as a reading.
  it('cards-alone-forever visibly REFUSES to answer its own headline', () => {
    const refusals = /not going to describe|nobody's forever|never measures|will not tell you|cannot be made to hold|no honest reading/i;
    for (const c of CARDS) {
      const beat = reads['cards-alone-forever']![c][2];
      expect(beat, `cards-alone-forever/${c} must decline the absolute outright`).toMatch(refusals);
    }
    // The finding that replaces it: 'forever' describes the WEIGHT, not the length.
    const joined = CARDS.map((c) => reads['cards-alone-forever']![c][2]).join(' ').toLowerCase();
    expect(joined, 'must route to weight/exhaustion, not to a forecast').toMatch(/weight|exhaustion|heavy|endurance|tired|carried/);
  });

  // The sharpest hook: it must refuse the PREMISE that anything is being assigned, not just
  // decline to answer. Without the finding it becomes an evasion.
  it('cards-meant-alone refuses the premise that anything is assigned', () => {
    const joined = CARDS.map((c) => reads['cards-meant-alone']![c][2]).join(' ').toLowerCase();
    expect(joined).toMatch(/assign|designation|decided|author|singled out|circumstance/);
  });

  // 🔴 Its finding had to dodge cards-soulmate-out-there (the one-chance premise) AND
  // cards-still-a-chance (hope is not a failure of realism). It reads the EPISTEMICS.
  it('cards-someone-for-me reads the epistemics, not the hope', () => {
    const joined = CARDS.map((c) => reads['cards-someone-for-me']![c][2]).join(' ').toLowerCase();
    expect(joined).toMatch(/comfort|reassur|answer|unknown|proof|truth|believe/);
  });
});

// The server-side prompt path is a DIFFERENT surface from the canned reads.
describe('server prompt path carries the loneliness frame', () => {
  const loadSrc = (rel: string) =>
    import('node:fs').then((fs) => fs.promises.readFile(new URL(rel, import.meta.url), 'utf8'));

  it('every hook has its own context, tendency and frame-set entry', async () => {
    const src = await loadSrc('../server/lib/prompts.ts');
    for (const h of LONELINESS_HOOKS) {
      const occurrences = src.split(`'${h}'`).length - 1;
      expect(occurrences, `${h} must appear in BOTH prompt maps and the frame set`).toBeGreaterThanOrEqual(3);
    }
  });

  // 🔴 Hand-mirrored against LONELINESS_HOOKS. Drift is a SAFETY defect: a hook missing from
  // the server set falls through to the decode-him guard, which bans none of fate, forever,
  // pathologising or presuming her history.
  it('the server loneliness set mirrors the client roster exactly', async () => {
    const src = await loadSrc('../server/lib/prompts.ts');
    const block = src.match(/const LONELINESS_TAROT_HOOKS = new Set\(\[(.*?)\]\)/s);
    expect(block, 'LONELINESS_TAROT_HOOKS not found in prompts.ts').toBeTruthy();
    for (const h of LONELINESS_HOOKS) {
      expect(block![1], `${h} missing — it would run under a guard with no fate ban`).toContain(h);
    }
    for (const h of [...SELF_FRAME_HOOKS, ...SOULMATE_WHERE_HOOKS, ...SOULMATE_AFTER_LOSS_HOOKS]) {
      expect(block![1], `${h} must not be in the loneliness set`).not.toContain(`'${h}'`);
    }
  });

  it('the generated Version-C prompt carries the fate + forever ban, not the certainty clause', async () => {
    const { buildTarotReflectPrompt } = await import('../server/lib/prompts');
    const userData = {
      firstName: 'Test', email: null, bucket: null, subBucket: null, personName: null,
      concern: null, desires: null, location: null, timeOfDay: null, objectionCount: 0,
    } as Parameters<typeof buildTarotReflectPrompt>[0];

    for (const h of LONELINESS_HOOKS) {
      const p = buildTarotReflectPrompt(userData, DECK, h, 'a', 'I have been on my own a long time.');
      expect(p, `${h} must carry the fate + forever ban`).toMatch(/NOTHING IS FATED AND NOTHING IS FOREVER/);
      expect(p, `${h} must ban ruling on a life alone`).toMatch(/never state she will be alone and never promise she will not/i);
      expect(p, `${h} must stay audience-agnostic`).toMatch(/never presume whether she has had love before/i);
      // 🔴 Must not fall through to any neighbouring frame.
      expect(p, `${h} picked up the SELF-FRAME certainty clause`).not.toMatch(/Affirm the hopeful yes with warmth and certainty/);
      expect(p, `${h} picked up the soulmate-where frame`).not.toMatch(/NEVER PLACE A PERSON/);
      expect(p, `${h} picked up the bereavement frame`).not.toMatch(/NEVER SPEAK FOR THE PERSON SHE LOST/);
    }

    // Controls: the neighbouring families keep exactly the guards they shipped with.
    const inc = buildTarotReflectPrompt(userData, 'arcana-mfh', 'cards-soulmate', 'a', 'still waiting');
    expect(inc, 'cards-soulmate keeps its self-frame guard').toMatch(/Affirm the hopeful yes with warmth and certainty/);
    expect(inc, 'cards-soulmate must not have gained the loneliness frame').not.toMatch(/NOTHING IS FATED/);
    const sw = buildTarotReflectPrompt(userData, DECK, 'cards-where-soulmate', 'a', 'everywhere');
    expect(sw, 'cards-where-soulmate keeps its location ban').toMatch(/NEVER PLACE A PERSON/);
  });

  it('the tarot validHooks roster in routes.ts accepts all three (or the chat 400s)', async () => {
    const src = await loadSrc('../server/routes.ts');
    const roster = src.match(/const validHooks = \["cards-honest".*?\];/s);
    expect(roster, 'tarot validHooks roster not found').toBeTruthy();
    for (const h of LONELINESS_HOOKS) {
      expect(roster![0], `${h} missing from validHooks — Version-C handoff will 400`).toContain(h);
    }
  });
});
