// compose-read-strips — panel images -> the 1080x360 strips the lander crops.
//
// The lander slices each strip into exact thirds and makes each third a tap
// target; it never inspects the artwork to find the seams. Composing from three
// equal squares is what guarantees the taps land on the panels they belong to,
// so the panel size is forced here rather than trusted from the source files.
//
//   npx tsx scripts/compose-read-strips.mjs <art-dir> <out-dir>
//
// Reads  <art-dir>/<device>-{a,b,c}.png         -> <out>/<device>-strip.jpg
// and    <art-dir>/<device>-{a,b,c}-reveal.png  -> <out>/<device>-reveal-strip.jpg
//
// 🔴 THE REVEAL STRIP IS OPTIONAL AND ONLY TEA HAS ONE. Tea-leaf reading is a
// Rorschach — the shapes are ambiguous on purpose — so the lander's cups are
// genuine scatter with nothing nameable in them, and the reveal strip is the same
// three cups with the shape traced, shown in the chat while Evelyn names it. A
// candle or a dream has nothing hidden to uncover, so neither has a reveal.
// See improve-v1/fb-read/tea-leaf-reading-findings.md.

import sharp from 'sharp'
import { DEVICE_IDS } from '../shared/readDevices.ts'
import { mkdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ART = process.argv[2]
const OUT = process.argv[3]
if (!ART || !OUT) {
  console.error('usage: npx tsx scripts/compose-read-strips.mjs <art-dir> <out-dir>')
  process.exit(2)
}

const PANEL = 360
const GROUND = { r: 10, g: 8, b: 8 }
// 🔴 DERIVED, NOT TYPED. A hand-kept device list is the drift this whole funnel is
// built to make impossible, and one had quietly grown here. `candle` is drawn but
// unwired, so it is not in DEVICE_IDS — it is named separately as art that exists
// AHEAD of its registry entry, which is a different thing from a roster.
//
// Importing a .ts module means this now runs under tsx, not bare node.
const UNWIRED = ['candle']
const DEVICES = [...new Set([...DEVICE_IDS, ...UNWIRED])]
const OPTIONS = ['a', 'b', 'c']
// Photographs, so JPEG. The 90 KB PNG ceiling was for flat vector art; these are
// full-frame photos and compress on entirely different terms.
const QUALITY = 86

mkdirSync(OUT, { recursive: true })
let failed = 0

async function compose(device, suffix, outName) {
  const panels = OPTIONS.map((o) => join(ART, `${device}-${o}${suffix}.png`))
  if (!panels.every(existsSync)) return false

  const squares = await Promise.all(
    panels.map((p) => sharp(p).resize(PANEL, PANEL, { fit: 'cover' }).toBuffer()),
  )
  const out = join(OUT, outName)
  await sharp({
    create: { width: PANEL * 3, height: PANEL, channels: 3, background: GROUND },
  })
    .composite(squares.map((input, i) => ({ input, left: i * PANEL, top: 0 })))
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(out)

  console.log(`  ${outName.padEnd(26)} ${PANEL * 3}x${PANEL}  ${Math.round(statSync(out).size / 1024)} KB`)
  return true
}

for (const device of DEVICES) {
  try {
    const built = await compose(device, '', `${device}-strip.jpg`)
    if (!built) {
      console.log(`  ${device.padEnd(26)} skipped — panels not present`)
      continue
    }
    // Absent for every device but tea, and that absence is meaningful, not a gap.
    await compose(device, '-reveal', `${device}-reveal-strip.jpg`)
  } catch (err) {
    console.log(`  ${device.padEnd(26)} FAIL  ${err.message}`)
    failed++
  }
}

process.exit(failed ? 1 : 0)
