// STAGING SMOKE — the base V1 (home) chat-flow test (v1_home_chat_flow_2026).
// Runs against the Railway dev host; DOES call /api/chat (real reading turns).
//
//   npx playwright test tests/home-chat-flow-b.staging.spec.ts --config playwright.staging.config.ts
//
// 🔴 Run this AFTER the branch is deployed to dev: the `?chatflow=b` override only fires
// through the NEW home gate (getPostHogFunnel() === 'v1' → fetchAssignedHomeChatFlow),
// which does not exist on the dev host until this branch ships there.
//
// Proves on the live dev deploy what the unit tests can't:
//   · /chat?chatflow=b runs the READING arm — the candle + name-number opener, the smoke
//     topic line, and fbB1 → FUTURE_PACING ("Tell me what you want..."), unique to arm B
//   · /chat?chatflow=a is today's chat — "It's lovely to meet you" → "Take your time..."
//   · /chat with NO override is unchanged (the test ships draft/off; assumes it is NOT
//     started on the target host)
// chatflow=b/a is the preview override (deterministic, never logged). noemail=1 opens the
// deepening right after the topic pick.

import { test, expect, type Page } from '@playwright/test'

// Never let a smoke pollute live analytics when pointed at production: abort FB pixel,
// PostHog, GTM, Clarity and Trackdesk at the browser. The app's own bundle is matched by
// hostname only, so it still loads. (chatflow=b/a overrides already avoid logging a live
// experiment exposure.)
const ANALYTICS_HOST = /(^|\.)(facebook\.net|facebook\.com|fbcdn\.net|posthog\.com|googletagmanager\.com|google-analytics\.com|clarity\.ms|trackdesk\.com)$/i
test.beforeEach(async ({ context }) => {
  await context.route((url) => ANALYTICS_HOST.test(url.hostname), (route) => route.abort())
  await context.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
})

async function answer(page: Page, text: string) {
  const input = page.getByTestId('input-chat-message')
  await expect(input).toBeEnabled({ timeout: 90000 })
  await input.fill(text)
  await page.getByTestId('button-send-message').click()
}

test('home, reading arm (B): candle + number opener, smoke topic, fbB1 reading runs', async ({ page }) => {
  test.setTimeout(240_000) // multi-turn walk with a real Anthropic reading call
  await page.goto('/chat?chatflow=b&noemail=1')

  // The base greeting is identical in both arms — shown here too.
  await expect(page.getByText('Greetings, dear friend, and welcome.')).toBeVisible({ timeout: 30000 })
  await expect(page.getByText("What's your first name, dear?")).toBeVisible({ timeout: 30000 })

  // Name → arm B's candle reading REPLACES "It's lovely to meet you".
  await answer(page, 'Maria')
  await expect(page.getByText('the candle beside me bent', { exact: false })).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('Your name carries a number too. Maria comes to a 6.')).toBeVisible({ timeout: 30000 })
  await expect(page.getByText("It's lovely to meet you, Maria.")).toHaveCount(0)

  // Topic buttons → "Love & Relationships" → the smoke line (arm B), not "flicker of shadow".
  await page.getByText('Love & Relationships').click()
  await expect(page.getByText("That's where the smoke was pulling, Maria.", { exact: false })).toBeVisible({ timeout: 30000 })

  // Her concern → reading step 1 (fbB1). Arm B then moves to FUTURE_PACING, whose input
  // placeholder "Tell me what you want..." is UNIQUE to arm B (arm A shows "Take your
  // time..."). That placeholder is the deterministic proof the reading arm ran.
  await answer(page, 'I keep ending up with the same kind of man and it falls apart the same way.')
  await expect(page.getByTestId('input-chat-message')).toHaveAttribute('placeholder', 'Tell me what you want...', { timeout: 60000 })
})

test('home, interview arm (A, control): today\'s chat is unchanged', async ({ page }) => {
  test.setTimeout(180_000) // one real Anthropic reading call
  await page.goto('/chat?chatflow=a&noemail=1')

  await answer(page, 'Maria')
  // Arm A keeps "It's lovely to meet you" and never shows the candle device.
  await expect(page.getByText("It's lovely to meet you, Maria.")).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('the candle beside me bent', { exact: false })).toHaveCount(0)

  await page.getByText('Love & Relationships').click()
  await expect(page.getByText('I can feel warmth radiating from your heart, Maria...')).toBeVisible({ timeout: 30000 })

  // Arm A reading step → DEEPENING_1 concern → FUTURE_PACING placeholder "Take your time...",
  // NOT arm B's "Tell me what you want...".
  await answer(page, 'I keep attracting the wrong people.')
  await expect(page.getByTestId('input-chat-message')).toHaveAttribute('placeholder', 'Take your time...', { timeout: 60000 })
})

test('home, NO override: the dark default is today\'s chat (assumes the test is off)', async ({ page }) => {
  test.setTimeout(120_000)
  // No chatflow param → the real /api/home/chat-flow decides. While the experiment is
  // draft/off (how it ships), every visitor resolves to control 'A' — the home page is
  // byte-identical to today. If the test is later STARTED on this host, this case becomes
  // 50/50 and is expected to be skipped.
  await page.goto('/chat?noemail=1')
  await answer(page, 'Maria')
  await expect(page.getByText("It's lovely to meet you, Maria.")).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('the candle beside me bent', { exact: false })).toHaveCount(0)
})
