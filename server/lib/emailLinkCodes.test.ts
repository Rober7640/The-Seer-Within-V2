import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { inArray } from 'drizzle-orm';
import { assertLocalDb } from './testGuards';

assertLocalDb();

import { db, pool } from './db';
import { emailLinkCodes } from '@shared/schema';
import { mintEmailLinkCode, resolveEmailLinkCode, isCodeCollision } from './emailLinkCodes';

const HAS_DB = Boolean(process.env.DATABASE_URL);

// Pure-logic coverage for the retry predicate — no DB involved, so it runs
// even without a database and isn't gated behind HAS_DB. This is what
// verifies branch (b) (a non-PK unique_violation must NOT be retried):
// the live schema only has one unique constraint (the `code` PK), so there's
// no real second constraint to provoke a genuine non-PK 23505 against this
// table without fabricating schema that doesn't exist. Testing the extracted
// predicate directly against a synthetic error shape covers the decision
// logic without inventing DB state.
describe('isCodeCollision', () => {
  it('is true for a unique_violation against the code primary key', () => {
    assert.equal(isCodeCollision({ code: '23505', constraint: 'email_link_codes_pkey' }), true);
  });

  it('is false for a unique_violation against a different constraint', () => {
    assert.equal(isCodeCollision({ code: '23505', constraint: 'some_other_constraint' }), false);
  });

  it('is false for a non-unique_violation error, even on the code constraint', () => {
    assert.equal(isCodeCollision({ code: '23502', constraint: 'email_link_codes_pkey' }), false);
  });

  it('is false for an error with no code or constraint at all', () => {
    assert.equal(isCodeCollision(new Error('boom')), false);
    assert.equal(isCodeCollision(null), false);
    assert.equal(isCodeCollision(undefined), false);
  });
});

const mintedCodes: string[] = [];

async function mint(...args: Parameters<typeof mintEmailLinkCode>) {
  const code = await mintEmailLinkCode(...args);
  mintedCodes.push(code);
  return code;
}

// assertLocalDb() above already throws when DATABASE_URL is unset, so by the
// time this describe block's `skip` is evaluated, HAS_DB is always true —
// the { skip: !HAS_DB } gate can only ever evaluate to `skip: false` here.
// Both conventions (assertLocalDb() at module scope AND the brief's
// { skip: !HAS_DB } gate) were explicitly requested, so both are kept; this
// comment just makes the redundancy legible instead of looking accidental.
describe('emailLinkCodes', { skip: !HAS_DB }, () => {
  after(async () => {
    if (mintedCodes.length > 0) {
      await db.delete(emailLinkCodes).where(inArray(emailLinkCodes.code, mintedCodes));
    }
    await pool.end();
  });

  it('mints a code and resolves it back to the same content', async () => {
    const code = await mint({
      personaSlug: 'evelyn-cross',
      campaign: 'test-campaign-' + Date.now(),
      continueSeed: 'You came back — good.',
      openLoop: 'What is the thing you keep circling?',
      readingRecap: 'You wrote in about a repeated pattern.',
    });
    assert.ok(code.length > 0);

    const resolved = await resolveEmailLinkCode(code);
    assert.ok(resolved);
    assert.equal(resolved.personaSlug, 'evelyn-cross');
    assert.equal(resolved.continueSeed, 'You came back — good.');
    assert.equal(resolved.openLoop, 'What is the thing you keep circling?');
  });

  it('returns null for an unknown code', async () => {
    const resolved = await resolveEmailLinkCode('does-not-exist-12345');
    assert.equal(resolved, null);
  });

  it('allows readingRecap and openLoop to be omitted', async () => {
    const code = await mint({
      personaSlug: 'evelyn-cross',
      campaign: 'test-campaign-minimal-' + Date.now(),
      continueSeed: 'Just the seed.',
    });
    const resolved = await resolveEmailLinkCode(code);
    assert.ok(resolved);
    assert.equal(resolved.readingRecap, null);
    assert.equal(resolved.openLoop, null);
  });

  // Branch (a): a genuine PK collision must be retried, not surfaced as an
  // error. We force this deterministically (rather than hoping two random
  // codes collide) by pre-occupying a known code, then injecting a
  // codeGenerator that hands back that occupied code on the first call and a
  // fresh one on the second — so a retry is directly observable instead of
  // inferred from the absence of a thrown error.
  it('retries past a genuine primary-key collision and mints the next code', async () => {
    const stamp = Date.now();
    const occupiedCode = `collide-${stamp}`;
    const freshCode = `fresh-${stamp}`;

    await db.insert(emailLinkCodes).values({
      code: occupiedCode,
      personaSlug: 'evelyn-cross',
      campaign: 'test-collision-' + stamp,
      continueSeed: 'the pre-existing row that causes the collision',
    });
    mintedCodes.push(occupiedCode); // cleanup covers the pre-inserted row too

    let calls = 0;
    const sequence = [occupiedCode, freshCode];
    const codeGenerator = () => {
      const next = sequence[calls];
      calls += 1;
      return next;
    };

    const code = await mint(
      {
        personaSlug: 'evelyn-cross',
        campaign: 'test-collision-' + stamp,
        continueSeed: 'the row that had to retry',
      },
      codeGenerator,
    );

    assert.equal(calls, 2, 'codeGenerator should be called exactly twice: the collision, then the retry');
    assert.equal(code, freshCode);
    assert.notEqual(code, occupiedCode);

    const retried = await resolveEmailLinkCode(code);
    assert.ok(retried);
    assert.equal(retried.continueSeed, 'the row that had to retry');

    // The pre-existing row must be untouched by the collision + retry.
    const original = await resolveEmailLinkCode(occupiedCode);
    assert.ok(original);
    assert.equal(original.continueSeed, 'the pre-existing row that causes the collision');
  });
});
