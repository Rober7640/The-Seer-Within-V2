// Regenerate specific days (after a generator/engine fix) and UPDATE their existing Kit
// drafts in place — no new drafts. Each date keeps its original template (from
// kit-drafts.json). Re-renders + re-uploads the per-day image, rewrites <date>.html, and
// PUTs the corrected subject/content/preview to the broadcast id on record.
//   npx tsx scripts/regen-days.ts 2026-07-13 2026-07-06 2026-06-30 ...
import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { getDailySky } from '../server/lib/astrologyEngine.ts';
import { planDay } from '../server/lib/dailySkyEditor.ts';
import { generateLunaDailyEmail } from '../server/lib/lunaContentGenerator.ts';
import { pickBlurb } from '../server/lib/lunaBlurbs.ts';
import { buildSkyMapSvg } from '../server/lib/lunaSkyMap.ts';
import { buildHeroSvg, heroAlt } from '../server/lib/lunaHeroMap.ts';
import { assembleEmail, type AssembleOpts } from '../server/lib/lunaEmailAssembler.ts';
import { s3Configured, uploadPublicAsset } from '../server/lib/s3Upload.ts';

const key = process.env.KIT_API_KEY;
if (!key) { console.error('❌ KIT_API_KEY not set'); process.exit(1); }
const dates = process.argv.slice(2);
if (!dates.length) { console.error('usage: regen-days.ts <date> [date...]'); process.exit(1); }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTBOX = path.resolve(__dirname, '../docs/kit/luna-voss-emails/outbox');
const IMGDIR = path.join(OUTBOX, 'img');
const draftsFile = path.join(OUTBOX, 'kit-drafts.json');
const drafts: Record<string, any> = JSON.parse(readFileSync(draftsFile, 'utf8'));
const MAJOR = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'];
const KIT_FN = '{{ subscriber.first_name | default: "friend" }}';

function addDay(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
let ok = 0, fail = 0;

for (const date of dates) {
  const rec = drafts[date];
  if (!rec?.id) { console.error(`  ✗ ${date}  (no draft id on record — skipping)`); fail++; continue; }
  const tpl = rec.template as 'A' | 'B' | 'C';

  const plan = planDay(date, getDailySky(addDay(date, -1)));   // prev sky → station + exact-phase context
  const sky = getDailySky(date);
  const copy = await generateLunaDailyEmail(plan);
  const blurb = pickBlurb(plan.pillar, 0);

  const imgOpts: AssembleOpts = { template: tpl };
  if (tpl === 'C') {
    const head = plan.headlineAspect ? { planet1: plan.headlineAspect.planet1, planet2: plan.headlineAspect.planet2 } : null;
    const svg = buildSkyMapSvg(sky, { headline: head });
    await page.setContent(`<!doctype html><html><body style="margin:0;padding:0">${svg}</body></html>`);
    const png = await (await page.$('svg'))!.screenshot({ omitBackground: true, type: 'png' });
    writeFileSync(path.join(IMGDIR, `${date}.png`), png);
    const src = s3Configured() ? await uploadPublicAsset(`luna/daily/${date}.png`, png, 'image/png') : `https://theseerwithin.com/assets/luna/daily/${date}.png`;
    const ap = plan.headlineAspect;
    let caption = ap ? `${ap.planet1.toUpperCase()} ${ap.aspectSymbol} ${ap.planet2.toUpperCase()}` : "TODAY'S SKY";
    if (MAJOR.includes(plan.moonPhase.name)) caption += ` &middot; ${plan.moonPhase.name.toUpperCase()}`;
    imgOpts.wheel = { src, alt: `The sky on ${date}: ${plan.headline ?? 'the day’s planets and aspects'}.`, caption };
  } else if (tpl === 'B') {
    const svg = buildHeroSvg(sky, { headlineAspect: plan.headlineAspect });
    await page.setContent(`<!doctype html><html><body style="margin:0;padding:0">${svg}</body></html>`);
    const png = await (await page.$('svg'))!.screenshot({ type: 'png' });
    writeFileSync(path.join(IMGDIR, `${date}-hero.png`), png);
    const src = s3Configured() ? await uploadPublicAsset(`luna/hero/${date}.png`, png, 'image/png') : `https://theseerwithin.com/assets/luna/hero/${date}.png`;
    imgOpts.hero = { src, alt: heroAlt(sky, { headlineAspect: plan.headlineAspect }) };
  }

  const email = assembleEmail(copy, blurb, plan, imgOpts);
  writeFileSync(path.join(OUTBOX, `${date}.html`), email.html);
  const subject = email.subject.split('{firstName}').join(KIT_FN);

  const res = await fetch(`https://api.kit.com/v4/broadcasts/${rec.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key },
    body: JSON.stringify({ subject, content: email.html, preview_text: email.preheader, public: false, send_at: null }),
  });
  const data: any = await res.json().catch(() => null);
  if (res.ok && data?.broadcast?.id) {
    drafts[date].subject = subject;
    drafts[date].template = tpl;
    console.log(`  ✓ ${date}  [${tpl}]  draft ${rec.id} updated  ·  ${email.subject}`);
    ok++;
  } else {
    console.error(`  ✗ ${date}  HTTP ${res.status}  ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    fail++;
  }
}

await browser.close();
writeFileSync(draftsFile, JSON.stringify(drafts, null, 2));
console.log(`\nRegenerated ${ok} day(s), ${fail} failed.`);
