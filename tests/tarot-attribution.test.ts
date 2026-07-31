// Unit tests for /fb-tarot PostHog attribution (client/src/lib/tarotAttribution.ts).
//
//   npx vitest run tests/tarot-attribution.test.ts
//
// What these pin down:
//  1. The REGRESSION that motivated the module — a CLEAN ad URL (no `&deck=`, which is
//     what the live ads run) must resolve to the live deck, never to the 'decode-him'
//     placeholder whose strip art is byte-identical to the palm thumbs strip.
//  2. That the deck survives to `/fb-tarot/welcome1` and `/welcome2`, where Stripe
//     redirects with NO funnel params at all. This is the only reason the module exists;
//     URL parsing alone cannot recover it there.
//  3. FORWARD-COMPAT for the face-up decode-him decks: `facing` must come from the deck
//     registry, so a new face-up deck on `?deck=<id>` splits face-up vs face-down with
//     no change to the tracking code. The registry sweep at the bottom fails the moment
//     a new deck is added that the tracking layer cannot describe.

import { beforeEach, describe, expect, it } from 'vitest';

// jsdom is not configured for this project (vitest environment: 'node'), and the module
// only needs get/set/removeItem. Install the stub BEFORE importing the module under test.
class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  get length() { return this.m.size; }
}

const store = new MemoryStorage();
(globalThis as any).window = { sessionStorage: store };

const { syncTarotAttribution, rememberTarotDraw, tarotEventProps } = await import(
  '@/lib/tarotAttribution'
);
const { DECKS, DEFAULT_DECK, getDeck } = await import('@/content/tarotReads');

// The three URLs the media buyer is running for the face-down decode-him launch.
const LIVE_ADS = [
  { path: '/fb-tarot/c', search: '?hook=cards-return' },
  { path: '/fb-tarot/c', search: '?hook=cards-honest' },
  { path: '/fb-tarot/c', search: '?hook=cards-feels' },
];

beforeEach(() => store.clear());

describe('clean ad URLs (the live face-down launch)', () => {
  it('resolves the LIVE deck, never the decode-him placeholder', () => {
    for (const ad of LIVE_ADS) {
      store.clear();
      const props = syncTarotAttribution(ad.path, ad.search);
      // The exact bug this replaces: `urlParams.get('deck') || 'decode-him'` returned
      // 'decode-him' for every one of these, disagreeing with tarot_bridge_view.deck.
      expect(props.deck).not.toBe('decode-him');
      expect(props.deck).toBe(DEFAULT_DECK);
      expect(props.deck).toBe('return-mhf');
    }
  });

  it('carries hook, version and face-down facing', () => {
    const props = syncTarotAttribution('/fb-tarot/c', '?hook=cards-return');
    expect(props.hook).toBe('cards-return');
    expect(props.version).toBe('c');
    expect(props.facing).toBe('down');
  });

  it('reads version from the route: /fb-tarot=a, /b=b, /c=c', () => {
    expect(syncTarotAttribution('/fb-tarot', '?hook=cards-feels').version).toBe('a');
    store.clear();
    expect(syncTarotAttribution('/fb-tarot/b', '?hook=cards-feels').version).toBe('b');
    store.clear();
    expect(syncTarotAttribution('/fb-tarot/c', '?hook=cards-feels').version).toBe('c');
  });
});

describe('attribution survives to the upsell steps', () => {
  // Stripe redirects to /fb-tarot/welcome1 with only its own session id, so there is
  // NO hook, NO deck and NO card in the URL. Without persistence every upsell event
  // would fall back to the default deck and mislabel the moment a 2nd deck runs.
  it('deck/hook/card reach welcome1, welcome2 and success with an empty query', () => {
    syncTarotAttribution('/fb-tarot/c', '?hook=cards-return');
    rememberTarotDraw('b', 'a');

    for (const step of ['/fb-tarot/welcome1', '/fb-tarot/welcome2', '/fb-tarot/success']) {
      const props = syncTarotAttribution(step, '');
      expect(props.deck).toBe('return-mhf');
      expect(props.hook).toBe('cards-return');
      expect(props.card).toBe('b');
      expect(props.panel).toBe('a');
      expect(props.facing).toBe('down');
    }
  });

  it('tarotEventProps() returns the same bag off-route, for the shared upsell hooks', () => {
    syncTarotAttribution('/fb-tarot/c', '?hook=cards-honest');
    rememberTarotDraw('c', 'c');
    expect(tarotEventProps()).toMatchObject({
      deck: 'return-mhf', hook: 'cards-honest', card: 'c', panel: 'c', facing: 'down',
    });
  });

  it('returns undefined for a visitor who never came through the tarot bridge', () => {
    // Guards the shared V1 upsell hooks: an ungated spread must not invent properties.
    expect(tarotEventProps()).toBeUndefined();
  });
});

