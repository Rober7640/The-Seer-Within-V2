// Copy guards for the /fb-tarot PULLING-AWAY hooks (2026-08-05).
//
// Three headlines on the FACE-DOWN return-mhf deck: 'Why is he pulling away from me?',
// 'Why has he gone cold on me?', 'Is he losing interest, or just going through something?'
//
// Why this angle needs its own guard file, beyond the generic ones:
//
//  1. IT IS THE ONLY FAMILY ABOUT A MAN WHO IS STILL THERE. Reunion reads a man already
//     gone, commitment a man withholding a future, honesty/trust a man caught in an
//     untruth, healing a man who now lives only in her head. Here he is present and
//     reachable and something has cooled — the wound is a CHANGE IN TEMPERATURE, not an
//     absence. The nearest live neighbours are cards-feels (his feelings, but static) and
//     cards-return (whose Version-C opener literally says 'when he pulled away'), so beat 3
//     is diffed against both families specifically.
//
//  2. FOUR FAILURE MODES, NOT TWO.
//       a. VERDICT, BOTH WAYS. 'He is losing interest' is a pronouncement on a real man
//          delivered to a woman already braced for it; 'he is crazy about you, he is just
//          busy' is a reassurance the funnel has no standing to give — and one that keeps
//          her invested in a man who may genuinely be withdrawing.
//       b. STRATEGY. 'Give him space', 'pull back and he will chase', 'stop texting',
//          'match his energy'. This is the answer the rest of the internet gives this
//          exact question, which is precisely why it leaks in. It is coaching on how to
//          manage a man, not a reading, and it is manipulation advice.
//       c. SELF-BLAME. A woman asking why he is pulling away has nearly always already
//          decided it was something she did. Same shape of harm as cards-wont-commit and
//          cards-deceived: nothing may land as her being too much, too available, too
//          eager, too sensitive or not enough.
//       d. EXCUSING HIM. 'He is just stressed', 'men need space'. An excuse is a verdict
//          wearing a kinder face — and on cards-losing-interest it is literally one half
//          of the binary the read is required to refuse.
//
//  3. cards-losing-interest MUST REFUSE ITS OWN HEADLINE. Like cards-moved-on, the ad hands
//     over an either-or and answering either half fails. Asserted directly.
//
// 🔴 Negation-aware by construction, as in the honesty, reunion and healing guards: correct
// copy here routinely contains a banned phrase inside a refusal ('will not tell you his
// heart has closed', 'nothing to do with you being too sensitive'), so a naive substring
// ban would fail the very copy it protects.
import { describe, expect, it } from 'vitest';

