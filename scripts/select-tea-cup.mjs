// select-tea-cup — measure candidate cup photographs and pick one, with reasons.
//
//   node scripts/select-tea-cup.mjs <candidates-dir> [--out <dir>] [--debug] [--json <file>]
//
// 🔴 WHY THIS EXISTS. The first pass at this was "generate one cup, look at it,
// hope". That is a bet, not a method: generation is cheap and MY judgement of it is
// the bottleneck, so the fix is to generate several and select mechanically before
// looking — otherwise I rationalise a weak candidate because I am tired of
// regenerating.
//
// It also judges at the RIGHT SCALE. A region that looks fine on the whole cup can
// be flat mush at 4x, and 4x is the only scale she ever sees it at, because the
// chat shows a zoomed crop. So every measurement here is taken on the region as
// cropped, not on the cup as a whole.
//
// WHAT IT DOES NOT DO: decide whether a shape is "findable". No pixel measure can
// tell you that. It removes the candidates that CANNOT work — too sparse to ring
// honestly, a solid mass with no structure, all the leaf in one place — and hands
// the survivors to a human with the crops already cut. Machine rejects, human picks.

import sharp from 'sharp'
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, basename, extname } from 'node:path'

const DIR = process.argv[2]
// indexOf returns -1 when the flag is absent, and argv[-1 + 1] is argv[0] — the
// node binary. Guard it, or the script tries to mkdir over your Node install.
const outAt = process.argv.indexOf('--out')
const OUT = outAt > -1 ? process.argv[outAt + 1] : join(DIR || '.', 'selection')
const DEBUG = process.argv.includes('--debug')
const VERBOSE = process.argv.includes('--verbose')
// Where the clusters ARE, in the coordinates of the original photograph. The step
// after selection draws a ring on each one and cuts the zoom the chat shows, and
// re-finding them by eye is how a stale ring gets shipped — the one unrecoverable
// fault in the art brief.
const jsonAt = process.argv.indexOf('--json')
const JSON_OUT = jsonAt > -1 ? process.argv[jsonAt + 1] : null
if (!DIR) {
  console.error('usage: node scripts/select-tea-cup.mjs <candidates-dir> [--out <dir>] [--debug] [--json <file>]')
  process.exit(2)
}

const N = 900 // analysis resolution; the source photos are ~1254²
const GRID = 14 // cells across the cup — ~64px each, close to a ringable region
// px of the original photo a reveal crop covers. This is a PRODUCT decision — how
// much of the cup the chat shows beside the reading — and it drives the geometry
// of everything below, because two reveals must not show the same leaves.
//
// 🔴 WAS 420, WHICH WAS NOT A ZOOM. The cup is about 850px across in a 1254px
// photograph, so a 420px crop showed HALF THE CUP. Three of those cannot be placed
// far apart inside one cup while all three sit on leaf, and arm B needs exactly
// that. It is also barely magnified, which is the complaint the chat art already
// had. Round 3, changing nothing but this number: 0/5 usable at 420, 0/5 at 360,
// 3/5 at 300 — and at 300 every crop landed 96–100% ON the cup instead of 79%.
// The round-1 candidates improve on the same measure. 300 it is.
//
// `--zoom` overrides it, and exists so a change like that is tested before it is
// adopted rather than tuned until something passes.
const zoomAt = process.argv.indexOf('--zoom')
const ZOOM = zoomAt > -1 ? Number(process.argv[zoomAt + 1]) : 300

