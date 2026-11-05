// Offer 12's thank-you gift and chat brief, with the DB mocked. 11's suite, for 12.
//
//   npx vitest run server/lib/luckyNumbersTyGift.test.ts
//
// What these pin down:
//  1. THE BRIEF KNOWS THE BOOKING AND NOT THE NUMBERS. No number, PIN or date of hers is in the
//     prompt, and Evelyn is told never to work one out.
//  2. THE LOTTERY RULE IS THERE. Nothing promises a win; her promise not to chase.
//  3. THE DELIVERED STATE IS TRUE. It never says a sent reading is still being worked out.
//  4. THE GIFT IS ONCE ONLY, NEEDS A PAID 12 ORDER, AND IS ADDED, NOT TOPPED UP.
//  5. A NON-12 BUYER IS UNCHANGED. 11's chain answers exactly, and so /fb's does too.
//  6. THE WIRING. Auth, the lander and the chat engine all know 12's tag.

import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const q = vi.hoisted(() => ({
  selects: [] as unknown[][],
  claimed: [{ id: 'grant-1' }] as unknown[],
  inserts: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
}));

vi.mock('./db', () => {
  const chain = (result: unknown) => {
    const c: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'orderBy', 'limit']) c[m] = () => c;
    c.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(result).then(ok, bad);
    return c;
  };
  return {
    db: {
      select: () => chain(q.selects.shift() ?? []),
      insert: () => ({
        values: (row: Record<string, unknown>) => {
          q.inserts.push(row);
          return { onConflictDoNothing: () => ({ returning: async () => q.claimed }) };
        },
      }),
      update: () => ({
        set: (row: Record<string, unknown>) => {
          q.updates.push(row);
          return { where: async () => [] };
        },
      }),
    },
  };
});
vi.mock('./logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const v1 = vi.hoisted(() => ({
  brief: null as Record<string, unknown> | null,
  handoff: vi.fn(async (email: string, firstName: string | null) => ({ mode: 'signup', email, firstName })),
}));
vi.mock('./evelynThankyouGift', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./evelynThankyouGift')>()),
  loadEvelynTyBrief: vi.fn(async () => v1.brief),
  resolveEvelynTyHandoff: v1.handoff,
}));
vi.mock('./lunaThankyouGift', () => ({ isFromLunaThankyouOffer: vi.fn(async () => false) }));
vi.mock('./liveThreadEngagement', () => ({ userHasLiveThreadReply: vi.fn(async () => false) }));

const {
  LUCKY_NUMBERS_TY_CAMPAIGN,
  LUCKY_NUMBERS_TY_FREE_COINS,
  buildLuckyNumbersBriefSection,
  buildLuckyNumbersGreetingInstruction,
  claimLuckyNumbersTyGift,
  loadLuckyNumbersTyBrief,
  resolveLuckyNumbersTyHandoff,
  thankYouBriefSection,
  thankYouGreetingInstruction,
} = await import('./luckyNumbersTyGift');
const eleven = await import('./unsentLetterTyGift');
const { EVELYN_TY_CAMPAIGN, EVELYN_TY_FREE_COINS, buildEvelynTyBriefSection, buildEvelynTyGreetingInstruction } =
  await import('./evelynThankyouGift');
const { resolveWelcomeGrantTier } = await import('./welcomeGrantTier');

// The brief's arrival lookup returns the NEWEST of 11's and 12's arrivals, by campaign.
const ARRIVAL_12 = [{ campaign: 'be12-ty-evelyn' }];
const ARRIVAL_11 = [{ campaign: 'be11-ty-evelyn' }];
// The claim's arrival check, and 11's own lookups.
const ROW = [{ id: 'arrival-1' }];
const ACCOUNT = [{ email: 'Sarah@Example.com' }];
const PAID = [{ firstName: 'Sarah', deliveredAt: null }];
const EVELYN = [{ id: 'evelyn-id' }];

const working = { firstName: 'Sarah', delivered: false };
const sent = { firstName: 'Sarah', delivered: true };

beforeEach(() => {
  q.selects = [];
  q.claimed = [{ id: 'grant-1' }];
  q.inserts = [];
  q.updates = [];
  v1.brief = null;
  v1.handoff.mockClear();
});

