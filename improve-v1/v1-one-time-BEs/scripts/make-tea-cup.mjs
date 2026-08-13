#!/usr/bin/env node
// Draw offer 04's CUP — the seven leaves where they landed, as one image.
//
//   node improve-v1/v1-one-time-BEs/scripts/make-tea-cup.mjs 04
//
// Workflow: improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md — Phase B, D12 (asked at B2,
// built at B4). The sibling of `make-zodiac-spread.mjs`: same job, different geometry,
// because 04's mechanism is a cup and 02's is a chart wheel.
//
// ── Why a diagram and not a photograph ───────────────────────────────────────────
// The source package shipped a real photo of a real cup with the seven symbols circled
// in red (docs/media/04-tea-reading/image1.jpg). Look at it: you cannot see a boat, a
// lighthouse, a bridge or a butterfly in it, because you never can — wet leaves look
// like wet leaves. It marks positions on a mess.
//
// 04's meaning is POSITION, not picture (00e §10, and 04-P1 says it outright: "position
// not symbols"). Position is a diagram. So this draws one, from the same table the copy
// is written against, and the two cannot drift apart.
//
// ⛔ And nothing here is scraped. This is a paid product; the deck's standard is
// recorded provenance (see assets/tarot-rws/index.json). Every mark below is drawn.
//
// ── The cup's geography, straight from 04-P1 ─────────────────────────────────────
//   "The handle is you. Everything sitting near it is close to you and it is soon.
//    Everything opposite is far from you and belongs to somebody you haven't met.
//    The rim is days — the higher up the wall, the sooner. The base is what's buried,
//    and what's buried is old."
//
// Which is polar coordinates, and the picture should say so:
//   ANGLE  from the handle  → how close to her, and how soon
//   RADIUS from the centre  → rim (soonest) · wall · base (oldest, buried)

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DECK = path.join(ROOT, 'improve-v1/v1-one-time-BEs');

const SIZE = 2400;
const R = SIZE / 2;
// ⚠ The cup has to leave room for the HANDLE and its label on the right. A first pass
// used 860 and pushed "The handle is you" off the edge of the canvas — and that label
// is not decoration, it is the origin every angle in the picture is measured from.
const CUP = 760;          // the rim
const BASE = 300;         // the base circle

// ── The seven, and where they landed ────────────────────────────────────────────
// ⛔ This is the contract with `copy/04/04-P1-the-turn.md` — "Where your seven landed".
// Reassign one there and it must be reassigned here, or the buyer holds two answers
// and believes the picture.
//
// `deg` is measured from the handle, which sits at 0° (three o'clock). `r` is the
// distance out from the base. Where the copy fixes a position it is quoted; the rest
// are spaced to stay legible without contradicting anything the copy states.
const OFFERS = {
  '04': {
    handleLabel: ['The handle is you', 'nearest, and soonest'],
    bands: [
      { r: 690, label: 'THE RIM', sub: 'days · the higher, the sooner' },
      { r: 480, label: 'THE WALL', sub: 'the middle distance' },
      { r: 220, label: 'THE BASE', sub: 'what is buried, and old' },
    ],
    leaves: [
      { key: 'heart',      name: 'The broken heart', deg: 8,   r: 495, note: '"against the handle"' },
      { key: 'butterfly',  name: 'The butterfly',    deg: 52,  r: 688, note: '"rim, nearest the top"' },
      { key: 'bridge',     name: 'The bridge',       deg: 92,  r: 480, note: '"between handle and lighthouse"' },
      { key: 'bird',       name: 'The bird',         deg: 136, r: 610, note: '"high wall, tail trailing down"' },
      { key: 'lighthouse', name: 'The lighthouse',   deg: 180, r: 636, note: '"opposite the handle, high"' },
      { key: 'tree',       name: 'The withering tree', deg: 232, r: 380, note: '"mid-wall, roots toward the base"' },
      { key: 'boat',       name: 'The boat',         deg: 302, r: 480, note: '"mid-wall, turned toward the handle"' },
    ],
  },
};

// ── The icons ───────────────────────────────────────────────────────────────────
// Drawn, in a 100×100 box, single colour. They have to read at about an inch on paper,
// which is why they are silhouettes and not illustrations — and why no photograph of a
// leaf clump could ever do this job.
const INK = '#2A2622';
const PAPER = '#FBF8F1';

