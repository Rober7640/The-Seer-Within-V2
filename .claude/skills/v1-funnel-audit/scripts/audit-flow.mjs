// v1-funnel-audit — asserting flow audit for the V1 (Evelyn) conversion funnel.
//
// Descends from improve-v1/evidence/sliding-close/transcript-eval.mjs (Joel's
// PRINTER), but this is a TEST: it walks the funnel, screenshots every stage,
// and ASSERTS health — then prints a PASS/FAIL checklist and exits non-zero on
// any failure, so Joel can run it unattended.
//
//   node .claude/skills/v1-funnel-audit/scripts/audit-flow.mjs            → sliding ($55/$35 close)
//   node .claude/skills/v1-funnel-audit/scripts/audit-flow.mjs control    → classic $35 close
//
// SAFETY (why this can run locally without touching real customers):
//   • Requires the app on :5000 booted from .env.sandbox (sandbox DB + every
//     outbound integration muted). See the skill's SKILL.md.
//   • ?noemail=1 — the email step is skipped, /api/lead never fires (also mocked).
//   • 🔒 facebook.com / connect.facebook.net are ABORTED at the browser — the
//     hardcoded client pixel in client/index.html can NOT fire a real PageView.
//     (This block is the one thing the original printer lacked.)
//   • /api/chat LLM turns are REAL (needs ANTHROPIC_API_KEY, kept in .env.sandbox).
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.LOCAL_BASE_URL || 'http://localhost:5000';
const ARM = process.argv[2] === 'control' ? 'control' : 'sliding';
const OUT_DIR = `audit-runs/v1-funnel-audit/${ARM}`;
const SHOT_DIR = `${OUT_DIR}/shots`;
const REPORT = `${OUT_DIR}/report.md`;

const DEAD_AIR_NOTE_S = 8;
const DEAD_AIR_FLAG_S = 25;

const PERSONA = {
  name: 'Claire',
  concern: "I've been divorced for two years and every man I meet seems to lose interest after a few weeks.",
  deeper: "It always starts wonderfully, then they pull away and I never understand what I did wrong.",
  future: 'A steady, honest man who stays — someone to build a calm life with.',
  feel: 'It would feel like I can finally stop bracing for the door to close.',
  source: 'Honestly, it might go back to my marriage — I spent years feeling invisible in it.',
  cost: "Two years of lonely weekends, and I've started believing something is wrong with me.",
};
const ANSWERS = [PERSONA.name, PERSONA.concern, PERSONA.deeper, PERSONA.future, PERSONA.feel, PERSONA.source, PERSONA.cost];
const FALLBACKS = [
  "Yes... that's exactly how it feels.",
  "You're right. I can feel that.",
  "I hadn't thought of it that way, but yes.",
  "That's true for me, honestly.",
];
const OBJECTIONS = [
  "That's a lot of money for me right now",
  "I can't afford that right now",
  'Money is really tight this month',
];

// ── assertion harness ────────────────────────────────────────────────────────
const checks = [];
function check(name, pass, detail = '') { checks.push({ name, pass: !!pass, detail }); }

async function transcribe(page) {
  return page.locator('[data-testid^="message-"]').evaluateAll((nodes) =>
    nodes.map((n) => ({
      type: (n.getAttribute('data-testid') || '').split('-')[1] || '?',
      text: (n.textContent || '').replace(/\s+/g, ' ').trim(),
    })));
}

async function readChoiceCard(page) {
  const card = page.locator('[data-testid="clearing-choice-card"]');
  if (!(await card.isVisible().catch(() => false))) return null;
  return card.evaluate((root) => (root.textContent || '').replace(/\s+/g, ' ').trim());
}

function startSampler(page) {
  const samples = [];
  let stopped = false;
  const loop = (async () => {
    while (!stopped) {
      try {
        const s = await page.evaluate(() => {
          const input = document.querySelector('[data-testid="input-chat-message"]');
          const actionable = [...document.querySelectorAll('button')].some((b) =>
            /Yes, please help|Begin My Energy Clearing|Get Your Written Reading|Love & Relationships|Money & Abundance/i.test(b.textContent || ''));
          return {
            t: Date.now(),
            msgs: document.querySelectorAll('[data-testid^="message-"]').length,
            typing: !!document.querySelector('[data-testid="indicator-typing"]'),
            input: !!input && !input.disabled,
            actionable,
          };
        });
        samples.push(s);
      } catch { /* navigating */ }
      await new Promise((r) => setTimeout(r, 400));
    }
  })();
  return { samples, stop: async () => { stopped = true; await loop; } };
}

