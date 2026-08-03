// v1-funnel-audit (funnels) — per-funnel ENTRY smoke through a real browser.
//
//   node .claude/skills/v1-funnel-audit/scripts/audit-funnels.mjs
//
// audit-charge.mjs proves the SERVER prices each funnel correctly by POSTing the
// funnel id straight to /api/lead. This proves the other half: that ENTERING the
// funnel through its real URL makes the CLIENT derive and thread the right funnel
// (and, for palm, the right sign) — the path→funnel mapping in
// client/src/lib/funnel.ts (currentFunnel) that every downstream price/attribution
// decision depends on. A wrong prefix match (the trailing-slash /fb2-vs-/fb class
// of bug) would misprice a whole funnel and no server-side test would ever see it.
//
// It is deliberately CHEAP: it drives only the scripted pre-LLM steps
// (greeting → name → bucket → email). The first /api/chat (reading1) fires one
// step later at DEEPENING_1, so this run makes ZERO Anthropic calls. The full
// LLM conversation is covered by audit-flow.mjs (root) and audit-palm.mjs (palm).
//
// For each funnel it loads the entry URL, walks to the email step, and captures the
// exact body the client POSTs to /api/lead — then asserts:
//   • the chat UI booted (fresh scripted greeting rendered)
//   • the email step was reached and /api/lead fired (the scripted flow works)
//   • body.funnel  == the expected funnel id  (root → none; /fb → v1-fb; …)
//   • body.sign    == the expected palm sign  (palm entries only)
//   • body.tarot*  == the expected lander identity (tarot entries only) — deck,
//     facing, hook and angle, which the commitment gate's per-lander reporting is
//     built on and which can only ever be captured once per visitor
//   • tarot sends NO sign (that field feeds the palm price-variant pool)
//   • no Meta request escaped (safety)
//
// SAFE: LOCAL-ONLY guard; Meta blocked; /api/lead is CAPTURED then fulfilled
// locally (no enrolment, no DB write, no outbound). /api/chat is never reached.
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.LOCAL_BASE_URL || 'http://localhost:5000';
const OUT_DIR = 'audit-runs/v1-funnel-audit/funnels';
const SHOT_DIR = `${OUT_DIR}/shots`;
const RUN = Date.now().toString(36);

// The entry matrix. `expectFunnel` is what client currentFunnel() must derive from
// the PATH; `undefined` = base V1 (the client omits the field entirely).
const FUNNELS = [
  { label: 'root',           path: '/chat',                                            expectFunnel: undefined, expectSign: undefined },
  { label: 'fb',             path: '/fb/chat',                                         expectFunnel: 'v1-fb',   expectSign: undefined },
  { label: 'fb2',            path: '/fb2/chat',                                        expectFunnel: 'v1-fb2',  expectSign: undefined },
  { label: 'gdn',            path: '/gdn/chat',                                        expectFunnel: 'v1-gdn',  expectSign: undefined },
  { label: 'palm/thumb',     path: '/fb-palm/chat?hook=already-met&thumb=a',           expectFunnel: 'v1-palm', expectSign: 'thumb' },
  { label: 'palm/hand-size', path: '/fb-palm/chat?hook=already-met&thumb=a&sign=hand-size', expectFunnel: 'v1-palm', expectSign: 'hand-size' },

  // ── /fb-tarot (added 2026-07-31) ────────────────────────────────────────────
  // Tarot sends NO `sign` — normalizeSign is palm-only and returns null off it — so
  // `expectSign` stays undefined and `expectTarot` carries the lander identity instead.
  //
  // Those tarot* fields are what the commitment gate's per-lander reporting is built
  // on, and they are a ONE-SHOT capture: the exposure row is unique(key, subject_id),
  // written once at email capture, and `conversations` has no deck/hook column to
  // recover from. If this thread ever breaks, every affected visitor is permanently
  // unattributable — so it is asserted here rather than trusted.
  //
  // Entering straight at the chat URL is equivalent to arriving from the bridge:
  // App.tsx runs syncTarotAttribution on the tarot funnel and it reads deck/hook from
  // the query string off-bridge too, which is exactly the URL TarotBridge.goToChat builds.
  {
    label: 'tarot/face-down',
    // CLEAN URL — no &deck=, as the live face-down ads run. Must resolve to the
    // DEFAULT deck, not to a stored or placeholder one.
    path: '/fb-tarot/chat?hook=cards-return&card=a&v=c',
    expectFunnel: 'v1-tarot', expectSign: undefined,
    expectTarot: { tarotDeck: 'return-mhf', tarotFacing: 'down', tarotHook: 'cards-return', tarotAngle: 'decode-him' },
  },
  {
    label: 'tarot/face-up',
    // &deck= is LOAD-BEARING here: drop it and a face-up ad serves face-DOWN backs.
    path: '/fb-tarot/chat?hook=cards-honest&card=a&deck=arcana-mfh&v=c',
    expectFunnel: 'v1-tarot', expectSign: undefined,
    expectTarot: { tarotDeck: 'arcana-mfh', tarotFacing: 'up', tarotHook: 'cards-honest', tarotAngle: 'decode-him' },
  },
  {
    label: 'tarot/commitment',
    // The newest angle. Guards angleForHook: a hook left out of COMMITMENT_HOOKS
    // silently reports 'decode-him' and vanishes as a reportable family.
    path: '/fb-tarot/chat?hook=cards-will-commit&card=a&v=c',
    expectFunnel: 'v1-tarot', expectSign: undefined,
    expectTarot: { tarotDeck: 'return-mhf', tarotFacing: 'down', tarotHook: 'cards-will-commit', tarotAngle: 'commitment' },
  },
  {
    label: 'tarot/honesty',
    // Added 2026-08-03 with the honesty/lying headlines. Same guard as commitment: a
    // hook left out of HONESTY_HOOKS silently reports 'decode-him'. Worth its own row
    // because this angle's nearest neighbours (cards-honest = decode-him, cards-misled
    // = trust) are BOTH different angles, so a mis-wire here is easy to miss by eye.
    path: '/fb-tarot/chat?hook=cards-deceived&card=a&v=c',
    expectFunnel: 'v1-tarot', expectSign: undefined,
    expectTarot: { tarotDeck: 'return-mhf', tarotFacing: 'down', tarotHook: 'cards-deceived', tarotAngle: 'honesty' },
  },
];

