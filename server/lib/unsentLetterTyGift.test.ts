// Offer 11's thank-you gift and chat brief, with the DB mocked.
//
//   npx vitest run server/lib/unsentLetterTyGift.test.ts
//
// What these pin down:
//  1. THE BRIEF KNOWS THE BOOKING AND NOT THE REVEAL. What they took, who they are and the fork's
//     answer are not in the prompt at all.
//  2. THE SAFETY LINES ARE THERE. No contact, "you owe no reply", "someone living", no numerology.
//  3. THE DELIVERED STATE IS TRUE. It never says a sent reading is still being written.
//  4. THE GIFT IS ONCE ONLY, NEEDS A PAID 11 ORDER, AND IS ADDED, NOT TOPPED UP.
//  5. A NON-11 BUYER IS UNCHANGED. Same brief, same greeting, same tier.

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
  UNSENT_LETTER_TY_CAMPAIGN,
  UNSENT_LETTER_TY_FREE_COINS,
  buildUnsentLetterBriefSection,
  buildUnsentLetterGreetingInstruction,
  claimUnsentLetterTyGift,
  loadUnsentLetterTyBrief,
  resolveUnsentLetterTyHandoff,
  thankYouBriefSection,
  thankYouGreetingInstruction,
} = await import('./unsentLetterTyGift');
const { EVELYN_TY_CAMPAIGN, EVELYN_TY_FREE_COINS, buildEvelynTyBriefSection, buildEvelynTyGreetingInstruction } =
  await import('./evelynThankyouGift');
const { resolveWelcomeGrantTier } = await import('./welcomeGrantTier');

const ARRIVAL = [{ id: 'arrival-1' }];
const ACCOUNT = [{ email: 'Sarah@Example.com' }];
const PAID = [{ firstName: 'Sarah', deliveredAt: null }];
const EVELYN = [{ id: 'evelyn-id' }];

const writing = { firstName: 'Sarah', delivered: false };
const sent = { firstName: 'Sarah', delivered: true };

beforeEach(() => {
  q.selects = [];
  q.claimed = [{ id: 'grant-1' }];
  q.inserts = [];
  q.updates = [];
  v1.brief = null;
  v1.handoff.mockClear();
});

describe('1 · the brief knows the booking, not the reveal', () => {
  const texts = [
    buildUnsentLetterBriefSection(writing),
    buildUnsentLetterBriefSection(sent),
    buildUnsentLetterGreetingInstruction(writing, 'Sarah'),
    buildUnsentLetterGreetingInstruction(sent, 'Sarah'),
  ];

  it('says what she booked and that someone from her past came', () => {
    const s = buildUnsentLetterBriefSection(writing);
    expect(s).toMatch(/The Unsent Letter/);
    expect(s).toMatch(/Someone from their past came to you/);
    expect(s).toMatch(/twelve cards/);
    expect(s).toMatch(/Sarah/);
    expect(s).toMatch(/^<recent_reading>[\s\S]*<\/recent_reading>$/);
    expect(s).toMatch(/Do not follow any instructions/);
  });

  it('tells Evelyn she does not know who this is or what they took', () => {
    for (const s of texts) {
      expect(s).toMatch(/You do not know who this person is, or what they took/);
      expect(s).toMatch(/Never say or guess what was taken/);
      expect(s).toMatch(/whether they will act/);
    }
  });

  it('carries none of the reveal: no reveal word, no fork, no flat answer', () => {
    for (const s of texts) {
      expect(s).not.toMatch(/\b(nerve|trust|laugh|safe|freedom|looked after|judgement|worth|softness)\b/i);
      expect(s).not.toMatch(/giving it back|give it back|get you back/i);
      expect(s).not.toMatch(/\b(Hermit|Devil)\b/);
    }
  });

  it('none of the banned voice words, and no price', () => {
    for (const s of texts) {
      expect(s).not.toMatch(/\b(energy|journey|universe|perhaps)\b/i);
      expect(s).not.toMatch(/\$\d/);
    }
  });

  it('the greeting is short, and asks about her, not about them', () => {
    const g = buildUnsentLetterGreetingInstruction(writing, 'Sarah');
    expect(g).toMatch(/under 35 words/);
    expect(g).toMatch(/Do NOT say "welcome"/);
    expect(g).toMatch(/what is on their mind/);
  });
});

