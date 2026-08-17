// End-to-end verification of the /fb-tarot/c → /fb-tarot/b redirect, driven as a
// real browser against the muted local sandbox (see .claude/skills/v1-funnel-audit).
//
// The vitest suites next to server/lib/tarotRedirect.ts prove the redirect in
// isolation. This file exists for the things only a browser can answer:
//   • does the ad URL actually land on /b, with the query string intact, after the
//     real Express + Vite stack has had its say (not a stub app);
//   • does the BRIDGE still work afterwards — the card grid renders, a tap hands
//     off to the chat, and the handoff carries v=b;
//   • is it exactly ONE navigation (a 301/302 hop, not a client-side bounce that
//     would fire PageView twice).
//
// 🔒 Every facebook.com / connect.facebook.net request is aborted, so the pixel
// hardcoded in client/index.html cannot fire during the run. The sandbox env mutes
// the SERVER relay; this route block is the other half.
//
// 🔒 Nothing here submits an email or reaches checkout, so /api/lead never fires
// and no marketing list or card is touched.
import { test, expect, type Page } from '@playwright/test';

// The four live ad URLs in v1_tarot_version_bc_2026, exactly as the media team
// runs them: clean, no &deck= (return-mhf is DEFAULT_DECK).
const AD_HOOKS = ['cards-will-commit', 'cards-return', 'cards-who-he-is', 'cards-feels'];

interface MetaGuard {
  /** Meta requests we intercepted and aborted. Non-empty is GOOD — it is the
   *  pixel trying to load and being stopped. */
  blocked: string[];
  /** Meta requests that reached the network. Must always be empty. */
  leaked: string[];
  /** PageView relays the CLIENT fired at our own /api/fb-event. One per real
   *  page load — the number that would double if the redirect were client-side. */
  pageViews: number;
}

/**
 * Block Meta before anything loads.
 *
 * The pixel is hardcoded in client/index.html, so it WILL try to fetch
 * fbevents.js on every page — that attempt is expected. What matters is that
 * none of them is ever allowed through, so the two are recorded separately:
 * asserting `blocked` is empty would assert the pixel never ran, which is not
 * the safety property and fails on a perfectly good run.
 */
async function blockMeta(page: Page): Promise<MetaGuard> {
  const guard: MetaGuard = { blocked: [], leaked: [], pageViews: 0 };
  await page.route('**/*', (route) => {
    const req = route.request();
    const url = req.url();
    if (url.includes('facebook.com') || url.includes('connect.facebook.net')) {
      guard.blocked.push(url);
      return route.abort();
    }
    if (url.includes('/api/fb-event') && req.method() === 'POST') {
      try {
        if (JSON.parse(req.postData() ?? '{}').eventName === 'PageView') guard.pageViews++;
      } catch { /* not our concern here */ }
    }
    return route.continue();
  });
  return guard;
}

/** Wait for any PageView relay to have been fired and settled. */
const settle = (page: Page) => page.waitForTimeout(1500);

