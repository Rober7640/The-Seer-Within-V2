// ring-read-cup — the reveal art for a pick:'symbol' device.
//
//   node scripts/ring-read-cup.mjs <rings.json> <out-dir>
//
// Replaces the ad-hoc run that produced improve-v1/fb-read/images/armb/ on
// 2026-08-31 and was never kept, and supersedes trace-tea-reveals.mjs, whose rings
// are hardcoded to arm A's road/bird/heart across three separate cups.
//
// 🔴 THIS RINGS A CLUSTER. IT DOES NOT DRAW THE SHAPE.
//
// The first attempt at tea traced a gold gull outline and was wrong twice: the line
// floated over bare porcelain, and a drawn bird hands her the answer as a graphic —
// the same mistake as generating a cup with a visible bird in it. The circle says
// LOOK HERE; the seeing stays hers. The copy supplies the symbol, the ring supplies
// the where.
//
// 🔴 THE RINGS BELONG TO ONE PHOTOGRAPH. Re-crop or regenerate the cup and every
// coordinate here is wrong. A stale ring is the one unrecoverable fault: it asks her
// to see something the picture does not contain, and the moment she notices, the
// reading is over.
//
// Gold, not red: red on a dark ground reads as annotation on a photograph. Gold
// reads as sight.

import sharp from 'sharp'
import { mkdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'

const [, , SPEC, OUT] = process.argv
if (!SPEC || !OUT) {
  console.error('usage: node scripts/ring-read-cup.mjs <rings.json> <out-dir>')
  process.exit(2)
}

const spec = JSON.parse(readFileSync(SPEC, 'utf8'))
const CUP = resolve(dirname(SPEC), spec.cup)
const SIZE = spec.size ?? 1254
const CROP = spec.crop ?? 420 // the reveal-strip third the lander crops to
const GOLD = '#E8C27A'
const BONE = '#F5EFE3'
const OPTIONS = ['a', 'b', 'c']

for (const o of OPTIONS) {
  const r = spec.rings?.[o]
  if (!r) {
    console.error(`rings.${o} missing in ${SPEC} — a symbol device needs all three`)
    process.exit(1)
  }
  if (!r.label) {
    console.error(`rings.${o}.label missing — the crop filename carries the symbol name`)
    process.exit(1)
  }
}

// 🔴 THE RING must be inside the photograph. The CROP need only contain it.
//
// The first version of this rule failed whenever a 420-box centred on a ring ran off
// the frame, which rejected marks that were perfectly fine — the Lake on the coffee
// cup sits low on the floor by its nature, and demanding 210px of headroom below it
// is a requirement about the crop box, not about the picture. So the crop slides
// inward instead. What is genuinely unrecoverable is a RING over nothing, and that
// is what is checked.
function ringBox(r) {
  return { l: r.cx - r.rx, t: r.cy - r.ry, right: r.cx + r.rx, bottom: r.cy + r.ry }
}

for (const o of OPTIONS) {
  const r = spec.rings[o]
  const b = ringBox(r)
  if (b.l < 0 || b.t < 0 || b.right > SIZE || b.bottom > SIZE) {
    console.error(
      `ring ${o} (${r.label}) falls outside the ${SIZE}² photograph — ` +
        `x ${Math.round(b.l)}..${Math.round(b.right)}, y ${Math.round(b.t)}..${Math.round(b.bottom)}.\n` +
        `Fix: move the ring inward, or re-crop the cup so the mark sits inside.`,
    )
    process.exit(1)
  }
  if (2 * r.rx > CROP || 2 * r.ry > CROP) {
    console.error(
      `ring ${o} (${r.label}) is ${Math.round(2 * r.rx)}×${Math.round(2 * r.ry)}, ` +
        `larger than the ${CROP}px reveal crop — the reveal would cut the ring in half.\n` +
        `Fix: tighten the ring, or raise "crop" in ${SPEC}.`,
    )
    process.exit(1)
  }
}

// Centre on the ring, then slide inward until the box is on the photograph.
function cropBox(r) {
  const half = CROP / 2
  const left = Math.round(Math.min(Math.max(r.cx - half, 0), SIZE - CROP))
  const top = Math.round(Math.min(Math.max(r.cy - half, 0), SIZE - CROP))
  return { left, top, width: CROP, height: CROP }
}

const ellipse = (r) =>
  `<ellipse cx="${r.cx}" cy="${r.cy}" rx="${r.rx}" ry="${r.ry}"` +
  (r.rot ? ` transform="rotate(${r.rot} ${r.cx} ${r.cy})"` : '') +
  `/>`

// Drawn three times: a wide dark halo so the gold survives on pale porcelain, a soft
// wide gold underneath, then the line. The stacking is what stops it looking like a
// vector pasted on top.
function overlay(shapes, labels = '') {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
       <g fill="none" stroke="#100A06" stroke-width="16" opacity="0.42">${shapes}</g>
       <g fill="none" stroke="${GOLD}" stroke-width="10" opacity="0.24">${shapes}</g>
       <g fill="none" stroke="${GOLD}" stroke-width="5"  opacity="0.96">${shapes}</g>
       ${labels}
     </svg>`,
  )
}

mkdirSync(OUT, { recursive: true })
const all = OPTIONS.map((o) => ellipse(spec.rings[o])).join('')

await sharp(CUP)
  .resize(SIZE, SIZE, { fit: 'cover' })
  .composite([{ input: overlay(all), top: 0, left: 0 }])
  .png()
  .toFile(join(OUT, 'cup-ringed.png'))
console.log('  cup-ringed.png')

// Review only, never served: letters on the picture hand her the answer's location
// before Evelyn has said a word.
const labels = OPTIONS.map((o) => {
  const r = spec.rings[o]
  return `<text x="${r.cx}" y="${r.cy - r.ry - 14}" text-anchor="middle"
             font-family="Georgia, serif" font-size="38" fill="${BONE}"
             stroke="#100A06" stroke-width="6" paint-order="stroke"
          >${o.toUpperCase()}. ${r.label}</text>`
}).join('')
await sharp(CUP)
  .resize(SIZE, SIZE, { fit: 'cover' })
  .composite([{ input: overlay(all, labels), top: 0, left: 0 }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(join(OUT, 'cup-ringed-labelled.jpg'))
console.log('  cup-ringed-labelled.jpg   REVIEW ONLY — never serve')

// One crop per option, each showing ONLY its own ring, so a reveal cannot point at a
// symbol she did not choose.
const crops = []
for (const o of OPTIONS) {
  const r = spec.rings[o]
  const box = cropBox(r)
  // 🔴 TWO PASSES, DELIBERATELY. sharp applies a chained extract BEFORE the
  // composite regardless of the order they are written in, so ringing and cropping
  // in one pipeline silently composites a full-size overlay onto an already-cropped
  // image and throws "Image to composite must have same dimensions or smaller".
  // Ring the whole cup, hand it back as a buffer, then cut.
  const ringed = await sharp(CUP)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .composite([{ input: overlay(ellipse(r)), top: 0, left: 0 }])
    .toBuffer()
  const buf = await sharp(ringed).extract(box).png().toBuffer()
  await sharp(buf).toFile(join(OUT, `reveal-${o}-${r.label}.png`))
  crops.push(buf)
  const slid = box.left !== Math.round(r.cx - CROP / 2) || box.top !== Math.round(r.cy - CROP / 2)
  console.log(`  reveal-${o}-${r.label}.png${slid ? '   (crop slid inward to stay on the photograph)' : ''}`)
}

// SIZE×CROP — three CROP squares in options order. The lander crops it into exact
// thirds by background-position and never inspects the artwork for seams, so the
// dimensions are forced here rather than trusted from the source files.
const strip = join(OUT, 'reveal-strip.jpg')
await sharp({
  create: { width: CROP * 3, height: CROP, channels: 3, background: { r: 10, g: 8, b: 8 } },
})
  .composite(crops.map((input, i) => ({ input, left: i * CROP, top: 0 })))
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(strip)
console.log(
  `  reveal-strip.jpg          ${CROP * 3}x${CROP}  ${Math.round(statSync(strip).size / 1024)} KB`,
)