// Selection thresholds. Set BEFORE looking at any candidate, deliberately, so a
// weak one cannot be argued into passing later.
const LIMITS = {
  cellLeafMin: 0.10, // below this a region is too bare to ring honestly
  cellLeafMax: 0.62, // above this it is a solid mass with no structure to read
  clustersNeeded: 3,
  minSeparation: 0.30, // as a fraction of cup radius — a floor only; the CROP width
  //                       is the real constraint, see pickClusters
  interiorLeafMin: 0.06, // a near-empty cup cannot carry three regions at all
  interiorLeafMax: 0.42, // a drowned cup has nothing but mass
  // 🔴 THE CROP IS SEVEN TIMES THE CELL, and the first version never checked it.
  // A grid cell is about 60px of the original photograph; the reveal crop she is
  // shown is 420px. So "the densest cell in the cup" could sit in a crop that is
  // otherwise bare porcelain — and it did: one candidate's middle crop came back
  // as an almost empty cup wall. Ringing bare porcelain asks her to see nothing,
  // which the art brief calls the one unrecoverable fault, so the crop itself is
  // now measured too.
  //
  // The floor is geometric, not fitted. A ring drawn at a third of the crop's
  // width covers about 8.7% of the crop's area, so 8% is "at least a ring's worth
  // of leaf is actually in there".
  windowLeafMin: 0.08,
  // …and the crop must be looking at the cup rather than at the tablecloth. Below
  // this it is mostly velvet, and velvet is dark, so it would otherwise score as
  // leaf and pass.
  windowInCupMin: 0.60,
}

const files = readdirSync(DIR)
  .filter((f) => /\.(png|jpe?g)$/i.test(f) && !f.includes('-zoom') && !f.includes('-reveal'))
  .sort()
if (!files.length) {
  console.error(`no candidate images in ${DIR}`)
  process.exit(1)
}
mkdirSync(OUT, { recursive: true })

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b

// Find the cup.
//
// 🔴 THE FIRST VERSION OF THIS MEASURED THE WRONG CIRCLE, and every number it
// printed inherited the error. It thresholded brightness at a fixed 110 and took
// the BOUNDING BOX of everything above it. Lit crimson velvet clears 110. So on
// every one of these shots — the light is a low tungsten lamp from the upper left,
// by design — the bright fold of velvet in the top-left corner pinned the box at
// x=0, y=0, and the "cup" came out shifted a tenth of the frame off-centre and too
// large. Velvet then sat inside the analysed circle, and velvet is dark, so it
// scored as LEAF: interior coverage was inflated, cluster positions were wrong,
// and the crops it cut for a human to judge were centred on background.
//
// It is fixed by identity rather than by a better cutoff: the cup is the largest
// connected bright REGION, not the extremes of a brightness test. Take the biggest
// component, fill the leaves back in (they are dark holes in it), and read the
// centre and radius off its area. The handle adds a few percent of area and a
// couple of percent of radius, which a square root absorbs.
function findCup(px, w, h) {
  // Adaptive cut. Porcelain is the brightest large thing in frame, but how bright
  // depends on the render, so anchor the cut to the image's own top end.
  const sample = []
  for (let y = 0; y < h; y += 4) {
    for (let x = 0; x < w; x += 4) {
      const i = (y * w + x) * 3
      sample.push(lum(px[i], px[i + 1], px[i + 2]))
    }
  }
  sample.sort((a, b) => a - b)
  const p98 = sample[Math.floor(sample.length * 0.98)] ?? 255
  const cut = Math.max(110, p98 * 0.62)

  const mask = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      if (lum(px[i], px[i + 1], px[i + 2]) > cut) mask[y * w + x] = 1
    }
  }

  // Largest connected component of bright pixels.
  const seen = new Uint8Array(w * h)
  const queue = new Int32Array(w * h)
  let best = null
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || seen[start]) continue
    let head = 0, tail = 0, area = 0
    let minX = w, minY = h, maxX = 0, maxY = 0
    queue[tail++] = start
    seen[start] = 1
    while (head < tail) {
      const p = queue[head++]
      const x = p % w, y = (p / w) | 0
      area++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (x > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; queue[tail++] = p - 1 }
      if (x < w - 1 && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; queue[tail++] = p + 1 }
      if (y > 0 && mask[p - w] && !seen[p - w]) { seen[p - w] = 1; queue[tail++] = p - w }
      if (y < h - 1 && mask[p + w] && !seen[p + w]) { seen[p + w] = 1; queue[tail++] = p + w }
    }
    if (!best || area > best.area) best = { area, minX, minY, maxX, maxY, root: start }
  }
  if (!best || best.area < w * h * 0.05) return null

  // Fill the holes. The leaves are dark, so they punch out of the bright mask;
  // left unfilled, a heavily-leafed cup measures as a smaller cup.
  //
  // 🔴 NOT BY FLOOD FILL FROM THE OUTSIDE. That was tried and it leaked. A trail
  // of leaves that reaches the rim — which is exactly what the road formation is
  // meant to do — opens a dark channel from the interior straight out to the
  // background, the fill pours through it, and most of the cup gets marked as
  // outside. The cup then measured two thirds of its real radius, sat off-centre,
  // and two of the three formations fell outside the analysed circle and were
  // never seen. The script reported "only 1 usable region" for a cup that plainly
  // had three.
  //
  // Scanline fill instead: in each row, everything between the first and last
  // bright pixel is inside; likewise each column; take the intersection. A channel
  // to the edge cannot defeat it, because it never travels. The handle survives as
  // a small spur, worth about two per cent of the area and one per cent of the
  // radius, which the square root below absorbs.
  const { minX, minY, maxX, maxY } = best
  const bw = maxX - minX + 1, bh = maxY - minY + 1
  const rowFill = new Uint8Array(bw * bh)
  const colFill = new Uint8Array(bw * bh)
  for (let by = 0; by < bh; by++) {
    let first = -1, last = -1
    for (let bx = 0; bx < bw; bx++) {
      if (mask[(by + minY) * w + (bx + minX)]) { if (first < 0) first = bx; last = bx }
    }
    for (let bx = first; bx >= 0 && bx <= last; bx++) rowFill[by * bw + bx] = 1
  }
  for (let bx = 0; bx < bw; bx++) {
    let first = -1, last = -1
    for (let by = 0; by < bh; by++) {
      if (mask[(by + minY) * w + (bx + minX)]) { if (first < 0) first = by; last = by }
    }
    for (let by = first; by >= 0 && by <= last; by++) colFill[by * bw + bx] = 1
  }

  let area = 0, sx = 0, sy = 0
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      if (!rowFill[by * bw + bx] || !colFill[by * bw + bx]) continue
      area++
      sx += bx + minX
      sy += by + minY
    }
  }
  if (!area) return null

  const rOuter = Math.sqrt(area / Math.PI)
  return {
    cx: sx / area,
    cy: sy / area,
    rOuter,
    // Inset off the outer edge: the rim and the handle both sit outside the
    // readable interior, and a ring drawn on the rim is not a reading.
    r: rOuter * 0.82,
  }
}

