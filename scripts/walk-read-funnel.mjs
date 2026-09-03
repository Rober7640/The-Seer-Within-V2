// walk-read-funnel — the whole /fb-read journey, screenshotted, ad to pitch.
//
//   LOCAL_BASE_URL=http://localhost:5056 node scripts/walk-read-funnel.mjs [personaId] [symbol]
//
// Starts where SHE starts — the lander she reaches from the ad — taps a symbol,
// follows the handoff into chat, answers every turn as one of the seven personas,
// and stops the moment the checkout CTA appears. It never clicks it.
//
// 🔴 SANDBOX ONLY, AND THE GUARD IS NOT DECORATION. This drives real /api/chat
// turns and writes real conversation rows. Dev and prod SHARE a database, so a
// run against the ordinary dev server writes to PRODUCTION. Boot the sandbox:
//
//   PORT=5056 DOTENV_CONFIG_PATH=.env.sandbox NODE_ENV=development npx tsx server/index.ts
//
// On top of that, and because .env.sandbox alone was once not enough — a
// "sandboxed" run in July 2026 fired 309 real Lead events at the live Meta pixel
// because dotenv repopulated blanked vars from .env — the browser also ABORTS
// every request to Meta and mocks /api/lead and /api/fb-event. Three layers,
// because the failure was silent.

import { chromium } from 'playwright'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { PERSONAS } from '../improve-v1/fb-read/evals/personas.mjs'

const BASE = process.env.LOCAL_BASE_URL || 'http://localhost:5056'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
  console.error(`🔴 REFUSING to run against "${BASE}". Sandbox localhost only.`)
  process.exit(2)
}

const personaId = process.argv[2] || 'long-marriage'
const symbol = process.argv[3] || 'a'
// The device is an argument, not a constant, because `candle` is one registry
// entry away and a walk hard-coded to `tea` would silently keep testing tea.
const device = process.argv[4] || 'tea'
const persona = PERSONAS.find((p) => p.id === personaId)
if (!persona) {
  console.error(`unknown persona "${personaId}". known: ${PERSONAS.map((p) => p.id).join(', ')}`)
  process.exit(2)
}

// Device is in the folder name so two devices can be walked on the same persona
// without the second silently overwriting the first.
const OUT = `audit-runs/fb-read-walk/${personaId}-${device}-${symbol}`
const SHOTS = `${OUT}/shots`
rmSync(OUT, { recursive: true, force: true })
mkdirSync(SHOTS, { recursive: true })

// Follow-up answers once her opening answer is spent. Deliberately plain: this
// walk is about whether the funnel REACHES the pitch, not about prose quality.
const FOLLOWUPS = [
  'i suppose so. i hadnt thought of it like that',
  'yes that sounds like me',
  'i want to feel like myself again',
  'i dont know really. i just want to know its going to be alright',
  'yes please',
  'that makes sense',
]

// 🔴 THE FUNNEL ASKS TWO QUESTIONS THAT NEED REAL ANSWERS, and a walker that
// feeds them conversational filler stalls without ever reaching the pitch. The
// first attempt did exactly that: it answered "what should I call you, dear?"
// with "i suppose so…" and Evelyn came back "It's lovely to meet you, I." — then
// the email step swallowed the remaining turns and the run gave up at 12.
//
// So the answer is chosen from what she was just ASKED, not from a queue.
const NAME = 'Margaret'
const EMAIL = 'sandbox-walk@example.invalid'
const asksName = /what should i call you|your name|call you, dear/i
const asksEmail = /where should i send|email|inbox|send them/i

