// Isolation guard for the /fb-tarot SOULMATE changes (Lewis, 2026-08-21).
//
// Three behaviours were added for the nineteen soulmate landers — their own free
// AWeber list, a distinct `bumpProduct` that Mike's n8n does not match, and being
// skipped on the order-bump paid list. The ONLY question this file exists to answer
// is: can any of them reach anything else? Every case below is a lander, a funnel or
// a bucket that must be left EXACTLY as it was.
//
// The sibling file tests/money-lander-isolation.test.ts asks the same of the money
// eleven; the two families' disjointness is asserted here, once, in both directions.
//
// Run: npx vitest run tests/soulmate-lander-isolation.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isTarotSoulmateLead,
  soulmateLanderListId,
  soulmateLanderSplitLive,
} from '@shared/soulmateLander';
import { isTarotMoneyLead } from '@shared/moneyLander';
import { bumpProductKeyFor, bumpPaidListWanted } from '@shared/landerBumpRouting';
import {
  V1_BUMP_PRODUCT_KEY,
  V1_BUMP_PRODUCT_KEY_MONEY_LANDER,
  V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER,
} from '@shared/orderBump';
import {
  SOULMATE_LANDER_HOOKS,
  SOULMATE_AGEBAND_LANDER_HOOKS,
  SOULMATE_KEYWORD_BLOCKED_LANDER_HOOKS,
  SOULMATE_KEYWORD_CONNECTION_LANDER_HOOKS,
  SOULMATE_KEYWORD_ENERGY_LANDER_HOOKS,
  SOULMATE_KEYWORD_HEALING_LANDER_HOOKS,
} from '@shared/soulmateLanderHooks';
import {
  TAROT_HOOKS,
  MONEY_RETIRING_HOOKS,
  MONEY_WORKING_HOOKS,
  MONEY_ENERGY_HOOKS,
  MONEY_PRAYER_HOOKS,
  angleForHook,
  hookToBucket,
} from '../client/src/content/tarotReads';

/** The eleven money-block landers, as the registry groups them. */
const MONEY_HOOKS: string[] = [
  ...MONEY_RETIRING_HOOKS,
  ...MONEY_WORKING_HOOKS,
  ...MONEY_ENERGY_HOOKS,
  ...MONEY_PRAYER_HOOKS,
];

const ENV_KEY = 'AWEBER_LIST_ID_TAROT_SOULMATE';
const MONEY_ENV_KEY = 'AWEBER_LIST_ID_TAROT_MONEY';
const LIST = '6972000'; // stand-in; the real id is set in Railway, never in code

/** A tarot lander that is NOT one of the nineteen — the thing most at risk of leaking. */
const OTHER_TAROT_HOOK = 'cards-honest';

function withEnv(keys: string[]) {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of keys) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k] as string;
    }
  });
}

describe('the roster — nineteen landers, one source', () => {
  it('is exactly nineteen hooks', () => {
    expect(SOULMATE_LANDER_HOOKS).toHaveLength(19);
  });

  it('is the five families and nothing else', () => {
    const parts = [
      ...SOULMATE_AGEBAND_LANDER_HOOKS,
      ...SOULMATE_KEYWORD_BLOCKED_LANDER_HOOKS,
      ...SOULMATE_KEYWORD_CONNECTION_LANDER_HOOKS,
      ...SOULMATE_KEYWORD_ENERGY_LANDER_HOOKS,
      ...SOULMATE_KEYWORD_HEALING_LANDER_HOOKS,
    ];
    expect([...SOULMATE_LANDER_HOOKS].sort()).toEqual([...parts].sort());
    expect(SOULMATE_AGEBAND_LANDER_HOOKS).toHaveLength(11);
  });

  it('contains no duplicates', () => {
    expect(new Set(SOULMATE_LANDER_HOOKS).size).toBe(SOULMATE_LANDER_HOOKS.length);
  });

  // 🔴 This is the guarantee the TarotHook union would give if shared/ could import
  // client content. A slug misspelt in the roster would silently match nothing, the
  // lander would keep the old list and Mike's key, and the split would look "live"
  // while quietly doing nothing for that lander.
  it('every hook is a real lander in the registry', () => {
    for (const hook of SOULMATE_LANDER_HOOKS) {
      expect(TAROT_HOOKS as string[], hook + ' is not a registered tarot hook').toContain(hook);
    }
  });
});

