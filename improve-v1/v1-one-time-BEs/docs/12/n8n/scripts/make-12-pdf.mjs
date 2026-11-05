/**
 * Turn a saved node-10 HTML into a PDF on this machine, with no PDFShift and no Supabase.
 *
 *   node scripts/make-12-pdf.mjs [--from <path to .html>] [--png 1,2,5]
 *   default: runs/12-handwritten-testina/12-handwritten-testina-NOT-A-MODEL-RUN.html
 *   → the same path with .pdf (and page-N.png for each --png page)
 *
 * The HTML is node 10's exact output (check-12-chain.mjs saves it). PDFShift is hosted headless
 * Chrome, so rendering it here at node 11's settings shows what a buyer gets. It does not test
 * PDFShift's own quirks.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { HAND_DIR, REPO } from './lib-12.mjs';

const { chromium } = createRequire(path.join(REPO, 'package.json'))('playwright');
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const src = path.resolve(arg('--from') || path.join(HAND_DIR, '12-handwritten-testina-NOT-A-MODEL-RUN.html'));
const html = fs.readFileSync(src, 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
const failed = [];
page.on('requestfailed', (r) => failed.push(r.url()));
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
await page.setContent(html, { waitUntil: 'networkidle' });
const pdf = src.replace(/\.html$/, '.pdf');
// Node 11 sends: format Letter, margin 0, use_print true.
await page.pdf({ path: pdf, format: 'Letter', margin: { top: 0, right: 0, bottom: 0, left: 0 }, printBackground: true });

const buf = fs.readFileSync(pdf);
const pages = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`\n  ${pdf}`);
console.log(`    ${(buf.length / 1024).toFixed(0)}KB, ${pages} pages`);
console.log(`    requests failed: ${failed.length ? failed.join(', ') : 'none'}`);

await browser.close();
// Page pictures of the PDF itself (not the HTML), so page breaks are the real ones. Needs pdftoppm.
const want = (arg('--png') || '').split(',').filter(Boolean).map(Number);
for (const n of want) {
  const out = src.replace(/\.html$/, `-page-${n}`);
  try {
    execFileSync('pdftoppm', ['-png', '-r', '70', '-f', String(n), '-l', String(n), '-singlefile', pdf, out]);
    console.log(`    ${out}.png`);
  } catch (e) { console.log(`    page ${n}: no picture (${e.code === 'ENOENT' ? 'pdftoppm not installed' : e.message.slice(0, 80)})`); }
}

console.log('');
process.exit(failed.length ? 1 : 0);
