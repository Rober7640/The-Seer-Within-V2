/**
 * UI capture harness — drives the REAL chat UI with Playwright and captures what a
 * human actually sees: rendered bubbles, per-turn wait times, empty messages, the
 * interactive card picker (and taps it). Exists because the eval harness calls
 * sendMessage() directly and auto-replies, so dead air, blank bubbles and tool-UI
 * states can never surface there — this was proven live twice (the held-breath
 * hang and the [TAROT_DRAW]-only empty bubble).
 *
 *   npx tsx scripts/ui-capture.ts --label <label>
 *   npx tsx scripts/ui-capture.ts --label <label> --scenarios <path.json>
 *     (JSON: [{ "name", "firstName", "turns": [..], "tapCard"? }, ...])
 *
 * Requires the dev server on :5000 (with the experiment force-listed for arm B).
 * Creates throwaway pw-ui-*@eval.internal users (one per scenario, re-rolled onto
 * variant B). Output: improve-v2/eval/ui-runs/<label>/transcript.md + shots/*.png
 * — synthetic conversations, no PII.
 */
import 'dotenv/config';
process.env.EXPERIMENT_FORCE_RUNNING = [process.env.EXPERIMENT_FORCE_RUNNING, 'persona_prompt_evelyn_2026']
  .filter(Boolean)
  .join(',');

import { chromium, Browser, Page } from '@playwright/test';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/lib/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { resolvePersonaPrompt } from '../server/lib/experiments';
import { hashPassword } from '../server/lib/auth';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://localhost:5000';
const EVELYN_ID = process.env.EVELYN_ID || '7353002e-866c-4c3d-9161-e110526f59f1';
const PASSWORD = 'PwUiTest2026!';
const TURN_TIMEOUT_MS = 120_000;
const SLOW_REPLY_MS = 45_000;

function arg(name: string, dflt: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
}

type Scenario = { name: string; firstName: string; turns: string[]; tapCard?: boolean };

const SCENARIOS: Scenario[] = [
  {
    name: 'anchor-verdict-thread',
    firstName: 'Petra',
    turns: [
      'I met someone new. Is this going somewhere?',
      'His name is Daniel',
      'ok so bottom line, is this going somewhere or not?',
      'just open the second thing now',
    ],
  },
  {
    name: 'card-ladder-tap',
    firstName: 'Yvonne',
    tapCard: true,
    turns: [
      "There's a woman I can't stop thinking about. Her name is Celeste. What do you see?",
      'hmm. can you look deeper?',
      'yes pull a card for me',
    ],
  },
];

async function makeArmBUser(email: string, firstName: string): Promise<void> {
  const passwordHash = await hashPassword(PASSWORD);
  for (let i = 0; i < 40; i++) {
    await db.delete(users).where(eq(users.email, email));
    const [u] = await db.insert(users).values({
      email, passwordHash, firstName,
      coinBalance: 60000, confirmed18Plus: true, emailVerified: true, accountStatus: 'active',
    }).returning({ id: users.id });
    const r = await resolvePersonaPrompt(u.id, EVELYN_ID, 'BASE');
    if (r.variant === 'B' && r.systemPrompt.length > 5000) return;
  }
  throw new Error(`could not roll ${email} onto variant B`);
}

async function clickIfVisible(page: Page, selector: string, timeoutMs = 4000): Promise<boolean> {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout: timeoutMs });
    await el.click();
    return true;
  } catch {
    return false;
  }
}

