// Copy guards for the /fb-tarot SEARCHING hooks (2026-08-11).
//
// Three headlines on the FACE-DOWN return-mhf deck: 'Am I ever going to stop searching?',
// 'Why do I keep ending up alone?', 'Have I given up on love without realizing it?'
//
// This is BATCH TWO of the "Loneliness/Timing" brief. Batch one shipped 2026-08-07 as
// LONELINESS_HOOKS, and the note on that array records that none of its three turned out
// to be about timing. These are: the subject is the DURATION and the EFFORT of looking.
//
// Why this family needs its own guard file on top of the loneliness one:
//
//  1. 🔴🔴 THE CAUSE REQUEST — 'cards-end-up-alone' is the first headline on the funnel to
//     ask WHY about her own life. Every loneliness guard refuses a *whether* ("will I be
//     alone", "am I meant to be"); none refuses a *why*. And the dangerous answers here are
//     not the crude ones that file already bans (defeatist, closed off, self-sabotaging) —
//     they are the KIND, FLUENT ones that dodge every banned word while still handing a
//     woman a diagnosis of her life: "you give to people who cannot receive it", "you have
//     never been met at your level", "the timing has never been yours". Those are verdicts
//     wearing sympathy, and they are what a warm psychic voice produces by default.
//
//  2. 🔴🔴 THE MIND-READING PREMISE — 'cards-given-up' asks whether she has closed
//     "without realizing it", which invites Evelyn to claim better access to her interior
//     than she has. Nothing anywhere bans that. She is the only authority on her own mind.
//     Both answers are also harmful: "yes you have" is the sentence cards-alone-forever
//     already bans outright, and "no you have not" is the reassurance she came here having
//     exhausted — so the binary is refused rather than answered.
//
//  3. THE PROVERB — 'cards-stop-searching' invites the single most common answer to its
//     own question anywhere: "it happens when you stop looking". That is a tactic and a
//     fault attribution in one sentence, and she has heard it from everyone already.
//
//  4. ⚠ SEPARATE ANGLE, SHARED FRAME. angleForHook reports 'searching' so batch two can be
//     read against batch one — but the SAFETY frame is loneliness's (these hooks are in
//     LONELINESS_TAROT_HOOKS in server/lib/prompts.ts). That split is deliberate and is
//     asserted below in both directions: the angle must NOT be 'loneliness', and the hooks
//     must NOT leak into LONELINESS_HOOKS.
//
//  5. ⚠ AUDIENCE-AGNOSTIC, inherited from batch one. None of the three headlines mentions
//     an ex, a loss or a breakup — 'cards-end-up-alone' comes closest by implying repeated
//     endings, but "keep ending up" is her framing and must not be confirmed as fact. The
//     reads may never presume she has had love before AND never presume she has not.
//
// 🔴 Negation-aware by construction, as in every sibling guard: correct copy here routinely
// contains a banned phrase inside a refusal ("I am not going to hand you a reason", "never
// say she has given up"), so a naive substring ban would fail the very copy it protects.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  SEARCHING_HOOKS,
  LONELINESS_HOOKS,
  SOULMATE_WHERE_HOOKS,
  SOULMATE_AFTER_LOSS_HOOKS,
  SELF_FRAME_HOOKS,
  WHY_HE_LEFT_HOOKS,
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

