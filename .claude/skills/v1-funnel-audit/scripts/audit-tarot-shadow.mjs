// v1-funnel-audit (tarot shadow) — walks BOTH ARMS of v1_tarot_shadow_2026 through a
// real browser, on the real /fb-tarot/b bridge, with the real resolver deciding.
//
//   npx tsx .claude/skills/v1-funnel-audit/scripts/audit-tarot-shadow.mjs
//
// ⚠ `npx tsx`, not `node`, unlike its sibling scripts. It imports the read registry so it
// can compare the SCREEN against what openerB says should be there, and tarotReads.ts
// imports through the `@shared/*` tsconfig alias, which bare node cannot resolve.
//
// Phase 4 of fb-tarot/docs/shadow-split-test-checklist.md. Everything before this
// proved the pieces in isolation: the generator proved the roster is the approved
// copy, tarotMethod.test.ts proved the resolver, tarot-shadow-roster.test.ts proved
// openerB reaches the right roster. NONE of them can see whether the six bubbles
// actually arrive on her screen, in order, with the card she drew attached.
//
// 🔴 WHY IT FORCES THE ARM THROUGH THE DATABASE, and not by mocking the response.
// Mocking /api/tarot/version would prove the client renders what it is told, which is
// the half already covered. The thing that has never run is the WHOLE chain —
// experiment row → assign() → resolveTarotMethod → the route → the fetch → openerB →
// sendBotMessages. So the arm is forced by weighting the real experiment 100/0 in the
// SANDBOX database and letting every link decide for itself.
//
// SAFE:
//   • LOCAL-ONLY guard on the base URL (dev and prod share one database; localhost
//     is the only target that does not).
//   • SANDBOX-DB guard: it refuses to run unless DATABASE_URL is the :5433 sandbox,
//     because it WRITES an experiment row. The real v1_tarot_shadow_2026 must be
//     seeded as a DRAFT by a human, in Phase 5, and never by this script.
//   • Meta blocked at the browser, so the hardcoded pixel cannot fire.
//   • /api/lead is CAPTURED and fulfilled locally, so nothing is enrolled, no row is
//     written and no marketing list is touched. ⚠ NOT `?noemail=1`, which the sibling
//     scripts use: TarotBridge.goToChat forwards only `clearing` when it builds the
//     chat URL, so the flag is DROPPED at the bridge and would silently do nothing.
//   • The experiment row it creates is DELETED in a finally block.
// It DOES make one real /api/chat call per lander per arm (6 total) — that is the
// point of the "handoff does not 400" check, and it cannot be mocked without
// deleting the check. Reaching it costs the email step, which is why /api/lead is
// mocked rather than skipped.
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import pg from 'pg';

const BASE = process.env.LOCAL_BASE_URL || 'http://localhost:5000';
const DB_URL = process.env.SANDBOX_DATABASE_URL || 'postgresql://postgres@127.0.0.1:5433/seer';
const KEY = 'v1_tarot_shadow_2026';
const OUT_DIR = 'audit-runs/v1-funnel-audit/tarot-shadow';
const SHOT_DIR = `${OUT_DIR}/shots`;
const CACHE_TTL_MS = 30_000; // server/lib/experiments.ts — a weight edit is invisible until it expires

// ── Safety guards, before anything else ─────────────────────────────────────
{
  const h = new URL(BASE).hostname;
  if (!['localhost', '127.0.0.1'].includes(h)) {
    console.error(`⛔ refusing a non-local target: ${BASE}. Dev and prod share one database.`);
    process.exit(2);
  }
  const d = new URL(DB_URL);
  if (!['localhost', '127.0.0.1'].includes(d.hostname) || d.port !== '5433') {
    console.error(`⛔ refusing to write experiment rows to ${d.hostname}:${d.port}. Sandbox only (:5433).`);
    process.exit(2);
  }
}

const { DECKS, openerB } = await import('../../../../client/src/content/tarotReads.ts');
const { SHADOW_READS } = await import('../../../../client/src/content/tarotReadsShadow.ts');

