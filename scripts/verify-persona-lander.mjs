// Verifies the generalized persona lander (Phase 1) on local (dev server :5000).
// For each of the 4 personas: /start returns persona info + an in-voice opener,
// /turn returns a Haiku reply (or in-voice fallback), and the page renders the name.
//
// Run: node scripts/verify-persona-lander.mjs

import { chromium } from 'playwright';
const BASE = 'http://localhost:5000';

const PERSONAS = [
  { slug: 'marcus-stone', route: '/marcus', name: 'Marcus Stone', voice: /card|spread|threshold|shadow|Marcus/i },
  { slug: 'luna-voss',    route: '/luna',   name: 'Luna Voss',    voice: /chart|placement|transit|Venus|Luna/i },
  { slug: 'nova-sharma',  route: '/nova',   name: 'Nova Sharma',  voice: /karma|cycle|dasha|chart|Nova|Jyotish/i },
  { slug: 'maren-soleil', route: '/maren',  name: 'Maren Soleil', voice: /cord|heart|energy|feel|Maren/i },
];

let fail = 0;
const ok = (n, c, x) => { c ? console.log(`✓ ${n}`) : (fail++, console.error(`✗ ${n}`, x ?? '')); };

async function start(slug, bucket) {
  const r = await fetch(`${BASE}/api/persona-lander/${slug}/start`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: `verify-${slug}-${bucket}-aaaaaaaa`, bucket }),
  });
  return { status: r.status, body: await r.json() };
}
async function turn(slug, token, msg, history) {
  const r = await fetch(`${BASE}/api/persona-lander/${slug}/turn`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: token, userMessage: msg, history }),
  });
  return { status: r.status, body: await r.json() };
}

(async () => {
  // Unknown persona is rejected.
  const unknown = await start('nobody-here', 'love');
  ok('unknown persona → 404', unknown.status === 404, unknown.status);

  const browser = await chromium.launch();

  for (const p of PERSONAS) {
    const token = `verify-${p.slug}-love-aaaaaaaa`;
    // /start
    const s = await start(p.slug, 'love');
    ok(`${p.name}: /start 200 + persona info`, s.status === 200 && s.body?.persona?.displayName === p.name, s.body?.persona);
    ok(`${p.name}: opener is non-empty`, typeof s.body?.opener === 'string' && s.body.opener.length > 10, s.body?.opener);
    ok(`${p.name}: opener in voice`, p.voice.test(s.body?.opener || ''), s.body?.opener);

    // /turn (Haiku or in-voice fallback — either is a pass for wiring)
    const opener = s.body.opener;
    const t = await turn(p.slug, token, 'I keep losing people I love and I do not know why.', [{ role: 'assistant', content: opener }]);
    ok(`${p.name}: /turn 200 + reply`, t.status === 200 && typeof t.body?.reply === 'string' && t.body.reply.length > 5, t.body);
    ok(`${p.name}: turn1 ctaReady=false`, t.body?.ctaReady === false, t.body?.ctaReady);

    // 2nd turn → ctaReady true (hard cap)
    const t2 = await turn(p.slug, token, 'It is one person specifically.', [
      { role: 'assistant', content: opener }, { role: 'user', content: 'msg1' }, { role: 'assistant', content: t.body.reply },
    ]);
    ok(`${p.name}: turn2 ctaReady=true`, t2.body?.ctaReady === true, t2.body);

    // 3rd turn → capped
    const t3 = await turn(p.slug, token, 'one more', []);
    ok(`${p.name}: turn3 blocked=cap`, t3.body?.blocked === 'cap', t3.body);

    // Render the page
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}${p.route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const txt = await page.innerText('body');
    ok(`${p.route} renders persona name`, txt.includes(p.name), txt.slice(0, 120));
    await ctx.close();
  }

  await browser.close();
  console.log(`\n=== ${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' FAILED'} ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
