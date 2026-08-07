// Unit tests for offer 02's U1 + U2 conversations (client/src/lib/twinFlameUpsellCopy.ts)
// and the in-funnel navigation that keeps a buyer inside them (client/src/lib/funnel.ts).
//
//   npx vitest run tests/twin-flame-upsell-copy.test.ts
//
// What these pin down:
//  1. NO ASKING. Offer 02's stage chain never routes into a question, in either
//     flow. This is the whole point of the rebuild — she is never asked anything,
//     because the booking step collected nothing she could be asked about.
//  2. NO DATA DEPENDENCE. No bucket, no concern, no personName, no first name.
//     Every one of those is absent for a real 02 buyer.
//  3. EVERY OTHER FUNNEL IS UNTOUCHED. Six live funnels share these components;
//     V1's chain here is asserted stage-by-stage against the order the hook used
//     to hardcode, so a wrong edit to the table fails loudly instead of silently
//     re-cutting a live funnel.
//  4. The product's own rule survives: 02-P1 tells her NOT to investigate her
//     twelfth house, so the stone is sold as what she does instead of looking —
//     never as a way to find out.
//  5. No "clearing". V1's downstream copy says it 14 times; a tarot buyer never
//     bought one.

import { describe, expect, it } from 'vitest';
import { funnelPath, isTwinFlameOffer } from '@/lib/funnel';
import { upsell1Copy, upsell2Copy, displayName } from '@/lib/twinFlameUpsellCopy';
import {
  UPSELL_CONFIRMATION,
  UPSELL_BUCKET_MESSAGES,
  UPSELL_OFFER,
  personalizeMessages,
} from '@/lib/upsellMessages';
import { UPSELL2_PATH_A_OPEN, UPSELL2_STONES } from '@/lib/upsell2Messages';

const TF1 = '/tarot/twin-flame/welcome1';
const TF2 = '/tarot/twin-flame/welcome2';

// Every path that must keep V1's conversation, exactly.
const OTHER_UPSELL_PATHS = [
  '/welcome1',
  '/welcome2',
  '/fb/welcome1',
  '/fb2/welcome1',
  '/fb-palm/welcome1',
  '/fb-tarot/welcome1',
  '/gdn/welcome1',
  '/gdn/welcome2',
];

const BUCKETS = ['love', 'money', 'purpose', 'someone'] as const;

// Every bot line offer 02 can play in U1, in any branch.
function allTwinFlameU1(): string[] {
  const c = upsell1Copy(TF1);
  return [
    ...c.CONFIRMATION, ...c.GAP, ...c.RISK, ...c.SOLUTION, ...c.LAVA_INTRO,
    ...c.RITUAL, ...c.FEEL, ...c.DELIVERY, ...c.OFFER, ...c.SUCCESS,
    ...c.SHIPPING_CONFIRMED, ...c.SOFT_DECLINE,
    ...c.bucketMessages(undefined, null),
  ];
}

function allTwinFlameU2(): string[] {
  const c = upsell2Copy(TF2);
  return [
    ...c.PATH_A_OPEN, ...c.PATH_B_OPEN, ...(c.REVEAL ?? []), ...c.GAP,
    ...c.INTRODUCE, ...c.STONES, ...(c.PERSONALIZE ?? []),
    ...c.RITUAL_INSTRUCTION, c.RITUAL_PATH_A_EXTRA, ...c.WHAT_RECEIVE,
    ...c.SOCIAL_PROOF, ...c.PRICE, ...c.URGENCY, ...c.DOWNSELL,
    ...c.SUCCESS, ...c.SUCCESS_HAS_SHIPPING, ...c.SUCCESS_NEEDS_SHIPPING,
    ...c.SHIPPING_CONFIRMED, ...c.SOFT_DECLINE,
  ];
}

describe('isTwinFlameOffer', () => {
  it('matches the offer-02 prefix and its pages only', () => {
    expect(isTwinFlameOffer('/tarot/twin-flame')).toBe(true);
    expect(isTwinFlameOffer(TF1)).toBe(true);
    expect(isTwinFlameOffer(TF2)).toBe(true);
    // The /fb vs /fb-palm bug in funnelDefForPath, in this namespace.
    expect(isTwinFlameOffer('/tarot/twin-flames-elsewhere')).toBe(false);
    expect(isTwinFlameOffer('/fb-tarot/welcome1')).toBe(false);
    for (const p of OTHER_UPSELL_PATHS) expect(isTwinFlameOffer(p)).toBe(false);
  });
});

