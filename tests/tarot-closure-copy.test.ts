// Copy guards for the /fb-tarot CLOSURE hooks (2026-08-18).
//
// THREE landers on the FACE-DOWN return-mhf deck. Operator category: "Healing/Moving-on" ·
// topic: "Closure / healing". Angle named for what the landers ASK.
//
// ⭐⭐ THE ORGAN, and it is visible in the headlines themselves: HE IS NOT IN THEM. Every
// `healing` and `missing-him` headline names him or the relationship; none of these three does.
//   · healing      reads the THINKING — her mind keeps presenting him to her.
//   · missing-him  reads the ACHE OF HIS ABSENCE — the place where he was still hurts.
//   · closure      reads HER OWN RECOVERY AS A PROJECT SHE BELIEVES SHE IS FAILING AT.
// Keeping the three apart is the only thing that keeps any of their numbers readable, which is
// why the family gets its own angle rather than being folded into HEALING_HOOKS.
//
// 🔴🔴 THE DEFINING BAN IS THE "EVER", and it is harder than the timeframe ban it grew out of,
// because BOTH answers are unusable:
//   · "yes, you will heal"  — a forecast about the inside of a person. If she is still hurting
//                             later, we have handed her evidence that she is failing.
//   · "no"                  — cruel, and equally invented.
//   · "you will, in time"   — the one that tries hardest to sneak in. A timeframe in disguise.
// No schedule, no stages of grief (this family's runner script — a borrowed framework telling
// her where she ought to be by now), no "you'll know when".
//
// 🔴🔴 'cards-feel-like-myself' IS THE CLOSEST THIS FUNNEL COMES TO DEPRESSION LANGUAGE. Never
// diagnose, never imply she needs fixing or professional help, never manufacture despair.
//
// ⭐⭐ WHY EVERY GUARD HERE IS LOAD-BEARING: these landers ship on /fb-tarot/b, and Version B
// makes NO model call. The static read below IS the entire reading she receives — there is no
// reflect prompt downstream to hold the line, and universalSafety only inspects HER messages.
// Nothing here may rely on prompts.ts to catch it.
//
// 🔴 Negation-aware by construction: correct copy here is refusal-heavy and routinely names a
// banned idea inside its own refusal ("not half the length of the relationship"), so a naive
// substring ban would fail the copy it protects. The sweep is CLAUSE-level with a NEGATOR
// exemption; RAW_BANS is the deliberate exception — those may never appear in any form.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  CLOSURE_HOOKS,
  HEALING_HOOKS,
  MISSING_HIM_HOOKS,
  SELF_FRAME_HOOKS,
  LONELINESS_HOOKS,
  STILL_FEELS_HOOKS,
  SOULMATE_LABEL_HOOKS,
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

const reads = DECKS[DECK].reads;
const present = CLOSURE_HOOKS.filter((h) => reads[h]);
const existing = (TAROT_HOOKS as string[]).filter(
  (h) => reads[h as never] && !(CLOSURE_HOOKS as string[]).includes(h),
) as never[];

