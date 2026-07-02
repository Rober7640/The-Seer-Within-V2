// Unit tests for the offline typo-fallback hardening in validateEmail().
//
// When NeverBounce can't return a verdict (no API key, API error such as an
// exhausted credit balance, or a network failure) the code fails OPEN so real
// buyers are never blocked — but it must still catch KNOWN common typos offline
// so an obvious misspelling (e.g. gmial.com) gets a "did you mean" suggestion.
//
// These tests drive the no-API-key branch (identical code path to the 0-credit
// / network-failure fail-open exits), so they're deterministic and hit no
// network. Run: npx vitest run server/lib/neverbounce.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEmail } from './neverbounce';

describe('validateEmail offline typo fallback (fail-open path)', () => {
  let savedKey: string | undefined;

  beforeEach(() => {
    // Force the fail-open branch by removing the API key for these tests.
    savedKey = process.env.NEVERBOUNCE_API_KEY;
    delete process.env.NEVERBOUNCE_API_KEY;
  });

  afterEach(() => {
    if (savedKey === undefined) delete process.env.NEVERBOUNCE_API_KEY;
    else process.env.NEVERBOUNCE_API_KEY = savedKey;
  });

  it('flags a known domain typo and suggests the correction', async () => {
    const r = await validateEmail('robertoutsource88@gmial.com');
    expect(r.valid).toBe(false);
    expect(r.result).toBe('invalid');
    expect(r.suggestedCorrection).toBe('robertoutsource88@gmail.com');
  });

  it('catches other common typos (gmail.con, hotmial.com, yahoo.con)', async () => {
    expect((await validateEmail('a@gmail.con')).suggestedCorrection).toBe('a@gmail.com');
    expect((await validateEmail('b@hotmial.com')).suggestedCorrection).toBe('b@hotmail.com');
    expect((await validateEmail('c@yahoo.con')).suggestedCorrection).toBe('c@yahoo.com');
  });

  it('does NOT block a normal address when NeverBounce is unavailable (fail-open preserved)', async () => {
    const r = await validateEmail('robertoutsource88@gmail.com');
    expect(r.valid).toBe(true);
    expect(r.suggestedCorrection).toBeUndefined();
  });

  it('does NOT block an unknown non-typo domain when NeverBounce is unavailable', async () => {
    const r = await validateEmail('someone@some-real-company.co.uk');
    expect(r.valid).toBe(true);
    expect(r.suggestedCorrection).toBeUndefined();
  });

  it('preserves the full local part when correcting', async () => {
    const r = await validateEmail('first.last+tag@gmal.com');
    expect(r.suggestedCorrection).toBe('first.last+tag@gmail.com');
  });
});