const DECK = 'return-mhf';
// The PANEL she taps. 🔴 NOT the card she draws — `return-mhf` is FACE-DOWN, so
// TarotBridge.cardForPanel shuffles and the draw is whatever came up. The first run of
// this script compared every walk against card 'a' and reported 7 failures that were all
// this: expected the Magician, got the Hanged Man. The drawn card is read off the chat
// URL below, which is the only place that knows it.
const PANEL = 'a';

// One lander per family that carries a DIFFERENT hard ban, because a fold bug would
// show up the same way on all three but a CONTENT bug would not.
//   commitment — a real man exists; the read never predicts what he does next
//   money      — the full MONEY_GUARD (no amount, no date, no source, never her fault)
//   after loss — someone has died; NO ARRIVAL, no mediumship, he is never spoken for
const LANDERS = [
  { family: 'commitment', hook: 'cards-will-commit' },
  { family: 'money',      hook: 'cards-blocked-retiring' },
  { family: 'after loss', hook: 'cards-ready-to-love' },
];

// 37 (hook, deck) pairs, read off the roster rather than re-typed — the same list
// Phase 5 will seed, so this run exercises the real scope shape.
const LANDER_SCOPE = Object.entries(SHADOW_READS).flatMap(([deck, hooks]) =>
  Object.keys(hooks ?? {}).map((hook) => ({ hook, deck })),
);

const checks = [];
const check = (name, pass, detail = '') => checks.push({ name, pass: !!pass, detail });
const transcript = [];

const arms = (naturalWeight, shadowWeight) => [
  { key: 'natural', weight: naturalWeight, payload: { method: 'natural' } },
  { key: 'shadow', weight: shadowWeight, payload: { method: 'shadow' } },
];

const pool = new pg.Pool({ connectionString: DB_URL });

async function seed(naturalWeight, shadowWeight) {
  await pool.query(
    `INSERT INTO experiments (key, name, status, started_at, subject_type, variants, scope, conversion)
     VALUES ($1,$2,'running',now(),'visitor',$3,$4,$5)
     ON CONFLICT (key) DO UPDATE SET status='running', variants=EXCLUDED.variants, scope=EXCLUDED.scope`,
    [
      KEY,
      'tarot shadow (SANDBOX SMOKE — deleted at the end of the run)',
      JSON.stringify(arms(naturalWeight, shadowWeight)),
      JSON.stringify({ funnel: ['v1-tarot'], landers: LANDER_SCOPE }),
      JSON.stringify({ type: 'v1_main_funnel', windowDays: 7, targetN: 7200 }),
    ],
  );
}