const checks = [];
const check = (name, pass, detail = '') => checks.push({ name, pass: !!pass, detail });

async function waitForStep(page, { timeoutMs = 45000 } = {}) {
  const input = page.locator('[data-testid="input-chat-message"]');
  const bucket = page.getByRole('button', { name: /Love & Relationships/i });
  const perm = page.getByRole('button', { name: /Yes, please help me Evelyn/i });
  const start = Date.now();
  let lastCount = -1, stableSince = Date.now();
  while (Date.now() - start < timeoutMs) {
    const typing = await page.locator('[data-testid="indicator-typing"]').isVisible().catch(() => false);
    const count = await page.locator('[data-testid^="message-"]').count().catch(() => 0);
    if (count !== lastCount) { lastCount = count; stableSince = Date.now(); }
    if (!typing && Date.now() - stableSince > 2500) {
      if (await bucket.isVisible().catch(() => false)) return 'bucket';
      if (await perm.isVisible().catch(() => false)) return 'perm';
      if (await input.isVisible().catch(() => false) && await input.isEnabled().catch(() => false)) return 'input';
    }
    await page.waitForTimeout(400);
  }
  return 'timeout';
}

async function auditOne(browser, f) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let metaBlocked = 0;
  await ctx.route(/(connect\.facebook\.net|facebook\.com|fbcdn\.net)/i, (r) => { metaBlocked++; return r.abort(); });
  // Capture the client's /api/lead body, then fulfil locally — no enrolment, no DB
  // write. This is the payload whose `funnel`/`sign` we assert on.
  let leadBody = null;
  await ctx.route('**/api/lead', async (route) => {
    try { leadBody = JSON.parse(route.request().postData() || '{}'); } catch { leadBody = {}; }
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: '{"success":true,"priceVariant":"35","priceDollars":35,"downsellDollars":25}' });
  });

  const page = await ctx.newPage();
  const email = `funnel-${f.label.replace(/\W+/g, '-')}-${RUN}@example.com`;
  let greeted = false, reachedEmail = false;
  try {
    await page.goto(`${BASE}${f.path}`, { waitUntil: 'domcontentloaded' });
    const input = page.locator('[data-testid="input-chat-message"]');
    let nameSent = false;
    for (let step = 0; step < 12 && !leadBody; step++) {
      const state = await waitForStep(page);
      if (state === 'timeout') break;
      // A bot bubble on screen ⇒ the fresh scripted greeting rendered.
      if (!greeted) greeted = (await page.locator('[data-testid^="message-bot-"]').count().catch(() => 0)) > 0;
      if (state === 'bucket') { await page.getByRole('button', { name: /Love & Relationships/i }).click(); continue; }
      if (state === 'perm') { await page.getByRole('button', { name: /Yes, please help me Evelyn/i }).click(); continue; }
      const ph = (await input.getAttribute('placeholder').catch(() => '')) || '';
      if (/e-?mail/i.test(ph)) {
        reachedEmail = true;
        await input.fill(email);
        await page.locator('[data-testid="button-send-message"]').click().catch(() => input.press('Enter'));
        await page.waitForTimeout(1500); // let /api/lead fire + be captured
        break;
      }
      // The only text step before email is the name; anything else, send a neutral
      // line so a stray prompt doesn't stall us (still pre-LLM).
      await input.fill(nameSent ? 'ok' : 'Claire');
      nameSent = true;
      await page.locator('[data-testid="button-send-message"]').click().catch(() => input.press('Enter'));
    }
    await page.screenshot({ path: `${SHOT_DIR}/${f.label.replace(/\W+/g, '-')}.png` }).catch(() => {});
  } catch (e) {
    check(`[${f.label}] entry ran without a driver error`, false, e.message);
  }

  const capturedFunnel = leadBody ? (leadBody.funnel ?? undefined) : undefined;
  const capturedSign = leadBody ? (leadBody.sign ?? undefined) : undefined;

  check(`[${f.label}] chat UI booted (scripted greeting rendered)`, greeted);
  check(`[${f.label}] reached the email step and /api/lead fired`, reachedEmail && !!leadBody,
    leadBody ? '' : 'no /api/lead POST captured before the turn budget ran out');
  check(`[${f.label}] client threaded funnel = ${f.expectFunnel ?? '(none / base V1)'}`,
    capturedFunnel === f.expectFunnel, `client sent funnel=${JSON.stringify(capturedFunnel)}`);
  if (f.expectSign !== undefined) {
    check(`[${f.label}] client threaded sign = ${f.expectSign}`,
      capturedSign === f.expectSign, `client sent sign=${JSON.stringify(capturedSign)}`);
  }
  // /fb-tarot lander identity. Asserted field by field so a failure names the one
  // that drifted rather than just "the tarot object is wrong".
  if (f.expectTarot) {
    for (const [key, want] of Object.entries(f.expectTarot)) {
      const got = leadBody ? leadBody[key] : undefined;
      check(`[${f.label}] client threaded ${key} = ${want}`,
        got === want, `client sent ${key}=${JSON.stringify(got)}`);
    }
    // Tarot must NEVER send `sign`: that field feeds the palm price-variant pool
    // (selectVariant → scopeVariantsToSign), so a tarot value leaking into it could
    // move a tarot visitor onto a palm-scoped arm.
    check(`[${f.label}] tarot sends NO sign (that field feeds the palm price pool)`,
      capturedSign === undefined, `client sent sign=${JSON.stringify(capturedSign)}`);
  }
  check(`[${f.label}] 🔒 no Meta request escaped`, true, `${metaBlocked} blocked`);

  await ctx.close();
}

