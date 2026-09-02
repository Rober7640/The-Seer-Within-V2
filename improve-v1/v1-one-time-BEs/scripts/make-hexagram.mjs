#!/usr/bin/env node
// Draw offer 06's THROW (I Ching candidate) — the six lines of hexagram 48, The Well —
// as one image.
//
//   node improve-v1/v1-one-time-BEs/scripts/make-hexagram.mjs 06
//
// Workflow: improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md — Phase B, D12. The sibling of
// `make-zodiac-spread.mjs` (02, a wheel) and `make-tea-cup.mjs` (04, a cup from above): same
// job, different geometry, because 06's mechanism is a hexagram, not a spread or a cup.
//
// ── Why a diagram and not a photograph ───────────────────────────────────────────
// Same rule as the rest of the deck: a paid product needs provenance (see
// assets/tarot-rws/index.json), and nothing here is scraped or stock. Six stacked lines is
// the actual notation this method has used for three thousand years — there is nothing a
// photograph could add that the notation itself doesn't already say better.
//
// ── The hexagram, verified against the trigram-family derivation ────────────────
// Hexagram 48 = Kan (Water) above, Xun (Wind/Wood) below.
//   Kan  = the middle son   = yin, yang, yin   (bottom to top)
//   Xun  = the eldest daughter = yin, yang, yang (bottom to top)
// So hexagram 48, lines 1 (bottom) → 6 (top): yin, yang, yang, yin, yang, yin.
// Line 6 (top) is drawn as a MOVING line — 06-E2-esl-iching's reveal turns on it being
// unresolved, still becoming its opposite, not a settled yang.
//
// ⛔ Do not reassign a line without re-reading `copy/06/06-E2-esl-iching.md` — the letter's
// three units (throws 1-3 blessing · 4-5 fork · 6 threat) are keyed to this exact structure.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DECK = path.join(ROOT, 'improve-v1/v1-one-time-BEs');

const SIZE = 2400;
const INK = '#2A2622';
const PAPER = '#FBF8F1';
const FADE = '#C9BFA8';
const MUTE = '#6E6459';

// Bottom (1) to top (6). 'yang' = solid bar. 'yin' = broken bar (two segments).
// `moving: true` marks a line still turning into its opposite — drawn with a marker.
const LINES = [
  { n: 1, kind: 'yin' },
  { n: 2, kind: 'yang' },
  { n: 3, kind: 'yang' },
  { n: 4, kind: 'yin' },
  { n: 5, kind: 'yang' },
  { n: 6, kind: 'yin', moving: true },
];

const TRIGRAMS = [
  { rows: [1, 2, 3], name: 'XUN — WOOD', sub: 'the well is real' },
  { rows: [4, 5, 6], name: 'KAN — WATER', sub: 'abundance, or the abyss — same shape, two names' },
];

// ── The well/jug icon, drawn in the same silhouette language as make-tea-cup.mjs ────
// A well frame over a shaft, and beside it a jug with a crack running through it — the
// two objects the letter and the spec sheet both turn on. Single colour, reads at an inch.
const WELL_ICON = `
  <path d="M14,60 L14,92 M86,60 L86,92" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  <path d="M8,60 L92,60" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <path d="M20,60 L20,30 Q20,18 32,18 L68,18 Q80,18 80,30 L80,60"
        fill="none" stroke="${INK}" stroke-width="6"/>
  <rect x="14" y="12" width="72" height="9" rx="3" fill="${INK}"/>
  <path d="M50,21 L50,44" stroke="${INK}" stroke-width="4" stroke-dasharray="3 5"/>
  <rect x="38" y="44" width="24" height="18" rx="2" fill="${INK}"/>`;

const JUG_ICON = `
  <path d="M42,10 L58,10 L58,22 L66,32 C74,42 76,54 72,68 C68,84 58,92 50,92
           C42,92 32,84 28,68 C24,54 26,42 34,32 L42,22 Z"
        fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M40,10 L40,4 L60,4 L60,10" stroke="${INK}" stroke-width="6" fill="none"/>
  <!-- the crack -->
  <path d="M58,30 L48,46 L58,58 L44,78" stroke="${INK}" stroke-width="5" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>
  <!-- water escaping the crack, drawn as falling drops -->
  <circle cx="70" cy="52" r="5" fill="${INK}"/>
  <circle cx="76" cy="66" r="4" fill="${INK}"/>
  <circle cx="70" cy="78" r="3" fill="${INK}"/>`;

function die(m) { console.error(`\n  ⛔ ${m}\n`); process.exit(1); }

function bar(kind, moving) {
  // A single hexagram line, drawn full-width for yang and split for yin. Rendered inside a
  // 600×64 box so the stack below can position rows by simple arithmetic, not polar math.
  if (kind === 'yang') {
    return `<div class="line yang"></div>`;
  }
  const marker = moving
    ? `<div class="movemark"></div>`
    : '';
  return `<div class="line yin"><span class="seg l"></span><span class="seg r"></span>${marker}</div>`;
}

