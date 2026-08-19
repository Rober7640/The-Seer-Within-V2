// Copy guards for the /fb-tarot SOULMATE-WHERE hooks (2026-08-07).
//
// Three headlines on the FACE-DOWN return-mhf deck: 'Where is my soulmate right now?',
// 'Is my soulmate closer than I think?', "Why haven't I found my soulmate where I am?"
//
// Why this angle needs its own guard file, beyond the generic ones:
//
//  1. 🔴 LOCATION — a failure mode with NO existing guard anywhere in the codebase before
//     this family. The self-frame clause instructs the model to withhold "ONLY the
//     specifics — never a name, a date, or exactly who". Name, date, who. It omits WHERE.
//     Asked "Where is my soulmate right now?" under that clause a model answers with a
//     place, confidently, because the clause tells it to withhold nothing else. The harm is
//     not vagueness — it is specificity that lands on a real, identifiable person ("someone
//     already in your circle", "at your work") which she can then act on. Asserted here as
//     an ALWAYS ban, and `where` was added to the self-frame wording at the same time since
//     the gap applied to the live 'cards-soulmate' lander too.
//
//  2. STRATEGY. Go out more, look elsewhere, move, try the apps, work on yourself first.
//     This is what the rest of the internet answers these questions with, so it leaks in
//     easily — and on cards-not-found-yet it is also half the accusation the read refuses.
//
//  3. HER FAULT. Blocks, walls, standards, not being ready, not loving herself enough,
//     manifesting harder. She arrives already holding it. Same shape of harm as
//     cards-wont-commit and cards-deceived, arriving from a fourth direction.
//
//  4. ⭐⭐ cards-soulmate-closer IS A COPY TEST AGAINST THE LIVE 'cards-soulmate', whose
//     tendency string already lands "nearer than the waiting has let her believe" — i.e.
//     the incumbent's read IS this headline. If these reads restate it, the two landers
//     stop being distinguishable and the test measures nothing. Pinned two ways: the
//     proximity claim is banned outright, and the finding it routes to instead (the
//     BRACING) is asserted positively.
//
//  5. NOT self-frame, and NOT soulmate-after-loss. Self-frame's guard is insufficient (1-3
//     above). after-loss is the opposite family: it may never promise an arrival because
//     someone has died, while this one may affirm the hopeful yes freely and must never
//     name a place. Swapping the two sets swaps one family's guard for the other's.
//
// 🔴 Negation-aware by construction, as in every sibling guard: correct copy here routinely
// contains a banned phrase inside a refusal ("I could name you a place and it would be
// invention", "there is no fault to find here"), so a naive substring ban would fail the
// very copy it protects.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
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

