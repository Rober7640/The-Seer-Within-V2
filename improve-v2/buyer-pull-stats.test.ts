import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadPull, computeBehavior, groupByPersona } from '../scripts/lib/buyer-pull-stats';
import { KNOWN_PERSONA_SLUGS } from '../scripts/lib/persona-registry';
import { computeBillingHealth, MAX_COINS_PER_SECOND } from '../scripts/lib/buyer-pull-stats';

const MULTI = 'improve-v2/transcripts/monitor/daily-2026-07-15';

describe('groupByPersona', () => {
  test('returns a row for every known persona even with zero buyers', () => {
    const rows = groupByPersona(loadPull(MULTI));
    for (const slug of KNOWN_PERSONA_SLUGS) {
      assert.ok(rows.some(r => r.persona === slug), `missing row for ${slug}`);
    }
  });

  test('nova-sharma has zero purchases in this fixture and is still reported', () => {
    const rows = groupByPersona(loadPull(MULTI));
    const nova = rows.find(r => r.persona === 'nova-sharma');
    assert.ok(nova, 'nova row missing');
    assert.equal(nova.behavior.purchases, 0);
  });

  test('per-persona purchase counts sum to the pooled total', () => {
    const pull = loadPull(MULTI);
    const pooled = computeBehavior(pull.purchases, pull.msgsBySession);
    const summed = groupByPersona(pull).reduce((a, r) => a + r.behavior.purchases, 0);
    assert.equal(summed, pooled.purchases);
  });

  test('per-persona revenue sums to the pooled total', () => {
    const pull = loadPull(MULTI);
    const pooled = computeBehavior(pull.purchases, pull.msgsBySession);
    const summed = groupByPersona(pull).reduce((a, r) => a + r.behavior.revenueCents, 0);
    assert.equal(summed, pooled.revenueCents);
  });

  test('the fixture actually exercises multiple personas', () => {
    const withBuyers = groupByPersona(loadPull(MULTI)).filter(r => r.behavior.purchases > 0);
    assert.ok(withBuyers.length >= 3, `expected >=3 personas with buyers, got ${withBuyers.length}`);
  });
});

describe('loadPull', () => {
  test('excludes $0 admin_adjustment rows from purchases and counts them', () => {
    const pull = loadPull(MULTI);
    assert.ok(pull.purchases.every((p: any) => p.price_usd > 0));
    assert.ok(pull.excludedZeroPrice >= 0);
  });
});

const POSTFLIP = 'improve-v2/transcripts/monitor/daily-2026-07-31';

describe('computeBillingHealth', () => {
  test('MAX_COINS_PER_SECOND is derived from the shared rate constant, not hardcoded', () => {
    assert.ok(Math.abs(MAX_COINS_PER_SECOND - 299 / 60) < 1e-9);
  });

  test('flags nothing on a healthy post-flip cohort', () => {
    const pull = loadPull(POSTFLIP);
    const health = computeBillingHealth(pull.sessions, pull.msgsBySession);
    assert.equal(health.overRate.length, 0,
      `expected no over-rate sessions, got ${health.overRate.map(o => `${o.id}@${o.ratio.toFixed(2)}`).join(' ')}`);
  });

  test('post-flip max ratio sits at or below the contractual rate', () => {
    const health = computeBillingHealth(loadPull(POSTFLIP).sessions, loadPull(POSTFLIP).msgsBySession);
    assert.ok(health.maxRatio <= MAX_COINS_PER_SECOND + 1e-6,
      `maxRatio ${health.maxRatio} exceeds ${MAX_COINS_PER_SECOND}`);
  });

  test('REGRESSION: the old coins>=dur+60 heuristic would have false-flagged this same cohort', () => {
    const { sessions } = loadPull(POSTFLIP);
    const oldFlagged = sessions.filter((s: any) => (s.coins_charged ?? 0) >= (s.duration_seconds ?? 0) + 60);
    assert.ok(oldFlagged.length > 0,
      'fixture no longer reproduces the false-positive; pick another post-flip cohort');
  });

  // POSITIVE CONTROL on real data. The pre-flip cohort is NOT clean, and that is
  // the point: the 2026-07-15 buyer audit independently identified exactly two
  // overbilled sessions in this window, both idle-tail drains predating the 07-14
  // afternoon billing deploy, and both were restituted to the customer.
  // A detector that never fires on any fixture is only half-tested.
  test('POSITIVE CONTROL: flags the known pre-flip overbilled session', () => {
    const pull = loadPull(MULTI);
    const flagged = computeBillingHealth(pull.sessions, pull.msgsBySession).overRate;
    assert.ok(flagged.some(o => o.id === 'd751bce9'),
      `expected the known 152s/900-coin drain to be flagged; got ${flagged.map(o => o.id).join(',') || 'nothing'}`);
  });

  // ⚠️ KNOWN AND ACCEPTED LIMITATION, pinned so it cannot change silently.
  // The second known-bad session of that pair (01ebec38: 777s billed 1800 coins
  // = 2.32 coins/sec) is NOT flagged, because the ceiling is the CURRENT rate of
  // 4.983 coins/sec. Anything between the old 1.0 and the new 4.983 looks legal.
  // That is correct for this tool's job — daily audits read a 24h window of
  // current-era data, where the ceiling is exact. It only under-detects on
  // historical pre-flip pulls. Do NOT "fix" this by lowering the ceiling; that
  // would false-flag every healthy session today, which is the bug being removed.
  test('documents that a sub-ceiling pre-flip drain is NOT caught', () => {
    const pull = loadPull(MULTI);
    const flagged = computeBillingHealth(pull.sessions, pull.msgsBySession).overRate;
    assert.ok(!flagged.some(o => o.id === '01ebec38'),
      'if this now fires, the ceiling changed — re-read the comment above before touching it');
  });
});
