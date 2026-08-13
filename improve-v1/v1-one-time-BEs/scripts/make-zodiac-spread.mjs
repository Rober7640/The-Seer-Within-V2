#!/usr/bin/env node
// Draw the offer's SPREAD — the twelve cards in their twelve houses, as one image.
//
//   node improve-v1/v1-one-time-BEs/scripts/make-zodiac-spread.mjs 02
//
// Workflow: improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md — Phase B, steps B4/B5.
//
// ── Why this exists ──────────────────────────────────────────────────────────────
// The product's whole structural fix is "twelve cards, twelve HOUSES" — the source
// package sold a Zodiac Spread and then assigned no houses at all. That fix is the
// mechanism she paid for, and until now it existed only as prose spread over twenty
// pages. This puts it on one page, where it can be taken in at a glance and flipped
// back to.
//
// It is also the honest alternative to an ecover. A 3D-rendered book mockup makes a
// digital product feel like an object; a spread wheel PROVES there is a spread. For a
// reading, the second is worth more — and unlike a mockup, this one is generated from
// the same house→card table the copy is written against, so it cannot drift from it.
//
// ── Astrological convention, kept ────────────────────────────────────────────────
// House 1 sits at the NINE o'clock position and the houses run ANTI-clockwise. That is
// how every chart a buyer has ever seen is drawn; getting it backwards is the kind of
// detail that costs credibility with exactly the reader who cares most.
//
// ⛔ Cards are never rotated. A tilted tarot card reads as REVERSED, which is a
// different card with a different meaning, and this spread has no reversals in it.

import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DECK = path.join(ROOT, 'improve-v1/v1-one-time-BEs');
const CARDS = path.join(ROOT, 'assets/tarot-rws');

// ── Per-offer: the house→card table the copy is written against ─────────────────
// ⛔ This must match the contract table at the top of the product spec. If a house is
// reassigned there and not here, the picture and the words disagree — and the picture
// is what she believes.
const OFFERS = {
  '02': {
    title: 'The Zodiac Spread',
    standfirst: 'Twelve trumps, one to each house',
    footer: 'Evelyn Cross · The Seer Within',
    houses: [
      { n: 1,  room: 'yourself',            slug: 'the-magician',       card: 'The Magician' },
      { n: 2,  room: 'what you own',        slug: 'wheel-of-fortune',   card: 'Wheel of Fortune' },
      { n: 3,  room: 'what you say',        slug: 'the-hierophant',     card: 'The Hierophant' },
      { n: 4,  room: 'home',                slug: 'temperance',         card: 'Temperance' },
      { n: 5,  room: 'romance',             slug: 'the-chariot',        card: 'The Chariot' },
      { n: 6,  room: 'work and health',     slug: 'strength',           card: 'Strength' },
      { n: 7,  room: 'who you are bound to',slug: 'the-hanged-man',     card: 'The Hanged Man' },
      { n: 8,  room: 'what is hidden',      slug: 'death',              card: 'The Nameless One' },
      { n: 9,  room: 'what you believe',    slug: 'justice',            card: 'Justice' },
      { n: 10, room: 'your standing',       slug: 'judgement',          card: 'Judgement' },
      { n: 11, room: 'your circle',         slug: 'the-devil',          card: 'The Devil' },
      { n: 12, room: 'what is kept from you',slug: 'the-high-priestess',card: 'The High Priestess' },
    ],
  },
};

// Square, and big: 2400px prints at ~370dpi across a 6.5in text column, which is
// sharper than the card art itself can manage. Cheap insurance.
const SIZE = 2400;

function die(m) { console.error(`\n  ⛔ ${m}\n`); process.exit(1); }

/** Cards are embedded as data URIs so the page has no external requests to lose. */
function dataUri(slug) {
  const file = path.join(CARDS, `${slug}.png`);
  if (!existsSync(file)) die(`card image missing: ${slug}.png`);
  return `data:image/png;base64,${readFileSync(file).toString('base64')}`;
}

