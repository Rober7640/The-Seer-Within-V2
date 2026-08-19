// Copy guards for the /fb-tarot SOULMATE-LABEL hooks (2026-08-17).
//
// THREE landers on the FACE-DOWN return-mhf deck. Operator category: "Feelings/Commitment" ·
// topic: "Soulmate / twin-flame crossover". Angle named for what the landers ASK, per house
// convention — all three ask whether a WORD is true of a connection, and there is no other
// question underneath.
//
// ⭐⭐ THE SHARED MOVE, and every read turns on it: AFFIRM THE PULL, REFUSE THE WORD. What she
// actually holds — the recognition, the history, the things he does on ordinary days — is real
// information about HER, and it does not become truer if the label is granted or false if it is
// withheld. The label was never the thing carrying the weight.
//
// 🔴 NOT folded into `twin-flame` (live since 2026-08-11), which is the tempting filing and the
// one that would do real damage. That family is a VOCABULARY test: three questions already
// running, re-asked with "my twin flame" swapped in for "he". The question underneath is
// unchanged and the label is only the wrapper. These three put the label ITSELF in the question.
// Pool them and the wording comparison twin-flame exists to make is destroyed.
//
// 🔴 NOT `soulmate-where` / `soulmate-after-loss`, which share the word and nothing else: both
// ask about a person who might EXIST and neither has a man in the picture.
//
// Bans specific to this family, on top of the shared decode-him no-verdict guard:
//   1. 🔴🔴 THE LABEL, IN BOTH DIRECTIONS. Never certify and never deny that he is her soulmate
//      or her twin flame. A verdict on a real person and an UNFALSIFIABLE one — she could never
//      test it against anything he does. Inherited from twin-flame, extended to "soulmate".
//   2. 🔴🔴 THE RANKING — exists nowhere else on the funnel. Never that a twin flame is rarer,
//      higher, deeper or more fated than a soulmate or a strong connection, and never the
//      reverse. Her own word "just" is the harm; refuse the ladder rather than climbing it.
//   3. 🔴 THE RUNNER SCRIPT + SEPARATION PHASE, riding along from twin-flame because the term
//      arrives carrying its community's whole teaching: distance is never proof of the bond, an
//      absence is never a phase, and nothing is ever conditional on her healing.
//   4. 🔴🔴 NO NAMING A PERSON and NO MISSED-HIM VERDICT ('cards-met-already') — the headline
//      invites both. A name sends her back through her own messages; "you missed him" invents a
//      loss she would then grieve. The opposite is banned too: a promised arrival is a date in
//      disguise.
//
// 🔴 Negation-aware by construction: correct copy here is refusal-heavy and routinely contains a
// banned idea inside its own refusal, so a naive substring ban would fail the copy it protects.
// The RAW_BANS block below is the deliberate exception — those few strings may never appear in
// ANY form, including inside a refusal. When one fires, REWORD THE COPY, never weaken the ban
// (the rule established when the twin-flame guard caught copy quoting her own question back).
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  SOULMATE_LABEL_HOOKS,
  TWIN_FLAME_HOOKS,
  SOULMATE_WHERE_HOOKS,
  SOULMATE_AFTER_LOSS_HOOKS,
  SELF_FRAME_HOOKS,
  LONELINESS_HOOKS,
  SEARCHING_HOOKS,
  COMMITMENT_HOOKS,
  REAL_FEELINGS_HOOKS,
  STILL_FEELS_HOOKS,
  HIS_OTHER_LIFE_HOOKS,
  TAROT_HOOKS,
  HEADLINES,
  angleForHook,
  openerCStart,
  openerB,
  parseTarotParams,
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

