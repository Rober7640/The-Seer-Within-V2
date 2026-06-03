// Unit tests for the promo-wallet spend/refund split math.
// These cover the pure decision logic (no DB) that decides how a deduction or refund
// is divided between the promo pot and the user's real balance.
//
// Run with: npm run test:vitest

import { describe, it, expect } from 'vitest';
import { computeSpendSplit, computeRefundSplit } from './promoWallet';

describe('computeSpendSplit — promo is spent before real balance', () => {
  it('spends entirely from promo when promo covers it', () => {
    expect(computeSpendSplit(15, 360, 1000)).toEqual({ fromPromo: 15, fromReal: 0, total: 15 });
  });

  it('spends from real when there is no promo', () => {
    expect(computeSpendSplit(15, 0, 1000)).toEqual({ fromPromo: 0, fromReal: 15, total: 15 });
  });

  it('splits across promo then real when promo runs out mid-deduction', () => {
    // 20 wanted, only 12 promo left → 12 promo + 8 real
    expect(computeSpendSplit(20, 12, 1000)).toEqual({ fromPromo: 12, fromReal: 8, total: 20 });
  });

  it('caps at what is actually available (promo + real both short)', () => {
    // 100 wanted, 30 promo + 40 real available → only 70 can be taken
    expect(computeSpendSplit(100, 30, 40)).toEqual({ fromPromo: 30, fromReal: 40, total: 70 });
  });

  it('takes nothing when wanted is zero', () => {
    expect(computeSpendSplit(0, 360, 1000)).toEqual({ fromPromo: 0, fromReal: 0, total: 0 });
  });

  it('exhausts promo exactly then stops when real is also empty', () => {
    expect(computeSpendSplit(50, 30, 0)).toEqual({ fromPromo: 30, fromReal: 0, total: 30 });
  });

  it('treats negative inputs as zero (defensive)', () => {
    expect(computeSpendSplit(-5, 360, 1000)).toEqual({ fromPromo: 0, fromReal: 0, total: 0 });
    expect(computeSpendSplit(10, -5, -5)).toEqual({ fromPromo: 0, fromReal: 0, total: 0 });
  });
});

describe('computeRefundSplit — real is refunded before promo (reverse of spend)', () => {
  it('refunds to real first when the session used real coins', () => {
    // session charged 40 promo + 20 real; refund 15 → all 15 back to real
    expect(computeRefundSplit(15, 40, 20)).toEqual({ toReal: 15, toPromo: 0 });
  });

  it('refunds real fully then promo for the remainder', () => {
    // session charged 40 promo + 20 real; refund 30 → 20 real + 10 promo
    expect(computeRefundSplit(30, 40, 20)).toEqual({ toReal: 20, toPromo: 10 });
  });

  it('refunds entirely to promo when the session was promo-only', () => {
    expect(computeRefundSplit(25, 60, 0)).toEqual({ toReal: 0, toPromo: 25 });
  });

  it('never refunds more than was charged', () => {
    // refund larger than total charged (40 promo + 20 real = 60) → capped at 60
    expect(computeRefundSplit(100, 40, 20)).toEqual({ toReal: 20, toPromo: 40 });
  });

  it('refunds nothing when amount is zero or negative', () => {
    expect(computeRefundSplit(0, 40, 20)).toEqual({ toReal: 0, toPromo: 0 });
    expect(computeRefundSplit(-10, 40, 20)).toEqual({ toReal: 0, toPromo: 0 });
  });
});

describe('spend → refund round-trip consistency', () => {
  it('a full refund of a mixed charge restores both pots exactly', () => {
    const spend = computeSpendSplit(50, 30, 1000); // 30 promo + 20 real
    const refund = computeRefundSplit(spend.total, spend.fromPromo, spend.fromReal);
    expect(refund.toPromo).toBe(spend.fromPromo);
    expect(refund.toReal).toBe(spend.fromReal);
  });
});