async function waitForTurnEnd(page, timeoutMs = 180000) {
  const input = page.locator('[data-testid="input-chat-message"]')
  const perm = page.getByRole('button', { name: /Yes, please help me Evelyn/i })
  const bucket = page.getByRole('button', { name: /Love & Relationships/i })
  const cta = page.getByRole('button', { name: /Begin My Energy Clearing|Yes.*Reading|Continue|Unlock/i })
  const start = Date.now()
  let lastCount = -1, stableSince = Date.now()
  while (Date.now() - start < timeoutMs) {
    const typing = await page.locator('[data-testid="indicator-typing"]').isVisible().catch(() => false)
    const count = await page.locator('[data-testid^="message-"]').count().catch(() => 0)
    if (count !== lastCount) { lastCount = count; stableSince = Date.now() }
    if (!typing && Date.now() - stableSince > 4000) {
      if (await bucket.isVisible().catch(() => false)) return 'bucket'
      if (await perm.isVisible().catch(() => false)) return 'perm'
      if (await cta.first().isVisible().catch(() => false)) return 'pitch'
      if (await input.isVisible().catch(() => false) && await input.isEnabled().catch(() => false)) return 'input'
    }
    await page.waitForTimeout(500)
  }
  return 'timeout'
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })

// 🔒 Layer 3: nothing reaches Meta, no lead row, no CAPI event.
let pixelBlocked = 0
await ctx.route(/(facebook\.com|connect\.facebook\.net|fbcdn\.net)/i, (r) => { pixelBlocked++; return r.abort() })
await ctx.route('**/api/lead', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }))
await ctx.route('**/api/fb-event', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))

const page = await ctx.newPage()
let n = 0
const snap = async (label) => {
  n += 1
  const path = `${SHOTS}/${String(n).padStart(2, '0')}-${label}.png`
  await page.screenshot({ path, fullPage: false })
  console.log(`   📸 ${String(n).padStart(2, '0')}-${label}`)
  return path
}

console.log(`\n  ${persona.label}  ·  taps ${symbol.toUpperCase()}  ·  ${persona.hook}`)
console.log(`  base ${BASE}   →  ${OUT}\n`)

// ── the lander she reaches from the ad ──────────────────────────────────────
// `networkidle` never settles here: the Meta requests we abort above, plus the
// tag-manager beacons, keep the network permanently busy. Wait for the thing that
// actually matters instead — the cup being on screen.
await page.goto(`${BASE}/fb-read/c?hook=${persona.hook}&device=${device}&utm_content=walk`, { waitUntil: 'domcontentloaded' })
await page.getByTestId('read-cup').waitFor({ state: 'visible', timeout: 30000 })
await page.waitForTimeout(900)
await snap('lander')

await page.getByTestId(`read-card-${symbol}`).click()
await page.waitForTimeout(1200)
await snap('reading-beat')

// `waitForURL` defaults to waiting for the load event, which the aborted Meta
// requests can keep pending past the timeout — the navigation itself has already
// happened. Wait on the URL only. (Six of seven personas passed this line; the
// seventh timed out on a page that had already navigated.)
await page.waitForURL(/\/chat\?/, { timeout: 30000, waitUntil: 'commit' })
await page.waitForTimeout(2500)
await snap('chat-opening')

// ── the conversation ────────────────────────────────────────────────────────
const input = page.locator('[data-testid="input-chat-message"]')
const queue = [persona.answer, ...FOLLOWUPS]
let typed = 0, reachedPitch = false, i = 0
let bucketShown = false

// 🔴 BOTH SIDES, INTERLEAVED. The first version pushed her turns into an array
// and then wrote only the bot bubbles, so the saved transcript showed Evelyn
// talking to nobody — you could not tell which answer produced which reading,
// which is the one thing the walk exists to show. Her turns are only checkable
// sitting between the bubbles that prompted them.
const transcript = []
let seen = 0
const flush = async () => {
  const all = await page.locator('[data-testid^="message-bot-"]').allInnerTexts()
  for (const b of all.slice(seen)) transcript.push(['EVELYN', b.replace(/\s+/g, ' ').trim()])
  seen = all.length
  return all
}

