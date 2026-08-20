// Copy guards for the /fb-tarot SOULMATE AGE-BAND batch (2026-08-19).
//
// EIGHT landers on the face-down `return-mhf` deck, across four age bands (25–44, 45–54,
// 55–64, 65+) and two question forms (WHY and HOW-LONG, plus two BINARY rungs). Drafts:
// fb-tarot/docs/drafts/rewrites/cards-{slipping-past,choosing-wrong,found-me-yet,
// keeps-waiting,after-marriage,second-time,too-late-love,longer-to-wait}.json
//
// ⚠ THE CONTROL ARM IS NOT IN THIS FILE. The 25–44 band's control headline — "Have I
// already met my soulmate?" — points at the LIVE `cards-met-already` (soulmate-label),
// which already carries that question. Operator decision 2026-08-19: do not build a ninth
// near-duplicate lander to serve as its own control. If a future edit adds one, it belongs
// in the soulmate-label guard, not here.
//
// 🔴🔴 WHY THIS FILE EXISTS, and why it does not read the registry the way older siblings do.
// These hooks are NOT WIRED YET. `scripts/wire-drafts-setup.mts` patches drafts into the
// in-memory registry, but only for a hook the registry already has (`if (!reads?.[d.hook])
// continue`) — so for an unbuilt family every deck-level guard silently skips and the run
// still prints a green tick. That is exactly what happened to the first three money drafts:
// they passed both gates for a day while being checked by neither. So this file loads
// whichever source is real — the registry once a hook is wired, the draft JSON until then —
// and says in its describe() which it used. Every ban below gets a real assertion today.
//
// ── WHY EIGHT LANDERS AND NOT NINE ADS' WORTH OF ONE ──────────────────────────────────
// The operator's age-band table named EXISTING hooks (`cards-alone-forever`,
// `cards-where-soulmate`, `cards-new-soulmate`…). Every one of them already carries a
// DIFFERENT question, and `HEADLINES` is rendered on the page (TarotBridge.tsx:216) as the
// verbatim ad question — so repointing an ad at one of them puts a different question on
// the lander than the one in the ad. Two of those hooks are worse than a mismatch:
// `cards-new-soulmate` and `cards-soulmate-out-there` run under AFTER_LOSS_TAROT_HOOKS,
// whose hardest ban is NO ARRIVAL because someone has died. A never-married 65-year-old
// sent there gets a read that structurally refuses to say anyone is coming, after an opener
// written for a widow. Hence: new hooks, new reads, new guard.
//
// ── THE SEVEN BANS ────────────────────────────────────────────────────────────────────
// Derived from 438 real buyer concerns pulled 2026-08-19 across seven theme searches
// (voc-by-theme.mjs, read-only). Each ban is a thing the VOC says is actually in the room.
//
//  1. 🔴🔴 NO DURATION — THE NEW ONE, and the reason this family cannot run under any frame
//     that already exists. Every frame on the funnel bans a DATE. FOUR of these headlines
//     ask HOW LONG, and "not much longer", "a few months", "soon" are LENGTHS, not dates —
//     they walk straight through the date ban untouched. Structurally identical to the gap
//     `where` fell through on soulmate-where: a list of three withheld specifics that omits
//     the fourth thing the headline actually asks for.
//  2. 🔴🔴 NO SELF-BLAME. `cards-choosing-wrong` PRESUPPOSES she chose, and the VOC says she
//     often did not: "badly hurt by a man I thought loved me but he was a scammer", "my
//     marriage broke up because of domestic abuse and I'm scared of yet again choosing a
//     wrong man", "he turned out to be a convicted paedophile". Telling a woman who was
//     defrauded or assaulted that she keeps choosing wrong blames her for a crime.
//  3. 🔴 NO MEDIUMSHIP. `cards-slipping-past` returned widowers at the TOP of its buyer list
//     ("my second wife, she passed away in 2018"; "lost my first relationship after my wife
//     died last year") — "slipping past" is how a bereaved reader describes a death. Same
//     exposure on after-marriage, second-time and longer-to-wait. universalSafety.ts does
//     NOT catch this — it screens suicidality and distress, not bereavement.
//  4. 🔴 NO HEALTH AND NO FERTILITY. The sm-too-late pull is thick with both: "a heart
//     condition and a transplant", "ovarian cancer and therefore a hysterectomy", "a recent
//     stroke… multiple traumatic brain injuries", "too late to have a baby". Health is a
//     Meta-PROHIBITED personal attribute; this funnel has no business near it.
//  5. 🔴 NO AGE AND NO NUMBER. The 65+ pair selects for it and both directions are harm:
//     naming her age agrees she is running out, and a count is the one claim she can check.
//  6. 🔴 NO PRESUMPTION OF HOW THE MARRIAGE ENDED. "The marriage ended" covers divorce AND
//     death, and the pull returned both. The read holds for a widow and for a woman who
//     walked out, or it is wrong for a large share of the traffic.
//  7. 🔴 NO PLACE, NO STRATEGY, NO FATE, NO VERDICT ON A REAL MAN. The four failure modes the
//     neighbouring soulmate families each found the hard way, arriving here together.
//
// 🔴 NEGATION-AWARE BY CONSTRUCTION, as in every sibling guard — correct copy here routinely
// contains a banned phrase inside a refusal ("So I won't put a number on it", "There isn't
// one to hand"). BUT the blanket negator exemption the older files use is WRONG for bans 1
// and 2, and that is the sharpest thing in this file: "it won't be long now" IS the duration
// violation and it carries a negator, so a blanket exemption would wave the exact sentence
// through. Those two bans use a NARROW exemption instead — only a first-person decline by
// Evelyn ("I won't…", "no reader can…", "nobody can…") is exempt. See DECLINE below.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const { DECKS, TAROT_HOOKS, SELF_FRAME_HOOKS } = await import('@/content/tarotReads');

