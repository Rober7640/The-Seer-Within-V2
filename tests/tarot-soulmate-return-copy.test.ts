// Copy guards for the /fb-tarot SOULMATE-RETURN hooks (2026-08-19).
//
// THREE landers on the FACE-DOWN return-mhf deck, NO NEW ART, shipping on /fb-tarot/b.
// Operator category: "Reunion/Return" · topic: "Soulmate / twin-flame crossover".
//
// ⭐⭐ THE ORGAN — THE LABEL IS BEING ASKED TO PREDICT. Everywhere else on the funnel the label
// and the return are separate things; here they are welded, and the weld IS the family:
//
//   · reunion         asks whether HE will come back. No label in it at all.
//   · twin-flame      re-asks three RUNNING questions in her vocabulary — the label is a
//                     wrapper and the question underneath stands perfectly well without it.
//   · soulmate-label  asks whether the WORD FITS. A man is present; no return is asked for.
//   · these three     use the word AS THE REASON HE MUST COME BACK. The label is load-bearing,
//                     offered as evidence about the future: "he is my soulmate, therefore…"
//
// 'cards-was-he-soulmate' is the same machine running BACKWARDS — he has not come back, so she
// is re-examining the word, and behind it everything she lived.
//
// ⭐⭐ 'cards-twinflame-back' CARRIES THE LIVE 'cards-twin-back' HEADLINE VERBATIM. Operator
// decision 2026-08-19, the second such pair on the funnel after cards-return / cards-come-back
// (2026-08-04). The incumbent is UNTOUCHED and keeps its `twin-flame` angle. Same deck, same
// art, same headline ⇒ THE READS ARE THE ONLY VARIABLE, which imposes two obligations this file
// pins mechanically: the reads must not paraphrase the incumbent (the 6-word-run sweep), and
// they must stay LENGTH-MATCHED to it, or the test silently measures length instead of copy.
//
// Bans specific to this family, on top of the shared decode-him no-verdict guard:
//   1. 🔴🔴 THE LABEL MAY NEVER CARRY A PREDICTION. Never "he is your soulmate, so he returns",
//      never "he is not, so he will not", and above all never the softened "if he is truly
//      yours he will come back" — the runner and ascension teaching in one sentence, which
//      makes his return the proof of the bond and therefore his absence evidence against her.
//   2. 🔴🔴 THE LABEL ITSELF, BOTH DIRECTIONS — never certified, never revoked. Inherited from
//      twin-flame and soulmate-label. On 'cards-was-he-soulmate' the revocation is the live
//      danger: "he was never really yours" would cancel years she actually lived.
//   3. 🔴🔴 THE RANKING — refuse the ladder rather than placing her on a rung.
//   4. 🔴 RUNNER/CHASER · SEPARATION PHASE · ASCEND-FIRST, riding along from twin-flame.
//   5. 🔴 No predicted return, no date or timeframe, no MOTIVE for his leaving (which the
//      shared decode-him guard does NOT carry), no tactic for reaching him.
//
// 🔴 Negation-aware by construction: correct copy here is refusal-heavy and routinely names a
// banned idea in order to refuse it, so a naive substring ban would fail the copy it protects.
// The RAW_BANS block is the deliberate exception — those strings may never appear in ANY form,
// including inside a refusal, because a skimming reader does not carry the negation. When one
// fires: REWORD THE COPY, NEVER WEAKEN THE BAN.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  SOULMATE_RETURN_HOOKS,
  SOULMATE_LABEL_HOOKS,
  TWIN_FLAME_HOOKS,
  REUNION_HOOKS,
  RECONCILIATION_HOOKS,
  SOULMATE_WHERE_HOOKS,
  SOULMATE_AFTER_LOSS_HOOKS,
  SELF_FRAME_HOOKS,
  LONELINESS_HOOKS,
  SEARCHING_HOOKS,
  MISSING_HIM_HOOKS,
  WHY_HE_LEFT_HOOKS,
  TAROT_HOOKS,
  HEADLINES,
  angleForHook,
  openerCStart,
  openerB,
  parseTarotParams,
} = await import('@/content/tarotReads');

