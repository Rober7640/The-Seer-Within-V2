// Sliding-scale close flow eval: drive the ROOT /chat funnel through a real
// browser to pitch → 3 money objections → downsell fork, and produce:
//   • a word-for-word transcript (every bubble + CTA card verbatim)
//   • a DEAD-AIR audit (UI sampled every 400ms; quiet gap = no typing
//     indicator, no enabled input, no actionable button, no new bubble)
//   • an empty-bubble check
//   • per-turn screenshots + one stitched full-conversation PNG
//
//   node improve-v1/evidence/sliding-close/transcript-eval.mjs           → sliding (55-35, via ?close=55)
//   node improve-v1/evidence/sliding-close/transcript-eval.mjs control   → classic $35 close
//
// ISOLATION: ?noemail=1 — the email step is skipped, /api/lead never fires
// (also mocked defensively), no checkout is clicked. /api/chat LLM calls are
// REAL. With no email the server skips its variant overwrite, so the previewed
// 55-35 prices + variant id reach the objection prompt (arm-correct LLM turns).
// KNOWN DELTA vs live traffic: the email-anchor beats are absent.
//
// Driver is tolerant of variable LLM question counts: when the persona's
// scripted answers run out before the pitch, it continues with in-character
// fallback affirmations instead of dying (LLM turns sometimes ask one extra
// question).
//
// Requires the dev server on :5000 (npm run dev).
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5000';
const ARM = process.argv[2] === 'control' ? 'control' : 'sliding';
const OUT_DIR = 'improve-v1/evidence/sliding-close';
const SHOT_DIR = `${OUT_DIR}/flow-${ARM}`;
const OUT = `${OUT_DIR}/transcript-${ARM}.md`;

const DEAD_AIR_NOTE_S = 8;   // gaps ≥ this are listed as quiet gaps
const DEAD_AIR_FLAG_S = 25;  // gaps ≥ this are flagged ⚠ DEAD AIR

const PERSONA = {
  name: 'Claire',
  concern: "I've been divorced for two years and every man I meet seems to lose interest after a few weeks.",
  deeper: "It always starts wonderfully, then they pull away and I never understand what I did wrong.",
  future: 'A steady, honest man who stays — someone to build a calm life with.',
  feel: 'It would feel like I can finally stop bracing for the door to close.',
  source: 'Honestly, it might go back to my marriage — I spent years feeling invisible in it.',
  cost: "Two years of lonely weekends, and I've started believing something is wrong with me.",
};

// Typed turns after the bucket click (noemail ⇒ no email turn):
// name → concern(D1) → deeper(D2) → future → feel → source(crisis) → cost(crisis)
const ANSWERS = [PERSONA.name, PERSONA.concern, PERSONA.deeper, PERSONA.future, PERSONA.feel, PERSONA.source, PERSONA.cost];

// In-character continuations for any EXTRA question an LLM turn asks.
const FALLBACKS = [
  "Yes... that's exactly how it feels.",
  "You're right. I can feel that.",
  "I hadn't thought of it that way, but yes.",
  "That's true for me, honestly.",
];

// All three route through the generic objection path (checked against
// detectIntent): #1–#2 → LLM objection turns; #3 → the scripted downsell fork.
const OBJECTIONS = [
  "That's a lot of money for me right now",
  "I can't afford that right now",
  'Money is really tight this month',
];

async function transcribe(page) {
  return page.locator('[data-testid^="message-"]').evaluateAll((nodes) =>
    nodes.map((n) => ({
      type: (n.getAttribute('data-testid') || '').split('-')[1] || '?',
      text: (n.textContent || '').replace(/\s+/g, ' ').trim(),
    })));
}

