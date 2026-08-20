// Copy guards for the /fb-tarot SOULMATE KEYWORD batch (test B, 2026-08-20).
//
// EIGHT landers on the face-down `return-mhf` deck, two per keyword — blocked, connection,
// energy, healing — each at BINARY and WHY. Test B in docs/fb-ad-test-queue.md holds age
// constant and varies the WORD: identity/outcome (*soulmate*) against practice.
//
// ⚠ NO VOC PULL SITS BEHIND THIS BATCH. The eleven age-band landers were derived from 438
// real buyer concerns; these eight were written from the money family's proven shape and the
// standing soulmate bans, at the operator's direction. A theme pull on **connection** and
// **healing** should run before either takes spend, and the bans below are the interim floor.
//
// ── THE TWO STRUCTURAL FACTS THAT SHAPE EVERY BAN HERE ────────────────────────────────
//
// 1. 🔴🔴 SIX OF THE EIGHT HEADLINES ASK TO BE BLAMED, and the affirmative is banned
//    funnel-wide. "Is my energy keeping my soulmate away?", "Do I need to heal before my
//    soulmate arrives?", "Is my soulmate waiting for me to heal?" — every shipped soulmate
//    family bans blocks, walls, standards, not-being-ready, self-love-first and manifesting,
//    because she arrives already holding all of it.
//
//    But a bare "no, it wasn't you" RESTATES `cards-not-found-yet`, whose whole finding is
//    that there is no fault to hand her — six landers saying one thing makes the keyword
//    test unreadable. So these use the money family's move instead, proven on the identical
//    headline: `cards-my-energy` turns the keyword from an accusation into an ASSET and then
//    names a thief ("the energy is the tool… yours has been pouring out… something has been
//    taking it"). The guards below therefore assert BOTH halves — the blame is absent AND
//    the read does not simply stop at the denial.
//
// 2. 🔴🔴 THE TWO CONNECTION HOOKS ARE DECODE-HIM AND THE OTHER SIX ARE NOT. "This
//    connection" means a real, specific man exists and may be asked something; the other six
//    have nobody in them. One test, two frames — `cards-connection-soulmate` and
//    `cards-connection-nothing` are deliberately ABSENT from SOULMATE_KEYWORD_TAROT_HOOKS
//    (server/lib/prompts.ts) so they fall through to decode-him, and this file pins that
//    split. Drift either way is a safety defect: put the six under decode-him and the model
//    reads them as being about a man who does not exist; put the two under the keyword frame
//    and a real, frequently unavailable man loses the tendency-never-a-verdict guard.
//
// 🔴 FIVE OF THE EIGHT ARE THE LIVE MONEY LANDERS WITH ONE NOUN SWAPPED — `cards-my-energy`
// is "Is my energy blocking my money?" and `cards-money-wont-stay` is "What does my energy
// say about why money won't stay?". check-collisions caught 25 shared six-word runs on the
// first pass, six of them where cards-energy-away had reproduced the money lander's actual
// sentences rather than just its move. The beat-3 uniqueness guard below is what holds that.
//
// 🔴 NEGATION-AWARE, as in every sibling guard: correct copy here routinely contains a banned
// phrase inside a refusal ("Your energy has never been the block"). The sweep exempts a
// clause carrying a negator, and the assertions that must survive a negator are written as
// PRESENCE checks instead.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const { DECKS, TAROT_HOOKS, SELF_FRAME_HOOKS } = await import('@/content/tarotReads');

const DECK = 'return-mhf' as const;
const CARDS = ['a', 'b', 'c'] as const;
const DRAFTS = new URL('../fb-tarot/docs/drafts/rewrites/', import.meta.url);

// The four keywords, pinned. A keyword gains a hook only by a decision, not by a stray edit.
const KEYWORDS = {
  blocked: ['cards-blocking-soulmate', 'cards-blocked-before'],
  connection: ['cards-connection-soulmate', 'cards-connection-nothing'],
  energy: ['cards-energy-away', 'cards-energy-soulmate'],
  healing: ['cards-waiting-to-heal', 'cards-heal-first'],
} as const;
const HOOKS = Object.values(KEYWORDS).flat();