// Leaf is dark against porcelain. An ADAPTIVE threshold, not a fixed one, because
// exposure varies between renders and a fixed cutoff silently scores a dim cup as
// leaf-covered.
function leafThreshold(px, w, cup) {
  const inside = []
  for (let y = cup.cy - cup.r; y < cup.cy + cup.r; y += 3) {
    for (let x = cup.cx - cup.r; x < cup.cx + cup.r; x += 3) {
      if ((x - cup.cx) ** 2 + (y - cup.cy) ** 2 > cup.r ** 2) continue
      const i = ((y | 0) * w + (x | 0)) * 3
      inside.push(lum(px[i], px[i + 1], px[i + 2]))
    }
  }
  inside.sort((a, b) => a - b)
  const median = inside[(inside.length / 2) | 0] ?? 128
  return { cut: median * 0.66, samples: inside.length }
}

function analyse(px, w, h, cup) {
  const { cut } = leafThreshold(px, w, cup)
  const step = (cup.r * 2) / GRID
  const cells = []
  let interiorLeaf = 0, interiorN = 0

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const x0 = cup.cx - cup.r + gx * step
      const y0 = cup.cy - cup.r + gy * step
      const ccx = x0 + step / 2
      const ccy = y0 + step / 2
      const dist = Math.hypot(ccx - cup.cx, ccy - cup.cy)
      if (dist > cup.r) continue

      let leaf = 0, total = 0
      for (let y = y0; y < y0 + step; y += 2) {
        for (let x = x0; x < x0 + step; x += 2) {
          if (x < 0 || y < 0 || x >= w || y >= h) continue
          const i = ((y | 0) * w + (x | 0)) * 3
          if (lum(px[i], px[i + 1], px[i + 2]) < cut) leaf++
          total++
        }
      }
      if (!total) continue
      const frac = leaf / total
      interiorLeaf += leaf
      interiorN += total
      cells.push({ gx, gy, x: ccx, y: ccy, frac, rNorm: dist / cup.r })
    }
  }
  return { cells, cut, interior: interiorN ? interiorLeaf / interiorN : 0 }
}

