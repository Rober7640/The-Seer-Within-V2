// Evelyn VSL PostHog step naming — getPostHogStep's evelyn branch is a stub that
// currently returns only 'landing'; this flags the three other funnel steps.
import { describe, it, expect } from 'vitest';
import { getPostHogFunnel, getPostHogStep } from './funnel';

describe('evelyn posthog steps', () => {
  it('names the three funnel steps', () => {
    expect(getPostHogFunnel('/evelyn/reading')).toBe('evelyn');
    expect(getPostHogStep('/evelyn/reading')).toBe('reading');
    expect(getPostHogStep('/evelyn/checkout')).toBe('checkout');
    expect(getPostHogStep('/evelyn/thank-you')).toBe('thank_you');
  });
});