describe('isTarotSoulmateLead — the nineteen soulmate landers', () => {
  it('is TRUE for every one of the nineteen on /fb-tarot', () => {
    for (const hook of SOULMATE_LANDER_HOOKS) {
      expect(isTarotSoulmateLead('v1-tarot', hook), hook).toBe(true);
    }
  });

  // 🔴 THE WHOLE POINT. These nineteen are bucket 'love', same as ~74 other tarot
  // landers and same as every funnel's "Love" topic-picker traffic. If the predicate
  // ever widened to the bucket, this is the case that would catch it.
  it('is FALSE for another tarot lander in the same LOVE bucket', () => {
    expect(isTarotSoulmateLead('v1-tarot', OTHER_TAROT_HOOK)).toBe(false);
  });

  it('is FALSE on every other funnel, even with a real soulmate hook', () => {
    for (const funnel of ['v1', 'v1-fb', 'v1-fb2', 'v1-gdn', 'v1-palm']) {
      expect(isTarotSoulmateLead(funnel, SOULMATE_LANDER_HOOKS[0]), funnel).toBe(false);
    }
  });

  it('is FALSE for junk, empty, missing and non-string hooks', () => {
    for (const v of [undefined, null, '', '   ', 42, {}, [], 'cards-not-a-real-hook']) {
      expect(isTarotSoulmateLead('v1-tarot', v), String(v)).toBe(false);
    }
  });

  it('tolerates surrounding whitespace from the wire', () => {
    expect(isTarotSoulmateLead('v1-tarot', '  ' + SOULMATE_LANDER_HOOKS[0] + '  ')).toBe(true);
  });
});

describe('the two families cannot overlap', () => {
  // 🔴 bumpProductKeyFor branches money-then-soulmate. That order is only safe while
  // no lander can satisfy both; if this ever fails, the branch order in
  // landerBumpRouting.ts has silently become a precedence rule nobody chose.
  it('no soulmate lander is also a money lander', () => {
    for (const hook of SOULMATE_LANDER_HOOKS) {
      expect(MONEY_HOOKS, hook).not.toContain(hook);
      expect(hookToBucket(hook as never), hook).toBe('love');
      expect(isTarotMoneyLead('v1-tarot', hookToBucket(hook as never)), hook).toBe(false);
    }
  });

  it('no money lander is a soulmate lander', () => {
    expect(MONEY_HOOKS).toHaveLength(11);
    for (const hook of MONEY_HOOKS) {
      expect(isTarotSoulmateLead('v1-tarot', hook), hook).toBe(false);
    }
  });
});

describe('the bump key Mike branches on', () => {
  // 🔴🔴 The lesson that cost real time on 2026-08-20: his filter is an EQUALS, but
  // the value must survive him switching it to a CONTAINS too.
  it('is not `double_reading`, and does not contain it', () => {
    expect(V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER).not.toBe(V1_BUMP_PRODUCT_KEY);
    expect(V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER).not.toContain(V1_BUMP_PRODUCT_KEY);
  });

  it('is distinguishable from the money key by equals AND contains', () => {
    expect(V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER).not.toBe(V1_BUMP_PRODUCT_KEY_MONEY_LANDER);
    expect(V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER).not.toContain(V1_BUMP_PRODUCT_KEY_MONEY_LANDER);
    expect(V1_BUMP_PRODUCT_KEY_MONEY_LANDER).not.toContain(V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER);
  });

  it('is the value Lewis approved', () => {
    expect(V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER).toBe('soulmate_lander_addon');
  });
});

describe('ONE switch governs the soulmate split', () => {
  withEnv([ENV_KEY, MONEY_ENV_KEY]);

  // 🔴 THE DARK-SHIP GUARANTEE. This is what makes deploy and cutover separate,
  // independently reversible steps.
  it('with the switch OFF, a soulmate lander is untouched', () => {
    expect(soulmateLanderSplitLive()).toBe(false);
    expect(soulmateLanderListId('v1-tarot', SOULMATE_LANDER_HOOKS[0])).toBeUndefined();
    expect(bumpProductKeyFor('v1-tarot', 'love', SOULMATE_LANDER_HOOKS[0])).toBe(
      V1_BUMP_PRODUCT_KEY,
    );
  });

  it('with the switch ON, all three behaviours flip', () => {
    process.env[ENV_KEY] = LIST;
    expect(soulmateLanderSplitLive()).toBe(true);
    expect(soulmateLanderListId('v1-tarot', SOULMATE_LANDER_HOOKS[0])).toBe(LIST);
    const key = bumpProductKeyFor('v1-tarot', 'love', SOULMATE_LANDER_HOOKS[0]);
    expect(key).toBe(V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER);
    expect(bumpPaidListWanted(key)).toBe(false);
  });

  // 🔴 THE HALF-ON STATE — a soulmate lead on the new list whose order still fires
  // Mike's PDF, or the reverse. One variable makes it unreachable.
  it('list and bump key are never on independently', () => {
    for (const on of [false, true]) {
      if (on) process.env[ENV_KEY] = LIST;
      else delete process.env[ENV_KEY];
      for (const hook of SOULMATE_LANDER_HOOKS) {
        const listMoved = soulmateLanderListId('v1-tarot', hook) !== undefined;
        const keyChanged = bumpProductKeyFor('v1-tarot', 'love', hook) !== V1_BUMP_PRODUCT_KEY;
        expect(listMoved, 'switch=' + on + ' ' + hook + ': list and key disagree').toBe(keyChanged);
      }
    }
  });

  it('never changes anything for another lander, switch on or off', () => {
    for (const on of [false, true]) {
      if (on) process.env[ENV_KEY] = LIST;
      else delete process.env[ENV_KEY];
      expect(soulmateLanderListId('v1-tarot', OTHER_TAROT_HOOK)).toBeUndefined();
      expect(bumpProductKeyFor('v1-tarot', 'love', OTHER_TAROT_HOOK)).toBe(V1_BUMP_PRODUCT_KEY);
      expect(bumpProductKeyFor('v1-tarot', 'love')).toBe(V1_BUMP_PRODUCT_KEY);
      expect(bumpProductKeyFor('v1-palm', 'love', SOULMATE_LANDER_HOOKS[0])).toBe(
        V1_BUMP_PRODUCT_KEY,
      );
      expect(bumpProductKeyFor('v1-fb', 'love', SOULMATE_LANDER_HOOKS[0])).toBe(
        V1_BUMP_PRODUCT_KEY,
      );
      expect(bumpProductKeyFor(undefined, 'love', SOULMATE_LANDER_HOOKS[0])).toBe(
        V1_BUMP_PRODUCT_KEY,
      );
    }
  });
});

