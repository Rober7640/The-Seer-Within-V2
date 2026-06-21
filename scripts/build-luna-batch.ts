// Batch runner: generate N days of send-ready Luna daily emails into the outbox.
// Template (4th arg) selects the layout + per-day image:
//   C (default) chart-wheel sky map · B visual-feature hero · A text-light (no image)
//   MIX assigns per day: B on major moon phases, A on a light rotation, C otherwise.
// Hero mode (5th arg, template B / B-days only): auto (default — aspect when there's a
//   headline aspect, else moon disc) · aspect · moon (force the moon-phase disc).
// Outputs: outbox/<date>.html, outbox/img/<date>(.png|-hero.png), outbox/INDEX.md, and
//   outbox/manifest.json (machine-readable: date, template, subject, preheader, …) — the
//   draft step (scripts/push-batch-to-kit.ts) reads the manifest for exact subjects.
// Usage: npx tsx scripts/build-luna-batch.ts 2026-06-20 30 [A|B|C|MIX] [auto|aspect|moon]
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { chromium, type Page } from 'playwright';
import { getDailySky, type DailySky } from '../server/lib/astrologyEngine.ts';
import { buildCalendar } from '../server/lib/dailySkyEditor.ts';
import type { DayPlan } from '../server/lib/dailySkyEditor.ts';
import { generateLunaDailyEmail } from '../server/lib/lunaContentGenerator.ts';
import { pickBlurb } from '../server/lib/lunaBlurbs.ts';
import { buildSkyMapSvg } from '../server/lib/lunaSkyMap.ts';
import { buildHeroSvg, heroAlt } from '../server/lib/lunaHeroMap.ts';
import { assembleEmail, type AssembleOpts } from '../server/lib/lunaEmailAssembler.ts';
import { s3Configured, uploadPublicAsset } from '../server/lib/s3Upload.ts';

const start = process.argv[2] ?? '2026-06-20';
const days = process.argv[3] ? Number(process.argv[3]) : 14;
const template = (process.argv[4] ?? 'C').toUpperCase() as 'A' | 'B' | 'C' | 'MIX';
if (!['A', 'B', 'C', 'MIX'].includes(template)) {
  console.error(`❌ template must be A, B, C or MIX (got "${template}")`);
  process.exit(1);
}
const heroMode = (process.argv[5] ?? 'auto').toLowerCase() as 'auto' | 'aspect' | 'moon';
if (heroMode !== 'auto' && heroMode !== 'aspect' && heroMode !== 'moon') {
  console.error(`❌ hero mode must be auto, aspect or moon (got "${heroMode}")`);
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTBOX = path.resolve(__dirname, '../docs/kit/luna-voss-emails/outbox');
const IMGDIR = path.join(OUTBOX, 'img');
mkdirSync(IMGDIR, { recursive: true });

const MAJOR = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'];

/** MIX assignment: B on the marquee moon-phase days, A on a light rotation, C otherwise. */
function pickDayTemplate(plan: DayPlan, i: number): 'A' | 'B' | 'C' {
  if (template !== 'MIX') return template;
  if (MAJOR.includes(plan.moonPhase.name)) return 'B';
  if (i % 5 === 4) return 'A';
  return 'C';
}

/** Render + (S3-)publish the per-day image for a day's template; returns assemble opts. */
async function buildDayImage(dayTpl: 'A' | 'B' | 'C', plan: DayPlan, sky: DailySky, page: Page): Promise<AssembleOpts> {
  const opts: AssembleOpts = { template: dayTpl };
  if (dayTpl === 'C') {
    const head = plan.headlineAspect ? { planet1: plan.headlineAspect.planet1, planet2: plan.headlineAspect.planet2 } : null;
    const svg = buildSkyMapSvg(sky, { headline: head });
    await page.setContent(`<!doctype html><html><body style="margin:0;padding:0">${svg}</body></html>`);
    const png = await (await page.$('svg'))!.screenshot({ omitBackground: true, type: 'png' });
    writeFileSync(path.join(IMGDIR, `${plan.date}.png`), png);
    const src = s3Configured()
      ? await uploadPublicAsset(`luna/daily/${plan.date}.png`, png, 'image/png')
      : `https://theseerwithin.com/assets/luna/daily/${plan.date}.png`;
    const ap = plan.headlineAspect;
    let caption = ap ? `${ap.planet1.toUpperCase()} ${ap.aspectSymbol} ${ap.planet2.toUpperCase()}` : "TODAY'S SKY";
    if (MAJOR.includes(plan.moonPhase.name)) caption += ` &middot; ${plan.moonPhase.name.toUpperCase()}`;
    opts.wheel = { src, alt: `The sky on ${plan.date}: ${plan.headline ?? 'the day’s planets and aspects'}.`, caption };
  } else if (dayTpl === 'B') {
    // `moon` forces the moon-phase disc; otherwise use the day's headline aspect
    // (the smart hero falls back to the moon disc on its own when there's none).
    const heroAspect = heroMode === 'moon' ? null : plan.headlineAspect;
    const svg = buildHeroSvg(sky, { headlineAspect: heroAspect });
    await page.setContent(`<!doctype html><html><body style="margin:0;padding:0">${svg}</body></html>`);
    const png = await (await page.$('svg'))!.screenshot({ type: 'png' });
    writeFileSync(path.join(IMGDIR, `${plan.date}-hero.png`), png);
    const src = s3Configured()
      ? await uploadPublicAsset(`luna/hero/${plan.date}.png`, png, 'image/png')
      : `https://theseerwithin.com/assets/luna/hero/${plan.date}.png`;
    opts.hero = { src, alt: heroAlt(sky, { headlineAspect: heroAspect }) };
  }
  return opts;
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });

const calendar = buildCalendar(start, days);
const rows: string[] = [];
const manifest: any[] = [];
const tplCount: Record<string, number> = { A: 0, B: 0, C: 0 };
let lastBlurb: string | undefined;

for (let i = 0; i < calendar.length; i++) {
  const plan = calendar[i];
  const dayTpl = pickDayTemplate(plan, i);
  tplCount[dayTpl]++;

  const copy = await generateLunaDailyEmail(plan);
  const blurb = pickBlurb(plan.pillar, i, lastBlurb);
  lastBlurb = blurb.id;

  const sky = getDailySky(plan.date);
  const imgOpts = await buildDayImage(dayTpl, plan, sky, page);

  const email = assembleEmail(copy, blurb, plan, imgOpts);
  writeFileSync(path.join(OUTBOX, `${plan.date}.html`), email.html);

  const subj = email.subject.replace(/\|/g, '\\|');
  rows.push(`| ${plan.date} | ${dayTpl} | ${plan.pillar} | ${plan.headline ?? '—'} | ${subj} | ${blurb.id} | ${copy.source} | _pending_ |`);
  manifest.push({
    date: plan.date,
    template: dayTpl,
    subject: email.subject,          // still contains {firstName}; draft step converts it
    preheader: email.preheader,
    pillar: plan.pillar,
    headline: plan.headline,
    blurbId: blurb.id,
    source: copy.source,
    image: imgOpts.wheel?.src ?? imgOpts.hero?.src ?? null,
  });
  console.log(`✓ ${plan.date}  [${dayTpl}]  ${plan.pillar}  ${blurb.id}  (${copy.source})  ${email.subject}`);
}

await browser.close();

writeFileSync(path.join(OUTBOX, 'manifest.json'), JSON.stringify(manifest, null, 2));

const TPL_LABEL: Record<string, string> = {
  A: 'template A (text-light, no per-day image)',
  B: 'template B (visual-feature hero)',
  C: 'template C (chart-wheel)',
  MIX: `mixed templates (C ${tplCount.C} · B ${tplCount.B} · A ${tplCount.A})`,
};
const hostNote = s3Configured()
  ? `Per-day images (sky maps for C-days, heroes for B-days; A-days have none) were **uploaded to S3** — the HTML already points at public URLs, nothing to host manually.`
  : `Host each per-day image under \`theseerwithin.com/assets/luna/{daily,hero}/<date>.png\` (or set S3 env vars to auto-upload).`;

const index = `# Luna daily — outbox (${start}, ${days} days)

${days} send-ready emails, **${TPL_LABEL[template]}**. ${hostNote}

**Before scheduling, run each through the \`persona-email-qa\` agent** — fill the QA column with its verdict. Open blockers must be fixed first. Subjects + per-day metadata are also in \`manifest.json\` (used by \`scripts/push-batch-to-kit.ts\`).

| Date (ET) | Tpl | Pillar | Headline | Subject | Blurb | Source | QA |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}

_Open items before these can actually send: real CAN-SPAM address (task #7), Luna-branded verified sender, audience/Kit list (task #6), deliverability SPF/DKIM/DMARC (task #9)._
`;
writeFileSync(path.join(OUTBOX, 'INDEX.md'), index);
console.log(`\nWrote ${calendar.length} emails + INDEX.md + manifest.json → ${OUTBOX}`);
console.log(`Template mix → C:${tplCount.C}  B:${tplCount.B}  A:${tplCount.A}`);
