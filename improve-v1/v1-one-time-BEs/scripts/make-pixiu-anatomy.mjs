#!/usr/bin/env node
// Composite offer 06's PIXIU ANATOMY plate from the licensed real reference photograph.
//
//   node improve-v1/v1-one-time-BEs/scripts/make-pixiu-anatomy.mjs
//
// The source photograph contains a facing pair of Qianlong-period bronze Pixiu incense
// censers. This plate crops to the LEFT creature only, then adds typography and leader lines
// in the same paper/ink palette as make-tea-cup.mjs and make-hexagram.mjs. The creature is
// never redrawn: every anatomical target below is a coordinate on the real photograph.

import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DECK = path.join(ROOT, 'improve-v1/v1-one-time-BEs');

const SIZE = 2400;
const INK = '#2A2622';
const PAPER = '#FBF8F1';
const FADE = '#C9BFA8';
const MUTE = '#6E6459';

const source = path.join(DECK, 'assets/06-pixiu-reference.jpg');
const outDir = path.join(DECK, 'assets');
const out = path.join(outDir, '06-pixiu-anatomy-annotated.png');

// The 800×577 source is fitted by height and cropped from its left edge. At this size the
// visible source window is x=0…430: the whole left creature, plus a little neutral gray air,
// and none of the right creature. Keep these numbers in sync with the target coordinates.
const PHOTO = { x: 550, y: 286, w: 1300, h: 1744 };
const sourceScale = PHOTO.h / 577;
const onCanvas = ([x, y]) => [PHOTO.x + x * sourceScale, PHOTO.y + y * sourceScale];

// Targets were placed after inspecting the actual 800×577 photograph and an enlarged view.
// `at` is in source-image pixels. In particular, the horn target is on the long, single,
// backward-swept bronze horn—not on the raised snout ornament, the ear, or gray background.
const CALLOUTS = [
  {
    label: 'THE HORN',
    note: 'one horn: Tianlu, wealth drawn toward you',
    at: [151, 156],
    side: 'left',
    y: 525,
    noteLines: ['one horn: Tianlu, wealth', 'drawn toward you'],
  },
  {
    label: 'THE DRAGON\u2019S HEAD',
    note: 'authority · commands luck · Yang',
    at: [255, 201],
    side: 'left',
    y: 825,
    noteLines: ['authority · commands luck · Yang'],
  },
  {
    label: 'THE OPEN MOUTH / FANGS',
    note: 'the capacity to hold vast wealth',
    at: [329, 194],
    side: 'right',
    y: 815,
    noteLines: ['the capacity to hold vast wealth'],
  },
  {
    label: 'THE MANE / DECORATIVE RUFF',
    note: 'guardianship · strength · Yin',
    at: [205, 274],
    side: 'left',
    y: 1090,
    noteLines: ['guardianship · strength · Yin'],
  },
  {
    label: 'THE BODY',
    note: 'dragon head + lion body = Yin-Yang balance',
    at: [226, 359],
    side: 'right',
    y: 1325,
    noteLines: ['dragon head + lion body =', 'Yin-Yang balance'],
  },
  {
    label: 'THE TAIL / HINDQUARTERS',
    note: 'no exit — wealth captured, never flushed away',
    at: [43, 366],
    side: 'left',
    y: 1550,
    noteLines: ['no exit — wealth captured,', 'never flushed away'],
  },
];

const CAPTION = 'Two related creatures share the name in everyday speech: one horn (Tianlu) draws wealth toward you, two horns (Bixie) guard what you already hold.';

function leader(c) {
  const [tx, ty] = onCanvas(c.at);
  const left = c.side === 'left';
  const sx = left ? 530 : 1870;
  const elbow = left ? 618 : 1782;
  return `
    <path d="M${sx},${c.y} H${elbow} V${ty} H${tx}"
          fill="none" stroke="${INK}" stroke-opacity=".82" stroke-width="4"
          stroke-dasharray="17 14" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${tx}" cy="${ty}" r="12" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
    <circle cx="${tx}" cy="${ty}" r="4" fill="${INK}"/>`;
}

