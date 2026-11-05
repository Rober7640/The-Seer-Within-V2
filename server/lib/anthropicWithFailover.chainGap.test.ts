// Run: npx tsx --test server/lib/anthropicWithFailover.chainGap.test.ts
// The production setup from 2 Nov 2026: PROMO_1 deleted (its account still has
// paid credit), PROMO_2..4 set. An unset slot is skipped and the order of the
// rest is kept, so no Railway values ever need to be swapped between slots.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.ANTHROPIC_API_KEY = 'sk-test-primary';
process.env.ANTHROPIC_API_KEY_BACKUP_1 = 'sk-test-backup-1';
delete process.env.ANTHROPIC_API_KEY_BACKUP_2;
delete process.env.ANTHROPIC_API_KEY_PROMO_1;
process.env.ANTHROPIC_API_KEY_PROMO_2 = 'sk-test-promo-2';
process.env.ANTHROPIC_API_KEY_PROMO_3 = 'sk-test-promo-3';
process.env.ANTHROPIC_API_KEY_PROMO_4 = 'sk-test-promo-4';

describe('promo chain with an empty slot', async () => {
  const mod = await import('./anthropicWithFailover');

  it('skips the empty PROMO_1 and keeps 2 → 3 → 4 → paid', () => {
    assert.deepEqual(mod.getV2KeyNames(), ['promo_2', 'promo_3', 'promo_4', 'primary', 'backup_1']);
  });

  it('the paid-only list is unchanged', () => {
    assert.deepEqual(mod.getConfiguredKeyNames(), ['primary', 'backup_1']);
  });
});