// The six with nobody in them. MUST match SOULMATE_KEYWORD_TAROT_HOOKS in prompts.ts.
const NO_MAN = [...KEYWORDS.blocked, ...KEYWORDS.energy, ...KEYWORDS.healing] as const;
// The two with a real man in them. MUST fall through to decode-him.
const DECODE_HIM = KEYWORDS.connection;
// The FOUR whose headline asks her to be blamed — not all six no-man hooks, and the two
// exclusions are the point:
//
//   · `cards-energy-soulmate` — "What does my energy SAY about my soulmate?" There is no
//     accusation in that sentence. She is asking to have her energy READ, the way you read a
//     card, and a read that spends itself refusing a charge nobody made has answered the
//     wrong question. It is held to the blame and coaching bans like everything else; it is
//     not held to the name-a-thief requirement, because it has no thief to name.
//   · `cards-blocked-before` — asks WHY the block repeats, not whether she is it. Its finding
//     is the position of the repeat; the thief requirement would push it into a second answer.
const HER_FAULT = ['cards-blocking-soulmate', 'cards-energy-away', ...KEYWORDS.healing] as const;

const HEADLINES_B: Record<string, string> = {
  'cards-blocking-soulmate': 'Is something blocking me from meeting my soulmate?',
  'cards-blocked-before': 'Why do I keep getting blocked before my soulmate arrives?',
  'cards-connection-soulmate': 'Is this connection my soulmate, or something else?',
  'cards-connection-nothing': 'Why does this connection feel like my soulmate when nothing is happening?',
  'cards-energy-away': 'Is my energy keeping my soulmate away?',
  'cards-energy-soulmate': 'What does my energy say about my soulmate?',
  'cards-waiting-to-heal': 'Is my soulmate waiting for me to heal?',
  'cards-heal-first': 'Do I need to heal before my soulmate arrives?',
};

// ⚠ NAME COLLISIONS WITH THE MONEY FAMILY, pinned. These love hooks must never take the
// money landers' names, and the money landers must never appear in this batch.
const MONEY_TWINS = ['cards-my-energy', 'cards-money-wont-stay', 'cards-too-late', 'cards-nest-egg', 'cards-energy-how-long'] as const;

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
const runsOf = (str: string, n = 6) => {
  const w = words(str);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
};
const clausesOf = (s: string) => s.split(/[—;:,.\n]/);
const NEGATOR =
  /\b(no|not|never|can't|cannot|n't|nor|nobody|no one|none|nothing|neither|without|rather than|instead of|refuses?|declines?)\b/i;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const isRestatement = (clause: string, hook: string) => {
  const c = norm(clause);
  if (c.length > 0 && norm(HEADLINES_B[hook]).includes(c)) return true;
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
  const head = new Set(norm(HEADLINES_B[hook]).split(' '));
  const mine = c.replace(/^you asked (if|why|what|how|whether|when) ?/, '').split(' ').filter(Boolean);
  if (!mine.length) return false;
  const shared = mine.filter((w) => head.has(w) || head.has(w.replace(/s$/, '')) || w === 'your' && head.has('my'));
  return shared.length / mine.length >= 0.7;
};

type Ban = [RegExp, string];
const sweep = (bans: Ban[], hooks: readonly string[] = HOOKS) => {
  const hits: string[] = [];
  for (const h of hooks) for (const c of CARDS) for (const beat of reads[h][c]) {
    for (const clause of clausesOf(beat)) {
      if (NEGATOR.test(clause) || isRestatement(clause, h)) continue;
      for (const [re, why] of bans) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
    }
  }
  return hits;
};