const DECK = 'return-mhf' as const;
const CARDS = ['a', 'b', 'c'] as const;
const DRAFTS = new URL('../fb-tarot/docs/drafts/rewrites/', import.meta.url);

// The four bands, pinned. A band gains a hook only by a decision, not by a well-meaning edit.
const BANDS = {
  '25-44': ['cards-slipping-past', 'cards-choosing-wrong'],
  '45-54': ['cards-found-me-yet', 'cards-keeps-waiting', 'cards-missed-chance'],
  '55-64': ['cards-after-marriage', 'cards-second-time', 'cards-best-years'],
  '65+': ['cards-too-late-love', 'cards-longer-to-wait', 'cards-allowed-to-want'],
} as const;
const HOOKS = Object.values(BANDS).flat();

// The four HOW-LONG rungs. Ban 1 is absolute on all eight, but these are the ones whose ad
// asks for a length outright, so they are also asserted to DECLINE it out loud (see below).
const HOW_LONG = ['cards-keeps-waiting', 'cards-second-time', 'cards-longer-to-wait'] as const;
// The two whose headline presumes a prior marriage without saying how it ended.
const MARRIAGE = ['cards-after-marriage', 'cards-second-time', 'cards-best-years'] as const;
// The 65+ rung — age, mortality and (via the same VOC pull) health sit under all three.
const OLDEST = ['cards-too-late-love', 'cards-longer-to-wait', 'cards-allowed-to-want'] as const;

const HEADLINES: Record<string, string> = {
  'cards-slipping-past': 'Why does my soulmate keep slipping past me?',
  'cards-choosing-wrong': 'What keeps me choosing everyone but my soulmate?',
  'cards-found-me-yet': "Why hasn't my soulmate found me yet?",
  'cards-keeps-waiting': 'How long does a soulmate keep you waiting?',
  'cards-after-marriage': 'Is there a soulmate for me after the marriage ended?',
  'cards-second-time': 'How long does it take to find a soulmate the second time?',
  'cards-too-late-love': 'Is it too late to meet my soulmate?',
  'cards-longer-to-wait': 'How much longer do I have to wait for my soulmate?',
  'cards-missed-chance': 'Is my soulmate still coming, or have I already missed him?',
  'cards-best-years': "Why did I give my best years to someone who wasn't my soulmate?",
  'cards-allowed-to-want': 'Am I still allowed to want a soulmate?',
};

// ⚠ NAME COLLISIONS, pinned because both were live traps. The obvious names for the 65+ pair
// — `cards-too-late` and `cards-how-much-longer` — are ALREADY TAKEN BY MONEY LANDERS. Wiring
// under either would serve a woman asking about love a reading about her pension, and
// hookToBucket() would happily route it.
const STOLEN_BY_MONEY = { 'cards-too-late-love': 'cards-too-late', 'cards-longer-to-wait': 'cards-how-much-longer' } as const;
// ⚠ A THIRD near-collision, pinned for the same reason. `cards-missed-chance` sits one word
// away from the LIVE `cards-met-already` ("Have I already met my soulmate without realizing
// it?") — different question, different read, and the two would be read for each other in
// every report. So the obvious name `cards-already-missed` is banned outright.
const NEAR_MISS_NAMES = ['cards-already-missed', 'cards-met-already'] as const;

// 7 draft bubbles -> the 4 registry beats; beat 3 carries bubbles 3-6, joined at wiring time.
// Same fold as scripts/wire-drafts-setup.mts, so what is asserted here is what gets wired.
const toBeats = (b: string[]) => [b[0], b[1], b.slice(2, 6).join('\n'), b[6]];