function callout(c) {
  const x = c.side === 'left' ? 70 : 1870;
  const width = 460;
  const height = c.noteLines.length === 1 ? 112 : 142;
  const top = c.y - height / 2;
  const textX = c.side === 'left' ? x + width - 30 : x + 30;
  const anchor = c.side === 'left' ? 'end' : 'start';
  const ruleX = c.side === 'left' ? x + width - 3 : x;
  const notes = c.noteLines.map((line, i) =>
    `<tspan x="${textX}" dy="${i === 0 ? 0 : 30}">${line}</tspan>`
  ).join('');
  return `
    <g>
      <rect x="${x}" y="${top}" width="${width}" height="${height}"
            fill="${PAPER}" fill-opacity=".96"/>
      <line x1="${ruleX}" y1="${top}" x2="${ruleX}" y2="${top + height}"
            stroke="${FADE}" stroke-width="3"/>
      <text x="${textX}" y="${top + 38}" text-anchor="${anchor}"
            font-family="Georgia, 'Times New Roman', serif" font-size="25" font-weight="700"
            letter-spacing="2.1" fill="${INK}">${c.label}</text>
      <text x="${textX}" y="${top + 76}" text-anchor="${anchor}"
            font-family="Georgia, 'Times New Roman', serif" font-size="23" font-style="italic"
            fill="${MUTE}">${notes}</text>
    </g>`;
}

function svg(photoDataUrl) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
               width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    <defs>
      <clipPath id="photo-crop">
        <rect x="${PHOTO.x}" y="${PHOTO.y}" width="${PHOTO.w}" height="${PHOTO.h}"/>
      </clipPath>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="${INK}" flood-opacity=".12"/>
      </filter>
    </defs>
    <rect width="${SIZE}" height="${SIZE}" fill="${PAPER}"/>
    <text x="1200" y="142" text-anchor="middle"
          font-family="Georgia, 'Times New Roman', serif" font-size="34" font-weight="700"
          letter-spacing="6.1" fill="${MUTE}">READING THE CREATURE</text>
    <line x1="1040" y1="184" x2="1360" y2="184" stroke="${FADE}" stroke-width="2"/>
    <g filter="url(#shadow)">
      <rect x="${PHOTO.x}" y="${PHOTO.y}" width="${PHOTO.w}" height="${PHOTO.h}" fill="#4b514c"/>
      <image x="${PHOTO.x}" y="${PHOTO.y}" width="${PHOTO.w}" height="${PHOTO.h}"
             preserveAspectRatio="xMinYMid slice" clip-path="url(#photo-crop)"
             xlink:href="${photoDataUrl}"/>
      <rect x="${PHOTO.x + 1.5}" y="${PHOTO.y + 1.5}" width="${PHOTO.w - 3}" height="${PHOTO.h - 3}"
            fill="none" stroke="${FADE}" stroke-width="3"/>
    </g>
    ${CALLOUTS.map(leader).join('')}
    ${CALLOUTS.map(callout).join('')}
    <line x1="120" y1="2200" x2="2280" y2="2200" stroke="${FADE}" stroke-width="2"/>
    <text x="1200" y="2252" text-anchor="middle"
          font-family="Georgia, 'Times New Roman', serif" font-size="22" font-style="italic"
          fill="${MUTE}">${CAPTION}</text>
  </svg>`;
}

mkdirSync(outDir, { recursive: true });
const photoDataUrl = `data:image/jpeg;base64,${readFileSync(source).toString('base64')}`;
await sharp(Buffer.from(svg(photoDataUrl))).png().toFile(out);

console.log(`\n  Pixiu anatomy — real photograph annotated`);
console.log(`    left creature · 6 labels · one visible horn (Tianlu)`);
console.log(`    ${path.relative(ROOT, out)}  (${SIZE}×${SIZE})\n`);