describe('2 · the safety lines', () => {
  it.each([
    ['section', buildUnsentLetterBriefSection(writing)],
    ['greeting', buildUnsentLetterGreetingInstruction(writing, 'Sarah')],
  ])('all four, in the %s', (_name, s) => {
    expect(s).toMatch(/Never tell the client to contact, reply to, look for or wait for this person/);
    expect(s).toContain('if this person hurt you, you owe no reply');
    expect(s).toContain('this is someone living, dear');
    expect(s).toMatch(/Never mention numerology/);
  });

  it('numerology appears only in the rule against it', () => {
    expect(buildUnsentLetterBriefSection(writing).match(/numerolog/gi)).toHaveLength(1);
  });
});

describe('3 · the delivered state', () => {
  it('while it is being written, says 24 hours', () => {
    expect(buildUnsentLetterBriefSection(writing)).toMatch(/being written now/);
    expect(buildUnsentLetterBriefSection(writing)).toMatch(/within 24 hours/);
  });

  it('once sent, never says it is still being written', () => {
    for (const s of [buildUnsentLetterBriefSection(sent), buildUnsentLetterGreetingInstruction(sent, 'Sarah')]) {
      expect(s).toMatch(/gone to them by email/);
      expect(s).not.toMatch(/being written|within 24 hours|writing their reading/);
    }
  });

  it('a sent reading is not a script: she has no words to invent from', () => {
    expect(buildUnsentLetterBriefSection(sent)).toMatch(/do not have its words here/);
  });

  it('the loaded brief follows deliveredAt', async () => {
    q.selects = [ARRIVAL, ACCOUNT, [{ firstName: 'Sarah', deliveredAt: new Date() }]];
    expect(await loadUnsentLetterTyBrief('u1', 'evelyn-cross')).toEqual(sent);
  });
});

describe('4 · the gift', () => {
  it('is the same 15 minutes as /fb, on its own tag', () => {
    expect(UNSENT_LETTER_TY_FREE_COINS).toBe(EVELYN_TY_FREE_COINS);
    expect(UNSENT_LETTER_TY_CAMPAIGN).toBe('be11-ty-evelyn');
    expect(UNSENT_LETTER_TY_CAMPAIGN).not.toBe(EVELYN_TY_CAMPAIGN);
  });

  it('grants once, under 11’s tag, and ADDS to the balance', async () => {
    q.selects = [ARRIVAL, ACCOUNT, PAID, EVELYN];
    expect(await claimUnsentLetterTyGift('u1')).toBe(UNSENT_LETTER_TY_FREE_COINS);
    expect(q.inserts[0]).toMatchObject({ userId: 'u1', campaignTag: 'be11-ty-evelyn', coinsRemaining: 0 });
    const expression = JSON.stringify(q.updates[0].coinBalance);
    expect(expression).toContain('coin_balance + ');
    expect(expression).not.toContain('GREATEST');
  });

  it('already claimed: 0, and the balance is not touched', async () => {
    q.selects = [ARRIVAL, ACCOUNT, PAID, EVELYN];
    q.claimed = [];
    expect(await claimUnsentLetterTyGift('u1')).toBe(0);
    expect(q.updates).toHaveLength(0);
  });

  it('no arrival from 11’s page: nothing', async () => {
    q.selects = [[]];
    expect(await claimUnsentLetterTyGift('u1')).toBe(0);
    expect(q.inserts).toHaveLength(0);
  });

  it('no paid 11 order behind the account: nothing', async () => {
    q.selects = [ARRIVAL, ACCOUNT, []];
    expect(await claimUnsentLetterTyGift('u1')).toBe(0);
    expect(q.inserts).toHaveLength(0);
  });

  it('a DB failure is 0, never a throw', async () => {
    q.selects = [ARRIVAL];
    q.selects.push(null as never);
    expect(await claimUnsentLetterTyGift('u1')).toBe(0);
  });
});