async function runScenario(browser: Browser, s: Scenario, outDir: string, lines: string[]): Promise<void> {
  const email = `pw-ui-${s.name}@eval.internal`.toLowerCase();
  await makeArmBUser(email, s.firstName);

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const shot = (tag: string) =>
    page.screenshot({ path: path.join(outDir, 'shots', `${s.name}-${tag}.png`), fullPage: false }).catch(() => {});

  lines.push(`\n## Scenario: ${s.name} (${email})\n`);
  try {
    // ── Login ──
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
    if (!page.url().includes('/reading')) await page.goto(`${BASE}/reading`, { waitUntil: 'domcontentloaded' });

    // ── Start a session with Evelyn ──
    // The browse page lists persona cards with "Start Chat" CTAs; Evelyn is the
    // featured/first guide. Clicking her NAME opens a profile modal — avoid it.
    const evelynCard = page.locator('div').filter({ hasText: 'Evelyn Cross' }).locator('button:has-text("Start Chat")');
    if ((await evelynCard.count()) > 0) {
      await evelynCard.first().click();
    } else {
      await clickIfVisible(page, 'button:has-text("Start Chat"), button:has-text("Start Reading")', 10_000);
    }
    // Pre-reading welcome / interstitials, if any
    await clickIfVisible(page, 'button:has-text("Begin Reading"), button:has-text("Begin"), button:has-text("Continue"), button:has-text("I\'m ready"), button:has-text("Start")', 5000);

    // ── Greeting ──
    const greeting = page.locator('[data-testid="chat-greeting"]');
    try {
      await greeting.waitFor({ state: 'visible', timeout: 45_000 });
      lines.push(`**GREETING:** ${(await greeting.innerText()).trim()}\n`);
    } catch {
      lines.push(`**GREETING:** ⚠ DEAD AIR — no greeting rendered within 45s\n`);
    }
    await shot('greeting');

    const assistants = page.locator('[data-testid="assistant-message"]');

    for (let t = 0; t < s.turns.length; t++) {
      const turn = s.turns[t];
      const before = await assistants.count();
      const input = page.locator('textarea[placeholder*="message" i], input[placeholder*="message" i], textarea').first();
      await input.fill(turn);
      await page.keyboard.press('Enter').catch(() => {});
      await clickIfVisible(page, 'button:has-text("Send")', 1500);
      lines.push(`**USER [${t + 1}/${s.turns.length}]:** ${turn}\n`);

      // Wait for a NEW assistant bubble to render
      const t0 = Date.now();
      let arrived = false;
      while (Date.now() - t0 < TURN_TIMEOUT_MS) {
        if ((await assistants.count()) > before) { arrived = true; break; }
        await page.waitForTimeout(500);
      }
      const waitMs = Date.now() - t0;

      if (!arrived) {
        lines.push(`**EVELYN:** ⚠ DEAD AIR — no reply rendered within ${Math.round(TURN_TIMEOUT_MS / 1000)}s\n`);
        await shot(`t${t + 1}-deadair`);
        continue;
      }
      // Let streaming/typing settle, then read the last bubble
      await page.waitForTimeout(1500);
      const text = (await assistants.last().innerText()).trim();
      const flags: string[] = [];
      if (!text) flags.push('⚠ EMPTY BUBBLE (dead air)');
      if (waitMs > SLOW_REPLY_MS) flags.push(`⚠ SLOW (${Math.round(waitMs / 1000)}s)`);
      const picker = page.locator('div.relative.cursor-pointer');
      const pickerVisible = (await picker.count()) > 0;
      if (pickerVisible) flags.push('🃏 card picker rendered');
      lines.push(`**EVELYN (${(waitMs / 1000).toFixed(1)}s${flags.length ? ' · ' + flags.join(' · ') : ''}):**\n${text || '(empty)'}\n`);
      await shot(`t${t + 1}`);

      // ── Tap the card if offered ──
      if (pickerVisible && s.tapCard) {
        const beforeTap = await assistants.count();
        await picker.first().click();
        lines.push(`**[tapped a card]**\n`);
        await shot(`t${t + 1}-tapped`);
        const t1 = Date.now();
        let interp = false;
        while (Date.now() - t1 < TURN_TIMEOUT_MS) {
          if ((await assistants.count()) > beforeTap) { interp = true; break; }
          await page.waitForTimeout(500);
        }
        if (interp) {
          await page.waitForTimeout(1500);
          const itext = (await assistants.last().innerText()).trim();
          lines.push(`**EVELYN (card interpretation, ${((Date.now() - t1) / 1000).toFixed(1)}s):**\n${itext || '(empty) ⚠ DEAD AIR'}\n`);
          await shot(`t${t + 1}-interpretation`);
        } else {
          lines.push(`**EVELYN:** ⚠ DEAD AIR after card tap — no interpretation within ${Math.round(TURN_TIMEOUT_MS / 1000)}s\n`);
          await shot(`t${t + 1}-interp-deadair`);
        }
      }
    }
  } catch (e: any) {
    lines.push(`\n⚠ SCENARIO ERROR: ${e.message}\n`);
    await shot('error');
  } finally {
    await ctx.close();
  }
}

async function main() {
  const label = arg('label', 'ui-capture');
  const scenarioFile = arg('scenarios', '');
  const scenarios: Scenario[] = scenarioFile
    ? JSON.parse(readFileSync(path.resolve(ROOT, scenarioFile), 'utf8'))
    : SCENARIOS;
  const outDir = path.join(ROOT, 'improve-v2/eval/ui-runs', label);
  mkdirSync(path.join(outDir, 'shots'), { recursive: true });

  const lines: string[] = [
    `# UI capture — ${label}`,
    `captured: ${new Date().toISOString()}   base: ${BASE}   scenarios: ${scenarios.length}${scenarioFile ? ` (${scenarioFile})` : ' (built-in)'}   turn timeout: ${TURN_TIMEOUT_MS / 1000}s`,
    `Flags: DEAD AIR = nothing rendered · EMPTY BUBBLE = message with no text · SLOW > ${SLOW_REPLY_MS / 1000}s`,
  ];

  const browser = await chromium.launch({ headless: true });
  for (const s of scenarios) {
    console.log(`scenario: ${s.name}...`);
    await runScenario(browser, s, outDir, lines);
  }
  await browser.close();

  const all = lines.join('\n');
  const count = (needle: string) => all.split(needle).length - 1;
  lines.push(
    `\n## Flag summary`,
    `- DEAD AIR: ${count('⚠ DEAD AIR')}`,
    `- EMPTY BUBBLE: ${count('⚠ EMPTY BUBBLE')}`,
    `- SLOW (> ${SLOW_REPLY_MS / 1000}s): ${count('⚠ SLOW')}`,
    `- scenario errors: ${count('SCENARIO ERROR')}`,
    `- card pickers rendered: ${count('🃏')}`,
  );

  writeFileSync(path.join(outDir, 'transcript.md'), lines.join('\n'));
  console.log(`\nTranscript → improve-v2/eval/ui-runs/${label}/transcript.md`);
  console.log(`Screens    → improve-v2/eval/ui-runs/${label}/shots/`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
