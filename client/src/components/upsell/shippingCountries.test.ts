import { describe, it, expect } from 'vitest';
import { countryOptions } from './ShippingForm';
import { STRIPE_CHECKOUT_SHIPPING_COUNTRIES } from '@shared/shippingCountries';

describe('ShippingForm country options', () => {
  it('defaults to V1’s seven — the live funnel’s fulfilment is unchanged', () => {
    expect(countryOptions().map((c) => c.value)).toEqual(['US', 'CA', 'GB', 'AU', 'NZ', 'IE', 'SG']);
  });

  it('backend offers can pass the worldwide list', () => {
    const opts = countryOptions(STRIPE_CHECKOUT_SHIPPING_COUNTRIES);
    expect(opts.length).toBe(STRIPE_CHECKOUT_SHIPPING_COUNTRIES.length);
    expect(opts.length).toBeGreaterThan(200);
    for (const code of ['US', 'GB', 'IN', 'BR', 'JP', 'ZA', 'PH']) {
      expect(opts.some((o) => o.value === code)).toBe(true);
    }
  });

  it('labels are readable names, sorted', () => {
    const opts = countryOptions(['ZA', 'US', 'BR']);
    expect(opts.map((o) => o.label)).toEqual(['Brazil', 'South Africa', 'United States']);
  });
});
