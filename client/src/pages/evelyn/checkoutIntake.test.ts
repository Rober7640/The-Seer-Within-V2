import { describe, it, expect } from 'vitest';
import { resolveStone, validateIntake } from './checkoutIntake';

describe('checkout intake', () => {
  it('resolves stone from query, then storage, then null', () => {
    expect(resolveStone('jade', null)).toBe('jade');
    expect(resolveStone('garbage', 'garnet')).toBe('garnet');
    expect(resolveStone(null, null)).toBeNull();
  });
  it('rejects under-18 and malformed birth dates', () => {
    const minor = new Date(); minor.setFullYear(minor.getFullYear() - 17);
    const dob = minor.toISOString().slice(0, 10);
    const r = validateIntake({ email: 'a@b.com', firstName: 'Sue', dateOfBirth: dob });
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.field).toBe('dateOfBirth'); expect(r.message).toMatch(/18/); }
    expect(validateIntake({ email: 'a@b.com', firstName: 'Sue', dateOfBirth: 'not-a-date' }).ok).toBe(false);
  });
  it('accepts a valid adult', () => {
    expect(validateIntake({ email: 'a@b.com', firstName: 'Sue', dateOfBirth: '1990-05-15' }).ok).toBe(true);
  });
});
