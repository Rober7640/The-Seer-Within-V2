// Render a daily sky-map to PNG to eyeball it. Usage: npx tsx scripts/_test-sky-map.ts 2026-06-29
import { writeFileSync } from 'fs';
import { chromium } from 'playwright';
import { getDailySky } from '../server/lib/astrologyEngine.ts';
import { planDay } from '../server/lib/dailySkyEditor.ts';
import { buildSkyMapSvg } from '../server/lib/lunaSkyMap.ts';

const date = process.argv[2] ?? '2026-06-29';
const sky = getDailySky(date);
const plan = planDay(date);
const head = plan.headlineAspect ? { planet1: plan.headlineAspect.planet1, planet2: plan.headlineAspect.planet2 } : null;
const svg = buildSkyMapSvg(sky, { headline: head });
writeFileSync('scripts/_sky-map-sample.svg', svg);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setContent(`<!doctype html><html><body style="margin:0;padding:0">${svg}</body></html>`);
const el = await page.$('svg');
const buf = await el!.screenshot({ omitBackground: true, type: 'png' });
writeFileSync('scripts/_sky-map-sample.png', buf);
await browser.close();

console.log(`${date}  headline: ${plan.headline}`);
console.log(`planets: ${sky.placements.filter(p => p.name !== 'North Node' && p.name !== 'South Node').map(p => `${p.name} ${p.degree}°${p.sign.slice(0,3)}`).join(', ')}`);
console.log(`wrote scripts/_sky-map-sample.png (${buf.length} bytes) + .svg`);
