// Copy guards for the /fb-tarot "November four" batch (Joel, 2026-11-05).
//
// METHOD: Natural Tarot-Cut (7 cuts folded to 4 beats) — fb-tarot/docs/natural-tarot-cut.md.
// Cut 3 ANSWERS her question flat; cut 7 names a narrow obstruction. All four are VERSION C
// landers (TAROT_C_EXEMPT_HOOKS), so on live traffic these canned reads are what she sees
// only if the Version C reply fails (tarotReflectFallback) or on a /b URL. The live reply is
// governed by the frame + tendency in server/lib/prompts.ts, which this file also pins.
//
// FOUR landers on the face-down `return-mhf` deck, four DIFFERENT frames — they are a batch
// by date, not a family by question, so each one carries its own bans below:
//
//   cards-end-same-way          LONELINESS_TAROT_HOOKS          never give her a cause or a "pattern"
//   cards-give-more             SOULMATE_KEYWORD_TAROT_HOOKS    never grade her giving; never a future man
//   cards-marry-more-than-once  SOULMATE_AGEBAND_TAROT_HOOKS    never COUNT marriages; never end one
//   cards-more-affection        PARTNERED_TAROT_HOOKS (new)     never point her outside the relationship
//
// VOC: fb-tarot/docs/drafts/rewrites/_voc-4hooks-2026-11-05.md (pulled 2026-11-05, all `ok`).
//
// 🔴🔴 THE SHARPEST BAN IN THE BATCH. Two buyers in the more-affection pull were being worked
// by a romance scammer who had stepped into a marriage gone without affection. A line like
// "you deserve the touch he won't give" can be acted on toward the man online. So the
// OUTSIDE-THE-RELATIONSHIP ban sweeps with NO negator exemption: there is no legitimate copy
// here that mentions someone else, elsewhere, online, or another man, refused or not.
//
// 🔴 NEGATION-AWARE otherwise, as in every sibling guard: correct copy refuses banned ideas
// ("Your need for affection isn't too much"), so the general sweeps skip a clause with a
// negator, and the bans that must survive a negator sweep unexempted (sweepAlways).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const { DECKS, TAROT_HOOKS, SELF_FRAME_HOOKS, HEADLINES, openerCStart } = await import('@/content/tarotReads');
// TAROT_QUESTION is module-private; openerCStart() is what the live page calls, so read it through that.
const TAROT_QUESTION: Record<string, string> = {};
for (const h of ['cards-end-same-way', 'cards-give-more', 'cards-marry-more-than-once', 'cards-more-affection']) {
  try { TAROT_QUESTION[h] = (openerCStart as any)('return-mhf', h, 'a')[1]; } catch { /* unwired */ }
}

const DECK = 'return-mhf' as const;
const CARDS = ['a', 'b', 'c'] as const;
const DRAFTS = new URL('../fb-tarot/docs/drafts/rewrites/', import.meta.url);

// @roster-start — the batch's members. Tooling reads between these markers.
const HOOKS = [
  'cards-end-same-way',
  'cards-give-more',
  'cards-marry-more-than-once',
  'cards-more-affection',
] as const;
// @roster-end

// Which frame Set each hook MUST sit in (and no other). Drift is a safety defect: outside its
// frame a hook falls through to decode-him ("This reading is about HIM") and the model speaks
// for a man — on more-affection, for her real partner.
const FRAME_OF: Record<(typeof HOOKS)[number], string> = {
  'cards-end-same-way': 'LONELINESS_TAROT_HOOKS',
  'cards-give-more': 'SOULMATE_KEYWORD_TAROT_HOOKS',
  'cards-marry-more-than-once': 'SOULMATE_AGEBAND_TAROT_HOOKS',
  'cards-more-affection': 'PARTNERED_TAROT_HOOKS',
};
const FRAME_SETS = [
  'MONEY_TAROT_HOOKS', 'PARTNERED_TAROT_HOOKS', 'AFTER_LOSS_TAROT_HOOKS', 'SOULMATE_AGEBAND_TAROT_HOOKS',
  'SOULMATE_KEYWORD_TAROT_HOOKS', 'SOULMATE_WHERE_TAROT_HOOKS', 'LONELINESS_TAROT_HOOKS',
];

// Money-family names this batch must never take (cards-too-late etc. would serve a love
// reader a pension reading).
const MONEY_TWINS = ['cards-too-late', 'cards-how-much-longer', 'cards-my-energy', 'cards-nest-egg'] as const;

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

