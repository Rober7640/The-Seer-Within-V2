// Copy guards for the /fb-tarot FIDELITY hooks (2026-08-07).
//
// FOUR headlines on the FACE-DOWN return-mhf deck: 'Is there someone else?', 'Is he talking
// to someone else?', 'Is he being faithful to me?', 'Is he loyal to only me?'
//
// Why this angle needs its own guard file, beyond the generic ones:
//
//  1. 🔴🔴 IT IS A COMPLIANCE COMMISSION, NOT A SAFETY ONE. The family exists because the ad
//     platform flags the word the live 'cards-cheating' lander uses. So the word must be
//     absent from THREE surfaces, not one:
//       a. the HEADLINE — obvious;
//       b. the LANDER COPY — the platform reviews landing pages, so a compliant ad pointing
//          at a page that says it in beat 3 defeats the whole exercise;
//       c. the HOOK SLUG — it travels in the ad's destination URL (/fb-tarot/c?hook=…),
//          which is why none of the four is named for its subject;
//       d. and the GENERATED PROMPT — instructing a model never to say a word still puts
//          the word in its context, where it can be echoed onto the page.
//     All four asserted below. Banned: cheat/cheating/cheater/affair/infidelity.
//     "Faithful" and "loyal" are explicitly permitted — the operator's headlines use them.
//
//  2. 🔴 THE SHARED DECODE-HIM GUARD WAS REWORDED (2026-08-07) and that touches EVERY
//     decode-him hook, not just these four. It previously named the flagged word. Meaning is
//     unchanged; the word is now gone from the prompt for every lander under that frame.
//     Asserted directly, in both directions.
//
//  3. THE INCUMBENT IS UNTOUCHED. 'cards-cheating' stays in `decode-him` with its own
//     headline and its own reads (standing rule: a new headline never replaces an old
//     lander). Consequence for reporting: an `angle = fidelity` filter EXCLUDES it, exactly
//     as `angle = reunion` excludes 'cards-return'. Pinned so nobody "fixes" it later.
//
//  4. ITS FINDING IS OFF-LIMITS. cards-cheating already lands "the unease is real
//     information, not paranoia to apologize for". None of these four may restate it — and
//     the paranoia framing is banned here in BOTH directions anyway, since using the word to
//     reassure her still plants it.
//
//  5. FOUR SEPARATE FINDINGS, or the family is one lander wearing four headlines: the
//     EXPLANATION she was left to author (someone-else), the ATTENTION she watched go
//     elsewhere (talking-someone), the SUMMARY JUDGMENT nobody outside a life can issue
//     (faithful), the SHARE she has been taking for the whole (loyal).
//
// 🔴 Negation-aware by construction, as in every sibling guard.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  FIDELITY_HOOKS,
  TRUST_HOOKS,
  HONESTY_HOOKS,
  LONELINESS_HOOKS,
  PULLING_AWAY_HOOKS,
  SELF_FRAME_HOOKS,
  TAROT_HOOKS,
  HEADLINES,
  angleForHook,
  openerCStart,
} = await import('@/content/tarotReads');

const DECK = 'return-mhf' as const;
const CARDS = ['a', 'b', 'c'] as const;