const DECK = 'return-mhf' as const;
const CARDS = ['a', 'b', 'c'] as const;
const INCUMBENT = 'cards-twin-back' as const;
const CHALLENGER = 'cards-twinflame-back' as const;

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const runsOf = (s: string, n = 6) => {
  const w = words(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
};
const shared = (a: string, b: string) => [...runsOf(a)].filter((r) => runsOf(b).has(r));

describe('soulmate-return hooks are wired end to end', () => {
  it('all three are in the roster, have headlines, and report angle=soulmate-return', () => {
    expect(SOULMATE_RETURN_HOOKS.length).toBe(3);
    for (const h of SOULMATE_RETURN_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=soulmate-return`).toBe('soulmate-return');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-my-soulmate-back']).toBe('Is my soulmate coming back to me?');
    expect(HEADLINES['cards-twinflame-back']).toBe('Is my twin flame coming back to me?');
    expect(HEADLINES['cards-was-he-soulmate']).toBe('Was he ever really my soulmate?');
  });

  // ⭐⭐ THE COPY-TEST PIN. The whole point of the challenger is that a visitor cannot tell the
  // two landers apart until the read begins. If any of this drifts, the test stops being a copy
  // test and nobody finds out from the numbers.
  it('the challenger is page-identical to its incumbent, and differs ONLY in the reads', () => {
    expect(HEADLINES[CHALLENGER], 'headline drifted — this is no longer one experiment').toBe(
      HEADLINES[INCUMBENT],
    );
    // Same deck, therefore the same strip art, the same facing and the same three cards.
    expect(DECKS[DECK].reads[INCUMBENT], 'incumbent left the deck').toBeTruthy();
    expect(DECKS[DECK].reads[CHALLENGER], 'challenger is not on the deck').toBeTruthy();
    // …and they are filed in DIFFERENT angles, or the challenger lands in its own control group.
    expect(angleForHook(INCUMBENT)).toBe('twin-flame');
    expect(angleForHook(CHALLENGER)).toBe('soulmate-return');
  });

  // 🔴🔴 THE INCUMBENT IS UNTOUCHED — the standing rule is that a new headline never replaces an
  // old lander, and 'cards-twin-back' has a live ad URL pointing at it.
  it('leaves the incumbent exactly where it was, inside a twin-flame family of three', () => {
    expect(TWIN_FLAME_HOOKS).toEqual(['cards-twin-ready', 'cards-twin-feels', 'cards-twin-back']);
    for (const h of SOULMATE_RETURN_HOOKS) {
      expect(TWIN_FLAME_HOOKS, `${h} was folded into twin-flame — it would be its own control`).not.toContain(h);
    }
  });

  // ⭐⭐ THE MEASUREMENT PINS. Three families' running numbers depend on these sets not moving.
  it('REUNION_HOOKS and SOULMATE_LABEL_HOOKS both stay exactly three', () => {
    expect(REUNION_HOOKS).toEqual(['cards-come-back', 'cards-ever-back', 'cards-moved-on']);
    expect(SOULMATE_LABEL_HOOKS).toEqual([
      'cards-really-soulmate',
      'cards-twin-or-connection',
      'cards-met-already',
    ]);
    for (const h of SOULMATE_RETURN_HOOKS) {
      expect(REUNION_HOOKS, `${h} folded into reunion`).not.toContain(h);
      expect(SOULMATE_LABEL_HOOKS, `${h} folded into soulmate-label`).not.toContain(h);
      expect(RECONCILIATION_HOOKS, `${h} folded into reconciliation`).not.toContain(h);
    }
  });

  // ⭐⭐ SAFETY PIN. SELF_FRAME_HOOKS is mirrored by SELF_FRAME_TAROT_HOOKS in prompts.ts, whose
  // clause is "affirm the hopeful yes with CERTAINTY". Here the hopeful yes IS the banned move:
  // it would certify a living man as her soulmate AND forecast his return in one stroke.
  it('keeps the decode-him guards — it is in NO no-man family', () => {
    for (const h of SOULMATE_RETURN_HOOKS) {
      expect(SELF_FRAME_HOOKS, `${h} leaked into SELF_FRAME_HOOKS`).not.toContain(h);
      expect(LONELINESS_HOOKS, `${h} leaked into LONELINESS_HOOKS`).not.toContain(h);
      expect(SEARCHING_HOOKS, `${h} leaked into SEARCHING_HOOKS`).not.toContain(h);
      expect(SOULMATE_WHERE_HOOKS, `${h} leaked into soulmate-where`).not.toContain(h);
      expect(SOULMATE_AFTER_LOSS_HOOKS, `${h} leaked into soulmate-after-loss`).not.toContain(h);
      expect(MISSING_HIM_HOOKS, `${h} leaked into missing-him`).not.toContain(h);
      expect(WHY_HE_LEFT_HOOKS, `${h} leaked into why-he-left`).not.toContain(h);
    }
  });

  it('reuses no existing hook id, and adds only the ONE intended duplicate headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    // Every soulmate-return headline except the deliberate counterpart must be unique.
    const others = TAROT_HOOKS.filter(
      (h) => !SOULMATE_RETURN_HOOKS.includes(h) && h !== INCUMBENT,
    ).map((h) => HEADLINES[h]);
    for (const h of SOULMATE_RETURN_HOOKS) {
      expect(others, `${h} headline duplicates an existing lander`).not.toContain(HEADLINES[h]);
    }
    // Funnel-wide, exactly TWO deliberate pairs exist and no more.
    const all = TAROT_HOOKS.map((h) => HEADLINES[h]);
    const dupes = all.filter((x, i) => all.indexOf(x) !== i);
    expect(new Set(dupes)).toEqual(
      new Set(['Will he come back?', 'Is my twin flame coming back to me?']),
    );
  });

  // ⚠️ THE NEAR-IDENTICAL-SLUG HAZARD that put a wrong lander on a PostHog money step on 08-12.
  // 🔴 Sharp here in two places: the live 'cards-soulmate' is a substring of the obvious slug for
  // the first headline (which is why it is 'cards-my-soulmate-back'), and 'cards-twin-back' is
  // one hyphen from the challenger — which is exactly why the challenger is NOT 'cards-my-twin-back'.
  it('no new slug is a substring of an existing one, or vice versa', () => {
    const others = TAROT_HOOKS.filter((h) => !SOULMATE_RETURN_HOOKS.includes(h));
    const clashes: string[] = [];
    for (const n of SOULMATE_RETURN_HOOKS) for (const o of others) {
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
    expect(angleForHook('cards-really-soulmate')).toBe('soulmate-label');
    expect(angleForHook('cards-love-again')).toBe('self-frame');
    expect(angleForHook('cards-soulmate')).toBe('self-frame');
  });

  // 🔴🔴 An opener may not ask for the forecast the reads then decline to give — that hands her
  // the expectation the read has to take back. It may not ask her to argue the label either.
  it('the openers ask for her own material, never a forecast and never a case for the word', () => {
    for (const h of SOULMATE_RETURN_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      expect(q, `${h} opener asks her to predict the return`).not.toMatch(
        /do you think he('ll| will)|when do you (think|expect)|how long (has|have)|will he come/i,
      );
      expect(q, `${h} opener asks her to argue for the label`).not.toMatch(
        /do you (think|believe) he is|what makes you think he|what convinces you/i,
      );
    }
    // 🔴 The challenger may not borrow the incumbent's opener — every line is under test.
    expect(openerCStart(DECK, CHALLENGER, 'a')[1]).not.toBe(openerCStart(DECK, INCUMBENT, 'a')[1]);
  });

  it('is FACE-DOWN ONLY — not ported to the face-up decks', () => {
    for (const h of SOULMATE_RETURN_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — soulmate-return reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = SOULMATE_RETURN_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !SOULMATE_RETURN_HOOKS.includes(h));

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

  // ⭐⭐ NEW FOR THIS FAMILY, and the guard the copy test actually depends on. The challenger and
  // the incumbent are served on identical pages, so if their reads drift apart in LENGTH the
  // experiment quietly stops measuring copy and starts measuring how much text a visitor will
  // read. Pinned as a band rather than a number so ordinary editing stays possible.
  it('the challenger stays length-matched to the incumbent it is tested against', () => {
    for (const c of CARDS) {
      const mine = words(reads[CHALLENGER]![c][2]).length;
      const theirs = words(reads[INCUMBENT]![c][2]).length;
      const ratio = mine / theirs;
      expect(
        ratio > 0.75 && ratio < 1.33,
        `card ${c}: challenger beat 3 is ${mine}w against the incumbent's ${theirs}w — the A/B is now a length test`,
      ).toBe(true);
    }
  });

  // 🔴 …and it must not paraphrase the incumbent. Stated explicitly for THIS PAIR rather than
  // left to the deck-wide sweep above, because this is the one comparison the family exists to
  // make and it should fail with a message that says so.
  //
  // ⚠️ BEAT 3 ONLY, deliberately. Beats 1, 2 and 4 are house scaffolding by design — every read
  // on the funnel opens "You turned the <Card>, dear — the card of…" and closes "Let me look
  // closer at …". Sweeping those would ban the voice the lander is required to speak in. Their
  // distinctness is pinned instead by the card-framing test above.
  it('the challenger shares no 6-word run with the incumbent it is tested against', () => {
    const found: string[] = [];
    for (const c of CARDS) {
      for (const r of shared(reads[CHALLENGER]![c][2], reads[INCUMBENT]![c][2]))
        found.push(`card ${c}: "${r}"`);
    }
    expect(found, `the challenger paraphrases its own control:\n${found.join('\n')}`).toEqual([]);
    // The framing beat must at least not be word-for-word identical to its control's.
    for (const c of CARDS) {
      expect(reads[CHALLENGER]![c][0], `card ${c} framing is identical to the control's`).not.toBe(
        reads[INCUMBENT]![c][0],
      );
    }
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
    /\b(no|not|never|n't|nor|nobody|no one|none|cannot|rather than|instead of|does not|is not|nothing|refuses?|declines?|decline|will not|would not|withholds?|withdrawn|neither|without|inventing|invent|manufacture|pretend|suppose|supposing|if|were|conjured|banned)\b/i;
  const clausesOf = (s: string) => s.split(/[—;:,.]/);

  // ⚠️ RESTATEMENT EXEMPTION — beat 2 repeats HER question back, and several reads must NAME a
  // banned frame in order to refuse it. Restating is not asserting; the sweep is clause-level,
  // so a real assertion after the restatement is a separate clause and is still caught.
  const RESTATES =
    /\byou (asked|came asking|are asking|have asked|did not ask|came with|came for|have been (taught|told)|have since been)\b/i;

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

  // 🔴🔴 BAN #1 — THE RAW BANS. The deliberate exception to negation-awareness. These strings may
  // never appear in ANY form, including inside a refusal, because a reader skimming does not
  // reliably carry the negation and would take the phrase away as the answer.
  // REWORD THE COPY, NEVER WEAKEN THE BAN.
  it('never lets the label carry a prediction, in either direction, even inside a refusal', () => {
    const RAW_BANS: Array<[RegExp, string]> = [
      // The central move — the return as proof of the bond.
      [/\bif he('s| is| was) (truly |really )?yours\b/i, 'makes the return proof of the bond'],
      [/\bif (he|it) (is|was) (real|meant to be)\b.{0,40}\b(come|comes|coming) back\b/i, 'the return as proof'],
      [/\b(soulmates|twin flames) always (come back|return|find their way)\b/i, 'a universal law used as a forecast'],
      [/\bmeant to be\b.{0,30}\b(he|they) (will|'ll) (come back|return)\b/i, 'the label forecasting'],
      // The label itself, both directions.
      [/\bhe (really )?is your (soulmate|twin flame)\b/i, 'certifies the label'],
      [/\bhe is not your (soulmate|twin flame)\b/i, 'denies the label'],
      [/\bhe (was|is) never (really )?yours\b/i, 'revokes the label — cancels what she lived'],
      [/\bhe is (the one|your person)\b/i, 'certifies the label'],
      // The return itself.
      [/\bhe (is|will be) coming back\b/i, 'forecasts the return'],
      [/\bhe (will|'ll) (come back|return) to you\b/i, 'forecasts the return'],
      [/\bhe is on his way back\b/i, 'forecasts the return'],
      // The ranking.
      [/\b(twin flames?|a twin flame) (is|are) (rarer|higher|deeper|stronger|more)\b/i, 'ranks the labels'],
      [/\bmore than (just )?a (soulmate|strong connection)\b/i, 'ranks the labels'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of RAW_BANS) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat.slice(0, 120)}…"`);
    }
    expect(hits, `banned phrase present in ANY form — reword the copy:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN #2 — THE RUNNER SCRIPT. The term drags its community's teaching in with it, and this
  // family is the one where that teaching is most load-bearing: she is already treating the label
  // as a guarantee of return, which is precisely what the runner script sells.
  it('NEVER reads distance as proof of the bond, or makes his return her homework', () => {
    const RUNNER: Array<[RegExp, string]> = [
      [/\bhis (distance|silence|absence|running) (is|proves|shows|means)\b/i, 'distance as proof'],
      [/\bthe (runner|chaser)\b/i, 'the runner script'],
      [/\b(separation|surrender) (phase|stage)\b/i, 'the separation phase'],
      [/\bpart of the journey\b/i, 'frames an absence as a stage'],
      [/\bwhen you (heal|let go|raise)\b/i, 'ascension homework'],
      [/\b(raise|raising) your vibration\b/i, 'ascension homework'],
      [/\bhe will return when you\b/i, 'makes his return her task'],
      [/\bpushes you away because\b/i, 'explains his conduct as the bond'],
      [/\bthe universe (is|will) (bringing|bring|return)/i, 'outsources the forecast'],
    ];
    const hits = sweep(RUNNER);
    expect(hits, `ran the twin-flame community script:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN #3 — THE RANKING, inherited from soulmate-label. Refuse the ladder, never climb it.
  it('NEVER ranks the labels against each other, in either direction', () => {
    const RANK: Array<[RegExp, string]> = [
      [/\b(soulmates?|twin flames?) (come|are) (above|below|first|second)\b/i, 'ranks the labels'],
      [/\bthe (highest|deepest|rarest|truest) (form|kind|level) of (love|connection|bond)\b/i, 'grades love'],
      [/\bsettle for (a|just a)\b/i, 'frames the plain word as settling'],
      [/\bmerely a (connection|bond|attraction)\b/i, 'demotes the connection'],
      [/\ba lesser (bond|connection|love)\b/i, 'demotes the connection'],
    ];
    const hits = sweep(RANK);
    expect(hits, `ranked the labels:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN #4 — no timeframe, no tactic, no leave/stay instruction, and no MOTIVE for his going.
  // The motive ban does NOT ride along on the shared decode-him guard and must be stated here.
  it('NEVER hands her a timeframe, a tactic, or a reason he left', () => {
    const TACTIC: Array<[RegExp, string]> = [
      [/\b(you should|you need to) (leave|walk away|end it|stay|wait|move on)\b/i, 'leave/stay instruction'],
      [/\bpull back\b|\bstop (texting|calling)\b|\bmake him\b/i, 'tactic'],
      [/\bgive him (space|a deadline|time)\b/i, 'tactic'],
      [/\breach out to him\b/i, 'tactic'],
      [/\bwithin (a|the) (week|month|year)\b/i, 'timeframe'],
      [/\b(in|after) (a few|several|six) (weeks|months|years)\b/i, 'timeframe'],
      [/\byou will know when\b/i, 'the fake timeframe'],
      [/\bhe('ll| will) (come around|realise|realize|choose you)\b/i, 'forecast'],
      [/\bhe left because\b/i, 'supplies a motive'],
      [/\bthe reason he (left|went|walked)\b/i, 'supplies a motive'],
      [/\bhe (was|is) (afraid|scared|not ready|frightened)\b/i, 'supplies a motive'],
    ];
    const hits = sweep(TACTIC);
    expect(hits, `coached her or explained him:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN #5 — 'cards-was-he-soulmate' specific. The revocation is the live danger here, and
  // so is grading her earlier self: she arrives half-braced to be told she was a fool.
  it('cards-was-he-soulmate never convicts her earlier self, and never cancels what she lived', () => {
    const BACKWARD: Array<[RegExp, string]> = [
      [/\byou (were|are) (blind|naive|careless|foolish|a fool)\b/i, 'grades her past self'],
      [/\byou should have (seen|known|noticed|left)\b/i, 'grades her past self'],
      [/\bit (was|were) never real\b/i, 'cancels what she lived'],
      [/\byou (imagined|invented|made up) (it|the whole)\b/i, 'cancels what she lived'],
      [/\bwasted (years|time|your)\b/i, 'cancels what she lived'],
      [/\bhe never (loved|cared|felt)\b/i, 'a verdict on him'],
    ];
    const hits = sweep(BACKWARD, ['cards-was-he-soulmate']);
    expect(hits, `convicted her or cancelled it:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ THE PAYOUT, pinned as a REQUIREMENT. A family this refusal-heavy that only refuses hands
  // her nothing — the trap caught on still-feels, again on his-other-life, and again on closure.
  it('every hook AFFIRMS something, it does not only refuse', () => {
    const PAYOFF: Record<string, RegExp> = {
      'cards-my-soulmate-back':
        /what you felt is true either way|built it into the asking|only sets your place again/i,
      'cards-twinflame-back':
        /never built to do that|it is your account|no rank comes with a man attached/i,
      'cards-was-he-soulmate':
        /does not unmake what was on it|you were not a fool|real while you felt it/i,
    };
    for (const h of present) {
      const joined = CARDS.map((c) => reads[h]![c][2]).join(' ');
      expect(PAYOFF[h].test(joined), `${h} only refuses — the affirmable payout is gone`).toBe(true);
    }
  });

  // ⭐ THE FAMILY'S OWN FINDING must survive editing: the label is a DESCRIPTION, not a mechanism.
  // If this dissolves, the three hooks collapse into a generic "I cannot predict him" refusal and
  // stop being distinguishable from reunion.
  it('keeps the description-is-not-a-mechanism finding that defines the family', () => {
    const joined = present
      .flatMap((h) => CARDS.map((c) => reads[h]![c][2]))
      .join(' ');
    expect(
      /a description is not an engine|does not steer anybody|cannot reach across a distance|naming is one act|not a prediction of how long|never a contract he/i.test(joined),
      'the label-cannot-predict finding is gone — this family has collapsed into a generic refusal',
    ).toBe(true);
  });
});

// ── The Version B path — the ONLY path these landers run ───────────────────────────────────
// 🔴 Operator decision: this family's ads point at /fb-tarot/b, not /c. The bridge reads the
// version off the ROUTE (TarotBridge.tsx: path.endsWith('/b')) and forwards it as &v=b;
// useConversation then asks the server, which returns the URL's own version unchanged for any
// lander outside the v1_tarot_version_bc_2026 scope — these three are outside it.
//
// ⭐⭐ WHY THIS MATTERS FOR SAFETY: Version B makes NO model call. The static read below IS the
// entire reading she receives, so every guard in this file is load-bearing in a way it is not on
// a Version-C lander. Nothing here may rely on prompts.ts to catch it.
describe('soulmate-return — the Version B path (what the ads actually serve)', () => {
  it('the chat URL the /b bridge builds resolves to version b on the right deck', () => {
    for (const h of SOULMATE_RETURN_HOOKS) {
      // Exactly what TarotBridge navigates to: no &deck= (return-mhf is DEFAULT_DECK), &v=b.
      const parsed = parseTarotParams(`?hook=${h}&card=a&v=b`);
      expect(parsed, `${h} did not parse — the visitor would fall into the generic funnel`).toBeTruthy();
      expect(parsed!.version, `${h} did not resolve to Version B`).toBe('b');
      expect(parsed!.deck, `${h} resolved to the wrong deck`).toBe(DECK);
      expect(parsed!.hook, `${h} fell back to DEFAULT_HOOK`).toBe(h);
    }
  });

  it('openerB delivers the COMPLETE read plus name capture, for every card', () => {
    for (const h of SOULMATE_RETURN_HOOKS) for (const c of CARDS) {
      const msgs = openerB(DECK, h, c);
      // ⭐ RESHAPED 2026-08-19 for the Natural Tarot-Cut: openerB splits each beat on
      // newlines, so beat 3 arrives as its own run of messages and the total is 8, not 5.
      // B still makes no LLM call, so a thin read is still a broken lander — the floor moved
      // from one long bubble to the joined length of the cut.
      expect(msgs.length, `${h}/${c} openerB is too short to be a read`).toBeGreaterThanOrEqual(7);
      expect(msgs[0], `${h}/${c} must open on the card`).toMatch(/^You turned /);
      expect(msgs[msgs.length - 2], `${h}/${c} must keep the open loop`).toMatch(/^Let me look closer at .*…$/);
      expect(msgs[msgs.length - 1], `${h}/${c} must end on name capture`).toMatch(/what's your first name, dear\?$/);
      const readBubbles = msgs.slice(2, -2);
      expect(readBubbles.length, `${h}/${c} beat 3 was never cut`).toBeGreaterThanOrEqual(3);
      expect(readBubbles.join(' ').length, `${h}/${c} the read is too thin to be the whole reading`).toBeGreaterThan(200);
    }
  });
});

// ── The un-synced server rosters ───────────────────────────────────────────────────────────
// 🔴🔴 The bridge renders from the CLIENT registry, so the lander looks perfect even when the
// server side was never touched. Neither roster below is imported from that registry.
describe('soulmate-return — the hand-maintained server rosters', () => {
  const loadSrc = (rel: string) =>
    import('node:fs').then((fs) => fs.promises.readFile(new URL(rel, import.meta.url), 'utf8'));

  it('every hook has its own context AND tendency entry in prompts.ts', async () => {
    const src = await loadSrc('../server/lib/prompts.ts');
    for (const h of SOULMATE_RETURN_HOOKS) {
      const occurrences = src.split(`'${h}'`).length - 1;
      expect(occurrences, `${h} needs a TAROT_HOOK_CONTEXT and a TAROT_HOOK_TENDENCY entry`).toBe(2);
    }
  });

  // ⭐⭐ THE CLASSIC SILENT HALF-FIX. Miss this roster and Versions A/B still look perfect while
  // Version C's chat handoff 400s {error:"Invalid tarot params"} — and a 400 falls back to a
  // normal-looking read, so it does not announce itself.
  // 🔴 Still required even though these ship on /fb-tarot/b: the /b path is honoured only because
  // these hooks are outside the v1_tarot_version_bc_2026 scope, and scope.landers is append-only
  // on a running test. The day one of them is enrolled, Version C goes live on it.
  it('the tarot validHooks roster in routes.ts accepts all three (or the chat 400s)', async () => {
    const src = await loadSrc('../server/routes.ts');
    const roster = src.match(/const validHooks = \["cards-honest".*?\];/s);
    expect(roster, 'tarot validHooks roster not found').toBeTruthy();
    for (const h of SOULMATE_RETURN_HOOKS) {
      expect(roster![0], `${h} missing from validHooks — Version-C handoff will 400`).toContain(h);
    }
    // 🔴 …and the incumbent must still be there, or the copy test loses its control.
    expect(roster![0], 'the incumbent fell out of validHooks').toContain(INCUMBENT);
  });

  it('the new angle has a label in the admin experiments dashboard', async () => {
    const src = await loadSrc('../client/src/pages/admin/ExperimentsDashboard.tsx');
    expect(src, 'soulmate-return has no ANGLE_LABELS entry').toMatch(/"soulmate-return":\s*"/);
  });
});
