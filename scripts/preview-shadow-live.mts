#!/usr/bin/env npx tsx
// preview-shadow-live — walk BOTH ARMS in a real browser and print natural vs shadow.
//
//   npx tsx scripts/preview-shadow-live.mts
//
// The sibling of scripts/preview-shadow.mts. That one renders the DRAFTS for reading;
// this one drives the actual funnel and prints what a visitor is really served, on each
// arm, so the two can be compared line by line before the experiment is started.
//
// 🔴 IT REPORTS NO PASS/FAIL VERDICT, on purpose — same reasoning as preview-shadow.mts.
// It DOES verify each captured transcript against openerB(), because a transcript that
// silently drifted from the code would be worse than no transcript. That check is a hard
// error, not a tile: if it fires, the printed copy is not trustworthy and the run stops.
//
// ── The two things that make this honest ────────────────────────────────────
// 1. THE ARM IS FORCED THROUGH THE DATABASE, not by mocking /api/tarot/version. The whole
//    chain runs: experiment row -> assign() -> resolveTarotMethod -> route -> fetch ->
//    openerB -> sendBotMessages. Weights go 100/0, and the config cache is waited out.
// 2. BOTH ARMS ARE PINNED TO THE SAME CARD. `return-mhf` is FACE-DOWN and TarotBridge
//    reshuffles `drawOrder` on every mount, so the draw is random per page load. Left
//    alone, the natural walk and the shadow walk of one lander routinely draw DIFFERENT
//    cards — and comparing those is comparing two different readings, which is exactly
//    the mistake that made the Phase-4 audit report 7 false failures. So the walk RETRIES
//    the bridge until the target card comes up. Still a real tap; just a repeated one.
//
// SAFE: localhost-only + sandbox-DB-only guards (it writes an experiment row, and the
// live v1_tarot_shadow_2026 is a human's to touch); Meta blocked; the experiment row is
// deleted in a finally block. It stops at name capture — the read IS the transcript — so
// it makes ZERO Anthropic calls. The chat handoff is proven by audit-tarot-shadow.mjs.
import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { Pool } from 'pg'
import { openerB, HEADLINES } from '../client/src/content/tarotReads'
import { SHADOW_READS } from '../client/src/content/tarotReadsShadow'

const BASE = process.env.LOCAL_BASE_URL || 'http://localhost:5000'
const DB_URL = process.env.SANDBOX_DATABASE_URL || 'postgresql://postgres@127.0.0.1:5433/seer'
const KEY = 'v1_tarot_shadow_2026'
const OUT = 'audit-runs/v1-funnel-audit/tarot-shadow/NATURAL-VS-SHADOW.md'
const CACHE_TTL_MS = 30_000

{
  const h = new URL(BASE).hostname
  if (!['localhost', '127.0.0.1'].includes(h)) { console.error(`⛔ non-local target: ${BASE}`); process.exit(2) }
  const d = new URL(DB_URL)
  if (!['localhost', '127.0.0.1'].includes(d.hostname) || d.port !== '5433') {
    console.error(`⛔ refusing to write experiment rows to ${d.hostname}:${d.port}. Sandbox only (:5433).`); process.exit(2)
  }
}

const DECK = 'return-mhf'
const CARD_NAME: Record<string, string> = { a: 'the Magician', b: 'the Hanged Man', c: 'the Fool' }

// ONE LANDER PER FAMILY, plus the ✝ prayer ban which exists nowhere else on the funnel.
// The target card rotates a/b/c so the sample shows all three of the deck's cards.
const SAMPLE = [
  { family: 'Commitment',              hook: 'cards-will-commit',     card: 'a', ban: 'a real man exists; never predict what he does next' },
  { family: 'Money',                   hook: 'cards-blocked-retiring', card: 'b', ban: 'MONEY_GUARD — no amount, no date, no source, never her fault' },
  { family: 'Money ✝',                 hook: 'cards-prayed-years',    card: 'c', ban: '✝ never rule on God, in either direction' },
  { family: 'Soulmate × keyword',      hook: 'cards-heal-first',      card: 'a', ban: 'the ad already says she is the problem — turn it into an asset' },
  { family: 'Soulmate × age band',     hook: 'cards-best-years',      card: 'b', ban: 'no man exists yet; the age band lives in the ad set, never the copy' },
  { family: 'Soulmate × where',        hook: 'cards-where-soulmate',  card: 'c', ban: 'never name a PLACE' },
  { family: 'Soulmate × after loss',   hook: 'cards-ready-to-love',   card: 'a', ban: 'someone has died — NO ARRIVAL, no mediumship, he is never spoken for' },
] as const

const LANDER_SCOPE = Object.entries(SHADOW_READS).flatMap(([deck, hooks]) =>
  Object.keys(hooks ?? {}).map((hook) => ({ hook, deck })),
)

const pool = new Pool({ connectionString: DB_URL })
const seed = (nw: number, sw: number) => pool.query(
  `INSERT INTO experiments (key, name, status, started_at, subject_type, variants, scope, conversion)
   VALUES ($1,$2,'running',now(),'visitor',$3,$4,$5)
   ON CONFLICT (key) DO UPDATE SET status='running', variants=EXCLUDED.variants, scope=EXCLUDED.scope`,
  [KEY, 'tarot shadow (SANDBOX PREVIEW — deleted at the end of the run)',
   JSON.stringify([{ key: 'natural', weight: nw, payload: { method: 'natural' } },
                   { key: 'shadow',  weight: sw, payload: { method: 'shadow'  } }]),
   JSON.stringify({ funnel: ['v1-tarot'], landers: LANDER_SCOPE }),
   JSON.stringify({ type: 'v1_main_funnel', windowDays: 7, targetN: 10200 })],
)

