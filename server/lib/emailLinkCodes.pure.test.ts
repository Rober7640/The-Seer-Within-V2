// Pure-logic coverage for emailLinkCodes.ts's retry predicate. No database.
//
//   npm run test:pure          (no database, no env file, fresh-clone runnable)
//   npx tsx --test server/lib/emailLinkCodes.pure.test.ts
//
// WHY THIS IS ITS OWN FILE. These cases were written in emailLinkCodes.test.ts,
// outside its { skip: !HAS_DB } describe precisely so they would run without a
// database — but that file calls assertLocalDb() at module scope, which throws
// first. The intent was right and the placement defeated it, so they moved here.
// The DB-backed cases stay in emailLinkCodes.test.ts.
//
// Moved verbatim; the wording below is the original.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

import { isCodeCollision } from './emailLinkCodes';
import { pool } from './db';

// The emailLinkCodes import drags the DB pool along; close it or the test process
// never exits. No query is ever issued (and no DATABASE_URL is needed) — the pool
// is constructed lazily and this only releases it. Same pattern as
// chatEngine.tagEcho.test.ts.
after(() => pool.end());

// This covers branch (b) (a non-PK unique_violation must NOT be retried)
// exhaustively, including shapes Postgres would never actually produce.
//
// (When this was written the `code` PK was the table's only unique
// constraint, so branch (b) had no real-world instance. It does now:
// uq_email_link_codes_persona_campaign. The DB-backed test
// 'refuses a second code for a (persona, campaign) pair' in
// emailLinkCodes.test.ts exercises branch (b) against a genuine Postgres error;
// these synthetic cases stay because they cover the decision logic exhaustively
// and cost nothing.)
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
