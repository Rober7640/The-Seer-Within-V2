// Real-browser transcription of the fb-palm Version-C flow, both arms.
// Drives PalmBridge → chat → pitch via Playwright and captures every bubble.
// Run: node improve-v1/evidence/pw-transcribe.mjs   (dev server on :5000)
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const BASE = 'http://localhost:5000';
const OUT = 'improve-v1/evidence';

// Same substantive answers both arms; the ONLY difference is that control re-asks
// the concern at DEEPENING_1 (the redundant loop) whereas woven skips that turn.
const C = {
  concern: "I'm 34 and all my friends are married with kids. I feel like I already missed my one chance at real love.",
  name: 'Sarah',
  email: 'sarah.pw@example.com',
  deeper: "Yes... I've been on so many dates but nothing ever becomes something real.",
  future: 'A partner who truly sees me. Building a home and a family together.',
  feel: "It would feel like I could finally breathe. Like I'm not broken after all.",
  source: "I don't know... maybe when my last relationship ended three years ago.",
  cost: "I'm not sure, it's so hard to put a price on it.",
};
// control asks the concern TWICE (PALM_REFLECT + DEEPENING_1); woven asks it once.
function answersFor(arm) {
  return arm === 'woven'
    ? [C.concern, C.name, C.email, C.deeper, C.future, C.feel, C.source, C.cost]
    : [C.concern, C.name, C.email, C.concern, C.deeper, C.future, C.feel, C.source, C.cost];
}

async function drive(page, answers) {
  const pitch = page.getByText(/Begin My Energy Clearing/i);
  const perm = page.getByRole('button', { name: /Yes, please help me Evelyn/i });
  const input = page.locator('[data-testid="input-chat-message"]');
  const queue = [...answers];

  for (let step = 0; step < 40; step++) {
    // Wait until one of: pitch CTA / permission button / input field is actionable.
    let state = null;
    for (let i = 0; i < 60; i++) {
      if (await pitch.isVisible().catch(() => false)) { state = 'pitch'; break; }
      if (await perm.isVisible().catch(() => false)) { state = 'perm'; break; }
      if (await input.isVisible().catch(() => false)) { state = 'input'; break; }
      await page.waitForTimeout(1000);
    }
    if (state === 'pitch' || state === null) break;
    if (state === 'perm') {
      await perm.click();
      // The pitch streams for ~50-60s (shadowSummary + static ritual + deliverables
      // + price + valueExplain, 2 API calls). Wait explicitly for the purchase CTA,
      // which renders only AFTER the full pitch (incl. the valueExplain close), so
      // the transcript captures every bubble.
      await pitch.waitFor({ state: 'visible', timeout: 150000 }).catch(() => {});
      await page.waitForTimeout(2500);
      break;
    }
    // state === 'input'
    if (!queue.length) break;
    await input.fill(queue.shift());
    await input.press('Enter');
    await input.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
  }
  await page.waitForTimeout(3500); // let the final pitch bubbles settle
}

async function transcribe(page) {
  return page.locator('[data-testid^="message-"]').evaluateAll((nodes) =>
    nodes
      .map((n) => {
        const tid = n.getAttribute('data-testid') || '';
        return { type: tid.split('-')[1] || '?', text: (n.textContent || '').replace(/\s+/g, ' ').trim() };
      })
      .filter((m) => m.text),
  );
}

async function runArm(browser, arm) {
  const ctx = await browser.newContext(); // fresh cookies/localStorage per arm
  const page = await ctx.newPage();
  await page.goto(`${BASE}/fb-palm/c?hook=soulmate-timing&thumb=a&clearing=${arm}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="palm-thumb-a"]').click();
  await page.waitForURL(/fb-palm\/chat/, { timeout: 20000 });
  const chatUrl = page.url();
  await page.locator('[data-testid="input-chat-message"]').waitFor({ state: 'visible', timeout: 25000 });
  await drive(page, answersFor(arm));
  const msgs = await transcribe(page);
  const reachedPitch = await page.getByText(/Begin My Energy Clearing/i).isVisible().catch(() => false);
  await ctx.close();
  return { arm, chatUrl, msgs, reachedPitch };
}

function toMd({ arm, chatUrl, msgs, reachedPitch }) {
  const bot = msgs.filter((m) => m.type === 'bot').length;
  const user = msgs.filter((m) => m.type === 'user').length;
  const clearHits = msgs.filter((m) => m.type === 'bot' && /clear(ed|ing)?\b/i.test(m.text)).length;
  const lines = msgs.map((m) => {
    if (m.type === 'user') return `\n> **👤 USER:** ${m.text}\n`;
    if (m.type === 'system') return `_${m.text}_`;
    return `**Evelyn:** ${m.text}`;
  });
  return `# fb-palm Version C — LIVE BROWSER transcript — arm: \`${arm}\`\n\n` +
    `Chat URL: \`${chatUrl}\`\n\n` +
    `**${user} user turns · ${bot} Evelyn messages · ${clearHits} bot messages containing "clear*" · reached pitch: ${reachedPitch}**\n\n---\n\n` +
    lines.join('\n') + '\n';
}

async function main() {
  const browser = await chromium.launch();
  const results = [];
  for (const arm of ['control', 'woven']) {
    process.stdout.write(`\n▶ driving arm: ${arm} ...`);
    const r = await runArm(browser, arm);
    writeFileSync(`${OUT}/pw-transcript-${arm}.md`, toMd(r));
    const clearHits = r.msgs.filter((m) => m.type === 'bot' && /clear(ed|ing)?\b/i.test(m.text)).length;
    process.stdout.write(` done — ${r.msgs.filter(m=>m.type==='bot').length} bot msgs, ${clearHits} "clear*", pitch=${r.reachedPitch}\n`);
    results.push(r);
  }
  await browser.close();

  console.log('\n' + '='.repeat(72));
  console.log('LIVE BROWSER — clearing-word count in bot messages (control vs woven)');
  for (const r of results) {
    const clearHits = r.msgs.filter((m) => m.type === 'bot' && /clear(ed|ing)?\b/i.test(m.text)).length;
    console.log(`  ${r.arm.padEnd(8)} → ${clearHits} bot msgs mention "clear*"   (pitch reached: ${r.reachedPitch})`);
  }
  console.log('Wrote pw-transcript-control.md and pw-transcript-woven.md');
  console.log('='.repeat(72));
}
main().catch((e) => { console.error('PW ERROR:', e.message); process.exit(1); });