// Snapshot every CTA-ish control currently visible, verbatim. If the sliding
// arm's choice card is up, capture the WHOLE card (checklist + eyebrows +
// buttons + microcopy) line by line instead of just button labels.
async function snapshotCtas(page) {
  const texts = [];
  const card = page.locator('[data-testid="clearing-choice-card"]');
  if (await card.isVisible().catch(() => false)) {
    const cardLines = await card.evaluate((root) => {
      const out = [];
      const walk = (el) => {
        for (const child of el.children) {
          if (child.children.length === 0 || child.tagName === 'LI') {
            const t = (child.textContent || '').replace(/\s+/g, ' ').trim();
            if (t) out.push(t);
          } else walk(child);
        }
      };
      walk(root);
      return out;
    });
    texts.push('CHOICE CARD ─ ' + cardLines.join(' │ '));
    return texts;
  }
  for (const loc of [
    page.getByRole('button', { name: /Begin My Energy Clearing/i }),
    page.locator('[data-testid="button-grace-offering"]'),
    page.getByRole('button', { name: /Get Your Written Reading/i }),
  ]) {
    for (const el of await loc.all()) {
      if (await el.isVisible().catch(() => false)) {
        const t = (await el.textContent() || '').replace(/\s+/g, ' ').trim();
        if (t && !texts.includes(t)) texts.push(t);
      }
    }
  }
  return texts;
}

// ---- Dead-air sampler: polls the UI every 400ms for the whole run.
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
      } catch { /* page busy/navigating — skip sample */ }
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
    if (idle) {
      if (start === null) { start = prev.t; atMsg = s.msgs; }
    } else close(s.t);
  }
  if (samples.length) close(samples[samples.length - 1].t);
  return gaps;
}