const ICONS = {
  // A whole heart with the ground colour struck through it — a "broken heart" drawn as
  // two separate halves reads as two objects at this size.
  heart: `
    <path d="M50,90 C18,66 6,48 6,33 C6,18 17,10 28,10 C37,10 45,16 50,25
             C55,16 63,10 72,10 C83,10 94,18 94,33 C94,48 82,66 50,90 Z" fill="${INK}"/>
    <path d="M50,22 L43,38 L54,49 L44,62 L52,74 L50,88" stroke="${PAPER}"
          stroke-width="7" fill="none" stroke-linejoin="round"/>`,
  // Tail trailing DOWN, because the copy works the reading from the tail.
  // ⚠ Swept FILLED wings, not two strokes. Stroked arcs plus a tail read as a plant —
  // the first pass looked like a trident. The tail is long and trailing because the
  // copy works the whole reading from it: "I worked it from the tail rather than the
  // body: the tail was still on the wall."
  bird: `
    <path d="M50,42 C38,24 20,17 4,24 C21,31 36,39 47,50 Z" fill="${INK}"/>
    <path d="M50,42 C62,24 80,17 96,24 C79,31 64,39 53,50 Z" fill="${INK}"/>
    <ellipse cx="50" cy="48" rx="5.5" ry="10" fill="${INK}"/>
    <path d="M45,56 L50,92 L55,56 Z" fill="${INK}"/>`,
  tree: `
    <path d="M45,88 L47,44 L53,44 L55,88 Z" fill="${INK}"/>
    <path d="M48,50 L28,32 M48,58 L32,48 M52,48 L72,30 M52,58 L68,48 M50,42 L50,24"
          stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M30,32 L24,24 M72,30 L78,22 M50,24 L44,16"
          stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M46,88 L30,97 M54,88 L70,97 M50,88 L50,98"
          stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  boat: `
    <path d="M12,64 L88,64 L74,84 L26,84 Z" fill="${INK}"/>
    <path d="M50,14 L50,64" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M55,20 L80,60 L55,60 Z" fill="${INK}"/>
    <path d="M45,34 L26,60 L45,60 Z" fill="${INK}"/>
    <path d="M6,92 Q22,86 38,92 T70,92 T96,92" stroke="${INK}" stroke-width="4" fill="none"/>`,
  lighthouse: `
    <path d="M38,86 L43,40 L57,40 L62,86 Z" fill="${INK}"/>
    <rect x="41" y="30" width="18" height="10" fill="${INK}"/>
    <path d="M38,30 L62,30 L50,16 Z" fill="${INK}"/>
    <rect x="30" y="86" width="40" height="8" fill="${INK}"/>
    <path d="M28,26 L14,20 M28,38 L14,42 M72,26 L86,20 M72,38 L86,42"
          stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  bridge: `
    <path d="M8,70 L92,70" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <path d="M14,70 Q50,22 86,70" stroke="${INK}" stroke-width="7" fill="none"/>
    <path d="M28,70 L28,54 M50,70 L50,38 M72,70 L72,54"
          stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M14,70 L14,92 M86,70 L86,92" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`,
  butterfly: `
    <ellipse cx="50" cy="52" rx="4" ry="21" fill="${INK}"/>
    <path d="M47,38 C33,12 10,17 13,35 C15,50 36,50 47,44 Z" fill="${INK}"/>
    <path d="M53,38 C67,12 90,17 87,35 C85,50 64,50 53,44 Z" fill="${INK}"/>
    <path d="M47,56 C36,64 21,66 23,78 C25,89 43,80 47,64 Z" fill="${INK}"/>
    <path d="M53,56 C64,64 79,66 77,78 C75,89 57,80 53,64 Z" fill="${INK}"/>
    <path d="M48,32 Q42,16 32,12 M52,32 Q58,16 68,12"
          stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
};

function die(m) { console.error(`\n  ⛔ ${m}\n`); process.exit(1); }

function html(offer) {
  const ICON = 168;

  const seat = (l) => {
    const rad = (l.deg * Math.PI) / 180;
    const x = R + l.r * Math.cos(rad);
    const y = R - l.r * Math.sin(rad);
    const icon = ICONS[l.key] || die(`no icon drawn for "${l.key}"`);
    return `
      <div class="leaf" style="left:${x}px; top:${y}px;">
        <svg viewBox="0 0 100 100" width="${ICON}" height="${ICON}">${icon}</svg>
        <div class="lname">${l.name}</div>
        <div class="lnote">${l.note}</div>
      </div>`;
  };

  // ⚠ The three bands are named in a KEY, not floated inside the cup. A first pass hung
  // them on a spoke through the ring and they landed on top of the boat's caption — the
  // cup's interior belongs to the seven leaves, and nothing else may compete for it.
  const bands = `
    <div class="key">
      <b class="keyhead">Reading the cup</b>
      ${offer.bands
        .map((b) => `<div class="keyrow"><i></i><b>${b.label}</b><span>${b.sub}</span></div>`)
        .join('')}
    </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing:border-box; margin:0; padding:0 }
    body { width:${SIZE}px; height:${SIZE}px; position:relative; background:${PAPER};
           font-family: Georgia,'Times New Roman',serif; color:${INK} }
    svg.plate { position:absolute; inset:0 }
    .leaf { position:absolute; transform:translate(-50%,-50%); width:372px; text-align:center }
    .lname { margin-top:6px; font-size:29px; font-weight:700 }
    .lnote { margin-top:2px; font-size:21px; font-style:italic; color:#6E6459 }
    .key { position:absolute; left:96px; bottom:96px; width:560px }
    .keyhead { display:block; font-size:26px; letter-spacing:.14em; text-transform:uppercase;
               color:#8A7F70; padding-bottom:14px; border-bottom:2px solid #DDD5C4 }
    .keyrow { display:flex; align-items:baseline; gap:14px; margin-top:16px }
    .keyrow i { width:34px; height:0; border-top:2px dashed #C9BFA8; flex:none;
                transform:translateY(-8px) }
    .keyrow b { font-size:24px; letter-spacing:.1em; white-space:nowrap }
    .keyrow span { font-size:21px; font-style:italic; color:#6E6459 }
    .base { position:absolute; left:${R}px; top:${R}px; transform:translate(-50%,-50%);
            width:420px; text-align:center }
    .base b { display:block; font-size:24px; letter-spacing:.14em }
    .base span { display:block; margin-top:5px; font-size:21px; font-style:italic; color:#8A7F70 }
    .handle { position:absolute; left:${R + CUP + 250}px; top:${R}px;
              transform:translate(-50%,-50%); width:300px; text-align:center }
    .handle b { display:block; font-size:31px }
    .handle span { display:block; margin-top:4px; font-size:22px; font-style:italic; color:#6E6459 }
  </style></head><body>
    <svg class="plate" width="${SIZE}" height="${SIZE}">
      <!-- the cup, seen from above: rim, wall, base -->
      <circle cx="${R}" cy="${R}" r="${CUP}" fill="none" stroke="${INK}" stroke-width="5"/>
      <circle cx="${R}" cy="${R}" r="${CUP - 26}" fill="none" stroke="${INK}" stroke-width="2"/>
      <circle cx="${R}" cy="${R}" r="${CUP - 210}" fill="none" stroke="#C9BFA8" stroke-width="2"
              stroke-dasharray="10 14"/>
      <circle cx="${R}" cy="${R}" r="${BASE}" fill="none" stroke="#C9BFA8" stroke-width="2"
              stroke-dasharray="10 14"/>
      <!-- the handle. It is drawn, not implied: it is the origin of every angle here. -->
      <path d="M${R + CUP - 10},${R - 150}
               C${R + CUP + 150},${R - 150} ${R + CUP + 150},${R + 150} ${R + CUP - 10},${R + 150}"
            fill="none" stroke="${INK}" stroke-width="26" stroke-linecap="round"/>
    </svg>
    ${offer.leaves.map(seat).join('')}
    ${bands}
    <div class="base"><b>${offer.bands.at(-1).label}</b><span>${offer.bands.at(-1).sub}</span></div>
    <div class="handle"><b>${offer.handleLabel[0]}</b><span>${offer.handleLabel[1]}</span></div>
  </body></html>`;
}

const key = process.argv[2];
const offer = OFFERS[key];
if (!offer) die(`usage: make-tea-cup.mjs <offer>   (have: ${Object.keys(OFFERS).join(', ')})`);

const outDir = path.join(DECK, 'assets');
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${key}-the-cup.png`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  await page.setContent(html(offer), { waitUntil: 'load' });
  await page.screenshot({ path: out, type: 'png' });
} finally {
  await browser.close();
}

console.log(`\n  The cup — drawn`);
console.log(`    7 leaves · handle at three o'clock, and every angle is measured from it`);
console.log(`    ${path.relative(ROOT, out)}  (${SIZE}×${SIZE})\n`);
