import { test, expect, Page } from '@playwright/test';

/**
 * Regression guard for the V1 upsell chat shell.
 *
 * The bug this prevents: the outer column used `min-h-screen` and the message list
 * was a flex child without `min-h-0`. A flex child defaults to `min-height: auto`, so
 * the list never shrank below its content — it grew, the whole document grew with it,
 * and the message list was never scrollable. The auto-scroll effect became dead code
 * (`scrollTo()` does nothing when scrollHeight === clientHeight), which pushed every
 * new message AND every button — quick replies, the accept CTA, the shipping form —
 * below the fold from roughly the eighth message onward.
 *
 * Both pages are shared by all six V1 funnels (/ /fb /fb2 /fb-palm /fb-tarot /gdn),
 * so a regression here hits every one of them on both upsell steps.
 *
 * Runs against `demo=true`, which short-circuits the session fetch — no DB, no Stripe.
 * Set PW_BASE_URL to point at a dev server on a non-default port.
 */

const BASE = process.env.PW_BASE_URL ?? '';

const QR = '[data-testid="container-quick-replies"]';

const VIEWPORTS = [
  { name: '430x880 modern phone', width: 430, height: 880 },
  { name: '375x667 iPhone SE', width: 375, height: 667 },
  { name: '1280x900 desktop', width: 1280, height: 900 },
];

const PAGES = [
  { label: 'welcome1', path: '/welcome1', container: 'container-chat' },
  { label: 'welcome2', path: '/welcome2', container: 'container-chat-upsell2' },
];

/** Wait until the message list stops moving, so we never assert mid-animation. */
async function waitForScrollSettle(page: Page, containerId: string) {
  let last = -1;
  for (let i = 0; i < 40; i++) {
    const top = await page.evaluate(
      (id) => document.querySelector(`[data-testid="${id}"]`)?.scrollTop ?? -1,
      containerId,
    );
    if (top === last) return;
    last = top;
    await page.waitForTimeout(150);
  }
}

for (const pageDef of PAGES) {
  for (const vp of VIEWPORTS) {
    test(`${pageDef.label} chat shell stays inside the viewport @ ${vp.name}`, async ({ page }) => {
      // The scripted typing delays take a couple of minutes to reach the first question.
      test.setTimeout(300_000);

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}${pageDef.path}?demo=true`);

      // The quick replies are the first thing the buyer has to be able to tap.
      await page.waitForSelector(QR, { timeout: 240_000 });
      await waitForScrollSettle(page, pageDef.container);

      const m = await page.evaluate((containerId) => {
        const container = document.querySelector(`[data-testid="${containerId}"]`)!;
        const qr = document.querySelector('[data-testid="container-quick-replies"]')!;
        const inner = container.querySelector('.max-w-lg') ?? container;
        const kids = [...inner.children].filter(
          (el) => !((el as HTMLElement).dataset?.testid ?? '').startsWith('indicator-typing'),
        );
        const newest = kids[kids.length - 1];
        const qrBox = qr.getBoundingClientRect();
        return {
          docScrollHeight: document.documentElement.scrollHeight,
          innerHeight: window.innerHeight,
          containerScrollHeight: container.scrollHeight,
          containerClientHeight: container.clientHeight,
          qrTop: qrBox.top,
          qrBottom: qrBox.bottom,
          qrLeft: qrBox.left,
          qrRight: qrBox.right,
          newestBottom: newest ? newest.getBoundingClientRect().bottom : null,
        };
      }, pageDef.container);

      // 1. The page itself must not scroll — the shell is pinned to the viewport.
      expect(
        m.docScrollHeight,
        'document grew past the viewport: the outer column is not height-constrained',
      ).toBeLessThanOrEqual(m.innerHeight + 1);

      // 2. The message list must be the thing that scrolls.
      expect(
        m.containerScrollHeight,
        'message list is not scrollable: it is missing min-h-0, so auto-scroll is dead code',
      ).toBeGreaterThan(m.containerClientHeight);

      // 3. The first interactive element must be fully on screen.
      expect(m.qrTop, 'quick replies start above the viewport').toBeGreaterThanOrEqual(0);
      expect(m.qrLeft, 'quick replies start left of the viewport').toBeGreaterThanOrEqual(0);
      expect(m.qrBottom, 'quick replies fall below the fold').toBeLessThanOrEqual(vp.height + 1);
      expect(m.qrRight, 'quick replies overflow horizontally').toBeLessThanOrEqual(vp.width + 1);

      // 4. The newest message must not be hidden behind the footer.
      expect(m.newestBottom, 'no message bubbles rendered').not.toBeNull();
      expect(
        m.newestBottom!,
        'newest message is clipped behind the footer: auto-scroll did not re-run when the footer grew',
      ).toBeLessThanOrEqual(m.qrTop + 1);
    });
  }
}
