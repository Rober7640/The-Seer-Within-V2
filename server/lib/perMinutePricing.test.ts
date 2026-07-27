// Pure-logic unit tests for the per-minute pricing money math. No DB, no network.
//
//   npm run test:price
//
// Context: the 2026-07-23 dollar-wallet change redefined a coin as ONE CENT
// (COINS_PER_MINUTE = 299 = $2.99/min at the default rate). `users.coin_balance` is
// a real dollar balance in cents; each persona's `coins_per_minute` is cents/min, and
// the time a balance buys is DERIVED per-guide (cents ÷ rate). The customer only ever
// sees dollars + minutes.
//
// The load-bearing properties, in the order they'd cost real money:
//   1. Billing NEVER charges for time the client did not spend (15s blocks, floored).
//   2. Displayed time NEVER overstates what a pack actually buys.
//   3. The custom top-up the CLIENT previews == the cents the SERVER grants.
//   4. Every advertised pack really costs the advertised flat rate.
//   5. Per-persona rates are honoured — nothing assumes the default 299.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  COINS_PER_MINUTE,
  CENTS_PER_MINUTE_DEFAULT,
  BILLING_INTERVAL_SECONDS,
  BLOCKS_PER_MINUTE,
  PRICE_PER_MINUTE_USD,
  DEFAULT_PRICING,
  CUSTOM_TOPUP_MAX_USD,
  WELCOME_PACK_COINS,
  usdToCoins,
  usdCentsToCoins,
  coinsToClock,
  coinsToMinutes,
  coinsToMinutesDisplay,
  minutesToCoins,
  secondsToCoins,
} from '../../shared/types';

/** Dollars-per-minute a pack actually charges, on exact (unrounded) minutes at a rate. */
function effectiveRate(totalCoins: number, priceUsdCents: number, cpm = COINS_PER_MINUTE): number {
  return priceUsdCents / 100 / (totalCoins / cpm);
}

describe('per-minute pricing — constants', () => {
  it('a coin is one cent; the default rate is $2.99/min = 299', () => {
    assert.equal(CENTS_PER_MINUTE_DEFAULT, 299);
    assert.equal(COINS_PER_MINUTE, CENTS_PER_MINUTE_DEFAULT);
    assert.equal(COINS_PER_MINUTE, Math.round(PRICE_PER_MINUTE_USD * 100));
  });

  it('bills in 15-second blocks, four to a minute', () => {
    assert.equal(BILLING_INTERVAL_SECONDS, 15);
    assert.equal(BLOCKS_PER_MINUTE, 60 / BILLING_INTERVAL_SECONDS);
    assert.equal(BLOCKS_PER_MINUTE, 4);
  });

  it('the free trial is 3 minutes at the default rate', () => {
    assert.equal(DEFAULT_PRICING.freeCoins, minutesToCoins(3));
    assert.equal(DEFAULT_PRICING.freeCoins, 3 * COINS_PER_MINUTE); // 897¢
    assert.equal(coinsToClock(DEFAULT_PRICING.freeCoins), '3:00');
  });
});