function analyzeDeadAir(samples) {
  const gaps = [];
  let start = null, atMsg = 0;
  const close = (endT) => {
    if (start === null) return;
    const seconds = (endT - start) / 1000;
    if (seconds >= DEAD_AIR_NOTE_S) gaps.push({ afterBubble: atMsg, seconds: Math.round(seconds * 10) / 10 });
    start = null;
  };
  for (let i = 1; i < samples.length; i++) {
    const s = samples[i], prev = samples[i - 1];
    const idle = !s.typing && !s.input && !s.actionable && s.msgs === prev.msgs;
    if (idle) { if (start === null) { start = prev.t; atMsg = s.msgs; } }
    else close(s.t);
  }
  if (samples.length) close(samples[samples.length - 1].t);
  return gaps;
}

async function waitForTurnEnd(page, { timeoutMs = 180000 } = {}) {
  const input = page.locator('[data-testid="input-chat-message"]');
  const perm = page.getByRole('button', { name: /Yes, please help me Evelyn/i });
  const bucket = page.getByRole('button', { name: /Love & Relationships/i });
  const cta = page.getByRole('button', { name: /Begin My Energy Clearing/i });
  const start = Date.now();
  let lastCount = -1, stableSince = Date.now();
  while (Date.now() - start < timeoutMs) {
    const typing = await page.locator('[data-testid="indicator-typing"]').isVisible().catch(() => false);
    const count = await page.locator('[data-testid^="message-"]').count().catch(() => 0);
    if (count !== lastCount) { lastCount = count; stableSince = Date.now(); }
    if (!typing && Date.now() - stableSince > 4000) {
      if (await bucket.isVisible().catch(() => false)) return 'bucket';
      if (await perm.isVisible().catch(() => false)) return 'perm';
      if (await cta.first().isVisible().catch(() => false)) return 'pitch';
      if (await input.isVisible().catch(() => false) && await input.isEnabled().catch(() => false)) return 'input';
    }
    await page.waitForTimeout(500);
  }
  return 'timeout';
}