// 🔴 WHAT CUT 7 MUST DO, checked structurally rather than by vocabulary — and the first
// version of this guard got that wrong in an instructive way. It looked for thief-words
// ("taking it", "drawing on") in beat 3, on the theory that a read which only denies the
// blame has restated cards-not-found-yet. The theory is right; the instrument was not. Every
// one of these twelve cards DOES name the obstruction — "where the block is actually
// sitting", "what keeps moving that bar", "what is still in that bundle" — and it names it
// in CUT 7, because that is cut 7's defined job (fb-tarot/docs/natural-tarot-cut.md: "cut 7
// names an OBSTRUCTION, and it is NARROW"). Chasing the vocabulary meant four rounds of
// widening a regex against copy that was already correct.
//
// So the assertion is the framework's own rule: cut 7 points at a THING, narrowly, and never
// at a person.
const OPENS_THE_LOOP = /^Let me look closer at /;
// 🔴 NEVER A WHO. Found by this guard on cards-waiting-to-heal/a, which asked "who first put
// you at the back of the queue" — that invites her to name a real person (the pull for these
// headlines is full of friends, adult children and a mother), and naming a real person as the
// block is banned funnel-wide. Cut 7 asks what, where, or which thing. Never who.
const NAMES_A_PERSON = /\bwho\b/i;
// A cut 7 that could be pasted onto any lander on the funnel has not done the narrowing.
const TOO_GENERIC = /at what(?:'s| is| has been)? ?(between you|in your way|going on|holding you back|stopping this|blocking you)…?$/i;

const BLAME_BANS: Ban[] = [
  [/\byour (energy|vibration|mindset|aura|frequency) is (the|what|why|keeping|blocking)\b/i, 'blames her energy'],
  [/\byou (are|'re) (too )?(picky|closed off|guarded|negative|bitter|blocked)\b/i, 'diagnoses her'],
  [/\byou (need|have) to heal\b|\bheal (first|before)\b/i, 'gates love on her healing'],
  [/\byou (do not|don'?t) love yourself\b|\byour self.?worth\b/i, 'diagnoses her'],
  [/\byou attract\b|\bwhat you put out\b|\blaw of attraction\b|\bself.?sabotag/i, 'the manifesting blame'],
  [/\byour (walls|wall|guard|baggage) (are|is)\b/i, 'blames her'],
  [/\byou (keep|kept) (choosing|picking|pushing)\b/i, 'blames her'],
];

// 🔴 BANS THAT CARRY THEIR OWN NEGATOR GET NO EXEMPTION AT ALL. Found by the tripwire on
// 2026-08-20: "But you are not ready yet, dear" sailed through every blame check, because the
// blanket negator exemption saw the "not" and waved the clause past. The sentence IS the
// violation. Same structural trap the duration ban documents ("it won't be long now"), and it
// was masked here because the existing BLAME tripwire case tripped a second pattern in the
// same sentence — exactly what the tripwire header warns about.
//
// There is no legitimate copy on these families containing "you are not ready/healed/whole"
// or "you don't love yourself", in a refusal or otherwise, so these sweep unexempted.
const NEGATED_BLAME_BANS: Ban[] = [
  [/\byou (are|'re|were) not (ready|healed|whole|enough)\b/i, 'rules on her readiness'],
  [/\byou (do not|don'?t|did not|didn'?t) love yourself\b/i, 'diagnoses her'],
  [/\byou (have|haven'?t|has not|have not) (done|healed) (the work|enough)\b/i, 'grades her healing'],
];
const sweepAlways = (bans: Ban[], hooks: readonly string[] = HOOKS) => {
  const hits: string[] = [];
  for (const h of hooks) for (const c of CARDS) for (const beat of reads[h][c]) {
    for (const clause of clausesOf(beat)) {
      if (isRestatement(clause, h)) continue;
      for (const [re, why] of bans) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
    }
  }
  return hits;
};

const COACHING_BANS: Ban[] = [
  [/\b(get out more|put yourself out there|work on yourself|try the apps|stop looking|stop trying|just live your life|do the work)\b/i, 'coaching'],
  [/\b(raise|lift|protect|clear|shield) your (energy|vibration|aura|frequency)\b/i, 'an energy practice'],
  [/\b(cord.?cutting|inner child|nervous system|shadow work|trauma|attachment style|therapy|therapist|diagnos)/i, 'therapy or diagnosis language'],
  [/\bit (comes|happens|will come) when you (stop|least|aren'?t)\b/i, 'the kindest-sounding tactic, still a tactic'],
];

const UNIVERSAL_BANS: Ban[] = [
  [/\b(soon|shortly|before long|any day now)\b/i, 'a length in soft clothes'],
  [/\b\d+\s*(day|week|month|year)|\b(days|weeks|months|years) (away|from now|left)\b/i, 'a span'],
  [/\bby (christmas|new year|spring|summer|autumn|winter|the end of)\b/i, 'a dated prediction'],
  [/\b(he|she|they) (is|'s) (at peace|watching over|with you still)\b|\bwould want you to\b/i, 'mediumship'],
  [/\b(someone you already know|in your circle|close to home|the same town|next door)\b/i, 'places a person'],
];

describe(`soulmate keyword (test B) — loaded from ${[...new Set(Object.values(source))].join(' + ')}`, () => {
  it('covers all eight landers, two per keyword, from a source that exists', () => {
    expect(HOOKS.length, 'the batch is eight landers').toBe(8);
    expect(new Set(HOOKS).size, 'a hook is listed twice').toBe(8);
    for (const [kw, hooks] of Object.entries(KEYWORDS)) expect(hooks.length, `${kw} is two landers`).toBe(2);
    for (const h of HOOKS) {
      expect(reads[h], `${h} has no reads from either source`).toBeTruthy();
      for (const c of CARDS) expect(reads[h][c]?.length, `${h}/${c} is not 4 beats`).toBe(4);
    }
  });

  it('never takes a money lander\'s hook name', () => {
    for (const twin of MONEY_TWINS) {
      expect(HOOKS, `${twin} is a MONEY hook and must never appear in this batch`).not.toContain(twin as never);
    }
  });

  it('any hook that HAS been wired is in the roster and is not self-frame', () => {
    for (const h of HOOKS) {
      if (source[h] !== 'registry') continue;
      expect(TAROT_HOOKS as readonly string[], `${h} has reads but is missing from TAROT_HOOKS`).toContain(h);
      expect(SELF_FRAME_HOOKS as readonly string[], `${h} must not inherit the CERTAINTY clause`).not.toContain(h);
    }
  });

  // 🔴🔴 THE FRAME SPLIT. This is the assertion that keeps one test running two frames.
  it('the six no-man hooks are in the keyword frame and the two connection hooks are NOT', async () => {
    const src = readFileSync(new URL('../server/lib/prompts.ts', import.meta.url), 'utf8');
    const block = src.match(/const SOULMATE_KEYWORD_TAROT_HOOKS = new Set\(\[([\s\S]*?)\]\)/);
    expect(block, 'SOULMATE_KEYWORD_TAROT_HOOKS is missing from prompts.ts').toBeTruthy();
    for (const h of NO_MAN) {
      expect(block![1], `${h} has no man in it — outside the frame it inherits decode-him and the model invents one`).toContain(`'${h}'`);
    }
    for (const h of DECODE_HIM) {
      expect(block![1], `${h} has a REAL man in it — inside the frame he loses the tendency-never-a-verdict guard`).not.toContain(`'${h}'`);
    }
  });

  it('every read has the 4-beat shape, the face-DOWN verb and the open loop', () => {
    for (const h of HOOKS) for (const c of CARDS) {
      const [b1, b2, , b4] = reads[h][c];
      expect(b1, `${h}/${c} beat 1 must open on the turned card`).toMatch(/^You turned the /);
      expect(b2, `${h}/${c} beat 2 must bridge from her question`).toMatch(/^You asked /);
      expect(b4, `${h}/${c} beat 4 must leave the loop open`).toMatch(/…$/);
    }
  });

  it('beat 3 runs as one causal chain — so / and / but / that is why', () => {
    for (const h of HOOKS) for (const c of CARDS) {
      const [b3, b4, b5, b6] = reads[h][c][2].split('\n');
      expect(b3, `${h}/${c} cut 3 must answer`).toMatch(/^So /);
      expect(b4, `${h}/${c} cut 4 must deepen`).toMatch(/^And /);
      expect(b5, `${h}/${c} cut 5 must turn`).toMatch(/^But /);
      expect(b6, `${h}/${c} cut 6 must explain what she has lived`).toMatch(/^That's why /);
    }
  });

  it('beat 1 art lines are unique across the whole deck', () => {
    const seen = new Map<string, string>();
    for (const [h, byCard] of Object.entries(wiredReads)) {
      if (HOOKS.includes(h as never)) continue;
      for (const c of CARDS) { const l = byCard[c]?.[0]; if (l) seen.set(l, `${h}/${c}`); }
    }
    for (const h of HOOKS) for (const c of CARDS) {
      const line = reads[h][c][0];
      expect(seen.get(line), `${h}/${c} reuses the art line already spent on ${seen.get(line)}`).toBeUndefined();
      seen.set(line, `${h}/${c}`);
    }
  });

  // 🔴 The money-twin guard. Five of these headlines are a money lander with one noun
  // swapped, so this is the assertion that keeps the READS apart.
  it('shares no six-word run with the money landers it was cloned from', () => {
    const hits: string[] = [];
    for (const h of HOOKS) for (const c of CARDS) {
      const mine = runsOf(reads[h][c][2]);
      for (const twin of MONEY_TWINS) {
        const theirs = wiredReads[twin]?.[c]?.[2];
        if (!theirs) continue;
        for (const r of runsOf(theirs)) if (mine.has(r)) hits.push(`${h}/${c} ~ ${twin}/${c}: "${r}"`);
      }
    }
    expect(hits, `a money lander's sentences were reused:\n${hits.join('\n')}`).toEqual([]);
  });

  it('never blames her and never diagnoses her', () => {
    const hits = [...sweep(BLAME_BANS), ...sweepAlways(NEGATED_BLAME_BANS)];
    expect(hits, `blame:\n${hits.join('\n')}`).toEqual([]);
  });

  it('hands her no practice, no tactic and no therapy language', () => {
    const hits = sweep(COACHING_BANS);
    expect(hits, `coaching:\n${hits.join('\n')}`).toEqual([]);
  });

  it('gives no duration, no date, no mediumship and no place', () => {
    const hits = sweep(UNIVERSAL_BANS);
    expect(hits, `a universal ban:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 THE HALF THAT IS EASY TO FORGET. Refusing the blame is necessary and not sufficient —
  // a read that only denies restates cards-not-found-yet and wastes the keyword. What stops
  // that is cut 7 naming the obstruction, so that is what gets asserted, on all eight.
  it('cut 7 names a narrow obstruction — a what, never a who', () => {
    for (const h of HOOKS) for (const c of CARDS) {
      const cut7 = reads[h][c][3];
      expect(OPENS_THE_LOOP.test(cut7), `${h}/${c} cut 7 must open the next loop:\n${cut7}`).toBe(true);
      expect(
        NAMES_A_PERSON.test(cut7),
        `${h}/${c} cut 7 asks WHO — that points her at a real person, and naming one as the block is banned funnel-wide:\n${cut7}`,
      ).toBe(false);
      expect(
        TOO_GENERIC.test(cut7),
        `${h}/${c} cut 7 could be pasted onto any lander on the funnel — narrow it:\n${cut7}`,
      ).toBe(false);
    }
  });

  // 🔴 Her feeling may never be the warrant — on the connection hooks she can act on it with
  // a married man or a scammer, and the decode-him guard's "HER intuition is a real
  // instrument" clause pulls straight against this.
  it('the connection landers never make her feeling the proof, and never certify her', () => {
    const hits = sweep([
      [/\ba feeling (that|this) strong\b|\byour (heart|gut|feeling) (knows|is telling you|would not)\b/i, 'her feeling as the proof'],
      [/\byou (are|'re) not (imagining|making it up|crazy|mad)\b/i, 'certifies her instead of describing her'],
      [/\byou (have been|'ve been) right\b|\byou were right\b/i, 'the psychic ruling on her'],
      [/\bhe (loves|feels) (you|it too)\b|\bhe (is|'s) coming back\b/i, 'a verdict on a real man'],
    ], DECODE_HIM);
    expect(hits, `connection:\n${hits.join('\n')}`).toEqual([]);
  });

  // 🔴 The her-as-subject rule, carried over from the age-band batch: the return-mhf figures
  // are all male, so an ACTOR in cuts 2-7 turns a soulmate lander into reunion copy.
  it('never gives the card figure intent or motion — cuts 2-7, she is the subject', () => {
    const ACTOR: Ban[] = [
      [/\bhe (is |'s )?(walking|coming|moving|stepping|going|on his way|nearly|almost)\b/i, 'the figure is en route to her'],
      [/\bhe (can'?t|cannot|couldn'?t) (reach|get|find|come)\b/i, 'the figure is blocked from reaching her'],
      [/\bhe (is|'s) (stopped|stuck|held|waiting|trapped|frozen)\b/i, 'the figure is a stalled man'],
      [/\bhe (wants|feels|knows|remembers|misses|chose|picks)\b/i, 'the figure has been given an inner life'],
    ];
    const hits: string[] = [];
    for (const h of HOOKS) for (const c of CARDS) for (const beat of reads[h][c].slice(1)) {
      for (const clause of clausesOf(beat)) {
        for (const [re, why] of ACTOR) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
      }
    }
    expect(hits, `the card figure was written as an actor — this reads as reunion copy`).toEqual([]);
  });

  // ── Proof the guard bites. See scripts/guard-tripwire.mjs for the same discipline
  //    applied to the real copy; these are unit-level and run in-process.
  describe('the guards actually catch things', () => {
    const fake = (text: string, bans: Ban[]) => {
      const hits: string[] = [];
      for (const clause of clausesOf(text)) {
        if (NEGATOR.test(clause)) continue;
        for (const [re, why] of bans) if (re.test(clause)) hits.push(why);
      }
      return hits;
    };
    it('catches the blame these headlines invite', () => {
      expect(fake('And your energy is keeping him away, dear.', BLAME_BANS), 'energy blame walked through').not.toEqual([]);
      expect(fake('But you have to heal first, dear.', BLAME_BANS), 'the healing gate walked through').not.toEqual([]);
      // …and the real copy's refusal of the same idea is still allowed through.
      expect(fake('So no, dear. Your energy has never been the block.', BLAME_BANS), 'the refusal was flagged').toEqual([]);
    });
    it('catches a practice dressed as kindness', () => {
      expect(fake('And it comes when you stop looking, dear.', COACHING_BANS), 'the kind tactic walked through').not.toEqual([]);
      expect(fake('But raise your energy first, dear.', COACHING_BANS), 'an energy practice walked through').not.toEqual([]);
    });
    it('the cut-7 checks fail a who and a generic', () => {
      expect(NAMES_A_PERSON.test('Let me look closer at who put you last…'), 'a WHO walked through').toBe(true);
      expect(TOO_GENERIC.test('Let me look closer at what is in your way…'), 'a generic walked through').toBe(true);
      // …and a real one from the copy is still allowed.
      expect(NAMES_A_PERSON.test('Let me look closer at what keeps moving that bar…')).toBe(false);
      expect(TOO_GENERIC.test('Let me look closer at what keeps moving that bar…')).toBe(false);
    });
  });
});
