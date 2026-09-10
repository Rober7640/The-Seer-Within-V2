/**
 * 07 — the seven worked examples of the report design.
 *
 *   node scripts/make-07-report-examples.mjs           # all seven, HTML + PDF
 *   node scripts/make-07-report-examples.mjs mon sun   # just those
 *   node scripts/make-07-report-examples.mjs --html    # skip Chromium
 *
 * ⭐ ONE DESIGN, SEVEN SPREADS, THREE RUNGS. Every file below comes out of the same
 *    `renderReport` in scripts/07-report-template.mjs. Nothing here is per-day layout —
 *    if a day needs its own template, the design has failed and this script is how you
 *    would find out.
 *
 * ⛔ THE QUESTIONS ARE NOT INVENTED. Question one is the dry-run order's own question,
 *    verbatim. On a two- or three-question rung the extra questions are lifted out of the
 *    same woman's own dry-run text — the second thing she already asked in the same
 *    paragraph. That is exactly what the booking page's router does with box one.
 *
 * ⛔ THE OPEN CARDS ARE SYNTHETIC, AND ONLY BECAUSE THE FIXTURE HAS NONE.
 *    scripts/07-dryrun-orders.json carries `draw.day` and no `draw.open`, because every
 *    order in it is tier 'spread'. The morning draw job has to start storing six more.
 *    Until it does, the open six below stand in. They are real cards, none of them already
 *    in that day's spread, in a fixed order — the order IS the position, per 07-C5 §2.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { resolve as resolveTier } from './07-registry.mjs';
import { renderReport } from './07-report-template.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPO = path.dirname(path.dirname(ROOT));
const OUT = path.join(ROOT, 'docs/07-marcus');
const SRC = path.join(OUT, 'report-examples');

export const PLAN = {
  mon: { tier: 'table', label: 'the floor spread at the top rung',
    qs: ["I can't see a way to stop covering everybody without being the one who let them all down. How do I stop?",
         "Why have I only got £300 saved when I'm on decent money?"],
    open: [['Three of Pentacles', false], ['Eight of Swords', false], ['The Chariot', false],
           ['Two of Pentacles', false], ['Queen of Cups', true], ['Knight of Wands', false]] },
  tue: { tier: 'spread', label: 'the plain $35 floor', qs: [], open: [] },
  wed: { tier: 'pattern', label: 'two questions on the smallest spread',
    qs: ["Why do I say no to every single person before I've even thought about it?"],
    open: [['Two of Wands', false], ['The Devil', false], ['Six of Swords', false]] },
  thu: { tier: 'spread', label: 'the $35 floor, shadow-work day', qs: [], open: [] },
  fri: { tier: 'pattern', label: 'two questions, a nine-card spread',
    qs: ["Should I take the salaried job my friend has offered me, for eight thousand less?"],
    open: [['Wheel of Fortune', false], ['Seven of Swords', true], ['The Chariot', false]] },
  sat: { tier: 'spread', label: 'the $35 floor, and the reads-the-cards-not-the-man day', qs: [], open: [] },
  sun: { tier: 'table', label: 'the 12-card spread at the top rung — 18 cards, 15 passages',
    qs: ["Why can't I stop thinking about the man I let go of in my thirties?",
         "Why can't I say any of this out loud to my friends?"],
    open: [['Five of Swords', false], ['The Tower', false], ['Two of Wands', false],
           ['Four of Wands', false], ['Nine of Cups', true], ['The Fool', false]] },
};

const orders = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/07-dryrun-orders.json')));

/** The verdict object node 8a would hand node 10a. ⭐ This shape is the payload contract. */
export function verdictFor(day) {
  const o = orders[day];
  const p = PLAN[day];
  const r = resolveTier(o.draw.spread_key, p.tier);
  if (!r.ok) throw new Error(`${day}: ${r.reason}`);

  const open_cards = r.positions.filter((x) => x.block === 'open').map((x) => {
    const [card_name, reversed] = p.open[x.draw_index - 1];
    return { number: `${x.answer}.${x.n}`, name: x.name, job: x.job,
             card_name, reversed, answer: x.answer };
  });

  return {
    order_id: o.order_id, first_name: o.first_name,
    questions: [o.question, ...p.qs],
    tier: p.tier, tier_label: r.label, price_usd: r.price_usd,
    spread_name: o.draw.spread_name, spread_key: o.draw.spread_key, draw_date: o.draw.draw_date,
    day_cards: o.draw.day, open_cards,
    reading: fs.readFileSync(path.join(SRC, `reading-${day}.txt`), 'utf8'),
    _resolved: r,
  };
}

export const fileBase = (day) => {
  const v = { tue: 1, thu: 1, sat: 1, wed: 2, fri: 2, mon: 3, sun: 3 }[day];
  const p = { 1: 35, 2: 57, 3: 87 }[v];
  return `07-report-${day}-${orders[day].draw.spread_key.replace(/^the-/, '')}-${v}q-${p}`;
};

const days = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const todo = days.length ? days : Object.keys(PLAN);
const htmlOnly = process.argv.includes('--html');

const built = [];
for (const day of todo) {
  const v = verdictFor(day);
  const { html, pages } = renderReport(v);
  const base = fileBase(day);
  fs.writeFileSync(path.join(OUT, `${base}.html`), html);
  const words = v.reading.replace(/\[[^\]]*\]/g, ' ').split(/\s+/).filter(Boolean).length;
  built.push({ day, base, ...pages, words, target: v._resolved.target_words,
               tier: v.tier_label, price: v.price_usd });
}

console.table(built.map(({ day, tier, price, questions, positions, cards, closing, words, target }) =>
  ({ day, rung: tier, $: price, questions, passages: positions, cards,
     'closing passage': closing ? 'yes' : '—', words, target })));

if (htmlOnly) process.exit(0);

const { chromium } = createRequire(path.join(REPO, 'package.json'))('playwright');
const browser = await chromium.launch();
let bad = 0;
for (const b of built) {
  const page = await browser.newPage();
  const failed = [];
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => failed.push(`FAILED ${r.url()}`));
  await page.setContent(fs.readFileSync(path.join(OUT, `${b.base}.html`), 'utf8'),
    { waitUntil: 'networkidle' });
  const broken = await page.evaluate(() =>
    [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
  const pdf = path.join(OUT, `${b.base}.pdf`);
  await page.pdf({ path: pdf, format: 'Letter', margin: { top: 0, right: 0, bottom: 0, left: 0 },
                   printBackground: true });
  await page.close();
  const n = (fs.readFileSync(pdf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  const ok = !broken.length && !failed.length;
  if (!ok) bad++;
  console.log(`${ok ? '✅' : '⛔'} ${b.base}.pdf — ${n} pages, ` +
    `${(fs.statSync(pdf).size / 1024 / 1024).toFixed(2)}MB` +
    (ok ? '' : `\n     broken: ${broken.join(', ')} ${failed.join(', ')}`));
}
await browser.close();
if (bad) { console.error(`\n⛔ ${bad} report(s) had a missing image`); process.exit(1); }
