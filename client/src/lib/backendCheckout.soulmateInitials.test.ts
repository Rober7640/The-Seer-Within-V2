import { describe, it, expect, vi, beforeEach } from 'vitest';

// jsdom isn't available in this test environment (default `environment: 'node'` in
// vitest.config.ts, and the jsdom package isn't installed). `./posthog` imports the
// real `posthog-js`, which touches `location`/`document` at module-eval time — that
// blows up under plain `node`. Mock it: this test only needs to assert the POSTed
// body, not exercise real PostHog attribution.
vi.mock('./posthog', () => ({
  getDistinctId: () => null,
  getUTMs: () => undefined,
}));

describe('beginBackendCheckout carries evelyn-vsl intake', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BACKEND_CHECKOUT_LIVE', 'true');
    // beginBackendCheckout only touches `window.location.href` on success, so a
    // minimal global stub is enough to avoid jsdom's "Not implemented: navigation"
    // throw on assignment (and works without jsdom installed at all).
    vi.stubGlobal('window', { location: { href: '' } });
  });

  it('posts stone, dateOfBirth and email in the body', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ url: 'https://stripe.test/cs' }) }));
    vi.stubGlobal('fetch', fetchMock);
    vi.resetModules();
    const { beginBackendCheckout } = await import('./backendCheckout');
    await beginBackendCheckout({
      offer: 'soulmate-initials', treatment: 'page', bump: true,
      firstName: 'Sarah', email: 's@x.com', dateOfBirth: '1990-05-15', stone: 'jade',
    } as any);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ offer: 'soulmate-initials', bump: true, stone: 'jade', dateOfBirth: '1990-05-15', email: 's@x.com' });
  });
});