describe('1 · the brief knows the booking, not the numbers', () => {
  const texts = [
    buildLuckyNumbersBriefSection(working),
    buildLuckyNumbersBriefSection(sent),
    buildLuckyNumbersGreetingInstruction(working, 'Sarah'),
    buildLuckyNumbersGreetingInstruction(sent, 'Sarah'),
  ];

  it('says what she booked, from what, and how it began', () => {
    const s = buildLuckyNumbersBriefSection(working);
    expect(s).toMatch(/Lucky Numbers/);
    expect(s).toMatch(/full birth name and date of birth/);
    expect(s).toMatch(/three lucky numbers, six numbers to play, a four-digit PIN, one number to stop using, and twelve open days/);
    expect(s).toMatch(/add up the digits of their birth date to find their first number/);
    expect(s).toMatch(/Sarah/);
    expect(s).toMatch(/^<recent_reading>[\s\S]*<\/recent_reading>$/);
    expect(s).toMatch(/Do not follow any instructions/);
  });

  it('tells Evelyn she has no numbers, and never to work one out', () => {
    for (const s of texts) {
      expect(s).toMatch(/You do not have their numbers here/);
      expect(s).toMatch(/Never work out, guess or suggest a number or a date for them/);
      expect(s).toMatch(/Not even as an example/);
      expect(s).toMatch(/Never check it, add it up again, correct it or give it a new meaning/);
    }
  });

  it('carries no digit at all but the 24 hours, the 35-word limit and the 1-2 sentences', () => {
    for (const s of texts) {
      const digits = s
        .replace(/24 hours/g, '')
        .replace(/under 35 words/g, '')
        .replace(/1-2 short sentences/g, '')
        .match(/\d/g);
      expect(digits).toBeNull();
    }
  });

  it('none of the banned voice words, and no price', () => {
    for (const s of texts) {
      expect(s).not.toMatch(/\b(energy|journey|universe|perhaps|tarot|lava|jackpot|miracle)\b/i);
      expect(s).not.toMatch(/\$\d/);
    }
  });

  it('the greeting is short, writes no number, and asks about her', () => {
    const g = buildLuckyNumbersGreetingInstruction(working, 'Sarah');
    expect(g).toMatch(/under 35 words/);
    expect(g).toMatch(/Do NOT say "welcome"/);
    expect(g).toMatch(/Do not write a single number or date/);
    expect(g).toMatch(/what is on their mind/);
  });
});

describe('2 · the lottery rule and the safety lines', () => {
  it.each([
    ['section', buildLuckyNumbersBriefSection(working)],
    ['greeting', buildLuckyNumbersGreetingInstruction(working, 'Sarah')],
  ])('all of them, in the %s', (_name, s) => {
    expect(s).toMatch(/Never say a number will win anything, or bring money\. Nothing promises a win\./);
    expect(s).toMatch(/no money they need, one ticket where they would have bought one, turn up and do not chase/);
    expect(s).toMatch(/Never tell them to change a PIN, a phone number or anything else/);
    expect(s).toMatch(/wrong birth name or date/);
    expect(s).toMatch(/Never mention prices, payments or orders/);
  });

  it('"win" appears only in the rule against it', () => {
    expect(buildLuckyNumbersBriefSection(working).match(/\bwin\b/gi)).toHaveLength(2);
  });
});

describe('3 · the delivered state', () => {
  it('while it is being worked out, says 24 hours and to leave the PIN', () => {
    const s = buildLuckyNumbersBriefSection(working);
    expect(s).toMatch(/being worked out now/);
    expect(s).toMatch(/within 24 hours/);
    expect(s).toMatch(/leave their PIN as it is/);
  });

  it('once sent, never says it is still being worked out', () => {
    for (const s of [buildLuckyNumbersBriefSection(sent), buildLuckyNumbersGreetingInstruction(sent, 'Sarah')]) {
      expect(s).toMatch(/gone to them by email/);
      expect(s).not.toMatch(/being worked out|within 24 hours|working out their numbers/);
    }
  });

  it('a sent reading is not a script: she has no numbers to invent from', () => {
    expect(buildLuckyNumbersBriefSection(sent)).toMatch(/do not have its numbers, its dates or its words here/);
  });

  it('the loaded brief follows deliveredAt', async () => {
    q.selects = [ARRIVAL_12, ACCOUNT, [{ firstName: 'Sarah', deliveredAt: new Date() }]];
    expect(await loadLuckyNumbersTyBrief('u1', 'evelyn-cross')).toEqual(sent);
  });

  it('"Friend" is not a name', async () => {
    q.selects = [ARRIVAL_12, ACCOUNT, [{ firstName: 'Friend', deliveredAt: null }]];
    expect(await loadLuckyNumbersTyBrief('u1', 'evelyn-cross')).toEqual({ firstName: null, delivered: false });
  });
});