describe('funnelPath — offer 02 stays inside offer 02', () => {
  it('hands /welcome1 off to 02s own /welcome2', () => {
    expect(funnelPath('/welcome2', TF1)).toBe(TF2);
  });

  it('leaves every existing funnel byte-identical', () => {
    expect(funnelPath('/welcome2', '/welcome1')).toBe('/welcome2');
    expect(funnelPath('/welcome2', '/fb/welcome1')).toBe('/fb/welcome2');
    expect(funnelPath('/welcome2', '/fb2/welcome1')).toBe('/fb2/welcome2');
    expect(funnelPath('/welcome2', '/fb-palm/welcome1')).toBe('/fb-palm/welcome2');
    expect(funnelPath('/welcome2', '/fb-tarot/welcome1')).toBe('/fb-tarot/welcome2');
    expect(funnelPath('/welcome2', '/gdn/welcome1')).toBe('/gdn/welcome2');
    expect(funnelPath('/', '/fb-palm/welcome1')).toBe('/fb-palm');
    expect(funnelPath('/success', '/gdn/welcome2')).toBe('/gdn/success');
  });

  it('sends her to 02s OWN thank-you page, not V1s', () => {
    // V1's /success tells her an "Energy Clearing Ritual" begins tonight — a
    // product an offer-02 buyer never purchased. 02-T1 is now built.
    expect(funnelPath('/success', TF2)).toBe('/tarot/twin-flame/success');
    expect(funnelPath('/success', TF1)).toBe('/tarot/twin-flame/success');
  });

  it('does NOT invent an offer-02 lander', () => {
    // Her buyer arrives from an email letter; there is no 02 landing page.
    expect(funnelPath('/', TF1)).toBe('/');
  });
});

describe('the stage chain — V1 unchanged, offer 02 never asks', () => {
  it("reproduces V1's stage order exactly, stage by stage", () => {
    // This is the regression guard for six live funnels. These are the literal
    // transitions useUpsellChat/useUpsell2Chat used to hardcode.
    expect(upsell1Copy('/welcome1').chain).toEqual({
      CONFIRMATION: 'GAP',
      GAP: 'RISK',
      RISK: 'QUESTION_1',
      AFTER_Q1: 'SOLUTION',
      SOLUTION: 'LAVA_INTRO',
      LAVA_INTRO: 'QUESTION_2',
      AFTER_Q2: 'RITUAL',
      RITUAL: 'FEEL',
      FEEL: 'QUESTION_3',
      AFTER_Q3: 'BUCKET',
      BUCKET: 'DELIVERY',
      DELIVERY: 'OFFER',
    });
    expect(upsell2Copy('/welcome2').chain).toEqual({
      PATH_A_OPEN: 'MANIFEST_REVEAL',
      PATH_B_OPEN: 'MANIFEST_REVEAL',
      MANIFEST_REVEAL: 'GAP',
      GAP: 'QUESTION_1',
      AFTER_Q1: 'INTRODUCE',
      INTRODUCE: 'STONES',
      STONES: 'QUESTION_2',
      AFTER_Q2: 'MANIFEST_PERSONALIZE',
      MANIFEST_PERSONALIZE: 'RITUAL_INSTRUCTION',
      RITUAL_INSTRUCTION: 'WHAT_RECEIVE',
      WHAT_RECEIVE: 'QUESTION_3',
      AFTER_Q3: 'SOCIAL_PROOF',
      SOCIAL_PROOF: 'PRICE',
      PRICE: 'URGENCY',
    });
  });

  it('never routes offer 02 into a question, in either flow', () => {
    const reachable = [
      ...Object.values(upsell1Copy(TF1).chain),
      ...Object.values(upsell2Copy(TF2).chain),
    ];
    for (const stage of reachable) {
      expect(stage).not.toMatch(/QUESTION/);
      expect(stage).not.toMatch(/WAITING/);
    }
  });

  it('walks offer 02 end to end without stalling', () => {
    // Follow the chain from the first stage and assert it arrives at the offer.
    const chain1 = upsell1Copy(TF1).chain as Record<string, string>;
    let stage = 'CONFIRMATION';
    const seen: string[] = [stage];
    while (chain1[stage]) {
      stage = chain1[stage];
      expect(seen).not.toContain(stage); // no cycles
      seen.push(stage);
    }
    expect(stage).toBe('OFFER');
    expect(seen).toEqual([
      'CONFIRMATION', 'GAP', 'RISK', 'SOLUTION', 'LAVA_INTRO',
      'RITUAL', 'FEEL', 'BUCKET', 'DELIVERY', 'OFFER',
    ]);

    const chain2 = upsell2Copy(TF2).chain as Record<string, string>;
    stage = 'PATH_B_OPEN';
    const seen2: string[] = [stage];
    while (chain2[stage]) {
      stage = chain2[stage];
      expect(seen2).not.toContain(stage);
      seen2.push(stage);
    }
    expect(stage).toBe('URGENCY');
    expect(seen2).toEqual([
      'PATH_B_OPEN', 'MANIFEST_REVEAL', 'GAP', 'INTRODUCE', 'STONES',
      'MANIFEST_PERSONALIZE', 'RITUAL_INSTRUCTION', 'WHAT_RECEIVE',
      'SOCIAL_PROOF', 'PRICE', 'URGENCY',
    ]);
  });
});

