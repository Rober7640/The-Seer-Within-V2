// The "minutes remaining" line injected into the persona prompt.
//
//   npm run test:price
//
// This exists because of a bug shipped by the per-minute repricing: the wind-down
// instruction was keyed to `floor(coins / cpm) <= 2`, sized for the old 15/30-minute
// packs. Once the free trial was 180 coins (3:00) and the cheapest pack 201 (3:21),
// that fired for nearly every paid session — the guide was told "do not open new
// threads" while the client was still deciding whether to buy.
//
// It could not have been caught by the eval harness: scripts/eval-chat.ts gives eval
// users 6000 coins so billing never interferes, which means the wind-down branch is
// unreachable there. These are the tests that cover it instead.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMinutesMeterLine,
  WIND_DOWN_SECONDS,
  WIND_DOWN_INSTRUCTION,
} from './minutesMeter';
import { COINS_PER_MINUTE, DEFAULT_PRICING } from '../../shared/types';

const CPM = COINS_PER_MINUTE;
// Wallet cents that represent `sec` seconds of reading at rate `cpm` (a coin is a
// cent). Lets the wind-down boundary tests read in seconds regardless of the rate.
const coinsForSeconds = (sec: number, cpm = CPM) => Math.round((sec * cpm) / 60);
const windsDown = (coins: number, cpm = CPM) =>
  buildMinutesMeterLine(coins, cpm).includes(WIND_DOWN_INSTRUCTION);

describe('minutes meter — the wind-down must stay a tail, not the session', () => {
  it('does NOT wind down at the start of the free trial', () => {
    assert.equal(windsDown(DEFAULT_PRICING.freeCoins), false);
  });

  it('does NOT wind down at the start of any pack the customer can buy', () => {
    for (const tier of DEFAULT_PRICING.tiers) {
      assert.equal(
        windsDown(tier.totalCoins),
        false,
        `the $${tier.priceUsd / 100} pack starts in wind-down — that's the 2026-07-22 bug`,
      );
    }
  });

  it('leaves most of the free trial as open reading', () => {
    // The regression: with the old `<= 2 minutes` rule this was true from 179 coins,
    // i.e. one second into a 3:00 trial.
    const trial = DEFAULT_PRICING.freeCoins;
    assert.equal(windsDown(trial - 1), false, 'winds down 1 second into the trial');
    assert.equal(windsDown(Math.floor(trial / 2)), false, 'winds down halfway through the trial');
  });

  it('DOES wind down inside the final minute', () => {
    assert.equal(windsDown(coinsForSeconds(WIND_DOWN_SECONDS)), true);
    assert.equal(windsDown(coinsForSeconds(WIND_DOWN_SECONDS - 1)), true);
    assert.equal(windsDown(coinsForSeconds(30)), true);
    assert.equal(windsDown(0), true);
  });

  it('does not wind down just outside the final minute', () => {
    assert.equal(windsDown(coinsForSeconds(WIND_DOWN_SECONDS + 2)), false);
  });

  it('scales with a non-default persona rate', () => {
    // At 120 coins/min a coin is half a second, so the last minute is 120 coins.
    // 121 coins is 60.5s, which floors back to 60 — still inside the final minute;
    // 122 coins (61s) is the first value clear of it.
    assert.equal(windsDown(120, 120), true);
    assert.equal(windsDown(122, 120), false);
  });
});

describe('minutes meter — the label', () => {
  it('never reports a sub-minute balance as "0 minutes"', () => {
    // Flooring used to produce "about 0 minutes", which reads as "no time left"
    // rather than "you are nearly out".
    for (const coins of [1, 30, 59]) {
      const line = buildMinutesMeterLine(coins, CPM);
      assert.match(line, /less than a minute/);
      assert.doesNotMatch(line, /about 0 minutes/);
    }
  });

  it('singularises exactly one minute', () => {
    assert.match(buildMinutesMeterLine(COINS_PER_MINUTE, CPM), /about 1 minute\./);
  });

  it('pluralises everything else', () => {
    assert.match(buildMinutesMeterLine(2 * COINS_PER_MINUTE, CPM), /about 2 minutes\./);
    assert.match(buildMinutesMeterLine(3 * COINS_PER_MINUTE, CPM), /about 3 minutes\./);
  });

  it('never claims more time than the client holds', () => {
    for (let coins = 0; coins <= 1200; coins++) {
      const line = buildMinutesMeterLine(coins, CPM);
      const match = line.match(/about (\d+) minutes?/);
      if (match) {
        assert.ok(
          Number(match[1]) * COINS_PER_MINUTE <= coins,
          `claimed ${match[1]} min for ${coins} coins`,
        );
      }
    }
  });

  it('handles a zero and a negative balance without producing nonsense', () => {
    assert.match(buildMinutesMeterLine(0, CPM), /less than a minute/);
    assert.match(buildMinutesMeterLine(-50, CPM), /less than a minute/);
    // No NEGATIVE NUMBER may reach the prompt. (A bare /-/ would match the hyphen in
    // "wind-down" and the em dash in the instruction, so match a sign + digit.)
    assert.doesNotMatch(buildMinutesMeterLine(-50, CPM), /-\d/);
  });

  it('survives a zero persona rate rather than dividing by zero', () => {
    const line = buildMinutesMeterLine(600, 0);
    assert.ok(line.length > 0);
    assert.doesNotMatch(line, /NaN|Infinity/);
  });
});