// Measure the REVEAL CROP, not the cell. `cells` are ~60px of the original photo;
// the crop she is shown is ZOOM px. Leaf is counted only among pixels inside the
// cup, because everything outside it is dark velvet and would otherwise count as
// leaf and turn a crop of the tablecloth into a dense find.
function windowStats(px, w, h, cup, c, zoomAnalysis) {
  const half = zoomAnalysis / 2
  let inCup = 0, leaf = 0, total = 0
  for (let y = c.y - half; y < c.y + half; y += 2) {
    for (let x = c.x - half; x < c.x + half; x += 2) {
      total++
      if (x < 0 || y < 0 || x >= w || y >= h) continue
      if (Math.hypot(x - cup.cx, y - cup.cy) > cup.rOuter) continue
      inCup++
      const i = ((y | 0) * w + (x | 0)) * 3
      if (lum(px[i], px[i + 1], px[i + 2]) < cup.cut) leaf++
    }
  }
  return { inCup: total ? inCup / total : 0, leaf: inCup ? leaf / inCup : 0 }
}

// Find the GATHERINGS, then centre a reveal on each.
//
// 🔴 THE FIRST VERSION PICKED CELLS, AND IT PUT TWO REVEALS ON ONE CLUMP. It took
// the three densest grid cells subject to a minimum separation of 0.30 × the cup
// radius. Two faults, and they compound:
//
//   1. 0.30 × radius is about 127px of the original photograph. The reveal crop is
//      420px. So "far enough apart" allowed two crops that overlapped by seventy
//      per cent — the same leaves, ringed twice, sold to her as two different
//      places in her cup.
//   2. Greedy-by-density does not find clumps. On the best candidate it took two
//      cells inside the same gathering at the bottom of the cup and never picked
//      the largest, most obvious gathering at all.
//
// A cell is not a gathering. So find the gatherings first: mark every cell with
// leaf in it, join the touching ones into blobs, and take the three heaviest. The
// reveal is centred on the blob's leaf-weighted centroid, which is where a reader
// would put the ring. Separation then falls out of the blobs being distinct, and
// is still checked, because two blobs can sit close enough for their crops to
// show the same leaves.
function pickClusters(cells, cup, zoomAnalysis) {
  const key = (gx, gy) => `${gx},${gy}`
  const leafy = new Map()
  for (const c of cells) if (c.frac >= LIMITS.cellLeafMin) leafy.set(key(c.gx, c.gy), c)

  const seen = new Set()
  const blobs = []
  let specks = 0
  for (const [k, start] of leafy) {
    if (seen.has(k)) continue
    const stack = [start]
    seen.add(k)
    const members = []
    while (stack.length) {
      const c = stack.pop()
      members.push(c)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = key(c.gx + dx, c.gy + dy)
        if (seen.has(nk)) continue
        const n = leafy.get(nk)
        if (!n) continue
        seen.add(nk)
        stack.push(n)
      }
    }
    // A gathering, not a speck. Under four cells is roughly a 110px mark on the
    // original photograph — too small to fill a ring, and the crop check would
    // reject it anyway, so drop it here where the reason is legible.
    if (members.length < 4) { specks++; continue }
    const mass = members.reduce((t, c) => t + c.frac, 0)
    blobs.push({
      cells: members.length,
      mass,
      // Leaf-weighted, so the ring lands on the dense heart of the clump rather
      // than the middle of its bounding box.
      x: members.reduce((t, c) => t + c.x * c.frac, 0) / mass,
      y: members.reduce((t, c) => t + c.y * c.frac, 0) / mass,
      frac: mass / members.length,
    })
  }

  // A blob that is solid across its whole area has no structure to read — it is a
  // blot, and a stranger told to find a bird in it will find a blot.
  if (VERBOSE) {
    console.log(`      [blobs] ${blobs.length} found, ${specks} specks dropped, leaf cut ${cup.cut.toFixed(0)}`)
    for (const b of blobs.slice().sort((a, b) => b.mass - a.mass)) {
      console.log(
        `      [blob]  ${String(b.cells).padStart(3)} cells  mean ${(b.frac * 100).toFixed(0)}%  ` +
          `@(${Math.round(b.x)},${Math.round(b.y)})${b.frac > LIMITS.cellLeafMax ? '  ← solid blot' : ''}`,
      )
    }
  }
  const blots = blobs.filter((b) => b.frac > LIMITS.cellLeafMax)
  const usable = blobs
    .filter((b) => b.frac <= LIMITS.cellLeafMax)
    .sort((a, b) => b.mass - a.mass)

  // Two reveals must not show the same leaves. The floor is the CROP, not an
  // abstract fraction of the cup: centres closer than three quarters of a crop
  // width apart produce two pictures she would recognise as one.
  const minGap = Math.max(LIMITS.minSeparation * cup.r, 0.75 * zoomAnalysis)
  const picked = []
  for (const b of usable) {
    if (picked.every((p) => Math.hypot(p.x - b.x, p.y - b.y) >= minGap)) picked.push(b)
    if (picked.length === LIMITS.clustersNeeded) break
  }
  // 🔴 REPORT WHAT WAS THROWN AWAY AND WHY. The first version returned only the
  // survivors, so a cup holding three perfectly good formations reported "only 1
  // usable region" and the remedy table then guessed — it told the operator to
  // separate regions that were already separate. A rejection reason the caller
  // cannot see is a rejection reason that misdirects the next round.
  return Object.assign(
    picked.map((b) => ({ ...b, rNorm: Math.hypot(b.x - cup.cx, b.y - cup.cy) / cup.r })),
    {
      rejected: {
        blots: blots.length,
        specks,
        crowded: Math.max(0, Math.min(usable.length, LIMITS.clustersNeeded) - picked.length),
      },
    },
  )
}