describe('soulmate-label hooks are wired end to end', () => {
  it('all three are in the roster, have headlines, and report angle=soulmate-label', () => {
    expect(SOULMATE_LABEL_HOOKS.length).toBe(3);
    for (const h of SOULMATE_LABEL_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=soulmate-label`).toBe('soulmate-label');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-really-soulmate']).toBe('Is he really my soulmate?');
    expect(HEADLINES['cards-twin-or-connection']).toBe('Is he my twin flame, or just a strong connection?');
    expect(HEADLINES['cards-met-already']).toBe('Have I already met my soulmate without realizing it?');
  });

  // ⭐⭐ THE MEASUREMENT PIN, and the reason this family is separate at all. twin-flame swaps the
  // WORDING of three running questions; these interrogate the word. Fold them together and
  // twin-flame's challenger-vs-incumbent comparison silently dies.
  it('TWIN_FLAME_HOOKS stays exactly three — its vocabulary test must stay readable', () => {
    expect(TWIN_FLAME_HOOKS).toEqual(['cards-twin-ready', 'cards-twin-feels', 'cards-twin-back']);
    for (const h of SOULMATE_LABEL_HOOKS) {
      expect(TWIN_FLAME_HOOKS, `${h} was folded into twin-flame`).not.toContain(h);
    }
    expect(angleForHook('cards-twin-back')).toBe('twin-flame');
  });

  // ⭐⭐ SAFETY PIN, and the sharpest one on this family. SELF_FRAME_HOOKS is mirrored by
  // SELF_FRAME_TAROT_HOOKS in prompts.ts, whose clause is "affirm the hopeful yes with
  // CERTAINTY". On these headlines that clause means certifying a living man as her soulmate —
  // the exact banned move. 'cards-met-already' is the one that most looks like self-frame.
  it('keeps the decode-him guards — it is in NO no-man family', () => {
    for (const h of SOULMATE_LABEL_HOOKS) {
      expect(SELF_FRAME_HOOKS, `${h} leaked into SELF_FRAME_HOOKS`).not.toContain(h);
      expect(LONELINESS_HOOKS, `${h} leaked into LONELINESS_HOOKS`).not.toContain(h);
      expect(SEARCHING_HOOKS, `${h} leaked into SEARCHING_HOOKS`).not.toContain(h);
      expect(SOULMATE_WHERE_HOOKS, `${h} leaked into soulmate-where`).not.toContain(h);
      expect(SOULMATE_AFTER_LOSS_HOOKS, `${h} leaked into soulmate-after-loss`).not.toContain(h);
    }
  });

  it('is not folded into any neighbouring family', () => {
    for (const h of SOULMATE_LABEL_HOOKS) {
      expect(COMMITMENT_HOOKS, `${h} folded into commitment`).not.toContain(h);
      expect(REAL_FEELINGS_HOOKS, `${h} folded into real-feelings`).not.toContain(h);
      expect(STILL_FEELS_HOOKS, `${h} folded into still-feels`).not.toContain(h);
      expect(HIS_OTHER_LIFE_HOOKS, `${h} folded into his-other-life`).not.toContain(h);
    }
  });

  it('reuses no existing hook id, and adds no new duplicate headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    const others = TAROT_HOOKS.filter((h) => !SOULMATE_LABEL_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of SOULMATE_LABEL_HOOKS) {
      expect(others, `${h} headline duplicates an existing lander`).not.toContain(HEADLINES[h]);
    }
    const all = TAROT_HOOKS.map((h) => HEADLINES[h]);
    const dupes = all.filter((x, i) => all.indexOf(x) !== i);
    // cards-return / cards-come-back deliberately share one headline (reunion, 2026-08-04).
    // 🔴 'cards-twin-back' / 'cards-twinflame-back' share one headline too, by operator
    // decision 2026-08-19 (the soulmate-return family): the incumbent keeps its ad URL and its
    // `twin-flame` angle, and the challenger runs bespoke reads against it. Same call as
    // cards-return / cards-come-back — identical pages mean the READS are the only variable.
    expect(new Set(dupes)).toEqual(
      new Set(['Will he come back?', 'Is my twin flame coming back to me?']),
    );
  });

  // ⚠️ THE NEAR-IDENTICAL-SLUG HAZARD that put a wrong lander on a PostHog money step on 08-12.
  // 🔴 Sharpest here of any family so far: the live 'cards-soulmate' is a substring of several
  // obvious slug choices for these headlines, which is why none of the three starts that way.
  it('no new slug is a substring of an existing one, or vice versa', () => {
    const others = TAROT_HOOKS.filter((h) => !SOULMATE_LABEL_HOOKS.includes(h));
    const clashes: string[] = [];
    for (const n of SOULMATE_LABEL_HOOKS) for (const o of others) {
      if (n.includes(o) || o.includes(n)) clashes.push(`${n} ~ ${o}`);
    }
    expect(clashes, `slug collision — a PostHog 'contains' filter would double count:\n${clashes.join('\n')}`).toEqual([]);
  });

  it('leaves every previously shipped family exactly where it was', () => {
    expect(angleForHook('cards-honest')).toBe('decode-him');
    expect(angleForHook('cards-misled')).toBe('trust');
    expect(angleForHook('cards-will-commit')).toBe('commitment');
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
    expect(angleForHook('cards-feels-off')).toBe('hidden-intuition');
    expect(angleForHook('cards-really-love')).toBe('real-feelings');
    expect(angleForHook('cards-still-love')).toBe('still-feels');
    expect(angleForHook('cards-too-long')).toBe('his-other-life');
    expect(angleForHook('cards-love-again')).toBe('self-frame');
    expect(angleForHook('cards-soulmate')).toBe('self-frame');
  });

  // 🔴 An opener may not ask her to build a case FOR the label (that sets her arguing a verdict
  // Evelyn would then have to deliver), and may not ask her to name anybody.
  it('the openers ask for her own material, never a case and never a name', () => {
    for (const h of SOULMATE_LABEL_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      expect(q, `${h} opener asks her to argue for the label`).not.toMatch(
        /what makes you think he|why do you (think|believe) he|what convinces you/i,
      );
      expect(q, `${h} opener asks her to name a person`).not.toMatch(
        /who (do you think|might it|was it)|which of them|name (him|the man)/i,
      );
    }
  });

  it('is FACE-DOWN ONLY — not ported to the face-up decks', () => {
    for (const h of SOULMATE_LABEL_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — soulmate-label reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = SOULMATE_LABEL_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !SOULMATE_LABEL_HOOKS.includes(h));

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
    /\b(no|not|never|can't|unable|n't|nor|nobody|no one|none|cannot|rather than|instead of|does not|is not|nothing|refuses?|declines?|will not|would not|withholds?|neither|without|inventing|invent|manufacture|pretend|suppose|supposing|if|were|conjured|banned)\b/i;
  const clausesOf = (s: string) => s.split(/[—;:,.]/);

  // ⚠️ RESTATEMENT EXEMPTION — beat 2 repeats HER question back, and several reads must NAME a
  // banned frame in order to refuse it. Restating a question is not asserting its answer; the
  // sweep is clause-level, so a real assertion after the restatement is a separate clause and
  // is still caught.
  const RESTATES =
    /\byou (asked|came asking|are asking|have asked|did not ask|came to be|came here|came for|came into|have set|have arranged|have been told)\b/i;

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

  // 🔴🔴 THE RAW BANS — the deliberate exception to negation-awareness. These few strings may
  // never appear in ANY form, including inside a refusal, because a reader skimming does not
  // reliably carry the negation and would take the phrase away as the answer. When one fires:
  // REWORD THE COPY, NEVER WEAKEN THE BAN.
  it('never utters the label verdict, in either direction, even inside a refusal', () => {
    const RAW_BANS: Array<[RegExp, string]> = [
      [/\bhe (really )?is your (soulmate|twin flame)\b/i, 'certifies the label'],
      [/\bhe is not your (soulmate|twin flame)\b/i, 'denies the label'],
      [/\bhe is (the one|your person)\b/i, 'certifies the label'],
      [/\byou (have )?(already )?met (him|your soulmate) and (missed|lost)\b/i, 'the missed-him verdict'],
      [/\byour soulmate is (elsewhere|still ahead|coming|out there)\b/i, 'a forecast dressed as a finding'],
      [/\b(twin flames?|a twin flame) (is|are) (rarer|higher|deeper|stronger|more)\b/i, 'ranks the labels'],
      [/\bmore than (just )?a (soulmate|strong connection)\b/i, 'ranks the labels'],
      [/\bonly a strong connection\b/i, 'treats the plain word as the losing branch'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of RAW_BANS) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat.slice(0, 120)}…"`);
    }
    expect(hits, `banned phrase present in ANY form — reword the copy:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN #2 — THE RANKING. The reason this family needs its own guard file: no other angle
  // on the funnel has a hook that asks which of two labels is the better one.
  it('NEVER ranks the labels against each other, in either direction', () => {
    const RANK: Array<[RegExp, string]> = [
      [/\b(soulmates?|twin flames?) (come|are) (above|below|first|second)\b/i, 'ranks the labels'],
      [/\bthe (highest|deepest|rarest|truest) (form|kind|level) of (love|connection|bond)\b/i, 'grades love'],
      [/\bsettle for (a|just a)\b/i, 'frames the plain word as settling'],
      [/\bmerely a (connection|bond|attraction)\b/i, 'demotes the connection'],
      [/\ba lesser (bond|connection|love)\b/i, 'demotes the connection'],
      [/\byou deserve (a|more than a) (twin flame|soulmate)\b/i, 'ranks and prescribes'],
    ];
    const hits = sweep(RANK);
    expect(hits, `ranked the labels:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN #3 — THE RUNNER SCRIPT + SEPARATION PHASE, inherited from twin-flame. The term drags
  // its community's teaching in with it, and the runner script trains a woman to read being
  // ignored as evidence she is loved. The most harmful thing this family could say.
  it('NEVER reads distance as proof of the bond, or makes anything conditional on her healing', () => {
    const RUNNER: Array<[RegExp, string]> = [
      [/\bhis (distance|silence|absence|running) (is|proves|shows|means)\b/i, 'distance as proof'],
      [/\bthe (runner|chaser)\b/i, 'the runner script'],
      [/\b(separation|surrender) (phase|stage)\b/i, 'the separation phase'],
      [/\bpart of the journey\b/i, 'frames an absence as a stage'],
      [/\bwhen you (heal|let go|raise)\b/i, 'ascension homework'],
      [/\b(raise|raising) your vibration\b/i, 'ascension homework'],
      [/\bhe will return when you\b/i, 'makes his return her task'],
      [/\bpushes you away because\b/i, 'explains his conduct as the bond'],
    ];
    const hits = sweep(RUNNER);
    expect(hits, `ran the twin-flame community script:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN #4 — NAMING A PERSON. 'cards-met-already' invites it directly, and a name conjured
  // here sends her back through years of her own messages hunting for a sign that was never there.
  it('cards-met-already never points at anybody, and never grades her past self', () => {
    const POINT: Array<[RegExp, string]> = [
      [/\byou already know who\b/i, 'points at a person'],
      [/\bthe (man|one) who (came|was) (before|first)\b/i, 'points at a person'],
      [/\bthink back to\b/i, 'sends her hunting'],
      [/\bgo back (to|through) (him|your)\b/i, 'sends her hunting'],
      [/\breach out to him\b/i, 'a tactic'],
      [/\byou (were|are) (blind|naive|careless|foolish)\b/i, 'grades her past self'],
      [/\byou should have (seen|known|noticed)\b/i, 'grades her past self'],
    ];
    const hits = sweep(POINT, ['cards-met-already']);
    expect(hits, `pointed at someone or graded her:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN #5 — no timeframe, no tactic, no leave/stay instruction. Every headline here invites
  // advice, and advice is what the funnel does not sell.
  // 🔄 NARROWED 2026-08-19 — the forecast ("he'll come around") is now allowed; only the
  // COACHING and the DATES stay. This funnel sells a reading, not a plan, and a date is the
  // one claim she can hold it to.
  it('never COACHES her, and never puts a date on it', () => {
    const TACTIC: Array<[RegExp, string]> = [
      [/\b(you should|you need to) (leave|walk away|end it|stay|wait)\b/i, 'leave/stay instruction'],
      [/\bpull back\b|\bstop (texting|calling)\b|\bmake him\b/i, 'tactic'],
      [/\bgive him (space|a deadline|time)\b/i, 'tactic'],
      [/\bwithin (a|the) (week|month|year)\b/i, 'a dated prediction'],
      [/\b(in|after) (a few|several|six) (weeks|months|years)\b/i, 'a dated prediction'],
      [/\byou will know when\b/i, 'the fake timeframe'],
    ];
    const hits = sweep(TACTIC);
    expect(hits, `coached her:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ THE PAYOUT, pinned as a REQUIREMENT. A family that only refuses gives her nothing — the
  // trap caught on still-feels and again on his-other-life. What is affirmable here is the PULL
  // and the evidence she already holds, never the word.
  it('every hook AFFIRMS something, it does not only refuse', () => {
    const PAYOFF: Record<string, RegExp> = {
      'cards-really-soulmate':
        /the pull is real|already holding|evidence that actually bears|what the two of you have|already know/i,
      'cards-twin-or-connection':
        /identical under both|nothing about him shifts|does not become smaller|entitled to (the whole of )?the second|what is genuinely in front of you/i,
      'cards-met-already':
        /noticing is a real faculty|doing her best|doing your best|a meeting is not an examination|the road you are actually walking|not an examination/i,
    };
    for (const h of present) {
      const joined = CARDS.map((c) => reads[h]![c][2]).join(' ');
      expect(PAYOFF[h].test(joined), `${h} only refuses — the affirmable payout is gone`).toBe(true);
    }
  });

  // ⭐⭐ 'cards-twin-or-connection' is the FIFTH binary-refusing hook. Its grounds are its own:
  // both branches describe THE SAME EVIDENCE under two words, so the answer changes nothing she
  // could observe. It must not borrow the other four's reasons.
  it('cards-twin-or-connection refuses its binary on ITS OWN grounds', () => {
    const joined = CARDS.map((c) => reads['cards-twin-or-connection']![c][2]).join(' ');
    expect(
      /identical under both|same man|nothing about him shifts|not one thing|two names for one situation|what is different tomorrow/i.test(joined),
      'the same-evidence-two-words finding is gone — this hook has collapsed into a generic refusal',
    ).toBe(true);
    for (const other of ['cards-moved-on', 'cards-imagining-it', 'cards-love-or-moved-on', 'cards-forever-or-now'] as const) {
      const inc = reads[other];
      const found: string[] = [];
      for (const c of CARDS) {
        for (const r of shared(reads['cards-twin-or-connection']![c][2], inc![c][2])) found.push(`${other}: "${r}"`);
      }
      expect(found, `rhymes with ${other}:\n${found.join('\n')}`).toEqual([]);
    }
  });
});

// ── The Version B path — the ONLY path these landers run ───────────────────────────────────
// 🔴 Operator decision 2026-08-17: this family's ads point at /fb-tarot/b, not /c. The bridge
// reads the version off the ROUTE (TarotBridge.tsx: path.endsWith('/b')) and forwards it to the
// chat as &v=b; useConversation then asks the server, which returns the URL's own version
// unchanged for any lander outside the v1_tarot_version_bc_2026 scope — these three are outside
// it, so B is what actually ships.
//
// ⭐⭐ WHY THIS MATTERS FOR SAFETY, not just plumbing: Version B makes NO model call. The static
// read below IS the entire reading she receives, so every guard in this file is load-bearing in
// a way it is not on a Version-C lander, where the reflect prompt gets a second chance to hold
// the line. Nothing here may rely on prompts.ts to catch it.
describe('soulmate-label — the Version B path (what the ads actually serve)', () => {
  it('the chat URL the /b bridge builds resolves to version b on the right deck', () => {
    for (const h of SOULMATE_LABEL_HOOKS) {
      // Exactly what TarotBridge navigates to: no &deck= (return-mhf is DEFAULT_DECK), &v=b.
      const parsed = parseTarotParams(`?hook=${h}&card=a&v=b`);
      expect(parsed, `${h} did not parse — the visitor would fall into the generic funnel`).toBeTruthy();
      expect(parsed!.version, `${h} did not resolve to Version B`).toBe('b');
      expect(parsed!.deck, `${h} resolved to the wrong deck`).toBe(DECK);
      expect(parsed!.hook, `${h} fell back to DEFAULT_HOOK`).toBe(h);
    }
  });

  // 🔄 MADE SPLIT-AWARE 2026-08-19. openerB runs every beat through intoBubbles, which splits
  // beat 3 on its newlines — so the SERVED length is a function of the copy shape, not of
  // whether the lander is whole: 5 while beat 3 is one line, 8 once it carries the seven cuts
  // (picture · bridge · four middle bubbles · open loop, then the name capture). This asserted
  // 5, so it failed the moment the migrated copy was loaded, and it was failing for a shape
  // change rather than for a fault. What it is really protecting — opens on the card, keeps the
  // open loop, ends on the name capture, and is a full-length read — is asserted below by
  // POSITION FROM THE END, which holds under either shape.
  it('openerB delivers the COMPLETE read plus name capture, for every card', () => {
    for (const h of SOULMATE_LABEL_HOOKS) for (const c of CARDS) {
      const msgs = openerB(DECK, h, c);
      expect([5, 8], `${h}/${c} openerB length ${msgs.length} — neither copy shape`).toContain(msgs.length);
      expect(msgs[0], `${h}/${c} must open on the card`).toMatch(/^You turned /);
      expect(msgs.at(-2)!, `${h}/${c} must keep the open loop`).toMatch(/^Let me look closer at .*…$/);
      expect(msgs.at(-1)!, `${h}/${c} must end on name capture`).toMatch(/what's your first name, dear\?$/);
      // B makes NO model call, so this static text is the WHOLE reading she is served. The old
      // bar (>400 chars in beat 3 alone) was written for a long-form beat 3 and grade-5 copy
      // cannot meet it — the seven-cut bubbles measure 185-220 there. The read as a whole is
      // the thing that must not be thin, and it is measured here: 460-510 across these nine.
      const read = msgs.slice(0, -1).join(' ');
      expect(read.length, `${h}/${c} the served read is too thin to be the whole reading`).toBeGreaterThan(400);
    }
  });
});

// ── The un-synced server rosters ───────────────────────────────────────────────────────────
// 🔴🔴 The bridge renders from the CLIENT registry, so the lander looks perfect even when the
// server side was never touched. Neither roster below is imported from that registry.
describe('soulmate-label — the hand-maintained server rosters', () => {
  const loadSrc = (rel: string) =>
    import('node:fs').then((fs) => fs.promises.readFile(new URL(rel, import.meta.url), 'utf8'));

  it('every hook has its own context AND tendency entry in prompts.ts', async () => {
    const src = await loadSrc('../server/lib/prompts.ts');
    for (const h of SOULMATE_LABEL_HOOKS) {
      const occurrences = src.split(`'${h}'`).length - 1;
      expect(occurrences, `${h} needs a TAROT_HOOK_CONTEXT and a TAROT_HOOK_TENDENCY entry`).toBe(2);
    }
  });

  // ⭐⭐ THE CLASSIC SILENT HALF-FIX. Miss this roster and Versions A/B still look perfect while
  // Version C's chat handoff 400s {error:"Invalid tarot params"} — and a 400 falls back to a
  // normal-looking read, so it does not announce itself.
  // 🔴 Still required even though these landers ship on /fb-tarot/b: the /b path is honoured only
  // because these hooks are outside the v1_tarot_version_bc_2026 scope, and scope.landers is
  // append-only on a running test. The day one of them is enrolled, Version C goes live on it.
  it('the tarot validHooks roster in routes.ts accepts all three (or the chat 400s)', async () => {
    const src = await loadSrc('../server/routes.ts');
    const roster = src.match(/const validHooks = \["cards-honest".*?\];/s);
    expect(roster, 'tarot validHooks roster not found').toBeTruthy();
    for (const h of SOULMATE_LABEL_HOOKS) {
      expect(roster![0], `${h} missing from validHooks — Version-C handoff will 400`).toContain(h);
    }
  });

  it('the new angle has a label in the admin experiments dashboard', async () => {
    const src = await loadSrc('../client/src/pages/admin/ExperimentsDashboard.tsx');
    expect(src, 'soulmate-label has no ANGLE_LABELS entry').toMatch(/"soulmate-label":\s*"/);
  });
});
