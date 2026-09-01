import { test, expect } from '@playwright/test'
// @ts-expect-error — plain .mjs data module, shared with the API harness so the
// two halves can never test different women.
import { PERSONAS } from '../improve-v1/fb-read/evals/personas.mjs'

// The seven, through a real browser: lander → tap → chat → type → read.
//
// 🔴 WHAT THIS CATCHES THAT THE EVAL CANNOT. run-personas.mjs posts to /api/chat
// and grades the words. It never loads the page, so it is blind to the entire
// visible half of the funnel — whether the cup renders, whether the ring image
// 404s, whether the reveal crops to the panel she actually tapped, whether the
// reading arrives at all or dies in a typing indicator.
//
// The eval answers "are the words safe". This answers "did she ever see them".
//
// Needs `npm run dev` on :5000. Model calls are real, so a spec is slow —
// generous timeouts, and serial by config.

const OPTIONS = [
  { key: 'a', label: 'Bird' },
  { key: 'b', label: 'Tree' },
  { key: 'c', label: 'Anchor' },
] as const

for (const p of PERSONAS as any[]) {
  for (const opt of OPTIONS) {
    test(`${p.id} · taps ${opt.label} · ${p.hook}`, async ({ page }, testInfo) => {
      test.setTimeout(120_000)

      // 🔴 FIRST-PARTY ONLY. The first version of this collected EVERY failed
      // request and then asserted "no failed /read/ assets" — so all 21 tests
      // failed on fifteen Google Tag Manager, analytics and doubleclick beacons
      // that a headless browser aborts as a matter of course. They have nothing
      // to do with this funnel, and burying a real 404 under them is worse than
      // not checking at all.
      // 🔴 CHECK THE HOST, NOT THE STRING. `url.includes('localhost')` looked
      // right and matched every analytics beacon on the page, because they carry
      // the current page URL inside a query parameter —
      // `...collect?dl=http%3A%2F%2Flocalhost%3A5000%2Ffb-read...`. Ten Google
      // requests per test sailed through a filter meant to exclude them.
      const isOurs = (url: string) => {
        try {
          return new URL(url, 'http://localhost:5000').hostname === 'localhost'
        } catch {
          return false
        }
      }
      const consoleErrors: string[] = []
      const failedRequests: string[] = []
      page.on('console', (m) => {
        if (m.type() !== 'error') return
        // Same reason: a blocked analytics beacon logs an error we did not cause.
        if (/googletagmanager|google-analytics|doubleclick|googleadservices|facebook|connect\.facebook/.test(m.text())) return
        // 🔴 HEADLESS CHROMIUM HAS NO MP3 DECODER. BackgroundMusic.tsx does
        // `new Audio('/ambient.mp3')` and the element then reports "no supported
        // sources". VERIFIED not to be a broken asset before filtering it:
        // /ambient.mp3 and /notification.wav both serve HTTP 200 with audio/mpeg
        // and audio/wav. It is the test browser's codec set, not the funnel.
        // Narrow on purpose — filtering console errors is how a real bug hides.
        if (/NotSupportedError.*no supported sources/i.test(m.text())) return
        consoleErrors.push(m.text())
      })
      page.on('requestfailed', (r) => {
        if (isOurs(r.url())) failedRequests.push(`${r.url()} — ${r.failure()?.errorText}`)
      })
      page.on('response', (r) => {
        if (r.status() >= 400 && isOurs(r.url())) failedRequests.push(`${r.url()} — HTTP ${r.status()}`)
      })

      // ── the lander ────────────────────────────────────────────────────────
      await page.goto(`/fb-read/c?hook=${p.hook}&device=tea`)
      await expect(page.getByTestId('read-cup')).toBeVisible()

      // The cup must actually be the arm-B photograph, not a broken background.
      const cupUrl = await page.getByTestId('read-cup').evaluate((el) =>
        getComputedStyle(el as Element).backgroundImage,
      )
      expect(cupUrl, 'the cup image is wired to the lander').toContain('armb-cup')

      const button = page.getByTestId(`read-card-${opt.key}`)
      await expect(button).toContainText(opt.label)
      await page.screenshot({ path: testInfo.outputPath('1-lander.png'), fullPage: false })
      await button.click()

      // ── into the chat ─────────────────────────────────────────────────────
      await page.waitForURL(/\/chat\?/, { timeout: 20_000 })
      const bot = page.locator('[data-testid^="message-bot-"]')
      // Opening bubble + the open question.
      await expect.poll(async () => bot.count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(2)

      // 🔴 THE REVEAL, which is the whole mechanism. She tapped a NAME; this is
      // the only moment she is shown WHERE it sits. If the ring is missing or
      // cropped to the wrong panel, the reading describes a place she cannot see.
      const art = page.locator('[data-testid^="message-card-art-"]').first()
      await expect(art, 'the ringed reveal is attached to the opening bubble').toBeVisible()
      const artStyle = await art.evaluate((el) => {
        const s = getComputedStyle(el as Element)
        return { image: s.backgroundImage, position: s.backgroundPosition, width: (el as HTMLElement).clientWidth }
      })
      expect(artStyle.image, 'reveal strip is the arm-B one').toContain('armb-reveal-strip')
      // 0% / 50% / 100% — the panel must match the symbol she tapped.
      const expectedPos = { a: '0%', b: '50%', c: '100%' }[opt.key]
      expect(artStyle.position, `reveal crops to the ${opt.label} panel`).toContain(expectedPos)
      // It used to render at 112px, where a gold ring is about four pixels across.
      expect(artStyle.width, 'reveal is big enough to see the ring').toBeGreaterThan(200)

      await page.screenshot({ path: testInfo.outputPath('2-opening.png'), fullPage: true })

      // ── she answers ───────────────────────────────────────────────────────
      const input = page.getByTestId('input-chat-message')
      await expect(input).toBeEnabled({ timeout: 20_000 })
      const before = await bot.count()
      await input.fill(p.answer)
      await page.getByTestId('button-send-message').click()

      // The reading itself. Real model call, so allow for it.
      await expect
        .poll(async () => bot.count(), { timeout: 90_000, intervals: [1000] })
        .toBeGreaterThan(before)

      // Nothing may arrive empty — a blank bubble is worse than no bubble.
      const texts = (await bot.allInnerTexts()).map((t) => t.trim())
      for (const t of texts) expect(t.length, 'no empty bubble').toBeGreaterThan(0)

      await page.screenshot({ path: testInfo.outputPath('3-reading.png'), fullPage: true })

      // Attach the transcript so the run is readable, not just green.
      await testInfo.attach('transcript', {
        body: [`AD      ${p.hook}`, `SHE     ${p.answer}`, '', ...texts.map((t) => `EVELYN  ${t}`)].join('\n'),
        contentType: 'text/plain',
      })

      expect(failedRequests, 'no failed first-party requests').toEqual([])
      expect(consoleErrors, 'no console errors').toEqual([])
    })
  }
}