describe('the continue taps — rhythm without asking', () => {
  it('breaks each 50-message flow three times', () => {
    // A tap is not a question: one button, no branch, nothing captured. It only
    // stops ~4 minutes of copy arriving as one uninterrupted broadcast.
    expect(upsell1Copy(TF1).pauses).toEqual({
      RISK: 'Go on',
      RITUAL: "I'm listening",
      BUCKET: 'Tell me',
    });
    expect(upsell2Copy(TF2).pauses).toEqual({
      MANIFEST_REVEAL: 'Go on',
      STONES: "I'm listening",
      WHAT_RECEIVE: 'Tell me',
    });
  });

  it('pauses only on stages offer 02 actually plays', () => {
    for (const [copy, chain] of [
      [upsell1Copy(TF1).pauses, upsell1Copy(TF1).chain],
      [upsell2Copy(TF2).pauses, upsell2Copy(TF2).chain],
    ] as const) {
      for (const stage of Object.keys(copy)) {
        expect(Object.keys(chain)).toContain(stage);
      }
    }
  });

  it('never labels a tap as an answer to anything', () => {
    // "Yes, I feel it" would be a micro-commitment she was never asked for.
    const labels = [
      ...Object.values(upsell1Copy(TF1).pauses),
      ...Object.values(upsell2Copy(TF2).pauses),
    ];
    for (const l of labels) {
      expect(l).not.toMatch(/\?/);
      expect(l.toLowerCase()).not.toMatch(/^(yes|no|i want|i do)/);
    }
  });

  it('adds no taps to any live funnel', () => {
    // V1 already breaks its own wall with three real questions.
    for (const p of OTHER_UPSELL_PATHS) {
      expect(upsell1Copy(p).pauses).toEqual({});
      expect(upsell2Copy(p).pauses).toEqual({});
    }
  });
});

describe('offer 02 depends on no collected data', () => {
  const c1 = upsell1Copy(TF1);

  it('plays one universal block whatever the bucket is, or is not', () => {
    const universal = c1.bucketMessages(undefined, null);
    expect(universal.length).toBeGreaterThan(0);
    for (const b of BUCKETS) {
      expect(c1.bucketMessages(b, 'Daniel')).toEqual(universal);
      expect(c1.bucketMessages(b, null)).toEqual(universal);
    }
  });

  it('never renders a name it was not given', () => {
    // personName is never collected, so {personName} must not appear anywhere —
    // it would personalize to the literal "them".
    for (const msg of [...allTwinFlameU1(), ...allTwinFlameU2()]) {
      expect(msg).not.toContain('{personName}');
    }
    const rendered = personalizeMessages(allTwinFlameU1(), '', undefined);
    expect(rendered.join(' ')).not.toContain('{');
  });

  it('reads correctly with no first name at all', () => {
    const rendered = personalizeMessages(c1.CONFIRMATION, '', undefined);
    expect(rendered[0]).toContain('dear');
    expect(rendered[0]).not.toContain('{firstName}');
  });

  it('treats "Friend" as the placeholder it is — only for offer 02', () => {
    // /api/upsell/user-data stamps "Friend" when checkout carried no name.
    expect(displayName('Friend', c1.placeholderNames)).toBe('');
    expect(displayName('Sarah', c1.placeholderNames)).toBe('Sarah');
    // V1 keeps whatever it was given, including "Friend".
    expect(displayName('Friend', upsell1Copy('/welcome1').placeholderNames)).toBe('Friend');
  });

  it('ships static copy instead of the two Claude calls', () => {
    // Both prompts interpolate her stated desire — a field 02 never collects.
    const c2 = upsell2Copy(TF2);
    expect(c2.REVEAL?.length).toBeGreaterThan(0);
    expect(c2.PERSONALIZE?.length).toBeGreaterThan(0);
    // V1 still calls Claude.
    expect(upsell2Copy('/welcome2').REVEAL).toBeNull();
    expect(upsell2Copy('/welcome2').PERSONALIZE).toBeNull();
  });
});

