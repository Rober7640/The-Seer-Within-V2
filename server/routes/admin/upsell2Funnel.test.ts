// The `upsell2_funnel` conversion guard in the experiments admin route. Only the /fb Upsell 2
// copy test (v1_fb_u2_copy_2026) logs Upsell 2 exposures with the conversationId and path
// tallyUpsell2 joins on, so it is the one key allowed; any other key would run inert.
//
//   npx vitest run server/routes/admin/upsell2Funnel.test.ts

import { describe, expect, it } from 'vitest';
import { UPSELL2_FUNNEL_KEYS, upsell2FunnelKeyError } from './experiments';

describe('upsell2FunnelKeyError', () => {
  it('allows the /fb Upsell 2 copy test, nothing else', () => {
    expect([...UPSELL2_FUNNEL_KEYS]).toEqual(['v1_fb_u2_copy_2026']);
    expect(upsell2FunnelKeyError('v1_fb_u2_copy_2026')).toBeNull();
    for (const k of ['v1_fb_u2_copy_2027', 'v1_fb_u1_copy_2026', 'u1_price_2026', 'v1_fb_chat_flow_2026', 'anything']) {
      expect(upsell2FunnelKeyError(k) ?? '').toMatch(/only supported for/);
    }
  });
});
