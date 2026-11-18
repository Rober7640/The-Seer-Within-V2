// Belief lanes on /fb (/fb?lane=<id>) — what Meta reads, and what she sees.
//
//   npx playwright test tests/belief-lanes.spec.ts
//
// Runs against the dev server on :5000 (playwright.config webServer, or one already
// running). Loading pages only: nothing here enters an email, starts checkout or
// sends a chat turn to the server, and the tests FAIL if /api/chat, /api/lead,
// /api/checkout or /api/save-progress is requested at all.
//
// 🔒 Facebook (pixel script AND the <noscript> PageView image in client/index.html),
// PostHog, GTM, Clarity and Trackdesk are aborted at the browser for every test, so
// no live analytics event can fire. The aborted list is asserted non-leaking.

import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { getLane, laneOpenerAfterName, laneQuestion } from '../shared/beliefLanes'

const LANE = getLane('manifest')!
const FIRST_HEADING = (LANE.body.find((b) => b.t === 'h') as { text: string }).text
const ORIGINAL_TITLE = 'The Seer Within - Psychic Chat'

// Matched on the HOSTNAME only: the app's own bundle is served from localhost under
// paths like /node_modules/.vite/deps/posthog-js.js, which must load.
const ANALYTICS_HOST = /(^|\.)(facebook\.net|facebook\.com|fbcdn\.net|posthog\.com|googletagmanager\.com|google-analytics\.com|clarity\.ms|trackdesk\.com)$/i
const LIVE_APIS = /\/api\/(chat|lead|checkout|save-progress|upsell)/

async function guard(context: BrowserContext) {
  const blocked: string[] = []
  const liveApi: string[] = []
  await context.route((url) => ANALYTICS_HOST.test(url.hostname), (route) => {
    blocked.push(route.request().url())
    return route.abort()
  })
  context.on('request', (r) => {
    if (LIVE_APIS.test(new URL(r.url()).pathname)) liveApi.push(r.url())
  })
  return { blocked, liveApi }
}

test.describe('JavaScript off — the server HTML Meta reads', () => {
  test.use({ javaScriptEnabled: false })

  test('/fb?lane=manifest shows the lane title, headline, a section heading and "free to message"', async ({ page, context }) => {
    const g = await guard(context)
    await page.goto('/fb?lane=manifest')
    await expect(page).toHaveTitle(LANE.meta.title)
    await expect(page.getByRole('heading', { level: 1, name: LANE.card.h })).toBeVisible()
    await expect(page.getByRole('heading', { name: FIRST_HEADING })).toBeVisible()
    await expect(page.getByText('free to message', { exact: false }).first()).toBeVisible()
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', LANE.meta.desc)
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', LANE.meta.title)
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', LANE.meta.desc)
    await expect(page.getByRole('link', { name: LANE.card.b }).first()).toHaveAttribute('href', '/fb/chat?lane=manifest')
    expect(g.liveApi).toEqual([])
  })

  test('plain /fb keeps its original title and has no lane copy', async ({ page, context }) => {
    const g = await guard(context)
    await page.goto('/fb')
    await expect(page).toHaveTitle(ORIGINAL_TITLE)
    await expect(page.locator('[data-lane-static]')).toHaveCount(0)
    await expect(page.locator('meta[name="description"]')).toHaveCount(0)
    expect(g.liveApi).toEqual([])
  })

  test('an unknown lane is plain /fb', async ({ page, context }) => {
    await guard(context)
    await page.goto('/fb?lane=pattern')
    await expect(page).toHaveTitle(ORIGINAL_TITLE)
    await expect(page.locator('[data-lane-static]')).toHaveCount(0)
  })
})

test.describe('server HTML bytes (dev server)', () => {
  // Vite's dev middleware stamps a fresh nonce on main.tsx per request, so the dev
  // comparison normalises that one token. The production path (server/static.ts) is
  // proven byte-identical with no normalising in server/lib/laneHtml.test.ts.
  const norm = (s: string) => s.replace(/main\.tsx\?v=[A-Za-z0-9_-]+/g, 'main.tsx?v=N')

  test('no-lane and unknown-lane /fb are identical to plain /fb', async ({ request }) => {
    const plain = norm(await (await request.get('/fb')).text())
    expect(plain).toContain(`<title>${ORIGINAL_TITLE}</title>`)
    for (const url of ['/fb?lane=', '/fb?lane=nope', '/fb?lane=pattern', '/fb?utm_source=facebook', '/fb/chat?lane=manifest']) {
      expect(norm(await (await request.get(url)).text()), url).toBe(plain)
    }
    expect(norm(await (await request.get('/fb?lane=manifest')).text())).not.toBe(plain)
  })
})

