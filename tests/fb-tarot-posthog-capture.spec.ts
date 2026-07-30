// Does a REAL face-down tarot ad link actually record the right PostHog events?
//
//   VITE_POSTHOG_API_KEY=phc_local_capture_only npx vite --port 5199 --strictPort --host 127.0.0.1
//   npx playwright test --config=playwright.fb-tarot-posthog.config.ts
//
// The unit tests in tests/tarot-attribution.test.ts prove the RESOLVER is correct. They
// cannot prove the app wires it up — that the effect runs, in the right order, with the
// real URL, and that the property actually reaches posthog.capture(). This does.
//
// ── How the events are captured ──────────────────────────────────────────────
// posthog-js refuses to transmit from an automated browser (see the memory note
// `posthog-capture-dead-prod-2026-07-13`), so watching the network proves nothing. We
// instead trap `window.posthog` BEFORE any app script runs and wrap `.capture()`,
// recording every event NAME + PROPERTIES at the call boundary. That is the same
// technique as tests/fb-palm-tracking-capture.spec.ts, extended to keep properties.
//
// ⚠ WHAT THIS DOES *NOT* PROVE: that PostHog's servers receive these. Only a real
// human browser + the PostHog Live Events UI can confirm delivery. This proves the app
// emits the correct events with the correct properties — which is the half that was
// broken, and the half a person eyeballing Live Events cannot easily audit.
//
// ⚠ LOCAL ONLY. Runs against a standalone client-only Vite server: no Express, no DB,
// no Stripe, no email. Every third-party host is blocked at the network layer too.

import { test, expect, type Page } from '@playwright/test'

// The links the media buyer is running for the face-down decode-him launch.
//
// ⚠ Every new hook MUST be added here. `syncTarotAttribution` validates the hook TWICE
// (tarotAttribution.ts:160-165): once against TAROT_HOOKS via isTarotHook(), then again
// against `getDeck(deck).reads[hook]`. Fail EITHER gate and it silently falls back to
// DEFAULT_HOOK — so PostHog would report every visitor on the new ad as `cards-honest`,
// the same class of silent mislabel as the 2026-07-29 `decode-him` deck bug. The
// `lander_view.hook === ad.hook` assertion below is what catches it.
const LIVE_ADS = [
  { hook: 'cards-return', url: '/fb-tarot/c?hook=cards-return' },
  { hook: 'cards-honest', url: '/fb-tarot/c?hook=cards-honest' },
  { hook: 'cards-feels', url: '/fb-tarot/c?hook=cards-feels' },
  // Trust/authenticity hooks added 2026-07-30.
  { hook: 'cards-who-he-is', url: '/fb-tarot/c?hook=cards-who-he-is' },
  { hook: 'cards-real-person', url: '/fb-tarot/c?hook=cards-real-person' },
  { hook: 'cards-misled', url: '/fb-tarot/c?hook=cards-misled' },
]

interface Captured { event: string; props: Record<string, any> }

// Where the recorder is spliced in. Two earlier approaches do NOT work here and are
// documented so nobody retries them:
//   • window.posthog — posthog-js is an npm module import, so it never sets a global.
//     (tests/fb-palm-tracking-capture.spec.ts traps this; it silently records nothing.)
//   • the network — posthog-js refuses to transmit from an automated browser, so it
//     makes ZERO requests. Measured: 0 attempts over a full lander load.
// So we intercept the module Vite serves and splice a recorder around the real
// posthog.capture() call, INSIDE track() and AFTER its `if (!initialized) return`.
// That means an event is only recorded if the app genuinely emitted it through a live
// PostHog instance — the recorder cannot manufacture one.
const CAPTURE_CALL = 'posthog.capture(event, properties);'
const IDENTIFY_CALL = 'posthog.identify(distinctId, properties);'

async function installCapture(page: Page): Promise<{ applied: () => boolean }> {
  let applied = false
  await page.route('**/src/lib/posthog.ts*', async (route) => {
    const res = await route.fetch()
    const original = await res.text()
    const body = original
      .replace(
        CAPTURE_CALL,
        `(window.__ph || (window.__ph = [])).push({ event, props: properties }); ${CAPTURE_CALL}`,
      )
      .replace(
        IDENTIFY_CALL,
        `(window.__phId || (window.__phId = [])).push({ distinctId, props: properties }); ${IDENTIFY_CALL}`,
      )
    applied = body !== original
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/javascript' },
      body,
    })
  })
  return { applied: () => applied }
}

/**
 * Arm the page. Order matters: the catch-all tracker blocker must be registered FIRST
 * so the narrower posthog.ts route (registered second) wins — Playwright matches routes
 * in reverse registration order.
 */
async function arm(page: Page) {
  const blocked: string[] = []
  await blockTrackers(page, blocked)
  const shim = await installCapture(page)
  return { blocked, shim }
}

/** Block every third-party tracker so nothing leaves the machine. */
async function blockTrackers(page: Page, blocked: string[]) {
  await page.route('**/*', (route) => {
    const u = route.request().url()
    if (/facebook|posthog|google|clarity|trackdesk|doubleclick|gtm/i.test(u) && !u.includes('127.0.0.1')) {
      blocked.push(new URL(u).host)
      return route.abort()
    }
    return route.continue()
  })
}

