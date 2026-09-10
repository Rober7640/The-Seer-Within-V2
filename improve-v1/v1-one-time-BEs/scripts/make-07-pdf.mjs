/**
 * Phase 3a — turn a finished reading into a real PDF, with NO Supabase and NO PDFShift key.
 *
 *   node scripts/make-07-pdf.mjs [tue]
 *
 * ⭐ WHAT THIS ACTUALLY TESTS. The HTML is built by node "10a · Build the HTML" — the REAL
 *    jsCode, pulled out of docs/07-marcus/07-fulfilment.n8n.json, not a copy. That node is
 *    the variable: the card lookups, the marker splitting, the page-break CSS and the AI
 *    disclosure all live there. PDFShift is a hosted headless Chrome, so rendering the same
 *    HTML through local Chromium at the same page settings exercises everything except
 *    PDFShift itself.
 *
 * ⛔ WHAT IT DOES NOT TEST: PDFShift's own quirks, Supabase upload, the relative-signedURL
 *    trap, and link expiry. Those need the real credentials, which live in n8n and not in
 *    this repo's .env.
 *
 * Node 11 sends: format Letter, margin 0, use_print true. Matched below.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPO = path.dirname(path.dirname(ROOT));
const { chromium } = createRequire(path.join(REPO, 'package.json'))('playwright');

const day = process.argv[2] || 'tue';
const wf = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/07-marcus/07-fulfilment.n8n.json')));
const code = wf.nodes.find((n) => n.name.startsWith('10a')).parameters.jsCode;

// the finished reading from the dry run, plus the order it belongs to
const orders = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/07-dryrun-orders.json')));
const md = fs.readFileSync(path.join(ROOT, `docs/07-marcus/dryrun-${day}-spread.md`), 'utf8');
const reading = md.slice(md.indexOf('\n---\n') + 5).trim();
const o = orders[day];

// ⭐ Node 10a personalises from these. The first version of this harness passed only the
//    cover fields, so the intake block rendered blank and looked like a template bug.
//    Anything node 10a reads has to be here, or the test lies about what a buyer sees.
const verdict = {
  order_id:   o.order_id,
  first_name: o.first_name,
  question:   o.question,
  topic:      o.topic,
  tier:       o.tier || 'spread',
  spread_name: o.draw.spread_name,
  draw_date:   o.draw.draw_date,
  free_cards:  (o.draw.day || []).filter(p => p.free),
  reading,
};

// run node 10a exactly as n8n would
const out = new Function('$input', '$', code)(
  { first: () => ({ json: verdict }) },
  () => ({ first: () => ({ json: verdict }) }),
)[0].json;

const htmlPath = path.join(ROOT, `docs/07-marcus/reading-${day}.html`);
fs.writeFileSync(htmlPath, out.html);

const imgs = [...out.html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]);
console.log(`node 10a produced ${(out.html.length / 1024).toFixed(0)}KB of HTML, ${imgs.length} card images`);

const browser = await chromium.launch();
const page = await browser.newPage();
const failed = [];
page.on('requestfailed', (r) => failed.push(r.url()));
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

await page.setContent(out.html, { waitUntil: 'networkidle' });
const broken = await page.evaluate(() =>
  [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));

const pdfPath = path.join(ROOT, `docs/07-marcus/reading-${day}.pdf`);
await page.pdf({ path: pdfPath, format: 'Letter', margin: { top: 0, right: 0, bottom: 0, left: 0 },
                 printBackground: true });
await browser.close();

const bytes = fs.statSync(pdfPath).size;
const pages = (fs.readFileSync(pdfPath).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`\n${path.relative(REPO, pdfPath)}`);
console.log(`  ${(bytes / 1024).toFixed(0)}KB, ${pages} pages`);
console.log(`  images broken: ${broken.length ? broken.join(', ') : 'none ✅'}`);
console.log(`  requests failed: ${failed.length ? failed.join(', ') : 'none ✅'}`);
