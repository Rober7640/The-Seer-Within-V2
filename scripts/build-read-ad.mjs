// build-read-ad — compose the /fb-read Facebook ad from the arm-B cup.
//
//   npx tsx scripts/build-read-ad.mjs [hook] [--out <dir>]
//
// 🔴 THE HEADLINE IS NOT WRITTEN HERE. It is imported from HEADLINES in
// shared/readDevices.ts — the same string the lander renders. The ad question and
// the lander question must be the same words, because the lander's second beat
// echoes the ad back to her; if they drift she is answered for a question she was
// never asked. Importing removes the possibility rather than warning about it.
//
// 🔴 AND THE TEXT IS SET IN CODE, NOT GENERATED. Codex made the photograph, which
// is the part it is good at. Type baked into an image generation cannot be edited
// afterwards — a wording change means regenerating, which means losing the cup
// that was measured and picked. Real type over a fixed photograph means the
// question can change a hundred times and the picture never moves.

import sharp from 'sharp'
import { mkdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { HEADLINES, READ_HOOKS, DEVICES } from '../shared/readDevices.ts'

const CUP = 'improve-v1/fb-read/images/armb/cup.png'
const argHook = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'love-again'
// --sub lets a candidate subheadline be tried without editing the registry. With
// no override the ad uses the lander's own instruction, so the words under the
// question in the feed are the words above the buttons on the page.
const subAt = process.argv.indexOf('--sub')
const SUB_OVERRIDE = subAt > -1 ? process.argv[subAt + 1] : null
const outAt = process.argv.indexOf('--out')
const OUT = outAt > -1 ? process.argv[outAt + 1] : 'improve-v1/fb-read/images/armb/ads'

if (!READ_HOOKS.includes(argHook)) {
  console.error(`unknown hook "${argHook}". known: ${READ_HOOKS.join(', ')}`)
  process.exit(2)
}
if (!existsSync(CUP)) {
  console.error(`missing ${CUP}`)
  process.exit(1)
}

// Meta feed placements, and only these two. 9:16 was built and dropped: a story
// crop of a square photograph either clips the cup's own rim or needs the cup
// pasted over an invented velvet ground, and neither is worth it for a placement
// this funnel does not buy.
const SIZES = [
  { w: 1080, h: 1350, name: 'portrait', note: 'feed 4:5 — the primary' },
  { w: 1080, h: 1080, name: 'square', note: 'feed 1:1' },
]

const BONE = '#F2E9DA'
const GOLD = '#E8C27A'
const LETTER = { a: 'A', b: 'B', c: 'C' }

// 🔴 THE AD CARRIES THE CHOICE, NOT JUST THE QUESTION. A cup and a question is a
// picture to scroll past; a cup, a question and three lettered options is a quiz
// she has already started answering in her head, and the tap is her finishing it.
// The lander then opens on the same three names in the same order, so nothing she
// decided in the feed has to be decided again.
//
// The options are a plain row and are NEVER placed over the regions they belong
// to. Pointing A at a spot in the cup hands her the answer's location before
// Evelyn has said a word, which is the same mistake as generating a cup with a
// visible bird in it.
const DEVICE = DEVICES.tea

// Wrap by estimated advance width. Playfair Display averages a little under half
// the point size per character at this weight.
function wrap(text, fontSize, maxWidth) {
  const perChar = fontSize * 0.47
  const maxChars = Math.max(8, Math.floor(maxWidth / perChar))
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (next.length > maxChars && line) {
      lines.push(line)
      line = w
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

mkdirSync(OUT, { recursive: true })
const headline = HEADLINES[argHook]
console.log(`\n  "${headline}"   (${argHook})\n`)

for (const size of SIZES) {
  const { w, h } = size

  // Both sizes cover-fill cleanly from the square master. At 4:5 the crop takes
  // 135px off each side and the cup — which spans x 278–998 of 1254 — lands at
  // x 164–940 inside a 1080 frame, so it is never clipped. Worth stating, because
  // the obvious worry with a square source is that the crop eats the subject.
  const base = await sharp(CUP).resize(w, h, { fit: 'cover', position: 'centre' }).toBuffer()

  // Type scales with the frame, then is capped so a long question never crowds
  // the cup.
  const fontSize = Math.round(Math.min(w * 0.088, h * 0.072))
  const margin = Math.round(w * 0.085)
  const lines = wrap(headline, fontSize, w - margin * 2)
  const lineHeight = Math.round(fontSize * 1.16)
  const blockTop = Math.round(h * 0.085)
  const scrimH0 = blockTop + lines.length * lineHeight + fontSize * 0.9

  // The SUBHEADLINE. Without it the ad shows a question and three loose words and
  // never says what the words are for — she has to infer that the picture is a
  // quiz. This is the line that makes the options mean something.
  const sub = SUB_OVERRIDE ?? DEVICE.instruction
  const subFont = Math.round(fontSize * 0.42)
  const subLines = wrap(sub, subFont, w - margin * 2.4)
  const subLineHeight = Math.round(subFont * 1.32)
  const subTop = blockTop + lines.length * lineHeight + Math.round(fontSize * 0.62)
  const subSpans = subLines
    .map((l, i) => `<tspan x="${w / 2}" y="${subTop + subFont + i * subLineHeight}">${esc(l)}</tspan>`)
    .join('')

  const tspans = lines
    .map((l, i) => `<tspan x="${w / 2}" y="${blockTop + fontSize + i * lineHeight}">${esc(l)}</tspan>`)
    .join('')

  // The options row, along the bottom, under the cup.
  const optFont = Math.round(w * 0.046)
  const optY = Math.round(h - h * 0.085)
  const opts = DEVICE.options
  // Inset the row, or the outer two options sit almost on the frame edge.
  const optPad = Math.round(w * 0.06)
  const colW = (w - optPad * 2) / opts.length
  const optRow = opts
    .map((o, i) => {
      const cx = optPad + colW * i + colW / 2
      const name = DEVICE.optionLabel?.[o] ?? String(o).toUpperCase()
      return `<text x="${cx}" y="${optY}" text-anchor="middle"
                 font-family="Playfair Display, Georgia, serif" font-size="${optFont}" fill="${BONE}">
                <tspan fill="${GOLD}">${LETTER[o]}.</tspan><tspan dx="${optFont * 0.30}">${esc(name)}</tspan>
              </text>`
    })
    .join('')
  const footScrimH = Math.round(h * 0.22)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#0B0705" stop-opacity="0.82"/>
        <stop offset="62%"  stop-color="#0B0705" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#0B0705" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="foot" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%"   stop-color="#0B0705" stop-opacity="0.90"/>
        <stop offset="55%"  stop-color="#0B0705" stop-opacity="0.62"/>
        <stop offset="100%" stop-color="#0B0705" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${w}" height="${Math.round(scrimH0 + subLines.length * subLineHeight + subFont * 1.4)}" fill="url(#scrim)"/>
    <rect x="0" y="${h - footScrimH}" width="${w}" height="${footScrimH}" fill="url(#foot)"/>
    <text text-anchor="middle" font-family="Playfair Display, Georgia, serif"
          font-size="${fontSize}" font-weight="500" fill="${BONE}"
          letter-spacing="-0.5">${tspans}</text>
    <text text-anchor="middle" font-family="Playfair Display, Georgia, serif"
          font-size="${subFont}" font-style="italic" fill="${GOLD}"
          opacity="0.92">${subSpans}</text>
    ${optRow}
  </svg>`

  const file = join(OUT, `${argHook}-${w}x${h}.jpg`)
  await sharp(base)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(file)

  console.log(
    `  ${size.name.padEnd(9)} ${String(w).padStart(4)}x${String(h).padEnd(5)} ` +
      `${String(Math.round(statSync(file).size / 1024)).padStart(4)} KB  ${lines.length} line${lines.length === 1 ? '' : 's'}  ${size.note}`,
  )
}
console.log(`\n  -> ${OUT}\n`)
