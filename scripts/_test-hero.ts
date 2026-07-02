// Render sample Luna hero images (aspect + moon-phase modes) to PNG for visual QA.
//   npx tsx scripts/_test-hero.ts   → writes to docs/kit/luna-voss-emails/outbox/_hero-samples/
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { getDailySky, type DailySky, type DailySkyAspect } from '../server/lib/astrologyEngine.ts';
import { buildHeroSvg, heroAlt } from '../server/lib/lunaHeroMap.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../docs/kit/luna-voss-emails/outbox/_hero-samples');
mkdirSync(OUT, { recursive: true });

const base = getDailySky('2026-06-18');
const asp = (p1: string, p2: string, type: string, sym: string, orb: number): DailySkyAspect =>
  ({ planet1: p1, planet2: p2, aspectType: type, aspectSymbol: sym, orb });
const withMoon = (s: DailySky, name: string, illum: number, elong: number): DailySky =>
  ({ ...s, moonPhase: { name, illumination: illum, elongation: elong } });

const cases: Array<{ slug: string; sky: DailySky; aspect: DailySkyAspect | null }> = [
  { slug: 'aspect-conjunction', sky: base, aspect: asp('Moon', 'Venus', 'Conjunction', '☌', 0.8) },
  { slug: 'aspect-square',      sky: base, aspect: asp('Moon', 'Mars', 'Square', '□', 2.3) },
  { slug: 'aspect-trine',       sky: base, aspect: asp('Sun', 'Jupiter', 'Trine', '△', 1.1) },
  { slug: 'aspect-opposition',  sky: base, aspect: asp('Sun', 'Saturn', 'Opposition', '☍', 3.4) },
  { slug: 'moon-new',           sky: withMoon(base, 'New Moon', 3, 8),            aspect: null },
  { slug: 'moon-wax-crescent',  sky: withMoon(base, 'Waxing Crescent', 22, 52),  aspect: null },
  { slug: 'moon-first-quarter', sky: withMoon(base, 'First Quarter', 50, 90),    aspect: null },
  { slug: 'moon-wax-gibbous',   sky: withMoon(base, 'Waxing Gibbous', 76, 128),  aspect: null },
  { slug: 'moon-full',          sky: withMoon(base, 'Full Moon', 99, 178),       aspect: null },
  { slug: 'moon-wane-gibbous',  sky: withMoon(base, 'Waning Gibbous', 74, 232),  aspect: null },
  { slug: 'moon-last-quarter',  sky: withMoon(base, 'Last Quarter', 50, 270),    aspect: null },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
for (const c of cases) {
  const svg = buildHeroSvg(c.sky, { headlineAspect: c.aspect });
  await page.setContent(`<!doctype html><html><body style="margin:0;padding:0">${svg}</body></html>`);
  const el = await page.$('svg');
  const png = await el!.screenshot({ type: 'png' });
  writeFileSync(path.join(OUT, `${c.slug}.png`), png);
  console.log(`✓ ${c.slug}  alt="${heroAlt(c.sky, { headlineAspect: c.aspect })}"`);
}
await browser.close();
console.log(`\nWrote ${cases.length} samples → ${path.relative(process.cwd(), OUT)}`);
