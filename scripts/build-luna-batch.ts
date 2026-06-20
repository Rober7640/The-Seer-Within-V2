// Batch runner: generate N days of send-ready Luna daily emails (template C, with a
// per-day sky map) into the outbox.
// Pipeline: day-picker -> content generator (Haiku) -> blurb rotation -> sky-map SVG
//           -> rasterize (Playwright) -> assembler (template C).
// Usage: npx tsx scripts/build-luna-batch.ts 2026-06-18 14
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { chromium } from 'playwright';
import { getDailySky } from '../server/lib/astrologyEngine.ts';
import { buildCalendar } from '../server/lib/dailySkyEditor.ts';
import { generateLunaDailyEmail } from '../server/lib/lunaContentGenerator.ts';
import { pickBlurb } from '../server/lib/lunaBlurbs.ts';
import { buildSkyMapSvg } from '../server/lib/lunaSkyMap.ts';
import { assembleEmail } from '../server/lib/lunaEmailAssembler.ts';
import { s3Configured, uploadPublicAsset } from '../server/lib/s3Upload.ts';

const start = process.argv[2] ?? '2026-06-18';
const days = process.argv[3] ? Number(process.argv[3]) : 14;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTBOX = path.resolve(__dirname, '../docs/kit/luna-voss-emails/outbox');
const IMGDIR = path.join(OUTBOX, 'img');
mkdirSync(IMGDIR, { recursive: true });

const MAJOR = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });

const calendar = buildCalendar(start, days);
const rows: string[] = [];
let lastBlurb: string | undefined;

for (let i = 0; i < calendar.length; i++) {
  const plan = calendar[i];
  const copy = await generateLunaDailyEmail(plan);
  const blurb = pickBlurb(plan.pillar, i, lastBlurb);
  lastBlurb = blurb.id;

  // Per-day sky map: SVG -> PNG (2x via Playwright)
  const sky = getDailySky(plan.date);
  const head = plan.headlineAspect ? { planet1: plan.headlineAspect.planet1, planet2: plan.headlineAspect.planet2 } : null;
  const svg = buildSkyMapSvg(sky, { headline: head });
  await page.setContent(`<!doctype html><html><body style="margin:0;padding:0">${svg}</body></html>`);
  const el = await page.$('svg');
  const png = await el!.screenshot({ omitBackground: true, type: 'png' });
  writeFileSync(path.join(IMGDIR, `${plan.date}.png`), png); // keep a local copy for preview

  // Publish the per-day sky map. When S3 is configured the email points at the
  // uploaded object; otherwise fall back to the theseerwithin.com path (host the
  // local PNG there out-of-band). Email images must be absolute, permanent URLs.
  const key = `luna/daily/${plan.date}.png`;
  const src = s3Configured()
    ? await uploadPublicAsset(key, png, 'image/png')
    : `https://theseerwithin.com/assets/luna/daily/${plan.date}.png`;

  // Wheel caption: headline aspect + major moon phase if any
  const ap = plan.headlineAspect;
  let caption = ap ? `${ap.planet1.toUpperCase()} ${ap.aspectSymbol} ${ap.planet2.toUpperCase()}` : "TODAY'S SKY";
  if (MAJOR.includes(plan.moonPhase.name)) caption += ` &middot; ${plan.moonPhase.name.toUpperCase()}`;
  const wheel = {
    src,
    alt: `The sky on ${plan.date}: ${plan.headline ?? 'the day’s planets and aspects'}.`,
    caption,
  };

  const email = assembleEmail(copy, blurb, plan, { template: 'C', wheel });
  writeFileSync(path.join(OUTBOX, `${plan.date}.html`), email.html);

  const subj = email.subject.replace(/\|/g, '\\|');
  rows.push(`| ${plan.date} | ${plan.pillar} | ${plan.headline ?? '—'} | ${subj} | ${blurb.id} | ${copy.source} | _pending_ |`);
  console.log(`✓ ${plan.date}  [${plan.pillar}]  ${blurb.id}  (${copy.source})  ${email.subject}`);
}

await browser.close();

const hostNote = s3Configured()
  ? `Each per-day sky map was **uploaded to S3** and the HTML already points at its public URL — nothing to host manually.`
  : `Paste-ready into a Kit broadcast: set the **Subject** from the table, paste \`<date>.html\` as the body, and **upload \`img/<date>.png\`** so the wheel resolves (the HTML points it at \`theseerwithin.com/assets/luna/daily/<date>.png\` — host it there, or set S3 env vars to auto-upload).`;
const openHostItem = s3Configured() ? '' : ', host the per-day wheel PNGs';

const index = `# Luna daily — outbox (${start}, ${days} days)

${days} send-ready emails, **template C (chart-wheel)** with a per-day **sky map** at \`img/<date>.png\`. ${hostNote}

**Before scheduling, run each through the \`persona-email-qa\` agent** — fill the QA column with its verdict. Open blockers must be fixed first.

| Date (ET) | Pillar | Headline | Subject | Blurb | Source | QA |
|---|---|---|---|---|---|---|
${rows.join('\n')}

_Open items before these can actually send: real CAN-SPAM address (task #7)${openHostItem}, deliverability SPF/DKIM/DMARC (task #9), Kit list/audience (task #6)._
`;
writeFileSync(path.join(OUTBOX, 'INDEX.md'), index);
console.log(`\nWrote ${calendar.length} emails + ${calendar.length} sky maps + INDEX.md → ${OUTBOX}`);