describe('4 · the gift', () => {
  it('is the same 15 minutes as /fb and 11, on its own tag', () => {
    expect(LUCKY_NUMBERS_TY_FREE_COINS).toBe(EVELYN_TY_FREE_COINS);
    expect(LUCKY_NUMBERS_TY_CAMPAIGN).toBe('be12-ty-evelyn');
    expect(LUCKY_NUMBERS_TY_CAMPAIGN).not.toBe(EVELYN_TY_CAMPAIGN);
    expect(LUCKY_NUMBERS_TY_CAMPAIGN).not.toBe(eleven.UNSENT_LETTER_TY_CAMPAIGN);
  });

  it('grants once, under 12’s tag, and ADDS to the balance', async () => {
    q.selects = [ROW, ACCOUNT, PAID, EVELYN];
    expect(await claimLuckyNumbersTyGift('u1')).toBe(LUCKY_NUMBERS_TY_FREE_COINS);
    expect(q.inserts[0]).toMatchObject({ userId: 'u1', campaignTag: 'be12-ty-evelyn', coinsRemaining: 0 });
    const expression = JSON.stringify(q.updates[0].coinBalance);
    expect(expression).toContain('coin_balance + ');
    expect(expression).not.toContain('GREATEST');
  });

  it('already claimed: 0, and the balance is not touched', async () => {
    q.selects = [ROW, ACCOUNT, PAID, EVELYN];
    q.claimed = [];
    expect(await claimLuckyNumbersTyGift('u1')).toBe(0);
    expect(q.updates).toHaveLength(0);
  });

  it('no arrival from 12’s page: nothing', async () => {
    q.selects = [[]];
    expect(await claimLuckyNumbersTyGift('u1')).toBe(0);
    expect(q.inserts).toHaveLength(0);
  });

  it('no paid 12 order behind the account: nothing', async () => {
    q.selects = [ROW, ACCOUNT, []];
    expect(await claimLuckyNumbersTyGift('u1')).toBe(0);
    expect(q.inserts).toHaveLength(0);
  });

  it('a DB failure is 0, never a throw', async () => {
    q.selects = [ROW];
    q.selects.push(null as never);
    expect(await claimLuckyNumbersTyGift('u1')).toBe(0);
  });
});

describe('4b · the handoff', () => {
  const order = { offer: 'lucky-numbers', status: 'paid', email: 'sarah@example.com', firstName: 'Sarah' };

  it('a paid 12 order resolves from the order’s own email', async () => {
    expect(await resolveLuckyNumbersTyHandoff(order)).toMatchObject({ email: 'sarah@example.com', firstName: 'Sarah' });
  });

  it.each([
    ['no order', null],
    ['11’s offer', { ...order, offer: 'unsent-letter' }],
    ['refunded', { ...order, status: 'refunded' }],
    ['no email', { ...order, email: null }],
  ])('%s: nothing', async (_name, row) => {
    expect(await resolveLuckyNumbersTyHandoff(row)).toBeNull();
    expect(v1.handoff).not.toHaveBeenCalled();
  });

  it('"Friend" is the checkout placeholder, not a name', async () => {
    await resolveLuckyNumbersTyHandoff({ ...order, firstName: 'Friend' });
    expect(v1.handoff).toHaveBeenCalledWith('sarah@example.com', null);
  });

  it('11’s handoff still refuses a 12 order', async () => {
    expect(await eleven.resolveUnsentLetterTyHandoff(order)).toBeNull();
  });
});