describe('soulmate-where hooks are wired end to end', () => {
  it('every hook is in the roster, has a headline, and reports angle=soulmate-where', () => {
    expect(SOULMATE_WHERE_HOOKS.length).toBe(3);
    for (const h of SOULMATE_WHERE_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=soulmate-where`).toBe('soulmate-where');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-where-soulmate']).toBe('Where is my soulmate right now?');
    expect(HEADLINES['cards-soulmate-closer']).toBe('Is my soulmate closer than I think?');
    expect(HEADLINES['cards-not-found-yet']).toBe("Why haven't I found my soulmate where I am?");
  });

  // ⭐ Not self-frame (its guard permits a place) and not after-loss (the opposite family:
  // someone has died there, so an arrival may never be promised). Both would be plausible
  // filings to a future reader, and both are wrong.
  it('is neither self-frame nor soulmate-after-loss', () => {
    for (const h of SOULMATE_WHERE_HOOKS) {
      expect(SELF_FRAME_HOOKS, `${h} leaked into SELF_FRAME_HOOKS — its guard permits a PLACE`).not.toContain(h);
      expect(SOULMATE_AFTER_LOSS_HOOKS, `${h} leaked into the bereavement family`).not.toContain(h);
      expect(angleForHook(h)).not.toBe('self-frame');
      expect(angleForHook(h)).not.toBe('soulmate-after-loss');
    }
    // The incumbents and the bereavement family both stay exactly where they were.
    expect(SELF_FRAME_HOOKS.length).toBe(2);
    expect(SOULMATE_AFTER_LOSS_HOOKS.length).toBe(3);
    expect(angleForHook('cards-soulmate')).toBe('self-frame');
    expect(angleForHook('cards-soulmate-out-there')).toBe('soulmate-after-loss');
  });

  it('does not leak into any other family', () => {
    for (const h of SOULMATE_WHERE_HOOKS) {
      expect(RECONCILIATION_HOOKS, `${h} leaked into reconciliation`).not.toContain(h);
      expect(REUNION_HOOKS, `${h} leaked into reunion`).not.toContain(h);
      expect(PULLING_AWAY_HOOKS, `${h} leaked into pulling-away`).not.toContain(h);
      expect(HEALING_HOOKS, `${h} leaked into healing`).not.toContain(h);
      expect(COMMITMENT_HOOKS, `${h} leaked into commitment`).not.toContain(h);
    }
  });

  it('reuses no existing hook id and no existing headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    const others = TAROT_HOOKS.filter((h) => !SOULMATE_WHERE_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of SOULMATE_WHERE_HOOKS) {
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
    expect(angleForHook('cards-love-again')).toBe('self-frame');
  });

  // 🔴 None may ask where she lives, where she looks, or what she has tried — that gathers
  // the material for the strategy answer the family bans, and it confirms the premise that
  // the absence is hers to fix.
  it('the opener never asks about her location or her efforts', () => {
    for (const h of SOULMATE_WHERE_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      expect(q, `${h} opener asks where she is`).not.toMatch(/where do you live|what city|where are you based|your area|round where you/i);
      expect(q, `${h} opener asks what she has tried`).not.toMatch(/have you tried|been on any|dating apps|how do you meet|where do you look/i);
      expect(q, `${h} opener asks her to justify herself`).not.toMatch(/why do you think you|what do you think is wrong|what is holding you back/i);
    }
  });

  it('is FACE-DOWN ONLY — not ported to the face-up decks', () => {
    for (const h of SOULMATE_WHERE_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — soulmate-where reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = SOULMATE_WHERE_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !SOULMATE_WHERE_HOOKS.includes(h));

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

  // 🔴 Called out separately: the self-frame incumbents live on the FACE-UP decks, so the
  // sweep above never reaches them — and 'cards-soulmate' is the control arm of the
  // cards-soulmate-closer copy test. If they rhyme, that test measures nothing.
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
    /\b(no|not|never|can't|unable|n't|nor|nobody|no one|none|cannot|rather than|instead of|does not|is not|nothing|refuses?|declines?|will not|withholds?|neither|without)\b/i;
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

  // 🔴🔴 THE ONE THAT MATTERS MOST, and the one with no precedent anywhere else on the
  // funnel. A place is actionable in a way a vague reassurance is not — she can go there,
  // or decide it means the colleague she already half-suspects.
  it('NEVER places a person — no location, direction, proximity or identification', () => {
    const PLACE: Array<[RegExp, string]> = [
      [/\b(he|she|they) (is|are) (near|nearby|close by|around you|in your)\b/i, 'location: places them'],
      [/\bsomeone (you already know|you have already met|in your circle|at (your )?work)\b/i, 'location: identifies a real person'],
      [/\b(you have|you've) already met (him|her|them)\b/i, 'location: identifies a real person'],
      [/\b(closer|nearer) than you (think|realise|realize|know)\b/i, 'proximity claim — the incumbent lander answer'],
      [/\bnearer than\b/i, 'proximity claim'],
      [/\bjust around the corner\b/i, 'proximity claim'],
      [/\b(in|near) (a|the|your) (city|town|village|country|workplace|neighbourhood|neighborhood)\b/i, 'location: names a setting'],
      [/\b(look|search) (for (him|her|them) )?(in|near|around)\b/i, 'location: gives a direction'],
      [/\b(he|she|they) will (be|come) from\b/i, 'location: gives an origin'],
      [/\bcrossed paths (already|before)\b/i, 'location: implies a past meeting'],
    ];
    const hits = sweep(PLACE);
    expect(hits, `LOCATION — a place she can act on:\n${hits.join('\n')}`).toEqual([]);
  });

  it('never hands her a TACTIC — this is a reading, not coaching', () => {
    const STRATEGY: Array<[RegExp, string]> = [
      [/\b(get|go) out (there )?more\b/i, 'strategy'],
      [/\bput yourself out there\b/i, 'strategy'],
      [/\byou (need|have|ought) to (move|travel|leave|try|join|start)\b/i, 'strategy'],
      [/\b(try|join|download) (the )?(apps?|dating|a class|a group)\b/i, 'strategy'],
      [/\blook (somewhere )?else(where)?\b/i, 'strategy'],
      [/\bstop looking\b/i, 'strategy — the folk-wisdom version, still a directive'],
      [/\b(work on|heal|love) yourself first\b/i, 'strategy + her fault'],
      [/\bopen (yourself )?up (more|to)\b/i, 'strategy'],
      [/\bit will happen when you\b/i, 'strategy dressed as reassurance'],
    ];
    const hits = sweep(STRATEGY);
    expect(hits, `strategy / coaching:\n${hits.join('\n')}`).toEqual([]);
  });

  it('never explains the not-yet as HER fault, nor as her surroundings fault', () => {
    const BLAME: Array<[RegExp, string]> = [
      [/\byour (blocks?|walls?|barriers?|baggage)\b/i, 'her fault'],
      [/\byour standards are\b/i, 'her fault'],
      [/\byou (are|'re) (too|not) (picky|fussy|guarded|closed|much|enough)\b/i, 'her fault'],
      [/\byou (are|'re) not ready\b/i, 'her fault'],
      [/\byou (do not|don't) (love|value) yourself\b/i, 'her fault'],
      [/\b(manifest|attract) (it|him|them|love) (harder|properly|better)\b/i, 'her fault'],
      [/\byou (have been|'ve been) (sabotaging|blocking|pushing)\b/i, 'her fault'],
      [/\b(the wrong|a bad) (place|town|city) for\b/i, 'blames her surroundings'],
      [/\bnobody (there|here) (is|will be) right for you\b/i, 'blames her surroundings'],
    ];
    const hits = sweep(BLAME);
    expect(hits, `blame:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔄 LOOSENED 2026-08-19, operator call — the arrival promise comes back, per the palm
  // formula this deck inherits. DATES stay banned. The separate NEVER-PLACES-A-PERSON test
  // below is untouched and still runs: she may be told someone is coming, never WHERE he is
  // or who he is, because a location is a checkable claim about a real person's whereabouts.
  it('never puts a DATE on the arrival', () => {
    const ALWAYS: Array<[RegExp, string]> = [
      [/\bwithin (a|the|\d)/i, 'a dated prediction'],
      [/\bin (a few|the next|\d+) (day|week|month|year)/i, 'a dated prediction'],
      [/\bby (the end of|next|christmas|new year|spring|summer|autumn|winter)\b/i, 'a dated prediction'],
      [/\bI promise\b/i, 'a promise the funnel cannot keep'],
    ];
    const hits = sweep([], ALWAYS);
    expect(hits, `dated claim:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ THE COPY-TEST PIN. cards-soulmate's live tendency lands "nearer than the waiting has
  // let her believe". If this hook answers the same way, the two landers are the same lander
  // and the comparison is dead — while the dashboard still shows two rows.
  it('cards-soulmate-closer REFUSES the proximity claim and routes to the bracing', () => {
    const refusals = /will not (put|quote)|not going to quote|no notion of near|has no notion|does not offer|no honest reading/i;
    for (const c of CARDS) {
      const beat = reads['cards-soulmate-closer']![c][2];
      expect(beat, `cards-soulmate-closer/${c} must decline to quote a distance`).toMatch(refusals);
    }
    const joined = CARDS.map((c) => reads['cards-soulmate-closer']![c][2]).join(' ').toLowerCase();
    expect(joined, 'must route to the guarding/bracing, not to proximity').toMatch(/guard|brac|flinch|rationing|managing|expectations? low/);
  });

  // Its finding: the not-yet is not a distance. Without it the read has nothing to give and
  // becomes an evasion — the difference between refusing a place and refusing to help.
  it('cards-where-soulmate answers that the not-yet is not a DISTANCE', () => {
    const joined = CARDS.map((c) => reads['cards-where-soulmate']![c][2]).join(' ').toLowerCase();
    expect(joined).toMatch(/distance|destination|miles|geography|address|coordinates|somewhere-else|somewhere else/);
  });

  // Its finding: an absence is not always caused, so there is no culprit to hand her.
  it('cards-not-found-yet refuses to name a CULPRIT', () => {
    const joined = CARDS.map((c) => reads['cards-not-found-yet']![c][2]).join(' ').toLowerCase();
    expect(joined).toMatch(/fault|culprit|guilty|blame|wrong turning|caused/);
  });
});

// The server-side prompt path is a DIFFERENT surface from the canned reads: the Version-C
// reflect call generates fresh text steered by these maps and by the frame branch.
describe('server prompt path carries the soulmate-where frame', () => {
  const loadSrc = (rel: string) =>
    import('node:fs').then((fs) => fs.promises.readFile(new URL(rel, import.meta.url), 'utf8'));

  it('every hook has its own context, tendency and frame-set entry', async () => {
    const src = await loadSrc('../server/lib/prompts.ts');
    for (const h of SOULMATE_WHERE_HOOKS) {
      const occurrences = src.split(`'${h}'`).length - 1;
      expect(occurrences, `${h} must appear in BOTH prompt maps and the frame set`).toBeGreaterThanOrEqual(3);
    }
  });

  // 🔴 Hand-mirrored against SOULMATE_WHERE_HOOKS. Drift is a SAFETY defect: a hook missing
  // from the server set falls through to the decode-him guard, which permits a place.
  it('the server soulmate-where set mirrors the client roster exactly', async () => {
    const src = await loadSrc('../server/lib/prompts.ts');
    const block = src.match(/const SOULMATE_WHERE_TAROT_HOOKS = new Set\(\[(.*?)\]\)/s);
    expect(block, 'SOULMATE_WHERE_TAROT_HOOKS not found in prompts.ts').toBeTruthy();
    for (const h of SOULMATE_WHERE_HOOKS) {
      expect(block![1], `${h} missing — it would run under a guard that permits a PLACE`).toContain(h);
    }
    for (const h of [...SELF_FRAME_HOOKS, ...SOULMATE_AFTER_LOSS_HOOKS]) {
      expect(block![1], `${h} must not be in the soulmate-where set`).not.toContain(`'${h}'`);
    }
  });

  // The generated path is checked BEHAVIOURALLY — the guard only reaches the model if the
  // frame branch actually selects it.
  it('the generated Version-C prompt carries the location ban, not the bare self-frame clause', async () => {
    const { buildTarotReflectPrompt } = await import('../server/lib/prompts');
    const userData = {
      firstName: 'Test', email: null, bucket: null, subBucket: null, personName: null,
      concern: null, desires: null, location: null, timeOfDay: null, objectionCount: 0,
    } as Parameters<typeof buildTarotReflectPrompt>[0];

    for (const h of SOULMATE_WHERE_HOOKS) {
      const p = buildTarotReflectPrompt(userData, DECK, h, 'a', 'I have looked everywhere.');
      expect(p, `${h} must carry the location ban`).toMatch(/NEVER PLACE A PERSON/);
      expect(p, `${h} must ban tactics`).toMatch(/that is coaching, not a reading/i);
      expect(p, `${h} must ban self-blame`).toMatch(/never explain the not-yet as a fault in her/i);
      // Must NOT fall through to either neighbouring frame.
      expect(p, `${h} picked up the bereavement frame`).not.toMatch(/NEVER SPEAK FOR THE PERSON SHE LOST/);
      expect(p, `${h} picked up the bare self-frame clause`).not.toMatch(/withhold ONLY the specifics/);
    }

    // 🔴 The live incumbent keeps its self-frame guard — but `where` is now on its withhold
    // list, which is the gap this family exposed.
    const inc = buildTarotReflectPrompt(userData, 'arcana-mfh', 'cards-soulmate', 'a', 'still waiting');
    expect(inc, 'cards-soulmate must keep its self-frame guard').toMatch(/withhold ONLY the specifics/);
    expect(inc, 'cards-soulmate must now also withhold WHERE').toMatch(/exactly "who", or WHERE/);
    expect(inc, 'cards-soulmate must not have gained the soulmate-where frame').not.toMatch(/NEVER PLACE A PERSON/);
  });

  it('the tarot validHooks roster in routes.ts accepts all three (or the chat 400s)', async () => {
    const src = await loadSrc('../server/routes.ts');
    const roster = src.match(/const validHooks = \["cards-honest".*?\];/s);
    expect(roster, 'tarot validHooks roster not found').toBeTruthy();
    for (const h of SOULMATE_WHERE_HOOKS) {
      expect(roster![0], `${h} missing from validHooks — Version-C handoff will 400`).toContain(h);
    }
  });
});