test.describe('JavaScript on — the React page and the chat opener', () => {
  async function gotoGuarded(page: Page, context: BrowserContext, url: string) {
    const g = await guard(context)
    await page.goto(url)
    return g
  }

  test('/fb?lane=manifest fills the four card spots, adds the sections, and the button keeps the lane', async ({ page, context }) => {
    const g = await gotoGuarded(page, context, '/fb?lane=manifest')
    await expect(page.getByRole('heading', { level: 2, name: LANE.card.h })).toBeVisible()
    await expect(page.getByText(LANE.card.s)).toBeVisible()
    await expect(page.getByText(LANE.card.sc).first()).toBeVisible()
    await expect(page.getByTestId('lane-sections')).toBeVisible()
    await expect(page.getByRole('heading', { name: FIRST_HEADING })).toBeVisible()
    await expect(page.getByTestId('lane-faq')).toBeVisible()
    // Avatar, status and trust row are today's.
    await expect(page.getByTestId('img-avatar-landing')).toHaveAttribute('alt', 'Evelyn Cross')
    await expect(page.getByText('100% Private & Confidential')).toBeVisible()
    // The 3-second delay is untouched: disabled first, then a link to the lane chat.
    await expect(page.getByTestId('button-cta-disabled').first()).toBeVisible()
    await expect(page.getByTestId('button-cta-enabled').first()).toBeVisible({ timeout: 6000 })
    await expect(page.locator('a[href="/fb/chat?lane=manifest"]')).toHaveCount(2)
    // The server's static copy is gone once React mounts.
    await expect(page.locator('[data-lane-static]')).toHaveCount(0)
    expect(g.liveApi).toEqual([])
  })

  test('mobile: the card fills the first screen; the keyword sections start below the fold', async ({ page, context }) => {
    // Joel, 2026-11-18: the below-card copy is for Meta's crawler, not the visitor —
    // on load she must see only the card (as on today's /fb), to protect CR.
    const vh = 664
    await page.setViewportSize({ width: 390, height: vh })
    await gotoGuarded(page, context, '/fb?lane=manifest')
    // The CTA is on the first screen; the sections exist but sit below the fold.
    const ctaTop = (await page.getByRole('link', { name: LANE.card.b }).first().boundingBox())!.y
    expect(ctaTop).toBeLessThan(vh)
    const sectionsTop = (await page.getByTestId('lane-sections').boundingBox())!.y
    expect(sectionsTop).toBeGreaterThanOrEqual(vh)
  })

  test('plain /fb is today\'s page: no sections, button goes to /fb/chat', async ({ page, context }) => {
    const g = await gotoGuarded(page, context, '/fb')
    await expect(page.getByRole('heading', { level: 2, name: 'Something Is Holding You Back — I Can See It' })).toBeVisible()
    await expect(page.getByTestId('lane-sections')).toHaveCount(0)
    await expect(page.getByTestId('button-cta-enabled')).toBeVisible({ timeout: 6000 })
    await expect(page.locator('a[href="/fb/chat"]')).toHaveCount(1)
    expect(g.liveApi).toEqual([])
  })

  test('/fb/chat?lane=manifest: beats 1–2 replace the greeting; her name brings beats 3–5 and the unchanged email ask', async ({ page, context }) => {
    await context.addInitScript(() => window.localStorage.clear())
    const g = await gotoGuarded(page, context, '/fb/chat?lane=manifest')
    await expect(page.getByText(LANE.chat[0].text)).toBeVisible({ timeout: 20000 })
    await expect(page.getByText("What's your first name, dear?")).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Greetings, dear friend, and welcome.')).toHaveCount(0)
    const input = page.getByTestId('input-chat-message')
    await expect(input).toBeEnabled({ timeout: 20000 })
    await input.fill('Maureen')
    await page.getByTestId('button-send-message').click()
    for (const line of laneOpenerAfterName(LANE, 'Maureen')) {
      await expect(page.getByText(line)).toBeVisible({ timeout: 20000 })
    }
    await expect(page.getByText('Where should I send them if more is revealed?')).toBeVisible({ timeout: 20000 })
    // Topic buttons skipped; today's "lovely to meet you" not sent.
    await expect(page.getByText("Now, what's weighing on your heart today, dear?")).toHaveCount(0)
    await expect(page.getByText("It's lovely to meet you, Maureen.")).toHaveCount(0)
    expect(g.liveApi).toEqual([])
  })

  test('/fb/chat?lane=manifest&noemail=1: beat 6 is the first deepening question, input open', async ({ page, context }) => {
    await context.addInitScript(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
    const g = await gotoGuarded(page, context, '/fb/chat?lane=manifest&noemail=1')
    const input = page.getByTestId('input-chat-message')
    await expect(page.getByText("What's your first name, dear?")).toBeVisible({ timeout: 20000 })
    await expect(input).toBeEnabled({ timeout: 20000 })
    await input.fill('Maureen')
    await page.getByTestId('button-send-message').click()
    await expect(page.getByText('Everything we discuss stays between us... our secret.')).toBeVisible({ timeout: 20000 })
    await expect(page.getByText(laneQuestion(LANE, 'Maureen'))).toBeVisible({ timeout: 20000 })
    await expect(input).toBeEnabled({ timeout: 20000 })
    await expect(page.getByText("Now, tell me more about what's on your mind...")).toHaveCount(0)
    expect(g.liveApi).toEqual([]) // stop here: her answer would call /api/chat
  })
})
