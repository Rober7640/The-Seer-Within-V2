// v1-funnel-audit (palm) — two fb-palm-specific regression checks.
//
//   node .claude/skills/v1-funnel-audit/scripts/audit-palm.mjs
//
// 1) GUARD — email-lock (pass/fail, affects exit code):
//    On the palm woven flow the input must revert to type="text" AFTER the email step,
//    or the send button (a real form submit) is blocked by native email validation and
//    the user can only ever type an email. Regression proof:
//    improve-v1/evidence/email-lock/repro.mjs.
//
// 2) DIAGNOSTIC — identity-persist (informational, does NOT fail the run):
//    Does the palm identity survive past palmReflect into reading1/reading2/crisis?
//    This is a KNOWN-OPEN derail — the fix in improve-v1/04-fb-palm-derail-PROVEN.md §3
//    was designed but never shipped (prompts.ts has zero palm refs). Reported as a
//    finding; it flips to ✅ automatically once the fix lands. Reuses Joel's replay.
//
// LOCAL-ONLY + SAFE: facebook.com blocked, /api/lead mocked; /api/chat LLM real.
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.LOCAL_BASE_URL || 'http://localhost:5000';
const OUT_DIR = 'audit-runs/v1-funnel-audit/palm';
const PALM_URL = `${BASE}/chat?hook=is-he-true&thumb=a&sign=thumb&v=c&clearing=woven`;
const EMAIL = `palmtest+${Date.now().toString(36)}@example.com`;

const guards = [];        // affect exit code
const diags = [];         // informational only
const guard = (name, pass, detail = '') => guards.push({ name, pass: !!pass, detail });
const diag = (name, note) => diags.push({ name, note });

async function waitForTurnEnd(page, { timeoutMs = 180000 } = {}) {
  const input = page.locator('[data-testid="input-chat-message"]');
  const cta = page.getByRole('button', { name: /Begin My Energy Clearing/i });
  const start = Date.now();
  let lastCount = -1, stableSince = Date.now();
  while (Date.now() - start < timeoutMs) {
    const typing = await page.locator('[data-testid="indicator-typing"]').isVisible().catch(() => false);
    const count = await page.locator('[data-testid^="message-"]').count().catch(() => 0);
    if (count !== lastCount) { lastCount = count; stableSince = Date.now(); }
    if (!typing && Date.now() - stableSince > 4000) {
      if (await cta.first().isVisible().catch(() => false)) return 'pitch';
      if (await input.isVisible().catch(() => false) && await input.isEnabled().catch(() => false)) return 'input';
    }
    await page.waitForTimeout(500);
  }
  return 'timeout';
}

// ── PART 1: email-lock guard (browser, palm woven flow) ──────────────────────
async function emailLockGuard() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/(connect\.facebook\.net|facebook\.com|fbcdn\.net)/i, (r) => r.abort());
  await ctx.route('**/api/lead', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
  const page = await ctx.newPage();
  const input = () => page.locator('[data-testid="input-chat-message"]');

  // Send via the SEND BUTTON — a real form submit, exactly what a mobile user taps;
  // the bug only manifests on submit (native validation on a type="email" field).
  async function send(text) {
    const el = input();
    await el.fill(text);
    await page.locator('[data-testid="button-send-message"]').click();
    await page.waitForTimeout(800);
    if (await el.count() === 0) return { sent: true };            // input unmounted → went through
    const val = await el.inputValue().catch(() => '');
    const invalid = await el.evaluate((n) => !n.checkValidity()).catch(() => false);
    if (val === text && invalid) return { sent: false, msg: await el.evaluate((n) => n.validationMessage).catch(() => 'blocked') };
    return { sent: true };
  }

  try {
    await page.goto(PALM_URL, { waitUntil: 'domcontentloaded' });
    let emailDone = false, checked = false, emailStepType = null, steps = 0;
    while (steps++ < 16 && !checked) {
      const state = await waitForTurnEnd(page);
      if (state === 'timeout' || state === 'pitch') break;
      const ph = (await input().getAttribute('placeholder')) || '';
      const type = (await input().getAttribute('type')) || 'text';
      if (emailDone) {
        // The post-email step: input must be type="text" and a normal sentence must send.
        guard('Palm email-lock: input reverts to type="text" after the email step',
          type === 'text', `email-step type="${emailStepType}", post-email type="${type}"`);
        const res = await send('I am scared he is cheating and I do not know what to do');
        guard('Palm email-lock: a normal sentence sends after the email step (not blocked)',
          res.sent, res.sent ? '' : `blocked by native validation: "${res.msg}"`);
        checked = true;
        break;
      }
      if (/e-?mail/i.test(ph)) { emailStepType = type; await send(EMAIL); emailDone = true; }
      else if (/name/i.test(ph)) { await send('Nichole'); }
      else { await send('I think he has been lying to me and I feel it in my chest'); }
    }
    guard('Palm flow reached the email step', emailDone);
    guard('Palm flow reached the post-email step (guard could run)', checked);
    await page.screenshot({ path: `${OUT_DIR}/email-lock.png` }).catch(() => {});
  } catch (e) {
    guard('email-lock guard ran without a driver error', false, e.message);
  } finally {
    await ctx.close();
    await browser.close();
  }
}