describe('the two cutovers are independent (Lewis, 2026-08-21)', () => {
  withEnv([ENV_KEY, MONEY_ENV_KEY]);

  it('money can be live while soulmate is dark', () => {
    process.env[MONEY_ENV_KEY] = '6971693';
    expect(bumpProductKeyFor('v1-tarot', 'money')).toBe(V1_BUMP_PRODUCT_KEY_MONEY_LANDER);
    expect(bumpProductKeyFor('v1-tarot', 'love', SOULMATE_LANDER_HOOKS[0])).toBe(
      V1_BUMP_PRODUCT_KEY,
    );
    expect(soulmateLanderListId('v1-tarot', SOULMATE_LANDER_HOOKS[0])).toBeUndefined();
  });

  it('soulmate can be live while money is dark', () => {
    process.env[ENV_KEY] = LIST;
    expect(bumpProductKeyFor('v1-tarot', 'money')).toBe(V1_BUMP_PRODUCT_KEY);
    expect(bumpProductKeyFor('v1-tarot', 'love', SOULMATE_LANDER_HOOKS[0])).toBe(
      V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER,
    );
  });

  it('neither switch reads the other variable', () => {
    process.env[MONEY_ENV_KEY] = '6971693';
    expect(soulmateLanderSplitLive()).toBe(false);
    delete process.env[MONEY_ENV_KEY];
    process.env[ENV_KEY] = LIST;
    expect(soulmateLanderSplitLive()).toBe(true);
  });
});

describe('the ORDER-BUMP paid list (6969209)', () => {
  // 🔴🔴 The 2026-08-20 bug: the gate asked only whether bumpProduct EXISTED, so a
  // renamed key still passed it and a real buyer landed on the list. Both family keys
  // must now fail it by VALUE.
  it('skips both split families', () => {
    expect(bumpPaidListWanted(V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER)).toBe(false);
    expect(bumpPaidListWanted(V1_BUMP_PRODUCT_KEY_MONEY_LANDER)).toBe(false);
  });

  it('still writes every ordinary bump buyer', () => {
    expect(bumpPaidListWanted(V1_BUMP_PRODUCT_KEY)).toBe(true);
  });

  it('never fires for a non-bump order', () => {
    for (const v of [undefined, null, '', '   ', 0, false, {}]) {
      expect(bumpPaidListWanted(v), String(v)).toBe(false);
    }
  });
});

describe('PostHog attribution — the nineteen report as themselves', () => {
  // 🔴 Before the angle wiring these all resolved to 'decode-him': the pages rendered
  // correctly and only the reporting was wrong, which is the kind of defect found a
  // month later when the numbers refuse to add up.
  it('no soulmate lander reports as decode-him', () => {
    for (const hook of SOULMATE_LANDER_HOOKS) {
      expect(angleForHook(hook as never), hook).not.toBe('decode-him');
    }
  });

  it('maps each family to its own angle', () => {
    const cases: [readonly string[], string][] = [
      [SOULMATE_AGEBAND_LANDER_HOOKS, 'soulmate-ageband'],
      [SOULMATE_KEYWORD_BLOCKED_LANDER_HOOKS, 'soulmate-blocked'],
      [SOULMATE_KEYWORD_CONNECTION_LANDER_HOOKS, 'soulmate-connection'],
      [SOULMATE_KEYWORD_ENERGY_LANDER_HOOKS, 'soulmate-energy'],
      [SOULMATE_KEYWORD_HEALING_LANDER_HOOKS, 'soulmate-healing'],
    ];
    for (const [hooks, angle] of cases) {
      for (const hook of hooks) expect(angleForHook(hook as never), hook).toBe(angle);
    }
  });

  it('leaves every other lander on the angle it already had', () => {
    // cards-honest is a decode-him lander and must stay one — the five new branches
    // sit BELOW every existing one, so this is the case that catches a soulmate roster
    // that accidentally swallowed a hook it does not own.
    expect(angleForHook(OTHER_TAROT_HOOK as never)).toBe('decode-him');
    expect(angleForHook('cards-lied-to' as never)).toBe('honesty');
    expect(angleForHook('cards-my-energy' as never)).toBe('money-energy');
  });
});