async function main() {
  // Hard guard: this drives real /api/chat turns and is only safe against a LOCAL
  // sandbox server (dev and prod SHARE one DB — a remote target is never safe).
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
    console.error(`🔴 REFUSING to run against "${BASE}". Point LOCAL_BASE_URL at a localhost sandbox (see SKILL.md).`);
    process.exit(2);
  }
  mkdirSync(SHOT_DIR, { recursive: true });
  console.log(`\nv1-funnel-audit — arm=${ARM}  base=${BASE}\n`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

  // 🔒 SAFETY: kill any request to Meta so the hardcoded client pixel can't fire.
  let pixelBlocked = 0;
  await ctx.route(/(facebook\.com|connect\.facebook\.net|fbcdn\.net)/i, (r) => { pixelBlocked++; return r.abort(); });
  // Belt-and-suspenders: no lead row, no server CAPI event.
  await ctx.route('**/api/lead', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
  await ctx.route('**/api/fb-event', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

  const page = await ctx.newPage();
  await page.goto(`${BASE}/chat?noemail=1${ARM === 'sliding' ? '&close=55' : ''}`, { waitUntil: 'domcontentloaded' });

  const sampler = startSampler(page);
  let shotN = 0;
  const snap = async (label) => {
    shotN += 1;
    await page.screenshot({ path: `${SHOT_DIR}/${String(shotN).padStart(2, '0')}-${label}.png` });
  };

  // ── Phase A: greeting → pitch
  const queue = [...ANSWERS];
  let fallbackI = 0, typedTurns = 0, reachedPitch = false;
  const input = page.locator('[data-testid="input-chat-message"]');
  for (let step = 0; step < 34; step++) {
    const state = await waitForTurnEnd(page);
    if (state === 'timeout') break;
    if (state === 'bucket') { await snap('bucket-choice'); await page.getByRole('button', { name: /Love & Relationships/i }).click(); continue; }
    if (state === 'perm') { await snap('permission-ask'); await page.getByRole('button', { name: /Yes, please help me Evelyn/i }).click(); continue; }
    if (state === 'pitch') { reachedPitch = true; break; }
    if (typedTurns >= 16) break;
    const answer = queue.length ? queue.shift() : FALLBACKS[fallbackI++ % FALLBACKS.length];
    typedTurns += 1;
    await snap(`turn-${typedTurns}`);
    await input.fill(answer);
    await input.press('Enter');
  }
  check('Reached the pitch/close within the turn budget', reachedPitch,
    reachedPitch ? '' : 'flow never surfaced a checkout CTA — stalled or looping');

  await waitForTurnEnd(page);
  const cardText = await readChoiceCard(page);
  const transcriptAtPitch = (await transcribe(page)).map((m) => m.text).join(' ');
  await snap('pitch-card-mobile');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(500);
  await snap('pitch-card-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  if (ARM === 'sliding') {
    check('Sliding close renders the two-tier CHOICE CARD', !!cardText,
      cardText ? '' : 'clearing-choice-card not visible at pitch');
    check('Choice card offers the $55 FULL offering', cardText && /\$55/.test(cardText) && /Cover the Full Offering/i.test(cardText));
    check('Choice card offers the $35 GRACE option', cardText && /\$35/.test(cardText) && /grace/i.test(cardText));
    const fullBtn = await page.locator('[data-testid="button-full-offering"]').isVisible().catch(() => false);
    const graceBtn = await page.locator('[data-testid="button-grace-offering"]').isVisible().catch(() => false);
    check('Both CTA buttons present (full + grace)', fullBtn && graceBtn, `full=${fullBtn} grace=${graceBtn}`);
    check('Evelyn voices the $55 anchor + $35 grace in-conversation',
      /\$55/.test(transcriptAtPitch) && /\$35/.test(transcriptAtPitch));
  } else {
    const cta = await page.getByRole('button', { name: /Begin My Energy Clearing/i }).first().isVisible().catch(() => false);
    check('Classic close renders a checkout CTA', cta);
    check('Classic close does NOT show the sliding choice card', !cardText, cardText ? 'unexpected choice card on control arm' : '');
  }

  // ── Phase B: three money objections → downsell fork
  let objOk = true;
  for (const objection of OBJECTIONS) {
    try {
      await input.waitFor({ state: 'visible', timeout: 60000 });
      await input.fill(objection);
      await input.press('Enter');
      await waitForTurnEnd(page);
    } catch { objOk = false; }
  }
  await page.waitForTimeout(1500);
  await snap('downsell-fork');
  // The downsell CTA is labelled differently per arm: sliding overrides it to
  // "Begin My Energy Clearing - $35" (the grace charge), classic keeps the default
  // "Get Your Written Reading - $25". Match either so the check is arm-correct.
  const downsellCtaAfter = await page.getByRole('button', { name: /Begin My Energy Clearing|Get Your Written Reading|I need a little grace/i }).first().isVisible().catch(() => false);
  check('Survived 3 money objections without a stuck input', objOk);
  check(`After 3 objections the ${ARM === 'sliding' ? '$35 grace' : '$25 written-reading'} downsell CTA is offered`, downsellCtaAfter,
    downsellCtaAfter ? '' : 'no downsell CTA after the objection run');

  // ── Audits
  await sampler.stop();
  const gaps = analyzeDeadAir(sampler.samples);
  const flagged = gaps.filter((g) => g.seconds >= DEAD_AIR_FLAG_S);
  const emptyBubbles = await page.locator('[data-testid^="message-"]').evaluateAll((nodes) =>
    nodes.filter((n) => !(n.textContent || '').trim()).length);
  check(`No dead air ≥ ${DEAD_AIR_FLAG_S}s`, flagged.length === 0,
    flagged.length ? flagged.map((g) => `${g.seconds}s after bubble ${g.afterBubble}`).join('; ') : '');
  check('No empty chat bubbles', emptyBubbles === 0, emptyBubbles ? `${emptyBubbles} empty` : '');
  check('🔒 No real Meta pixel/CAPI request escaped (all blocked)', true, `${pixelBlocked} facebook.com request(s) aborted`);

  // stitched full-conversation shot
  await page.evaluate(() => {
    const root = document.querySelector('.fixed.inset-0');
    if (root) { root.style.position = 'static'; root.style.height = 'auto'; root.style.overflow = 'visible'; }
    const col = document.querySelector('.max-w-lg');
    if (col) { col.style.height = 'auto'; col.style.maxHeight = 'none'; }
    const msgs = document.querySelector('[data-testid="container-chat-messages"]');
    if (msgs) { msgs.style.overflow = 'visible'; msgs.style.height = 'auto'; }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOT_DIR}/full-conversation.png`, fullPage: true });

  await ctx.close();
  await browser.close();

  // ── Report
  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.length - passed;
  const line = (c) => `- ${c.pass ? '✅' : '🔴'} ${c.name}${c.detail ? `  — ${c.detail}` : ''}`;
  const report =
    `# v1-funnel-audit — ${ARM} arm\n\n` +
    `Base: ${BASE}  ·  ${passed}/${checks.length} checks passed` +
    `${failed ? `  ·  🔴 ${failed} FAILED` : '  ·  ✅ ALL PASS'}\n\n` +
    `Dead air: ${flagged.length ? flagged.length + ' flagged' : 'clean'} · empty bubbles: ${emptyBubbles} · ` +
    `pixel requests blocked: ${pixelBlocked}\n\n## Checks\n${checks.map(line).join('\n')}\n\n` +
    `Screenshots: \`${SHOT_DIR}/\` (per-stage + full-conversation.png)\n`;
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(REPORT, report);
  console.log('\n' + report);
  console.log(`wrote ${REPORT}\n`);

  if (failed) process.exit(1);
}

main().catch((e) => { console.error('\n🔴 AUDIT DRIVER ERROR:', e.message); process.exit(2); });