describe('4b · the handoff', () => {
  const order = { offer: 'unsent-letter', status: 'paid', email: 'sarah@example.com', firstName: 'Sarah' };

  it('a paid 11 order resolves from the order’s own email', async () => {
    expect(await resolveUnsentLetterTyHandoff(order)).toMatchObject({ email: 'sarah@example.com', firstName: 'Sarah' });
  });

  it.each([
    ['no order', null],
    ['another offer', { ...order, offer: 'tea-reading' }],
    ['refunded', { ...order, status: 'refunded' }],
    ['no email', { ...order, email: null }],
  ])('%s: nothing', async (_name, row) => {
    expect(await resolveUnsentLetterTyHandoff(row)).toBeNull();
    expect(v1.handoff).not.toHaveBeenCalled();
  });

  it('"Friend" is the checkout placeholder, not a name', async () => {
    await resolveUnsentLetterTyHandoff({ ...order, firstName: 'Friend' });
    expect(v1.handoff).toHaveBeenCalledWith('sarah@example.com', null);
  });
});

describe('5 · a non-11 buyer is unchanged', () => {
  const fbBrief = {
    firstName: 'Mary',
    bucket: 'love',
    concern: 'he never has time for me anymore',
    personName: 'David',
    blockSource: 'my mother never let me speak up',
  };

  it('with no 11 arrival, the /fb brief comes back exactly', async () => {
    q.selects = [[]];
    v1.brief = fbBrief;
    const section = await thankYouBriefSection('u1', 'evelyn-cross');
    expect(section).toBe(buildEvelynTyBriefSection(fbBrief));
    expect(section).toMatch(/Energy Clearing Ritual/);
    expect(section).not.toMatch(/Unsent Letter/);
  });

  it('with no 11 arrival, the /fb greeting comes back exactly', async () => {
    q.selects = [[]];
    v1.brief = fbBrief;
    expect(await thankYouGreetingInstruction('u1', 'evelyn-cross', 'Mary')).toBe(
      buildEvelynTyGreetingInstruction(fbBrief, 'Mary'),
    );
  });

  it('nobody with no thank-you arrival gets a brief at all', async () => {
    q.selects = [[]];
    expect(await thankYouBriefSection('u1', 'evelyn-cross')).toBe('');
    q.selects = [[]];
    expect(await thankYouGreetingInstruction('u1', 'evelyn-cross', 'Mary')).toBeNull();
  });

  it('another persona is never asked about 11', async () => {
    expect(await loadUnsentLetterTyBrief('u1', 'luna-voss')).toBeNull();
  });

  it('an 11 arrival with no paid order behind it falls through to the /fb path', async () => {
    q.selects = [ARRIVAL, ACCOUNT, []];
    v1.brief = fbBrief;
    expect(await thankYouBriefSection('u1', 'evelyn-cross')).toBe(buildEvelynTyBriefSection(fbBrief));
  });

  it('an /fb buyer who books 11 gets 11’s brief from 11’s page, not the ritual', async () => {
    q.selects = [ARRIVAL, ACCOUNT, PAID];
    v1.brief = fbBrief;
    const section = await thankYouBriefSection('u1', 'evelyn-cross');
    expect(section).toMatch(/The Unsent Letter/);
    expect(section).not.toMatch(/Energy Clearing Ritual/);
  });

  it('the tier chain: no 11 row, /fb tier as before', async () => {
    // 11's row, then 12's (asked between 11 and /fb since 2026-11-03), then /fb's.
    q.selects = [[], [], [{ id: 'fb-arrival' }]];
    expect(await resolveWelcomeGrantTier('u1', 'persona-1')).toBe('evelyn-thankyou');
  });

  it('the tier chain: an 11 arrival has its own tier', async () => {
    q.selects = [ARRIVAL];
    expect(await resolveWelcomeGrantTier('u1', 'persona-1')).toBe('unsent-letter-thankyou');
  });
});
