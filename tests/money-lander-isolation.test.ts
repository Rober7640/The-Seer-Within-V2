// Isolation guard for the /fb-tarot MONEY-BLOCK changes (Lewis, 2026-08-20).
//
// Two behaviours were added for the eleven money landers — their own free AWeber
// list (6971693) and a distinct `bumpProduct` that Mike's n8n does not match. The
// ONLY question this file exists to answer is: can either of them reach anything
// else? Every case below is a lander that must be left EXACTLY as it was.
//
// Run: npx vitest run tests/money-lander-isolation.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isTarotMoneyLead,
  moneyLanderListId,
  moneyLanderSplitLive,
  bumpProductKeyFor,
} from '@shared/moneyLander';
import { V1_BUMP_PRODUCT_KEY, V1_BUMP_PRODUCT_KEY_MONEY_LANDER } from '@shared/orderBump';
import { FUNNELS } from '@shared/funnelConfig';

// The eleven money hooks all resolve to bucket 'money' via hookToBucket(); the
// other 74 tarot hooks resolve to 'love'. Those two values are what reaches the
// server, so they are what this tests.
const MONEY_BUCKET = 'money';
const LOVE_BUCKET = 'love';

describe('isTarotMoneyLead — the eleven money landers', () => {
  it('is TRUE for a tarot money lander', () => {
    expect(isTarotMoneyLead('v1-tarot', MONEY_BUCKET)).toBe(true);
  });

  it('is FALSE for the other 74 tarot landers', () => {
    expect(isTarotMoneyLead('v1-tarot', LOVE_BUCKET)).toBe(false);
  });

  // 🔴 THE LEAK THIS GUARDS. fbifyAweberTags() does not funnel-suffix the bucket
  // tag, so money-bucket traffic exists on every funnel. None of it may be caught.
  it('is FALSE for a money-bucket visitor on every OTHER funnel', () => {
    const others = FUNNELS.map((f) => f.param).filter((p) => p !== 'v1-tarot');
    expect(others.length).toBeGreaterThan(0);
    for (const funnel of others) {
      expect(isTarotMoneyLead(funnel, MONEY_BUCKET)).toBe(false);
    }
  });

  it('is FALSE for base V1 / homepage traffic, which has no funnel at all', () => {
    expect(isTarotMoneyLead(undefined, MONEY_BUCKET)).toBe(false);
    expect(isTarotMoneyLead(null, MONEY_BUCKET)).toBe(false);
    expect(isTarotMoneyLead('', MONEY_BUCKET)).toBe(false);
  });

  it('is FALSE for every non-money bucket on tarot', () => {
    for (const bucket of [LOVE_BUCKET, 'purpose', 'someone', null, undefined, '']) {
      expect(isTarotMoneyLead('v1-tarot', bucket)).toBe(false);
    }
  });

  it('does not match on a near-miss bucket string', () => {
    for (const bucket of ['Money', 'MONEY', 'money-block', 'moneys', ' money']) {
      expect(isTarotMoneyLead('v1-tarot', bucket)).toBe(false);
    }
  });
});

describe('the bump key Mike branches on', () => {
  it('leaves every other lander on the value his n8n matches', () => {
    expect(V1_BUMP_PRODUCT_KEY).toBe('double_reading');
  });

  // 🔴 THE WHOLE POINT. An equality filter AND a contains filter must both fail,
  // or the PDF still generates. `double_reading_money` would pass a contains
  // check — this is the assertion that stops anyone renaming it to that.
  it('gives money landers a value that fails an EQUALS *and* a CONTAINS match', () => {
    expect(V1_BUMP_PRODUCT_KEY_MONEY_LANDER).not.toBe(V1_BUMP_PRODUCT_KEY);
    expect(V1_BUMP_PRODUCT_KEY_MONEY_LANDER).not.toContain(V1_BUMP_PRODUCT_KEY);
    expect(V1_BUMP_PRODUCT_KEY).not.toContain(V1_BUMP_PRODUCT_KEY_MONEY_LANDER);
  });

  // The key must still EXIST on the order: our own webhook gates the bump-paid
  // AWeber write on `metadata.bumpProduct` being truthy, not on its value.
  it('is a non-empty string, so the bump-paid write still fires', () => {
    expect(V1_BUMP_PRODUCT_KEY_MONEY_LANDER.length).toBeGreaterThan(0);
  });
});