const {
  DECKS,
  PULLING_AWAY_HOOKS,
  COMMITMENT_HOOKS,
  HEALING_HOOKS,
  REUNION_HOOKS,
  TAROT_HOOKS,
  HEADLINES,
  SELF_FRAME_HOOKS,
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

describe('pulling-away hooks are wired end to end', () => {
  it('every hook is in the roster, has a headline, and reports angle=pulling-away', () => {
    expect(PULLING_AWAY_HOOKS.length).toBe(3);
    for (const h of PULLING_AWAY_HOOKS) {
      expect(TAROT_HOOKS, `${h} missing from TAROT_HOOKS`).toContain(h);
      expect(HEADLINES[h], `${h} has no headline`).toBeTruthy();
      expect(angleForHook(h), `${h} must report angle=pulling-away`).toBe('pulling-away');
    }
  });

  it('the headlines are the exact strings the ads run (message scent)', () => {
    expect(HEADLINES['cards-pulling-away']).toBe('Why is he pulling away from me?');
    expect(HEADLINES['cards-gone-cold']).toBe('Why has he gone cold on me?');
    expect(HEADLINES['cards-losing-interest']).toBe('Is he losing interest, or just going through something?');
  });

  // Operator call 2026-08-05: the 7/31 commitment landers ran a DIFFERENT topic (the
  // future he will not name), so this family gets its own angle rather than being merged
  // into theirs — merging would retroactively mix two questions inside one set of numbers.
  it('does NOT merge into the existing commitment family', () => {
    for (const h of PULLING_AWAY_HOOKS) {
      expect(COMMITMENT_HOOKS, `${h} leaked into the commitment family`).not.toContain(h);
      expect(REUNION_HOOKS, `${h} leaked into the reunion family`).not.toContain(h);
      expect(HEALING_HOOKS, `${h} leaked into the healing family`).not.toContain(h);
      expect(SELF_FRAME_HOOKS, `${h} leaked into the self-frame family`).not.toContain(h);
    }
    // The 7/31 commitment landers keep reporting exactly as they did.
    expect(COMMITMENT_HOOKS.length).toBe(3);
    for (const h of COMMITMENT_HOOKS) expect(angleForHook(h)).toBe('commitment');
  });

  it('reuses no existing hook id and no existing headline', () => {
    expect(new Set(TAROT_HOOKS).size).toBe(TAROT_HOOKS.length);
    // No headline collides with a live lander — unlike cards-come-back, which duplicates
    // cards-return ON PURPOSE as a copy test. This family is not one.
    const others = TAROT_HOOKS.filter((h) => !PULLING_AWAY_HOOKS.includes(h)).map((h) => HEADLINES[h]);
    for (const h of PULLING_AWAY_HOOKS) {
      expect(others, `${h} headline collides with an existing lander`).not.toContain(HEADLINES[h]);
    }
  });

  // A real man is in the picture and she is asking about HIS conduct, so the
  // no-verdict-on-him guardrails must stay on. Self-frame drops them.
  it('is NOT self-frame — the no-verdict-on-him guardrails must stay on', () => {
    for (const h of PULLING_AWAY_HOOKS) expect(angleForHook(h)).not.toBe('self-frame');
  });

  it('leaves every previously shipped family exactly where it was', () => {
    expect(angleForHook('cards-honest')).toBe('decode-him');
    expect(angleForHook('cards-return')).toBe('decode-him');
    expect(angleForHook('cards-feels')).toBe('decode-him');
    expect(angleForHook('cards-come-back')).toBe('reunion');
    expect(angleForHook('cards-misled')).toBe('trust');
    expect(angleForHook('cards-lied-to')).toBe('honesty');
    expect(angleForHook('cards-will-commit')).toBe('commitment');
    expect(angleForHook('cards-cant-stop')).toBe('healing');
  });

  it('the opener asks about the CHANGE, never for what she did to cause it', () => {
    for (const h of PULLING_AWAY_HOOKS) {
      const q = openerCStart(DECK, h, 'a')[1];
      expect(q, `${h} opener form`).toMatch(/^Before I look closer, tell me… /);
      expect(q, `${h} opener must be a question`).toMatch(/\?$/);
      // She must never be asked to account for her own behaviour to be taken seriously.
      expect(q, `${h} opener blames her`).not.toMatch(/what did you (do|say)|did you push|were you too/i);
    }
  });

  it('is FACE-DOWN ONLY — not ported to the face-up deck', () => {
    for (const h of PULLING_AWAY_HOOKS) {
      expect(DECKS[DECK].reads[h], `${h} missing from the face-down deck`).toBeTruthy();
      expect(DECKS['arcana-mfh'].reads[h], `${h} was ported to face-up without a decision`).toBeUndefined();
    }
  });
});

describe(`${DECK} — pulling-away reads`, () => {
  const reads = DECKS[DECK].reads;
  const present = PULLING_AWAY_HOOKS.filter((h) => reads[h]);
  const existing = TAROT_HOOKS.filter((h) => reads[h] && !PULLING_AWAY_HOOKS.includes(h));

  it('every read has all 3 cards and the full 4-beat structure', () => {
    for (const h of present) {
      for (const c of CARDS) {
        expect(reads[h]![c], `${h}/${c} missing`).toBeTruthy();
        expect(reads[h]![c], `${h}/${c} is not 4 beats`).toHaveLength(4);
        for (const beat of reads[h]![c]) expect(beat.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it('beat 3 shares no 6-word run with any EXISTING hook on this deck', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of existing) {
      for (const r of shared(reads[nh]![c][2], reads[oh]![c][2])) found.push(`${nh}/${c} ~ ${oh}/${c}: "${r}"`);
    }
    expect(found, `recycled wording:\n${found.join('\n')}`).toEqual([]);
  });

  // Called out separately. cards-feels reads the same man's feelings and cards-return
  // opens on the very words of this angle's first headline, so if these rhyme with either,
  // a visitor gets a reveal that answers a question she did not click.
  it('beat 3 shares no 6-word run with cards-feels or cards-return specifically', () => {
    const found: string[] = [];
    for (const nh of present) for (const c of CARDS) for (const oh of ['cards-feels', 'cards-return'] as const) {
      if (!reads[oh]) continue;
      for (const r of shared(reads[nh]![c][2], reads[oh]![c][2])) found.push(`${nh}/${c} ~ ${oh}/${c}: "${r}"`);
    }
    expect(found, `pulling-away rhymes with its nearest neighbours:\n${found.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run BETWEEN the three pulling-away hooks either', () => {
    const found: string[] = [];
    for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) for (const c of CARDS) {
      for (const r of shared(reads[present[i]]![c][2], reads[present[j]]![c][2]))
        found.push(`${present[i]}/${c} ~ ${present[j]}/${c}: "${r}"`);
    }
    expect(found, `pulling-away hooks repeat each other:\n${found.join('\n')}`).toEqual([]);
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

  it('opener phrasing matches the facing — she TURNED a face-down card', () => {
    expect(DECKS[DECK].facing).toBe('down');
    for (const h of present) for (const c of CARDS) {
      expect(reads[h]![c][0], `${h}/${c}`).toMatch(/^You turned /);
    }
  });

  // ── The compliance core ────────────────────────────────────────────────────
  const NEGATOR = /\b(no|not|never|none|nobody|no one|cannot|can't|unable|without|n't|nor|rather than|instead of|does not|is not|nothing|refuses|declines|will not)\b/i;
  // 🔴 FIXED 2026-08-19 — this used to split on /[—;:,]/ only, which does NOT break on a
  // full stop or a newline. Beat 3 carries four bubbles joined by '\n' since the migration, so
  // a single negator in the first of them ('it was never you') put the whole of the remaining
  // three behind the negation exemption and every clause ban in them was skipped silently.
  // Found by feeding the gate a deliberate violation rather than trusting its green tick.
  const clausesOf = (s: string) => s.split(/[—;:,.\n]/);

  // 🔄 LOOSENED 2026-08-19 — was "never hands down a VERDICT in either direction". The
  // reassuring direction is now allowed: refusing it is what made these reads sit in the
  // middle and answer nothing. The CONVICTING direction stays banned, and so do dated
  // predictions — a date is the only claim she can check, and a failed one is a refund.
  it('never CONVICTS him, and never puts a date on anything', () => {
    const ASSERTIONS: Array<[RegExp, string]> = [
      [/\bhe (is|has been) losing interest\b/i, 'verdict: convicts him'],
      [/\bhe (is|has) (moved on|checked out|given up|done with you)\b/i, 'verdict: convicts him'],
      [/\bhe (does not|doesn't) (love|want|care about) you\b/i, 'verdict: convicts him'],
      [/\bnothing (is|has gone) wrong\b/i, 'verdict: reassures past the point of use'],
    ];
    const ALWAYS: Array<[RegExp, string]> = [
      [/\bwithin (a|the|\d)/i, 'a dated prediction'],
      [/\bin (a few|the next|\d+) (day|week|month|year)/i, 'a dated prediction'],
      [/\bby (the end of|christmas|new year|spring|summer|autumn|winter)\b/i, 'a dated prediction'],
      [/\bI promise\b/i, 'a promise the funnel cannot keep'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const [re, why] of ALWAYS) if (re.test(beat)) hits.push(`${h}/${c} (${why}): "${beat}"`);
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of ASSERTIONS) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, `verdict language:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 The failure mode unique to this angle. Every one of these is a standard answer to
  // 'why is he pulling away' elsewhere, which is exactly why the guard has to be explicit.
  it('never hands her a STRATEGY for managing him', () => {
    const ASSERTIONS: Array<[RegExp, string]> = [
      [/\bgive him (space|time|room)\b/i, 'strategy'],
      [/\bpull(ing)? back\b/i, 'strategy: the chase tactic'],
      [/\b(stop|don't|do not) (texting|calling|reaching out|chasing)\b/i, 'strategy'],
      [/\bmatch his energy\b/i, 'strategy'],
      [/\bhe('ll| will) (chase|come running|miss you)\b/i, 'strategy: promises a reaction'],
      [/\bmake yourself (scarce|unavailable)\b/i, 'strategy'],
      [/\bplay it cool\b/i, 'strategy'],
      [/\byou (need|have|ought) to (wait|back off|be patient)\b/i, 'directive'],
      [/\byou should (wait|back off|say nothing|give him)\b/i, 'directive'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of ASSERTIONS) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, `strategy/directive language:\n${hits.join('\n')}`).toEqual([]);
  });

  it('never lands as HER fault', () => {
    const ASSERTIONS: Array<[RegExp, string]> = [
      [/\byou (were|are|have been) too (much|available|eager|needy|keen|sensitive|fast)\b/i, 'blames her'],
      [/\byou (were|are) not enough\b/i, 'blames her'],
      [/\byou (pushed|scared|drove) him\b/i, 'blames her'],
      [/\byou (came on|moved) too (strong|fast)\b/i, 'blames her'],
      [/\byou should have (waited|known|said nothing|held back)\b/i, 'blames her'],
      [/\byou are (overthinking|reading too much)\b/i, 'dismisses her perception'],
      [/\b(clingy|needy|desperate|smothering)\b/i, 'blames her'],
      [/\byour own fault\b/i, 'blames her'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of ASSERTIONS) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, `self-blame language:\n${hits.join('\n')}`).toEqual([]);
  });

  // An excuse is a verdict in a kinder coat — and on cards-losing-interest it is one half
  // of the binary the read is required to refuse.
  it('never EXCUSES the distance on his behalf', () => {
    const ASSERTIONS: Array<[RegExp, string]> = [
      [/\bhe (is|has) just (stressed|busy|tired|overwhelmed)\b/i, 'excuses him'],
      [/\bmen (need|just need) space\b/i, 'excuses him'],
      [/\bit('s| is) (just )?(work|stress|his job)\b/i, 'excuses him'],
      [/\bthis has nothing to do with you\b/i, 'excuses him'],
      [/\bhe (is|has) going through something\b/i, 'excuses him: picks the kind half'],
      [/\bthat('s| is) (just )?(how|what) men (are|do)\b/i, 'excuses him'],
    ];
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of ASSERTIONS) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, `excuse language:\n${hits.join('\n')}`).toEqual([]);
  });

  // The rule that makes cards-losing-interest work at all: its headline is an either-or,
  // and BOTH halves are forbidden answers. The read must refuse the binary outright, the
  // same way cards-moved-on does.
  it('cards-losing-interest refuses the binary rather than answering it', () => {
    const beats = CARDS.flatMap((c) => reads['cards-losing-interest']![c]);
    const refusals = beats.filter((b) =>
      /\b(will not choose|neither will I|declines your either-or|refuses to be pushed)\b/i.test(b),
    );
    expect(refusals.length, 'each card must visibly refuse the either-or in its read').toBeGreaterThanOrEqual(3);
    // And never resolve it in passing.
    for (const b of beats) {
      for (const clause of clausesOf(b)) {
        if (NEGATOR.test(clause)) continue;
        expect(clause, `resolves the binary: "${clause.trim()}"`).not.toMatch(
          /\bit (is|must be) (that he is )?(losing interest|just going through)/i,
        );
      }
    }
  });

  it('carries no exclamation marks, emoji, prices or urgency', () => {
    const hits: string[] = [];
    for (const h of present) for (const c of CARDS) for (const beat of reads[h]![c]) {
      if (/!/.test(beat)) hits.push(`${h}/${c}: exclamation mark`);
      if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(beat)) hits.push(`${h}/${c}: emoji`);
      if (/\$\d|\bdiscount\b|\boffer\b|\bhurry\b|\blimited\b/i.test(beat)) hits.push(`${h}/${c}: offer/urgency`);
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });
});

// 🔴 The silent-mislabel guard. `syncTarotAttribution` validates the hook TWICE — against
// TAROT_HOOKS via isTarotHook(), then against `getDeck(deck).reads[hook]`. Fail EITHER and
// it falls back to DEFAULT_HOOK, so PostHog would report every visitor on the new ads as
// `cards-honest` and the whole family would be invisible. Nothing user-facing breaks, which
// is exactly what makes it dangerous. These pin the clean ad URLs the buyer actually runs.
describe('the live ad URLs resolve to themselves, never to DEFAULT_HOOK', () => {
  class MemoryStorage {
    private m = new Map<string, string>();
    getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
    setItem(k: string, v: string) { this.m.set(k, String(v)); }
    removeItem(k: string) { this.m.delete(k); }
    clear() { this.m.clear(); }
    key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
    get length() { return this.m.size; }
  }
  (globalThis as any).window = { sessionStorage: new MemoryStorage() };

  it('each clean /fb-tarot/c URL reports its own hook, angle=pulling-away, face-down', async () => {
    const { syncTarotAttribution } = await import('@/lib/tarotAttribution');
    for (const h of PULLING_AWAY_HOOKS) {
      // Exactly what the ad runs: no &deck=, so the deck is implied by DEFAULT_DECK.
      const props = syncTarotAttribution('/fb-tarot/c', `?hook=${h}`);
      expect(props.hook, `${h} fell back to DEFAULT_HOOK — PostHog would mislabel it`).toBe(h);
      expect(props.angle, `${h} angle`).toBe('pulling-away');
      expect(props.deck, `${h} deck`).toBe('return-mhf');
      expect(props.facing, `${h} facing`).toBe('down');
      expect(props.version, `${h} version`).toBe('c');
    }
  });
});

// The server-side prompt path is a DIFFERENT surface from the canned 4-beat reads: the
// Version-C reflect call reads her typed answer and generates fresh text, steered by these
// two maps. A hook missing from either silently falls back to the generic tendency, which
// carries none of this angle's guardrails.
describe('server prompt maps carry the angle', () => {
  it('every pulling-away hook has its own context and tendency', async () => {
    const src = await import('node:fs').then((fs) =>
      fs.promises.readFile(new URL('../server/lib/prompts.ts', import.meta.url), 'utf8'),
    );
    for (const h of PULLING_AWAY_HOOKS) {
      // Two entries: one in TAROT_HOOK_CONTEXT, one in TAROT_HOOK_TENDENCY.
      const occurrences = src.split(`'${h}'`).length - 1;
      expect(occurrences, `${h} must appear in BOTH prompt maps`).toBeGreaterThanOrEqual(2);
    }
    // The strategy ban has to reach the generated path too, not just the canned reads.
    expect(src).toMatch(/no giving him space, no pulling back/i);
  });

  it('the tarot validHooks roster in routes.ts accepts all three (or the chat 400s)', async () => {
    const src = await import('node:fs').then((fs) =>
      fs.promises.readFile(new URL('../server/routes.ts', import.meta.url), 'utf8'),
    );
    const roster = src.match(/const validHooks = \["cards-honest".*?\];/s);
    expect(roster, 'tarot validHooks roster not found').toBeTruthy();
    for (const h of PULLING_AWAY_HOOKS) {
      expect(roster![0], `${h} missing from validHooks — Version-C handoff will 400`).toContain(h);
    }
  });
});
