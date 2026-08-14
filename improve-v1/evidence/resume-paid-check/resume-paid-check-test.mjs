// Does the emailed recovery link let back in someone who CLICKED the buy button
// but never actually paid — while still refusing real buyers?
//
// Why this test exists
// -------------------
// /api/checkout flips conversations.purchased = true the moment the button is
// clicked, before Stripe has taken a cent, and nothing ever flips it back. The
// resume endpoint used to refuse anyone with that flag set, which meant the
// warmest segment on the list — reached for her card, stopped — clicked the
// recovery email and got a brand-new reading that asked her name again.
//
// Four cases, all against the SAME conversation row:
//   A. untouched non-buyer                 -> 200, resume allowed
//   B. clicked buy, never paid             -> 200, resume allowed   <-- the fix
//   C. webhook-confirmed payment           -> 410, refused
//   D. reached /welcome1 (legacy signal)   -> 410, refused
// Then a real browser opens the link for case B and checks she is welcomed back
// by name, NOT re-asked her name, and can see the purchase button.
//
// Run:  node improve-v1/evidence/resume-paid-check/resume-paid-check-test.mjs
// Needs: dev server on :5000 and a LOCALHOST DATABASE_URL (it refuses otherwise).
import { chromium } from '@playwright/test'
import pg from 'pg'

const BASE = 'http://localhost:5000'
const EMAIL = `resume-paidcheck-${Date.now()}@example.com`
const FIRST = 'Nichole'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------- safety gate
// .env in this repo carries two DATABASE_URL lines and has pointed at PRODUCTION
// before now. This test INSERTs and DELETEs rows, so refuse anything but local.
const DB = process.env.DATABASE_URL
if (!DB) {
  console.error('❌ DATABASE_URL not set. Run with the dev env loaded.')
  process.exit(1)
}
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(DB)) {
  console.error('❌ DATABASE_URL is not localhost — refusing to run.')
  console.error(`   host looks like: ${DB.replace(/:[^:@]*@/, ':***@').slice(0, 90)}`)
  process.exit(1)
}

const client = new pg.Client({ connectionString: DB })
await client.connect()

const results = []
const record = (name, pass, detail) => {
  results.push({ name, pass, detail })
  console.log(`   ${pass ? '🟢' : '🔴'} ${name}${detail ? ` — ${detail}` : ''}`)
}

// ------------------------------------------------------------- 1. seed her row
// Written directly rather than by walking the funnel: this test is about the
// paid-check, and a hand-built row lets us park her exactly at PITCH (the
// segment the recovery email targets) with a known price variant.
console.log('\n[1] seeding a conversation parked at PITCH...')
const messages = [
  { id: 'm1', type: 'bot', content: `I felt you before you typed, ${FIRST}.` },
  { id: 'm2', type: 'user', content: 'I think he has been lying to me and I feel it in my chest' },
  { id: 'm3', type: 'bot', content: `I can feel the weight of that, ${FIRST}. There is a block around you.` },
  { id: 'm4', type: 'bot', content: 'I can clear it tonight, if you want me to.' },
]
const { rows: seeded } = await client.query(
  `INSERT INTO conversations
     (email, first_name, bucket, concern, conversation_state, messages,
      price_variant, price_amount_cents, downsell_amount_cents)
   VALUES ($1,$2,'love',$3,'PITCH',$4,'45',4500,2500)
   RETURNING id`,
  [EMAIL, FIRST, 'he has been lying to me', JSON.stringify(messages)],
)
const ID = seeded[0].id
const LINK = `${BASE}/chat?resume=${ID}`
console.log(`    id=${ID}`)
console.log(`    link=${LINK}`)

const resumeStatus = async () => {
  const res = await fetch(`${BASE}/api/conversation/resume/${ID}`)
  return res.status
}
const reset = () =>
  client.query(
    `UPDATE conversations
        SET purchased = false, purchase_type = NULL, main_paid_at = NULL,
            upsell_offered = false, upsell_purchased = false,
            upsell2_purchased = false, stripe_session_id = NULL
      WHERE id = $1`,
    [ID],
  )

// -------------------------------------------------- 2. A: untouched non-buyer
console.log('\n[2] case A — untouched non-buyer should be let in...')
record('A. untouched non-buyer resumes', (await resumeStatus()) === 200)

