#!/usr/bin/env node
// Draw candidate A's mechanism for offer 06 — the fortune-stick canister, with the one stick
// that fell clear, as one image.
//
//   node improve-v1/v1-one-time-BEs/scripts/make-fortune-sticks.mjs kaucim
//
// Workflow: improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md — Phase B, D12. Sibling of
// `make-zodiac-spread.mjs` and `make-tea-cup.mjs`: same job (draw the mechanism from the same
// table the copy is written against), different geometry, because this candidate's mechanism is
// a canister and a fallen stick, not a wheel or a cup.
//
// ⛔ Nothing here is scraped or stock. Same standard as every other mechanism picture in this
// deck: a paid product needs provenance, and every mark below is drawn, not sourced.
//
// ── The device, straight from 06-E2-esl-kaucim.md ──────────────────────────────────────────
//   Thirty-six numbered sticks, kept in a canister. Shaken, not drawn — the motion itself is the
//   point. Exactly one stick falls clear. That stick's number points to a fortune poem, and the
//   poem is the reading. For this candidate: stick seventeen, "the fish is caught, but the net
//   is torn."
//
// This is a two-state picture, not a spread: thirty-five sticks still IN the canister (the
// question not yet asked), and one stick OUT, separated, distinguished (the question that was).
// The picture has exactly one job — show that separation clearly enough to read at an inch.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DECK = path.join(ROOT, 'improve-v1/v1-one-time-BEs');

const SIZE = 2400;
const INK = '#2A2622';
const PAPER = '#FBF8F1';
const ACCENT = '#8B3A1F'; // the fallen stick's tag — the one mark of colour in the picture