describe('closure hooks are wired end to end', () => {
  it('all three are in the roster, have headlines, and report angle=closure', () => {
    expect(CLOSURE_HOOKS.length).toBe(3);
    for (const h of CLOSURE_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=closure`).toBe('closure');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-find-closure']).toBe('Will I ever find closure?');
    expect(HEADLINES['cards-heart-heal']).toBe('Will my heart ever heal?');
    expect(HEADLINES['cards-feel-like-myself']).toBe('Am I ever going to feel like myself again?');
  });

  // ⭐⭐ THE FAMILY-SEPARATION GUARD. `healing` and `missing-him` are the two nearest neighbours
  // and both keep a man in the frame. Folding any of these in would retroactively mix two
  // questions inside one set of running numbers.
  it('HEALING_HOOKS and MISSING_HIM_HOOKS stay exactly where they were', () => {
    expect(HEALING_HOOKS).toEqual(['cards-cant-stop', 'cards-on-my-mind', 'cards-who-hurt-me']);
    expect(MISSING_HIM_HOOKS).toEqual([
      'cards-stop-hurting',
      'cards-stop-missing',
      'cards-still-miss-him',
    ]);
    for (const h of CLOSURE_HOOKS) {
      expect(HEALING_HOOKS, `${h} was folded into healing`).not.toContain(h);
      expect(MISSING_HIM_HOOKS, `${h} was folded into missing-him`).not.toContain(h);
      expect(angleForHook(h)).toBe('closure');
    }
    expect(angleForHook('cards-cant-stop')).toBe('healing');
    expect(angleForHook('cards-stop-hurting')).toBe('missing-him');
  });

  // 🔴 NOT self-frame, though all three are phrased about her. Self-frame instructs "affirm the
  // hopeful yes", and here that yes IS the family's central banned move.
  it('is NOT folded into self-frame or any neighbouring family', () => {
    for (const h of CLOSURE_HOOKS) {
      expect(SELF_FRAME_HOOKS, `${h} leaked into SELF_FRAME_HOOKS`).not.toContain(h);
      expect(LONELINESS_HOOKS, `${h} leaked into LONELINESS_HOOKS`).not.toContain(h);
      expect(STILL_FEELS_HOOKS, `${h} leaked into STILL_FEELS_HOOKS`).not.toContain(h);
      expect(SOULMATE_LABEL_HOOKS, `${h} leaked into soulmate-label`).not.toContain(h);
    }
    expect(SELF_FRAME_HOOKS).toEqual(['cards-love-again', 'cards-soulmate']);
  });

  it('reuses no existing hook id, and adds no duplicate headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    for (const h of CLOSURE_HOOKS) {
      const others = (TAROT_HOOKS as string[])
        .filter((x) => x !== h)
        .map((x) => HEADLINES[x as never]);
      expect(others, `${h} headline duplicates an existing lander`).not.toContain(HEADLINES[h]);
    }
  });

  // ⭐⭐ A PostHog "contains" filter would double-count a slug that is a substring of another.
  it('no new slug is a substring of an existing one, or vice versa', () => {
    const clashes: string[] = [];
    for (const h of CLOSURE_HOOKS) {
      for (const o of TAROT_HOOKS as string[]) {
        if (o === h) continue;
        if (o.includes(h) || h.includes(o)) clashes.push(`${h} <-> ${o}`);
      }
    }
    expect(clashes, `slug collision:\n${clashes.join('\n')}`).toEqual([]);
  });

  it('the openers ask for the STANDARD, never the calendar and never a self-rating', () => {
    for (const h of CLOSURE_HOOKS) {
      const [, q] = openerCStart(DECK, h, 'a');
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      // 🔴🔴 asking how long hands her the measuring stick the read then takes away
      expect(q, `${h} opener asks for the calendar`).not.toMatch(
        /how long|how many (days|weeks|months|years)|when did|since when/i,
      );
      // 🔴 asking her to rate her progress IS the harm the reads name
      expect(q, `${h} opener asks her to rate her own progress`).not.toMatch(
        /how are you (coping|doing|holding)|how far along|are you (over|better)/i,
      );
      expect(q, `${h} opener diagnoses her`).not.toMatch(/depress|grief|trauma|therapy|healing process/i);
    }
  });

  it('is FACE-DOWN ONLY — not ported to the face-up decks', () => {
    for (const h of CLOSURE_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} ported to face-up without a decision`).toBeUndefined();
      expect(DECKS['arcana-eef'].reads[h], `${h} ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — closure reads`, () => {
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

  // ⭐⭐ Beat 3 IS the whole reading on Version B. A thin one is a broken lander, not a terse one.
  // ⭐ RESHAPED for the Natural Tarot-Cut (2026-08-19). Beat 3 used to be one long bubble
  // and the floor was a character count. It is now FOUR short bubbles joined by newlines,
  // which openerB serves as separate messages — so the thing worth pinning is that the cut
  // happened and that the read still carries a finding, not that the string is long.
  it('beat 3 is cut into bubbles and still carries the whole reading', () => {
    for (const h of present) for (const c of CARDS) {
      const cuts = reads[h]![c][2].split('\n');
      expect(cuts.length, `${h}/${c} beat 3 was never cut into bubbles`).toBeGreaterThanOrEqual(3);
      expect(reads[h]![c][2].length, `${h}/${c} beat 3 is too thin to be the whole reading`).toBeGreaterThan(200);
      for (const cut of cuts) expect(cut.trim().length, `${h}/${c} has an empty bubble`).toBeGreaterThan(15);
    }
  });

  // ⭐ RESHAPED 2026-08-19: openerB now splits every beat on newlines, so the cut beat 3
  // arrives as its own run of messages and the total is no longer 5.
  it('the openerB sequence opens on the card, keeps the loop, and ends on name capture', () => {
    for (const h of present) for (const c of CARDS) {
      const msgs = openerB(DECK, h, c);
      expect(msgs.length, `${h}/${c} openerB is too short to be a read`).toBeGreaterThanOrEqual(7);
      expect(msgs[0], `${h}/${c} must open on the card`).toMatch(/^You turned /);
      expect(msgs[msgs.length - 2], `${h}/${c} must keep the open loop`).toMatch(/^Let me look closer at .*…$/);
      expect(msgs[msgs.length - 1]).toMatch(/what's your first name, dear\?$/);
    }
  });

  it('the /b chat URL parses on the default deck', () => {
    for (const h of CLOSURE_HOOKS) {
      const parsed = parseTarotParams(`?hook=${h}&card=a&v=b`);
      expect(parsed, `${h} did not parse — she would fall into the generic funnel`).toBeTruthy();
      expect(parsed!.hook).toBe(h);
      expect(parsed!.deck).toBe(DECK);
      expect(parsed!.version).toBe('b');
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
    for (const h of Object.keys(reads) as never[]) for (const c of CARDS) {
      const b1 = reads[h]![c][0];
      if (seen.has(b1)) dupes.push(`${h}/${c} == ${seen.get(b1)}`);
      else seen.set(b1, `${h}/${c}`);
    }
    expect(dupes, dupes.join('\n')).toEqual([]);
  });
});

describe(`${DECK} — closure bans`, () => {
  const NEGATOR =
    /\b(no|not|never|n't|nor|nobody|no one|none|cannot|rather than|instead of|does not|is not|nothing|refuses?|declines?|will not|would not|withholds?|neither|without|inventing|invent|pretend|flattery|would be|no such)\b/i;
  const clausesOf = (s: string) => s.split(/[—;:,.]/);
  // Restating HER question is not asserting its answer.
  const RESTATES = /\byou (asked|came asking|are asking|have (asked|described|been)|came for|came looking)\b/i;

  const sweep = (bans: Array<[RegExp, string]>, always: Array<[RegExp, string]> = []) => {
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of always) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat}"`);
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause) || RESTATES.test(clause)) continue;
        for (const [re, why] of bans) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    return hits;
  };

  // 🔴🔴 BAN #1 — the family's central refusal, and it runs in BOTH directions.
  it('NEVER answers the "ever" — not that it comes, not that it does not', () => {
    const EVER: Array<[RegExp, string]> = [
      [/\byou will (heal|mend|be fine|feel better|get over|recover)\b/i, 'forecasts her recovery'],
      [/\byour heart will (heal|mend)\b/i, 'forecasts her recovery'],
      [/\b(closure|it) will come\b/i, 'promises the ending arrives'],
      [/\byou will (find|get) closure\b/i, 'promises the ending arrives'],
      [/\byou will (feel like yourself|be yourself) again\b/i, 'promises the return'],
      [/\byou will never (heal|mend|feel better|be the same)\b/i, 'issues the burial'],
      [/\bshe is gone\b|\bthat version of you is gone\b/i, 'issues the burial'],
      [/\bthis will never (end|stop|pass)\b/i, 'issues the burial'],
    ];
    const hits = sweep(EVER);
    expect(hits, `answered the "ever":\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN #2 — the timeframe, including its softened disguises. This is the discipline the
  // family inherits from missing-him, sharpened: "in time" is a schedule with the number removed.
  it('NEVER gives a timetable, a stage, or a softened "in time"', () => {
    const TIME: Array<[RegExp, string]> = [
      [/\b(a few|several|couple of|two|three|six|twelve|\d+)\s+(days?|weeks?|months?|years?)\b/i, 'names a duration'],
      [/\bit takes\b[^.]*\b(days?|weeks?|months?|years?)\b/i, 'names a duration'],
      [/\bhalf the length of\b/i, 'the borrowed timetable'],
      [/\bin time\b|\beventually\b|\bone day you will\b|\bsooner than you think\b/i, 'a timeframe in disguise'],
      [/\bstages? of grief\b|\bfirst stage\b|\bacceptance stage\b|\bthe stages\b/i, 'the grief-stages script'],
      [/\byou'?ll know when\b|\byou will know when\b/i, 'the when-dodge'],
      [/\bthese things take time\b|\btime heals\b/i, 'the platitude schedule'],
    ];
    const hits = sweep(TIME);
    expect(hits, `handed her a timetable:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN #3 — the crisis-adjacent one. 'cards-feel-like-myself' invites it hardest.
  it('NEVER diagnoses her, pathologises her, or prescribes help', () => {
    const CLINICAL: Array<[RegExp, string]> = [
      [/\byou (are|sound|seem) (depressed|traumatised|traumatized|unwell|ill)\b/i, 'diagnoses'],
      [/\byou (are|will be) (stuck|broken|damaged|obsessed|fixated)\b/i, 'pathologises'],
      [/\byou need (help|therapy|counselling|counseling|to see someone|support)\b/i, 'prescribes'],
      [/\byou should (speak to|see) (a|someone|your)\b/i, 'prescribes'],
      [/\bsomething is wrong with you\b/i, 'pathologises'],
      [/\byour (grief|depression|breakdown)\b/i, 'names a condition as hers'],
    ];
    const hits = sweep(CLINICAL);
    expect(hits, `treated her as a patient:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN #4 — he is not in this family. Do not supply him.
  it('NEVER supplies him, reads his intentions, or makes her recovery conditional on him', () => {
    const HIM: Array<[RegExp, string]> = [
      [/\bhe (still )?(loves|misses|thinks about|regrets)\b/i, 'narrates his interior'],
      [/\bhe (will|is going to) (come back|return|reach out|apologise|apologize)\b/i, 'forecasts him'],
      [/\bonce he\b|\bwhen he (finally|does)\b/i, 'makes her recovery conditional on him'],
      [/\bhis silence means\b|\bhis absence means\b/i, 'reads his silence'],
    ];
    const hits = sweep(HIM);
    expect(hits, `supplied him:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN #5 — no tactic, no instruction, no homework. Advice is what the funnel does not sell,
  // and here it lands as "you are not recovering correctly".
  it('NEVER hands her a tactic, an instruction, or work she must do first', () => {
    const TACTIC: Array<[RegExp, string]> = [
      [/\byou (need|have) to (let (him|it) go|move on|forgive|accept)\b/i, 'directive'],
      [/\bit('s| is) time to (let (him|it) go|move on)\b/i, 'directive'],
      [/\byou should (write|call|text|contact|confront|block)\b/i, 'a tactic'],
      [/\bonce you (heal|let go|move on|forgive|accept)\b/i, 'conditional on her work'],
      [/\bwork on yourself\b|\bdo the work\b|\bself.?care\b/i, 'homework'],
    ];
    const hits = sweep(TACTIC);
    expect(hits, `handed her an instruction:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 RAW BANS — may never appear in ANY form, including inside a refusal, because the phrase
  // itself does the damage on the page regardless of the sentence around it.
  it('carries none of the raw-banned phrases in any form', () => {
    const RAW: Array<[RegExp, string]> = [
      [/\bclosure is a myth\b/i, 'nihilism dressed as insight'],
      [/\btime heals all\b/i, 'the platitude'],
      [/\bevery.?thing happens for a reason\b/i, 'the platitude'],
      [/\bwhat doesn'?t kill you\b/i, 'the platitude'],
      [/\bmoving on\b(?=[^.]*\byou\b)/i, 'the instruction in noun form'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of RAW) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat}"`);
    }
    expect(hits, `raw-banned phrase present:\n${hits.join('\n')}`).toEqual([]);
  });

  it('no dates, no exclamation marks, no emoji, no price or urgency', () => {
    const ALWAYS: Array<[RegExp, string]> = [
      [/!/, 'exclamation mark'],
      [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'emoji'],
      [/\$\d|\bprice\b|\bdiscount\b|\boffer\b|\bhurry\b|\blimited time\b/i, 'price or urgency'],
      [/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i, 'a date'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of ALWAYS) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat}"`);
    }
    expect(hits, `house rule broken:\n${hits.join('\n')}`).toEqual([]);
  });

  // ⭐⭐ THE PAYOUT, pinned as a REQUIREMENT rather than a ban. A family that only refuses gives
  // her nothing and the lander dies — and this family refuses more than any other, so the payout
  // has to be checked rather than assumed.
  it('every hook still LANDS something — refusal alone abandons her', () => {
    const PAYOUT: Record<string, RegExp> = {
      'cards-find-closure':
        /\bnot failing\b|\bnever his to sign\b|\bno pass mark\b|\bnot been conducting it badly\b|\bnot a door\b/i,
      'cards-heart-heal':
        /\bworking one\b|\bnot a broken instrument\b|\bstill being built\b|\bno schedule\b|\bassessment\b/i,
      'cards-feel-like-myself':
        /not waiting to become yourself|the woman who came looking is you|marking against someone gone/i,
    };
    for (const h of present) {
      const joined = CARDS.map((c) => reads[h]![c][2]).join(' ');
      expect(PAYOUT[h].test(joined), `${h} only refuses — its payout is gone`).toBe(true);
    }
  });

  // ⭐ The reads must stay about HER. If a read starts narrating a man, it has drifted into
  // healing/missing-him and the family separation is gone.
  it('keeps HER as the subject — he is barely present in the reads', () => {
    for (const h of present) for (const c of CARDS) {
      const beat = reads[h]![c][2];
      const you = (beat.match(/\byou\b|\byour\b|\byourself\b/gi) ?? []).length;
      const him = (beat.match(/\bhe\b|\bhim\b|\bhis\b/gi) ?? []).length;
      // ⭐ RECALIBRATED 2026-08-19, not relaxed: the Tarot-Cut halved beat 3, so a raw floor
      // tuned to a 100-word bubble no longer measures anything. The rule that carries the
      // intent is that she is addressed ACROSS the cut, and that he never takes over.
      const addressed = beat.split('\n').filter((cut) => /\byou\b|\byour\b|\byourself\b/i.test(cut)).length;
      expect(addressed, `${h}/${c} barely addresses her across the cut`).toBeGreaterThanOrEqual(2);
      expect(him, `${h}/${c} has drifted into narrating him`).toBeLessThanOrEqual(you);
    }
  });
});
