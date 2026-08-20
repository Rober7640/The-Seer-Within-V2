// v1-funnel-audit — CLOSE DEPTH (v1_close_depth_2026) arm audit.
//
//   node .claude/skills/v1-funnel-audit/scripts/audit-close-depth.mjs
//
// Walks /fb-tarot twice — once with no override (arm A) and once with
// ?close_depth=deep (arm B) — and asserts the two closes are what the experiment
// says they are:
//
//   • arm B renders ALL of the five new blocks, bubble for bubble
//   • arm A renders NONE of them (the ship-dark / byte-identical guarantee)
//   • arm A's own eight close bubbles survive verbatim in arm A
//   • both arms still reach a working checkout CTA
//
// WHAT THIS DOES AND DOES NOT PROVE. It proves the RENDERING half: the arm
// reaches the pitch and the right bubbles come out. It does not exercise the
// server ASSIGNMENT half (`?noemail=1` means /api/lead never fires, which is what
// makes the walk safe) — that is covered by server/lib/closeDepth.test.ts, which
// drives resolveV1CloseDepth against a real experiment row.
//
// SAFETY — identical contract to audit-flow.mjs:
//   • localhost only, app booted from .env.sandbox (sandbox DB, muted integrations)
//   • ?noemail=1 — the email step is skipped and /api/lead is mocked anyway
//   • 🔒 facebook.com / connect.facebook.net ABORTED so the client pixel cannot fire
//   • /api/chat turns are REAL (costs Anthropic tokens, touches no customer)
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const BASE = process.env.LOCAL_BASE_URL || 'http://localhost:5000';
const OUT_DIR = 'audit-runs/v1-funnel-audit/close-depth';
const SHOT_DIR = `${OUT_DIR}/shots`;
const REPORT = `${OUT_DIR}/report.md`;
const DEAD_AIR_FLAG_S = 25;

// The tarot lander the test is scoped to. Driving the REAL entry (rather than
// root /chat) also proves the preview param survives the lander → chat handoff.
const TAROT_ENTRY = '/fb-tarot/chat?hook=cards-return&card=a&v=c&noemail=1';

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

// ── The copy under test ──────────────────────────────────────────────────────
// Fragments, not whole bubbles: `${firstName}` interpolates and the em-dashes are
// easy to typo, so each entry is a distinctive middle slice of its bubble. If one
// of these stops matching, the copy moved — which is exactly what should fail.
const DEEP_ONLY = [
  // mechanism
  "isn't a mood, dear",
  'kept its grip',
  'Not wishing. Not hoping. Naming.',
  // ritual (deep rewrite of the middle bubble)
  "On my table, that's a length of black cord",
  'seal both ends with wax',
  "doesn't grow back, dear",
  // deliverable, page by page
  'Page one is what I found',
  'Page two is what I cleared',
  'most women read twice',
  'What shifts by week three',
  'not a mountain to climb',
  // price justification
  'Let me tell you plainly where it goes',
  'The cord, the wax',
  'covers the whole of it and keeps this honest',
  // proof
  'sleeping through the night',
  // objections
  "I'd rather answer them now",
  'is not nothing when the month is already thin',
  "not what's cooled by Friday",
  'reading a fainter thing',
];

// Arm A's own close. Every one of these must survive on the control path — this
// is the browser-side half of the byte-identical guarantee.
const CONTROL_CLOSE = [
  'enter a deep meditative state',
  "I'll trace the roots of this block",
  '2-3 hours of concentrated work',
  'personalized 5-7 page reading via email',
  'what I cleared, and 3 specific steps',
  'sacred offering is $35',
  '30-day guarantee',
  'hundreds of seekers',
];
// The one control bubble the deep arm REPLACES (rather than adds to).
const REPLACED_ON_DEEP = "I'll trace the roots of this block";

const checks = [];
function check(name, pass, detail = '') { checks.push({ name, pass: !!pass, detail }); }

async function transcribe(page) {
  return page.locator('[data-testid^="message-"]').evaluateAll((nodes) =>
    nodes.map((n) => (n.textContent || '').replace(/\s+/g, ' ').trim()));
}