async function main() {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
    console.error(`🔴 REFUSING to run against "${BASE}". Point LOCAL_BASE_URL at a localhost sandbox.`);
    process.exit(2);
  }
  mkdirSync(SHOT_DIR, { recursive: true });
  console.log(`\nv1-funnel-audit (funnels) — base=${BASE}  run=${RUN}\n`);

  const browser = await chromium.launch();
  for (const f of FUNNELS) {
    console.log(`  → ${f.label}  (${f.path})`);
    await auditOne(browser, f);
  }
  await browser.close();

  const passed = checks.filter((c) => c.pass).length, failed = checks.length - passed;
  const report =
    `# v1-funnel-audit (funnels) — per-funnel entry + client funnel/sign threading\n\n` +
    `Base: ${BASE} · run ${RUN} · ${passed}/${checks.length} passed${failed ? ` · 🔴 ${failed} FAILED` : ' · ✅ ALL PASS'}\n\n` +
    `Each funnel is entered through its real URL; the run walks the scripted pre-LLM steps to the email\n` +
    `step and asserts the client derived the right funnel (+sign) from the PATH. Zero Anthropic calls.\n\n` +
    `## Checks\n${checks.map((c) => `- ${c.pass ? '✅' : '🔴'} ${c.name}${c.detail ? `  — ${c.detail}` : ''}`).join('\n')}\n\n` +
    `Screenshots: \`${SHOT_DIR}/\`\n`;
  writeFileSync(`${OUT_DIR}/report.md`, report);
  console.log('\n' + report);
  console.log(`wrote ${OUT_DIR}/report.md\n`);
  if (failed) process.exit(1);
}

main().catch((e) => { console.error('\n🔴 FUNNELS AUDIT ERROR:', e.message); process.exit(2); });