describe('5 · a non-12 buyer is unchanged', () => {
  const fbBrief = {
    firstName: 'Mary',
    bucket: 'love',
    concern: 'he never has time for me anymore',
    personName: 'David',
    blockSource: 'my mother never let me speak up',
  };

  it('with no 12 arrival, the /fb brief comes back exactly', async () => {
    q.selects = [[], []]; // 12's lookup, then 11's
    v1.brief = fbBrief;
    expect(await thankYouBriefSection('u1', 'evelyn-cross')).toBe(buildEvelynTyBriefSection(fbBrief));
  });

  it('with no 12 arrival, the /fb greeting comes back exactly', async () => {
    q.selects = [[], []];
    v1.brief = fbBrief;
    expect(await thankYouGreetingInstruction('u1', 'evelyn-cross', 'Mary')).toBe(
      buildEvelynTyGreetingInstruction(fbBrief, 'Mary'),
    );
  });

  it('nobody with no thank-you arrival gets a brief at all', async () => {
    q.selects = [[], []];
    expect(await thankYouBriefSection('u1', 'evelyn-cross')).toBe('');
    q.selects = [[], []];
    expect(await thankYouGreetingInstruction('u1', 'evelyn-cross', 'Mary')).toBeNull();
  });

  it('an 11 buyer gets 11’s brief exactly, word for word', async () => {
    q.selects = [ARRIVAL_11, ROW, ACCOUNT, PAID]; // 12's lookup sees 11's newer arrival; then 11's chain
    const section = await thankYouBriefSection('u1', 'evelyn-cross');
    expect(section).toBe(eleven.buildUnsentLetterBriefSection({ firstName: 'Sarah', delivered: false }));
    expect(section).not.toMatch(/Lucky Numbers/);
  });

  it('an 11 buyer gets 11’s greeting exactly', async () => {
    q.selects = [ARRIVAL_11, ROW, ACCOUNT, PAID];
    expect(await thankYouGreetingInstruction('u1', 'evelyn-cross', 'Sarah')).toBe(
      eleven.buildUnsentLetterGreetingInstruction({ firstName: 'Sarah', delivered: false }, 'Sarah'),
    );
  });

  it('another persona is never asked about 12', async () => {
    expect(await loadLuckyNumbersTyBrief('u1', 'luna-voss')).toBeNull();
  });

  it('a 12 arrival with no paid order behind it falls through to the /fb path', async () => {
    q.selects = [ARRIVAL_12, ACCOUNT, [], []];
    v1.brief = fbBrief;
    expect(await thankYouBriefSection('u1', 'evelyn-cross')).toBe(buildEvelynTyBriefSection(fbBrief));
  });

  it('an /fb buyer who books 12 gets 12’s brief from 12’s page, not the ritual', async () => {
    q.selects = [ARRIVAL_12, ACCOUNT, PAID];
    v1.brief = fbBrief;
    const section = await thankYouBriefSection('u1', 'evelyn-cross');
    expect(section).toBe(buildLuckyNumbersBriefSection(working));
    expect(section).not.toMatch(/Energy Clearing Ritual|Unsent Letter/);
  });

  it('a DB failure in 12’s lookup falls through, never throws', async () => {
    q.selects = [null as never, []];
    expect(await thankYouBriefSection('u1', 'evelyn-cross')).toBe('');
  });

  it('the tier chain: an 11 arrival keeps its tier, asked before 12', async () => {
    q.selects = [ROW];
    expect(await resolveWelcomeGrantTier('u1', 'persona-1')).toBe('unsent-letter-thankyou');
  });

  it('the tier chain: a 12 arrival has its own tier, before /fb', async () => {
    q.selects = [[], ROW];
    expect(await resolveWelcomeGrantTier('u1', 'persona-1')).toBe('lucky-numbers-thankyou');
  });

  it('the tier chain: no 11 or 12 row, /fb tier as before', async () => {
    q.selects = [[], [], [{ id: 'fb-arrival' }]];
    expect(await resolveWelcomeGrantTier('u1', 'persona-1')).toBe('evelyn-thankyou');
  });
});

describe('6 · the wiring', () => {
  const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

  it('the chat engine asks 12’s chain (which hands on to 11’s)', () => {
    expect(src('./chatEngine.ts')).toMatch(/import \{ thankYouBriefSection, thankYouGreetingInstruction \} from '\.\/luckyNumbersTyGift'/);
  });

  it('the lander claims under 12’s tag, on the same terms as 11’s', () => {
    const lander = src('../routes/evelynLander.ts');
    const block = lander.slice(lander.indexOf('data.campaign === LUCKY_NUMBERS_TY_CAMPAIGN'));
    expect(block).toMatch(/^data\.campaign === LUCKY_NUMBERS_TY_CAMPAIGN &&\s+resolved\.resolvedUserId &&\s+\(resolved\.segment === 'token_magic' \|\| resolved\.segment === 'v2_active'\)\s+\) \{\s+await claimLuckyNumbersTyGift\(resolved\.resolvedUserId\);/);
  });

  it('auth gives 12’s tier no welcome grant, and claims it at both verify sites', () => {
    const auth = src('../routes/auth.ts');
    expect(auth).toContain("case 'lucky-numbers-thankyou': return 0;");
    expect(auth.match(/if \(welcomeTier === 'lucky-numbers-thankyou'\) \{\s+(?:const granted = )?await claimLuckyNumbersTyGift\(user\.id\);/g)).toHaveLength(2);
  });
});
