// Copy guards for the /fb-tarot SOULMATE-AFTER-LOSS hooks (2026-08-07).
//
// Three headlines on the FACE-DOWN return-mhf deck: 'Will I find a new soulmate after
// loss?', 'Is there still a soulmate out there for me?', 'Am I ready to love again after
// losing him?'
//
// Why this angle needs its own guard file, beyond the generic ones:
//
//  1. IT IS THE ONLY FAMILY WHERE THE MAN MAY BE DEAD. Every other angle reads a man who
//     can still, in principle, be asked something — he left, he cooled, he lied, he will
//     not commit. Commissioned off a buyer pull in which ~12-15% of the concerns came from
//     people whose spouse or partner had died (operator brief 2026-08-07), asking FORWARD.
//
//  2. MEDIUMSHIP — the failure mode that exists nowhere else on the funnel. "He is at
//     peace", "he is watching over you", "he would want you to be happy", "he sent you
//     here". Every one of those is the most natural sentence in the world to say to a
//     grieving woman, and every one is contact with the dead: a different product with a
//     different compliance surface. server/lib/universalSafety.ts does NOT catch it — it
//     screens suicidality and distress, not bereavement — so this file is the only thing
//     standing under it. Asserted on the canned reads AND on the generated prompt path.
//
//  3. IT IS NOT self-frame, AND THAT IS A SAFETY CALL RATHER THAN A REPORTING ONE.
//     SELF_FRAME_TAROT_HOOKS (server/lib/prompts.ts) swaps "tendency, never a verdict" for
//     "affirm the hopeful yes with CERTAINTY". That is safe on 'cards-soulmate', where no
//     specific man exists. Aimed at a bereaved partner the same clause promises a
//     replacement, and on 'cards-ready-to-love' it has a stranger certifying that a widow
//     has grieved enough. These run under a THIRD frame (AFTER_LOSS_TAROT_HOOKS) instead.
//     🔴 If a future edit adds them to SELF_FRAME_HOOKS, the reads stay word-for-word the
//     same and the live Version-C prompt quietly loses every guard below. Pinned twice:
//     once on the client roster, once on the generated prompt text.
//
//  4. THREE MORE BANS on top of the standing no-verdict rules: no ARRIVAL (nobody is
//     coming, nobody is "out there right now"); no READINESS VERDICT in either direction
//     ('cards-ready-to-love' asks to be graded, and both answers prescribe a grief
//     timetable); no GRIEF DIRECTIVES or RANKING of the two loves.
//
// 🔴 Negation-aware by construction, as in the honesty, reunion, healing, pulling-away and
// reconciliation guards: correct copy here routinely contains a banned phrase inside a
// refusal ("does not show me somebody walking toward you", "will not grade you ready"), so
// a naive substring ban would fail the very copy it protects.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
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