const wiredReads: Record<string, Record<string, string[]>> = (DECKS as any)[DECK]?.reads ?? {};
const source: Record<string, 'registry' | 'draft'> = {};
const reads: Record<string, Record<string, string[]>> = {};
for (const h of HOOKS) {
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
// ⚠ MEMOISED. This file sweeps 8 hooks x 3 cards against every live hook on the deck; the
// naive version rebuilt both run-sets per pair, passed alone and TIMED OUT inside a full
// `vitest run`, which reads as a copy failure and is not one. Same fix as the money file.
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

const clausesOf = (s: string) => s.split(/[—;:,.\n]/);
// The BROAD exemption, for the bans where naming-in-order-to-refuse is the only risk.
const NEGATOR =
  /\b(no|not|never|can't|cannot|n't|nor|nobody|no one|none|nothing|neither|without|rather than|instead of|refuses?|declines?)\b/i;
// 🔴 The NARROW exemption, for bans 1 and 2. Only EVELYN DECLINING is exempt — a subject that
// is her, or "no reader"/"nobody". "It won't be long now" has a negator and is NOT a decline,
// which is the entire point: that sentence is the violation ban 1 exists to catch.
const DECLINE =
  /\b(i (won'?t|will not|can'?t|cannot|could not|couldn'?t)|no (honest )?reader|nobody|no one|anyone who|there (is|'s) no\b|there isn'?t|this card (gives|has|does|never)|was never built|doesn'?t exist)\b/i;
// ⚠ SEPARATE FROM `DECLINE`, ON PURPOSE, and the distinction is load-bearing. `DECLINE` is an
// EXEMPTION — every phrase added to it is a hole punched in ban 1, so it stays narrow.
// `REFUSES_LENGTH` is a PRESENCE assertion (did the read decline out loud?) and may be broad,
// because widening it can only ever demand MORE of the copy. Merging the two would mean every
// new way of saying "I can't tell you" also became a new way to smuggle a duration past ban 1.
const REFUSES_LENGTH =
  /\b(i (won'?t|will not|can'?t|cannot)|no (honest )?reader|nobody|no one|no clock|no number|no length|no rule|gives no|there (is|'s) no\b|there isn'?t|doesn'?t exist|was never built)\b/i;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
// Restating her own ad back to her is the bridge's job (cut 2) and is never an assertion —
// an assertion is not a substring of the headline she clicked.
const isRestatement = (clause: string, hook: string) => {
  const c = norm(clause);
  if (c.length > 0 && norm(HEADLINES[hook]).includes(c)) return true;
  // 🔴 THE BRIDGE EXEMPTION, added 2026-08-20 after this bit twice. Cut 2's whole job is to
  // say her ad question back to her, and it always opens "You asked …" — which is never a
  // SUBSTRING of the headline, so the check above can never exempt it. That is fine until an
  // ad contains a banned idea, and two now do: "Do I need to HEAL BEFORE my soulmate
  // arrives?" trips the healing gate, "Is MY ENERGY KEEPING my soulmate away?" trips the
  // energy blame — on all three cards, in Evelyn's mouth, for quoting the ad she clicked.
  // So: a clause that opens "You asked" and is otherwise made of the headline's own words is
  // her question coming back, not Evelyn asserting it. Content words only, 70% of them, so a
  // clause that smuggles in anything NEW still gets swept.
  if (!/^you asked\b/.test(c)) return false;
  const head = new Set(norm(HEADLINES[hook]).split(' '));
  const mine = c.replace(/^you asked (if|why|what|how|whether|when) ?/, '').split(' ').filter(Boolean);
  if (!mine.length) return false;
  const shared = mine.filter((w) => head.has(w) || head.has(w.replace(/s$/, '')) || w === 'your' && head.has('my'));
  return shared.length / mine.length >= 0.7;
};

type Ban = [RegExp, string];
const sweepWith = (exempt: RegExp, bans: Ban[], hooks: readonly string[] = HOOKS) => {
  const hits: string[] = [];
  for (const h of hooks) for (const c of CARDS) for (const beat of reads[h][c]) {
    for (const clause of clausesOf(beat)) {
      if (exempt.test(clause) || isRestatement(clause, h)) continue;
      for (const [re, why] of bans) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
    }
  }
  return hits;
};
const sweep = (bans: Ban[], hooks?: readonly string[]) => sweepWith(NEGATOR, bans, hooks);
const sweepStrict = (bans: Ban[], hooks?: readonly string[]) => sweepWith(DECLINE, bans, hooks);

// ── Exported so the deliberate-violation proof below uses the SAME machinery ──────────────
const DURATION_BANS: Ban[] = [
  [/\b(soon|shortly|before long|any day now|any time now)\b/i, 'a length in soft clothes'],
  [/\bnot (much |too )?long( now)?\b/i, 'a length in soft clothes'],
  // 🔴 Found by this file's own proof test, not by review. "it won't be long now" carries the
  // negator on the VERB, so neither the blanket exemption nor a "not long" pattern touches it —
  // and it is the single most natural way for a model to answer a HOW-LONG ad.
  [/\b(won'?t|will ?n'?t|will not|isn'?t|is not|ain'?t) (be )?long\b/i, 'a length in soft clothes'],
  [/\blong now\b/i, 'a length in soft clothes'],
  // 🔴 THE BLUNT ONE, and it is blunt on purpose. The proof test below kept finding spans this
  // file's cleverer patterns missed ("a few months at most" defeats every quantifier pattern
  // written for "a month"/"three months"). A family whose defining ban is NO LENGTH has no
  // legitimate use for a unit of measurement, so the unit itself is banned rather than the
  // shapes it appears in. Verified against the copy before adding: ZERO of the 168 bubbles
  // contains one. `time` is deliberately NOT here — "each time", "the timing broke" and the
  // `second time` headline all need it, and none of them measures anything.
  // ⚠ SPLIT OUT of DURATION_BANS, because one lander cannot obey it. `cards-best-years` has
  // the word in its own ad ("Why did I give my BEST YEARS to someone who wasn't my soulmate?")
  // and its whole subject is time already spent. A unit pointing BACKWARDS measures nothing
  // she can act on and predicts nothing — every forward-looking span, date and soft length in
  // DURATION_BANS still applies to it, and is asserted below.
  [/\b(hours?|days?|weeks?|months?|decades?|seasons?)\b/i, 'a unit of time — this family may not measure'],
  [/\bwithin (a|the|another|\d)/i, 'a span'],
  [/\bin (a|the|another|\d+)\s*(few\s*)?(day|week|month|year|season|winter|summer|spring|autumn)/i, 'a span'],
  [/\b(a|one|two|three|four|five|six|ten|twelve)\s+(more\s+)?(day|week|month|year)s?\b/i, 'a span'],
  [/\b\d+\s*(day|week|month|year)/i, 'a span'],
  [/\b(days|weeks|months|years)\s+(away|from now|left|to wait|of waiting)\b/i, 'a span'],
  [/\bby (christmas|new year|spring|summer|autumn|winter|the end of)\b/i, 'a dated prediction'],
  [/\bthis (year|spring|summer|autumn|winter)\b/i, 'a dated prediction'],
  [/\b(it|he|she|they) (will|'ll) (be|come|arrive|get here) (soon|shortly)\b/i, 'a dated prediction'],
  [/\bhalf ?way there\b|\balmost there\b|\bnearly there\b/i, 'a position on a timeline she can read as a length'],
];

const BLAME_BANS: Ban[] = [
  [/\byou (keep|kept) (choosing|picking|attracting)\b/i, 'accepts the premise that she chose'],
  [/\byou attract\b|\bwhat you put out\b|\blaw of attraction\b/i, 'the manifesting blame'],
  [/\bself.?sabotag|\byour (walls|wall|guard) (are|is)\b/i, 'blames her'],
  [/\byou (are|'re) (too )?(picky|closed off|guarded|negative|bitter|afraid of love)\b/i, 'diagnoses her'],
  [/\byou (do not|don'?t) love yourself\b|\byour self.?worth\b|\byou don'?t (feel|think) you deserve\b/i, 'diagnoses her'],
  [/\byou (are|'re) not ready\b|\byou (need|have) to heal (first|before)\b/i, 'gates love on her fixing herself'],
  [/\byou push(ed)? them away\b|\byou drove (him|them) away\b/i, 'blames her'],
  [/\byour (energy|vibration|mindset) is (the|what|why)\b/i, 'blames her energy'],
  [/\byou should have\b|\bif only you had\b/i, 'grades her past choices'],
  [/\byour (attachment|abandonment) (style|wound|issues)\b/i, 'a diagnosis, and not one a card can make'],
];

describe(`soulmate age-band — loaded from ${[...new Set(Object.values(source))].join(' + ')}`, () => {
  it('covers all eleven landers, from a source that actually exists', () => {
    expect(HOOKS.length, 'the batch is eleven landers').toBe(11);
    expect(new Set(HOOKS).size, 'a hook is listed twice').toBe(11);
    // 25-44 runs two rungs (WHY x2); the other three run all three (WHY / HOW-LONG / BINARY).
    expect(BANDS['25-44'].length, '25-44 is two landers').toBe(2);
    for (const b of ['45-54', '55-64', '65+'] as const) expect(BANDS[b].length, `${b} is three landers`).toBe(3);
    for (const h of HOOKS) {
      expect(reads[h], `${h} has no reads from either source`).toBeTruthy();
      for (const c of CARDS) expect(reads[h][c]?.length, `${h}/${c} is not 4 beats`).toBe(4);
    }
  });

  // ⚠ The name-collision pin. Vacuous while unwired; load-bearing the moment someone wires
  // the 65+ pair under the "obvious" names, which belong to MONEY landers.
  it('the 65+ pair never takes the money landers\' hook names', () => {
    for (const [ours, theirs] of Object.entries(STOLEN_BY_MONEY)) {
      expect(HOOKS, `${ours} is the love hook; ${theirs} is the money one`).toContain(ours as never);
      expect(HOOKS, `${theirs} is a MONEY hook and must never appear in this batch`).not.toContain(theirs as never);
      if (source[ours] === 'registry') {
        expect(reads[ours], `${ours} must have its own reads, separate from ${theirs}`).not.toEqual(wiredReads[theirs]);
      }
    }
  });

  // 🔴🔴 THE FRAME PIN. SELF_FRAME_TAROT_HOOKS (server/lib/prompts.ts) swaps "tendency, never a
  // verdict" for "affirm the hopeful yes with CERTAINTY". Certainty is exactly wrong here:
  // aimed at cards-choosing-wrong it certifies a verdict about real men she has known, and
  // aimed at the 65+ pair it promises an arrival to someone asking whether time has run out.
  // 🔴 If a future edit adds any of these to SELF_FRAME_HOOKS the reads stay word-for-word the
  // same and the live Version-C prompt quietly loses every ban below.
  it('none of the eleven is a SELF-FRAME hook', () => {
    for (const h of HOOKS) {
      expect(SELF_FRAME_HOOKS as readonly string[], `${h} must not inherit the CERTAINTY clause`).not.toContain(h);
    }
  });

  it('any hook that HAS been wired is in the roster and reports the love bucket', async () => {
    const { hookToBucket } = await import('@/content/tarotReads');
    for (const h of HOOKS) {
      if (source[h] !== 'registry') continue;
      expect(TAROT_HOOKS as readonly string[], `${h} has reads but is missing from TAROT_HOOKS`).toContain(h);
      expect(hookToBucket(h as never), `${h} is a love lander`).toBe('love');
    }
  });

  // ── Structure ────────────────────────────────────────────────────────────────────────
  it('every read has the 4-beat shape, the face-DOWN verb and the open loop', () => {
    expect(DECKS[DECK].facing, 'these are face-down cards — she TURNED one').toBe('down');
    for (const h of HOOKS) for (const c of CARDS) {
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

  // The Natural Tarot-Cut chain. Without it the four middle bubbles read as four separate
  // copywriting lines sitting next to each other — measured at 12% on the pre-2026-08-19 batch.
  it('beat 3 runs as one causal chain — so / and / but / that is why', () => {
    for (const h of HOOKS) for (const c of CARDS) {
      const [b3, b4, b5, b6] = reads[h][c][2].split('\n');
      expect(b3, `${h}/${c} cut 3 must ANSWER`).toMatch(/^So\b/);
      expect(b4, `${h}/${c} cut 4 must deepen`).toMatch(/^And\b/);
      expect(b5, `${h}/${c} cut 5 must turn`).toMatch(/^But\b/);
      expect(b6, `${h}/${c} cut 6 must explain what she has lived`).toMatch(/^That'?s why\b/i);
    }
  });

  it('she hears her own ad back in beats 1-2 (message scent)', () => {
    const STOP = new Set('is my the a an it or i ive did just this close to what does say why how long has been from me still will keep about years for going in of and something he him her ever'.split(' '));
    for (const h of HOOKS) {
      const key = words(HEADLINES[h]).filter((w) => !STOP.has(w) && w.length > 2);
      for (const c of CARDS) {
        const opening = `${reads[h][c][0]} ${reads[h][c][1]}`.toLowerCase();
        expect(key.some((k) => opening.includes(k.slice(0, 5))), `${h}/${c} never says her question back`).toBe(true);
      }
    }
  });

  // She is LOOKING at the card while she reads beat 1. A detail reused from another lander is
  // the one thing on the page she can check, spent twice.
  it('beat 1 art lines are unique across the whole deck', () => {
    const seen = new Map<string, string>();
    for (const [h, byCard] of Object.entries(wiredReads)) {
      if (HOOKS.includes(h as never)) continue;
      for (const c of CARDS) { const l = byCard[c]?.[0]; if (l) seen.set(l, `${h}/${c}`); }
    }
    const dupes: string[] = [];
    for (const h of HOOKS) for (const c of CARDS) {
      const other = seen.get(reads[h][c][0]);
      if (other) dupes.push(`${h}/${c} reuses ${other}: "${reads[h][c][0]}"`);
      seen.set(reads[h][c][0], `${h}/${c}`);
    }
    expect(dupes, `recycled art:\n${dupes.join('\n')}`).toEqual([]);
  });

  it('beat 3 shares no 6-word run between the eight, or with the live deck', () => {
    const found: string[] = [];
    for (let i = 0; i < HOOKS.length; i++) for (let j = i + 1; j < HOOKS.length; j++) for (const c of CARDS) {
      for (const r of shared(reads[HOOKS[i]][c][2], reads[HOOKS[j]][c][2]))
        found.push(`${HOOKS[i]}/${c} ~ ${HOOKS[j]}/${c}: "${r}"`);
    }
    for (const h of HOOKS) for (const c of CARDS) for (const other of TAROT_HOOKS as readonly string[]) {
      if (HOOKS.includes(other as never)) continue;
      const beat = wiredReads[other]?.[c]?.[2];
      if (!beat) continue;
      for (const r of shared(reads[h][c][2], beat)) found.push(`${h}/${c} ~ ${other}/${c} (live): "${r}"`);
    }
    expect(found, `recycled wording:\n${found.join('\n')}`).toEqual([]);
  });

  // ── BAN 1 — NO DURATION ────────────────────────────────────────────────────────────────
  // 🔴🔴 The defining ban of this batch. Uses the NARROW exemption: "it won't be long now"
  // carries a negator and IS the violation.
  it('never gives a length of time, in any form', () => {
    const hits = sweepStrict(DURATION_BANS);
    // "years"/"year" is banned on all ten OTHER landers; cards-best-years is exempt only from
    // the bare unit, never from a span or a date (both of which DURATION_BANS still sweeps).
    const YEARS: Ban[] = [[/\byears?\b/i, 'a unit of time — this family may not measure']];
    hits.push(...sweepStrict(YEARS, HOOKS.filter((h) => h !== 'cards-best-years')));
    expect(hits, `a duration:\n${hits.join('\n')}`).toEqual([]);
  });

  // The refusal must be VISIBLE, not a sidestep — a quiet change of subject on a HOW-LONG ad
  // reads as evasion and she feels conned. Same treatment cards-alone-forever gets.
  it('the HOW-LONG landers decline the length OUT LOUD, on every card', () => {
    for (const h of HOW_LONG) for (const c of CARDS) {
      expect(reads[h][c][2], `${h}/${c} sidesteps the question instead of declining it`).toMatch(REFUSES_LENGTH);
    }
  });

  // ── BAN 2 — NO SELF-BLAME ──────────────────────────────────────────────────────────────
  // 🔴🔴 Also the narrow exemption: "you don't love yourself enough" carries a negator.
  it('never blames her and never diagnoses her', () => {
    const hits = sweepStrict(BLAME_BANS);
    expect(hits, `blame:\n${hits.join('\n')}`).toEqual([]);
  });

  // cards-choosing-wrong's headline HANDS the model the self-blame. Cut 3 must refuse the
  // premise outright rather than merely avoiding the banned words.
  it('cards-choosing-wrong refuses the premise that she chose, on every card', () => {
    for (const c of CARDS) {
      const b3 = reads['cards-choosing-wrong'][c][2].split('\n')[0];
      expect(b3, `choosing-wrong/${c} cut 3 must say it was not her choosing`).toMatch(
        /\b(did ?n'?t choose|not (in )?your choosing|were not (picking|choosing)|was ?n'?t your|not the reason)\b/i,
      );
    }
  });

  // ── BAN 3 — NO MEDIUMSHIP ──────────────────────────────────────────────────────────────
  it('never contacts, speaks for or locates the dead', () => {
    const hits = sweep([
      [/\b(he|she|they) (is|are|'s) (at peace|watching over|with you still|on the other side)\b/i, 'mediumship'],
      [/\bwatching over you\b|\bfrom the other side\b|\bin spirit\b|\bcrossed over\b/i, 'mediumship'],
      [/\b(he|she|they) (would want|wants) you to\b/i, 'speaks for the dead'],
      [/\b(he|she|they) sent you (here|to me)\b/i, 'speaks for the dead'],
      [/\byour (late|departed) (husband|wife|partner)\b/i, 'presumes and addresses a death'],
      [/\bhe (has |'s )?passed\b|\bsince (he|she) died\b|\bafter (he|she) died\b/i, 'presumes a death'],
    ]);
    expect(hits, `mediumship:\n${hits.join('\n')}`).toEqual([]);
  });

  // ── BAN 4 — NO HEALTH, NO FERTILITY ───────────────────────────────────────────────────
  // Meta-prohibited personal attributes, and the sm-too-late pull is full of both.
  it('never mentions health, a body or children', () => {
    const hits = sweep([
      [/\b(illness|ill health|cancer|stroke|transplant|surgery|diagnosis|disabled|disability)\b/i, 'health'],
      [/\byour (health|body|heart condition|treatment|recovery)\b/i, 'health'],
      [/\b(fertility|conceive|a baby|babies|children of your own|start a family)\b/i, 'fertility'],
      [/\bwhile you (are|'re) still (well|able|healthy)\b/i, 'health'],
    ]);
    expect(hits, `health / fertility:\n${hits.join('\n')}`).toEqual([]);
  });

  // ── BAN 5 — NO AGE, NO NUMBER ─────────────────────────────────────────────────────────
  it('never names her age, a decade or a count', () => {
    const hits = sweep([
      [/\bat your age\b|\byour age\b|\btoo old\b|\bat (sixty|seventy|eighty|fifty|forty)\b/i, 'names her age'],
      [/\bin your (fifties|sixties|seventies|eighties|forties)\b/i, 'names a decade'],
      [/\byou (are|'re) \d+\b|\b\d{2} years old\b/i, 'names her age'],
      [/\b(this|the) (first|second|third) (time|man|one) will\b/i, 'a numbered prediction'],
    ], OLDEST);
    expect(hits, `age / number:\n${hits.join('\n')}`).toEqual([]);
  });

  // Both verdicts are harm on cards-too-late-love: "yes, too late" is cruelty and "no, someone
  // is coming" is a promise. What IS allowed (2026-08-19 directional loosening for loneliness
  // and searching): the CARD does not show a door that has shut.
  it('cards-too-late-love agrees with neither verdict', () => {
    const hits = sweep([
      [/\b(it|this) (is|'s|was) too late\b/i, 'the cruelty direction'],
      [/\btoo late for you\b|\byou (have|'ve) (missed|run out of) \b/i, 'the cruelty direction'],
      [/\b(he|she|they) (is|are|'s) coming\b|\bwill (find|come to|arrive for) you\b/i, 'a promised arrival'],
      [/\byou will (meet|find) (him|them|someone)\b/i, 'a promised arrival'],
    ], ['cards-too-late-love']);
    expect(hits, `a verdict either way:\n${hits.join('\n')}`).toEqual([]);
  });

  // ── BAN 6 — NO PRESUMPTION ABOUT THE MARRIAGE ────────────────────────────────────────
  it('never presumes HOW the marriage ended', () => {
    const hits = sweep([
      [/\byour (divorce|ex|ex.husband|marriage breakdown)\b/i, 'presumes divorce'],
      [/\bwhen he left\b|\bhe walked out\b|\bthe day he left\b/i, 'presumes he left'],
      [/\byou left him\b|\byou walked (out|away)\b/i, 'presumes she left'],
      [/\bwhen you lost him\b|\bafter you lost him\b/i, 'presumes a death'],
      [/\bthe man who (left|hurt|failed) you\b/i, 'rules on the man she has not described'],
    ], MARRIAGE);
    expect(hits, `presumed how it ended:\n${hits.join('\n')}`).toEqual([]);
  });

  // ── BAN 7 — NO PLACE, STRATEGY, FATE, OR VERDICT ON A REAL MAN ───────────────────────
  // Each of these is a failure mode a neighbouring soulmate family found the hard way.
  it('never names a place (the soulmate-where gap)', () => {
    const hits = sweep([
      [/\b(at|in) (your|the) (work|workplace|office|church|gym|neighbourhood|neighborhood)\b/i, 'a place'],
      [/\balready in your (circle|life|world)\b|\bsomeone you already know\b/i, 'a locatable person'],
      [/\bcloser to home\b|\bright under your nose\b|\bin your own town\b/i, 'a place'],
      [/\byou (will|'ll) meet (him|them) (at|in|through)\b/i, 'a place'],
    ]);
    expect(hits, `a place:\n${hits.join('\n')}`).toEqual([]);
  });

  it('hands her no strategy — this is a reading, not advice', () => {
    const hits = sweep([
      [/\b(get|go) out more\b|\btry (the apps|online dating|a dating)\b/i, 'strategy'],
      [/\byou (should|need to|must|ought to) (try|start|stop|open|put yourself)\b/i, 'strategy'],
      [/\bput yourself out there\b|\bwiden your (search|circle)\b|\blower your standards\b/i, 'strategy'],
      [/\bwork on yourself\b|\blove yourself first\b/i, 'strategy, and blame wearing a kind face'],
    ]);
    expect(hits, `strategy:\n${hits.join('\n')}`).toEqual([]);
  });

  // Fate is banned for the same reason it is banned on the loneliness family: it makes her
  // suffering purposeful and assigns it to her.
  it('never makes the waiting purposeful', () => {
    const hits = sweep([
      [/\bmeant to be\b|\bmeant to happen\b|\bfor a reason\b/i, 'fate'],
      [/\bthe universe (has|is|wants|knows)\b|\bdivine timing\b/i, 'fate'],
      [/\b(this|it) (is|was) preparing you\b|\byou had to go through\b/i, 'makes the suffering purposeful'],
      [/\beverything happens\b/i, 'fate'],
    ]);
    expect(hits, `fate:\n${hits.join('\n')}`).toEqual([]);
  });

  // The men in cards-choosing-wrong's VOC include scammers and abusers. The read describes what
  // was SHOWN to her; it never rules on who any of them is, in either direction.
  // ── 🔴 THE HER-AS-SUBJECT RULE (operator 2026-08-19: "soulmate landers are not about will
  // we get back together") ────────────────────────────────────────────────────────────────
  // The return-mhf figures are all male, so leaning on one as the SUBJECT of the read turns a
  // soulmate lander into reunion copy: a reader hears a specific man who is stalled, held, or
  // on his way. Measured on the first draft of this batch — 36 of 144 cuts 2-7 put the figure
  // in the subject slot, roughly double the shipped soulmate families, and the worst line
  // ("So he is walking, dear. He's on the road, and he did not stop.") is a promise about a
  // man she has never met.
  //
  // ⚠ Cut 1 is EXEMPT — describing the male figure IS the picture, and that is its job. The
  // ban applies from cut 2 on, which in registry terms is beats 2-4.
  it('never gives the card figure intent or motion — cuts 2-7, she is the subject', () => {
    const ACTOR: Ban[] = [
      [/\bhe (is |'s )?(walking|coming|moving|stepping|going|on his way|nearly|almost)\b/i, 'the figure is en route to her'],
      [/\bhe (can'?t|cannot|couldn'?t) (reach|get|see|find|come)\b/i, 'the figure is blocked from reaching her'],
      [/\bhe (is|'s) (stopped|stuck|held|waiting|trapped|frozen)\b/i, 'the figure is a stalled man'],
      [/\bhe (isn'?t|is not|hasn'?t|has not|didn'?t|did not) (falling|fallen|stopped|turned back|given up|left)\b/i, 'the figure is a man who has not given up on her'],
      [/\bhe (wants|feels|knows|remembers|misses|chose|picks)\b/i, 'the figure has been given an inner life'],
      [/\bthe (fool|magician|hanged man) (is |'s )?(walking|coming|waiting|looking|watching|choosing|counting)\b/i, 'the named figure is acting'],
    ];
    // beats 2-4 only; beat 1 is the picture and is allowed the figure outright.
    const hits: string[] = [];
    for (const h of HOOKS) for (const c of CARDS) for (const beat of reads[h][c].slice(1)) {
      for (const clause of clausesOf(beat)) {
        for (const [re, why] of ACTOR) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, 'the card figure was written as an actor — this reads as reunion copy').toEqual([]);
  });

  // Density, not just shape. A read can obey every pattern above and still be about him.
  // Benchmark, measured on the shipped soulmate families at the time this was written:
  // soulmate-where 0.41, loneliness 0.52, after-loss 0.63 he/him/his per registry beat 2-4.
  // This batch is written to sit UNDER the lowest of them.
  it('leans on the male figure less than the shipped soulmate families do', () => {
    let n = 0;
    let beats = 0;
    for (const h of HOOKS) for (const c of CARDS) {
      n += (reads[h][c].slice(1).join(' ').match(/\b(he|him|his)\b/gi) ?? []).length;
      beats += 3;
    }
    expect(n / beats, `${n} he/him/his across ${beats} beats — the shipped floor is 0.41/beat`).toBeLessThan(0.41);
  });

  // ── cards-missed-chance ─────────────────────────────────────────────────────────────────
  // 🔴 The VOC pull for "already missed" is full of a SPECIFIC remembered man — "the one that
  // got away" — and when she names him he is very often married ("by the time I met him 44
  // years ago he was married") or the man who abandoned her. A read that says he is still
  // coming points her at a real, contactable, unavailable person. That is cards-back-together
  // territory. 🔴 And "I've already missed the opportunity to have children. I'm 45 now."
  // is the one window in the pull that genuinely closed — Meta-prohibited, and no hopeful half.
  it('cards-missed-chance never revives a remembered man, and never says she missed', () => {
    const hits = sweep([
      [/\bhe (is|'s|was) still (there|coming|yours|waiting)\b/i, 'points her at a remembered man'],
      [/\bthe one (that|who) got away\b/i, "revives 'the one that got away'"],
      [/\bgo back to\b|\breach out to\b|\bcontact (him|them)\b/i, 'sends her to a real person'],
      [/\byou (missed|have missed|'ve missed) (him|them|it|your chance)\b/i, 'the banned half of the binary'],
      [/\btoo late\b/i, 'the banned half of the binary'],
    ], ['cards-missed-chance']);
    expect(hits, 'cards-missed-chance').toEqual([]);
  });

  // ── cards-best-years ────────────────────────────────────────────────────────────────────
  // 🔴 She is often STILL IN IT — "married 35 years to a man who doesn't really value me",
  // "I am married but there is no love there... I can't leave". The headline is past tense and
  // a large share of the traffic is not. 🔴 And the years may never be made purposeful: the
  // pull carries abuse, fraud, and a man she visited in prison and funded weekly.
  it('cards-best-years never closes the relationship and never makes the years a lesson', () => {
    const hits = sweep([
      [/\bnow (that )?(it|that)('s| is) over\b|\bnow you'?re free\b|\bthat chapter is (closed|over)\b/i, 'presumes she has left'],
      [/\bwalk away\b|\bleave him\b|\btime to go\b|\bstart over\b/i, 'tells her to leave'],
      [/\b(for a reason|meant to teach|had to happen|needed to learn|the lesson)\b/i, 'makes the suffering purposeful'],
      [/\byou (stayed|allowed|let him)\b/i, 'blames her for the years'],
    ], ['cards-best-years']);
    expect(hits, 'cards-best-years').toEqual([]);
  });

  // ── cards-allowed-to-want ───────────────────────────────────────────────────────────────
  // ⭐ The only lander in the batch that answers a PERMISSION question, so it is the only one
  // whose cut 3 must NOT predict an arrival — answering the wrong question throws away the
  // whole reason the headline is different. 🔴 And the pull is the most bereaved of the
  // eleven, the most explicit about her looks ("what age has done to my face and body"), and
  // it contains men and a same-sex partnership — so the soulmate is never gendered.
  it('cards-allowed-to-want predicts nothing, and never mentions her looks', () => {
    const hits = sweep([
      [/\b(is|are|'s) (still )?(coming|on the way|out there)\b/i, 'answers with a prediction she did not ask for'],
      [/\byou will (meet|find|have|be loved)\b|\bthey'?re coming\b/i, 'answers with a prediction she did not ask for'],
      [/\b(beautiful|attractive|lovely to look at|your face|your body|your looks|young at heart)\b/i, 'her looks — a lie she can check in a mirror'],
      [/\bhe\b|\bhim\b|\bhis (love|heart|arms)\b|\ba man\b/i, 'genders a soulmate this pull does not gender'],
      [/\byou (deserve|have every right|are allowed)\b/i, 'certifies her instead of describing her'],
    ], ['cards-allowed-to-want']);
    expect(hits, 'cards-allowed-to-want').toEqual([]);
  });

  it('the near-miss name cards-already-missed is never used', () => {
    expect(HOOKS, 'cards-already-missed is one word from the live cards-met-already').not.toContain(NEAR_MISS_NAMES[0] as never);
    expect(HOOKS, 'cards-met-already is a LIVE hook and must never appear in this batch').not.toContain(NEAR_MISS_NAMES[1] as never);
  });

  it('never rules on a real man, in either direction', () => {
    const hits = sweep([
      [/\bhe (is|was) (a )?(liar|abusive|dangerous|a narcissist|toxic|bad for you)\b/i, 'convicts a real man'],
      [/\bhe (is|was) (a )?(good|kind|honest|safe) (man|one)\b/i, 'vouches for a real man'],
      [/\bhe (loves|loved) you\b|\bhe never (loved|cared)\b/i, 'a verdict on his feelings'],
      [/\bhe (is|'s) the one\b|\bhe (is|'s) your soulmate\b/i, 'certifies a real man as the soulmate'],
    ]);
    expect(hits, `a verdict on a real man:\n${hits.join('\n')}`).toEqual([]);
  });

  // ── 🔴 THE PROOF ─────────────────────────────────────────────────────────────────────
  // The handoff's standing warning: an unwired family is checked by NOTHING, and a gate that
  // silently passes is worse than no gate. These feed the SAME sweeps a deliberate violation
  // and assert they BITE. If someone later loosens DECLINE, NEGATOR or clausesOf into
  // uselessness, these fail before the real copy does.
  describe('the guards themselves bite', () => {
    const fake = (text: string) => {
      const hits: string[] = [];
      for (const clause of clausesOf(text)) {
        if (DECLINE.test(clause)) continue;
        for (const [re, why] of DURATION_BANS) if (re.test(clause)) hits.push(why);
      }
      return hits;
    };

    it('catches a duration hiding behind a negator — the exact hole a blanket exemption leaves', () => {
      // Both carry "won't"/"not". Neither is Evelyn declining. Both must be caught.
      expect(fake("But it won't be long now, dear."), '"not long now" walked through').not.toEqual([]);
      expect(fake('And he is not far off — a few months at most, dear.'), 'a span walked through').not.toEqual([]);
      expect(fake('So he will be here by summer, dear.'), 'a dated prediction walked through').not.toEqual([]);
      expect(fake('And you are almost there, dear.'), 'a timeline position walked through').not.toEqual([]);
    });

    it('still lets Evelyn decline the length out loud', () => {
      expect(fake("So I won't put a number on it, dear. No honest reader would."), 'the refusal was flagged').toEqual([]);
      expect(fake("So there's no number here, dear."), 'the refusal was flagged').toEqual([]);
    });

    it('catches blame hiding behind a negator', () => {
      const blame = (text: string) => {
        const hits: string[] = [];
        for (const clause of clausesOf(text)) {
          if (DECLINE.test(clause)) continue;
          for (const [re, why] of BLAME_BANS) if (re.test(clause)) hits.push(why);
        }
        return hits;
      };
      expect(blame("But you don't love yourself enough yet, dear."), 'self-worth blame walked through').not.toEqual([]);
      expect(blame('And you keep choosing the same man, dear.'), 'accepted her premise').not.toEqual([]);
      expect(blame('But you are not ready, dear.'), 'gated love on her healing').not.toEqual([]);
      // …and the real copy's refusal of the same idea is still allowed.
      expect(blame("So you didn't choose them, dear."), 'the refusal was flagged').toEqual([]);
    });

    it('reads the DRAFT json while the family is unwired, so none of this is vacuous', () => {
      const unwired = HOOKS.filter((h) => source[h] === 'draft');
      const wired = HOOKS.filter((h) => source[h] === 'registry');
      expect(unwired.length + wired.length, 'every hook resolved to a source').toBe(11);
      for (const h of unwired) {
        expect(reads[h].a[0], `${h} loaded an empty draft`).toMatch(/^You turned /);
      }
    });
  });
});
