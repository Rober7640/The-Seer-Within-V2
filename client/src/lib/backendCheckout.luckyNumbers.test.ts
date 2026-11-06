// 12: what the shared checkout helper sends and hands back. Same mock as
// backendCheckout.soulmateInitials.test.ts: the live switch is stubbed for THIS test's memory only.
//
//   npx vitest run client/src/lib/backendCheckout.luckyNumbers.test.ts

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./posthog', () => ({ getDistinctId: () => null, getUTMs: () => undefined }));

const REQUEST = {
  offer: 'lucky-numbers',
  treatment: 'page',
  bump: true,
  firstName: 'Sarah',
  letterCode: '13',
  fullBirthName: 'Sarah Jane Miller',
  dateOfBirth: '1961-03-14',
} as const;

async function load(live: boolean, fetchMock?: ReturnType<typeof vi.fn>) {
  vi.resetModules();
  vi.stubEnv('VITE_BACKEND_CHECKOUT_LIVE', live ? 'true' : 'false');
  vi.stubGlobal('window', { location: { href: '' } });
  if (fetchMock) vi.stubGlobal('fetch', fetchMock);
  return import('./backendCheckout');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('beginBackendCheckout carries 12’s fields (11’s, shared)', () => {
  it('posts her birth name and date to our server, and no price', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ url: 'https://stripe.test/cs' }) }));
    const { beginBackendCheckout } = await load(true, fetchMock);
    await beginBackendCheckout(REQUEST);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body).toMatchObject({ ...REQUEST });
    expect(body).not.toHaveProperty('priceCents');
    expect(body.amountCents).toBeUndefined();
  });

  it('other offers send no fullBirthName key at all', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ url: 'https://stripe.test/cs' }) }));
    const { beginBackendCheckout } = await load(true, fetchMock);
    await beginBackendCheckout({ offer: 'tea-reading', treatment: 'page', bump: false });
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body).not.toHaveProperty('fullBirthName');
  });

  it('hands back the server’s code, so the page can mark the right box', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: 'That is not a real date of birth.', code: 'dob_invalid' }),
    }));
    const { beginBackendCheckout } = await load(true, fetchMock);
    expect(await beginBackendCheckout(REQUEST)).toEqual({
      status: 'error',
      message: 'That is not a real date of birth.',
      code: 'dob_invalid',
    });
  });

  it('with no code the error is the shape it always was', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: 'Nope' }) }));
    const { beginBackendCheckout } = await load(true, fetchMock);
    expect(await beginBackendCheckout(REQUEST)).toEqual({ status: 'error', message: 'Nope' });
  });

  it('switched off, the press logs and stops, and the log carries neither her birth name nor her date', async () => {
    const fetchMock = vi.fn();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { beginBackendCheckout, BACKEND_CHECKOUT_LIVE } = await load(false, fetchMock);
    expect(BACKEND_CHECKOUT_LIVE).toBe(false);
    expect(await beginBackendCheckout(REQUEST)).toEqual({ status: 'preview' });
    expect(fetchMock).not.toHaveBeenCalled();
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain('would checkout');
    expect(logged).not.toContain('Miller');
    expect(logged).not.toContain('1961');
  });
});