// Wait until the bot stops talking: input usable again, or a terminal control
// shows, or the message count is stable for a while.
async function waitForTurnEnd(page, { timeoutMs = 180000 } = {}) {
  const input = page.locator('[data-testid="input-chat-message"]');
  const perm = page.getByRole('button', { name: /Yes, please help me Evelyn/i });
  const bucket = page.getByRole('button', { name: /Love & Relationships/i });
  const cta = page.getByRole('button', { name: /Begin My Energy Clearing/i });
  const start = Date.now();
  let lastCount = -1;
  let stableSince = Date.now();
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
  mkdirSync(SHOT_DIR, { recursive: true });
  console.log(`Sliding-close flow eval — arm=${ARM} (root /chat, noemail; LLM turns real)\n`);

  const browser = await chromium.launch();
  // Mobile-first (the funnel's primary traffic).
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/api/lead', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
  await ctx.route('**/api/fb-event', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

  const page = await ctx.newPage();
  await page.goto(`${BASE}/chat?noemail=1${ARM === 'sliding' ? '&close=55' : ''}`, { waitUntil: 'domcontentloaded' });

  const sampler = startSampler(page);

  let shotN = 0;
  const snap = async (label) => {
    shotN += 1;
    const file = `${String(shotN).padStart(2, '0')}-${label}.png`;
    await page.screenshot({ path: `${SHOT_DIR}/${file}` });
    return file;
  };

  const events = []; // { afterIndex, label } — CTA snapshots merged into the transcript
  const note = async (label) => {
    const idx = await page.locator('[data-testid^="message-"]').count().catch(() => 0);
    events.push({ afterIndex: idx, label });
  };

  // ---- Phase A: greeting → pitch
  const queue = [...ANSWERS];
  let fallbackI = 0, typedTurns = 0;
  const input = page.locator('[data-testid="input-chat-message"]');
  for (let step = 0; step < 34; step++) {
    const state = await waitForTurnEnd(page);
    if (state === 'timeout') throw new Error(`stalled before pitch (answers left: ${queue.length})`);
    if (state === 'bucket') {
      await snap('bucket-choice');
      await page.getByRole('button', { name: /Love & Relationships/i }).click();
      continue;
    }
    if (state === 'perm') {
      await snap('permission-ask');
      await note('[BUTTON] Yes, please help me Evelyn!');
      await page.getByRole('button', { name: /Yes, please help me Evelyn/i }).click();
      continue;
    }
    if (state === 'pitch') break;
    if (typedTurns >= 16) throw new Error('too many typed turns before pitch — flow loop?');
    const answer = queue.length ? queue.shift() : FALLBACKS[fallbackI++ % FALLBACKS.length];
    typedTurns += 1;
    await snap(`turn-${typedTurns}`);
    await input.fill(answer);
    await input.press('Enter');
  }

  // Let the valueExplain close finish rendering, then snapshot the CTA stack
  // and capture the pitch moment (mobile + desktop).
  await waitForTurnEnd(page);
  for (const t of await snapshotCtas(page)) await note(`[CTA] ${t}`);
  await snap('pitch-card-mobile');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(500);
  await snap('pitch-card-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  // ---- Phase B: three money objections → downsell fork
  let objN = 0;
  for (const objection of OBJECTIONS) {
    objN += 1;
    await input.waitFor({ state: 'visible', timeout: 60000 });
    await input.fill(objection);
    await input.press('Enter');
    await waitForTurnEnd(page);
    await snap(`objection-${objN}`);
  }
  await page.waitForTimeout(1500);
  for (const t of await snapshotCtas(page)) await note(`[CTA after 3rd objection] ${t}`);
  await snap('downsell-fork');

  // ---- Audits
  await sampler.stop();
  const gaps = analyzeDeadAir(sampler.samples);
  const flagged = gaps.filter((g) => g.seconds >= DEAD_AIR_FLAG_S);
  const emptyBubbles = await page.locator('[data-testid^="message-"]').evaluateAll((nodes) =>
    nodes.filter((n) => !(n.textContent || '').trim()).length);

  // ---- Stitched full-conversation screenshot: un-clip the chat column so the
  // entire history renders, then fullPage-shoot it.
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

  // ---- Render word-for-word transcript
  const msgs = (await transcribe(page)).filter((m) => m.text);
  const lines = [];
  msgs.forEach((m, i) => {
    lines.push(
      m.type === 'user' ? `\n> **👤 USER:** ${m.text}\n`
      : m.type === 'system' ? `_${m.text}_`
      : `**Evelyn:** ${m.text}`);
    for (const e of events) if (e.afterIndex === i + 1) lines.push(`\n\`${e.label}\`\n`);
  });
  for (const e of events) if (e.afterIndex > msgs.length) lines.push(`\n\`${e.label}\`\n`);

  const gapLines = gaps.length
    ? gaps.map((g) => `- ${g.seconds}s quiet after bubble ${g.afterBubble}${g.seconds >= DEAD_AIR_FLAG_S ? ' ⚠ **DEAD AIR**' : ''}`).join('\n')
    : '- none ≥ ' + DEAD_AIR_NOTE_S + 's';

  const head =
    `# V1 close flow — ${ARM === 'sliding' ? 'SLIDING 55-35 arm ($55 anchor / $35 grace, choice card)' : 'CONTROL arm (classic $35 close)'}\n\n` +
    `Driven live through the root \`/chat\` funnel (real browser @390px, real LLM turns) on ${new Date().toISOString().slice(0, 10)}. ` +
    `Word for word — every bubble as rendered, CTAs inline at the moment they appeared.\n\n` +
    `**Dead-air audit** (quiet gap = no typing indicator, no enabled input, no actionable button, no new bubble; ` +
    `⚠ at ≥${DEAD_AIR_FLAG_S}s): **${flagged.length ? flagged.length + ' FLAGGED' : 'CLEAN'}**\n${gapLines}\n\n` +
    `**Empty bubbles:** ${emptyBubbles}\n\n` +
    `Screenshots: \`flow-${ARM}/\` (per-turn 01…${String(shotN).padStart(2, '0')} + \`full-conversation.png\`)\n\n` +
    `- Arm mechanics: \`?noemail=1${ARM === 'sliding' ? '&close=55' : ''}\` — no lead written anywhere; email-anchor beats absent (only delta vs live).\n` +
    `- LLM turns (vary per run): readings, future mirror, crisis, shadow summary, mystical close, objection replies #1–#2.\n` +
    `- Scripted turns (stable): greeting, bucket ack, ritual/deliverable framing, the honest-offering close, the grace fork, all CTAs.\n\n---\n\n`;

  writeFileSync(OUT, head + lines.join('\n') + '\n');
  console.log(head + lines.join('\n'));
  console.log(`\n${'='.repeat(60)}\nwrote ${OUT} (${msgs.length} bubbles) + ${shotN} screenshots + full-conversation.png in ${SHOT_DIR}/\nDead air: ${flagged.length ? flagged.length + ' FLAGGED ⚠' : 'CLEAN'} · empty bubbles: ${emptyBubbles}\n${'='.repeat(60)}`);

  await ctx.close();
  await browser.close();
}

main().catch((e) => { console.error('FLOW EVAL ERROR:', e.message); process.exit(1); });