const results = []

for (const file of files) {
  const src = join(DIR, file)
  const { data, info } = await sharp(src)
    .resize(N, N, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const cup = findCup(data, info.width, info.height)
  if (!cup) {
    results.push({ file, verdict: 'FAIL', why: 'could not find the cup — is this a cup shot?' })
    continue
  }

  const { cells, cut, interior } = analyse(data, info.width, info.height, cup)
  cup.cut = cut

  // The crop covers ZOOM px of the ORIGINAL photo; measurement happens at N.
  const srcMeta = await sharp(src).metadata()
  const zoomAnalysis = ZOOM * (N / srcMeta.width)

  const clusters = pickClusters(cells, cup, zoomAnalysis)

  const why = []
  if (interior < LIMITS.interiorLeafMin) why.push(`cup nearly bare (${(interior * 100).toFixed(1)}% leaf)`)
  if (interior > LIMITS.interiorLeafMax) why.push(`cup drowned (${(interior * 100).toFixed(1)}% leaf)`)
  if (clusters.length < LIMITS.clustersNeeded) {
    const r = clusters.rejected || {}
    const dropped = []
    if (r.blots) dropped.push(`${r.blots} solid blot${r.blots === 1 ? '' : 's'}`)
    if (r.specks) dropped.push(`${r.specks} too small`)
    if (r.crowded) dropped.push(`${r.crowded} too close to another`)
    why.push(
      `only ${clusters.length} usable region${clusters.length === 1 ? '' : 's'}, need ${LIMITS.clustersNeeded}` +
        (dropped.length ? ` (dropped: ${dropped.join(', ')})` : ''),
    )
  }

  // Position labels, computed against the cup centre. Handle sits lower-right.
  const placed = clusters.map((c) => {
    const dx = c.x - cup.cx
    const dy = c.y - cup.cy
    // Depth against the REAL cup edge, not the inset analysis circle. Measured
    // against the inset radius everything drifts outward — a mark two thirds of
    // the way out got called "rim", and rim means "the weeks just ahead" in the
    // reading grammar. A label that wrong writes the wrong copy.
    const depthNorm = Math.hypot(dx, dy) / cup.rOuter
    const depth = depthNorm > 0.72 ? 'rim' : depthNorm > 0.40 ? 'mid-wall' : 'deep'
    const side = dx > 0 && dy > 0 ? 'handle side' : dx < 0 && dy < 0 ? 'far side' : dx > 0 ? 'right' : 'left'
    return { ...c, depth, depthNorm, side, win: windowStats(data, info.width, info.height, cup, c, zoomAnalysis) }
  })

  const bare = placed.filter((c) => c.win.leaf < LIMITS.windowLeafMin)
  if (bare.length) {
    why.push(`${bare.length} crop${bare.length === 1 ? ' is' : 's are'} mostly bare porcelain (${bare.map((c) => `${(c.win.leaf * 100).toFixed(1)}%`).join(', ')})`)
  }
  const offCup = placed.filter((c) => c.win.inCup < LIMITS.windowInCupMin)
  if (offCup.length) {
    why.push(`${offCup.length} crop${offCup.length === 1 ? ' runs' : 's run'} off the cup (${offCup.map((c) => `${(c.win.inCup * 100).toFixed(0)}% on it`).join(', ')})`)
  }

  const verdict = why.length ? 'FAIL' : 'PASS'
  results.push({ file, verdict, why: why.join(' · '), interior, cup, clusters: placed, src, scale: srcMeta.width / N })

  // --debug draws what the script THINKS it is looking at: the cup it found, the
  // interior it analyses, and the three crops it is about to cut. Kept in, because
  // the first version of this script measured a circle that was a tenth of a frame
  // off-centre and half on the tablecloth, and printed confident numbers about it
  // for three cups. Nothing in the text output could have shown that. One look at
  // the overlay would have.
  if (DEBUG) {
    const scale = srcMeta.width / N
    const ring = (cx, cy, r, colour, wid) =>
      `<circle cx="${cx * scale}" cy="${cy * scale}" r="${r * scale}" fill="none" stroke="${colour}" stroke-width="${wid}"/>`
    const boxes = placed
      .map((c) => {
        const half = (ZOOM / 2)
        return `<rect x="${c.x * scale - half}" y="${c.y * scale - half}" width="${ZOOM}" height="${ZOOM}" fill="none" stroke="#7CE8A0" stroke-width="4"/>`
      })
      .join('')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${srcMeta.width}" height="${srcMeta.height}">
      ${ring(cup.cx, cup.cy, cup.rOuter, '#FF4D4D', 6)}
      ${ring(cup.cx, cup.cy, cup.r, '#4DA6FF', 5)}
      ${boxes}</svg>`
    await sharp(src)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: 82 })
      .toFile(join(OUT, `${basename(file, extname(file))}-debug.jpg`))
  }

  // Cut the zoom strip for anything that passed, so a human judges the crops at
  // the size she will actually see, not the cup at a size she never will.
  if (verdict === 'PASS') {
    const meta = srcMeta
    const scale = meta.width / N
    // Clamp on BOTH sides. Clamping only at zero was a real crash: a cluster
    // near the rim on the handle side sits close enough to the right or bottom
    // edge that left + ZOOM runs past the photograph, and sharp rejects the
    // extract outright ("bad extract area") — so one off-centre cluster killed
    // the whole run before any candidate could be judged.
    const clamp = (v, span) => Math.max(0, Math.min(Math.round(v), span - ZOOM))
    const crops = await Promise.all(
      placed.map(async (c) => {
        const half = ZOOM / 2
        const left = clamp(c.x * scale - half, meta.width)
        const top = clamp(c.y * scale - half, meta.height)
        return sharp(src)
          .extract({ left, top, width: ZOOM, height: ZOOM })
          .resize(420, 420)
          .toBuffer()
      }),
    )
    const outFile = join(OUT, `${basename(file, extname(file))}-zooms.jpg`)
    await sharp({ create: { width: 420 * 3, height: 420, channels: 3, background: { r: 10, g: 8, b: 8 } } })
      .composite(crops.map((input, i) => ({ input, left: i * 420, top: 0 })))
      .jpeg({ quality: 88 })
      .toFile(outFile)
  }
}

// ── report ──────────────────────────────────────────────────────────────────
console.log(`\n${files.length} candidate${files.length === 1 ? '' : 's'} in ${DIR}\n`)
for (const r of results) {
  const head = `  ${r.verdict === 'PASS' ? '✓' : '✗'} ${r.file}`
  if (r.verdict === 'FAIL') {
    console.log(`${head}\n      ${r.why}`)
    continue
  }
  console.log(`${head}   ${(r.interior * 100).toFixed(1)}% leaf`)
  for (const c of r.clusters) {
    console.log(`      ${String((c.frac * 100).toFixed(0)).padStart(3)}% core  ${String((c.win.leaf * 100).toFixed(0)).padStart(3)}% crop  ${String((c.win.inCup * 100).toFixed(0)).padStart(3)}% on cup  ${c.depth.padEnd(9)} ${c.side}`)
  }
  console.log(`      zooms -> ${join(OUT, `${basename(r.file, extname(r.file))}-zooms.jpg`)}`)
}

const passed = results.filter((r) => r.verdict === 'PASS')
console.log(`\n  ${passed.length}/${results.length} usable\n`)

if (JSON_OUT) {
  // Original-photograph pixels, so the compositor never has to know about N.
  const out = passed.map((r) => ({
    file: r.file,
    interiorLeaf: Number(r.interior.toFixed(4)),
    cup: {
      cx: Math.round(r.cup.cx * r.scale),
      cy: Math.round(r.cup.cy * r.scale),
      r: Math.round(r.cup.rOuter * r.scale),
    },
    clusters: r.clusters.map((c) => ({
      x: Math.round(c.x * r.scale),
      y: Math.round(c.y * r.scale),
      depth: c.depth,
      side: c.side,
      depthNorm: Number(c.depthNorm.toFixed(3)),
      // Clock position as the camera sees it — the handle is at 4–5 o'clock, so
      // this is what the reading's position words are written against.
      clock: (() => {
        const a = Math.atan2(c.x - r.cup.cx, r.cup.cy - c.y) // 0 = 12 o'clock, clockwise
        const h = ((a / (2 * Math.PI)) * 12 + 12) % 12
        return Number(h.toFixed(1))
      })(),
      coreLeaf: Number(c.frac.toFixed(3)),
      cropLeaf: Number(c.win.leaf.toFixed(3)),
      cropOnCup: Number(c.win.inCup.toFixed(3)),
    })),
  }))
  writeFileSync(JSON_OUT, JSON.stringify(out, null, 2))
  console.log(`  clusters -> ${JSON_OUT}\n`)
}

if (!passed.length) {
  // 🔴 A FAILING RUN MUST SAY WHAT TO CHANGE. "Try again" is how a loop becomes a
  // treadmill: the same prompt regenerated until something looks acceptable, which
  // is the sloppiness this script exists to remove.
  const all = results.map((r) => r.why).join(' ')
  console.log('  None usable. Change the PROMPT, not the seed:\n')
  if (/bare/.test(all)) console.log('    · too sparse   → more leaf overall, and heavier clumping')
  if (/drowned/.test(all)) console.log('    · too dense    → far less leaf; leave large areas of clear porcelain')
  if (/solid blot/.test(all)) {
    console.log('    · gatherings are solid masses → same amount of leaf, spread WIDER and')
    console.log('      broken up: a dark core that thins to single flecks, white showing through')
  }
  if (/mostly bare porcelain/.test(all)) {
    console.log('    · dense speck in a bare crop → make each gathering WIDER, not darker:')
    console.log('      a spread of clumps a third of the cup across, not one tight spot')
  }
  if (/off the cup/.test(all)) {
    console.log('    · gatherings too close to the rim → pull them in toward the mid-wall and floor')
  }
  if (/usable region/.test(all)) {
    console.log('    · regions clustered together → ask explicitly for leaf in THREE separated places:')
    console.log('      one up near the rim, one on the mid-wall, one down at the base')
    console.log('    · uniform speckle → vary clump SIZE hard: single flecks AND masses, never one repeated mark')
  }
  console.log('\n  Two failed rounds means a photograph cannot do this. Shoot a real cup.')
  process.exit(1)
}
