// Copy guards for the /fb-tarot MONEY-BLOCK batch (2026-08-19).
//
// ELEVEN landers on the face-down `return-mhf` deck, across four angles — `money-retiring`,
// `money-working`, `money-energy`, `money-prayer`. Spec: fb-tarot/docs/drafts/money-block.draft.md.
//
// ⭐⭐ THE FIRST NON-LOVE FAMILY ON THE FUNNEL. Every one of the 21 families before it asks
// about a man. This one asks about her money, and that changes what a wrong sentence costs:
// on a love lander a bad line hurts her feelings, and here it can move her actual savings.
//
// 🔴🔴 WHY THIS FILE EXISTS AT ALL, and why it does not read the registry the way its
// siblings do. These hooks are NOT WIRED YET. `scripts/wire-drafts-setup.mts` patches drafts
// into the in-memory registry, but it can only patch a hook the registry already has
// (`if (!reads?.[d.hook]) continue`) — so for an unbuilt family it silently does nothing, every
// deck-level guard skips, and the run still prints a green tick. That is exactly what happened
// to the first three money drafts: they passed both gates for a day while being checked by
// neither. So this file loads whichever source is real — the registry once a hook is wired,
// the draft JSON until then — and says which it used. The seven bans get real assertions today.
//
// THE SEVEN BANS (money-block.draft.md §4). None was loosened when the love families went
// directional on 2026-08-19: the directional argument is that the half she came for is worth
// the risk, and it does not reach a family where she can act on the reading with her savings.
//   1. No amount, no date, no SOURCE (no inheritance, no windfall, no legal case).
//   2. Never name a person as the block — the accusation lands inside a real family.
//   3. No financial advice, in any form. Not from a psychic reading, ever.
//   4. Never blame her: no mindset, no vibration, no deserving, no self-sabotage.
//   5. Never 'too late', and never a promised arrival. One is cruelty, the other a promise.
//   6. money-prayer only: never rule on God, in either direction.
//   7. Never presume the state of her finances. She said blocked; she did not say broke.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const { DECKS, TAROT_HOOKS } = await import('@/content/tarotReads');

const DECK = 'return-mhf' as const;
const CARDS = ['a', 'b', 'c'] as const;
const DRAFTS = new URL('../fb-tarot/docs/drafts/rewrites/', import.meta.url);

// The four angles, pinned. money-prayer has TWO hooks, not three — only two headlines were
// commissioned, and the count is pinned so a well-meaning third cannot appear without a
// decision (the same treatment hidden-intuition got).
const FAMILIES = {
  'money-retiring': ['cards-blocked-retiring', 'cards-nest-egg', 'cards-too-late'],
  'money-working': ['cards-still-working', 'cards-how-much-longer', 'cards-out-of-time'],
  'money-energy': ['cards-my-energy', 'cards-money-wont-stay', 'cards-energy-how-long'],
  'money-prayer': ['cards-prayed-years', 'cards-prayers-unanswered'],
} as const;
const MONEY_HOOKS = Object.values(FAMILIES).flat();

const HEADLINES: Record<string, string> = {
  'cards-blocked-retiring': 'Why is my money still blocked this close to retiring?',
  'cards-nest-egg': 'How long has something been blocking me from a nest egg?',
  'cards-too-late': 'Is something blocking my money, or did I just leave it too late?',
  'cards-still-working': 'Why am I still working when the money should have come by now?',
  'cards-how-much-longer': 'How much longer will something keep blocking my money?',
  'cards-out-of-time': 'Is something still blocking my money, or have I run out of time?',
  'cards-my-energy': 'Is my energy blocking my money?',
  'cards-money-wont-stay': "What does my energy say about why money won't stay?",
  'cards-energy-how-long': 'How long has my energy been working against my money?',
  'cards-prayed-years': "I've prayed about money for years. What's still blocking it?",
  'cards-prayers-unanswered': 'How long will my prayers for money keep going unanswered?',
};