describe('the chat handoff', () => {
  it('picks up the drawn card from the chat URL', () => {
    syncTarotAttribution('/fb-tarot/c', '?hook=cards-return');
    const props = syncTarotAttribution('/fb-tarot/chat', '?hook=cards-return&card=b&v=c');
    expect(props.card).toBe('b');
    expect(props.version).toBe('c');
  });

  it('keeps the default deck when the chat URL omits &deck= (the clean-link case)', () => {
    // TarotBridge only appends &deck= for a NON-default deck, so an absent param on
    // /chat means the default — it must not be read as "unknown".
    syncTarotAttribution('/fb-tarot/c', '?hook=cards-feels');
    expect(syncTarotAttribution('/fb-tarot/chat', '?hook=cards-feels&card=a').deck)
      .toBe(DEFAULT_DECK);
  });
});

describe('FORWARD-COMPAT: face-up decks', () => {
  // The face-up decode-him decks ship on an explicit ?deck=<id>. Nothing below should
  // need editing when that happens — these assertions are the proof.
  it('an explicit ?deck= wins over the default', () => {
    const props = syncTarotAttribution('/fb-tarot/c', '?hook=cards-honest&deck=arcana-mfh');
    expect(props.deck).toBe('arcana-mfh');
  });

  it('reports facing=up for a face-up deck WITHOUT the tracking code knowing the id', () => {
    expect(syncTarotAttribution('/fb-tarot/c', '?hook=cards-honest&deck=arcana-mfh').facing)
      .toBe('up');
    store.clear();
    expect(syncTarotAttribution('/fb-tarot/c', '?hook=cards-honest&deck=arcana-eef').facing)
      .toBe('up');
  });

  it('a face-up deck carries through to the upsell steps too', () => {
    syncTarotAttribution('/fb-tarot/c', '?hook=cards-honest&deck=arcana-mfh');
    rememberTarotDraw('a', 'a');
    const props = syncTarotAttribution('/fb-tarot/welcome1', '');
    expect(props).toMatchObject({ deck: 'arcana-mfh', facing: 'up', card: 'a' });
  });

  it('EVERY deck in the registry is describable — new decks cannot go untracked', () => {
    for (const id of Object.keys(DECKS)) {
      store.clear();
      const props = syncTarotAttribution('/fb-tarot/c', `?hook=cards-honest&deck=${id}`);
      expect(props.deck).toBe(id);
      // Registry-driven, not a hardcoded list: this is what makes a new face-up deck
      // split correctly on day one.
      expect(props.facing).toBe(getDeck(id as any).facing);
      expect(['up', 'down']).toContain(props.facing);
    }
  });
});

describe('bad input cannot create junk breakdown values', () => {
  it('an unknown ?deck= falls back to the default deck', () => {
    expect(syncTarotAttribution('/fb-tarot/c', '?hook=cards-return&deck=not-a-deck').deck)
      .toBe(DEFAULT_DECK);
  });

  it('an unknown ?hook= falls back to the default hook', () => {
    expect(syncTarotAttribution('/fb-tarot/c', '?hook=nonsense').hook).toBe('cards-honest');
  });

  it('a hook the deck has no reads for falls back, matching what she was SHOWN', () => {
    // return-mhf carries the four decode-him hooks only. A self-frame hook would render
    // the default copy, so the analytics hook must say the same.
    const props = syncTarotAttribution('/fb-tarot/c', '?hook=cards-love-again');
    expect(props.hook).toBe('cards-honest');
    expect(DECKS[DEFAULT_DECK].reads['cards-love-again']).toBeUndefined();
  });

  it('survives corrupt sessionStorage without throwing', () => {
    store.setItem('seer_tarot_attribution', '{not json');
    expect(tarotEventProps()).toBeUndefined();
    expect(syncTarotAttribution('/fb-tarot/c', '?hook=cards-return').deck).toBe(DEFAULT_DECK);
  });

  it('drops a deck id that no longer exists in the registry', () => {
    store.setItem('seer_tarot_attribution', JSON.stringify({ deck: 'retired', hook: 'cards-return' }));
    expect(tarotEventProps()).toBeUndefined();
  });
});

describe('a bridge visit is a FRESH quiz', () => {
  it('clears a previous draw so the old card cannot leak into the new visit', () => {
    syncTarotAttribution('/fb-tarot/c', '?hook=cards-return');
    rememberTarotDraw('b', 'a');
    expect(tarotEventProps()?.card).toBe('b');

    // Same tab, new ad click. TarotBridge drops the chat session here for the same
    // reason; the attribution must reset in step with it.
    const props = syncTarotAttribution('/fb-tarot/c', '?hook=cards-feels');
    expect(props.card).toBeUndefined();
    expect(props.panel).toBeUndefined();
    expect(props.hook).toBe('cards-feels');
  });

  it('a clean bridge URL resets a previously stored NON-default deck', () => {
    // Otherwise a visitor who saw the face-up deck first would keep being counted
    // against it after clicking a clean face-down ad in the same tab.
    syncTarotAttribution('/fb-tarot/c', '?hook=cards-honest&deck=arcana-mfh');
    expect(syncTarotAttribution('/fb-tarot/c', '?hook=cards-honest').deck).toBe(DEFAULT_DECK);
  });
});