describe('per-minute pricing — advertised packs', () => {
  it('offers the four round-dollar packs', () => {
    assert.deepEqual(
      DEFAULT_PRICING.tiers.map(t => t.priceUsd),
      [1000, 2000, 3000, 5000],
    );
  });

  it('grants exactly the dollars paid — a coin is a cent, so totalCoins === priceUsd', () => {
    for (const tier of DEFAULT_PRICING.tiers) {
      assert.equal(tier.totalCoins, tier.priceUsd, `$${tier.priceUsd / 100} pack grants ${tier.totalCoins}¢`);
    }
  });

  for (const tier of DEFAULT_PRICING.tiers) {
    const dollars = tier.priceUsd / 100;

    it(`$${dollars} pack really costs the flat $${PRICE_PER_MINUTE_USD}/min`, () => {
      const rate = effectiveRate(tier.totalCoins, tier.priceUsd);
      assert.ok(
        Math.abs(rate - PRICE_PER_MINUTE_USD) < 0.01,
        `$${dollars} pack charges $${rate.toFixed(4)}/min, expected ~$${PRICE_PER_MINUTE_USD}`,
      );
    });

    it(`$${dollars} pack never overstates the time it buys`, () => {
      const exactMinutes = tier.totalCoins / COINS_PER_MINUTE;
      assert.ok(
        coinsToMinutesDisplay(tier.totalCoins) <= exactMinutes,
        `display ${coinsToMinutesDisplay(tier.totalCoins)} > actual ${exactMinutes}`,
      );
      // The m:ss clock is the format the customer actually sees. Compare against
      // scale-first arithmetic — `exactMinutes * 60` reintroduces the very float
      // drift coinsToClock was fixed to avoid.
      const [m, s] = coinsToClock(tier.totalCoins).split(':').map(Number);
      const trueSeconds = Math.floor((tier.totalCoins * 60) / COINS_PER_MINUTE);
      assert.ok(m * 60 + s <= trueSeconds, `clock ${m}:${s} > ${trueSeconds}s actual`);
    });

    it(`$${dollars} pack totals coins + bonus`, () => {
      assert.equal(tier.totalCoins, tier.coins + tier.bonusCoins);
    });

    it(`$${dollars} pack carries no bonus (flat rate, no bulk discount)`, () => {
      assert.equal(tier.bonusCoins, 0);
    });
  }

  it('has no volume discount — every pack is the same rate', () => {
    const rates = DEFAULT_PRICING.tiers.map(t => effectiveRate(t.totalCoins, t.priceUsd));
    const spread = Math.max(...rates) - Math.min(...rates);
    assert.ok(spread < 0.01, `rates spread by $${spread.toFixed(4)}/min — that's a bulk discount`);
  });
});

describe('per-minute pricing — custom top-up', () => {
  // The client previews "= X min" from usdToCoins and the server grants cents from
  // usdCentsToCoins. If these ever diverge, a customer is shown one thing and sold
  // another — the exact failure this pairing exists to prevent.
  const AMOUNTS = [10, 11, 13, 17, 20, 25, 33, 49, 50, 99, 100, 150, 199, 200];

  for (const dollars of AMOUNTS) {
    it(`$${dollars}: client preview and server grant agree`, () => {
      assert.equal(usdToCoins(dollars), usdCentsToCoins(dollars * 100));
    });

    it(`$${dollars}: grants exactly that many dollars of wallet`, () => {
      // A coin is a cent, so $17 → 1700¢ — the wallet is worth what you paid.
      assert.equal(usdToCoins(dollars), dollars * 100);
    });
  }

  it('a custom amount equal to a pack price buys exactly that pack', () => {
    for (const tier of DEFAULT_PRICING.tiers) {
      assert.equal(
        usdCentsToCoins(tier.priceUsd),
        tier.totalCoins,
        `$${tier.priceUsd / 100} custom != the $${tier.priceUsd / 100} pack`,
      );
    }
  });

  it('a cents charge maps 1:1 to wallet cents (identity)', () => {
    for (const cents of [1000, 1234, 2000, 5000, 20000]) {
      assert.equal(usdCentsToCoins(cents), cents);
    }
  });

  it('the platform cap is a whole number of dollars above the top pack', () => {
    assert.equal(CUSTOM_TOPUP_MAX_USD, Math.floor(CUSTOM_TOPUP_MAX_USD));
    assert.ok(CUSTOM_TOPUP_MAX_USD > DEFAULT_PRICING.tiers[DEFAULT_PRICING.tiers.length - 1].priceUsd / 100);
  });
});