for (let step = 0; step < 40; step++) {
  const state = await waitForTurnEnd(page)
  if (state === 'timeout') { await snap('TIMEOUT'); break }
  // 🔴 THE BUCKET PICKER IS A DEFECT ON THIS FUNNEL, NOT A STEP.
  //
  // She arrived from an ad that already asked the question, tapped a symbol and read
  // a seven-bubble reading about it. Being asked "what's weighing on your heart
  // today?" and offered Money and Purpose throws all of that away.
  //
  // This used to TAP "Love & Relationships" and carry on, which is exactly how the
  // missing read branch in handleNameCapture survived: all seven personas reached
  // the close, and the redundant question read as an ordinary line in the
  // transcript. Answering a question the funnel should never have asked is how a
  // walker launders a bug into a passing run. Fail instead.
  if (state === 'bucket') {
    await snap('FAIL-bucket-picker-shown')
    await flush()
    transcript.push(['🔴 DEFECT', 'The four buckets were shown. She has already answered this — the ad hook, the symbol she tapped and the whole reading all say love. Expect a skip-the-bucket-picker branch in handleNameCapture.'])
    bucketShown = true
    break
  }
  if (state === 'perm') { await snap('permission-ask'); await flush(); transcript.push(['TAPS', 'Yes, please help me Evelyn']); await page.getByRole('button', { name: /Yes, please help me Evelyn/i }).click(); continue }
  if (state === 'pitch') { reachedPitch = true; await snap('PITCH-checkout-cta'); break }
  if (typed >= 18) { await snap('gave-up'); break }

  // What did she just get asked? The last bot bubble decides the answer.
  const bubblesNow = await flush()
  const last = (bubblesNow[bubblesNow.length - 1] || '').replace(/\s+/g, ' ')
  let answer
  if (asksName.test(last)) answer = NAME
  else if (asksEmail.test(last)) answer = EMAIL
  else { answer = queue[i] ?? FOLLOWUPS[i % FOLLOWUPS.length]; i += 1 }
  typed += 1
  await input.fill(answer)
  await page.getByTestId('button-send-message').click()
  transcript.push(['TYPES', answer])
  await page.waitForTimeout(1500)
  await snap(`turn-${String(typed).padStart(2, '0')}`)
}

// The whole conversation in one tall image.
await page.screenshot({ path: `${SHOTS}/99-full-conversation.png`, fullPage: true })

await flush()
const bubbleCount = transcript.filter(([who]) => who === 'EVELYN').length
writeFileSync(
  `${OUT}/transcript.md`,
  [
    `# ${persona.label} · taps ${symbol.toUpperCase()} · ${persona.hook}`,
    ``,
    `Reached pitch: **${reachedPitch ? 'yes' : 'NO'}** · turns typed: ${typed} · Meta requests blocked: ${pixelBlocked}`,
    bucketShown ? `\n🔴 **DEFECT — the four buckets were shown.** She answered this question by clicking the ad. A skip-the-bucket-picker branch is missing in handleNameCapture.` : '',
    ``,
    `Evelyn's bubbles are bulleted. **SHE** lines are the persona — what the walker`,
    `typed or tapped at that point in the funnel.`,
    ``,
    ...transcript.map(([who, text]) =>
      who === 'EVELYN' ? `- ${text}` : `\n**SHE ${who} ▸** ${text}\n`,
    ),
  ].join('\n'),
)

// Machine-readable twin of the header. The reading page reads THIS rather than
// re-parsing prose, so a wording change in the transcript cannot break the page.
writeFileSync(
  `${OUT}/meta.json`,
  JSON.stringify({ personaId, device, symbol, hook: persona.hook, reachedPitch, bucketShown, typed, bubbles: bubbleCount, walkedAt: new Date().toISOString() }, null, 2),
)

console.log(`\n  ${reachedPitch ? '✓ reached the checkout CTA (not clicked)' : '✗ never reached a pitch'}`)
if (bucketShown) console.log('  ✗ DEFECT: the four buckets were shown — she had already answered that question')
console.log(`  turns typed: ${typed}   bot bubbles: ${bubbleCount}   Meta blocked: ${pixelBlocked}`)
console.log(`  → ${OUT}/transcript.md`)

await browser.close()

// 🔴 CLOSE THE LOOP. A page you have to remember to rebuild is a page that is
// quietly one run out of date, which is worse than no page — you read last
// week's copy believing it is today's. Every walk rebuilds it from every
// transcript on disk, so the reading page cannot lag the walks.
spawnSync('npx', ['tsx', 'scripts/build-walk-page.mjs'], { stdio: 'inherit' })

// Either failure is a failing walk. The bucket picker is the louder of the two:
// reaching the pitch while asking her a question she already answered is exactly
// the passing run that hid this bug for the whole build.
process.exit(reachedPitch && !bucketShown ? 0 : 1)
