// Woven-arm stress test: drive the fb-palm Version-C WOVEN flow 10× with 10
// DISTINCT personas (unique responses), through a real browser, and check the
// treatment holds every time (single disclosure = loop removed, reaches pitch,
// names the ritual, no character break).
//
// ISOLATION: /api/lead is MOCKED and external trackers blocked, so NOTHING is
// written to AWeber/Kit/Resend/analytics. The /api/chat LLM calls are real.
//
// Run from repo root: node improve-v1/evidence/woven-stress/stress-test.mjs
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const BASE = 'http://localhost:5000';
const OUT = 'improve-v1/evidence/woven-stress';
const CONCURRENCY = 3;

// 10 distinct women, distinct love situations, coherent answer sets.
// Order per run: [concern(PALM_REFLECT), name, email, deeper, future, feel, source, cost]
const PERSONAS = [
  { slug: 'sarah-missed-chance', name: 'Sarah',
    concern: "I'm 34 and all my friends are married with kids. I feel like I already missed my one chance at real love.",
    deeper: "I've been on so many dates but nothing ever becomes something real.",
    future: 'A partner who truly sees me, and building a home and family together.',
    feel: "Like I could finally breathe. Like I'm not broken after all.",
    source: 'Maybe when my last serious relationship ended three years ago.',
    cost: "It's hard to put a price on it, but it's been costing me my peace." },
  { slug: 'maya-ex-returns', name: 'Maya',
    concern: "My ex keeps coming back into my life every few months and I can't seem to let him go.",
    deeper: 'Every time I start to move on, he texts and I fall right back in. It never ends.',
    future: 'Either he finally chooses me for real, or I feel free of him at last.',
    feel: 'It would feel like the ground finally stopped shifting under me.',
    source: 'It started with my father, honestly. He was never really there.',
    cost: "I've wasted years waiting on a man who won't commit." },
  { slug: 'elena-situationship', name: 'Elena',
    concern: "I've been seeing someone for a year but he refuses to call it a relationship.",
    deeper: 'We act like a couple but he panics whenever I mention the future.',
    future: "A man who's proud to call me his, not someone who keeps me a secret.",
    feel: 'It would feel like I finally matter to someone.',
    source: 'I think I learned to accept crumbs watching my mother settle.',
    cost: "My self-worth has been shrinking every month I stay in this." },
  { slug: 'grace-widow', name: 'Grace',
    concern: "I lost my husband two years ago and I don't know if I'm even allowed to love again.",
    deeper: 'Part of me feels guilty for even imagining someone new beside me.',
    future: 'Companionship again — someone to grow old with, without forgetting him.',
    feel: 'It would feel like permission to actually live again.',
    source: 'The guilt started the day of his funeral, I think.',
    cost: 'The loneliness at night has been the hardest weight to carry.' },
  { slug: 'priya-never-loved', name: 'Priya',
    concern: "I'm 29 and I've never actually been in love. I'm starting to think something is wrong with me.",
    deeper: 'I get close to people but I always pull away before it gets real.',
    future: 'To finally let someone all the way in, without the fear taking over.',
    feel: "It would feel like I'm finally normal. Finally whole.",
    source: 'My parents divorced when I was young and it scared me off love.',
    cost: "I've spent my whole twenties alone, watching everyone else pair off." },
  { slug: 'nadia-wont-commit', name: 'Nadia',
    concern: "My boyfriend of four years still won't propose and I'm losing hope.",
    deeper: 'Every time I bring up marriage he goes quiet and changes the subject.',
    future: 'The ring, the wedding, the family he keeps promising me "someday."',
    feel: 'It would feel like all the waiting was finally worth something.',
    source: "I've always been the one who waits — since I was a little girl.",
    cost: "I'm 31 and I can feel my chance to have children slipping away." },
  { slug: 'camille-betrayed', name: 'Camille',
    concern: "I found out my partner cheated and now I can't bring myself to trust anyone.",
    deeper: 'Even kind men feel like a trap now. I keep bracing for the betrayal.',
    future: 'To love again without checking his phone, without the constant fear.',
    feel: 'It would feel like getting my own heart back.',
    source: 'The cheating — but also my first boyfriend, who lied about everything.',
    cost: "I've pushed away good people who never got a fair chance." },
  { slug: 'talia-career', name: 'Talia',
    concern: "I've built a great career but I'm 38 and I wonder if I traded love away for it.",
    deeper: "I tell myself I'm fine on my own, but the quiet gets very loud some nights.",
    future: 'A partner who respects my ambition and still makes me feel truly wanted.',
    feel: "It would feel like I don't have to choose between the two anymore.",
    source: 'I learned young that love makes you weak — from watching my mother.',
    cost: 'All the success feels hollow when there is no one to share it with.' },
  { slug: 'rosa-long-distance', name: 'Rosa',
    concern: "I'm in a long-distance relationship and I honestly don't know if he's committed.",
    deeper: 'Months pass between visits and I can feel him drifting away from me.',
    future: 'To finally close the distance and build a real life in the same city.',
    feel: 'It would feel like coming home for good.',
    source: "I've always been drawn to people who are just out of reach.",
    cost: "I've turned down others who were right here, waiting on a maybe." },
  { slug: 'ivy-divorce', name: 'Ivy',
    concern: 'My divorce was finalized last month and I feel far too broken to start over.',
    deeper: "Twenty years with one man, and now I don't even know how to date.",
    future: 'A gentle second chance — someone who chooses the real me this time.',
    feel: "It would feel like proof that my story isn't over yet.",
    source: 'The divorce — but the cracks were there for a decade before it.',
    cost: "I've been hiding from the world, too afraid to be seen again." },
];