// 7 draft bubbles -> the 4 registry beats; beat 3 carries bubbles 3-6, joined at wiring time.
// Same fold as scripts/wire-drafts-setup.mts, so what is asserted here is what gets wired.
const toBeats = (b: string[]) => [b[0], b[1], b.slice(2, 6).join('\n'), b[6]];

const wiredReads = (DECKS as any)[DECK]?.reads ?? {};
const source: Record<string, 'registry' | 'draft'> = {};
const reads: Record<string, Record<string, string[]>> = {};
for (const h of MONEY_HOOKS) {
  if (wiredReads[h]) {
    reads[h] = wiredReads[h];
    source[h] = 'registry';
  } else {
    const d = JSON.parse(readFileSync(new URL(`${h}.json`, DRAFTS), 'utf8'));
    reads[h] = Object.fromEntries(CARDS.map((c) => [c, toBeats(d.decks[DECK][c])]));
    source[h] = 'draft';
  }
}

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
// ⚠ MEMOISED, and not as a micro-optimisation. This file sweeps 11 hooks x 3 cards against
// EVERY live hook on the deck — the widest comparison in the suite — and the naive version
// rebuilt both run-sets on every pair. It passed when run alone and TIMED OUT at 30s inside a
// full `vitest run`, which reads as a copy failure and is not one.
const RUNS = new Map<string, Set<string>>();
const runsOf = (str: string, n = 6) => {
  const hit = RUNS.get(str);
  if (hit) return hit;
  const w = words(str);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  RUNS.set(str, out);
  return out;
};
const shared = (a: string, b: string) => {
  const rb = runsOf(b);
  return [...runsOf(a)].filter((r) => rb.has(r));
};