const clausesOf = (s: string) => s.split(/[—;:,.\n?]/);
const NEGATOR =
  /\b(no|not|never|can't|cannot|n't|nor|nobody|no one|none|nothing|neither|without|rather than|instead of)\b|n't\b/i;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// A clause that is her own ad question said back (cut 2's job) is not Evelyn asserting it.
// Content words only, 70% from the headline, with the I/you person flip — same rule as the
// sibling guards, so "You asked if you'll marry more than once" is not a COUNT.
const PERSON: Record<string, string> = { i: 'you', my: 'your', me: 'you', mine: 'yours', am: 'are', ll: 'll' };
const stemOf = (w: string) => w.replace(/(ing|ed|s)$/, '');
const sameWord = (w: string, head: Set<string>) => {
  const forms = new Set([w, PERSON[w] ?? w, stemOf(w), stemOf(PERSON[w] ?? w)]);
  for (const h of head) if (forms.has(h) || forms.has(PERSON[h] ?? h) || forms.has(stemOf(h))) return true;
  return false;
};
const FILLER = new Set(['you', 'asked', 'ask', 'asking', 'and', 'why', 'if', 'whether', 'wonder', 're', 'want', 'to', 'know', 'll', 'the', 'do', 'does']);
const isRestatement = (clause: string, hook: string) => {
  const head = new Set(norm((HEADLINES as any)[hook] ?? '').split(' '));
  const mine = norm(clause).split(' ').filter((w) => w && !FILLER.has(w));
  if (!mine.length) return false;
  return mine.filter((w) => sameWord(w, head)).length / mine.length >= 0.7;
};

type Ban = [RegExp, string];
const sweep = (bans: Ban[], hooks: readonly string[] = HOOKS, always = false) => {
  const hits: string[] = [];
  for (const h of hooks) for (const c of CARDS) for (const beat of reads[h][c]) {
    for (const clause of clausesOf(beat)) {
      if (isRestatement(clause, h)) continue;
      if (!always && NEGATOR.test(clause)) continue;
      for (const [re, why] of bans) if (re.test(clause)) hits.push(`${h}/${c} (${why}): "${clause.trim()}"`);
    }
  }
  return hits;
};