test.describe('/fb-tarot/c redirects to /fb-tarot/b', () => {
  for (const hook of AD_HOOKS) {
    test(`${hook}: lands on /b with the hook intact`, async ({ page }) => {
      const meta = await blockMeta(page);
      await page.goto(`/fb-tarot/c?hook=${hook}`, { waitUntil: 'domcontentloaded' });

      const url = new URL(page.url());
      expect(url.pathname).toBe('/fb-tarot/b');
      expect(url.searchParams.get('hook')).toBe(hook);
      expect(meta.leaked, 'no Meta request may reach the network').toEqual([]);
    });
  }

  test('carries fbclid and the utm params through the hop', async ({ page }) => {
    await blockMeta(page);
    const qs = 'hook=cards-return&utm_source=fb&utm_campaign=tarot_aug&fbclid=IwAR9testonly';
    await page.goto(`/fb-tarot/c?${qs}`, { waitUntil: 'domcontentloaded' });

    const url = new URL(page.url());
    expect(url.pathname).toBe('/fb-tarot/b');
    // fbclid is what the Meta pixel turns into the _fbc cookie that CAPI matches
    // purchases on. Losing it here would degrade attribution silently.
    expect(url.searchParams.get('fbclid')).toBe('IwAR9testonly');
    expect(url.searchParams.get('utm_source')).toBe('fb');
    expect(url.searchParams.get('utm_campaign')).toBe('tarot_aug');
    expect(url.searchParams.get('hook')).toBe('cards-return');
  });

  test('is a single server-side hop, not a client-side bounce', async ({ page }) => {
    await blockMeta(page);
    const res = await page.goto('/fb-tarot/c?hook=cards-return', { waitUntil: 'domcontentloaded' });

    // The redirect must be resolved by the server before the document is served:
    // exactly one redirect in the chain, and it is ours.
    const chain = res!.request().redirectedFrom();
    expect(chain, 'the document should have been redirected').not.toBeNull();
    expect(new URL(chain!.url()).pathname).toBe('/fb-tarot/c');
    expect(chain!.redirectedFrom(), 'only ONE hop — no redirect chain').toBeNull();
    expect(res!.status()).toBe(200);
  });

  // The claim this backs: a server-side redirect costs exactly the same number of
  // PageViews as landing on /b directly. A client-side bounce would render /c,
  // fire one, then fire a second on /b — inflating every landing metric and every
  // downstream conversion rate by ~2x on this funnel.
  test('fires exactly as many PageViews as a direct /b landing', async ({ page }) => {
    const viaC = await blockMeta(page);
    await page.goto('/fb-tarot/c?hook=cards-return', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const redirected = viaC.pageViews;

    const direct = await blockMeta(page);
    await page.goto('/fb-tarot/b?hook=cards-return', { waitUntil: 'domcontentloaded' });
    await settle(page);

    expect(redirected, 'the redirect must not add a PageView').toBe(direct.pageViews);
    expect(redirected, 'and a landing should fire exactly one').toBe(1);
  });

  test('the bridge still works after the redirect, and hands off with v=b', async ({ page }) => {
    await blockMeta(page);
    await page.goto('/fb-tarot/c?hook=cards-will-commit', { waitUntil: 'domcontentloaded' });
    expect(new URL(page.url()).pathname).toBe('/fb-tarot/b');

    // The card grid is the whole lander — if the redirect broke the params, the
    // page would render a different (or empty) bridge.
    const cards = page.locator('[data-testid^="tarot-card-"]');
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    await cards.first().click();

    // Reading beat → straight to chat for versions B and C.
    await page.waitForURL('**/fb-tarot/chat**', { timeout: 20_000 });
    const chat = new URL(page.url());
    expect(chat.searchParams.get('hook')).toBe('cards-will-commit');
    expect(chat.searchParams.get('card')).toBeTruthy();
    // 🔴 The handoff must now say v=b. While the B/C experiment is running the
    // SERVER can still override this to C — that is by design — but the URL the
    // bridge emits is what the redirect is meant to change.
    expect(chat.searchParams.get('v')).toBe('b');
  });
});

test.describe('what the redirect must not touch', () => {
  test('/fb-tarot/b is served directly, with no redirect at all', async ({ page }) => {
    await blockMeta(page);
    const res = await page.goto('/fb-tarot/b?hook=cards-return', { waitUntil: 'domcontentloaded' });
    expect(res!.request().redirectedFrom(), 'no loop').toBeNull();
    expect(new URL(page.url()).pathname).toBe('/fb-tarot/b');
  });

  test('bare /fb-tarot (Version A) is untouched', async ({ page }) => {
    await blockMeta(page);
    const res = await page.goto('/fb-tarot?hook=cards-return', { waitUntil: 'domcontentloaded' });
    expect(res!.request().redirectedFrom()).toBeNull();
    expect(new URL(page.url()).pathname).toBe('/fb-tarot');
  });

  // 🔴 The one that would be a real content change: on fb-palm the URL decides the
  // opener (parsePalmParams), with no experiment to override it. Redirecting palm
  // /c would switch live traffic from the interactive opener to the pre-written one.
  test('/fb-palm/c is NOT redirected', async ({ page }) => {
    await blockMeta(page);
    const res = await page.goto('/fb-palm/c?hook=palm-love&sign=thumb', { waitUntil: 'domcontentloaded' });
    expect(res!.request().redirectedFrom(), 'fb-palm must never be redirected').toBeNull();
    expect(new URL(page.url()).pathname).toBe('/fb-palm/c');
  });
});