describe('searching hooks are wired end to end', () => {
  it('every hook is in the roster, has a headline, and reports angle=searching', () => {
    expect(SEARCHING_HOOKS.length).toBe(3);
    for (const h of SEARCHING_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=searching`).toBe('searching');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-stop-searching']).toBe('Am I ever going to stop searching?');
    expect(HEADLINES['cards-end-up-alone']).toBe('Why do I keep ending up alone?');
    expect(HEADLINES['cards-given-up']).toBe('Have I given up on love without realizing it?');
  });

  // ⭐⭐ THE REPORTING PIN. Batch two exists to be compared against batch one. Fold these
  // into LONELINESS_HOOKS and that comparison disappears inside numbers running since 8/07.
  it('is a SEPARATE angle from loneliness — batch two must stay readable against batch one', () => {
    for (const h of SEARCHING_HOOKS) {
      expect(LONELINESS_HOOKS, `${h} leaked into LONELINESS_HOOKS — batch one/two comparison lost`).not.toContain(h);
      expect(angleForHook(h)).not.toBe('loneliness');
    }
    expect(LONELINESS_HOOKS.length).toBe(3);
    expect(angleForHook('cards-alone-forever')).toBe('loneliness');
  });

  // ⭐⭐ THE SAFETY PIN, and it is the counterpart of the one above. The angle is separate;
  // the FRAME is not. No man exists in these hooks, so self-frame is the obvious filing and
  // its "affirm with CERTAINTY" clause is precisely the harm — the same call loneliness was
  // created to get right.
  it('is NOT self-frame — certainty about her own solitude is the harm itself', () => {
    for (const h of SEARCHING_HOOKS) {
      expect(SELF_FRAME_HOOKS, `${h} leaked into SELF_FRAME_HOOKS — it would gain the certainty clause`).not.toContain(h);
      expect(angleForHook(h)).not.toBe('self-frame');
    }
    expect(SELF_FRAME_HOOKS.length).toBe(2);
  });

  it('does not leak into any other family', () => {
    for (const h of SEARCHING_HOOKS) {
      expect(SOULMATE_WHERE_HOOKS, `${h} leaked into soulmate-where`).not.toContain(h);
      expect(SOULMATE_AFTER_LOSS_HOOKS, `${h} leaked into soulmate-after-loss`).not.toContain(h);
      expect(WHY_HE_LEFT_HOOKS, `${h} leaked into why-he-left`).not.toContain(h);
    }
  });

  it('reuses no existing hook id and no existing headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    const others = TAROT_HOOKS.filter((h) => !SEARCHING_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of SEARCHING_HOOKS) {
      expect(others, `${h} headline collides with an existing lander`).not.toContain(HEADLINES[h]);
    }
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
    expect(angleForHook('cards-ghosted')).toBe('why-he-left');
    expect(angleForHook('cards-love-again')).toBe('self-frame');
  });

  // Inherited from batch one: this angle sits near the crisis surface, so an opener must
  // ask her to THINK rather than to narrate the pain. 🔴 Plus one of its own — none of the
  // three may ask her to ACCOUNT for the outcome, because whatever she types then stands in
  // the transcript as the premise for everything Evelyn says next.
  it('the openers neither manufacture despair nor invite self-indictment', () => {
    for (const h of SEARCHING_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      expect(q, `${h} opener digs at the pain directly`).not.toMatch(/how (lonely|alone|bad) (do|does)|what does (the|it) (loneliness|emptiness)|how much does it hurt/i);
      expect(q, `${h} opener invites a despair narrative`).not.toMatch(/what do you tell yourself (at night|when)|how do you cope|worst part|darkest/i);
      // 🔴 The novel one: never ask her to explain the outcome.
      expect(q, `${h} opener asks her to indict herself`).not.toMatch(/why do you think|what do you think (is|went) wrong|what keeps happening|what is it about you/i);
      expect(q, `${h} opener presumes her history`).not.toMatch(/have you ever been|your last relationship|since (he|your ex)|after (he|your)/i);
    }
  });

  it('is FACE-DOWN ONLY — not ported to the face-up decks', () => {
    for (const h of SEARCHING_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — searching reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = SEARCHING_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !SEARCHING_HOOKS.includes(h));

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

  it('beat 4 keeps the open loop into chat', () => {
    for (const h of present) for (const c of CARDS) {
      expect(reads[h]![c][3], `${h}/${c} beat 4`).toMatch(/^Let me look closer at .*…$/);
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

  // 🔴🔴 THE ONE WITH NO PRECEDENT ON THE FUNNEL. 'cards-end-up-alone' asks for a CAUSE.
  // The crude answers are already banned by the loneliness frame; these are the kind ones,
  // which is what a warm psychic voice reaches for and what would actually ship.
  it('NEVER supplies a CAUSE for her being alone — including the sympathetic ones', () => {
    const CAUSE: Array<[RegExp, string]> = [
      [/\byou (give|love|care) too much\b/i, 'kind diagnosis'],
      [/\byou (keep )?(give|giving) to (people|men|those) who (cannot|can't|do not|don't)\b/i, 'kind diagnosis'],
      [/\byou have never been met\b/i, 'kind diagnosis'],
      [/\byou (are|were) too (much|strong|independent|intense)\b/i, 'kind diagnosis dressed as a compliment'],
      [/\byour (standards|strength|independence) (is|are|intimidate)\b/i, 'kind diagnosis'],
      [/\byou (keep )?(choose|choosing|pick|picking) (the wrong|men who|people who)\b/i, 'blames her selection'],
      [/\bthe timing has never been\b/i, 'a cause asserted as fact'],
      [/\byou (are|were) (guarded|closed|walled)\b/i, 'diagnosis'],
      [/\byou (have|need) (walls|barriers|a wall)\b/i, 'diagnosis'],
      [/\byou (are|were) the (reason|cause|problem|common)\b/i, 'rules that she is the cause'],
      [/\bit (is|was) because you\b/i, 'supplies a reason'],
      [/\bthe reason (is|was) (you|that you)\b/i, 'supplies a reason'],
      [/\byou (have not|haven't) healed\b/i, 'prerequisite framing'],
      [/\buntil you (love|heal|fix|work on) yourself\b/i, 'prerequisite framing'],
    ];
    const hits = sweep(CAUSE);
    expect(hits, `a CAUSE was supplied:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 THE SECOND WITH NO PRECEDENT. 'cards-given-up' hands Evelyn the premise that
  // something is true of her that she cannot see. She is the only authority on her interior.
  it('NEVER claims to see inside her, and never rules on whether she has given up', () => {
    const MIND: Array<[RegExp, string]> = [
      [/\byou (have|'ve) given up\b/i, 'rules on the headline — the banned direction'],
      [/\byou (have|'ve) (closed|shut) (off|down|yourself)\b/i, 'rules on her interior'],
      [/\byou (are|'re) (jaded|bitter|cynical|hardened|numb)\b/i, 'character verdict'],
      [/\bwhat you (really|secretly|truly) (feel|believe|want|think)\b/i, 'claims access she did not give'],
      [/\bdeep down you\b/i, 'claims access she did not give'],
      [/\bpart of you (has|knows|believes|wants)\b/i, 'narrates her interior as fact'],
      [/\byou do not (even )?(realise|realize|know) (it|that)\b/i, 'the headline premise, asserted'],
      [/\bwithout (you )?(realising|realizing) it,? you\b/i, 'the headline premise, asserted'],
      [/\byou (are|'re) still open\b/i, 'the reassurance direction — equally a ruling'],
      [/\byour heart is (still )?(open|closed)\b/i, 'rules on her interior either way'],
    ];
    const hits = sweep(MIND);
    expect(hits, `claimed to see inside her:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 The proverb, which is a tactic and a fault attribution in one sentence.
  it('NEVER hands her the "stop looking" proverb, or any other tactic', () => {
    const TACTIC: Array<[RegExp, string]> = [
      [/\bwhen you stop (looking|searching|trying)\b/i, 'the proverb: tactic + her fault'],
      [/\bleast expect it\b/i, 'the proverb'],
      [/\bstop (looking|searching)\b/i, 'tactic'],
      [/\b(take|have) a break from (dating|looking)\b/i, 'tactic'],
      [/\bput yourself out there\b/i, 'tactic'],
      [/\b(get|go) out (there )?more\b/i, 'tactic'],
      [/\b(work on|heal|love|fix) yourself first\b/i, 'tactic + her fault'],
      [/\bbe (more )?(open|vulnerable)\b/i, 'tactic'],
      [/\bonce you (are|'re) happy on your own\b/i, 'prerequisite + her fault'],
    ];
    const hits = sweep(TACTIC);
    expect(hits, `handed her a tactic:\n${hits.join('\n')}`).toEqual([]);
  });

  // Inherited from the shared loneliness frame — these hooks run under it, so the same
  // bans must hold in the reads that introduce her to it.
  // 🔄 LOOSENED 2026-08-19 in step with the loneliness family it inherits from. Fate language
  // in the hopeful direction and the arrival promise are both back. What stays: the life
  // sentence, suffering-made-purposeful, and every form of pathologising her — the last of
  // which is not a prediction rule at all and is the reason this family exists.
  it('inherits the loneliness bans: no life sentence, no purposeful suffering, no pathologising', () => {
    const INHERITED: Array<[RegExp, string]> = [
      [/\byou (are|were) meant to be alone\b/i, 'fate: the most harmful sentence available'],
      [/\bsome people are meant to be alone\b/i, 'fate: generalised designation'],
      [/\b(this|it) is (a lesson|a test|preparing you|teaching you)\b/i, 'fate: makes her suffering purposeful'],
      [/\byou will (be|end up|remain|stay) alone\b/i, 'verdict: a life sentence from a stranger'],
      [/\byou attract what you\b/i, 'pathologising — the manifesting version'],
      [/\byour (energy|vibration|mindset) is\b/i, 'pathologising'],
      [/\bstay positive\b/i, 'the reassurance she has already exhausted'],
      [/\btrust the universe\b/i, 'the reassurance she has already exhausted'],
    ];
    const ALWAYS: Array<[RegExp, string]> = [
      [/\bwithin (a|the|\d)/i, 'timeframe'],
      [/\bin (a few|the next|\d+) (day|week|month|year)/i, 'timeframe'],
      [/\bsoon\b/i, 'timeframe'],
      [/\bit will happen when you\b/i, 'timeframe + strategy'],
      [/\bI promise\b/i, 'a promise the funnel cannot keep'],
    ];
    const hits = sweep(INHERITED, ALWAYS);
    expect(hits, `broke an inherited loneliness ban:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⚠ Audience-agnostic: two of the three headlines are compatible with a woman who has
  // never had a relationship AND one who has had several. Neither may be presumed.
  it('presumes nothing about whether she has had love before', () => {
    const PRESUME: Array<[RegExp, string]> = [
      [/\bafter (everything|all) (you|that) (have|'ve) been through\b/i, 'presumes a history'],
      [/\byour (ex|last relationship|marriage|divorce)\b/i, 'presumes a history'],
      [/\bsince (he|they) left\b/i, 'presumes a history'],
      [/\byou have never (had|been in) (love|a relationship)\b/i, 'presumes the absence of one'],
      [/\byou have never been loved\b/i, 'presumes the absence of one'],
    ];
    const hits = sweep(PRESUME);
    expect(hits, `presumed her history:\n${hits.join('\n')}`).toEqual([]);
  });

  it('carries no price, urgency, emoji or exclamation', () => {
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      expect(beat, `${h}/${c} exclamation`).not.toMatch(/!/);
      expect(beat, `${h}/${c} price`).not.toMatch(/\$|\bpay\b|\bprice\b|\boffer\b/i);
      expect(beat, `${h}/${c} urgency`).not.toMatch(/\b(hurry|today only|limited|act now|expires)\b/i);
      expect(beat, `${h}/${c} emoji`).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });
});