describe('soulmate-after-loss hooks are wired end to end', () => {
  it('every hook is in the roster, has a headline, and reports angle=soulmate-after-loss', () => {
    expect(SOULMATE_AFTER_LOSS_HOOKS.length).toBe(3);
    for (const h of SOULMATE_AFTER_LOSS_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=soulmate-after-loss`).toBe('soulmate-after-loss');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-new-soulmate']).toBe('Will I find a new soulmate after loss?');
    expect(HEADLINES['cards-soulmate-out-there']).toBe('Is there still a soulmate out there for me?');
    expect(HEADLINES['cards-ready-to-love']).toBe('Am I ready to love again after losing him?');
  });

  // ⭐⭐ THE SAFETY PIN. SELF_FRAME_HOOKS is not a reporting label — it is mirrored by
  // SELF_FRAME_TAROT_HOOKS in server/lib/prompts.ts, which decides which guardrail the
  // live Version-C prompt runs under. Adding these there would swap the no-verdict guard
  // for "affirm with certainty" on a bereaved visitor, with no visible change to any read.
  it('is NOT self-frame — certainty must never be granted over a bereavement', () => {
    for (const h of SOULMATE_AFTER_LOSS_HOOKS) {
      expect(SELF_FRAME_HOOKS, `${h} leaked into SELF_FRAME_HOOKS — it would gain the certainty clause`).not.toContain(h);
      expect(angleForHook(h)).not.toBe('self-frame');
    }
    // And the two live self-frame incumbents stay exactly where they are.
    expect(SELF_FRAME_HOOKS.length).toBe(2);
    expect(angleForHook('cards-soulmate')).toBe('self-frame');
    expect(angleForHook('cards-love-again')).toBe('self-frame');
  });

  it('does not leak into any other family', () => {
    for (const h of SOULMATE_AFTER_LOSS_HOOKS) {
      expect(RECONCILIATION_HOOKS, `${h} leaked into reconciliation`).not.toContain(h);
      expect(REUNION_HOOKS, `${h} leaked into reunion`).not.toContain(h);
      expect(PULLING_AWAY_HOOKS, `${h} leaked into pulling-away`).not.toContain(h);
      expect(HEALING_HOOKS, `${h} leaked into healing`).not.toContain(h);
      expect(COMMITMENT_HOOKS, `${h} leaked into commitment`).not.toContain(h);
    }
  });

  // Standing operator rule: a new headline never replaces an old lander. The self-frame
  // incumbents are live ad set and answer different questions (a first love still waited
  // for; a heartbreak) — these read a bereavement.
  it('reuses no existing hook id and no existing headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    const others = TAROT_HOOKS.filter((h) => !SOULMATE_AFTER_LOSS_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of SOULMATE_AFTER_LOSS_HOOKS) {
      expect(others, `${h} headline collides with an existing lander`).not.toContain(HEADLINES[h]);
    }
  });

  it('leaves every previously shipped family exactly where it was', () => {
    expect(angleForHook('cards-honest')).toBe('decode-him');
    expect(angleForHook('cards-return')).toBe('decode-him');
    expect(angleForHook('cards-misled')).toBe('trust');
    expect(angleForHook('cards-lied-to')).toBe('honesty');
    expect(angleForHook('cards-will-commit')).toBe('commitment');
    expect(angleForHook('cards-come-back')).toBe('reunion');
    expect(angleForHook('cards-cant-stop')).toBe('healing');
    expect(angleForHook('cards-pulling-away')).toBe('pulling-away');
    expect(angleForHook('cards-back-together')).toBe('reconciliation');
  });

  // 🔴 None of the three may ask her about the death, what happened, how long ago, or how
  // she is coping. She should never have to narrate a bereavement to a stranger to be
  // taken seriously — and an opener that asked for it would hand the LLM the raw material
  // for the mediumship failure this whole file exists to prevent.
  it('the opener never asks her to recount the loss', () => {
    for (const h of SOULMATE_AFTER_LOSS_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      expect(q, `${h} opener asks about the death itself`).not.toMatch(/how did he|what happened to him|when did he (die|pass)|how long (ago|has it been)/i);
      expect(q, `${h} opener asks her to narrate her grief`).not.toMatch(/how are you coping|how have you been since|tell me about (him|the loss)/i);
      // Nor may it ask her to justify still wanting love, or to estimate anything.
      expect(q, `${h} opener asks her to justify wanting love`).not.toMatch(/why do you still|is it not too soon|do you think you should/i);
    }
  });

  // Deliberately distinct from 'cards-love-again', whose live opener already gestures at a
  // loss event ("since it happened"). Sharing its wording would collapse the new family
  // into the incumbent from the very first line she reads.
  it('the openers do not reuse the self-frame incumbents wording', () => {
    // Every opener on the funnel opens with the same house stem by design (asserted
    // above), so it is stripped before comparing — otherwise every pair "rhymes".
    const body = (s: string) => s.replace(/^Before I look closer, tell me…\s*/, '');
    for (const h of SOULMATE_AFTER_LOSS_HOOKS) {
      const q = body(openerCStart(DECK, h, 'a')[1]);
      for (const inc of SELF_FRAME_HOOKS) {
        const incQ = body(openerCStart('arcana-mfh', inc, 'a')[1]);
        expect(shared(q, incQ), `${h} opener rhymes with ${inc}`).toEqual([]);
      }
    }
  });

  it('is FACE-DOWN ONLY — not ported to the face-up decks', () => {
    for (const h of SOULMATE_AFTER_LOSS_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — soulmate-after-loss reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = SOULMATE_AFTER_LOSS_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !SOULMATE_AFTER_LOSS_HOOKS.includes(h));

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

  // 🔴 Called out separately. The self-frame incumbents ask an overlapping question ("is
  // there a soulmate for me") and are the live baseline this family will be read against.
  // They live on the FACE-UP decks, so the generic sweep above never reaches them.
  it('beat 3 shares no 6-word run with the live SELF-FRAME incumbents', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of SELF_FRAME_HOOKS) {
      for (const deck of ['arcana-mfh', 'arcana-eef'] as const) {
        const inc = DECKS[deck].reads[oh];
        if (!inc) continue;
        for (const r of shared(reads[nh]![c][2], inc[c][2])) found.push(`${nh}/${c} ~ ${oh}@${deck}/${c}: "${r}"`);
      }
    }
    expect(found, `new family rhymes with the running baseline:\n${found.join('\n')}`).toEqual([]);
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
  // 'nobody', 'no one' and 'cannot' are in the negator set on top of the shared list —
  // the refusals on this angle lean on them heavily ("The Magician stands nobody out
  // there", "a person I cannot see").
  const NEGATOR =
    /\b(no|not|never|can't|unable|without|n't|nor|nobody|no one|none|cannot|rather than|instead of|does not|is not|nothing|refuses|declines?|will not|withholds?|neither)\b/i;
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

  // 🔴🔴 THE ONE THAT MATTERS MOST. Contact with the dead is a different product with a
  // different compliance surface, universalSafety.ts does not screen for it, and every
  // banned phrase below is something a warm psychic persona would reach for unprompted.
  // These are ALWAYS bans — unlike a verdict, there is no correct way to say them, not
  // even inside a refusal, because merely raising "he is at peace" to deny it plants it.
  it('NEVER speaks for the man she lost — no mediumship, in any form', () => {
    const MEDIUM: Array<[RegExp, string]> = [
      [/\bhe (is|would be) (at peace|at rest|in a better place)\b/i, 'mediumship: reports his state'],
      [/\bhe (is|has been) watching (over )?(you|from)\b/i, 'mediumship: contact'],
      [/\bhe (is|would be) proud of you\b/i, 'mediumship: reports his feelings now'],
      [/\bhe would want you to\b/i, 'mediumship: speaks his wishes — the single most tempting line here'],
      [/\bhe would have wanted\b/i, 'mediumship: speaks his wishes'],
      [/\bhe (sent|brought|led) you (here|to)\b/i, 'mediumship: makes him the agent'],
      [/\bhe (is|stays|remains) (with|beside|near) you\b/i, 'mediumship: presence claim'],
      [/\b(his|the) spirit\b/i, 'mediumship: spirit language'],
      [/\bfrom the other side\b/i, 'mediumship'],
      [/\bhe (knows|sees|hears) (you|that|this)\b/i, 'mediumship: reports his awareness'],
      [/\bhis blessing\b/i, 'mediumship: grants permission on his behalf'],
      [/\b(reach|contact|hear from|a message from) him\b/i, 'mediumship: offers contact'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of MEDIUM) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat}"`);
    }
    expect(hits, `MEDIUMSHIP — contact with the dead:\n${hits.join('\n')}`).toEqual([]);
  });

  // The live self-frame incumbent 'cards-soulmate' IS allowed to affirm arrival — nobody
  // has died in that hook. The identical sentence here promises a bereaved partner a
  // replacement, which is the entire reason this family is not self-frame.
  // 🔄 LOOSENED 2026-08-19, operator call. The arrival promise is the desire-affirmation the
  // funnel was BUILT on — the palm formula this deck inherits says it in writing ("affirm the
  // hopeful answer with certainty… 'closer than you think'"). Banning it is what made
  // cards-ready-to-love decline its own headline. It comes back.
  //
  // ⚠️ 'nearer than' STAYS banned, and not as a content rule: it is the live cards-soulmate
  // incumbent's exact landing, and reusing it makes this hook the same lander as that one.
  // Distinctness, not safety. Dates stay banned — a checkable claim is a refund.
  it('never puts a DATE on the arrival, and does not become cards-soulmate', () => {
    const ARRIVAL: Array<[RegExp, string]> = [
      [/\bnearer than\b/i, 'collides with the live cards-soulmate landing'],
    ];
    const ALWAYS: Array<[RegExp, string]> = [
      [/\bwithin (a|the|\d)/i, 'a dated prediction'],
      [/\bin (a few|the next|\d+) (day|week|month|year)/i, 'a dated prediction'],
      [/\bby (the end of|christmas|new year|spring|summer|autumn|winter)\b/i, 'a dated prediction'],
      [/\bI promise\b/i, 'a promise the funnel cannot keep'],
      [/\bnot (much )?long now\b/i, 'a dated prediction in soft clothes'],
    ];
    const hits = sweep(ARRIVAL, ALWAYS);
    expect(hits, `arrival / timeframe:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 cards-ready-to-love asks a stranger to grade her grief. BOTH answers do damage:
  // "you are ready" prescribes a timetable to a bereaved woman, "not yet" does the same
  // wearing concern. Applies across the family — the other two must not slip it in either.
  it('never rules on whether she is READY, in either direction', () => {
    const READINESS: Array<[RegExp, string]> = [
      [/\byou (are|'re) ready\b/i, 'verdict: grades her ready'],
      [/\byou (are|'re) not ready\b/i, 'verdict: grades her unready'],
      [/\byou (have|'ve) (healed|grieved) enough\b/i, 'verdict: grades her grief'],
      [/\bit (is|'s) time (to|for you)\b/i, 'verdict: prescribes a timetable'],
      [/\bit (is|'s) too soon\b/i, 'verdict: prescribes a timetable'],
      [/\byou (are|'re) (still )?(not )?(there|healed) yet\b/i, 'verdict: grades her progress'],
      [/\bwhen you (are|'re) ready you will\b/i, 'forecast dressed as reassurance'],
      [/\byou need (more )?time\b/i, 'verdict: prescribes a timetable'],
    ];
    const hits = sweep(READINESS);
    expect(hits, `readiness verdict:\n${hits.join('\n')}`).toEqual([]);
  });

  it('never hands her a GRIEF DIRECTIVE and never ranks the two loves', () => {
    const BANS: Array<[RegExp, string]> = [
      [/\b(move on|let go of him|let him go|say goodbye|close this chapter)\b/i, 'grief directive'],
      [/\byou (need|have|ought) to (move on|let go|heal|open up|start living)\b/i, 'grief directive'],
      [/\bhonou?r (him|his memory) by\b/i, 'grief directive — and speaks for him'],
      [/\b(he|it) would want\b/i, 'grief directive — and speaks for him'],
      [/\bdon't (stay|remain) stuck\b/i, 'grief directive'],
      [/\b(better|greater|deeper|healthier) than (what you had|he was|the last)\b/i, 'ranks the two loves'],
      [/\byou deserve (better|more) (now|than)\b/i, 'ranks the two loves'],
      [/\b(a|the) (new|next) love will heal\b/i, 'ranks the two loves'],
      [/\b(replace|replacing) him\b/i, 'the fear she arrived with, asserted rather than answered'],
    ];
    const hits = sweep(BANS);
    expect(hits, `grief directive / ranking:\n${hits.join('\n')}`).toEqual([]);
  });

  // Like cards-moved-on, cards-losing-interest and cards-really-over before it, this
  // headline hands over a question whose only two answers are both forbidden. The read
  // must visibly DECLINE it rather than quietly sidestepping — a sidestep reads as evasion.
  it('cards-ready-to-love visibly REFUSES to answer its own headline', () => {
    const refusals = /will not grade|declines?|not going to do it|issues no verdict|no standard|not ready or unready|refuse/i;
    for (const c of CARDS) {
      const beat = reads['cards-ready-to-love']![c][2];
      expect(beat, `cards-ready-to-love/${c} must decline the verdict outright`).toMatch(refusals);
    }
  });

  // The finding that replaces the forbidden verdict. Without it the read has nothing left
  // to give and becomes an evasion — the difference between refusing a verdict and
  // refusing to help.
  it('cards-ready-to-love routes to PERMISSION being hers', () => {
    const joined = CARDS.map((c) => reads['cards-ready-to-love']![c][2]).join(' ').toLowerCase();
    expect(joined).toMatch(/permission|allowed|nobody else|anyone else|only its owner|certain in advance/);
  });

  // Its finding: the fear underneath is not whether such a person exists, but whether
  // loving again would mean replacing him. If this drops out the read becomes a generic
  // "yes there is hope", which is the incumbent lander.
  it('cards-new-soulmate answers the REPLACEMENT fear', () => {
    const joined = CARDS.map((c) => reads['cards-new-soulmate']![c][2]).join(' ').toLowerCase();
    expect(joined).toMatch(/replac|disloyal|overwrite|seat left empty|debt against/);
  });

  // Its finding: the word 'still'. She is asking whether she was issued one chance and
  // already spent it — the read answers that premise, never a location or a forecast.
  it('cards-soulmate-out-there answers the PREMISE, not the whereabouts', () => {
    const joined = CARDS.map((c) => reads['cards-soulmate-out-there']![c][2]).join(' ').toLowerCase();
    expect(joined).toMatch(/premise|used it up|runs down|running down|empties|unwalked|closed off/);
  });
});

// The server-side prompt path is a DIFFERENT surface from the canned 4-beat reads: the
// Version-C reflect call reads her typed answer and generates fresh text, steered by these
// maps and by the frame branch. A hook missing from any of them silently falls back to a
// guard that bans none of the things that matter here.
describe('server prompt path carries the after-loss frame', () => {
  const loadSrc = (rel: string) =>
    import('node:fs').then((fs) => fs.promises.readFile(new URL(rel, import.meta.url), 'utf8'));

  it('every hook has its own context and tendency entry', async () => {
    const src = await loadSrc('../server/lib/prompts.ts');
    for (const h of SOULMATE_AFTER_LOSS_HOOKS) {
      const occurrences = src.split(`'${h}'`).length - 1;
      expect(occurrences, `${h} must appear in BOTH prompt maps and the after-loss set`).toBeGreaterThanOrEqual(3);
    }
  });

  // 🔴 AFTER_LOSS_TAROT_HOOKS is hand-mirrored against SOULMATE_AFTER_LOSS_HOOKS. Drift is
  // a SAFETY defect, not a copy defect: a hook missing from the server set falls through to
  // the decode-him guard, which says nothing about mediumship, arrival or readiness.
  it('the server after-loss set mirrors the client roster exactly', async () => {
    const src = await loadSrc('../server/lib/prompts.ts');
    const block = src.match(/const AFTER_LOSS_TAROT_HOOKS = new Set\(\[(.*?)\]\)/s);
    expect(block, 'AFTER_LOSS_TAROT_HOOKS not found in prompts.ts').toBeTruthy();
    for (const h of SOULMATE_AFTER_LOSS_HOOKS) {
      expect(block![1], `${h} missing from AFTER_LOSS_TAROT_HOOKS — it would run under the decode-him guard`).toContain(h);
    }
    // And it must not have quietly absorbed the live self-frame incumbents. Matched WITH
    // the surrounding quotes: bare 'cards-soulmate' is a substring of the new
    // 'cards-soulmate-out-there' and would false-positive on correct code.
    for (const h of SELF_FRAME_HOOKS) {
      expect(block![1], `${h} must stay in SELF_FRAME_TAROT_HOOKS`).not.toContain(`'${h}'`);
    }
  });

  // The generated path must be checked BEHAVIOURALLY, not by grepping the map: the guard
  // only reaches the model if the frame branch actually selects it.
  it('the generated Version-C prompt carries the mediumship ban, not the certainty clause', async () => {
    const { buildTarotReflectPrompt } = await import('../server/lib/prompts');
    const userData = {
      firstName: 'Test', email: null, bucket: null, subBucket: null, personName: null,
      concern: null, desires: null, location: null, timeOfDay: null, objectionCount: 0,
    } as Parameters<typeof buildTarotReflectPrompt>[0];

    for (const h of SOULMATE_AFTER_LOSS_HOOKS) {
      const p = buildTarotReflectPrompt(userData, DECK, h, 'a', 'I lost my husband last year.');
      expect(p, `${h} must carry the mediumship ban`).toMatch(/NEVER SPEAK FOR THE PERSON SHE LOST/);
      expect(p, `${h} must ban contact with the dead`).toMatch(/contact with the dead/i);
      expect(p, `${h} must refuse the readiness verdict`).toMatch(/never rule on whether she is ready/i);
      // 🔴 The self-frame certainty clause must NOT appear — it is what makes this unsafe.
      expect(p, `${h} picked up the SELF-FRAME certainty clause`).not.toMatch(/Affirm the hopeful yes with warmth and certainty/);
    }

    // Control: the live incumbents keep the certainty clause they were signed off with.
    const inc = buildTarotReflectPrompt(userData, 'arcana-mfh', 'cards-soulmate', 'a', 'still waiting');
    expect(inc, 'cards-soulmate must keep its self-frame guard').toMatch(/Affirm the hopeful yes with warmth and certainty/);
    expect(inc, 'cards-soulmate must not have gained the after-loss guard').not.toMatch(/NEVER SPEAK FOR THE PERSON SHE LOST/);
  });

  it('the tarot validHooks roster in routes.ts accepts all three (or the chat 400s)', async () => {
    const src = await loadSrc('../server/routes.ts');
    const roster = src.match(/const validHooks = \["cards-honest".*?\];/s);
    expect(roster, 'tarot validHooks roster not found').toBeTruthy();
    for (const h of SOULMATE_AFTER_LOSS_HOOKS) {
      expect(roster![0], `${h} missing from validHooks — Version-C handoff will 400`).toContain(h);
    }
  });
});