// The flagged word and its neighbours. `faithful`/`loyal` are deliberately NOT here.
const FLAGGED = /\b(cheat|cheats|cheated|cheating|cheater|affairs?|infidelity)\b/i;

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const runsOf = (s: string, n = 6) => {
  const w = words(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
};
const shared = (a: string, b: string) => [...runsOf(a)].filter((r) => runsOf(b).has(r));

describe('fidelity hooks are wired end to end', () => {
  it('all four hooks are in the roster, have headlines, and report angle=fidelity', () => {
    expect(FIDELITY_HOOKS.length).toBe(4);
    for (const h of FIDELITY_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=fidelity`).toBe('fidelity');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-someone-else']).toBe('Is there someone else?');
    expect(HEADLINES['cards-talking-someone']).toBe('Is he talking to someone else?');
    expect(HEADLINES['cards-faithful']).toBe('Is he being faithful to me?');
    expect(HEADLINES['cards-loyal']).toBe('Is he loyal to only me?');
  });

  // ⭐⭐ THE COMMISSION. The word must be absent from the headline, the opener AND the hook
  // slug — the slug travels in the ad's destination URL.
  it('the flagged word appears in no headline, no opener and no SLUG', () => {
    for (const h of FIDELITY_HOOKS) {
      expect(h, `hook slug ${h} carries the flagged word into the ad URL`).not.toMatch(FLAGGED);
      expect(HEADLINES[h], `${h} headline carries the flagged word`).not.toMatch(FLAGGED);
      expect(openerCStart(DECK, h, 'a')[1], `${h} opener carries the flagged word`).not.toMatch(FLAGGED);
    }
  });

  // Its category name is "Trust/honesty" but both are taken by live angles with three
  // landers each. Merging would pool three separately-commissioned families.
  it('is not merged into trust, honesty, or the decode-him incumbent', () => {
    for (const h of FIDELITY_HOOKS) {
      expect(TRUST_HOOKS, `${h} leaked into trust`).not.toContain(h);
      expect(HONESTY_HOOKS, `${h} leaked into honesty`).not.toContain(h);
      expect(LONELINESS_HOOKS, `${h} leaked into loneliness`).not.toContain(h);
      expect(PULLING_AWAY_HOOKS, `${h} leaked into pulling-away`).not.toContain(h);
      expect(SELF_FRAME_HOOKS, `${h} leaked into self-frame`).not.toContain(h);
    }
    expect(TRUST_HOOKS.length).toBe(3);
    expect(HONESTY_HOOKS.length).toBe(3);
    // 🔴 The incumbent stays exactly where it is. An angle=fidelity filter excludes it, so
    // new-vs-incumbent is a HOOK-level comparison — same trap as cards-return vs reunion.
    expect(angleForHook('cards-cheating')).toBe('decode-him');
    expect(HEADLINES['cards-cheating']).toBe('Is he cheating on you?');
  });

  it('reuses no existing hook id and no existing headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    const others = TAROT_HOOKS.filter((h) => !FIDELITY_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of FIDELITY_HOOKS) {
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
    expect(angleForHook('cards-alone-forever')).toBe('loneliness');
    expect(angleForHook('cards-love-again')).toBe('self-frame');
  });

  // 🔴 None may ask for EVIDENCE. An opener like "what have you found?" turns the page into
  // an interrogation, puts the word in her mouth, and hands the LLM material for an
  // accusation against a real man.
  it('the openers never ask for evidence and never invite surveillance', () => {
    for (const h of FIDELITY_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      expect(q, `${h} opener asks for evidence`).not.toMatch(/what (have you )?(found|seen|discovered)|did you (see|find|read)|proof|his phone|his messages/i);
      expect(q, `${h} opener asks her to justify doubting him`).not.toMatch(/why do you (think|suspect|believe) he|what makes you think he/i);
    }
    // And each must differ from the incumbent's opener at the first line she reads.
    const incumbent = openerCStart(DECK, 'cards-cheating', 'a')[1];
    const body = (s: string) => s.replace(/^Before I look closer, tell me…\s*/, '');
    for (const h of FIDELITY_HOOKS) {
      expect(shared(body(openerCStart(DECK, h, 'a')[1]), body(incumbent)), `${h} opener rhymes with cards-cheating`).toEqual([]);
    }
  });

  it('is FACE-DOWN ONLY — not ported to the face-up decks', () => {
    for (const h of FIDELITY_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — fidelity reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = FIDELITY_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !FIDELITY_HOOKS.includes(h));

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

  // ⭐⭐ THE COMMISSION, on the surface that matters most: the platform reviews the page.
  it('the flagged word appears in NO beat of any read', () => {
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const [i, beat] of reads[h]![c].entries()) {
      if (FLAGGED.test(beat)) hits.push(`${h}/${c} beat ${i + 1}: "${beat}"`);
    }
    expect(hits, `FLAGGED WORD on a reviewed landing page:\n${hits.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run with any EXISTING hook on this deck', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of existing) {
      for (const r of shared(reads[nh]![c][2], reads[oh]![c][2])) found.push(`${nh}/${c} ~ ${oh}/${c}: "${r}"`);
    }
    expect(found, `recycled wording:\n${found.join('\n')}`).toEqual([]);
  });

  // 🔴 Called out separately: cards-cheating is the lander these four were commissioned to
  // replace. If they rhyme with it, the copy test measures nothing.
  it('beat 3 shares no 6-word run with the INCUMBENT on any deck it appears on', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) {
      // 'decode-him' the DECK was retired 2026-08-19; the three below are what exist.
      for (const deck of ['return-mhf', 'arcana-mfh', 'arcana-eef'] as const) {
        const inc = DECKS[deck].reads['cards-cheating'];
        if (!inc) continue;
        for (const r of shared(reads[nh]![c][2], inc[c][2])) found.push(`${nh}/${c} ~ cards-cheating@${deck}/${c}: "${r}"`);
      }
    }
    expect(found, `rhymes with the incumbent:\n${found.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run BETWEEN the four hooks either', () => {
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

  it('never asserts a third person and never denies one', () => {
    const THIRD: Array<[RegExp, string]> = [
      [/\bthere is someone else\b/i, 'asserts a third person'],
      [/\bhe (is|has been) (seeing|talking to|involved with|with) (someone|another)\b/i, 'asserts a third person'],
      [/\byour (instincts?|gut) (is|are) right about (him|this)\b/i, 'confirms the accusation sideways'],
      [/\bthere is (nobody|no one) else\b/i, 'denies — a reassurance the funnel cannot give'],
      [/\bhe (is|has been) (loyal|faithful|true) to you\b/i, 'vouches for a real man'],
      [/\byou (have|'ve) nothing to worry about\b/i, 'reassurance'],
      [/\bhe would never\b/i, 'reassurance / character reference'],
    ];
    const hits = sweep(THIRD);
    expect(hits, `verdict on a third person:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 The most available wrong answer to these questions anywhere on the internet.
  it('never instructs her to gather evidence', () => {
    const SURVEIL: Array<[RegExp, string]> = [
      [/\b(check|look at|go through|read) (his|the) (phone|messages|texts|emails|accounts)\b/i, 'surveillance'],
      [/\bfollow him\b/i, 'surveillance'],
      [/\b(watch|track) (him|his)\b/i, 'surveillance'],
      [/\btest him\b/i, 'surveillance'],
      [/\b(find|get|gather) (the )?(proof|evidence)\b/i, 'tells her to build a case'],
      [/\bcatch him\b/i, 'tells her to build a case'],
      [/\bconfront him\b/i, 'directive'],
    ];
    const hits = sweep(SURVEIL);
    expect(hits, `surveillance / evidence-gathering:\n${hits.join('\n')}`).toEqual([]);
  });

  // Both directions: calling her paranoid is the injury, and using the word to reassure her
  // plants it. ⚠ It is also the INCUMBENT's finding, which these must not restate.
  it('never frames her as paranoid — and never uses the word to reassure her either', () => {
    const hits: string[] = [];
    const PARANOIA = /\bparanoi(a|d)\b|\bimagining (it|things)\b|\boverthinking\b|\binsecure\b|\bcrazy\b/i;
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      if (PARANOIA.test(beat)) hits.push(`${h}/${c}: "${beat}"`);
    }
    expect(hits, `paranoia framing (banned in BOTH directions):\n${hits.join('\n')}`).toEqual([]);
  });

  it('never excuses him and never lands as her fault', () => {
    const BANS: Array<[RegExp, string]> = [
      [/\bhe (is|'s) (just|only) (busy|stressed|tired|going through)\b/i, 'excuse — a verdict in a kinder coat'],
      [/\b(men|all men) are\b/i, 'excuse'],
      [/\byou (are|'re) (being )?(too )?(demanding|needy|jealous|possessive|clingy)\b/i, 'her fault'],
      [/\byou (pushed|drove) him\b/i, 'her fault'],
      [/\byou (are|'re) not enough\b/i, 'her fault'],
      [/\btrust him more\b/i, 'directive + her fault'],
    ];
    const hits = sweep(BANS);
    expect(hits, `excuse / blame:\n${hits.join('\n')}`).toEqual([]);
  });

  // Four separate findings, or the family is one lander wearing four headlines.
  it('cards-someone-else routes to the EXPLANATION she was left to author', () => {
    const joined = CARDS.map((c) => reads['cards-someone-else']![c][2]).join(' ').toLowerCase();
    expect(joined).toMatch(/explanation|account|gap|draft|told/);
  });
  it('cards-talking-someone routes to ATTENTION and her right to mind', () => {
    const joined = CARDS.map((c) => reads['cards-talking-someone']![c][2]).join(' ').toLowerCase();
    expect(joined).toMatch(/attention|entitled|direction|split|unnamed/);
  });
  it('cards-faithful refuses the summary judgment and routes to her not resting', () => {
    const joined = CARDS.map((c) => reads['cards-faithful']![c][2]).join(' ').toLowerCase();
    expect(joined).toMatch(/rest|suspend|put it down|footing|guarantee/);
  });
  it('cards-loyal routes to the PORTION she has taken for the whole', () => {
    const joined = CARDS.map((c) => reads['cards-loyal']![c][2]).join(' ').toLowerCase();
    expect(joined).toMatch(/portion|share|whole|adjust|held (partly )?back/);
  });
});

describe('server prompt path carries the fidelity commission', () => {
  const loadSrc = (rel: string) =>
    import('node:fs').then((fs) => fs.promises.readFile(new URL(rel, import.meta.url), 'utf8'));

  it('every hook has its own context and tendency entry', async () => {
    const src = await loadSrc('../server/lib/prompts.ts');
    for (const h of FIDELITY_HOOKS) {
      const occurrences = src.split(`'${h}'`).length - 1;
      expect(occurrences, `${h} must appear in BOTH prompt maps`).toBeGreaterThanOrEqual(2);
    }
  });

  // 🔴🔴 The generated half. Instructing a model never to say a word still puts the word in
  // its context, where it can be echoed onto a page the platform reviews. So the fidelity
  // strings phrase their bans AROUND the word rather than naming it.
  it('the generated Version-C prompt contains the flagged word nowhere', async () => {
    const { buildTarotReflectPrompt } = await import('../server/lib/prompts');
    const userData = {
      firstName: 'Test', email: null, bucket: null, subBucket: null, personName: null,
      concern: null, desires: null, location: null, timeOfDay: null, objectionCount: 0,
    } as Parameters<typeof buildTarotReflectPrompt>[0];

    for (const h of FIDELITY_HOOKS) {
      const p = buildTarotReflectPrompt(userData, DECK, h, 'a', 'Something feels different lately.');
      expect(p, `${h} generated prompt carries the flagged word`).not.toMatch(FLAGGED);
      // Still the decode-him frame — a real man, tendency never verdict.
      expect(p, `${h} must run under the decode-him guard`).toMatch(/TENDENCY, NEVER A VERDICT/);
      expect(p, `${h} must not have picked up a self-frame or later guard`).not.toMatch(/Affirm the hopeful yes with warmth and certainty|NEVER PLACE A PERSON|NOTHING IS FATED/);
    }
  });

  // 🔴 The shared decode-him guard was REWORDED 2026-08-07 and this touches every hook under
  // that frame. Asserted in both directions so neither the removal nor the replacement can
  // be silently undone.
  it('the shared decode-him guard no longer names the flagged word', async () => {
    const { buildTarotReflectPrompt } = await import('../server/lib/prompts');
    const userData = {
      firstName: 'Test', email: null, bucket: null, subBucket: null, personName: null,
      concern: null, desires: null, location: null, timeOfDay: null, objectionCount: 0,
    } as Parameters<typeof buildTarotReflectPrompt>[0];
    // Any decode-him-framed hook exercises the shared clause.
    const p = buildTarotReflectPrompt(userData, DECK, 'cards-honest', 'a', 'not sure');
    expect(p, 'the shared guard must still forbid a verdict').toMatch(/Never declare he is lying, faithful, involved with someone else, or coming back as a fact/);
    expect(p, 'the shared guard must not name the flagged word').not.toMatch(/\bcheating\b/i);
  });

  it('the tarot validHooks roster in routes.ts accepts all four (or the chat 400s)', async () => {
    const src = await loadSrc('../server/routes.ts');
    const roster = src.match(/const validHooks = \["cards-honest".*?\];/s);
    expect(roster, 'tarot validHooks roster not found').toBeTruthy();
    for (const h of FIDELITY_HOOKS) {
      expect(roster![0], `${h} missing from validHooks — Version-C handoff will 400`).toContain(h);
    }
  });
});
