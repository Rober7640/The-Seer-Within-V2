// The QUOTE half of the free-minutes lockstep: what getFreeMinutesForSignup()
// prints in the verification email (and, since the whole-branch review, on
// LoginPage's "check your email" screen — /api/auth/register returns this same
// number so the two can't drift).
//
//   npm run test:pure          (no database, no env file, fresh-clone runnable)
//   npx tsx --test server/lib/verificationEmail.freeMinutes.test.ts
//
// WHY THIS IS ITS OWN FILE. These cases were written inside
// server/routes/auth.test.ts, deliberately, so the quote assertions sat next to
// the route tests that measure the coins actually credited — verificationEmail.ts's
// header warns the two must move in lockstep and a previous task shipped a bug of
// exactly that kind. But auth.test.ts calls assertLocalDb() at module scope, so
// every case in it — including these eight, which touch nothing but a pure
// function — was unreachable without a local Postgres and a .env.test. They now
// live here so a fresh clone can run them; auth.test.ts keeps a pointer at the
// spot they came from, and the GRANT half stays there beside the routes.
//
// The assertions are moved verbatim. If you change one, change the matching
// grant-side assertion in server/routes/auth.test.ts in the same commit.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getFreeMinutesForSignup } from './verificationEmail';
import { LIVE_THREAD_FREE_MINUTES } from './liveThreadEngagement';

// Kept identical to auth.test.ts's constants of the same name, in MINUTES.
const DEFAULT_MINUTES = 3;
const LANDER_MINUTES = 5;

describe('getFreeMinutesForSignup — the number the verification email quotes', () => {
  // Pins the operator's decision. Every other assertion here (and in auth.test.ts)
  // compares against LIVE_THREAD_FREE_MINUTES, so without this line the whole suite
  // is tautological — retuning the constant to 4 or 20 would keep it all green.
  it('grants 5 minutes, the operator-confirmed amount', () => {
    // Cut from 10 to 5 on 2026-08-19, before the tier had ever fired in production.
    assert.equal(LIVE_THREAD_FREE_MINUTES, 5, 'operator-confirmed grant');
  });

  it('quotes the Live Thread amount for an engaged Evelyn-lander signup', () => {
    assert.equal(
      getFreeMinutesForSignup('evelyn-cross', 'evelyn-lander', true),
      LIVE_THREAD_FREE_MINUTES,
    );
  });

  it('quotes the plain lander amount when the reader typed nothing', () => {
    assert.equal(getFreeMinutesForSignup('evelyn-cross', 'evelyn-lander', false), LANDER_MINUTES);
  });

  it('defaults engagedViaLiveThread to false when omitted (backward compatible)', () => {
    assert.equal(getFreeMinutesForSignup('evelyn-cross', 'evelyn-lander'), LANDER_MINUTES);
  });

  // The ordering trap. The engagement flag must NOT sit ahead of the existing
  // branches: no grant site anywhere awards the Live Thread amount to a 7/7 promo
  // signup, a soulmate signup, or a non-Evelyn persona, so quoting it there would
  // be a promise nothing keeps. The flag only refines the one branch whose grant
  // it actually changes.
  it('does not preempt the 7/7 promo quote', () => {
    assert.equal(getFreeMinutesForSignup('evelyn-cross', 'promo-7-7', true), 7);
  });

  it('does not preempt the soulmate-lander quote', () => {
    assert.equal(getFreeMinutesForSignup('evelyn-cross', 'soulmate-lander', true), LANDER_MINUTES);
  });

  it('does not raise the quote for a persona the grant chain never treats as Live Thread', () => {
    assert.equal(getFreeMinutesForSignup('marcus-stone', undefined, true), DEFAULT_MINUTES);
  });

  // The persona half of the condition. A source alone is not enough — the grant
  // chain also requires isEvelynUser(defaultPersonaId).
  it('does not raise the quote for an evelyn-lander source on a different persona', () => {
    assert.equal(getFreeMinutesForSignup('marcus-stone', 'evelyn-lander', true), DEFAULT_MINUTES);
  });
});
