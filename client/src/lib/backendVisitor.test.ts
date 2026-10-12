// The backend funnel's visitor id (lib/backendVisitor.ts) — the subject 04's price test buckets on.
//
//   npx vitest run client/src/lib/backendVisitor.test.ts
//
// What these pin down: the id is the SAME for the whole page life, with or without storage. 04's
// server resolves her price arm from it twice — once when the page asks for its price, once at
// checkout — so two different ids in one page life would split the arm between the price she
// sees and the price she is charged (a 409 on every press).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A fresh copy of the module, so its page-life memo starts empty. */
async function freshModule() {
  vi.resetModules();
  return import('./backendVisitor');
}

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    length: 0,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getBackendVisitorId', () => {
  it('⭐ private mode (storage throws): one id for the whole page life, not a new one per call', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError: storage disabled');
      },
      setItem: () => {
        throw new Error('SecurityError: storage disabled');
      },
    });
    const { getBackendVisitorId } = await freshModule();
    const first = getBackendVisitorId();
    expect(first).toMatch(/^v-ephemeral-/);
    for (let i = 0; i < 20; i++) expect(getBackendVisitorId()).toBe(first);
  });

  it('storage that reads but refuses writes (old Safari private mode) is stable too', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    const { getBackendVisitorId } = await freshModule();
    const first = getBackendVisitorId();
    expect(getBackendVisitorId()).toBe(first);
  });

  it('no storage at all (a non-browser runtime) is stable too', async () => {
    vi.stubGlobal('localStorage', undefined);
    const { getBackendVisitorId } = await freshModule();
    const first = getBackendVisitorId();
    expect(first).toMatch(/^v-ephemeral-/);
    expect(getBackendVisitorId()).toBe(first);
  });

  it('a new page life in private mode gets a new id (nothing can carry it over)', async () => {
    vi.stubGlobal('localStorage', undefined);
    const a = (await freshModule()).getBackendVisitorId();
    const b = (await freshModule()).getBackendVisitorId();
    expect(a).not.toBe(b);
  });

  it('with storage: creates one id, persists it, and returns it on every call and every page load', async () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    const first = (await freshModule()).getBackendVisitorId();
    expect(first).not.toMatch(/ephemeral/);
    expect(storage.data.get('be_visitor_id')).toBe(first);
    const again = await freshModule();
    expect(again.getBackendVisitorId()).toBe(first);
    expect(again.getBackendVisitorId()).toBe(first);
  });

  it('with storage: an id already stored (an earlier visit) is the one used', async () => {
    const storage = memoryStorage();
    storage.data.set('be_visitor_id', 'visitor-from-last-week');
    vi.stubGlobal('localStorage', storage);
    const { getBackendVisitorId } = await freshModule();
    expect(getBackendVisitorId()).toBe('visitor-from-last-week');
  });
});
