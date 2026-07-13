// Repro: V1 palm funnel, woven arm — after EMAIL_CAPTURE the chat input stays
// type="email", so the send BUTTON (a real form submit) is blocked by native
// validation and the user can only ever enter an email address.
//
// Usage: node repro-email-lock.mjs
import { chromium } from '@playwright/test'

const ARM = process.env.ARM || 'woven' // 'woven' | 'control'
const URL = `http://localhost:5000/chat?hook=is-he-true&thumb=a&sign=thumb&v=c&clearing=${ARM}`
const EMAIL = 'repro-woven-test@example.com'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }) // mobile, like FB traffic
const log = []

// Capture the native validation bubble the browser raises on a blocked submit.
let blockedMessage = null

async function waitForInput(timeout = 45000) {
  await page.waitForSelector('[data-testid="input-chat-message"]:not([disabled])', { timeout })
  await sleep(400)
}

async function state(label) {
  const el = page.locator('[data-testid="input-chat-message"]')
  const type = await el.getAttribute('type')
  const placeholder = await el.getAttribute('placeholder')
  log.push({ step: label, type, placeholder })
  console.log(`  [${label}] type="${type}"  placeholder="${placeholder}"`)
  return type
}

async function send(text, label) {
  const el = page.locator('[data-testid="input-chat-message"]')
  await el.fill(text)
  // Use the SEND BUTTON — a real form submit, exactly what a mobile user taps.
  await page.locator('[data-testid="button-send-message"]').click()
  await sleep(600)

  // If the input unmounted, the message went through (chat disables input while
  // Evelyn "types"). Only a still-mounted input holding the text can be blocked.
  if ((await el.count()) === 0) {
    console.log(`  ✅ sent at ${label}: "${text}"`)
    return true
  }

  // Did the browser block it? The input keeps its value and is :invalid.
  const stillThere = await el.inputValue()
  const invalid = await el.evaluate((n) => !n.checkValidity())
  const msg = await el.evaluate((n) => n.validationMessage)
  if (stillThere === text && invalid) {
    blockedMessage = msg
    console.log(`  ❌ BLOCKED at ${label}: "${msg}" — message never sent`)
    return false
  }
  console.log(`  ✅ sent at ${label}: "${text}"`)
  return true
}

console.log('\n--- palm woven flow (mobile viewport) ---')
await page.goto(URL)
await waitForInput()

await state('greeting / name')
await send('Nichole', 'name')

await waitForInput()
await state('palm reflect')
await send('I think he has been lying to me and I feel it in my chest', 'palm-reflect')

await waitForInput()
const emailType = await state('EMAIL_CAPTURE')
await send(EMAIL, 'email')

// After email, woven jumps straight into the reading -> DEEPENING_2
await waitForInput()
const afterType = await state('after email (DEEPENING_2)')

console.log('\n--- the moment of failure ---')
const ok = await send('I am scared he is cheating and I do not know what to do', 'DEEPENING_2 reply')

console.log('\n================ RESULT ================')
console.log(`input type at EMAIL_CAPTURE      : ${emailType}`)
console.log(`input type at DEEPENING_2        : ${afterType}   <-- must be "text"`)
if (!ok) {
  console.log(`\n🔴 BUG REPRODUCED — user cannot type anything but an email.`)
  console.log(`   Browser refused the message with: "${blockedMessage}"`)
} else {
  console.log(`\n🟢 FIXED — a normal sentence sends successfully.`)
}
console.log('========================================\n')

await page.screenshot({ path: 'repro-email-lock.png', fullPage: false })
await browser.close()
process.exit(ok ? 0 : 1)
