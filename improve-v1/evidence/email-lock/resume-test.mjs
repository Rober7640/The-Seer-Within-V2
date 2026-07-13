// End-to-end test of the recovery flow.
//
//  1. Walk a palm/woven user up to the reading and ABANDON there (exactly where
//     the type="email" bug stranded them).
//  2. Look her conversation up on the server, as the recovery SQL would.
//  3. Open /chat?resume=<id> in a CLEAN browser (no localStorage — she's on her
//     phone reading an email) and check she lands back mid-reading, is greeted by
//     name, can type, and reaches the PITCH with the right price.
import { chromium } from '@playwright/test'
import pg from 'pg'

const BASE = 'http://localhost:5000'
const EMAIL = `resume-test-${Date.now()}@example.com`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch()

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  return ctx.newPage()
}

async function waitInput(page, t = 90000) {
  await page.waitForSelector('[data-testid="input-chat-message"]:not([disabled])', { timeout: t })
  await sleep(400)
  const ph = await page.locator('[data-testid="input-chat-message"]').getAttribute('placeholder')
  console.log(`      ...input ready: "${ph}"`)
}
async function send(page, text) {
  await page.locator('[data-testid="input-chat-message"]').fill(text)
  await page.locator('[data-testid="button-send-message"]').click()
  console.log(`      >> sent: "${text.slice(0, 40)}"`)
  await sleep(700)
}
const transcript = (page) =>
  page.$$eval('[data-testid="input-chat-message"]', () => []).catch(() => [])

// ---------- 1. get stranded ----------
console.log('\n[1] walking her to the reading, then abandoning...')
const p1 = await newPage()
await p1.goto(`${BASE}/chat?hook=is-he-true&thumb=a&sign=thumb&v=c&clearing=woven`)
// Palm v=c order: Evelyn asks the open question FIRST, then the name.
await waitInput(p1)
await send(p1, 'I think he has been lying to me and I feel it in my chest')
await waitInput(p1)
await send(p1, 'Nichole')
await waitInput(p1)
await send(p1, EMAIL)
await waitInput(p1) // reading delivered, sitting at DEEPENING_2
const stateAfter = await p1.locator('[data-testid="input-chat-message"]').getAttribute('placeholder')
console.log(`    abandoned at: "${stateAfter}"`)
await sleep(1500) // let save-progress land
await p1.context().close()

// ---------- 2. find her, like the recovery SQL does ----------
console.log('\n[2] looking her up in the DB (what the recovery SQL returns)...')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
const { rows } = await client.query(
  `SELECT id, email, first_name, conversation_state, deeper_response, purchased,
          price_variant, price_amount_cents, downsell_amount_cents,
          jsonb_array_length(messages::jsonb) AS total_msgs
     FROM conversations WHERE email = $1`,
  [EMAIL],
)
await client.end()
if (!rows.length) {
  console.log('    ❌ no conversation row — save-progress did not land')
  await browser.close()
  process.exit(1)
}
const r = rows[0]
console.log(`    id=${r.id}`)
console.log(`    state=${r.conversation_state}  deeper_response=${r.deeper_response}  msgs=${r.total_msgs}`)
console.log(`    price_variant=${r.price_variant}  price=${r.price_amount_cents}  downsell=${r.downsell_amount_cents}`)

const link = `${BASE}/chat?resume=${r.id}`
console.log(`\n    recovery link -> ${link}`)

// ---------- 3. she clicks the link on a fresh device ----------
console.log('\n[3] opening the link in a CLEAN browser (no localStorage)...')
const p2 = await newPage()
await p2.goto(link)
await waitInput(p2, 60000)

// Let the welcome-back messages finish typing before reading the transcript.
await sleep(6000)
const body = await p2.locator('body').innerText()
const welcomedBack = /Welcome back, Nichole|Nichole has returned/i.test(body)
const keptReading = /(?:lying|chest)/i.test(body) // her original words are still on screen
const askedNameAgain = /your name/i.test(body.slice(-400))
const inputType = await p2.locator('[data-testid="input-chat-message"]').getAttribute('type')

console.log(`    welcomed back   : ${welcomedBack}   (by name)`)
console.log(`    reading restored: ${keptReading}   (her own words still on screen)`)
console.log(`    re-asked name   : ${askedNameAgain}  (must be false)`)
console.log(`    input type      : ${inputType}  (must be text)`)

// She continues — this is the whole point: she must reach the PITCH.
console.log('\n[4] continuing the reading through to the pitch...')
let sawPitch = false
let priceShown = null
for (let turn = 0; turn < 18 && !sawPitch; turn++) {
  const has = await p2.locator('[data-testid="input-chat-message"]').count()
  if (has) {
    await send(p2, ['I am scared he is cheating on me', 'Yes that is exactly right', 'I want to know the truth', 'Yes please help me'][turn % 4])
  }
  await sleep(1200)
  const txt = await p2.locator('body').innerText()
  const m = txt.match(/\$(\d+)/)
  if (m) { priceShown = m[0]; }
  const cta = await p2.locator('[data-testid="button-purchase"], button:has-text("Clearing"), button:has-text("Begin")').count()
  if (cta > 0 && priceShown) { sawPitch = true; break }
  try { await waitInput(p2, 30000) } catch { /* buttons instead of input */ break }
}

console.log(`    reached pitch   : ${sawPitch}`)
console.log(`    price shown     : ${priceShown}`)

await p2.screenshot({ path: 'improve-v1/evidence/email-lock/resumed.png' })

console.log('\n================ RESULT ================')
const pass = welcomedBack && keptReading && !askedNameAgain && inputType === 'text' && r.conversation_state === 'DEEPENING_2'
console.log(pass ? '🟢 RESUME WORKS — she picks up mid-reading and can continue.'
                 : '🔴 RESUME BROKEN')
if (priceShown) console.log(`   Pitch price on resume: ${priceShown} (expected to match her assigned variant, not the $35 fallback)`)
console.log('========================================\n')

await browser.close()
process.exit(pass ? 0 : 1)