describe('offer 02 never mentions a clearing', () => {
  it('in any U1 or U2 line, in any branch', () => {
    for (const msg of [...allTwinFlameU1(), ...allTwinFlameU2()]) {
      expect(msg.toLowerCase()).not.toContain('clearing');
      expect(msg.toLowerCase()).not.toContain('energy field');
      expect(msg.toLowerCase()).not.toContain('both rituals');
      // The specs mark emphasis with *italics*; a plain-text bubble would render
      // the asterisks literally.
      expect(msg).not.toContain('*');
    }
  });

  it('on the buttons too', () => {
    expect(upsell1Copy(TF1).acceptLabel.toLowerCase()).not.toContain('clear');
    expect(upsell2Copy(TF2).downsellDeclineLabel.toLowerCase()).not.toContain('clearing');
    // V1's labels are untouched — these strings are what its buttons render.
    expect(upsell1Copy('/welcome1').acceptLabel).toBe('Yes, protect what we clear');
    expect(upsell2Copy('/welcome2').downsellDeclineLabel).toBe('No thanks, just the clearing');
  });
});

describe('offer 02 stays true to the product (02-P1)', () => {
  it('keeps the left-wrist mechanic that later copy refers back to', () => {
    // UPSELL_DELIVERY and UPSELL2_RITUAL_PATH_A_EXTRA both depend on it.
    expect(upsell1Copy(TF1).bucketMessages(undefined, null)).toContain(
      'Wear it on your LEFT wrist — your receiving hand.',
    );
  });

  it('sells the stone as what she does INSTEAD of investigating house 12', () => {
    // 02-P1: "Do not go looking for it. Do not search, do not test them."
    // An upsell promising disclosure would sell against the product it follows.
    const block = upsell1Copy(TF1).bucketMessages(undefined, null).join(' ');
    expect(block).toContain('instead of looking');
    expect(block.toLowerCase()).not.toMatch(/reveal|find out|uncover|expose|tell you who/);
  });

  it('places the Chariot in the fifth house and keeps it in motion', () => {
    const u2 = allTwinFlameU2().join(' ');
    expect(u2).toContain('Chariot');
    expect(u2).toContain('fifth house');
    expect(u2).toMatch(/travelling|in motion|already on its way/i);
  });

  it('makes no promise about what a third party will do', () => {
    const all = [...allTwinFlameU1(), ...allTwinFlameU2()].join(' ');
    expect(all.toLowerCase()).not.toMatch(/they will (call|text|come back|return)/);
  });
});

describe('every other funnel still runs V1s conversation', () => {
  it('same copy blocks', () => {
    for (const p of OTHER_UPSELL_PATHS) {
      expect(upsell1Copy(p).CONFIRMATION).toEqual(UPSELL_CONFIRMATION);
      expect(upsell1Copy(p).OFFER).toEqual(UPSELL_OFFER);
      expect(upsell2Copy(p).PATH_A_OPEN).toEqual(UPSELL2_PATH_A_OPEN);
      expect(upsell2Copy(p).STONES).toEqual(UPSELL2_STONES);
    }
  });

  it('same bucket-keyed blocks, including the missing-bucket case', () => {
    for (const b of BUCKETS) {
      expect(upsell1Copy('/welcome1').bucketMessages(b, 'Daniel')).toEqual(
        UPSELL_BUCKET_MESSAGES[b],
      );
    }
    // V1 sent nothing when the bucket was absent; that is unchanged.
    expect(upsell1Copy('/welcome1').bucketMessages(undefined, null)).toEqual([]);
  });
});