describe('moneyLanderListId — the free list, and the dark-ship guarantee', () => {
  const KEY = 'AWEBER_LIST_ID_TAROT_MONEY';
  let saved: string | undefined;
  beforeEach(() => { saved = process.env[KEY]; delete process.env[KEY]; });
  afterEach(() => {
    if (saved === undefined) delete process.env[KEY];
    else process.env[KEY] = saved;
  });

  // 🔴 THE SAFETY GUARANTEE. Until Railway is set, every lander including the
  // eleven resolves exactly as it does today.
  it('returns undefined for EVERYONE while the env var is unset', () => {
    expect(moneyLanderListId('v1-tarot', 'money')).toBeUndefined();
    expect(moneyLanderListId('v1-tarot', 'love')).toBeUndefined();
    expect(moneyLanderListId('v1-fb', 'money')).toBeUndefined();
  });

  it('returns the money list ONLY for a tarot money lander once set', () => {
    process.env[KEY] = '6971693';
    expect(moneyLanderListId('v1-tarot', 'money')).toBe('6971693');
  });

  it('still returns undefined for every other lander once set', () => {
    process.env[KEY] = '6971693';
    expect(moneyLanderListId('v1-tarot', 'love')).toBeUndefined();
    expect(moneyLanderListId('v1-palm', 'money')).toBeUndefined();
    expect(moneyLanderListId('v1-fb', 'money')).toBeUndefined();
    expect(moneyLanderListId('v1-fb2', 'money')).toBeUndefined();
    expect(moneyLanderListId('v1-gdn', 'money')).toBeUndefined();
    expect(moneyLanderListId(undefined, 'money')).toBeUndefined();
  });

  it('treats an empty env value as unset rather than writing to list ""', () => {
    process.env[KEY] = '';
    expect(moneyLanderListId('v1-tarot', 'money')).toBeUndefined();
  });
});

describe('ONE switch governs both halves', () => {
  const KEY = 'AWEBER_LIST_ID_TAROT_MONEY';
  let saved: string | undefined;
  beforeEach(() => { saved = process.env[KEY]; delete process.env[KEY]; });
  afterEach(() => {
    if (saved === undefined) delete process.env[KEY];
    else process.env[KEY] = saved;
  });

  // 🔴 THE DARK-SHIP GUARANTEE, now covering the bump key too. Before this the key
  // changed the moment the code deployed, with no switch and no env rollback.
  it("with the switch OFF, a money lander keeps Mike's key", () => {
    expect(moneyLanderSplitLive()).toBe(false);
    expect(bumpProductKeyFor('v1-tarot', 'money')).toBe(V1_BUMP_PRODUCT_KEY);
  });

  it('with the switch ON, a money lander gets the key his EQUALS filter misses', () => {
    process.env[KEY] = '6971693';
    expect(moneyLanderSplitLive()).toBe(true);
    expect(bumpProductKeyFor('v1-tarot', 'money')).toBe(V1_BUMP_PRODUCT_KEY_MONEY_LANDER);
  });

  it('never changes the key for any other lander, switch on or off', () => {
    for (const on of [false, true]) {
      if (on) process.env[KEY] = '6971693'; else delete process.env[KEY];
      expect(bumpProductKeyFor('v1-tarot', 'love')).toBe(V1_BUMP_PRODUCT_KEY);
      expect(bumpProductKeyFor('v1-palm', 'money')).toBe(V1_BUMP_PRODUCT_KEY);
      expect(bumpProductKeyFor('v1-fb', 'money')).toBe(V1_BUMP_PRODUCT_KEY);
      expect(bumpProductKeyFor(undefined, 'money')).toBe(V1_BUMP_PRODUCT_KEY);
    }
  });

  // 🔴 THE HALF-ON STATE. The list and the key must flip together — a money lead on
  // the new list whose order still fires Mike's PDF (or the reverse) is the one
  // outcome neither behaviour was built to produce.
  it('list and bump key are never on independently', () => {
    for (const on of [false, true]) {
      if (on) process.env[KEY] = '6971693'; else delete process.env[KEY];
      const listMoved = moneyLanderListId('v1-tarot', 'money') !== undefined;
      const keyChanged = bumpProductKeyFor('v1-tarot', 'money') !== V1_BUMP_PRODUCT_KEY;
      expect(listMoved, `switch=${on}: list and key disagree`).toBe(keyChanged);
    }
  });
});