// ── PART 2: identity-persist diagnostic (/api/chat replay) ───────────────────
const PALM_TOKENS = ['thumb', 'trident', 'gathering', 'palm', 'sign', 'mark', 'three lines', 'converging'];
const scan = (msgs) => PALM_TOKENS.filter((t) => msgs.join(' ').toLowerCase().includes(t));
async function chat(payload) {
  const r = await fetch(`${BASE}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error(`${payload.action} → HTTP ${r.status}`);
  return r.json();
}
async function derailDiagnostic() {
  try {
    const firstName = 'Sarah';
    const concern = "I'm 34 and every friend I have is married with kids. I keep feeling like I already missed my one chance and I'm going to end up alone.";
    const userData = { firstName, bucket: 'love', concern };
    const reflect = await chat({ action: 'palmReflect', palmSign: 'thumb', palmHook: 'soulmate-timing', palmThumb: 'a', input: concern, userData });
    const reading1 = await chat({ action: 'reading1', userData, input: concern });
    if (reading1.subBucket) userData.subBucket = reading1.subBucket;
    const reading2 = await chat({ action: 'reading2', userData, input: 'yes, that resonates' });
    const crisis = await chat({ action: 'crisisReveal', userData, input: 'a deep partnership, to feel truly seen' });

    const reflectHits = scan(reflect.messages);
    const laterHits = scan([...reading1.messages, ...reading2.messages, ...crisis.messages]);
    diag('palmReflect carries the palm identity', `tokens: ${reflectHits.join(', ') || 'none'}`);
    diag('reading1/reading2/crisis carry the palm identity', `tokens: ${laterHits.join(', ') || '— NONE —'}`);
    diag('VERDICT', laterHits.length
      ? '✅ identity PERSISTS past the opener (derail fix appears shipped)'
      : '🔴 DERAIL — palm identity drops after palmReflect. KNOWN-OPEN (fix: 04-fb-palm-derail-PROVEN.md §3, never shipped). Not a hard failure; flips green when the fix lands.');
  } catch (e) {
    diag('identity-persist diagnostic', `could not run (/api/chat contract may have changed): ${e.message}`);
  }
}

async function main() {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
    console.error(`🔴 REFUSING to run against "${BASE}". Point LOCAL_BASE_URL at a localhost sandbox.`);
    process.exit(2);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`\nv1-funnel-audit (palm) — base=${BASE}\n`);

  await emailLockGuard();
  await derailDiagnostic();

  const passed = guards.filter((g) => g.pass).length, failed = guards.length - passed;
  const report =
    `# v1-funnel-audit (palm) — fb-palm regressions\n\n` +
    `Base: ${BASE}\n\n## Guards (pass/fail)\n` +
    `${passed}/${guards.length} passed${failed ? ` · 🔴 ${failed} FAILED` : ' · ✅ ALL PASS'}\n\n` +
    guards.map((g) => `- ${g.pass ? '✅' : '🔴'} ${g.name}${g.detail ? `  — ${g.detail}` : ''}`).join('\n') +
    `\n\n## Diagnostics (informational — do not fail the run)\n` +
    diags.map((d) => `- ${d.name}: ${d.note}`).join('\n') + '\n';
  writeFileSync(`${OUT_DIR}/report.md`, report);
  console.log('\n' + report);
  console.log(`wrote ${OUT_DIR}/report.md\n`);
  if (failed) process.exit(1);
}

main().catch((e) => { console.error('\n🔴 PALM AUDIT ERROR:', e.message); process.exit(2); });