describe('billing — 15-second blocks, always in the client’s favour', () => {
  it('charges nothing for a partial first block', () => {
    for (const seconds of [0, 1, 7, 14]) {
      assert.equal(secondsToCoins(seconds), 0, `${seconds}s should be free`);
    }
  });

  it('never bills more time than actually elapsed (default + premium rate)', () => {
    for (const cpm of [COINS_PER_MINUTE, 120, 999, 1999]) {
      for (let seconds = 0; seconds <= 2000; seconds++) {
        const billedSeconds = (secondsToCoins(seconds, cpm) / cpm) * 60;
        assert.ok(
          billedSeconds <= seconds + 1e-6,
          `${seconds}s elapsed but ${billedSeconds}s billed at ${cpm}/min — overcharge`,
        );
      }
    }
  });

  it('rounds down to the completed 15s block, exact at whole minutes', () => {
    // Same 15s block, so a partial block never increments the charge...
    assert.equal(secondsToCoins(29), secondsToCoins(15));
    // ...and crossing into the next block does.
    assert.ok(secondsToCoins(30) > secondsToCoins(29));
    // A full minute charges exactly the rate, at any rate.
    assert.equal(secondsToCoins(60), COINS_PER_MINUTE);
    assert.equal(secondsToCoins(120), 2 * COINS_PER_MINUTE);
  });

  it('honours a non-default persona rate — nothing assumes 299', () => {
    assert.equal(secondsToCoins(60, 120), 120);
    assert.equal(secondsToCoins(30, 120), 60);
    assert.equal(secondsToCoins(60, 999), 999);  // a $9.99/min guide
    assert.equal(secondsToCoins(60, 1999), 1999); // a $19.99/min guide
  });
});

describe('display — the one m:ss format the customer sees', () => {
  it('formats known balances at the default rate', () => {
    assert.equal(coinsToClock(0), '0:00');
    assert.equal(coinsToClock(COINS_PER_MINUTE), '1:00');       // 299¢ = 1 min
    assert.equal(coinsToClock(3 * COINS_PER_MINUTE), '3:00');   // 897¢ free trial
    assert.equal(coinsToClock(WELCOME_PACK_COINS), '2:40');     // 798¢ welcome pack
    assert.equal(coinsToClock(1000), '3:20');   // $10 pack
    assert.equal(coinsToClock(2000), '6:41');   // $20 pack
    assert.equal(coinsToClock(3000), '10:02');  // $30 pack
    assert.equal(coinsToClock(5000), '16:43');  // $50 pack
  });

  it('formats the same balance differently per guide rate', () => {
    // $10 (1000¢) buys ~3:20 with Evelyn but ~1:00 with a $9.99/min guide.
    assert.equal(coinsToClock(1000, 299), '3:20');
    assert.equal(coinsToClock(1000, 999), '1:00');
  });

  it('always pads seconds to two digits', () => {
    for (let coins = 0; coins <= 3000; coins++) {
      assert.match(coinsToClock(coins), /^\d+:[0-5]\d$/, `bad clock at ${coins} coins`);
    }
  });

  it('clamps a negative balance to zero rather than showing "-1:-30"', () => {
    assert.equal(coinsToClock(-1), '0:00');
    assert.equal(coinsToClock(-500), '0:00');
  });

  it('never rounds a balance up into time the client does not have', () => {
    for (let coins = 0; coins <= 6000; coins++) {
      const [m, s] = coinsToClock(coins).split(':').map(Number);
      const trueSeconds = Math.floor((coins * 60) / COINS_PER_MINUTE);
      assert.ok(m * 60 + s <= trueSeconds, `${coins}¢ displayed as ${m}:${s} > ${trueSeconds}s`);
      assert.ok(coinsToMinutesDisplay(coins) <= coins / COINS_PER_MINUTE);
    }
  });
});

describe('minute/cent round trips', () => {
  it('survives minutes → cents → minutes at the default rate', () => {
    for (const minutes of [1, 3, 5, 15, 30, 60, 100]) {
      assert.equal(coinsToMinutes(minutesToCoins(minutes)), minutes);
    }
  });

  it('survives minutes → cents → minutes at a premium rate', () => {
    for (const minutes of [1, 3, 15, 30]) {
      assert.equal(coinsToMinutes(minutesToCoins(minutes, 999), 999), minutes);
    }
  });

  it('floors partial minutes rather than rounding up', () => {
    assert.equal(coinsToMinutes(2 * COINS_PER_MINUTE - 1), 1);
    assert.equal(coinsToMinutes(2 * COINS_PER_MINUTE), 2);
  });
});
