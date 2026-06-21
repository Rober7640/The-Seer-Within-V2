// Screenshot an assembled outbox email (full 600px column) to a PNG, for visual QA.
//   npx tsx scripts/_render-email.ts 2026-06-18   → outbox/_preview-2026-06-18.png
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const date = process.argv[2] ?? '2026-06-18';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTBOX = path.resolve(__dirname, '../docs/kit/luna-voss-emails/outbox');
const html = readFileSync(path.join(OUTBOX, `${date}.html`), 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 1200 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle' });
const out = path.join(OUTBOX, `_preview-${date}.png`);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`✓ wrote ${path.relative(process.cwd(), out)}`);
