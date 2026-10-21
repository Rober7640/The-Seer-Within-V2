// Evelyn VSL (`/evelyn/*`) must route to its own `evelyn` pixel-config entry, not fall
// through to 'default'. See shared/fbPixelConfig.ts for the routing contract.
import { describe, it, expect } from 'vitest';
import { resolveFunnelFromUrl } from '@shared/fbPixelConfig';

describe('evelyn pixel routing', () => {
  it('routes /evelyn paths to the evelyn funnel entry', () => {
    expect(resolveFunnelFromUrl('/evelyn/reading')).toBe('evelyn');
    expect(resolveFunnelFromUrl('/evelyn/checkout')).toBe('evelyn');
  });
});