// ── BANS SHARED BY ALL FOUR ─────────────────────────────────────────────────────────────
const UNIVERSAL_BANS: Ban[] = [
  [/\b(soon|shortly|before long|any day now|in time)\b/i, 'a length in soft clothes'],
  [/\b\d+\s*(day|week|month|year)|\b(days|weeks|months|years) (away|from now|left)\b/i, 'a span'],
  [/\bby (christmas|new year|spring|summer|autumn|winter|the end of)\b/i, 'a dated prediction'],
  [/\b(at peace|watching over|from the other side|would want you to)\b/i, 'mediumship'],
  [/\b(meant to be|written in the stars|destin(y|ed)|the universe (has|is|wants))\b/i, 'fate'],
  [/\b(your|his|her|their) (health|illness|medication|dementia|body)\b/i, 'health or body (Meta)'],
];
const THERAPY_BANS: Ban[] = [
  [/\b(attachment|anxious|avoidant|trauma|wounds?|toxic|narcissis\w*|codependen\w*|therapy|therapist|diagnos\w*|do the work|inner child|boundaries|self.?worth|self.?esteem)\b/i, 'therapy or diagnosis language'],
];
const TACTIC_BANS: Ban[] = [
  [/\b(talk to (him|her|them|your partner)|love languages?|date nights?|ask for what you need|give less|stop giving|put yourself out there|try the apps|work on yourself)\b/i, 'hands her a tactic'],
];
const RULING_BANS: Ban[] = [
  [/\b(you should|it'?s time to) (leave|stay|go|walk away|end it)\b|\bwalk away\b/i, 'rules on staying or leaving'],
  [/\b(it|this|the (marriage|relationship)) (will|is going to) (end|last|work out|fall apart)\b/i, 'predicts a relationship ending or lasting'],
];

// ── PER-HOOK BANS ───────────────────────────────────────────────────────────────────────
// end-same-way: no cause, in any form, however kind. The pull arrived already told "you have a
// pattern" by another reader, and mostly the same ending was HIS act (cheating, leaving).
const SAME_WAY_BANS: Ban[] = [
  [/\b(pattern|cycle|repeating|on repeat|break the)\b/i, 'hands her a pattern/cycle'],
  [/\byou (keep |always )?(choos|pick|attract|draw|push|sabotag|let)\w*/i, 'gives her the cause'],
  [/\b(you choose wrong|wrong (men|man|ones))\b/i, 'blames her choosing'],
];
const SAME_WAY_ALWAYS: Ban[] = [
  [/\b(they|he|the men) (were|was) (never )?(cheat\w*|liars?|no good|unworthy|users?)\b/i, 'judges the men'],
];

// give-more: never grade her giving; never send her to a future person.
const GIVE_MORE_BANS: Ban[] = [
  [/\b(too much|too generous|too giving|too soft|people.?please\w*|doormat|one.?sided)\b/i, 'grades her giving'],
  [/\b(you give too|stop giving|give less|hold back more)\b/i, 'tells her to give less'],
];
const GIVE_MORE_ALWAYS: Ban[] = [
  [/\b(the love that matches|someone (who|that) (will|would|gives)|the right (man|one|person)|a man who|he never deserved|that (was|is)n'?t love)\b/i, 'future person, or rules on the relationship'],
];

// marry-more-than-once: never count. Every buyer said "again"; "more than once" is the
// headline's count and the read may only say it back, never answer it.
const MARRY_ALWAYS: Ban[] = [
  [/\b(twice|once more|a second (time|husband|marriage|wife)|second husband|next husband|another (husband|marriage|wedding))\b/i, 'counts marriages'],
  [/\b(marry|married|love|wed) again\b/i, 'says marriage comes again — a count'],
  [/\b(your )?(divorce|ex.?husband|late husband|widow\w*|when he (died|passed|left))\b/i, 'presumes how a marriage ended'],
  [/\b(your (current )?(marriage|husband) (is|will be) (over|ending|done))\b/i, 'ends her marriage'],
];

// more-affection: the partnered frame.
const AFFECTION_BANS: Ban[] = [
  [/\b(needy|clingy|demanding|insecure|too much|asking too much|expecting too much)\b/i, 'grades her need'],
];
const AFFECTION_ALWAYS: Ban[] = [
  // 🔴🔴 the scam ban — sweeps with NO negator exemption
  [/\b(someone else|somebody else|elsewhere|another (man|person|woman)|someone (out there|new|online)|online|a stranger|deserve(s)? someone|deserve (the|a) (touch|love|man))\b/i, 'points her outside the relationship'],
  [/\b(your partner|he|she|they) (doesn'?t|does not|won'?t|will not|can'?t|isn'?t|is not) (love|want|care|feel|touch|desire)\w*/i, 'speaks for the partner'],
  [/\b(your partner|he|she|they) (is|'s|are) (cold|selfish|withholding|distant|unkind|cruel)\b/i, 'convicts the partner'],
  [/\b(sex|sexual|intimacy|intimate|desire|bed(room)?|making love|libido|passion)\b/i, 'sexual words (Meta)'],
  [/\b(your )?(husband|wife|boyfriend|girlfriend)\b/i, 'genders the partner — "your partner" throughout, as she wrote it'],
];

const FAMILY_BANS: Record<(typeof HOOKS)[number], { exempt: Ban[]; always: Ban[] }> = {
  'cards-end-same-way': { exempt: SAME_WAY_BANS, always: SAME_WAY_ALWAYS },
  'cards-give-more': { exempt: GIVE_MORE_BANS, always: GIVE_MORE_ALWAYS },
  'cards-marry-more-than-once': { exempt: [], always: MARRY_ALWAYS },
  'cards-more-affection': { exempt: AFFECTION_BANS, always: AFFECTION_ALWAYS },
};

// Cut 7 opens a loop onto a THING, narrowly — never a WHO (that invites her to name a real
// person as the block, banned funnel-wide).
const OPENS_THE_LOOP = /^(Let me (look closer at|see) |Now let'?s look at )/;
const NAMES_A_PERSON = /\bwho\b/i;
const TOO_GENERIC = /(look closer at|see|look at) what(?:'s| is| has been)? ?(between you|in your way|going on|holding you back|stopping this|blocking you)…?$/i;

describe(`November four (Natural Tarot-Cut, 4 frames) — loaded from ${[...new Set(Object.values(source))].join(' + ')}`, () => {
  it('covers all four landers, from a source that exists, in the 4-beat shape', () => {
    expect(new Set(HOOKS).size).toBe(4);
    for (const h of HOOKS) {
      expect(reads[h], `${h} has no reads from either source`).toBeTruthy();
      for (const c of CARDS) expect(reads[h][c]?.length, `${h}/${c} is not 4 beats`).toBe(4);
    }
  });

  it('never takes a money lander\'s hook name', () => {
    for (const twin of MONEY_TWINS) expect(HOOKS as readonly string[]).not.toContain(twin);
  });

  it('every wired hook is in TAROT_HOOKS, has a headline and a Version C opener, and is not self-frame', () => {
    for (const h of HOOKS) {
      if (source[h] !== 'registry') continue;
      expect(TAROT_HOOKS as readonly string[], `${h} missing from TAROT_HOOKS`).toContain(h);
      expect((HEADLINES as any)[h], `${h} has no headline`).toBeTruthy();
      expect((TAROT_QUESTION as any)[h], `${h} has no Version C opener — C would fall back to a placeholder`).toBeTruthy();
      expect(SELF_FRAME_HOOKS as readonly string[], `${h} must not inherit the CERTAINTY clause`).not.toContain(h);
    }
  });

  // Operator decision 2026-11-05: each of these four openers restates her question first.
  it('each Version C opener restates her question, then asks one thing', () => {
    for (const h of HOOKS) {
      const q: string = (TAROT_QUESTION as any)[h];
      expect(q, `${h} opener must restate her question`).toMatch(/^You asked /);
      expect(q, `${h} opener must hand over with the standard phrase`).toMatch(/Before I look closer, tell me… /);
      expect((q.match(/\?/g) ?? []).length, `${h} opener must ask exactly one question`).toBe(1);
      expect(NAMES_A_PERSON.test(q.split('tell me…')[1] ?? ''), `${h} opener asks WHO`).toBe(false);
    }
  });

  // 🔴🔴 THE FRAME PIN. Exactly one frame Set, and the right one.
  it('each hook sits in its own frame Set and in no other', () => {
    const src = readFileSync(new URL('../server/lib/prompts.ts', import.meta.url), 'utf8');
    for (const set of FRAME_SETS) {
      const block = src.match(new RegExp(`const ${set} = new Set\\(\\[([\\s\\S]*?)\\]\\)`));
      expect(block, `${set} is missing from prompts.ts`).toBeTruthy();
      for (const h of HOOKS) {
        const inIt = block![1].includes(`'${h}'`);
        expect(inIt, `${h} ${FRAME_OF[h] === set ? 'must be in' : 'must NOT be in'} ${set}`).toBe(FRAME_OF[h] === set);
      }
    }
  });

  // 🔴 The partnered frame only works if it is tested BEFORE decode-him and the soulmate/after-
  // loss branches — first match wins in both ternaries.
  it('the partnered frame is tested right after money in BOTH the frame and guard ternaries', () => {
    const src = readFileSync(new URL('../server/lib/prompts.ts', import.meta.url), 'utf8');
    expect(src, 'partnered flag must read PARTNERED_TAROT_HOOKS').toMatch(/const partnered = PARTNERED_TAROT_HOOKS\.has\(hook\)/);
    for (const line of ['frameLine', 'guardLine']) {
      expect(src, `${line}: money must be the first branch and partnered the second`).toMatch(
        new RegExp(`const ${line} = money\\s*\\?[^\\n]*\\n\\s*: partnered\\s*\\?`),
      );
    }
  });

  it('server context + tendency exist for every hook (the tendency IS the Version C guard)', () => {
    const src = readFileSync(new URL('../server/lib/prompts.ts', import.meta.url), 'utf8');
    for (const h of HOOKS) {
      expect((src.match(new RegExp(`'${h}':`, 'g')) ?? []).length, `${h} needs TAROT_HOOK_CONTEXT + TAROT_HOOK_TENDENCY entries`).toBeGreaterThanOrEqual(2);
    }
  });

  it('every read has the face-down beat 1, a beat 2 bridge, four cuts, and an open loop', () => {
    for (const h of HOOKS) for (const c of CARDS) {
      const [b1, , b3, b4] = reads[h][c];
      expect(b1, `${h}/${c} beat 1 must name the turned card`).toMatch(/\bturned the /);
      expect(b1, `${h}/${c} beat 1 must tell the truth about the blind choice`).toMatch(/face[- ]down|backs?\b|showed its face|single (face|picture)/i);
      const cuts = b3.split('\n');
      expect(cuts.length, `${h}/${c} beat 3 must carry cuts 3-6`).toBe(4);
      for (const [i, cut] of cuts.entries()) expect(cut.trim().length, `${h}/${c} cut ${i + 3} is empty`).toBeGreaterThan(10);
      expect(b4, `${h}/${c} beat 4 must leave the loop open`).toMatch(/…$/);
    }
  });

  it('beat 1 art lines are unique across the whole deck', () => {
    const seen = new Map<string, string>();
    for (const [h, byCard] of Object.entries(wiredReads)) {
      if ((HOOKS as readonly string[]).includes(h)) continue;
      for (const c of CARDS) { const l = byCard[c]?.[0]; if (l) seen.set(l, `${h}/${c}`); }
    }
    for (const h of HOOKS) for (const c of CARDS) {
      const line = reads[h][c][0];
      expect(seen.get(line), `${h}/${c} reuses the art line already spent on ${seen.get(line)}`).toBeUndefined();
      seen.set(line, `${h}/${c}`);
    }
  });

  it('cut 7 names a narrow obstruction — a what, never a who', () => {
    for (const h of HOOKS) for (const c of CARDS) {
      const cut7 = reads[h][c][3];
      expect(OPENS_THE_LOOP.test(cut7), `${h}/${c} cut 7 must open the next loop:\n${cut7}`).toBe(true);
      expect(NAMES_A_PERSON.test(cut7), `${h}/${c} cut 7 asks WHO:\n${cut7}`).toBe(false);
      expect(TOO_GENERIC.test(cut7), `${h}/${c} cut 7 is generic — narrow it:\n${cut7}`).toBe(false);
    }
  });

  it('no duration, date, mediumship, fate or health — on all four', () => {
    const hits = sweep(UNIVERSAL_BANS);
    expect(hits, `universal:\n${hits.join('\n')}`).toEqual([]);
  });

  it('no therapy language, no tactic, no stay/leave ruling — on all four', () => {
    const hits = [...sweep(THERAPY_BANS, HOOKS, true), ...sweep(TACTIC_BANS), ...sweep(RULING_BANS, HOOKS, true)];
    expect(hits, `therapy/tactic/ruling:\n${hits.join('\n')}`).toEqual([]);
  });

  for (const h of HOOKS) {
    it(`${h}: its own bans hold`, () => {
      const hits = [...sweep(FAMILY_BANS[h].exempt, [h]), ...sweep(FAMILY_BANS[h].always, [h], true)];
      expect(hits, `${h}:\n${hits.join('\n')}`).toEqual([]);
    });
  }

  // 🔴 more-affection only: every cut 7 places the affection BETWEEN HER AND HER PARTNER (or
  // "the two of you"). An unanchored "what's kept affection from reaching you" lets a scam
  // reader cast her marriage as the block and the man online as the affection.
  it('more-affection: every cut 7 anchors the affection between her and her partner', () => {
    for (const c of CARDS) {
      const cut7 = reads['cards-more-affection'][c][3];
      expect(cut7, `more-affection/${c} cut 7 is unanchored:\n${cut7}`).toMatch(/\b(between (the two of )?you|with your partner|between you and your partner|the two of you)\b/i);
    }
  });

  describe('the guards actually catch things', () => {
    const one = (text: string, bans: Ban[], always = false) =>
      clausesOf(text).filter((cl) => always || !NEGATOR.test(cl)).flatMap((cl) => bans.filter(([re]) => re.test(cl)).map(([, w]) => w));
    it('catches the scam-shaped line even inside a refusal', () => {
      expect(one('You deserve someone who holds you, dear.', AFFECTION_ALWAYS, true)).not.toEqual([]);
      expect(one('Not online, dear — here.', AFFECTION_ALWAYS, true)).not.toEqual([]);
    });
    it('lets the refusal of a grade through, and catches the grade', () => {
      expect(one("Your need for affection isn't too much.", AFFECTION_BANS)).toEqual([]);
      expect(one('You are a little needy, dear.', AFFECTION_BANS)).not.toEqual([]);
    });
    it('catches a count of marriages and a pattern', () => {
      expect(one('You will marry twice, dear.', MARRY_ALWAYS, true)).not.toEqual([]);
      expect(one('You can love again, dear.', MARRY_ALWAYS, true)).not.toEqual([]);
      expect(one('It is a pattern you keep living, dear.', SAME_WAY_BANS)).not.toEqual([]);
    });
    it('the restatement exemption lets her own question through', () => {
      expect(isRestatement("You asked if you'll marry more than once", 'cards-marry-more-than-once')).toBe(true);
      expect(isRestatement('You will marry twice', 'cards-marry-more-than-once')).toBe(false);
    });
  });
});
