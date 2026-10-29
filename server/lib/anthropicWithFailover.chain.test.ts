// Run: npx tsx --test server/lib/anthropicWithFailover.chain.test.ts
// Checks the REAL configured chain: V1 callers (anthropicFailover) and V2 callers
// (anthropicV2) both try the promo keys first, then the paid keys. Fake keys, no
// network — the module reads env at load, so env is set before the import.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.ANTHROPIC_API_KEY = 'sk-test-primary';
process.env.ANTHROPIC_API_KEY_BACKUP_1 = 'sk-test-backup-1';
delete process.env.ANTHROPIC_API_KEY_BACKUP_2;
process.env.ANTHROPIC_API_KEY_PROMO_1 = 'sk-test-promo-1';
process.env.ANTHROPIC_API_KEY_PROMO_2 = 'sk-test-promo-2';
process.env.ANTHROPIC_API_KEY_PROMO_3 = 'sk-test-promo-3';

describe('promo-first chain for every caller', async () => {
  const mod = await import('./anthropicWithFailover');

  it('tries promo 1, 2, 3, then the paid keys', () => {
    assert.deepEqual(mod.getV2KeyNames(), ['promo_1', 'promo_2', 'promo_3', 'primary', 'backup_1']);
  });

  it('V1 callers use the same promo-first client as V2', () => {
    assert.equal(mod.anthropicFailover, mod.anthropicV2);
  });

  it('the paid-only list is unchanged (health check / alerts)', () => {
    assert.deepEqual(mod.getConfiguredKeyNames(), ['primary', 'backup_1']);
  });
});