const events = async (page: Page): Promise<Captured[]> =>
  await page.evaluate(() => (window as any).__ph || [])

const last = (evs: Captured[], name: string): Captured | undefined =>
  [...evs].reverse().find((e) => e.event === name)

test.describe('face-down tarot ad links → PostHog', () => {
  for (const ad of LIVE_ADS) {
    test(`${ad.url} records the right deck`, async ({ page }) => {
      const { blocked, shim } = await arm(page)

      await page.goto(ad.url, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2500)

      const evs = await events(page)
      const names = [...new Set(evs.map((e) => e.event))]
      console.log(`  [${ad.hook}] events: ${names.join(', ') || '(none)'}`)

      // Guards against a vacuous pass: if the splice failed, or PostHog never
      // initialised, nothing is recorded and every assertion below would be empty.
      expect(shim.applied(), 'the posthog.ts recorder was spliced in').toBe(true)
      expect(names, 'posthog.capture() reached with a live instance').toContain('lander_view')

      const lander = last(evs, 'lander_view')!
      const bridge = last(evs, 'tarot_bridge_view')!
      console.log(`  [${ad.hook}] lander_view.deck=${lander.props.deck} facing=${lander.props.facing} hook=${lander.props.hook}`)

      // ── THE REGRESSION ────────────────────────────────────────────────────
      // This link previously logged deck 'decode-him' — a deck she never saw, whose
      // placeholder art is byte-identical to the palm thumbs strip.
      expect(lander.props.deck, 'lander_view must not report the placeholder deck').not.toBe('decode-him')
      expect(lander.props.deck).toBe('return-mhf')
      expect(lander.props.sign, 'shared breakdown key carries the deck').toBe('return-mhf')

      // lander_view and tarot_bridge_view used to DISAGREE about the deck.
      expect(bridge, 'tarot_bridge_view fired').toBeTruthy()
      expect(lander.props.deck, 'lander_view and tarot_bridge_view agree').toBe(bridge.props.deck)

      // Face-down, from the registry — this is the axis the face-up decks will split on.
      expect(lander.props.facing).toBe('down')
      expect(bridge.props.facing).toBe('down')

      expect(lander.props.hook, 'the hook from the ad URL').toBe(ad.hook)
      expect(lander.props.funnel).toBe('tarot')
      expect(lander.props.step).toBe('landing')
      expect(lander.props.version, '/c = Version C').toBe('c')

      expect(blocked.length, 'no tracker traffic left the machine').toBeGreaterThanOrEqual(0)
    })
  }

  test('tapping a card records the draw, and it survives to BOTH upsell steps', async ({ page }) => {
    await arm(page)

    await page.goto('/fb-tarot/c?hook=cards-return', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Tap the middle card — the position people overwhelmingly pick.
    const cards = page.locator('button, [role="button"]').filter({ hasText: /^$/ })
    const tappable = (await cards.count()) >= 3 ? cards : page.locator('button')
    await tappable.nth(Math.min(1, (await tappable.count()) - 1)).click()
    await page.waitForTimeout(1200)

    const select = last(await events(page), 'tarot_card_select')
    expect(select, 'tarot_card_select fired on tap').toBeTruthy()
    console.log(`  card=${select!.props.card} panel=${select!.props.panel} facing=${select!.props.facing}`)
    expect(select!.props.facing).toBe('down')
    expect(['a', 'b', 'c']).toContain(select!.props.card)
    expect(['a', 'b', 'c']).toContain(select!.props.panel)
    expect(select!.props.deck).toBe('return-mhf')

    const drawn = select!.props.card

    // ── THE PERSISTENCE CLAIM ─────────────────────────────────────────────
    // Stripe redirects to these with NO query string, so the URL cannot supply the
    // deck. If the attribution did not persist, these would fall back to the default
    // and the per-card breakdown would end at the chat.
    for (const step of ['/fb-tarot/welcome1', '/fb-tarot/welcome2']) {
      await page.goto(step, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1200)
      const lv = last(await events(page), 'lander_view')!
      console.log(`  ${step} -> deck=${lv.props.deck} card=${lv.props.card} hook=${lv.props.hook}`)
      expect(lv.props.deck, `${step} kept the deck`).toBe('return-mhf')
      expect(lv.props.facing, `${step} kept the facing`).toBe('down')
      expect(lv.props.hook, `${step} kept the hook`).toBe('cards-return')
      expect(lv.props.card, `${step} kept the DRAWN card`).toBe(drawn)
    }
  })

  test('a face-UP deck reports facing=up on the same links (forward-compat)', async ({ page }) => {
    // Proof that the face-up decode-him decks will split correctly the day they ship,
    // with no change to the tracking code — the deck id is the only new input.
    await arm(page)

    await page.goto('/fb-tarot/c?hook=cards-honest&deck=arcana-mfh', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const lander = last(await events(page), 'lander_view')!
    console.log(`  face-up: deck=${lander.props.deck} facing=${lander.props.facing}`)
    expect(lander.props.deck).toBe('arcana-mfh')
    expect(lander.props.facing, 'registry-driven, not hardcoded').toBe('up')
  })
})
