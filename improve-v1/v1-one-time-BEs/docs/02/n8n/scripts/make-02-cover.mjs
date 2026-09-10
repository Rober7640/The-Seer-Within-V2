/**
 * Draw 02's cover: the zodiac wheel, twelve cards, every one of them face-down.
 *
 *   node improve-v1/v1-one-time-BEs/docs/02/n8n/scripts/make-02-cover.mjs
 *
 * 🔴 TWELVE FACE-DOWN, NOT THREE-UP-AND-NINE-DOWN (operator, 2026-09-08). The offer is now
 *    TWELVE NEW CARDS — her three are never re-laid — so a cover showing the World, the Lovers
 *    and the Tower face-up in the wheel says the opposite of what the product does, and it says
 *    it on page one before she has read a word. Its old strapline, "Three you have seen. Nine
 *    you have not", was false the moment that decision was made.
 *
 * ⭐ WHY IT IS GENERIC, AND WHY THAT IS THE POINT. The product is one PDF per buyer but the
 *    cover cannot be — rendering a personal wheel would mean a per-order image pipeline for a
 *    page nobody reads twice. So the cover shows only what is TRUE FOR EVERY BUYER: twelve
 *    cards, laid, none of them turned over yet. Nothing on it claims anything at all.
 *
 * ⛔ NO HOUSE NUMBERS AND NO ROOM NAMES. That is the whole reason this works. The previous
 *    cover (make-zodiac-spread.mjs) labelled every seat with a house AND a card, drawn from the
 *    original hand-written twelve — so on a generated reading the picture disagreed with the
 *    words on every page. That script's own header warns about it: "the picture is what she
 *    believes". Face-down cards make no claim, so they cannot be wrong.
 *
 * ⛔ Geometry lifted from make-zodiac-spread.mjs unchanged: position 1 at NINE o'clock running
 *    ANTI-CLOCKWISE. Cards are never rotated.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../..');
const CARDS = path.join(ROOT, 'assets/tarot-rws');
// ⛔ IN THE REPO, NOT IN /tmp. It lived in /tmp and would have vanished on the next reboot,
//    taking the only way to rebuild the cover with it.
const BACK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../assets/02-card-back.jpg');
const OUT = path.join(ROOT, 'improve-v1/v1-one-time-BEs/assets/02-cover-generic.png');

const uri = (f, mime) => `data:${mime};base64,${readFileSync(f).toString('base64')}`;
if (!existsSync(BACK)) throw new Error('no card back at ' + BACK);
const back = uri(BACK, 'image/jpeg');

// ⛔ NOTHING IS FACE-UP. Twelve new cards are dealt per buyer, so any card shown here would be
//    a claim about a spread this image cannot see. A face-down card makes no claim, so it cannot
//    contradict a draw — which is the same reason the house labels came off the old wheel.
const REVEALED = {};

const SIZE = 2400, R = SIZE / 2, CARD_W = 200, CARD_H = Math.round((600 / 350) * CARD_W);
const RING = R - CARD_H / 2 - 150;

const seats = Array.from({ length: 12 }, (_, i) => {
  const rad = ((180 + i * 30) * Math.PI) / 180;
  const slug = REVEALED[i + 1];
  return {
    cx: R + RING * Math.cos(rad), cy: R - RING * Math.sin(rad),
    src: slug ? uri(path.join(CARDS, slug + '.png'), 'image/png') : back,
    face: !!slug,
  };
});
const spokes = seats.map((_, i) => {
  const rad = ((165 + i * 30) * Math.PI) / 180, inner = 250, outer = R - 44;
  return `<line x1="${R + inner * Math.cos(rad)}" y1="${R - inner * Math.sin(rad)}"
                x2="${R + outer * Math.cos(rad)}" y2="${R - outer * Math.sin(rad)}"
                stroke="#C9BFA8" stroke-width="2"/>`;
}).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size:${SIZE}px ${SIZE}px; margin:0 }
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:${SIZE}px;height:${SIZE}px;position:relative;background:#FBF8F1;
       font-family:Georgia,'Times New Roman',serif;color:#2A2622}
  svg{position:absolute;inset:0}
  .seat{position:absolute;transform:translate(-50%,-50%);width:${CARD_W}px}
  .seat img{display:block;width:${CARD_W}px;height:${CARD_H}px;border:3px solid #2A2622;
            box-shadow:0 6px 18px rgba(42,38,34,.22)}
  .seat.down img{opacity:.97}
  .core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
        width:640px;text-align:center}
  .core h1{font-size:96px;line-height:1.04;font-weight:700;letter-spacing:-.015em}
  .core p{margin-top:24px;font-size:34px;font-style:italic;color:#6E6459}
  .core .sig{margin-top:34px;font-size:22px;letter-spacing:.1em;text-transform:uppercase;
             color:#8A7F70}
</style></head><body>
  <svg width="${SIZE}" height="${SIZE}">
    <circle cx="${R}" cy="${R}" r="${R - 44}" fill="none" stroke="#2A2622" stroke-width="4"/>
    <circle cx="${R}" cy="${R}" r="${R - 60}" fill="none" stroke="#C9BFA8" stroke-width="2"/>
    <circle cx="${R}" cy="${R}" r="250" fill="none" stroke="#2A2622" stroke-width="3"/>
    ${spokes}
  </svg>
  ${seats.map((s) => `<div class="seat ${s.face ? 'up' : 'down'}"
      style="left:${s.cx}px;top:${s.cy}px"><img src="${s.src}" alt=""></div>`).join('')}
  <div class="core">
    <h1>Your twelve<br>are laid</h1>
    <!-- ⛔ ONE LINE. The core is 640px wide but the inner circle is only 500px across, so a
         strapline that wraps spills past the ring and across the spokes. Keep it to about
         the length of the line it replaced (38 characters) or shorten the type. -->
    <p>Twelve new cards, one to each room.</p>
    <div class="sig">Evelyn Cross &middot; The Seer Within</div>
  </div>
</body></html>`;

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: SIZE, height: SIZE } });
await pg.setContent(html, { waitUntil: 'networkidle' });
const broken = await pg.evaluate(() =>
  [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).length);
await pg.screenshot({ path: OUT });
await b.close();
console.log(`  ${path.relative(ROOT, OUT)} — ${SIZE}×${SIZE}, broken images: ${broken}`);