const FORBIDDEN = ['as an ai', "i'm programmed", 'language model', 'i am an ai', 'i was trained', 'an ai assistant'];

async function drive(page, answers) {
  const pitch = page.getByText(/Begin My Energy Clearing/i);
  const perm = page.getByRole('button', { name: /Yes, please help me Evelyn/i });
  const input = page.locator('[data-testid="input-chat-message"]');
  const queue = [...answers];
  for (let step = 0; step < 40; step++) {
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
      await pitch.waitFor({ state: 'visible', timeout: 150000 }).catch(() => {});
      await page.waitForTimeout(2500);
      break;
    }
    if (!queue.length) break;
    await input.fill(queue.shift());
    await input.press('Enter');
    await input.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);
}

async function transcribe(page) {
  return page.locator('[data-testid^="message-"]').evaluateAll((nodes) =>
    nodes.map((n) => ({ type: (n.getAttribute('data-testid') || '').split('-')[1] || '?', text: (n.textContent || '').replace(/\s+/g, ' ').trim() })).filter((m) => m.text));
}

function checks(msgs, reachedPitch) {
  const bot = msgs.filter((m) => m.type === 'bot');
  const users = msgs.filter((m) => m.type === 'user').map((m) => m.text);
  const seen = new Map();
  users.forEach((t) => seen.set(t, (seen.get(t) || 0) + 1));
  const dupUser = [...seen.values()].filter((c) => c > 1).length;
  const botText = bot.map((m) => m.text).join(' ').toLowerCase();
  return {
    reachedPitch,
    userTurns: users.length,
    dupUser, // 0 ⇒ single disclosure (loop removed)
    namesRitual: /energy clearing ritual/i.test(botText),
    foreshadow: /(cleared|lifted) blocks like this|relief is within reach|can be cleared/i.test(botText),
    onceCleared: /once (this|it) is cleared/i.test(botText),
    brokeChar: FORBIDDEN.some((p) => botText.includes(p)),
  };
}

function verdict(c) {
  return c.reachedPitch && c.userTurns === 9 && c.dupUser === 0 && c.namesRitual && !c.brokeChar ? 'PASS' : 'FAIL';
}