function startSampler(page) {
  const samples = [];
  let stopped = false;
  const loop = (async () => {
    while (!stopped) {
      try {
        samples.push(await page.evaluate(() => {
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
        }));
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
    if (seconds >= 8) gaps.push({ afterBubble: atMsg, seconds: Math.round(seconds * 10) / 10 });
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

/**
 * Walk one arm to the pitch and return its transcript + health signals.
 *
 * 🔴 EACH ARM GETS ITS OWN BROWSER CONTEXT, and that is load-bearing rather than
 * tidiness. The V1 chat persists the session to localStorage and restores it on
 * load whenever it holds a firstName (useConversation's lazy initial state), so a
 * second arm sharing one context RESUMES the first arm's finished conversation —
 * it lands already at the pitch, never re-runs handlePermission, and reports the
 * first arm's transcript as its own. That failure looks exactly like "the deep arm
 * renders nothing", which is how it was found (2026-08-17).
 */
async function walk(browser, arm) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/(facebook\.com|connect\.facebook\.net|fbcdn\.net)/i, (r) => { pixelBlocked++; return r.abort(); });
  await ctx.route('**/api/lead', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
  await ctx.route('**/api/fb-event', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  const page = await ctx.newPage();
  const entry = arm === 'deep' ? `${TAROT_ENTRY}&close_depth=deep` : TAROT_ENTRY;
  await page.goto(`${BASE}${entry}`, { waitUntil: 'domcontentloaded' });

  const sampler = startSampler(page);
  let shotN = 0;
  const snap = async (label) => {
    shotN += 1;
    await page.screenshot({ path: `${SHOT_DIR}/${arm}-${String(shotN).padStart(2, '0')}-${label}.png` });
  };

  const queue = [...ANSWERS];
  let fallbackI = 0, typedTurns = 0, reachedPitch = false;
  // Wall-clock from the permission click to the buy button — the dwell the woman
  // actually sits through. Measured rather than estimated, because it is the whole
  // downside risk of this test ("a longer close may tire her").
  let permClickedAt = null, closeSeconds = null;
  const input = page.locator('[data-testid="input-chat-message"]');
  for (let step = 0; step < 34; step++) {
    // 🔴 The close itself needs a FAR longer budget than a normal turn. Arm B is 26
    // bubbles of typing theater plus two LLM calls, which overruns the 180s default
    // — and the symptom is `reachedPitch: false` on an arm that reached the pitch
    // perfectly well, which is how this was first mis-read (2026-08-17).
    const state = await waitForTurnEnd(page, { timeoutMs: permClickedAt ? 420000 : 180000 });
    if (state === 'timeout') break;
    if (state === 'bucket') { await snap('bucket'); await page.getByRole('button', { name: /Love & Relationships/i }).click(); continue; }
    if (state === 'perm') {
      await snap('permission-ask');
      permClickedAt = Date.now();
      await page.getByRole('button', { name: /Yes, please help me Evelyn/i }).click();
      continue;
    }
    if (state === 'pitch') {
      reachedPitch = true;
      if (permClickedAt) closeSeconds = Math.round((Date.now() - permClickedAt) / 1000);
      break;
    }
    if (typedTurns >= 16) break;
    const answer = queue.length ? queue.shift() : FALLBACKS[fallbackI++ % FALLBACKS.length];
    typedTurns += 1;
    await input.fill(answer);
    await input.press('Enter');
  }
  await waitForTurnEnd(page);
  await snap('pitch');

  const messages = await transcribe(page);
  const transcript = messages.join('   ');
  const cta = await page.getByRole('button', { name: /Begin My Energy Clearing/i }).first().isVisible().catch(() => false);
  // 🔴 EXCLUDE the tarot card-art bubble. `message-card-art-*` is an IMAGE bubble —
  // the drawn card, painted as a cropped CSS background on a 112x187 div with no
  // text and no children — so a text-emptiness test flags it on every /fb-tarot
  // walk. Verified rendering correctly (background-image return-mhf-faces.png,
  // size 300% 100%) before excluding it, because "the card doesn't render" would be
  // a real bug and this check is the only thing that would have caught it.
  const emptyBubbles = await page.locator('[data-testid^="message-"]').evaluateAll((n) =>
    n.filter((x) => !(x.textContent || '').trim()
      && !(x.getAttribute('data-testid') || '').startsWith('message-card-art')).length);

  // full-page stitch, same trick audit-flow uses
  await page.evaluate(() => {
    const root = document.querySelector('.fixed.inset-0');
    if (root) { root.style.position = 'static'; root.style.height = 'auto'; root.style.overflow = 'visible'; }
    const col = document.querySelector('.max-w-lg');
    if (col) { col.style.height = 'auto'; col.style.maxHeight = 'none'; }
    const msgs = document.querySelector('[data-testid="container-chat-messages"]');
    if (msgs) { msgs.style.overflow = 'visible'; msgs.style.height = 'auto'; }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOT_DIR}/${arm}-full-conversation.png`, fullPage: true });

  await sampler.stop();
  const flagged = analyzeDeadAir(sampler.samples).filter((g) => g.seconds >= DEAD_AIR_FLAG_S);
  await page.close();
  await ctx.close();
  return { arm, reachedPitch, transcript, messages, cta, emptyBubbles, flagged, closeSeconds };
}

let pixelBlocked = 0;

async function main() {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
    console.error(`🔴 REFUSING to run against "${BASE}". Point LOCAL_BASE_URL at a localhost sandbox (see SKILL.md).`);
    process.exit(2);
  }
  if (SHOT_DIR.startsWith('audit-runs/')) rmSync(SHOT_DIR, { recursive: true, force: true });
  mkdirSync(SHOT_DIR, { recursive: true });
  console.log(`\nv1-funnel-audit — close depth  base=${BASE}\n`);

  const browser = await chromium.launch();

  console.log('  walking arm A (control)…');
  const a = await walk(browser, 'control');
  console.log(`  arm A: ${a.messages.length} bubbles, pitch=${a.reachedPitch}`);
  console.log('  walking arm B (deep)…');
  const b = await walk(browser, 'deep');
  console.log(`  arm B: ${b.messages.length} bubbles, pitch=${b.reachedPitch}`);

  await browser.close();

  // ── flow health, both arms
  for (const r of [a, b]) {
    const label = r.arm === 'deep' ? 'arm B (deep)' : 'arm A (control)';
    check(`${label} reached the pitch`, r.reachedPitch,
      r.reachedPitch ? `${r.closeSeconds ?? '?'}s from the permission click to the buy button` : 'never surfaced a checkout CTA');
    check(`${label} renders the checkout CTA`, r.cta);
    check(`${label} has no empty chat bubbles`, r.emptyBubbles === 0, r.emptyBubbles ? `${r.emptyBubbles} empty` : '');
    check(`${label} has no dead air ≥ ${DEAD_AIR_FLAG_S}s`, r.flagged.length === 0,
      r.flagged.map((g) => `${g.seconds}s after bubble ${g.afterBubble}`).join('; '));
  }

  // ── the arm itself
  const missingOnDeep = DEEP_ONLY.filter((s) => !b.transcript.includes(s));
  check('Arm B renders every new close-depth bubble', missingOnDeep.length === 0,
    missingOnDeep.length ? `missing ${missingOnDeep.length}/${DEEP_ONLY.length}: ${missingOnDeep.slice(0, 3).join(' | ')}` : `${DEEP_ONLY.length}/${DEEP_ONLY.length} present`);

  const leakedOnControl = DEEP_ONLY.filter((s) => a.transcript.includes(s));
  check('🔴 Arm A leaks NONE of the deep copy (ship-dark guarantee)', leakedOnControl.length === 0,
    leakedOnControl.length ? `LEAKED: ${leakedOnControl.join(' | ')}` : 'clean');

  const missingOnControl = CONTROL_CLOSE.filter((s) => !a.transcript.includes(s));
  check("Arm A's own eight close bubbles all survive", missingOnControl.length === 0,
    missingOnControl.length ? `missing: ${missingOnControl.join(' | ')}` : `${CONTROL_CLOSE.length}/${CONTROL_CLOSE.length} present`);

  check('Arm B replaces (not duplicates) the control ritual line',
    !b.transcript.includes(REPLACED_ON_DEEP),
    b.transcript.includes(REPLACED_ON_DEEP) ? 'both the control and deep ritual lines were sent' : '');

  check('Arm B is materially longer than arm A', b.messages.length > a.messages.length + 10,
    `arm A ${a.messages.length} bubbles vs arm B ${b.messages.length}`);

  check('🔒 No real Meta pixel/CAPI request escaped (all blocked)', true, `${pixelBlocked} request(s) aborted`);

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.length - passed;
  const line = (c) => `- ${c.pass ? '✅' : '🔴'} ${c.name}${c.detail ? `  — ${c.detail}` : ''}`;
  const report =
    `# v1-funnel-audit — close depth (v1_close_depth_2026)\n\n` +
    `Base: ${BASE}  ·  entry: \`${TAROT_ENTRY}\`  ·  ${passed}/${checks.length} checks passed` +
    `${failed ? `  ·  🔴 ${failed} FAILED` : '  ·  ✅ ALL PASS'}\n\n` +
    `Bubbles: arm A ${a.messages.length} · arm B ${b.messages.length}\n` +
    `Close dwell (permission click → buy button): arm A ${a.closeSeconds ?? '?'}s · arm B ${b.closeSeconds ?? '?'}s\n\n` +
    `## Checks\n${checks.map(line).join('\n')}\n\n` +
    `Screenshots: \`${SHOT_DIR}/\` (\`control-*\`, \`deep-*\`, + full-conversation per arm)\n`;
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(REPORT, report);
  console.log('\n' + report);
  console.log(`wrote ${REPORT}\n`);
  if (failed) process.exit(1);
}

main().catch((e) => { console.error('\n🔴 AUDIT DRIVER ERROR:', e.message); process.exit(2); });