// ------------------------------------------- 3. B: clicked buy, never paid
// The real /api/checkout call is the faithful reproduction, but with live Stripe
// keys it would leave a junk checkout session behind. Default to the SQL flip,
// which is byte-identical to what markPurchased() writes; set USE_REAL_CHECKOUT=1
// to exercise the endpoint instead.
console.log('\n[3] case B — clicked buy, card never charged...')
if (process.env.USE_REAL_CHECKOUT === '1') {
  const res = await fetch(`${BASE}/api/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, firstName: FIRST, bucket: 'love', type: 'main' }),
  })
  console.log(`    POST /api/checkout -> ${res.status} (real endpoint)`)
} else {
  await client.query(
    `UPDATE conversations SET purchased = true, purchase_type = 'main' WHERE id = $1`,
    [ID],
  )
  console.log('    flipped purchased=true via SQL (same write markPurchased makes)')
}

const { rows: afterClick } = await client.query(
  `SELECT purchased, main_paid_at, upsell_offered FROM conversations WHERE id = $1`,
  [ID],
)
console.log(
  `    row now: purchased=${afterClick[0].purchased} main_paid_at=${afterClick[0].main_paid_at} upsell_offered=${afterClick[0].upsell_offered}`,
)
record(
  'B. clicked-but-unpaid still has NO real payment signal',
  afterClick[0].purchased === true && afterClick[0].main_paid_at === null,
)
const statusB = await resumeStatus()
record(
  'B. clicked-but-unpaid resumes (was 410 before the fix)',
  statusB === 200,
  `HTTP ${statusB}`,
)

// ------------------------------------------ 4. C: webhook-confirmed payment
console.log('\n[4] case C — webhook-confirmed buyer must stay refused...')
await client.query(`UPDATE conversations SET main_paid_at = now() WHERE id = $1`, [ID])
const statusC = await resumeStatus()
record('C. paid buyer refused', statusC === 410, `HTTP ${statusC}`)

// --------------------------------------------- 5. D: legacy /welcome1 signal
console.log('\n[5] case D — legacy signal (reached /welcome1) must stay refused...')
await reset()
await client.query(
  `UPDATE conversations SET purchased = true, upsell_offered = true WHERE id = $1`,
  [ID],
)
const statusD = await resumeStatus()
record('D. historical buyer (purchased + upsell_offered) refused', statusD === 410, `HTTP ${statusD}`)

// ------------------------------------------------ 6. the browser, for case B
console.log('\n[6] case B in a real browser (clean profile, no localStorage)...')
await reset()
await client.query(
  `UPDATE conversations SET purchased = true, purchase_type = 'main' WHERE id = $1`,
  [ID],
)

const browser = await chromium.launch()
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  // domcontentloaded, not 'load': Vite compiles the client on the first request
  // in dev, and some third-party pixels never settle, so 'load' can never fire.
  await page.goto(LINK, { waitUntil: 'domcontentloaded', timeout: 120000 })
  // Wait for the CTA itself rather than guessing a sleep: the welcome-back
  // sequence types three messages before it flips showPurchaseCTA, and the
  // typing delay scales with message length.
  const cta = page.locator('button:has-text("Clearing")')
  await cta.first().waitFor({ timeout: 90000 }).catch(() => {})

  const body = await page.locator('body').innerText()
  const welcomedBack = /Welcome back, Nichole|Nichole has returned/i.test(body)
  const readingRestored = /(?:lying|chest)/i.test(body)
  // A fresh session always opens with this system line. Its presence means the
  // resume was discarded and she was started over from scratch.
  const startedOver = /Evelyn has joined the chat/i.test(body)
  const ctaCount = await cta.count()
  const priceShown = (body.match(/\$(\d+)/) || [null])[0]

  record('browser: welcomed back by name', welcomedBack)
  record('browser: her own words restored', readingRestored)
  record('browser: NOT started over from scratch', !startedOver)
  record('browser: purchase button visible', ctaCount > 0, `${ctaCount} CTA button(s)`)
  record('browser: shows her assigned $45, not the $35 fallback', priceShown === '$45', `${priceShown}`)

  await page.screenshot({
    path: 'improve-v1/evidence/resume-paid-check/resumed-after-checkout-click.png',
    fullPage: true,
  })
} catch (err) {
  record('browser: resume page loaded', false, err.message.split('\n')[0])
} finally {
  await browser.close()
  // Always clean up, even on a browser failure — an orphaned row would poison
  // the next run's "clicked-but-unpaid" case.
  await client.query(`DELETE FROM conversations WHERE id = $1`, [ID])
  await client.end()
}

// -------------------------------------------------------------------- verdict
const failed = results.filter((r) => !r.pass)
console.log('\n================ RESULT ================')
for (const r of results) console.log(`${r.pass ? '🟢' : '🔴'} ${r.name}`)
console.log(
  failed.length
    ? `\n🔴 ${failed.length}/${results.length} FAILED`
    : `\n🟢 ALL ${results.length} PASSED — clicked-but-unpaid gets back in, real buyers stay out.`,
)
console.log('========================================\n')
process.exit(failed.length ? 1 : 0)