describe(`money-block — loaded from ${[...new Set(Object.values(source))].join(' + ')}`, () => {
  it('covers all eleven landers, from a source that actually exists', () => {
    expect(MONEY_HOOKS.length, 'the batch is eleven landers').toBe(11);
    expect(FAMILIES['money-prayer'].length, 'money-prayer is pinned at TWO hooks').toBe(2);
    expect(new Set(MONEY_HOOKS).size, 'a hook is listed twice').toBe(11);
    for (const h of MONEY_HOOKS) {
      expect(reads[h], `${h} has no reads from either source`).toBeTruthy();
      for (const c of CARDS) expect(reads[h][c]?.length, `${h}/${c} is not 4 beats`).toBe(4);
    }
  });

  // ⭐ The wiring guard. It is vacuous while the family is unwired and becomes load-bearing the
  // moment a hook lands in the registry — hookToBucket() is hardcoded to 'love'
  // (tarotReads.ts), and a money hook that inherits it runs a love reading against a woman who
  // asked about her pension.
  it('any hook that HAS been wired reports bucket=money and is in the roster', async () => {
    const { hookToBucket, angleForHook } = await import('@/content/tarotReads');
    for (const [angle, hooks] of Object.entries(FAMILIES)) {
      for (const h of hooks) {
        if (source[h] !== 'registry') continue;
        expect(TAROT_HOOKS, `${h} has reads but is missing from TAROT_HOOKS`).toContain(h as never);
        expect(hookToBucket(h as never), `${h} still runs the LOVE bucket`).toBe('money');
        expect(angleForHook(h as never), `${h} reports the wrong angle`).toBe(angle);
      }
    }
  });

  it('every read has the 4-beat shape, the face-DOWN verb and the open loop', () => {
    for (const h of MONEY_HOOKS) for (const c of CARDS) {
      const beats = reads[h][c];
      expect(beats[0], `${h}/${c} must open on the turned card`).toMatch(/^You turned /);
      expect(beats[3], `${h}/${c} must keep the open loop`).toMatch(/^Let me look closer at .*…$/);
      for (const beat of beats) {
        expect(beat.trim().length, `${h}/${c} has an empty beat`).toBeGreaterThan(20);
        expect(beat, `${h}/${c} exclamation`).not.toMatch(/!/);
        expect(beat, `${h}/${c} emoji`).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
      }
    }
  });

  it('she hears her own ad back in beats 1-2 (message scent)', () => {
    const STOP = new Set('is my the a an it or i ive did just this close to what does say why how long has been from me still will keep about years for going in of and something he him her ever'.split(' '));
    for (const h of MONEY_HOOKS) {
      const key = words(HEADLINES[h]).filter((w) => !STOP.has(w) && w.length > 2);
      for (const c of CARDS) {
        const opening = `${reads[h][c][0]} ${reads[h][c][1]}`.toLowerCase();
        expect(key.some((k) => opening.includes(k.slice(0, 5))), `${h}/${c} never says her question back`).toBe(true);
      }
    }
  });

  // 33 card framings, all distinct — same rule the trust hooks shipped under, and it has to
  // hold against the LIVE deck too or a money lander opens on a love lander's line.
  it('every card framing is distinct, across the batch AND against the live deck', () => {
    const seen = new Map<string, string>();
    for (const h of TAROT_HOOKS) {
      if (MONEY_HOOKS.includes(h as never)) continue;
      for (const c of CARDS) {
        const opener = wiredReads[h]?.[c]?.[0];
        if (opener) seen.set(opener, `${h}/${c} (live)`);
      }
    }
    const dupes: string[] = [];
    for (const h of MONEY_HOOKS) for (const c of CARDS) {
      const opener = reads[h][c][0];
      if (seen.has(opener)) dupes.push(`${h}/${c} == ${seen.get(opener)}`);
      seen.set(opener, `${h}/${c}`);
    }
    expect(dupes, `recycled card framing:\n${dupes.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run between the money hooks, or with the live deck', () => {
    const found: string[] = [];
    for (let i = 0; i < MONEY_HOOKS.length; i++) for (let j = i + 1; j < MONEY_HOOKS.length; j++) {
      for (const c of CARDS) {
        for (const r of shared(reads[MONEY_HOOKS[i]][c][2], reads[MONEY_HOOKS[j]][c][2]))
          found.push(`${MONEY_HOOKS[i]}/${c} ~ ${MONEY_HOOKS[j]}/${c}: "${r}"`);
      }
    }
    for (const h of MONEY_HOOKS) for (const c of CARDS) {
      for (const other of TAROT_HOOKS) {
        if (MONEY_HOOKS.includes(other as never)) continue;
        const beat = wiredReads[other]?.[c]?.[2];
        if (!beat) continue;
        for (const r of shared(reads[h][c][2], beat)) found.push(`${h}/${c} ~ ${other}/${c} (live): "${r}"`);
      }
    }
    expect(found, `recycled wording:\n${found.join('\n')}`).toEqual([]);
  });

  // ── The compliance core ────────────────────────────────────────────────────
  // Clause-level, and a clause carrying a negator is exempt — correct copy here routinely
  // names a banned thing in order to refuse it ("I will not tell you what heaven has said").
  const NEGATOR =
    /\b(no|not|never|can't|unable|n't|nor|nobody|no one|none|cannot|rather than|instead of|does not|is not|nothing|refuses?|declines?|will not|would not|neither|without)\b/i;
  const clausesOf = (s: string) => s.split(/[—;:,.\n]/);

  // ⚠️ RESTATEMENT EXEMPTION, and it is narrower than the one the love families use. Those
  // exempt any clause near a "you asked". This exempts only a clause that IS a fragment of
  // that lander's own headline — because cards-too-late's headline literally contains ban 5
  // ("did I just leave it too late?") and its bridge has to say it back to her. Restating her
  // ad is allowed; asserting it is not, and an assertion is never a substring of the ad.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const isRestatement = (clause: string, hook: string) => {
    const c = norm(clause);
    return c.length > 0 && norm(HEADLINES[hook]).includes(c);
  };

  const sweep = (bans: Array<[RegExp, string]>, hooks: readonly string[] = MONEY_HOOKS) => {
    const hits: string[] = [];
    for (const h of hooks) for (const c of CARDS) for (const beat of reads[h][c]) {
      for (const clause of clausesOf(beat)) {
        if (NEGATOR.test(clause) || isRestatement(clause, h)) continue;
        for (const [re, why] of bans) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    return hits;
  };

  // 🔴 BAN 1 — no amount, no date, no source. The source half is the dangerous one: she can
  // act on an invented inheritance with her actual savings.
  it('names no amount, no date and no SOURCE', () => {
    const hits = sweep([
      [/\$|£|\b\d[\d,]{2,}\b/, 'an amount'],
      [/\b(thousand|million|pounds|dollars)\b/i, 'an amount'],
      [/\bwithin (a|the|\d)/i, 'a dated prediction'],
      [/\bin (a few|the next|another|\d+) (day|week|month|year)/i, 'a dated prediction'],
      [/\bby (the end of|christmas|new year|spring|summer|autumn|winter)\b/i, 'a dated prediction'],
      [/\bnot (much )?long now\b/i, 'a date in soft clothes'],
      [/\b(inheritance|inherit|windfall|lottery|lawsuit|legal (case|claim)|compensation|payout|a settlement)\b/i, 'a SOURCE she could act on'],
    ]);
    expect(hits, `amount / date / source:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN 2 — never a person. A card cannot see this, and the accusation lands on someone
  // real inside a real family.
  it('never names a person as the block', () => {
    const hits = sweep([
      [/\bsomeone close to you\b/i, 'names a person'],
      [/\ba family member\b/i, 'names a person'],
      [/\byour (son|daughter|husband|wife|partner|sister|brother|mother|father|family)\b/i, 'names a person'],
      [/\bsomeone (is )?(taking|took|takes) (it|from you|your)\b/i, 'names a person as the block'],
      [/\bhe (is )?(taking|took) (it|your)\b/i, 'names a person as the block'],
    ]);
    expect(hits, `named a person:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN 3 — no financial advice, in any form. The one ban where the harm is measured in
  // her money rather than her feelings.
  it('hands her no financial advice of any kind', () => {
    const hits = sweep([
      [/\b(invest|investing|sell|selling|cash (it|in)|remortgage|borrow|a loan)\b/i, 'financial advice'],
      [/\b(take|delay|draw|claim) (your|the) pension\b/i, 'pension advice'],
      [/\bpay off\b|\bput it (in|into)\b|\bmove your money\b|\bhold on to it\b/i, 'financial advice'],
      [/\bstart a business\b|\bgo back to work\b|\bstop working\b|\bkeep working\b/i, 'work advice'],
      [/\byou (should|need to|ought to) (save|spend|budget)\b/i, 'financial advice'],
    ]);
    expect(hits, `financial advice:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN 4 — never blame her. She arrives having been told all of it by the internet, and
  // the money-energy headline OFFERS the self-blame, which is the sharp edge.
  it('never blames her, and never agrees she blocks herself', () => {
    const hits = sweep([
      [/\b(poverty|scarcity|money|lack) mindset\b/i, 'the mindset blame'],
      [/\byour (energy|vibration|mindset) is (the|what)\b/i, 'blames her energy'],
      [/\braise your vibration\b|\bself.?sabotag/i, 'blames her'],
      [/\byou attract\b/i, 'the manifesting blame'],
      [/\byou (do not|don't) (believe|think) you deserve\b/i, 'blames her'],
      [/\byou (are|'re) (blocking|standing in) your own\b/i, 'blames her'],
      [/\byou (were|are|have been) (careless|reckless|bad) with (it|money)\b/i, 'blames her'],
      [/\byou should have (saved|invested|planned|started)\b/i, 'grades her past choices'],
    ]);
    expect(hits, `blame:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN 5 — both directions. "Too late" is cruelty; a promised arrival is a promise nobody
  // can keep, and on a money lander she may spend against it.
  it('never says too late, and never promises an arrival', () => {
    const hits = sweep([
      [/\b(it|this) (is|'s|was) too late\b/i, 'the cruelty direction'],
      [/\btoo late for you\b/i, 'the cruelty direction'],
      [/\byou (have|'ve) run out of time\b/i, 'the cruelty direction'],
      [/\b(money|it) is coming\b/i, 'a promised arrival'],
      [/\bit will come\b|\bit will arrive\b|\bon its way to you\b/i, 'a promised arrival'],
      [/\byou will (be|have) (fine|comfortable|secure|enough)\b/i, 'a promised arrival'],
      [/\bthe money will\b/i, 'a promised arrival'],
    ]);
    expect(hits, `too late / promised arrival:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴🔴 BAN 6 — money-prayer only, and it exists nowhere else on the funnel. Both directions
  // are rulings, and neither is a card's to make. Evelyn never stands between her and what she
  // prays to.
  it('money-prayer never rules on God, in either direction', () => {
    const hits = sweep([
      [/\byour prayers (were|have been|are) (heard|answered|unanswered|ignored|refused)\b/i, 'rules on her prayers'],
      [/\byou (are|'re) being (tested|punished|taught|refused)\b/i, 'rules on God'],
      [/\b(god|the lord|heaven|spirit) (has|is|wants|said|says|knows)\b/i, 'speaks for God'],
      [/\b(god|divine|heaven)('s)? (plan|will|timing)\b/i, 'a plan is at work'],
      [/\bthere is a reason (for|why) (this|it)\b/i, 'a plan is at work'],
      [/\bthe cards (know|see) more\b/i, 'sets the cards above her faith'],
    ], FAMILIES['money-prayer']);
    expect(hits, `ruled on God:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 BAN 7 — she said blocked. She did not say broke, in debt, or destitute.
  it('never presumes the state of her finances', () => {
    const hits = sweep([
      [/\byou (are|'re) (broke|poor|skint|destitute|struggling)\b/i, 'presumes her finances'],
      [/\byour debts?\b|\bin debt\b/i, 'presumes debt'],
      [/\byou (have|'ve) nothing (left|saved|put by)\b/i, 'presumes her finances'],
      [/\byou (cannot|can't) afford\b/i, 'presumes her finances'],
      [/\byour (savings|pension) (is|are) (gone|empty|small)\b/i, 'presumes her finances'],
    ]);
    expect(hits, `presumed her finances:\n${hits.join('\n')}`).toEqual([]);
  });

  // ── The findings, or eleven landers become one lander wearing eleven headlines ──────────
  // Each is the sentence money-block.draft.md §6 says the read must land on.
  const FINDINGS: Record<string, [RegExp, string]> = {
    'cards-blocked-retiring': [/never you|was never the problem|never where this/i, 'it was never her'],
    'cards-nest-egg': [/old|long ago|for years|never gathered|steadily/i, 'long-standing, not recent'],
    'cards-too-late': [/not too late|did not leave it too late|blocks are things|can move/i, 'not too late, and a block moves'],
    'cards-still-working': [/went in|came back out|stalled|not a debt/i, 'the effort went in and did not come back'],
    'cards-how-much-longer': [/run down|clock|moved|countdown|sits where it is/i, 'a block does not run down, it gets moved'],
    'cards-out-of-time': [/not run out of time|hold, not an ending|standing in a road|open road/i, 'she has not run out of time'],
    'cards-my-energy': [/never been the block|isn't wrong|still fresh|under weight/i, 'her energy is not the block'],
    'cards-money-wont-stay': [/getting has always worked|two different doors|hold of it|built to hold/i, 'the getting works; the keeping is the question'],
    'cards-energy-how-long': [/never once did|settled long ago|running against you|bare field/i, 'nothing has been running against her'],
    'cards-prayed-years': [/don't read prayers|won't say what your prayers|won't speak for|ordinary|plain thing|everyday|day to day/i, 'the block is an ordinary thing'],
    'cards-prayers-unanswered': [/hold is not a refusal|waits on permission|long quiet|won't call this answered/i, 'a long quiet is not a refusal'],
  };
  it('every hook lands on its OWN finding', () => {
    for (const h of MONEY_HOOKS) {
      const [re, what] = FINDINGS[h];
      const joined = CARDS.map((c) => reads[h][c][2]).join(' ');
      expect(re.test(joined), `${h} lost its finding — ${what}`).toBe(true);
    }
  });
});
