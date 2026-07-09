// Unit tests for the registration fraud thresholds.
//
// The real decision that matters for revenue: ordinary shared IPs (mobile CGNAT, offices,
// cafés) must be FLAGGED-not-blocked so real buyers get in, and only extreme script-like
// volume is hard-blocked. Device-fingerprint (same physical browser) stays a tight signal.
//
// `./db` is mocked so the threshold logic is exercised deterministically without touching
// the (shared, production) database. The mocked `where()` resolves to the drizzle-style
// `[{ count: N }]` shape the module reads. Defaults asserted here: IP flag=10, IP block=25,
// fingerprint flag=3.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { whereMock } = vi.hoisted(() => ({ whereMock: vi.fn() }));

vi.mock('./db', () => ({
  db: {
    select: () => ({ from: () => ({ where: whereMock }) }),
  },
}));

vi.mock('./logger', () => ({ default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { checkRegistrationFraud } from './fraudDetection';

const IP = '203.0.113.7'; // non-local (TEST-NET-3), so checks actually run

// Queue the count(s) the module's sequential queries will read: IP query first, then
// (only when a fingerprint is supplied) the fingerprint query.
function queueCounts(...counts: number[]) {
  whereMock.mockReset();
  for (const c of counts) whereMock.mockResolvedValueOnce([{ count: c }]);
}

describe('checkRegistrationFraud — IP thresholds (flag=10, hard-block=25)', () => {
  beforeEach(() => whereMock.mockReset());

  it('skips checks for a local IP (never flags/blocks dev traffic)', async () => {
    const r = await checkRegistrationFraud('127.0.0.1', null);
    expect(r.flagged).toBe(false);
    expect(r.hardBlocked).toBe(false);
    expect(whereMock).not.toHaveBeenCalled();
  });

  it('9 accounts from one IP → clean (real buyers on a busy IP get in)', async () => {
    queueCounts(9);
    const r = await checkRegistrationFraud(IP, null);
    expect(r.flagged).toBe(false);
    expect(r.hardBlocked).toBe(false);
  });

  it('10 accounts from one IP → flagged for review, NOT blocked', async () => {
    queueCounts(10);
    const r = await checkRegistrationFraud(IP, null);
    expect(r.flags).toContain('ip_flagged');
    expect(r.flagged).toBe(true);
    expect(r.hardBlocked).toBe(false);
  });

  it('24 accounts from one IP → still only flagged, NOT blocked', async () => {
    queueCounts(24);
    const r = await checkRegistrationFraud(IP, null);
    expect(r.flags).toContain('ip_flagged');
    expect(r.hardBlocked).toBe(false);
  });

  it('25 accounts from one IP → HARD-BLOCKED (extreme, script-like volume)', async () => {
    queueCounts(25);
    const r = await checkRegistrationFraud(IP, null);
    expect(r.hardBlocked).toBe(true);
    expect(r.flags).toContain('ip_hard_blocked');
    expect(r.flags).not.toContain('ip_flagged'); // block supersedes the review flag
  });
});

describe('checkRegistrationFraud — device fingerprint (flag=3, never blocks)', () => {
  beforeEach(() => whereMock.mockReset());

  it('same fingerprint 3× → flagged, even when the IP itself is clean', async () => {
    queueCounts(2, 3); // IP=2 (clean), fingerprint=3 (flag)
    const r = await checkRegistrationFraud(IP, 'fp-abc');
    expect(r.flags).toContain('fingerprint_flagged');
    expect(r.flags).not.toContain('ip_flagged');
    expect(r.flagged).toBe(true);
    expect(r.hardBlocked).toBe(false);
    expect(r.recentAccountsFromFingerprint).toBe(3);
  });

  it('same fingerprint 2× → clean (below the tight fingerprint threshold)', async () => {
    queueCounts(2, 2);
    const r = await checkRegistrationFraud(IP, 'fp-abc');
    expect(r.flagged).toBe(false);
    expect(r.hardBlocked).toBe(false);
  });
});
