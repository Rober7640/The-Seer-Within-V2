// Render a finished outbox email to PNG (local image srcs) so we can eyeball it.
// Writes a temp preview HTML into the outbox and navigates to it (file:// sub-resources
// only load from a real file page, not setContent's about:blank).
// Usage: npx tsx scripts/_preview-email.ts 2026-06-18
import { readFileSync, writeFileSync, rmSync } from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const date = process.argv[2] ?? '2026-06-18';
const kit = path.resolve('.', 'docs/kit/luna-voss-emails');
let html = readFileSync(`${kit}/outbox/${date}.html`, 'utf8');

// Point images at paths relative to the outbox (where the temp file lives).
html = html.split(`https://theseerwithin.com/assets/luna/daily/${date}.png`).join(`img/${date}.png`);
html = html.split('https://theseerwithin.com/assets/luna/luna-avatar.jpg').join('../assets/luna-avatar.jpg');

const tmp = `${kit}/outbox/_preview-${date}.html`;
writeFileSync(tmp, html);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 660, height: 1400 } });
await page.goto('file://' + encodeURI(tmp), { waitUntil: 'load' });
const buf = await page.screenshot({ fullPage: true });
writeFileSync(`scripts/_email-preview-${date}.png`, buf);
await browser.close();
rmSync(tmp);
console.log(`wrote scripts/_email-preview-${date}.png (${buf.length} bytes)`);
