// Render the generalized 03 "Record of Judgement" HTML → PDF (the deliverable
// hosted on Supabase + linked in the delivery email). POC: same doc for every
// buyer (Joel approved generic, 2026-09-02). Edit the .html, then re-run this.
//
//   node improve-v1/v1-one-time-BEs/scripts/render-record-generic.mjs
//
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const SRC = 'improve-v1/v1-one-time-BEs/copy/03/03-P1-record-GENERIC.html';
const OUT = 'improve-v1/v1-one-time-BEs/copy/03/03-Record-of-Judgement-GENERIC.pdf';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(SRC).href, { waitUntil: 'networkidle' });
await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  margin: { top: '16mm', bottom: '18mm', left: '15mm', right: '15mm' },
});
await browser.close();
console.log('wrote', OUT);
