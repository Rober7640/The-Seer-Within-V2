/**
 * Turn a finished 02 reading into a real PDF, with NO PDFShift key and NO Supabase.
 *
 *   node improve-v1/v1-one-time-BEs/docs/02/n8n/scripts/make-02-pdf.mjs
 *
 * ⭐ WHAT THIS ACTUALLY TESTS. The HTML is built by node `10 · Build the HTML` — the REAL
 *    jsCode, pulled out of docs/02/02-fulfilment.n8n.json, not a copy. That node owns the
 *    card lookups, the marker splitting, the page-break CSS, the free gift and the AI
 *    disclosure. PDFShift is a hosted headless Chrome, so rendering the same HTML through
 *    local Chromium at node 11's own page settings exercises everything except PDFShift.
 *
 * ⛔ WHAT IT DOES NOT TEST: PDFShift's own quirks, the Supabase upload, the relative-signedURL
 *    trap and link expiry. Those need credentials that live in n8n, not in this repo.
 *
 * It reads the dry run's output, so run dryrun-02-reading.mjs first.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPO = path.resolve(ROOT, "../../../../..");
const { chromium } = createRequire(path.join(REPO, 'package.json'))('playwright');

const wf = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/02/02-fulfilment.n8n.json')));
const html_js = wf.nodes.find((n) => n.name.startsWith('10 ·')).parameters.jsCode;

// ⭐ --from <basename> renders ANY saved reading, not just the last local dry run. A reading
//    pulled off a real n8n execution is the only artefact that proves what a buyer receives,
//    and until this flag existed there was no way to look at one.
//    ⛔ The draw sidecar must match the reading — node 10 looks card art up from it, so the
//    wrong sidecar renders the wrong twelve cards without erroring.
const fromArg = process.argv.includes('--from')
  ? process.argv[process.argv.indexOf('--from') + 1] : 'dryrun-02-reading';
const base = fromArg.replace(/\.md$/, '');
const md = fs.readFileSync(path.join(ROOT, `docs/02/${base}.md`), 'utf8');
const reading = md.slice(md.indexOf('\n---\n') + 5).trim();
// The draw as data. ⚠ HARNESS-ONLY FALLBACK: if the sidecar is missing (a reading saved
// before it existed), rebuild it from the prose markers plus the card vocabulary. The
// WORKFLOW never does this — node 10 trusts the draw record and not the model's typing —
// but a test that cannot render an older reading is a test nobody runs.
const sidecar = path.join(ROOT, `docs/02/${base.replace('reading', 'draw')}.json`);
let draw;
if (fs.existsSync(sidecar)) {
  draw = JSON.parse(fs.readFileSync(sidecar, 'utf8'));
} else {
  const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/02-houses.json'), 'utf8'));
  const slugOf = Object.fromEntries(Object.entries(spec.cards).map(([k, v]) => [v, k]));
  const houseOf = Object.fromEntries(spec.houses.map((h) => [h.number, h]));
  draw = [...reading.matchAll(/\[(\d+) · ([^·]+) · ([^\]]+)\]/g)].map((m) => {
    const name = m[3].replace(/\s*\(reversed\)\s*$/, '').trim();
    const slug = slugOf[name];
    if (!slug) throw new Error(`the reading names '${name}', which is not in the vocabulary`);
    return { house: Number(m[1]), house_name: houseOf[Number(m[1])].name,
             job: houseOf[Number(m[1])].job, card: slug, card_name: name,
             reversed: /\(reversed\)/.test(m[3]), fixed: spec.draw.fixed.includes(slug),
             obligation: spec.obligations[slug] || null };
  });
  console.log(`  ⚠ no draw sidecar — rebuilt ${draw.length} houses from the prose markers`);
}

// ⭐ Node 10 personalises from these. Anything it reads has to be here, or the test lies
//    about what a buyer sees — 07's first harness passed only the cover fields and the
//    intake block rendered blank, which looked like a template bug.
const state = {
  order_id: 'cs_test_dryrun_02', first_name: 'Sarah',
  email: 'dryrun@theseerwithin.com', paid_at: '2026-09-07T21:40:00Z',
  draw, reading,
};

// ⭐ NO COVER SWAP ANY MORE. This harness used to substitute a local file for the cover,
//    because evelyn/02-zodiac-spread.jpg was missing from S3 and every render showed a black
//    page. The key now exists and serves 200, so the swap is gone — and it had to go: it was
//    pointing at assets/02-zodiac-spread.png, which is the OLD art showing the original
//    hand-written twelve. Leaving it in would have rendered a cover no buyer will ever get.
// ⛔ Render exactly what production renders, or the harness is telling you about a document
//    that does not exist.
const patched = html_js;

// Execution mode renders the exact HTML saved from n8n node 10, including buyer fields.
const htmlPath = path.join(ROOT, `docs/02/${base}.html`);
const out = process.argv.includes('--use-saved-html')
  ? { html: fs.readFileSync(htmlPath, 'utf8') }
  : new Function('$input', '$', patched)(
  { first: () => ({ json: state }) },
  () => ({ first: () => ({ json: state }) }),
)[0].json;

fs.writeFileSync(htmlPath, out.html);
const imgs = [...out.html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]);
const takeaways = [...out.html.matchAll(/<p class="takeaway"><strong>(.*?)<\/strong><\/p>/g)]
  .map((m) => m[1]);
const expectedTakeaways = draw.filter((p) => p.architecture?.emphasis_position !== 'none').length;
if (takeaways.length !== expectedTakeaways) {
  throw new Error(`renderer produced ${takeaways.length} takeaways; expected ${expectedTakeaways}`);
}
console.log(`\n  node 10 produced ${(out.html.length / 1024).toFixed(0)}KB of HTML, ` +
  `${imgs.length} images, ${takeaways.length} takeaways`);

const browser = await chromium.launch();
const page = await browser.newPage();
const failed = [];
page.on('requestfailed', (r) => failed.push(r.url()));
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
await page.setContent(out.html, { waitUntil: 'networkidle' });
const broken = await page.evaluate(() =>
  [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));

const pdfPath = path.join(ROOT, `docs/02/${base}.pdf`);
// Node 11 sends: format Letter, margin 0, use_print true. Matched here.
await page.pdf({ path: pdfPath, format: 'Letter',
  margin: { top: 0, right: 0, bottom: 0, left: 0 }, printBackground: true });
await browser.close();

const bytes = fs.statSync(pdfPath).size;
const pages = (fs.readFileSync(pdfPath).toString('latin1')
  .match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`\n  ${path.relative(REPO, pdfPath)}`);
console.log(`    ${(bytes / 1024).toFixed(0)}KB, ${pages} pages`);
console.log(`    images broken:   ${broken.length ? broken.join('\n                     ') : 'none ✅'}`);
console.log(`    requests failed: ${failed.length ? failed.join('\n                     ') : 'none ✅'}`);
// The opening is the passage 07 silently deleted with a .slice(1). Prove it survived.
// ⛔ COMPARE ON NORMALISED TEXT, not raw substrings. The first version matched the reading's
//    opening characters against the raw HTML, so the moment a reading began "Sarah," on its own
//    line the paragraph break fell inside the compared span, "</p><p>" broke the match, and the
//    harness cried wolf on a document that was perfectly intact. A check that fails for reasons
//    unrelated to the thing it checks is worse than no check — next time it is ignored.
const flat = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const openingWords = flat(reading).split(' ').slice(0, 12).join(' ');
const rendered = flat(out.html);
const ok = rendered.includes(openingWords);
console.log(`    opening present: ${ok ? 'yes ✅' : 'NO 🔴'}`);
if (!ok) console.log(`      looked for: ${openingWords}`);
console.log();
