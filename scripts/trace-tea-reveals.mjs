// trace-tea-reveals — turn the ambiguous cups into the versions Evelyn hands back.
//
//   node scripts/trace-tea-reveals.mjs <art-dir>
//   reads  <art>/tea-{a,b,c}.png   writes  <art>/tea-{a,b,c}-reveal.png
//
// 🔴 THIS RINGS A CLUSTER. IT DOES NOT DRAW THE SHAPE.
//
// The first attempt traced a gull outline in gold, and it was wrong twice: the
// line floated over bare porcelain, and a drawn bird hands her the answer as a
// graphic — the same mistake as the obvious-symbol cups it was meant to fix.
//
// The operator's reference photograph of a real reading does something different
// and better: a reader had ringed seven ordinary clumps in red pen and numbered
// them. Nothing inside those rings is inherently a bird or a ring or an anchor.
// The circle says LOOK HERE; the seeing is still hers. That is tasseography —
// "very much like a Rorschach ink-blot test", where one person sees an egg and
// another a beetle in the same spot.
//
// So each ring below encircles leaf that is genuinely present, in the region the
// copy names. The copy supplies the bird; the ring supplies the where; she does
// the seeing. Ring empty porcelain and the whole thing collapses — that is worse
// than the obvious version, because it asks her to see nothing.
//
// Gold, not the reference's red pen: red on crimson velvet reads as annotation on
// a photograph. Gold reads as sight.

import sharp from 'sharp'

const ART = process.argv[2]
if (!ART) {
  console.error('usage: node scripts/trace-tea-reveals.mjs <art-dir>')
  process.exit(2)
}

const SIZE = 1254
const GOLD = '#E8C27A'

// Placed by eye over the actual photographs, each one centred on a real cluster
// in the region the reading names. Re-check these after any re-shoot — the leaves
// land somewhere new every time, and a stale ring is the one unrecoverable fault.
const RINGS = {
  // "a road of leaves running from the middle out to the rim" — elongated, so it
  // reads as a path rather than a spot, and angled along the band that is there.
  a: `<ellipse cx="520" cy="470" rx="215" ry="92" transform="rotate(-57 520 470)"/>`,
  // "a bird near the rim, on the far side from the handle" — the handle sits lower
  // right, so the far side is upper left.
  b: `<ellipse cx="352" cy="447" rx="152" ry="126" transform="rotate(-18 352 447)"/>`,
  // "a heart low near the middle, on the handle side" — low, and to the right.
  c: `<ellipse cx="722" cy="762" rx="163" ry="141" transform="rotate(12 722 762)"/>`,
}

function overlay(shape) {
  // Drawn three times: a wide dark halo so the gold survives on pale porcelain, a
  // soft wide gold underneath, then the line itself. The stacking is what stops it
  // looking like a vector pasted on top.
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
       <g fill="none" stroke="#0E0906" stroke-width="18" opacity="0.34">${shape}</g>
       <g fill="none" stroke="${GOLD}" stroke-width="12" opacity="0.22">${shape}</g>
       <g fill="none" stroke="${GOLD}" stroke-width="5"  opacity="0.95">${shape}</g>
     </svg>`,
  )
}

for (const [opt, shape] of Object.entries(RINGS)) {
  const out = `${ART}/tea-${opt}-reveal.png`
  await sharp(`${ART}/tea-${opt}.png`)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .composite([{ input: overlay(shape), top: 0, left: 0 }])
    .png()
    .toFile(out)
  console.log(`  tea-${opt}-reveal.png  ringed`)
}