function html(offer) {
  const R = SIZE / 2;
  // Card art is 350×600. 176px wide keeps twelve of them clear of each other on the
  // ring while staying large enough to be recognised as a specific card.
  const CARD_W = 176;
  const CARD_H = Math.round((600 / 350) * CARD_W);
  const RING = R - CARD_H / 2 - 168;   // centre-line of the card ring


  // 1st house at 9 o'clock, running ANTI-CLOCKWISE. Screen y grows downward, so the
  // sine is negated below and an INCREASING angle therefore walks anti-clockwise.
  //
  // ⛔ Check the chart against its four landmarks, not against the first house alone.
  // A first pass ran `180 - i*30`, which puts house 1 in the right place and everything
  // else mirrored — house 4 at the top and house 10 at the bottom. Any reader who has
  // seen a birth chart knows the 4th is the floor of it and the 10th is the crown.
  //
  //   house 1  → 9 o'clock   (the ascendant)
  //   house 4  → 6 o'clock   (the IC — home, the bottom of the chart)
  //   house 7  → 3 o'clock   (the descendant)
  //   house 10 → 12 o'clock  (the MC — standing, the top of the chart)
  const seats = offer.houses.map((h, i) => {
    const deg = 180 + i * 30;
    const rad = (deg * Math.PI) / 180;
    const cx = R + RING * Math.cos(rad);
    const cy = R - RING * Math.sin(rad);
    return { ...h, cx, cy, deg };
  });

  const spokes = offer.houses
    .map((_, i) => {
      const deg = 165 + i * 30;                 // the cusp between two seats
      const rad = (deg * Math.PI) / 180;
      const inner = 210;
      const outer = R - 44;
      return `<line x1="${R + inner * Math.cos(rad)}" y1="${R - inner * Math.sin(rad)}"
                    x2="${R + outer * Math.cos(rad)}" y2="${R - outer * Math.sin(rad)}"
                    stroke="#C9BFA8" stroke-width="2"/>`;
    })
    .join('');

  // ⚠ The house number rides ON its own card, not on a radius of its own. Floating it
  // inboard put twelve discs on a smaller circle than the twelve labels, and at the
  // left and right extremes they landed on top of the card names. Sitting it on the
  // corner of the card also makes the pairing unmistakable, which is the entire job.
  const cardEls = seats
    .map(
      (s) => `
      <div class="seat" style="left:${s.cx}px; top:${s.cy}px;">
        <div class="card">
          <img src="${dataUri(s.slug)}" alt="${s.card}" width="${CARD_W}" height="${CARD_H}">
          <div class="house">${s.n}</div>
        </div>
        <div class="name">${s.card}</div>
        <div class="room">${s.room}</div>
      </div>`,
    )
    .join('');
  const numEls = '';

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${SIZE}px ${SIZE}px; margin: 0 }
    * { box-sizing: border-box; margin: 0; padding: 0 }
    body { width:${SIZE}px; height:${SIZE}px; position:relative;
           background:#FBF8F1;                 /* warm paper — this prints */
           font-family: Georgia, 'Times New Roman', serif; color:#2A2622 }
    svg { position:absolute; inset:0 }
    .seat { position:absolute; transform:translate(-50%,-50%); width:${CARD_W + 96}px;
            text-align:center }
    .card { position:relative; width:${CARD_W}px; margin:0 auto }
    .card img { display:block; border:3px solid #2A2622;
                /* ⛔ never rotated — a tilted card reads as reversed */
                box-shadow:0 6px 18px rgba(42,38,34,.22) }
    .house { position:absolute; left:-30px; top:-26px;
             width:70px; height:70px; border-radius:50%;
             background:#2A2622; color:#FBF8F1;
             border:4px solid #FBF8F1;
             font-size:33px; line-height:64px; text-align:center; font-weight:700 }
    .name { margin-top:15px; font-size:26px; letter-spacing:.01em; font-weight:700 }
    .room { margin-top:3px; font-size:21px; font-style:italic; color:#6E6459 }
    .core { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
            width:352px; text-align:center }
    .core h1 { font-size:58px; line-height:1.08; letter-spacing:-.015em; font-weight:700;
               text-wrap:balance }
    .core p  { margin-top:14px; font-size:25px; font-style:italic; color:#6E6459;
               text-wrap:balance }
    .core .sig { margin-top:22px; font-size:17px; letter-spacing:.1em;
                 text-transform:uppercase; color:#8A7F70; line-height:1.5 }
  </style></head><body>
    <svg width="${SIZE}" height="${SIZE}">
      <circle cx="${R}" cy="${R}" r="${R - 44}" fill="none" stroke="#2A2622" stroke-width="4"/>
      <circle cx="${R}" cy="${R}" r="${R - 60}" fill="none" stroke="#C9BFA8" stroke-width="2"/>
      <circle cx="${R}" cy="${R}" r="210" fill="none" stroke="#2A2622" stroke-width="3"/>
      ${spokes}
    </svg>
    ${cardEls}
    ${numEls}
    <div class="core">
      <h1>${offer.title}</h1>
      <p>${offer.standfirst}</p>
      <div class="sig">${offer.footer}</div>
    </div>
  </body></html>`;
}

const key = process.argv[2];
const offer = OFFERS[key];
if (!offer) die(`usage: make-zodiac-spread.mjs <offer>   (have: ${Object.keys(OFFERS).join(', ')})`);

const outDir = path.join(DECK, 'assets');
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${key}-zodiac-spread.png`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  await page.setContent(html(offer), { waitUntil: 'load' });
  await page.screenshot({ path: out, type: 'png' });
} finally {
  await browser.close();
}

console.log(`\n  ${offer.title} — drawn`);
console.log(`    12 houses · house 1 at nine o'clock, running anti-clockwise`);
console.log(`    ${path.relative(ROOT, out)}  (${SIZE}×${SIZE})\n`);
