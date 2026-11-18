// npx tsx --test shared/phone.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone } from './phone';

describe('normalizePhone — the Payments.AI checkout phone box', () => {
  it('a plain US number (no +1) is accepted and given its +1', () => {
    assert.equal(normalizePhone('555 555 0123'), '+15555550123');
    assert.equal(normalizePhone('(555) 555-0123'), '+15555550123');
    assert.equal(normalizePhone('1 555 555 0123'), '+15555550123');
  });
  it('a number with its country code is kept as typed (any country)', () => {
    assert.equal(normalizePhone('+1 555 555 0123'), '+15555550123');
    assert.equal(normalizePhone('+63 917 123 4567'), '+639171234567');
    assert.equal(normalizePhone('+65 8123 4567'), '+6581234567');
    assert.equal(normalizePhone('+44 7700 900-123'), '+447700900123');
  });
  it('00 is read as the international +', () => {
    assert.equal(normalizePhone('0063 917 123 4567'), '+639171234567');
  });
  it('a local non-US number without its country code is refused — we cannot guess', () => {
    assert.equal(normalizePhone('07700900123'), null); // UK local
    assert.equal(normalizePhone('0917 123 4567'), null); // Philippines local
    assert.equal(normalizePhone('8123 4567'), null); // Singapore local
  });
  it('junk and empty are refused', () => {
    assert.equal(normalizePhone(''), null);
    assert.equal(normalizePhone(undefined), null);
    assert.equal(normalizePhone('abc'), null);
    assert.equal(normalizePhone('+0123456789'), null);
    assert.equal(normalizePhone('123 456 7890'), null); // US area codes never start with 1
  });
});