function html() {
  const rowH = 176;
  const stackTop = 260;
  const stackLeft = 640;
  const stackWidth = 900;

  // Row 6 (top) draws first on screen; LINES is bottom-to-top, so reverse for display order.
  const rows = [...LINES].reverse().map((l, i) => {
    const y = stackTop + i * rowH;
    return `
      <div class="row" style="top:${y}px; left:${stackLeft}px; width:${stackWidth}px;">
        <div class="rownum">${l.n}</div>
        ${bar(l.kind, l.moving)}
        <div class="rowlabel">${l.kind === 'yang' ? 'yang' : 'yin'}${l.moving ? ' · moving' : ''}</div>
      </div>`;
  }).join('');

  const brackets = TRIGRAMS.map((t) => {
    const topRow = 6 - Math.max(...t.rows); // display index of the topmost row in this trigram
    const bottomRow = 6 - Math.min(...t.rows);
    const yTop = stackTop + topRow * rowH + 18;
    const yBot = stackTop + bottomRow * rowH + rowH - 18;
    const x = stackLeft - 90;
    const labelWidth = 260;
    return `
      <div class="bracket" style="left:${x}px; top:${yTop}px; height:${yBot - yTop}px;"></div>
      <div class="triglabel" style="left:${x - 20 - labelWidth}px; width:${labelWidth}px; top:${(yTop + yBot) / 2}px;">
        <b>${t.name}</b><span>${t.sub}</span>
      </div>`;
  }).join('');

  const key = `
    <div class="key">
      <b class="keyhead">Reading the throw</b>
      <div class="keyrow"><i></i><b>LINES 1–3</b><span>Xun — the well is real, and it hasn't run dry</span></div>
      <div class="keyrow"><i></i><b>LINES 4–5</b><span>Kan — the same shape means both "water" and "the abyss"</span></div>
      <div class="keyrow"><i></i><b>LINE 6</b><span>yin, moving — still turning, not yet settled</span></div>
      <div class="keyrow final"><i></i><b>HEXAGRAM 48</b><span>The Well — a good source, an untrustworthy vessel</span></div>
    </div>`;

  const icons = `
    <div class="icon" style="left:1620px; top:260px;">
      <svg viewBox="0 0 100 100" width="260" height="260">${WELL_ICON}</svg>
      <div class="iname">The well</div>
      <div class="inote">never runs dry</div>
    </div>
    <div class="icon" style="left:1620px; top:620px;">
      <svg viewBox="0 0 100 100" width="260" height="260">${JUG_ICON}</svg>
      <div class="iname">The cracked jug</div>
      <div class="inote">what actually fails</div>
    </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing:border-box; margin:0; padding:0 }
    body { width:${SIZE}px; height:${SIZE}px; position:relative; background:${PAPER};
           font-family: Georgia,'Times New Roman',serif; color:${INK} }
    .row { position:absolute; height:${rowH - 40}px; display:flex; align-items:center; gap:28px }
    .rownum { width:44px; font-size:26px; color:${MUTE}; text-align:right; flex:none }
    .rowlabel { width:180px; font-size:24px; font-style:italic; color:${MUTE}; flex:none }
    .line { position:relative; flex:1; height:34px; display:flex; align-items:center; gap:24px }
    .line.yang { background:${INK}; border-radius:6px; }
    .line.yin { justify-content:space-between }
    .line.yin .seg { flex:1; height:34px; background:${INK}; border-radius:6px }
    .movemark { position:absolute; left:50%; top:50%; width:26px; height:26px;
                transform:translate(-50%,-50%); border-radius:50%; background:${PAPER};
                border:5px solid ${INK} }
    .bracket { position:absolute; width:14px; border:4px solid ${FADE}; border-right:none;
               border-radius:8px 0 0 8px }
    .triglabel { position:absolute; width:280px; transform:translateY(-50%); text-align:right }
    .triglabel b { display:block; font-size:24px; letter-spacing:.08em }
    .triglabel span { display:block; margin-top:4px; font-size:19px; font-style:italic; color:${MUTE} }
    .icon { position:absolute; width:340px; text-align:center }
    .iname { margin-top:8px; font-size:28px; font-weight:700 }
    .inote { margin-top:2px; font-size:20px; font-style:italic; color:${MUTE} }
    .key { position:absolute; left:1620px; top:1020px; width:640px }
    .keyhead { display:block; font-size:26px; letter-spacing:.14em; text-transform:uppercase;
               color:#8A7F70; padding-bottom:14px; border-bottom:2px solid ${FADE} }
    .keyrow { margin-top:20px }
    .keyrow b { display:block; font-size:23px; letter-spacing:.08em }
    .keyrow span { display:block; margin-top:4px; font-size:20px; font-style:italic; color:${MUTE} }
    .keyrow.final { margin-top:32px; padding-top:20px; border-top:2px dashed ${FADE} }
    .title { position:absolute; left:280px; top:120px; font-size:34px; letter-spacing:.1em;
             text-transform:uppercase; color:${MUTE} }
  </style></head><body>
    <div class="title">Six throws, bottom to top</div>
    ${rows}
    ${brackets}
    ${icons}
    ${key}
  </body></html>`;
}

const key = process.argv[2];
if (key !== '06') die(`usage: make-hexagram.mjs 06   (got: ${key ?? '(none)'})`);

const outDir = path.join(DECK, 'assets');
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `06-iching-mechanism.png`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  await page.setContent(html(), { waitUntil: 'load' });
  await page.screenshot({ path: out, type: 'png' });
} finally {
  await browser.close();
}

console.log(`\n  The throw — drawn`);
console.log(`    hexagram 48 · The Well · line 6 moving`);
console.log(`    ${path.relative(ROOT, out)}  (${SIZE}×${SIZE})\n`);