// ── deterministic "scatter" — no Math.random(), so re-running produces the identical image ──
// A classic shader-style hash: looks organic, is actually a pure function of the index.
function seeded(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const CANDIDATES = {
  kaucim: {
    stickCount: 36,
    fallenNumber: 17,
    fallenPoem: 'the fish is caught, but the net is torn',
    key: [
      { label: 'IN THE CANISTER', sub: 'thirty-five, kept for what cards won’t answer' },
      { label: 'FALLEN CLEAR', sub: 'No. 17 — the one that answers' },
    ],
  },
};

function die(m) {
  console.error(`\n  ⛔ ${m}\n`);
  process.exit(1);
}

function html(cfg) {
  // Canister geometry — a cylinder seen from a slight angle, tall enough that only one stick
  // can plausibly fall clear of it rather than the whole handful spilling.
  const CX = 950, RIM_Y = 980, MOUTH_RX = 220, MOUTH_RY = 56;
  const BODY_BOTTOM = 1780, BODY_HALF_W = 195;

  // ── sticks still inside the canister ─────────────────────────────────────────────────────
  // Positioned across the mouth, heights and tilt varied by the seeded hash so the bundle reads
  // as a real handful rather than a printed row.
  const inside = cfg.stickCount - 1;
  const sticks = Array.from({ length: inside }, (_, i) => {
    const t = i / (inside - 1); // 0..1 across the mouth
    const x = CX - MOUTH_RX * 0.82 + t * MOUTH_RX * 1.64;
    const jitter = seeded(i) - 0.5;
    const topY = RIM_Y - 260 - seeded(i + 50) * 420; // how far each stick pokes up
    const tilt = jitter * 7; // degrees — a real handful is never perfectly vertical
    return `<g transform="rotate(${tilt.toFixed(2)} ${x.toFixed(1)} ${RIM_Y})">
      <rect x="${(x - 6).toFixed(1)}" y="${topY.toFixed(1)}" width="12"
            height="${(RIM_Y - topY + 40).toFixed(1)}" rx="5" fill="${INK}"/>
    </g>`;
  }).join('');

  // ── the canister body ─────────────────────────────────────────────────────────────────────
  const canister = `
    <path d="M${CX - BODY_HALF_W},${RIM_Y} L${CX - BODY_HALF_W + 30},${BODY_BOTTOM}
             Q${CX},${BODY_BOTTOM + 46} ${CX + BODY_HALF_W - 30},${BODY_BOTTOM}
             L${CX + BODY_HALF_W},${RIM_Y}"
          fill="${PAPER}" stroke="${INK}" stroke-width="7"/>
    <ellipse cx="${CX}" cy="${RIM_Y}" rx="${MOUTH_RX}" ry="${MOUTH_RY}"
             fill="${PAPER}" stroke="${INK}" stroke-width="7"/>
    <path d="M${CX - MOUTH_RX},${RIM_Y} A${MOUTH_RX},${MOUTH_RY} 0 0 0 ${CX + MOUTH_RX},${RIM_Y}"
          fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="4 10" opacity="0.5"/>`;

  // ── the fallen stick — separated, on the table, its own label ───────────────────────────────
  const fx1 = 1520, fy1 = 1980, fx2 = 2080, fy2 = 1760;
  const fallen = `
    <line x1="${fx1}" y1="${fy1}" x2="${fx2}" y2="${fy2}" stroke="${INK}" stroke-width="14"
          stroke-linecap="round"/>
    <circle cx="${fx2}" cy="${fy2}" r="46" fill="${PAPER}" stroke="${ACCENT}" stroke-width="6"/>
    <text x="${fx2}" y="${fy2 + 17}" text-anchor="middle" font-size="40" font-weight="700"
          fill="${ACCENT}" font-family="Georgia,'Times New Roman',serif">${cfg.fallenNumber}</text>`;

  // A faint dashed line from the canister's mouth to the fallen stick — the one thing this
  // picture has to say wordlessly: it came FROM there, and it is now separate.
  const path = `
    <path d="M${CX + MOUTH_RX - 30},${RIM_Y + 10} Q${(CX + fx1) / 2},${(RIM_Y + fy1) / 2 + 120}
             ${fx1 - 40},${fy1 - 20}"
          fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="2 18" opacity="0.4"/>`;

  const keyRows = cfg.key
    .map((k) => `<div class="keyrow"><i></i><b>${k.label}</b><span>${k.sub}</span></div>`)
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing:border-box; margin:0; padding:0 }
    body { width:${SIZE}px; height:${SIZE}px; position:relative; background:${PAPER};
           font-family: Georgia,'Times New Roman',serif; color:${INK} }
    svg.plate { position:absolute; inset:0 }
    .caption { position:absolute; left:${fx1 - 40}px; top:${fy1 + 60}px; width:640px }
    .caption b { display:block; font-size:30px; letter-spacing:.04em }
    .caption span { display:block; margin-top:8px; font-size:26px; font-style:italic;
                    color:#6E6459 }
    .canlabel { position:absolute; left:${CX - 350}px; top:130px; width:700px;
                text-align:center }
    .canlabel b { display:block; font-size:28px; letter-spacing:.1em; text-transform:uppercase;
                  color:#8A7F70 }
    .key { position:absolute; left:96px; bottom:96px; width:660px }
    .keyhead { display:block; font-size:26px; letter-spacing:.14em; text-transform:uppercase;
               color:#8A7F70; padding-bottom:14px; border-bottom:2px solid #DDD5C4 }
    .keyrow { display:flex; align-items:baseline; gap:14px; margin-top:16px }
    .keyrow i { width:34px; height:0; border-top:2px dashed #C9BFA8; flex:none;
                transform:translateY(-8px) }
    .keyrow b { font-size:24px; letter-spacing:.08em; white-space:nowrap }
    .keyrow span { font-size:21px; font-style:italic; color:#6E6459 }
  </style></head><body>
    <svg class="plate" width="${SIZE}" height="${SIZE}">
      ${path}
      ${canister}
      ${sticks}
      ${fallen}
    </svg>
    <div class="canlabel"><b>Thirty-six, shaken — not drawn</b></div>
    <div class="caption">
      <b>No. ${cfg.fallenNumber}</b>
      <span>&ldquo;${cfg.fallenPoem}&rdquo;</span>
    </div>
    <div class="key">
      <b class="keyhead">Reading the sticks</b>
      ${keyRows}
    </div>
  </body></html>`;
}

const key = process.argv[2];
const cfg = CANDIDATES[key];
if (!cfg) die(`usage: make-fortune-sticks.mjs <candidate>   (have: ${Object.keys(CANDIDATES).join(', ')})`);

const outDir = path.join(DECK, 'assets');
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `06-${key}-mechanism.png`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  await page.setContent(html(cfg), { waitUntil: 'load' });
  await page.screenshot({ path: out, type: 'png' });
} finally {
  await browser.close();
}

console.log(`\n  The canister — drawn`);
console.log(`    36 sticks — 35 still in, one fallen clear (No. ${cfg.fallenNumber})`);
console.log(`    ${path.relative(ROOT, out)}  (${SIZE}×${SIZE})\n`);
