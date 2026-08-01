import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { inArray } from 'drizzle-orm';
import { assertLocalDb } from './testGuards';

assertLocalDb();

import { db, pool } from './db';
import { emailLinkCodes } from '@shared/schema';
import { mintEmailLinkCode, resolveEmailLinkCode } from './emailLinkCodes';

const HAS_DB = Boolean(process.env.DATABASE_URL);

const mintedCodes: string[] = [];

async function mint(...args: Parameters<typeof mintEmailLinkCode>) {
  const code = await mintEmailLinkCode(...args);
  mintedCodes.push(code);
  return code;
}

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
});
