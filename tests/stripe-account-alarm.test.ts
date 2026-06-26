// Unit tests for the backup-Stripe "smoke alarm" (Phase 3):
//   - isAccountLevelStripeError: account-level failures vs ordinary card declines
//   - instrumentStripeForAlarm: transparent (rethrows), fires alarm only on
//     account-level errors, idempotent.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture logger.error so we can assert the alarm fired (it always logs at ERROR
// with a greppable marker, regardless of email/webhook config). Hoisted so the
// vi.mock factory can close over it.
const { errorSpy } = vi.hoisted(() => ({ errorSpy: vi.fn() }));
vi.mock('../server/lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: errorSpy },
}));

import {
  isAccountLevelStripeError,
  instrumentStripeForAlarm,
} from '../server/lib/stripeAccountAlert';

const ALARM = '[STRIPE-ACCOUNT-ALARM]';
const alarmed = () => errorSpy.mock.calls.some((c) => String(c[0]).includes(ALARM));

beforeEach(() => errorSpy.mockClear());

describe('isAccountLevelStripeError', () => {
  it('flags account-level error codes', () => {
    expect(isAccountLevelStripeError({ code: 'account_inactive' })).toBe(true);
    expect(isAccountLevelStripeError({ raw: { code: 'account_invalid' } })).toBe(true);
  });

  it('flags permission/auth errors (revoked key / disabled account)', () => {
    expect(isAccountLevelStripeError({ type: 'StripePermissionError' })).toBe(true);
    expect(isAccountLevelStripeError({ type: 'StripeAuthenticationError' })).toBe(true);
  });

  it('does NOT flag ordinary card declines or null', () => {
    expect(isAccountLevelStripeError({ type: 'StripeCardError', code: 'card_declined' })).toBe(false);
    expect(isAccountLevelStripeError({ code: 'insufficient_funds' })).toBe(false);
    expect(isAccountLevelStripeError(null)).toBe(false);
  });
});

describe('instrumentStripeForAlarm', () => {
  function fakeStripe(createImpl: () => Promise<any>) {
    return {
      paymentIntents: { create: vi.fn(createImpl) },
      checkout: { sessions: { create: vi.fn(async () => ({ id: 'cs_ok' })) } },
    } as any;
  }

  it('rethrows account-level failures unchanged AND fires the alarm', async () => {
    const err = Object.assign(new Error('account disabled'), { code: 'account_inactive' });
    const stripe = fakeStripe(async () => { throw err; });
    instrumentStripeForAlarm(stripe);

    await expect(stripe.paymentIntents.create({ amount: 100 })).rejects.toBe(err);
    expect(alarmed()).toBe(true);
  });

  it('rethrows card declines unchanged WITHOUT firing the alarm', async () => {
    const err = Object.assign(new Error('declined'), { type: 'StripeCardError', code: 'card_declined' });
    const stripe = fakeStripe(async () => { throw err; });
    instrumentStripeForAlarm(stripe);

    await expect(stripe.paymentIntents.create({ amount: 100 })).rejects.toBe(err);
    expect(alarmed()).toBe(false);
  });

  it('passes successful calls straight through', async () => {
    const stripe = fakeStripe(async () => ({ id: 'pi_ok' }));
    instrumentStripeForAlarm(stripe);

    await expect(stripe.paymentIntents.create({ amount: 100 })).resolves.toEqual({ id: 'pi_ok' });
    await expect(stripe.checkout.sessions.create({})).resolves.toEqual({ id: 'cs_ok' });
    expect(alarmed()).toBe(false);
  });

  it('is idempotent (no double-wrap)', () => {
    const stripe = fakeStripe(async () => ({ id: 'pi_ok' }));
    instrumentStripeForAlarm(stripe);
    const afterFirst = stripe.paymentIntents.create;
    instrumentStripeForAlarm(stripe);
    expect(stripe.paymentIntents.create).toBe(afterFirst);
  });
});
