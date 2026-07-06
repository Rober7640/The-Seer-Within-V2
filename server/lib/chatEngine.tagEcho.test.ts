// Regression test for the context-tag echo guard (found live 2026-07-05 via the
// Playwright UI-capture harness): under a "read from what's present" instruction
// with zero material, the model FABRICATED a <user_context>/<natal_chart>/
// <numerology_profile> block (invented user_id + birth data) and it rendered into
// the client's chat bubble verbatim. The engine must strip echoed context
// machinery from every reply — the data inside such blocks is untrustworthy by
// construction.
//
//   npx tsx --test server/lib/chatEngine.tagEcho.test.ts

import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

import { stripContextTagEchoes } from './chatEngine';
import { pool } from './db';

// The chatEngine import drags the DB pool along; close it or the test process
// never exits (pure-function tests, no queries issued).
after(() => pool.end());

describe('stripContextTagEchoes', () => {
  it('removes the exact fabricated block shape observed live, keeping the prose', () => {
    const observed =
      '<user_context> {"seasons":[],"user_id":"fce43de7-74dc-44f7-b88c-e2b0d51614c5","created_at":"2025-05-21T01:27:34.119197Z","intros_sent":1,"minutes_balance":999,"seconds_balance":59940} </user_context> ' +
      '<natal_chart> {"birth_day":17,"user_id":"fce43de7-74dc-44f7-b88c-e2b0d51614c5","birth_year":1983,"birth_month":8,"birth_location":"Boston, MA"} </natal_chart> ' +
      '<numerology_profile> {"current_year_number":3,"destiny_number":7} </numerology_profile> ' +
      'I hear you stepping back, Donette. That\'s all right.';
    const out = stripContextTagEchoes(observed);
    assert.equal(out, "I hear you stepping back, Donette. That's all right.");
    assert.ok(!/user_context|natal_chart|numerology_profile|user_id|birth_/i.test(out));
  });

  it('removes orphan tags without paired closers', () => {
    const out = stripContextTagEchoes('Before the veil parts… <user_context> and after.');
    assert.ok(!out.includes('<user_context>'));
    assert.ok(out.includes('Before the veil parts'));
  });

  it('returns empty string when the reply was nothing but machinery', () => {
    assert.equal(
      stripContextTagEchoes('<natal_chart>{"birth_day":17}</natal_chart>'),
      '',
    );
  });

  it('leaves clean replies byte-identical', () => {
    const clean = 'The block isn\'t him — it\'s the hallway you keep standing in.\n\nCome tell me what he does.';
    assert.equal(stripContextTagEchoes(clean), clean);
  });
});
