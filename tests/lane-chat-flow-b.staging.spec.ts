// STAGING SMOKE — belief lane in the /fb chat-flow reading arm (v1_fb_chat_flow_2026).
// Runs against the Railway dev host; DOES call /api/chat (real reading turns).
//
//   npx playwright test tests/lane-chat-flow-b.staging.spec.ts --config playwright.staging.config.ts
//
// Proves on the live dev deploy what the unit tests can't: a lane visitor forced into
// arm B (reading) actually RUNS the reading flow (not the interview), the lane keeps its
// own opener, the belief rides the reading, and the candle/smoke device never surfaces.
// chatflow=b is the preview override (deterministic, not logged). noemail=1 opens the
// deepening right after the name.

import { test, expect, type Page } from '@playwright/test'
import { getLane, laneOpenerAfterName, laneQuestion } from '../shared/beliefLanes'

const LANE = getLane('astrology')!
const BEAT1 = LANE.chat[0].text

// The whole visible transcript, for invariant assertions over everything shown so far.
async function transcript(page: Page): Promise<string> {
  return (await page.locator('body').innerText()).toLowerCase()
}

async function answer(page: Page, text: string) {
  const input = page.getByTestId('input-chat-message')
  await expect(input).toBeEnabled({ timeout: 30000 })
  await input.fill(text)
  await page.getByTestId('button-send-message').click()
}

test('astrology lane, reading arm: lane opener kept, arm B runs, no candle/smoke', async ({ page, context }) => {
  test.setTimeout(240_000) // multi-turn walk with real Anthropic reading calls
  await context.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  await page.goto('/fb/chat?lane=astrology&chatflow=b&noemail=1')

  // Lane keeps its OWN opener — not the generic greeting, not the candle script.
  await expect(page.getByText(BEAT1)).toBeVisible({ timeout: 30000 })
  await expect(page.getByText("What's your first name, dear?")).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('Greetings, dear friend, and welcome.')).toHaveCount(0)
  await expect(page.getByText('the candle beside me bent', { exact: false })).toHaveCount(0)

  // Name → lane beats + the lane's own first question (beat 6), topic step skipped.
  await answer(page, 'Maureen')
  for (const line of laneOpenerAfterName(LANE, 'Maureen')) {
    await expect(page.getByText(line)).toBeVisible({ timeout: 30000 })
  }
  await expect(page.getByText(laneQuestion(LANE, 'Maureen'))).toBeVisible({ timeout: 30000 })

  // Her concern → reading step 1 (fbB1). Arm B then moves to FUTURE_PACING, whose input
  // placeholder "Tell me what you want..." is UNIQUE to arm B (arm A would show
  // "Take your time..."). That placeholder is the deterministic proof the reading arm ran.
  await answer(page, 'I keep ending up with the same kind of man and it falls apart the same way.')
  await expect(page.getByTestId('input-chat-message')).toHaveAttribute('placeholder', 'Tell me what you want...', { timeout: 60000 })

  // One more reading step (fbB2) to show the reading continues and input re-opens.
  await answer(page, 'I want someone steady who actually stays.')
  await expect(page.getByTestId('input-chat-message')).toBeEnabled({ timeout: 60000 })

  // Invariant across the whole transcript so far: the candle/smoke device never surfaced.
  const all = await transcript(page)
  expect(all).not.toContain('candle')
  expect(all).not.toContain('smoke')
})

test('astrology lane, interview arm (control): today\'s lane flow is unchanged', async ({ page, context }) => {
  test.setTimeout(180_000) // one real Anthropic reading call
  await context.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  await page.goto('/fb/chat?lane=astrology&chatflow=a&noemail=1')
  await expect(page.getByText(BEAT1)).toBeVisible({ timeout: 30000 })
  await answer(page, 'Maureen')
  await expect(page.getByText(laneQuestion(LANE, 'Maureen'))).toBeVisible({ timeout: 30000 })
  // Arm A reading step → DEEPENING_2 placeholder, NOT arm B's.
  await answer(page, 'I keep attracting the wrong people.')
  await expect(page.getByTestId('input-chat-message')).toHaveAttribute('placeholder', 'Take your time...', { timeout: 60000 })
})