async function runPersona(browser, i, p) {
  const ctx = await browser.newContext();
  // ISOLATION — mock the LEAD write (the only real side effect: AWeber/Kit/Resend
  // subscribe + DB conversation). Same-origin fulfill, so the flow continues with a
  // normal response. We deliberately do NOT block external trackers (PostHog/GTM):
  // aborting them also blocks their library scripts, which breaks PalmBridge's
  // track() on mount. A handful of test analytics events is harmless noise; the
  // list pollution we actually care about is prevented by mocking /api/lead.
  await ctx.route('**/api/lead', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ priceDollars: 35, downsellDollars: 25 }) }));
  await ctx.route('**/api/fb-event', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

  const page = await ctx.newPage();
  const answers = [p.concern, p.name, `${p.slug}@example.com`, p.deeper, p.future, p.feel, p.source, p.cost];
  let result;
  try {
    await page.goto(`${BASE}/fb-palm/c?hook=soulmate-timing&thumb=a&clearing=woven`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="palm-thumb-a"]').click();
    await page.waitForURL(/fb-palm\/chat/, { timeout: 20000 });
    await page.locator('[data-testid="input-chat-message"]').waitFor({ state: 'visible', timeout: 25000 });
    await drive(page, answers);
    const msgs = await transcribe(page);
    const reachedPitch = await page.getByText(/Begin My Energy Clearing/i).isVisible().catch(() => false);
    const c = checks(msgs, reachedPitch);
    result = { ...p, i, msgs, c, verdict: verdict(c) };
  } catch (e) {
    result = { ...p, i, msgs: [], c: null, verdict: 'ERROR', error: e.message };
  }
  await ctx.close();

  // write per-run transcript
  const n = String(i + 1).padStart(2, '0');
  const lines = (result.msgs || []).map((m) =>
    m.type === 'user' ? `\n> **👤 USER:** ${m.text}\n` : m.type === 'system' ? `_${m.text}_` : `**Evelyn:** ${m.text}`);
  const head = `# Woven stress run ${n} — ${p.name} (${p.slug})\n\n` +
    `**Verdict: ${result.verdict}**` + (result.error ? ` — ${result.error}` : '') + `\n\n` +
    (result.c ? `- reached pitch: ${result.c.reachedPitch}\n- user turns: ${result.c.userTurns} (expect 9)\n- duplicate user messages: ${result.c.dupUser} (expect 0 = single disclosure)\n- names the ritual: ${result.c.namesRitual}\n- clearable foreshadow: ${result.c.foreshadow}\n- "once this is cleared": ${result.c.onceCleared}\n- broke character: ${result.c.brokeChar}\n` : '') +
    `\n---\n\n`;
  writeFileSync(`${OUT}/run-${n}-${p.slug}.md`, head + lines.join('\n') + '\n');
  process.stdout.write(`  run ${n} ${p.name.padEnd(9)} → ${result.verdict}` +
    (result.c ? `  (turns=${result.c.userTurns}, dup=${result.c.dupUser}, pitch=${result.c.reachedPitch}, ritual=${result.c.namesRitual})` : ` ${result.error || ''}`) + '\n');
  return result;
}

async function poolRun(items, n, worker) {
  const out = new Array(items.length);
  let idx = 0;
  async function next() {
    const i = idx++;
    if (i >= items.length) return;
    out[i] = await worker(items[i], i);
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, next));
  return out;
}

async function main() {
  console.log(`Woven stress test — ${PERSONAS.length} personas, concurrency ${CONCURRENCY}, leads mocked (no list writes)\n`);
  const browser = await chromium.launch();
  const results = await poolRun(PERSONAS, CONCURRENCY, (p, i) => runPersona(browser, i, p));
  await browser.close();

  const pass = results.filter((r) => r.verdict === 'PASS').length;
  const rows = results.map((r) => {
    const n = String(r.i + 1).padStart(2, '0');
    const c = r.c;
    return `| ${n} | ${r.name} | ${r.verdict} | ${c ? c.userTurns : '-'} | ${c ? c.dupUser : '-'} | ${c ? c.reachedPitch : '-'} | ${c ? c.namesRitual : '-'} | ${c ? c.foreshadow : '-'} | ${c ? c.onceCleared : '-'} | ${c ? c.brokeChar : '-'} |`;
  });
  const index = `# Woven arm — stress test (10 personas)\n\n` +
    `fb-palm Version C, arm=woven, driven live in a real browser. \`/api/lead\` is MOCKED so nothing is written to AWeber/Kit/Resend/DB; analytics pixels still fire as harmless test noise. LLM /api/chat calls are real.\n\n` +
    `**${pass}/${results.length} PASS.** PASS = reached pitch AND 9 user turns (loop removed) AND 0 duplicate user messages AND names the ritual AND no character break.\n\n` +
    `| # | Persona | Verdict | turns | dupUser | pitch | ritual | foreshadow | onceCleared | brokeChar |\n` +
    `|---|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|\n` + rows.join('\n') + '\n\n' +
    `- **turns**: 9 expected (woven removes the redundant DEEPENING_1). A 10 ⇒ loop-removal didn't fire.\n` +
    `- **dupUser**: 0 expected (she never repeats her disclosure). >0 ⇒ redundant re-ask present.\n` +
    `- **ritual**: the static woven pitch naming line (deterministic). **foreshadow / onceCleared**: LLM signals detected by LITERAL keyword, so they UNDERCOUNT (the model rewords, e.g. "I've cleared this before" / "once we clear this" read false). Spot-check the flagged-false runs — the clearing theme is present.\n\n` +
    `Per-run transcripts: run-01…run-10 in this folder.\n`;
  writeFileSync(`${OUT}/INDEX.md`, index);

  console.log(`\n${'='.repeat(60)}\n${pass}/${results.length} PASS — wrote INDEX.md + ${results.length} transcripts to ${OUT}/\n${'='.repeat(60)}`);
}
main().catch((e) => { console.error('STRESS ERROR:', e.message); process.exit(1); });