async function walk(page, { hook, family }, method) {
  const label = `${family}/${hook} · ${method}`;
  const seen = { armResponse: null };

  page.on('response', async (r) => {
    const u = r.url();
    if (u.includes('/api/tarot/version')) {
      try { seen.armResponse = await r.json(); } catch { /* ignore */ }
    }
  });

  // Fast-forward the scripted typing delays (1–5s per bubble, ~14 bubbles per walk), the
  // same clamp audit-flow/audit-upsells use. It only shortens setTimeout — nothing waits on
  // a timer to decide anything, so the flow it drives is the flow that ships.
  await page.addInitScript(() => {
    const real = window.setTimeout;
    window.setTimeout = (fn, ms, ...rest) => real(fn, Math.min(Number(ms) || 0, 60), ...rest);
  });
  await page.goto(`${BASE}/fb-tarot/b?hook=${hook}`, { waitUntil: 'domcontentloaded' });
  await page.locator(`[data-testid="tarot-card-${PANEL}"]`).first().waitFor({ timeout: 20000 });
  await page.locator(`[data-testid="tarot-card-${PANEL}"]`).first().click();

  // The bridge waits 1.5s then navigates to /fb-tarot/chat. The opener follows.
  await page.waitForURL(/\/fb-tarot\/chat/, { timeout: 20000 });

  // 🔴 THE CARD SHE ACTUALLY DREW, read off the URL the bridge just built. On a face-down
  // deck this is NOT the panel she tapped, and every expectation below has to be built
  // from it or the audit grades her read against a card she never saw.
  const card = new URL(page.url()).searchParams.get('card');
  check(`${label} — the bridge handed a real card across`, ['a', 'b', 'c'].includes(card), `card=${card}`);

  await settle(page);

  const msgs = await page.locator('[data-testid^="message-"]').allInnerTexts();
  const bubbles = msgs.map((m) => m.trim()).filter(Boolean);
  const expected = openerB(DECK, hook, card, method);

  transcript.push({ label, method, hook, family, card, arm: seen.armResponse, bubbles });

  check(`${label} — /api/tarot/version returned method=${method}`,
    seen.armResponse?.method === method,
    `got ${JSON.stringify(seen.armResponse)}`);
  check(`${label} — version stayed 'b'`, seen.armResponse?.version === 'b');
  check(`${label} — ${expected.length} bubbles rendered, in order`,
    bubbles.length === expected.length && expected.every((e, i) => bubbles[i] === e),
    bubbles.length !== expected.length
      ? `expected ${expected.length} bubbles, saw ${bubbles.length}`
      : firstDiff(expected, bubbles));
  check(`${label} — no empty bubble`, bubbles.every((b) => b.length > 0));
  check(`${label} — ends on name capture`, /what's your first name, dear\?$/.test(bubbles.at(-1) ?? ''));

  // The card art rides bubble 1 via sendBotMessages(msgs, art) and is INDEPENDENT of the
  // read text — so it must be there on both arms. The strip is cropped by
  // background-position, so the assertion is that bubble 1 carries a background image.
  const art = await page.locator('[data-testid^="message-"]').first()
    .locator('css=[style*="background-image"]').count();
  check(`${label} — card art on bubble 1`, art > 0, `${art} art elements`);

  // ── The cross-arm checks, done HERE because they depend on the drawn card ──────
  // 🔴 They cannot be done by comparing the two RUNS to each other: the deck is face-down,
  // so the shadow walk and the natural walk of the same lander routinely draw different
  // cards, and comparing them would be comparing two different readings.
  const otherArm = openerB(DECK, hook, card, method === 'shadow' ? 'natural' : 'shadow');
  check(`${label} — the two arms actually differ on card ${card}`,
    JSON.stringify(bubbles) !== JSON.stringify(otherArm),
    'an armed lander serving identical copy on both arms is not a test');

  if (method === 'natural') {
    // THE INVARIANT THE WHOLE DESIGN RESTS ON. `openerB` with NO method argument is what
    // shipped before any of this existed; the natural arm must be that, character for
    // character — not close to it.
    const today = openerB(DECK, hook, card);
    check(`${label} — byte-identical to today's funnel`,
      bubbles.length === today.length && today.every((e, i) => bubbles[i] === e),
      firstDiff(today, bubbles));
  }

  // ── The handoff, driven all the way to a REAL /api/chat ──────────────────
  // Name → the four scripted meet-you lines → the email anchor → DEEPENING_1, which is
  // where reading1 finally calls Claude. 🔴 STOPPING AT THE EMAIL STEP WOULD PROVE
  // NOTHING: chatStatus would still be null and the check would pass vacuously. This is
  // the trap audit-downsell-bump.mjs fell into once and the reason it is spelled out.
  await say(page, 'Maureen');
  await say(page, `smoke-${Date.now().toString(36)}@example.com`);

  // 🔴 AWAIT THE RESPONSE, do not trust settle(). The first run of this script did, and
  // it screenshotted the moment AFTER her message was appended and BEFORE the typing
  // indicator appeared — so settle() saw 2.5s of quiet, returned, and chatStatus was
  // still null. The check would have failed on the harness, not the product.
  const chatDone = page.waitForResponse((r) => r.url().includes('/api/chat'), { timeout: 120000 })
    .then((r) => r.status())
    .catch(() => null);
  await say(page, "I keep going round the same thing and I can't see why.", { timeoutMs: 5000 });
  const chatStatus = await chatDone;

  check(`${label} — the first real /api/chat was reached`,
    chatStatus !== null,
    'never fired — the walk stopped before reading1 and the 400 check would be vacuous');
  check(`${label} — handoff into chat did not 400`,
    chatStatus !== null && chatStatus < 400,
    `/api/chat → ${chatStatus}`);
  await settle(page, { timeoutMs: 30000 });

  await page.screenshot({ path: `${SHOT_DIR}/${method}-${hook}.png`, fullPage: true });
  return bubbles;
}

/** Type one answer and wait for the flow to come to rest. */
async function say(page, text, { timeoutMs = 60000 } = {}) {
  const input = page.locator('[data-testid="input-chat-message"]');
  await input.waitFor({ timeout: 20000 });
  await input.fill(text);
  await page.keyboard.press('Enter');
  await settle(page, { timeoutMs });
}

function firstDiff(expected, got) {
  for (let i = 0; i < Math.max(expected.length, got.length); i++) {
    if (expected[i] !== got[i]) return `bubble ${i + 1}:\n  expected: ${expected[i]}\n  got:      ${got[i]}`;
  }
  return '';
}

async function settle(page, { timeoutMs = 45000 } = {}) {
  const start = Date.now();
  let last = -1, stable = Date.now();
  while (Date.now() - start < timeoutMs) {
    const typing = await page.locator('[data-testid="indicator-typing"]').isVisible().catch(() => false);
    const n = await page.locator('[data-testid^="message-"]').count().catch(() => 0);
    if (n !== last) { last = n; stable = Date.now(); }
    if (!typing && Date.now() - stable > 2500) return;
    await page.waitForTimeout(400);
  }
}

let metaBlocked = 0;
let metaEscaped = 0;

mkdirSync(SHOT_DIR, { recursive: true });
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/(connect\.facebook\.net|facebook\.com|fbcdn\.net)/i, (r) => { metaBlocked++; return r.abort(); });
  // A response from Meta means one slipped past the route — the real safety assertion.
  ctx.on('response', (r) => { if (/(facebook\.com|facebook\.net|fbcdn\.net)/i.test(r.url())) metaEscaped++; });
  // Captured then fulfilled locally: the email step runs, nothing is enrolled, no row written.
  await ctx.route('**/api/lead', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: '{"success":true,"priceVariant":"35_tarot","priceDollars":35,"downsellDollars":25}',
  }));

  for (const [method, weights] of [['shadow', [0, 100]], ['natural', [100, 0]]]) {
    await seed(weights[0], weights[1]);
    console.log(`\n── forcing ${method} (weights ${weights.join('/')}) — waiting out the ${CACHE_TTL_MS / 1000}s config cache`);
    await new Promise((r) => setTimeout(r, CACHE_TTL_MS + 3000));
    for (const lander of LANDERS) {
      const page = await ctx.newPage();
      // A fresh context per walk would be cleaner, but the visitor cookie is what the
      // arm is bucketed on and a 100/0 weight makes the bucket irrelevant — so one
      // context is fine and keeps the run short.
      await ctx.clearCookies();
      await walk(page, lander, method);
      await page.close();
      console.log(`   ✓ walked ${lander.family}/${lander.hook}`);
    }
  }

  check('🔒 no Meta request escaped', metaEscaped === 0, `${metaBlocked} blocked, ${metaEscaped} escaped`);
} finally {
  await browser.close();
  await pool.query('DELETE FROM experiment_exposures WHERE experiment_key = $1', [KEY]);
  await pool.query('DELETE FROM experiments WHERE key = $1', [KEY]);
  await pool.end();
  console.log(`\n🧹 sandbox experiment '${KEY}' deleted`);
}

const failed = checks.filter((c) => !c.pass);
const md = [
  '# /fb-tarot Inherited Shadow — both-arm smoke',
  '',
  `${checks.length - failed.length}/${checks.length} checks passed.`,
  '',
  ...checks.map((c) => `- ${c.pass ? '✅' : '❌'} ${c.name}${c.detail && !c.pass ? `\n  \`\`\`\n  ${c.detail}\n  \`\`\`` : ''}`),
  '',
  '## Transcripts',
  '',
  ...transcript.flatMap((t) => [
    `### ${t.label} — drew card ${t.card}`,
    '',
    `\`/api/tarot/version\` → \`${JSON.stringify(t.arm)}\``,
    '',
    ...t.bubbles.map((b, i) => `${i + 1}. ${b}`),
    '',
  ]),
];
writeFileSync(`${OUT_DIR}/report.md`, md.join('\n'));

console.log(`\n${checks.length - failed.length}/${checks.length} passed → ${OUT_DIR}/report.md`);
for (const f of failed) console.log(`  ❌ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
process.exit(failed.length ? 1 : 0);
