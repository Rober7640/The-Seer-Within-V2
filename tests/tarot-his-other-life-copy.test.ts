// Copy guards for the /fb-tarot HIS-OTHER-LIFE hooks (2026-08-14).
//
// FIVE landers on the FACE-DOWN return-mhf deck — the largest family on the funnel. Operator
// category: "Persona" · topic: "persona commitment". Angle named for what the landers ask, per
// house convention (and because "persona" already means the V2 chat advisors in this codebase).
//
// ⭐⭐ THE FIRST COMMISSION THAT IS A PERSONA RATHER THAN A TOPIC. All five describe the SAME
// WOMAN: one fitting herself into a life that was already furnished before she arrived. His
// children. A woman who came first. His own front door. The years already given.
//
// ⭐⭐ THE SHARED MOVE, and every read turns on it: NAME HER POSITION WITHOUT RANKING HER
// AGAINST WHAT WAS THERE FIRST. Every headline invites a ranking answer — "you should come
// first", "you deserve better than second place" — and ranking is exactly what may never be
// supplied, because the things she is measured against are children (who legitimately come
// first), a woman who may be dead, or a history nobody can compete with. The payout is NOT a
// higher place. It is a DEFINED one: nobody has told her where she stands.
//
// 🔴 NOT folded into `commitment` (live since 2026-07-31). That family asks WILL HE EVER, with
// no circumstances attached; these ask WHY HE HASN'T and each names its own obstacle. Pinned.
//
// 🔴 AUDIENCE-AGNOSTIC BY OPERATOR CALL. Four of five turn on his circumstances and NONE of the
// headlines states them. Assuming an ex is brutal if she has died; assuming a death is absurd if
// they divorced; assuming a wife names the visitor a mistress on a public page.
//
// Bans specific to this family, on top of the shared decode-him no-verdict guard:
//   1. 🔴🔴 CHILDREN. 'cards-his-children' asks a card to comment on a man's children — real
//      third parties, possibly minors, who are not her rivals and cannot consent to being read.
//      The internet's stock answer is "you deserve to come first", which tells a woman she
//      should outrank a man's kids. Never rank in EITHER direction; never frame them as an
//      obstacle; never grade him as a father.
//   2. 🔴 THE OTHER WOMAN. 'cards-her-shadow' — never disparaged, never made a rival, never
//      presumed living or dead, and the MEDIUMSHIP ban applies (this family runs the decode-him
//      frame, which carries none of it).
//   3. 🔴 NO CAUSE for the separate homes ('cards-live-apart') — the `searching` family's
//      no-CAUSE ban pointed at a man's arrangement.
//   4. 🔴 NO VERDICT ON HER PAST ('cards-too-long') — both poles banned, plus the sunk-cost
//      frame itself, plus any grading of her.
//
// 🔴 Negation-aware by construction: correct copy here routinely contains a banned phrase inside
// its own refusal ("I will not tell you that you should come before them"), so a naive substring
// ban would fail the very copy it protects.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  HIS_OTHER_LIFE_HOOKS,
  COMMITMENT_HOOKS,
  STILL_FEELS_HOOKS,
  REAL_FEELINGS_HOOKS,
  REUNION_HOOKS,
  FIDELITY_HOOKS,
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

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const runsOf = (s: string, n = 6) => {
  const w = words(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
};
const shared = (a: string, b: string) => [...runsOf(a)].filter((r) => runsOf(b).has(r));

describe('his-other-life hooks are wired end to end', () => {
  it('all five are in the roster, have headlines, and report angle=his-other-life', () => {
    expect(HIS_OTHER_LIFE_HOOKS.length).toBe(5);
    for (const h of HIS_OTHER_LIFE_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=his-other-life`).toBe('his-other-life');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-forever-or-now']).toBe('Am I his forever, or his now?');
    expect(HEADLINES['cards-his-children']).toBe('Why do his children come before me?');
    expect(HEADLINES['cards-her-shadow']).toBe('Am I living in her shadow?');
    expect(HEADLINES['cards-live-apart']).toBe('Why do we still live apart?');
    expect(HEADLINES['cards-too-long']).toBe('Have I already given him too long?');
  });

  // ⭐⭐ THE MEASUREMENT PIN. commitment asks WILL HE; these ask WHY HE HASN'T.
  it('COMMITMENT_HOOKS stays exactly three — its 07-31 baseline must stay readable', () => {
    expect(COMMITMENT_HOOKS).toEqual(['cards-will-commit', 'cards-wont-commit', 'cards-ready-commit']);
    for (const h of HIS_OTHER_LIFE_HOOKS) {
      expect(COMMITMENT_HOOKS, `${h} was folded into commitment`).not.toContain(h);
    }
    expect(angleForHook('cards-will-commit')).toBe('commitment');
  });

  // ⭐⭐ SAFETY PIN. A real man AND real third parties stand in these, so every no-man frame is
  // wrong. 'cards-her-shadow' and 'cards-too-long' read as though they are about her; they are
  // not, and stripping the verdict guard would let a card convict a man or a third party.
  it('keeps the decode-him guards — it is in NO no-man family', () => {
    for (const h of HIS_OTHER_LIFE_HOOKS) {
      expect(SELF_FRAME_HOOKS, `${h} leaked into SELF_FRAME_HOOKS`).not.toContain(h);
      expect(LONELINESS_HOOKS, `${h} leaked into LONELINESS_HOOKS`).not.toContain(h);
      expect(SEARCHING_HOOKS, `${h} leaked into SEARCHING_HOOKS`).not.toContain(h);
      expect(SOULMATE_WHERE_HOOKS, `${h} leaked into soulmate-where`).not.toContain(h);
      expect(SOULMATE_AFTER_LOSS_HOOKS, `${h} leaked into soulmate-after-loss`).not.toContain(h);
    }
  });

  it('is not folded into any neighbouring family', () => {
    for (const h of HIS_OTHER_LIFE_HOOKS) {
      expect(STILL_FEELS_HOOKS, `${h} folded into still-feels`).not.toContain(h);
      expect(REAL_FEELINGS_HOOKS, `${h} folded into real-feelings`).not.toContain(h);
      expect(REUNION_HOOKS, `${h} folded into reunion`).not.toContain(h);
      // 🔴 NOT fidelity: its third person is a RIVAL. Here they may be entirely legitimate.
      expect(FIDELITY_HOOKS, `${h} folded into fidelity`).not.toContain(h);
    }
  });

  it('reuses no existing hook id, and adds no new duplicate headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    const others = TAROT_HOOKS.filter((h) => !HIS_OTHER_LIFE_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of HIS_OTHER_LIFE_HOOKS) {
      expect(others, `${h} headline duplicates an existing lander`).not.toContain(HEADLINES[h]);
    }
    const all = TAROT_HOOKS.map((h) => HEADLINES[h]);
    const dupes = all.filter((x, i) => all.indexOf(x) !== i);
    // cards-return / cards-come-back deliberately share one headline (reunion, 2026-08-04).
    expect(new Set(dupes)).toEqual(new Set(['Will he come back?']));
  });

  // ⚠️ THE NEAR-IDENTICAL-SLUG HAZARD that put a wrong lander on a PostHog money step on 08-12.
  it('no new slug is a substring of an existing one, or vice versa', () => {
    const others = TAROT_HOOKS.filter((h) => !HIS_OTHER_LIFE_HOOKS.includes(h));
    const clashes: string[] = [];
    for (const n of HIS_OTHER_LIFE_HOOKS) for (const o of others) {
      if (n.includes(o) || o.includes(n)) clashes.push(`${n} ~ ${o}`);
    }
    expect(clashes, `slug collision — a PostHog 'contains' filter would double count:\n${clashes.join('\n')}`).toEqual([]);
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
    expect(angleForHook('cards-ghosted')).toBe('why-he-left');
    expect(angleForHook('cards-stop-searching')).toBe('searching');
    expect(angleForHook('cards-twin-back')).toBe('twin-flame');
    expect(angleForHook('cards-feels-off')).toBe('hidden-intuition');
    expect(angleForHook('cards-really-love')).toBe('real-feelings');
    expect(angleForHook('cards-still-love')).toBe('still-feels');
    expect(angleForHook('cards-love-again')).toBe('self-frame');
  });

  // 🔴 An opener may not ask her to state his circumstances (the family is agnostic) and may not
  // invite a complaint about a third party.
  it('the openers presume no circumstances and invite no case against a third party', () => {
    for (const h of HIS_OTHER_LIFE_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      expect(q, `${h} opener presumes his marital status`).not.toMatch(
        /\b(divorced?|widow(ed|er)?|his (wife|late wife)|separated|married|his ex)\b/i,
      );
      expect(q, `${h} opener invites a complaint about the children`).not.toMatch(
        /how do (his|the) (children|kids)|what are (his|the) (children|kids) like|do (his|the) (children|kids)/i,
      );
      expect(q, `${h} opener asks her to author his reasons`).not.toMatch(
        /why do you think he|what makes you think he/i,
      );
    }
  });

  it('is FACE-DOWN ONLY — not ported to the face-up decks', () => {
    for (const h of HIS_OTHER_LIFE_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — his-other-life reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = HIS_OTHER_LIFE_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !HIS_OTHER_LIFE_HOOKS.includes(h));

  it('every read has all 3 cards and the full 4-beat structure', () => {
    expect(present.length).toBe(5);
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

  it('beat 3 shares no 6-word run with any EXISTING hook on this deck', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of existing) {
      for (const r of shared(reads[nh]![c][2], reads[oh]![c][2])) found.push(`${nh}/${c} ~ ${oh}/${c}: "${r}"`);
    }
    expect(found, `recycled wording:\n${found.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run BETWEEN the five hooks either', () => {
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
    /\b(no|not|never|can't|unable|n't|nor|nobody|no one|none|cannot|rather than|instead of|does not|is not|nothing|refuses?|declines?|will not|would not|withholds?|neither|without|inventing|invent|manufacture|pretend|flattery|would be|ought to|should)\b/i;
  const clausesOf = (s: string) => s.split(/[—;:,.]/);

  // ⚠️ RESTATEMENT EXEMPTION — beat 2 repeats HER question back, and several reads must NAME a
  // banned frame in order to refuse it ("you have asked why they come before you"). Restating a
  // question is not asserting its answer; the sweep is clause-level so a real assertion after
  // the restatement is a separate clause and still caught.
  const RESTATES =
    /\byou (asked|came asking|are asking|have asked|have brought|came for|came into|have offered|have braced)\b/i;

  const sweep = (bans: Array<[RegExp, string]>, hooks: readonly string[] = present) => {
    const hits: string[] = [];
    for (const h of hooks) for (const c of CARDS) for (const beat of reads[h as never]![c]) {
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause) || RESTATES.test(clause)) continue;
        for (const [re, why] of bans) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    return hits;
  };

  // 🔴🔴 BAN #1 — THE CHILDREN. The reason this family needs its own guard file.
  it('NEVER ranks her against his children, in either direction', () => {
    const RANK: Array<[RegExp, string]> = [
      [/\byou (deserve|ought) to come (first|before)\b/i, 'tells her to outrank his children'],
      [/\byou should come (first|before)\b/i, 'tells her to outrank his children'],
      [/\bcome before (his|the) (children|kids)\b/i, 'ranks her above the children'],
      [/\b(his|the) (children|kids) should (come second|not come first)\b/i, 'demotes the children'],
      [/\byou (come|are) second\b/i, 'confirms the ranking'],
      [/\b(his|the) (children|kids) are (the problem|an obstacle|in the way)\b/i, 'children as obstacle'],
      [/\bchoose between (you|them)\b/i, 'manufactures the contest'],
      [/\bhe (is|has been) a (bad|poor|weak) father\b/i, 'grades him as a father'],
      [/\bput his (children|kids) (second|aside)\b/i, 'demotes the children'],
    ];
    const hits = sweep(RANK);
    expect(hits, `ranked her against the children:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ THE PAYOUT, pinned as a REQUIREMENT. A family that only refuses gives her nothing. The
  // affirmable thing is a DEFINED place, never a higher one.
  it('cards-his-children states plainly that children DO have a first call', () => {
    const joined = CARDS.map((c) => reads['cards-his-children']![c].join(' ')).join(' ');
    expect(
      /first call|do have a first|children ought to mean|come first/i.test(joined),
      'the read evades the true part instead of saying it plainly',
    ).toBe(true);
    // ...and offers a defined place rather than a higher one.
    expect(
      /place of your own|where you sit|appear on one|planned for you/i.test(joined),
      'the defined-place payout is gone — the read only refuses',
    ).toBe(true);
  });

  // 🔴 BAN #2 — THE OTHER WOMAN. She may be dead, and she may be entirely legitimate.
  it('NEVER disparages the other woman, makes her a rival, or crosses into mediumship', () => {
    const OTHER: Array<[RegExp, string]> = [
      [/\bshe (was|is) (worse|less|nothing|no better)\b/i, 'disparages her'],
      [/\byou are (better|more) than (her|she)\b/i, 'ranks the two women'],
      [/\bshe (is|has) (at peace|crossed over|passed|watching)\b/i, 'MEDIUMSHIP / presumes a death'],
      [/\bshe would want\b/i, 'MEDIUMSHIP / speaks for her'],
      [/\bhis (late|dead) wife\b/i, 'presumes she is dead'],
      [/\bhis ex.?wife\b/i, 'presumes a divorce'],
      [/\bshe (is|was) your rival\b/i, 'makes her an opponent'],
      [/\byou (are|were) (competing|in competition) with her\b/i, 'makes her an opponent'],
    ];
    const hits = sweep(OTHER);
    expect(hits, `mishandled the other woman:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN #3 — AUDIENCE-AGNOSTIC. Four of five turn on circumstances no headline states.
  it('NEVER presumes whether he is divorced, widowed, separated or married', () => {
    const PRESUME: Array<[RegExp, string]> = [
      [/\bhis (marriage|divorce) (ended|was)\b/i, 'presumes a marriage ended'],
      [/\bsince (his wife|she) died\b/i, 'presumes a death'],
      [/\bhe is still married\b/i, 'presumes a marriage'],
      [/\bwhen (he|they) (divorced|separated)\b/i, 'presumes a divorce'],
      [/\bhis widow(er)?hood\b/i, 'presumes a death'],
      [/\byou are the other woman\b/i, 'names her a mistress'],
    ];
    const hits = sweep(PRESUME);
    expect(hits, `presumed his circumstances:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN #4 — NO CAUSE for the separate homes (the `searching` no-CAUSE ban, aimed at a man).
  it('cards-live-apart never supplies a reason for the arrangement', () => {
    const CAUSE: Array<[RegExp, string]> = [
      [/\bhe (is|was) not (serious|ready|committed)\b/i, 'supplies a cause'],
      [/\bhe is (protecting|guarding) (himself|his)\b/i, 'supplies a cause'],
      [/\bhe (is )?keeping his options\b/i, 'supplies a cause'],
      [/\b(because of|it is) (the money|his ex|the children|the kids)\b/i, 'supplies a cause'],
      [/\bhe does not want you (there|to)\b/i, 'supplies a cause'],
    ];
    const hits = sweep(CAUSE, ['cards-live-apart']);
    expect(hits, `supplied a cause:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN #5 — NO VERDICT ON HER PAST, and no grading of her anywhere in the family.
  it('NEVER grades her, and never rules on the years she has given', () => {
    const GRADE: Array<[RegExp, string]> = [
      [/\byou (have )?(wasted|squandered) (your|those|the) (time|years|life)\b/i, 'verdict on her past'],
      [/\byou (have )?(given|stayed) too (long|much)\b/i, 'verdict on her past'],
      [/\bit was (all )?worth it\b/i, 'promise about her past'],
      [/\byou (were|are|have been) (naive|foolish|silly|weak|desperate|a doormat)\b/i, 'grades her'],
      [/\byou should have (known|left|walked)\b/i, 'grades her'],
      [/\bthe lesson (here|is)\b/i, 'lesson framing'],
      [/\byou will know when\b/i, 'the fake timeframe'],
    ];
    const hits = sweep(GRADE);
    expect(hits, `graded her or ruled on her past:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ 'cards-too-long' refuses the SUNK-COST FRAME itself — that is its finding, and if it
  // drifts to a simple "neither yes nor no" it has become a generic refusal.
  it('cards-too-long refuses the sunk-cost frame and names the buried question', () => {
    const joined = CARDS.map((c) => reads['cards-too-long']![c][2]).join(' ');
    expect(
      /not spend|waiting room|lived them|time given to a person|not the same as time lost/i.test(joined),
      'the years-were-lived finding is gone',
    ).toBe(true);
    expect(
      /allowed to want|am i allowed|entitled to want|permission/i.test(joined),
      'the buried question ("am I allowed to want this to change") is gone',
    ).toBe(true);
  });

  // 🔴 BAN #6 — no tactic, no ultimatum, no leave/stay instruction, no timeframe. Every one of
  // these headlines invites advice, and advice is what the funnel does not sell.
  it('NEVER hands her a tactic, an ultimatum, or an instruction to leave or stay', () => {
    const TACTIC: Array<[RegExp, string]> = [
      [/\bgive him an ultimatum\b/i, 'ultimatum'],
      [/\b(you should|you need to) (leave|walk away|end it|stay)\b/i, 'leave/stay instruction'],
      [/\bpull back\b|\bstop (texting|calling)\b|\bmake him\b/i, 'tactic'],
      [/\bgive him (space|a deadline)\b/i, 'tactic'],
      [/\bwithin (a|the) (week|month|year)\b/i, 'timeframe'],
      [/\b(in|after) (a few|several|six) (weeks|months|years)\b/i, 'timeframe'],
      [/\bhe('ll| will) (come around|propose|move in|choose you)\b/i, 'forecast'],
    ];
    const hits = sweep(TACTIC);
    expect(hits, `coached her:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ 'cards-forever-or-now' is the FOURTH binary-refusing hook. Its grounds are its own.
  it('cards-forever-or-now refuses its binary on ITS OWN grounds', () => {
    const joined = CARDS.map((c) => reads['cards-forever-or-now']![c][2]).join(' ');
    expect(
      /not a condition|is built|has been built|only been felt|no such fact|never been named/i.test(joined),
      'the permanence-is-built finding is gone — this hook has collapsed into a generic refusal',
    ).toBe(true);
    // And it must not restate a sibling's grounds.
    for (const other of ['cards-moved-on', 'cards-imagining-it', 'cards-love-or-moved-on'] as const) {
      const inc = reads[other];
      const found: string[] = [];
      for (const c of CARDS) {
        for (const r of shared(reads['cards-forever-or-now']![c][2], inc![c][2])) found.push(`${other}: "${r}"`);
      }
      expect(found, `rhymes with ${other}:\n${found.join('\n')}`).toEqual([]);
    }
  });
});

// ── The un-synced server rosters ───────────────────────────────────────────────────────────
// 🔴🔴 The bridge renders from the CLIENT registry, so the lander looks perfect even when the
// server side was never touched. Neither roster below is imported from that registry.
describe('his-other-life — the hand-maintained server rosters', () => {
  const loadSrc = (rel: string) =>
    import('node:fs').then((fs) => fs.promises.readFile(new URL(rel, import.meta.url), 'utf8'));

  it('every hook has its own context AND tendency entry in prompts.ts', async () => {
    const src = await loadSrc('../server/lib/prompts.ts');
    for (const h of HIS_OTHER_LIFE_HOOKS) {
      const occurrences = src.split(`'${h}'`).length - 1;
      expect(occurrences, `${h} needs a TAROT_HOOK_CONTEXT and a TAROT_HOOK_TENDENCY entry`).toBe(2);
    }
  });

  // ⭐⭐ THE CLASSIC SILENT HALF-FIX. Miss this roster and Versions A/B still look perfect while
  // Version C's chat handoff 400s {error:"Invalid tarot params"} — and a 400 falls back to a
  // normal-looking read, so it does not announce itself.
  it('the tarot validHooks roster in routes.ts accepts all five (or the chat 400s)', async () => {
    const src = await loadSrc('../server/routes.ts');
    const roster = src.match(/const validHooks = \["cards-honest".*?\];/s);
    expect(roster, 'tarot validHooks roster not found').toBeTruthy();
    for (const h of HIS_OTHER_LIFE_HOOKS) {
      expect(roster![0], `${h} missing from validHooks — Version-C handoff will 400`).toContain(h);
    }
  });

  it('the new angle has a label in the admin experiments dashboard', async () => {
    const src = await loadSrc('../client/src/pages/admin/ExperimentsDashboard.tsx');
    expect(src, 'his-other-life has no ANGLE_LABELS entry').toMatch(/"his-other-life":\s*"/);
  });
});
