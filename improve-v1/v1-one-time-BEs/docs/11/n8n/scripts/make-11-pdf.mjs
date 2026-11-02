/**
 * Turn a saved node-10 HTML into a PDF on this machine, with no PDFShift and no Supabase.
 *
 *   node scripts/make-11-pdf.mjs [--from chain-diane | --from 11-run-<id>]
 *   → runs/<base>.pdf
 *
 * The HTML is node 10's exact output. PDFShift is hosted headless Chrome, so rendering it here
 * at node 11's settings shows what a buyer gets. It does not test PDFShift's own quirks.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { RUNS, REPO } from './lib-11.mjs';

const { chromium } = createRequire(path.join(REPO, 'package.json'))('playwright');
const base = process.argv.includes('--from') ? process.argv[process.argv.indexOf('--from') + 1] : 'chain-diane';
const html = fs.readFileSync(path.join(RUNS, `${base}.html`), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
const failed = [];
page.on('requestfailed', (r) => failed.push(r.url()));
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
await page.setContent(html, { waitUntil: 'networkidle' });
const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
const pdf = path.join(RUNS, `${base}.pdf`);
// Node 11 sends: format Letter, margin 0, use_print true.
await page.pdf({ path: pdf, format: 'Letter', margin: { top: 0, right: 0, bottom: 0, left: 0 }, printBackground: true });
await browser.close();
const pages = (fs.readFileSync(pdf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`\n  ${pdf}`);
console.log(`    ${(fs.statSync(pdf).size / 1024).toFixed(0)}KB, ${pages} pages, ${(html.match(/<img /g) || []).length} images`);
console.log(`    images broken:   ${broken.length ? broken.join(', ') : 'none'}`);
console.log(`    requests failed: ${failed.length ? failed.join(', ') : 'none'}\n`);
process.exit(broken.length || failed.length ? 1 : 0);