async function settle(page: any, timeoutMs = 30000) {
  const start = Date.now(); let last = -1, stable = Date.now()
  while (Date.now() - start < timeoutMs) {
    const typing = await page.locator('[data-testid="indicator-typing"]').isVisible().catch(() => false)
    const n = await page.locator('[data-testid^="message-"]').count().catch(() => 0)
    if (n !== last) { last = n; stable = Date.now() }
    if (!typing && Date.now() - stable > 2000) return
    await page.waitForTimeout(300)
  }
}

/** Walk the bridge until the TARGET card is drawn, then capture the opener. */
async function walk(ctx: any, hook: string, target: string, method: string) {
  for (let attempt = 1; attempt <= 20; attempt++) {
    const page = await ctx.newPage()
    await page.addInitScript(() => {
      const real = window.setTimeout
      // @ts-expect-error - test-only clamp on the scripted typing delays
      window.setTimeout = (fn: any, ms: any, ...rest: any[]) => real(fn, Math.min(Number(ms) || 0, 60), ...rest)
    })
    await ctx.clearCookies()
    await page.goto(`${BASE}/fb-tarot/b?hook=${hook}`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-testid="tarot-card-a"]').first().waitFor({ timeout: 20000 })
    await page.locator('[data-testid="tarot-card-a"]').first().click()
    await page.waitForURL(/\/fb-tarot\/chat/, { timeout: 20000 })
    const drawn = new URL(page.url()).searchParams.get('card')
    if (drawn !== target) { await page.close(); continue }   // reshuffle and tap again

    let arm: any = null
    page.on('response', async (r: any) => {
      if (r.url().includes('/api/tarot/version')) { try { arm = await r.json() } catch { /* ignore */ } }
    })
    await settle(page)
    const bubbles = (await page.locator('[data-testid^="message-"]').allInnerTexts())
      .map((m: string) => m.trim()).filter(Boolean)
    await page.close()

    // 🔴 The transcript must be what the CODE says, or it is not evidence of anything.
    const expected = openerB(DECK as any, hook as any, target as any, method as any)
    if (JSON.stringify(bubbles) !== JSON.stringify(expected)) {
      throw new Error(`${hook}/${target}/${method}: the screen does not match openerB().\n` +
        `  expected ${expected.length} bubbles, saw ${bubbles.length}\n` +
        expected.map((e, i) => (e === bubbles[i] ? '' : `  [${i + 1}] expected: ${e}\n      got:      ${bubbles[i]}`)).filter(Boolean).join('\n'))
    }
    return { bubbles, attempts: attempt }
  }
  throw new Error(`${hook}: card '${target}' never came up in 20 shuffles`)
}

mkdirSync('audit-runs/v1-funnel-audit/tarot-shadow', { recursive: true })
const browser = await chromium.launch()
const got: Record<string, { bubbles: string[]; attempts: number }> = {}
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.route(/(connect\.facebook\.net|facebook\.com|fbcdn\.net)/i, (r: any) => r.abort())
  for (const [method, w] of [['shadow', [0, 100]], ['natural', [100, 0]]] as const) {
    await seed(w[0], w[1])
    console.log(`\n── forcing ${method} — waiting out the ${CACHE_TTL_MS / 1000}s config cache`)
    await new Promise((r) => setTimeout(r, CACHE_TTL_MS + 3000))
    for (const s of SAMPLE) {
      got[`${method}:${s.hook}`] = await walk(ctx, s.hook, s.card, method)
      console.log(`   ✓ ${method.padEnd(7)} ${s.hook} (card ${s.card}, ${got[`${method}:${s.hook}`].attempts} shuffle(s))`)
    }
  }
} finally {
  await browser.close()
  await pool.query('DELETE FROM experiment_exposures WHERE experiment_key = $1', [KEY])
  await pool.query('DELETE FROM experiments WHERE key = $1', [KEY])
  await pool.end()
  console.log(`\n🧹 sandbox experiment '${KEY}' deleted`)
}

const md: string[] = [
  '# /fb-tarot — natural vs the Inherited Shadow, as actually served',
  '',
  'Captured from a real browser on `/fb-tarot/b`, both arms forced through the resolver in a',
  'sandbox database. Every transcript below was verified character-for-character against',
  '`openerB()` as it was captured. One lander per family, plus the ✝ prayer ban.',
  '',
  '**natural** is the 30% arm and is what serves today. **shadow** is the 70% arm.',
  'She sees ONE card; the target card is pinned so both arms are comparable.',
  '',
]
for (const s of SAMPLE) {
  const n = got[`natural:${s.hook}`].bubbles
  const sh = got[`shadow:${s.hook}`].bubbles
  md.push(`## ${s.family} — \`${s.hook}\``, '',
    `**Ad:** ${(HEADLINES as any)[s.hook]}`, '',
    `**Card ${s.card}** — ${CARD_NAME[s.card]}. *Hard ban: ${s.ban}*`, '',
    `### natural — 30%, what serves today (${n.length} bubbles)`, '',
    ...n.map((b, i) => `${i + 1}. ${b}`), '',
    `### shadow — 70%, the Inherited Shadow (${sh.length} bubbles)`, '',
    ...sh.map((b, i) => `${i + 1}. ${b}`), '')
}
writeFileSync(OUT, md.join('\n'))
console.log(`\n${SAMPLE.length} landers × 2 arms → ${OUT}`)
