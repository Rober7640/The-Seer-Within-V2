# Coffee as a second `/fb-read` device — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add coffee-ground reading to the `/fb-read` quiz bridge as a second device — one registry entry, one photograph and its reveal strip, and nine readings — so the funnel can finally run the picture-vs-picture test it was built for.

**Architecture:** `/fb-read` has a single source of truth, `shared/readDevices.ts`, imported by both the client lander and the server. A device is one `DeviceConfig` entry; route validators, the eval, the registry doc and the walk page all derive from it. Coffee reuses the three existing hooks, so it inherits their guards and adds none. It uses `pick: 'symbol'` — one photograph, three names — identical to tea's arm B, so the pick mechanic is held constant. Coffee's own `grammar` string carries the difference: the cup was **turned onto the saucer and drained**, so direction and running mean something tea's settling cannot express.

**Tech Stack:** TypeScript, Node ESM scripts run under `tsx`, `sharp` for image composition, Vitest for unit tests, Playwright for e2e, Anthropic Claude for the Version-C generated half.

**Spec:** `docs/superpowers/specs/2026-09-01-fb-read-coffee-device-design.md` — read it before Task 1.

---

## Global Constraints

- 🔒 **Sandbox only for anything that hits the app.** Dev and production share a database. Persona walks and live funnel hits run as `PORT=5056 DOTENV_CONFIG_PATH=.env.sandbox NODE_ENV=development`. A "sandboxed" run in July fired 309 real Lead events.
- 🔴 **Restart the dev server after ANY `shared/readDevices.ts` edit.** A stale server serves old marks while the eval grades new ones.
- 🔴 **Never hand-edit `shared/readCopy.ts`.** It is generated from `fb-read/docs/drafts/*.json` by `node scripts/build-read-copy.mjs`. Editing it is silently reverted on the next compile.
- 🔴 **Ring coordinates belong to one exact photograph.** Regenerate the art and every coordinate is wrong. Re-run the selector and redraw.
- 🔴 **The ad headline is imported from `HEADLINES`, never typed** into the ad script.
- 🔴 **No hand-typed device roster anywhere.** Server and client import the same registry. Any list of device ids must derive from `DEVICE_IDS`.
- **Copy limits, enforced by `build-read-copy.mjs`:** max **25 words** per bubble, max **2 sentences**, **no exclamation marks**, no `__UNWRITTEN__` sentinel. The build refuses to emit anything that breaks these.
- **Every bubble is one of seven cuts** of the Natural Tarot-Cut (`fb-tarot/docs/natural-tarot-cut.md`). Seven bubbles per read, always.
- **Guards are hook-level.** Coffee adds **no** new guard. `READ_FRAME` is not edited.
- **`HEADLINES` is hook-level and must not move.** Swap the device and the question stays identical.
- **The eval is not deterministic** (18/18 and 16/18 on clean runs). Never quote one number as stable.
- **The repo does not typecheck clean** — 19 pre-existing files fail `npm run check`. Judge only files this plan touches.
- **`npm run test:vitest`** picks up `tests/**/*.test.ts` automatically (see `vitest.config.ts`). New `.test.ts` files there need no `package.json` change.

### Device vocabulary (used throughout)

| Term | Meaning |
|---|---|
| `mark` | the concrete thing named in the opening bubble — for coffee, e.g. *"a tree halfway up the wall of the cup"*. Injected into the Version-C prompt AND rendered in the Version-A greeting |
| `reading` | the archetype label, e.g. *"the answered heart"* |
| `optionLabel` | the bare noun on the button — no article, no letter. Letters are derived at render time from the option key |
| cut 1 | confirms and **places** the symbol she named. On a `symbol` device it does not reveal it — she already tapped the name |
| cut 3 | answers a fear, flat. The three cut-3 lines must answer **three different** fears |
| cut 6 | recognises what she has lived. It does **not** re-ask her question — cut 2 already echoed the ad |

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `tests/fb-read-registry.test.ts` | the missing guard: registry freshness + per-device invariants for a `pick:'symbol'` device |
| `scripts/ring-read-cup.mjs` ✅ | device-agnostic ring/reveal tool — cup + ring specs → ringed cup, three crops, one reveal strip. Crop size comes from the spec file (coffee uses 520) |
| `improve-v1/fb-read/images/coffee/rings.json` ✅ | coffee's ring geometry — the ONLY place those coordinates live |
| `improve-v1/fb-read/images/coffee/SOURCE.md` ✅ | provenance, geometry table, licence status, and why depth is observed rather than computed |
| `improve-v1/fb-read/images/coffee/cup.png` ✅ | the 1254² master, cropped from the CC0 original |
| `improve-v1/fb-read/images/reference/coffee/` + rows in `REFERENCES.md` ✅ | four licence-checked reference photographs, and the heavy-draw / light-draw finding |
| `fb-read/docs/drafts/coffee-love-again.json` | 3 reads × 7 cuts |
| `fb-read/docs/drafts/coffee-still-think.json` | 3 reads × 7 cuts |
| `fb-read/docs/drafts/coffee-hiding-something.json` | 3 reads × 7 cuts |
| `client/public/read/coffee-cup.jpg` ✅ | the served lander photograph, 1254² |
| `client/public/read/coffee-reveal-strip.jpg` ✅ | the served reveal strip, **1560×520** |

**Modified:**

| Path | Change |
|---|---|
| `shared/readDevices.ts` | `"coffee"` on `ReadDevice`; `cupAlt` added to `DeviceConfig`; `COFFEE` config; one line in `DEVICES` |
| `client/src/pages/ReadBridge.tsx:176` | hardcoded `aria-label` → `cfg.cupAlt` |
| `scripts/compose-read-strips.mjs:33` | hand-typed roster → derived from `DEVICE_IDS` |
| `scripts/build-read-ad.mjs:22,64` | hardcoded tea cup path and `DEVICES.tea` → `--device` argument |
| `fb-read/docs/HANDOVER.md:247` | correct the false claim that the test run gates registry staleness |
| `improve-v1/fb-read/README.md` | replace the "SCOPE CHANGED — tea only" section |
| `shared/readCopy.ts`, `fb-read/docs/lander-registry.md` | **generated** — never edited by hand |

### Phases

| Phase | Tasks | Gate |
|---|---|---|
| **A — tooling** | 1, 3, 4, 5 (2 ✅ done) | all green with no coffee copy |
| **B — art** | ✅ **COMPLETE** | the operator picked `restos-cafe.jpg`, a real CC0 photograph |
| **C — copy** | 9–11 | written to the photograph, not before |
| **D — wire & verify** | 12–14 | eval, walks, ad, docs |

> **Revised 2026-09-01.** Reference photography and the operator's pick overturned four
> assumptions in the original plan. Phase B no longer generates a cup — it is done — and
> the symbols are **Road / Tree / Lake**, read off the photograph. See the spec's
> *What the photograph changed*.

---

## Phase A — tooling

### Task 1: The registry staleness + device invariant test

`fb-read/docs/HANDOVER.md:247` claims the test run gates registry staleness. It does not — nothing in `package.json`, `tests/` or `vitest.config.ts` mentions `read-registry`. This task makes the claim true before coffee starts editing `readDevices.ts` repeatedly.

**Files:**
- Create: `tests/fb-read-registry.test.ts`
- Modify: `fb-read/docs/HANDOVER.md:247`

**Interfaces:**
- Consumes: `DEVICES`, `DEVICE_IDS`, `READ_HOOKS` from `shared/readDevices`; `isReadWritten` from `shared/readCopy`
- Produces: nothing importable. It is a gate

- [ ] **Step 1: Write the failing test**

Create `tests/fb-read-registry.test.ts`:

```ts
// The /fb-read guard file. Every other funnel family has one; this funnel had the
// eval and its self-test and nothing in the ordinary test run that bites on the
// registry.
//
// 🔴 WHY THE FIRST TEST EXISTS. fb-read/docs/HANDOVER.md claimed "the test run
// calls read-registry.mjs --check, so editing a device, hook or guard without
// regenerating fails the tests rather than quietly drifting". Nothing called it.
// build-read-copy.mjs invokes the GENERATOR as a side effect of compiling copy, so
// editing shared/readDevices.ts alone left lander-registry.md stale and silent.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ReadDevice } from '../shared/readDevices'
import { DEVICES, DEVICE_IDS, READ_HOOKS } from '../shared/readDevices'
import { isReadWritten } from '../shared/readCopy'

const PUBLIC_READ = 'client/public/read'

// A device is SERVABLE once any one of its landers is written. Art is only
// required from that point — which is what lets coffee's config land before its
// photograph without breaking the suite.
function isServable(device: ReadDevice): boolean {
  return READ_HOOKS.some((h) =>
    DEVICES[device].options.some((o) => isReadWritten(device, h, o)),
  )
}

describe('fb-read registry', () => {
  it('lander-registry.md is not stale', () => {
    // --check exits 1 with a message naming the fix, 0 with a tally.
    expect(() =>
      execFileSync('npx', ['tsx', 'scripts/read-registry.mjs', '--check'], {
        stdio: 'pipe',
      }),
    ).not.toThrow()
  })

  it('every device id in DEVICES matches its own config id', () => {
    for (const id of DEVICE_IDS) expect(DEVICES[id].id).toBe(id)
  })

  it("every pick:'symbol' device carries the four fields that mechanic needs", () => {
    for (const id of DEVICE_IDS) {
      const cfg = DEVICES[id]
      if (cfg.pick !== 'symbol') continue
      // She taps a NAME over ONE photograph, so all four are load-bearing:
      // without cupImage the lander falls back to a strip built for three panels;
      // without optionLabel the buttons render bare letters; without revealStrip
      // the chat shows the unringed cup while Evelyn describes a ring; without
      // grammar the generated half invents what a position means.
      expect(cfg.cupImage, `${id}.cupImage`).toBeTruthy()
      expect(cfg.optionLabel, `${id}.optionLabel`).toBeTruthy()
      expect(cfg.revealStrip, `${id}.revealStrip`).toBeTruthy()
      expect(cfg.grammar, `${id}.grammar`).toBeTruthy()
      for (const o of cfg.options) {
        expect(cfg.optionLabel?.[o], `${id}.optionLabel.${o}`).toBeTruthy()
        // Bare nouns. Written as articles, tea's first draft produced two
        // options both labelled A.
        expect(cfg.optionLabel?.[o]).not.toMatch(/^(a|an|the)\s/i)
        expect(cfg.optionLabel?.[o]).not.toMatch(/^[ABC]\.\s/)
      }
    }
  })

  it('every device carries a cupAlt, and it never names the wrong instrument', () => {
    for (const id of DEVICE_IDS) {
      const cfg = DEVICES[id]
      expect(cfg.cupAlt, `${id}.cupAlt`).toBeTruthy()
      const others = DEVICE_IDS.filter((d) => d !== id)
      for (const other of others) {
        expect(cfg.cupAlt.toLowerCase(), `${id}.cupAlt names ${other}`).not.toContain(other)
      }
    }
  })

  it('every servable device has its art on disk', () => {
    for (const id of DEVICE_IDS) {
      if (!isServable(id)) continue
      const cfg = DEVICES[id]
      for (const img of [cfg.strip, cfg.cupImage, cfg.revealStrip]) {
        if (!img) continue
        const file = join(PUBLIC_READ, img.url.replace(/^\/read\//, ''))
        expect(existsSync(file), `${id}: missing ${file}`).toBe(true)
      }
    }
  })

  it('mark and reading are written for every option of every device', () => {
    for (const id of DEVICE_IDS) {
      const cfg = DEVICES[id]
      for (const o of cfg.options) {
        expect(cfg.mark[o], `${id}.mark.${o}`).toBeTruthy()
        expect(cfg.reading[o], `${id}.reading.${o}`).toBeTruthy()
      }
    }
  })
})
```

- [ ] **Step 2: Run it and watch the `cupAlt` tests fail**

Run: `npx vitest run tests/fb-read-registry.test.ts`

Expected: the two `cupAlt` assertions FAIL — `DeviceConfig` has no `cupAlt` field yet. Everything else passes. If the staleness test also fails, that is a real pre-existing stale registry: run `npx tsx scripts/read-registry.mjs`, inspect the diff, and commit it separately before continuing.

- [ ] **Step 3: Add `cupAlt` to `DeviceConfig` and fill it for both existing devices**

In `shared/readDevices.ts`, inside `interface DeviceConfig`, immediately after the `strip` field:

```ts
  // The cup/strip's aria-label. DEVICE-LEVEL, and it lives here rather than in the
  // bridge because it is a fact about the instrument.
  //
  // 🔴 IT WAS HARDCODED IN THE BRIDGE. ReadBridge.tsx read
  // aria-label="The inside of a teacup, tea leaves settled in it" for EVERY symbol
  // device, so the second one to exist would have described the wrong instrument
  // to every screen-reader user. Exactly the drift this registry exists to prevent,
  // one level down.
  cupAlt: string;
```

Add to `DREAM`, after `strip`:

```ts
  cupAlt: "Three dreams, side by side",
```

Add to `TEA`, after `revealStrip`:

```ts
  cupAlt: "The inside of a teacup, tea leaves settled in it",
```

- [ ] **Step 4: Point the bridge at it**

In `client/src/pages/ReadBridge.tsx`, replace line 176:

```tsx
                  aria-label="The inside of a teacup, tea leaves settled in it"
```

with:

```tsx
                  aria-label={cfg.cupAlt}
```

- [ ] **Step 5: Run the tests and the registry**

```bash
npx vitest run tests/fb-read-registry.test.ts
npx tsx scripts/read-registry.mjs --check
```

Expected: vitest **6 passed**. The registry check prints `fb-read/docs/lander-registry.md is current — 18/18 landers written across 3 hooks × 2 devices`.

- [ ] **Step 6: Correct the false claim in the handover**

In `fb-read/docs/HANDOVER.md`, replace the sentence at line 247 reading *"and the test run calls `read-registry.mjs --check`, so editing a device, hook or guard without regenerating fails the tests rather than quietly drifting"* with:

```markdown
and `tests/fb-read-registry.test.ts` calls `read-registry.mjs --check`, so editing a
device, hook or guard without regenerating fails `npm run test:vitest` rather than
quietly drifting. (That sentence used to be here describing a gate that did not
exist — nothing referenced `read-registry` outside `build-read-copy.mjs`. It does now.)
```

- [ ] **Step 7: Commit**

```bash
git add tests/fb-read-registry.test.ts shared/readDevices.ts \
        client/src/pages/ReadBridge.tsx fb-read/docs/HANDOVER.md
git commit -m "test(fb-read): add the registry guard the handover claimed existed

Nothing called read-registry.mjs --check. build-read-copy.mjs invokes the
generator as a side effect of compiling copy, so editing shared/readDevices.ts
alone left lander-registry.md stale and silent.

Also lifts the cup aria-label out of ReadBridge, where it was hardcoded to
'a teacup, tea leaves settled in it' for every symbol device."
```

---

### Task 2: `ring-read-cup.mjs` — the missing arm-B art tool ✅ DONE (`e393d9a`)

> Written and proven on the coffee cup. Two rules changed from the draft below during
> that first real use, and both are in the shipped script: **a ring must be inside the
> photograph while the crop need only contain it** (the crop slides inward instead of
> failing — demanding a centred crop rejected the lake purely for sitting low, a fact
> about the box, not the cup), and **it refuses a ring wider than the reveal crop**,
> which fired at once on the 880px road and is why coffee's crop is 520, not tea's 420.
> The test below was not written; write it if this tool is touched again.

Tea's seven `images/armb/` files were produced ad hoc on 2026-08-31 at 15:49 and **no script was kept**. `trace-tea-reveals.mjs` is stale against arm A: its rings are hardcoded to road/bird/heart and it reads three cups (`tea-{a,b,c}.png`), a mechanic tea no longer uses. There is no reusable way to ring a symbol-device cup.

**Files:**
- Create: `scripts/ring-read-cup.mjs`
- Create: `tests/ring-read-cup.test.ts`

**Interfaces:**
- Consumes: `sharp`; a rings JSON of the shape `{ cup, size, rings: { a|b|c: { cx, cy, rx, ry, rot, label } } }`
- Produces: CLI `node scripts/ring-read-cup.mjs <rings.json> <out-dir>` writing `cup-ringed.png` (size²), `reveal-<opt>-<label>.png` (420² each), `reveal-strip.jpg` (1260×420), `cup-ringed-labelled.jpg` (review only)

- [ ] **Step 1: Write the failing test**

Create `tests/ring-read-cup.test.ts`:

```ts
// Ringing is the one art step whose output the copy is written against, so a
// silent geometry failure is the "stale ring" fault — the one SOURCE.md calls
// unrecoverable. This tests the mechanics: that the crops are cut where the rings
// are, at the size the lander crops by background-position.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'

let dir: string
let ringsFile: string
let out: string

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'ring-read-cup-'))
  out = join(dir, 'out')
  const cup = join(dir, 'cup.png')
  // A plain grey square stands in for a photograph. The tool must not care what
  // is in it — it composites an overlay and cuts crops.
  await sharp({
    create: { width: 1254, height: 1254, channels: 3, background: { r: 200, g: 190, b: 175 } },
  })
    .png()
    .toFile(cup)

  ringsFile = join(dir, 'rings.json')
  writeFileSync(
    ringsFile,
    JSON.stringify({
      cup,
      size: 1254,
      rings: {
        a: { cx: 840, cy: 632, rx: 132, ry: 118, rot: 0, label: 'road' },
        b: { cx: 502, cy: 742, rx: 128, ry: 120, rot: 0, label: 'key' },
        c: { cx: 479, cy: 451, rx: 130, ry: 112, rot: 0, label: 'bridge' },
      },
    }),
  )
})

afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe('ring-read-cup', () => {
  it('writes the ringed cup, three reveal crops and the strip', () => {
    execFileSync('node', ['scripts/ring-read-cup.mjs', ringsFile, out], { stdio: 'pipe' })
    expect(existsSync(join(out, 'cup-ringed.png'))).toBe(true)
    expect(existsSync(join(out, 'cup-ringed-labelled.jpg'))).toBe(true)
    expect(existsSync(join(out, 'reveal-a-road.png'))).toBe(true)
    expect(existsSync(join(out, 'reveal-b-key.png'))).toBe(true)
    expect(existsSync(join(out, 'reveal-c-bridge.png'))).toBe(true)
    expect(existsSync(join(out, 'reveal-strip.jpg'))).toBe(true)
  })

  it('cuts crops at 420 square and the strip at 1260x420', async () => {
    // The lander crops the strip into exact thirds by background-position, so an
    // off-size strip silently misaligns every reveal.
    const crop = await sharp(join(out, 'reveal-a-road.png')).metadata()
    expect(crop.width).toBe(420)
    expect(crop.height).toBe(420)
    const strip = await sharp(join(out, 'reveal-strip.jpg')).metadata()
    expect(strip.width).toBe(1260)
    expect(strip.height).toBe(420)
  })

  it('refuses a ring whose crop would run off the photograph', () => {
    // A cluster near the rim ran sharp's extract past the frame and killed a whole
    // selection run. Fail loudly, naming the ring, rather than crashing in sharp.
    const bad = join(dir, 'rings-bad.json')
    writeFileSync(
      bad,
      JSON.stringify({
        cup: join(dir, 'cup.png'),
        size: 1254,
        rings: {
          a: { cx: 30, cy: 30, rx: 100, ry: 100, rot: 0, label: 'road' },
          b: { cx: 502, cy: 742, rx: 128, ry: 120, rot: 0, label: 'key' },
          c: { cx: 479, cy: 451, rx: 130, ry: 112, rot: 0, label: 'bridge' },
        },
      }),
    )
    let stderr = ''
    try {
      execFileSync('node', ['scripts/ring-read-cup.mjs', bad, join(dir, 'out2')], { stdio: 'pipe' })
      throw new Error('should have exited non-zero')
    } catch (err: any) {
      stderr = String(err.stderr ?? '')
    }
    expect(stderr).toMatch(/ring a/)
    expect(stderr).toMatch(/off the photograph/)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/ring-read-cup.test.ts`
Expected: FAIL — `Cannot find module '.../scripts/ring-read-cup.mjs'`.

- [ ] **Step 3: Write the script**

Create `scripts/ring-read-cup.mjs`:

```js
// ring-read-cup — the reveal art for a pick:'symbol' device.
//
//   node scripts/ring-read-cup.mjs <rings.json> <out-dir>
//
// Replaces the ad-hoc run that produced improve-v1/fb-read/images/armb/ on
// 2026-08-31 and was not kept, and supersedes trace-tea-reveals.mjs, whose rings
// are hardcoded to arm A's road/bird/heart across three separate cups.
//
// 🔴 THIS RINGS A CLUSTER. IT DOES NOT DRAW THE SHAPE. The first attempt at tea
// traced a gold gull outline and was wrong twice: the line floated over bare
// porcelain, and a drawn bird hands her the answer as a graphic — the same mistake
// as generating a cup with a visible bird in it. The circle says LOOK HERE; the
// seeing stays hers. The copy supplies the symbol, the ring supplies the where.
//
// 🔴 THE RINGS BELONG TO ONE PHOTOGRAPH. Regenerate the cup and every coordinate
// here is wrong. Re-run scripts/select-tea-cup.mjs, take the new centres from its
// --json output, and redraw.
//
// Gold, not red: red on a dark ground reads as annotation on a photograph. Gold
// reads as sight.

import sharp from 'sharp'
import { mkdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const [, , SPEC, OUT] = process.argv
if (!SPEC || !OUT) {
  console.error('usage: node scripts/ring-read-cup.mjs <rings.json> <out-dir>')
  process.exit(2)
}

const spec = JSON.parse(readFileSync(SPEC, 'utf8'))
const SIZE = spec.size ?? 1254
const CROP = 420           // the reveal-strip third the lander crops to
const GOLD = '#E8C27A'
const BONE = '#F2E9DA'
const OPTIONS = ['a', 'b', 'c']

for (const o of OPTIONS) {
  if (!spec.rings?.[o]) {
    console.error(`rings.${o} missing in ${SPEC} — a symbol device needs all three`)
    process.exit(1)
  }
  if (!spec.rings[o].label) {
    console.error(`rings.${o}.label missing — the crop filename carries the symbol name`)
    process.exit(1)
  }
}

// Clamp at BOTH edges. Clamping only at zero is what let a rim-side cluster run
// sharp's extract past the frame and kill an entire selection run.
function cropBox(ring) {
  const half = CROP / 2
  const left = Math.round(ring.cx - half)
  const top = Math.round(ring.cy - half)
  return { left, top, width: CROP, height: CROP }
}

for (const o of OPTIONS) {
  const box = cropBox(spec.rings[o])
  if (box.left < 0 || box.top < 0 || box.left + CROP > SIZE || box.top + CROP > SIZE) {
    console.error(
      `ring ${o} (${spec.rings[o].label}) sits ${CROP}px from an edge — its crop runs off the photograph.\n` +
        `Fix: move the ring inward, or pick a cluster nearer the mid-wall.`,
    )
    process.exit(1)
  }
}

const ellipse = (r) =>
  `<ellipse cx="${r.cx}" cy="${r.cy}" rx="${r.rx}" ry="${r.ry}"` +
  (r.rot ? ` transform="rotate(${r.rot} ${r.cx} ${r.cy})"` : '') +
  `/>`

// Drawn three times: a wide dark halo so the gold survives on pale porcelain, a
// soft wide gold underneath, then the line. The stacking is what stops it looking
// like a vector pasted on top.
function overlay(shapes, labels = '') {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
       <g fill="none" stroke="#0E0906" stroke-width="18" opacity="0.34">${shapes}</g>
       <g fill="none" stroke="${GOLD}" stroke-width="12" opacity="0.22">${shapes}</g>
       <g fill="none" stroke="${GOLD}" stroke-width="5"  opacity="0.95">${shapes}</g>
       ${labels}
     </svg>`,
  )
}

mkdirSync(OUT, { recursive: true })
const all = OPTIONS.map((o) => ellipse(spec.rings[o])).join('')

await sharp(spec.cup)
  .resize(SIZE, SIZE, { fit: 'cover' })
  .composite([{ input: overlay(all), top: 0, left: 0 }])
  .png()
  .toFile(join(OUT, 'cup-ringed.png'))
console.log('  cup-ringed.png')

// Review only, never served: letters on the picture would hand her the answer's
// location before Evelyn has said a word.
const labels = OPTIONS.map((o) => {
  const r = spec.rings[o]
  return `<text x="${r.cx}" y="${r.cy - r.ry - 22}" text-anchor="middle"
             font-family="Georgia, serif" font-size="52" fill="${BONE}"
          >${o.toUpperCase()}. ${r.label}</text>`
}).join('')
await sharp(spec.cup)
  .resize(SIZE, SIZE, { fit: 'cover' })
  .composite([{ input: overlay(all, labels), top: 0, left: 0 }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(join(OUT, 'cup-ringed-labelled.jpg'))
console.log('  cup-ringed-labelled.jpg   REVIEW ONLY — never serve')

// One crop per option, each showing ONLY its own ring, so a reveal cannot point at
// a symbol she did not choose.
const crops = []
for (const o of OPTIONS) {
  const r = spec.rings[o]
  const file = join(OUT, `reveal-${o}-${r.label}.png`)
  const buf = await sharp(spec.cup)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .composite([{ input: overlay(ellipse(r)), top: 0, left: 0 }])
    .extract(cropBox(r))
    .png()
    .toBuffer()
  await sharp(buf).toFile(file)
  crops.push(buf)
  console.log(`  reveal-${o}-${r.label}.png`)
}

// 1260x420 — three 420 squares, in options order. The lander crops it into exact
// thirds by background-position and never inspects the artwork for seams, so the
// size is forced here rather than trusted.
const strip = join(OUT, 'reveal-strip.jpg')
await sharp({ create: { width: CROP * 3, height: CROP, channels: 3, background: { r: 10, g: 8, b: 8 } } })
  .composite(crops.map((input, i) => ({ input, left: i * CROP, top: 0 })))
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(strip)
console.log(`  reveal-strip.jpg          ${CROP * 3}x${CROP}  ${Math.round(statSync(strip).size / 1024)} KB`)
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/ring-read-cup.test.ts`
Expected: **3 passed**.

- [ ] **Step 5: Prove it reproduces tea's existing art**

The strongest check that this tool is right is that it rebuilds the arm-B assets already on disk. Create a temporary spec from `improve-v1/fb-read/images/armb/SOURCE.md`'s geometry table:

```bash
cat > /tmp/tea-rings.json <<'EOF'
{
  "cup": "improve-v1/fb-read/images/armb/cup.png",
  "size": 1254,
  "rings": {
    "a": { "cx": 840, "cy": 632, "rx": 132, "ry": 118, "rot": 0, "label": "bird" },
    "b": { "cx": 502, "cy": 742, "rx": 128, "ry": 120, "rot": 0, "label": "tree" },
    "c": { "cx": 479, "cy": 451, "rx": 130, "ry": 112, "rot": 0, "label": "anchor" }
  }
}
EOF
node scripts/ring-read-cup.mjs /tmp/tea-rings.json /tmp/tea-rings-out
```

Expected: six files written, `reveal-strip.jpg` at 1260×420. Open `/tmp/tea-rings-out/cup-ringed-labelled.jpg` beside `improve-v1/fb-read/images/armb/cup-ringed-labelled.jpg` — the rings must sit on the same three clusters. **Do not overwrite the shipped arm-B files**; this is a comparison only.

- [ ] **Step 6: Commit**

```bash
git add scripts/ring-read-cup.mjs tests/ring-read-cup.test.ts
git commit -m "feat(fb-read): ring-read-cup, the reusable arm-B reveal tool

Tea's seven images/armb/ files were produced ad hoc on 2026-08-31 and no
script was kept; trace-tea-reveals.mjs is stale against arm A (rings hardcoded
to road/bird/heart across three cups). Coffee needs the symbol-device path.

Ring geometry lives in a per-device JSON, never in the script, because the
coordinates belong to one exact photograph."
```

---

### Task 3: Derive `compose-read-strips.mjs`'s roster from the registry

`scripts/compose-read-strips.mjs:33` holds `const DEVICES = ['candle', 'dream', 'tea']` — a hand-typed device list inside a funnel whose entire premise is that no such list exists. Coffee is the change that would otherwise grow it.

**Files:**
- Modify: `scripts/compose-read-strips.mjs:20-33`

**Interfaces:**
- Consumes: `DEVICE_IDS` from `shared/readDevices`
- Produces: unchanged CLI — `node scripts/compose-read-strips.mjs <art-dir> <out-dir>`

- [ ] **Step 1: Replace the literal with the derived roster**

In `scripts/compose-read-strips.mjs`, add to the imports:

```js
import { DEVICE_IDS } from '../shared/readDevices.ts'
```

Replace line 33:

```js
const DEVICES = ['candle', 'dream', 'tea']
```

with:

```js
// 🔴 DERIVED, NOT TYPED. A hand-kept device list is the drift this whole funnel is
// built to make impossible, and it had quietly grown one here. `candle` is drawn
// but unwired, so it is not in DEVICE_IDS — it is named separately as art that
// exists ahead of its registry entry, which is a different thing from a roster.
const UNWIRED = ['candle']
const DEVICES = [...new Set([...DEVICE_IDS, ...UNWIRED])]
```

- [ ] **Step 2: Note the file now needs `tsx`**

It imports a `.ts` module, so it can no longer run under bare `node`. Update the usage comment at the top:

```js
//   npx tsx scripts/compose-read-strips.mjs <art-dir> <out-dir>
```

and the `usage:` line in the argument check to match.

- [ ] **Step 3: Run it and confirm output is unchanged**

```bash
npx tsx scripts/compose-read-strips.mjs improve-v1/fb-read/images/panels /tmp/strips-check
ls -la /tmp/strips-check
```

Expected: `candle-strip.jpg`, `dream-strip.jpg`, `tea-strip.jpg`, `tea-reveal-strip.jpg` — the same four files, at 1080×360. `coffee` prints `skipped — panels not present`, which is correct: coffee is a symbol device and its art comes from `ring-read-cup.mjs`, not from three panels.

- [ ] **Step 4: Commit**

```bash
git add scripts/compose-read-strips.mjs
git commit -m "refactor(fb-read): derive compose-read-strips' roster from DEVICE_IDS

A hand-typed device list had grown inside the one funnel built so that no
such list exists. candle stays named separately: it is art ahead of its
registry entry, not a roster."
```

---

### Task 4: Give `build-read-ad.mjs` a `--device` argument

`scripts/build-read-ad.mjs:22` hardcodes `CUP = 'improve-v1/fb-read/images/armb/cup.png'` and line 64 hardcodes `DEVICE = DEVICES.tea`, so it cannot build a coffee ad at all.

**Files:**
- Modify: `scripts/build-read-ad.mjs:1-40, 64`

**Interfaces:**
- Consumes: `HEADLINES`, `READ_HOOKS`, `DEVICES`, `isReadDevice` from `shared/readDevices`
- Produces: CLI `npx tsx scripts/build-read-ad.mjs [hook] [--device <id>] [--sub <text>] [--out <dir>]`, defaulting to `tea` so every existing invocation keeps working

- [ ] **Step 1: Add the argument and a per-device cup map**

In `scripts/build-read-ad.mjs`, extend the import on line 20:

```js
import { HEADLINES, READ_HOOKS, DEVICES, isReadDevice } from '../shared/readDevices.ts'
```

Replace line 22:

```js
const CUP = 'improve-v1/fb-read/images/armb/cup.png'
```

with:

```js
// The AD is composed from the master PNG, not from the served JPEG: the ad is
// re-cropped to 4:5 and 1:1 and re-compressed, so starting from an already-lossy
// copy compounds the artefacts on the one image she sees in the feed.
//
// Keyed by device rather than derived from cfg.cupImage for that reason — the
// registry points at what the LANDER serves, which is the wrong source here.
const CUP_MASTER = {
  tea: 'improve-v1/fb-read/images/armb/cup.png',
  coffee: 'improve-v1/fb-read/images/coffee/cup.png',
}

const devAt = process.argv.indexOf('--device')
const argDevice = devAt > -1 ? process.argv[devAt + 1] : 'tea'
if (!isReadDevice(argDevice)) {
  console.error(`unknown device "${argDevice}". known: ${Object.keys(DEVICES).join(', ')}`)
  process.exit(2)
}
if (DEVICES[argDevice].pick !== 'symbol') {
  // The ad's whole layout is one photograph plus a lettered options row. A panel
  // device has three different pictures and no single cup to compose over.
  console.error(`device "${argDevice}" is not a pick:'symbol' device — this ad shape needs one cup`)
  process.exit(2)
}
const CUP = CUP_MASTER[argDevice]
if (!CUP) {
  console.error(`no ad master registered for "${argDevice}" — add it to CUP_MASTER`)
  process.exit(2)
}
```

- [ ] **Step 2: Make the hook argument survive a leading `--device`**

Line 23 takes `process.argv[2]` as the hook unless it starts with `--`, which breaks on `build-read-ad.mjs --device coffee love-again`. Replace it:

```js
const argHook = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'love-again'
```

with:

```js
// The first bare argument that is not a flag's VALUE. Without this,
// `--device coffee love-again` reads "coffee" as the hook.
const FLAG_VALUES = new Set(['--device', '--sub', '--out'])
const bare = process.argv.slice(2).filter((a, i, all) => {
  if (a.startsWith('--')) return false
  const prev = all[i - 1]
  return !(prev && FLAG_VALUES.has(prev))
})
const argHook = bare[0] ?? 'love-again'
```

- [ ] **Step 3: Point the output directory and the device at the argument**

Replace line 30:

```js
const OUT = outAt > -1 ? process.argv[outAt + 1] : 'improve-v1/fb-read/images/armb/ads'
```

with:

```js
const OUT =
  outAt > -1
    ? process.argv[outAt + 1]
    : `improve-v1/fb-read/images/${argDevice === 'tea' ? 'armb' : argDevice}/ads`
```

Replace line 64:

```js
const DEVICE = DEVICES.tea
```

with:

```js
const DEVICE = DEVICES[argDevice]
```

- [ ] **Step 4: Confirm the tea ad is byte-for-byte unchanged**

The refactor must not move the existing creative.

```bash
npx tsx scripts/build-read-ad.mjs love-again --out /tmp/ad-after
for f in love-again-1080x1350.jpg love-again-1080x1080.jpg; do
  cmp /tmp/ad-after/$f improve-v1/fb-read/images/armb/ads/$f && echo "SAME  $f"
done
```

Expected: `SAME` for both. If they differ, the refactor changed behaviour — find it before continuing.

- [ ] **Step 5: Confirm the guards fire**

```bash
npx tsx scripts/build-read-ad.mjs love-again --device dream    # expect exit 2, "not a pick:'symbol' device"
npx tsx scripts/build-read-ad.mjs love-again --device coffee   # expect exit 1, "missing improve-v1/fb-read/images/coffee/cup.png"
npx tsx scripts/build-read-ad.mjs --device tea still-think --out /tmp/ad-order
```

Expected: the first two exit non-zero with those messages; the third prints `"Does he still think about me?"   (still-think)`, proving the flag-before-hook ordering works.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-read-ad.mjs
git commit -m "feat(fb-read): build-read-ad takes --device

Hardcoded to the armb cup path and DEVICES.tea, so it could not build an ad
for a second symbol device. Defaults to tea, so existing invocations are
unchanged — verified byte-for-byte against the shipped creative."
```

---

### Task 5: Re-open the device axis in the docs

`improve-v1/fb-read/README.md` carries a `🔴 SCOPE CHANGED 2026-08-31 — tea only` section stating *"all new hooks are built on `tea` alone"* and that the test variable is now the hook. Coffee contradicts it. A doc that contradicts the code is worse than no doc.

**Files:**
- Modify: `improve-v1/fb-read/README.md` — the `SCOPE CHANGED` section and the "The test this was built to run" table

**Interfaces:** none — documentation.

- [ ] **Step 1: Replace the scope section**

Replace the whole `## 🔴 SCOPE CHANGED 2026-08-31 — tea only` section (through to the `---` before `## The registry`) with:

```markdown
## Scope — the device axis, closed and re-opened

**2026-08-31 — closed.** Work stopped on `dream` and all new hooks were built on
`tea` alone, making the HOOK the test variable.

**2026-09-01 — re-opened, for `coffee`.** That closure was a scope call, not a
result: nothing in `/fb-read` had ever been deployed, so no device had a single
data point and there was no winner to protect. Coffee is built on the same three
hooks as tea, so the picture is (nearly) the only variable and no new guard is
needed. See `docs/superpowers/specs/2026-09-01-fb-read-coffee-device-design.md`.

⚠ **One caveat on reading a coffee-vs-tea result.** Coffee uses coffee-native
symbol names rather than reusing bird / tree / anchor (operator call). So the
picture AND the three option labels both changed, and a winner is not cleanly
attributable to the photograph alone.

`dream` stays FROZEN, not deleted: its three hooks are written, tested and passing,
it stays registered, and it still serves. Nothing further gets built on it.

The headline stays hook-level in the code regardless — that is what stops a device
ever quietly changing the question.
```

- [ ] **Step 2: Update the test table**

In the `## The test this was built to run` table, change the `Devices` row to:

```markdown
| Devices | `dream` (frozen), `tea`, `coffee` (and `candle`, unwired) |
```

and the `The only variable` row to:

```markdown
| The only variable | **the picture** — plus coffee's own symbol names, see the caveat above |
```

- [ ] **Step 3: Commit**

```bash
git add improve-v1/fb-read/README.md
git commit -m "docs(fb-read): re-open the device axis for coffee

The Aug 31 closure was a scope call, not a result — nothing had deployed, so
no device had a data point to protect."
```

---

## Phase B — the art ✅ COMPLETE

Tasks 6, 7 and 8 are done, and one of them no longer exists in the form planned.

| Planned | Outcome |
|---|---|
| **Task 6** — licence-checked reference photography | ✅ `c1affef`. Four clean cups (3× CC0, 1× public domain) plus the finding that decided everything: **a heavy draw coats, a light draw leaves isolated marks** |
| **Task 7** — write a prompt, generate five candidates a round, machine-select, two-round floor | ❌ **deleted.** A real CC0 photograph exists. Nothing is generated, and `select-tea-cup.mjs` is not used |
| **Task 8** — pick, assign, ring, install | ✅ `e393d9a`. Cropped, ringed, installed, `SOURCE.md` written |

**What shipped:** `improve-v1/fb-read/images/coffee/` — `cup.png` (1254² master),
`rings.json` (the only home for the coordinates), `cup-ringed.png`,
`cup-ringed-labelled.jpg` (**review only, never serve**), three 520² reveal crops and
`reveal-strip.jpg` (1560×520). Served: `client/public/read/coffee-cup.jpg` and
`coffee-reveal-strip.jpg`.

**The symbols, read off the photograph:**

| | Symbol | Where | Depth reading | Archetype |
|---|---|---|---|---|
| a | **Road** | high on the far wall, under the rim | the weeks just ahead | the moving heart |
| b | **Tree** | mid-wall, left of centre | what is standing now | the standing heart |
| c | **Lake** | the floor of the cup | what she was built on | the deep heart |

🔴 **Two things a later session will get wrong unless it reads `SOURCE.md` first.**
Depth on this cup is **observed, not computed** — the cup is tilted, so its floor is
low in the frame and not at the image centre; recompute positions as
distance-from-centre and the lake comes back as "near the rim", inverting the reading.
And **there is no handle rule** for coffee: the handle is outside the crop, and the
drain gives a cleaner axis than handle-side ever did.

---

## Phase C — the copy

**Nine readings, seven cuts each.** Written to the photograph from Task 8, one draft file per hook. Each is reviewed before it is compiled.

### Task 9: `coffee-love-again.json`

**Files:**
- Create: `fb-read/docs/drafts/coffee-love-again.json`

**Interfaces:**
- Consumes: `improve-v1/fb-read/images/coffee/SOURCE.md` geometry; `READ_FRAME['love-again']` (unchanged); `fb-read/docs/drafts/tea-love-again.json` as the shape reference
- Produces: three 7-bubble reads keyed `a`/`b`/`c`, matching the symbol order in `rings.json`

- [ ] **Step 1: Read the three inputs**

```bash
cat fb-read/docs/drafts/tea-love-again.json          # the shape and the note's depth
cat improve-v1/fb-read/images/coffee/SOURCE.md       # the positions the copy must match
sed -n '/love-again.*{/,/},/p' shared/readDevices.ts # the guard, verbatim
```

- [ ] **Step 2: Write the file**

Exact JSON shape — `device`, `hook`, `headline`, `method`, `frame`, `note`, `voc`, `reads`:

```json
{
  "device": "coffee",
  "hook": "love-again",
  "headline": "Will I love again?",
  "method": "natural-cut",
  "frame": "self-frame",
  "note": "<the copy brief — see Step 3>",
  "voc": {
    "pulled": "none",
    "verdict": "inherited",
    "why": "inherits the shipped tea love-again finding; same hook, same frame, new device"
  },
  "reads": {
    "a": ["cut 1", "cut 2", "cut 3", "cut 4", "cut 5", "cut 6", "cut 7"],
    "b": ["…"],
    "c": ["…"]
  }
}
```

- [ ] **Step 3: Write the `note` — coffee's own, not tea's**

Tea's note is device-specific in ways that are wrong here. Carry over the hook-level material **verbatim in force**:

> SELF-FRAME. The hopeful yes is affirmed with warmth and certainty — that is what the ad sold her, and a read that withholds it feels like a con. Only the specifics are withheld. NEVER A NAME AND NEVER EXACTLY WHO. NEVER A DATE OR ANY LENGTH OF TIME — and not the softened forms either ("soon", "closer than you think"): a gentle timing promise is the same promise, and it is the one claim she can later check and find false. NEVER A PLACE. NO SPECIFIC MAN ANYWHERE — this is not reunion copy. Her heartbreak may be named as HERS because she brought it; the person who caused it may not. SHE IS HEARTBROKEN, NOT BEREAVED. NO BLAME AND NO GRADING — never closed off, not healed, not ready, not loving herself enough; she arrives having already been told all of it. NO TACTIC OR COACHING. CUT 3 ANSWERS FLAT, and the three cut-3 lines answer three different fears so the panels do not collapse into one sentence said three ways. CUT 6 RECOGNISES AND NEVER RE-ASKS — cut 2 already echoed the ad question.

Then replace tea's device paragraph with coffee's:

> ARM B — SHE NAMES THE SYMBOL, SO CUT 1 CONFIRMS AND PLACES IT; IT DOES NOT REVEAL IT. She has already tapped the name on a lander showing one cup, so telling her it is there reveals nothing. Cut 1 agrees with her and adds the half she could not have: WHERE it sits. Every position word is read off the actual photograph (`improve-v1/fb-read/images/coffee/SOURCE.md`) — never invented and never carried over from tea. DEVICE RULES: the cup was turned onto the saucer and drained, so the grounds ran DOWN the wall, and DEPTH is the whole reading. The road sits high on the wall under the RIM — the weeks just ahead. The tree sits HALFWAY UP the wall — what is standing now. The lake lies on the FLOOR — what she was built on, the oldest thing. THERE IS NO HANDLE RULE ON THIS CUP: the handle is outside the crop, nothing may be read as her side or the far side, and depth carries everything. Grounds in a line are movement; grounds gathered in one place are something settled. The system is never explained to her — she should feel the position mean something, never be taught it. THE SYMBOL IS A PICTURE AND NEVER GETS INTENT OR MOTION: the road does not lead her anywhere while she watches, the tree does not grow, the lake does not rise. The moment any of them moves, the grounds have quietly become a man doing something. NOTHING INVENTED ABOUT HER WAKING LIFE: no gesture, habit, routine, count, age or event, and nothing about how she takes her coffee, how often, with whom, or whether she has had a reading before.

Finish with the three fears, naming the symbols actually assigned in Task 8 — e.g. *"The three fears answered at cut 3 are: nothing is coming and the days ahead are just more of this (road), it broke me and there is nothing of me left standing (tree), something in me is wrong at the root and always was (lake)."*

- [ ] **Step 4: Write the twenty-one bubbles**

Per read, in order:

| Cut | Job | Trap to avoid |
|---|---|---|
| 1 | confirm the symbol and **place** it | do not reveal — she named it |
| 2 | echo the ad question, then what the symbol means here | |
| 3 | **answer the fear, flat** | all three must answer **different** fears |
| 4 | name what is withheld — no name, no face, no when | |
| 5 | the turn: what that means she has been carrying | |
| 6 | **recognise** what she has lived | never re-ask her question — that was cut 2 |
| 7 | open the loop into the chat | |

Constraints on every one: **≤25 words, ≤2 sentences, no exclamation mark**. Read the tea file's `reads` for cadence — Evelyn is spoken, contractions are normal, no aphorisms and no balanced clauses.

🔴 **Art coherence.** Cut 1 must carry the content words of the `mark` you will write in Task 12, because the eval requires it. Draft the three `mark` strings alongside cut 1 so they agree from the start.

- [ ] **Step 5: Read it back against the picture**

Open `improve-v1/fb-read/images/coffee/cup-ringed-labelled.jpg` and read all twenty-one bubbles beside it. **Any line naming a position the picture denies is the one unrecoverable fault.** Grep your own draft for position words and check each:

```bash
grep -o -E "(rim|middle|bottom|floor|handle|far side|near|low|high|halfway|toward)" \
  fb-read/docs/drafts/coffee-love-again.json | sort | uniq -c
```

- [ ] **Step 6: 🚦 Operator review before compiling**

Print the three reads as plain text and get a human read-through. The eval scores the copy against a rubric; it cannot tell you whether the reading is any good.

- [ ] **Step 7: Commit**

```bash
git add fb-read/docs/drafts/coffee-love-again.json
git commit -m "copy(fb-read): coffee love-again, three reads"
```

---

### Task 10: `coffee-still-think.json`

**Files:**
- Create: `fb-read/docs/drafts/coffee-still-think.json`

**Interfaces:**
- Consumes: same geometry and shape references as Task 9; `READ_FRAME['still-think']`
- Produces: three 7-bubble reads keyed `a`/`b`/`c`

- [ ] **Step 1: Read the hook's own material**

```bash
cat fb-read/docs/drafts/tea-still-think.json
sed -n '/"still-think": {/,/},/p' shared/readDevices.ts
```

This is a **decode-him** hook, not self-frame. Its frame line is *"This reading is about what SHE is carrying, and never about what he is doing or feeling"*.

- [ ] **Step 2: Write the file, same JSON shape as Task 9**

`"device": "coffee"`, `"hook": "still-think"`, `"headline": "Does he still think about me?"`, `"method": "natural-cut"`, `"frame"` matching tea's still-think draft.

- [ ] **Step 3: Write the `note`**

Carry the hook-level guard verbatim in force:

> NEVER STATE THAT HE THINKS OF HER AND NEVER STATE THAT HE DOES NOT, and never in softened form: not "he thinks of you more than you know", not "you cross his mind more often than he lets on", not "part of him still". NEVER invent a scene of him remembering her. NEVER pathologise her for asking — no obsessed, stuck, fixated, needy, or "you should be asking for more". NEVER instruct her to let go or move on. NEVER a timeframe. NEVER a tactic or a test to run on him. The reading lands on: what happened is not stored in his memory alone and does not shrink if he has put it down.

Note that on this hook **a man is presupposed by the headline**, so referring to him is not "inventing" one — the eval learned this the hard way. What is banned is ruling on what he thinks.

Then coffee's device paragraph, identical in force to Task 9 Step 3.

Then this hook's own three fears at cut 3 — three different ones, e.g. *"I have already been forgotten" (road) / "there is no way back to being known like that" (key) / "what we had did not count for anything" (bridge)"* — adapted to the symbols actually assigned.

- [ ] **Step 4: Write the twenty-one bubbles**

Same seven-cut table and same limits as Task 9 Step 4. The resolution this hook reaches — *what happened is not stored in his memory alone* — is the whole reason the question is answerable without anyone speaking for him. Land there.

- [ ] **Step 5: Read back against the picture**

As Task 9 Step 5.

- [ ] **Step 6: 🚦 Operator review, then commit**

```bash
git add fb-read/docs/drafts/coffee-still-think.json
git commit -m "copy(fb-read): coffee still-think, three reads"
```

---

### Task 11: `coffee-hiding-something.json`

**Files:**
- Create: `fb-read/docs/drafts/coffee-hiding-something.json`

**Interfaces:**
- Consumes: same geometry and shape references; `READ_FRAME['hiding-something']`
- Produces: three 7-bubble reads keyed `a`/`b`/`c`. This completes 9/9

- [ ] **Step 1: Read the hook's own material**

```bash
cat fb-read/docs/drafts/tea-hiding-something.json
sed -n '/"hiding-something": {/,/},/p' shared/readDevices.ts
```

🔴 **This guard shares almost nothing with `still-think`'s**, despite both being decode-him in shape. Do not reason from the other one.

- [ ] **Step 2: Write the file, same JSON shape**

`"device": "coffee"`, `"hook": "hiding-something"`, `"headline": "Is he hiding something from me?"`.

- [ ] **Step 3: Write the `note`**

Carry the guard verbatim in force:

> NEVER state that he IS hiding something and NEVER state that he is not — both are verdicts on a real man drawn from a picture, and the second also tells her that what she noticed was not there. NEVER NAME OR GUESS THE CONTENTS: not another woman, not money, not a secret past, not a feeling he will not admit — inventing it manufactures a crisis inside a relationship that is still running. NEVER HAND HER A TACTIC: no checking his phone, messages, socials or whereabouts, no testing him, no trap, no catching him out, and equally no ultimatum and no stepping back to provoke a reaction. NEVER pathologise her watchfulness — no paranoid, insecure, anxious, obsessive, overthinking. NEVER diagnose him as secretive, avoidant or dishonest as a character. Read what she chose as the SHAPE of the gap and what the not-knowing has cost her, and affirm that meeting an edge is not the same as imagining one.

⚠ The symbols work **unusually well** here and that is a trap: a road that stops, a key with no lock, a bridge that does not reach. Those are shapes of a gap and they are legitimate — but the moment a line implies what is *on the other side*, it has named the contents. Keep every one of them a description of the **edge**, never of what sits behind it.

Then coffee's device paragraph, then three different fears at cut 3.

- [ ] **Step 4: Write the twenty-one bubbles**

Same seven-cut table and same limits. Land on: **meeting an edge is not the same as imagining one.**

- [ ] **Step 5: Read back against the picture, then grep for the two specific harms**

```bash
grep -n -i -E "another woman|affair|cheat|lying|liar|secret|check his|his phone|test him|paranoid|anxious|overthink" \
  fb-read/docs/drafts/coffee-hiding-something.json
```

Expected: **no matches.** Any hit is either naming the contents or pathologising her.

- [ ] **Step 6: 🚦 Operator review, then commit**

```bash
git add fb-read/docs/drafts/coffee-hiding-something.json
git commit -m "copy(fb-read): coffee hiding-something, three reads — 9/9 written"
```

---

## Phase D — wire and verify

### Task 12: The registry entry

**Files:**
- Modify: `shared/readDevices.ts` — `ReadDevice` union, new `COFFEE` const, `DEVICES` map
- Generated: `shared/readCopy.ts`, `fb-read/docs/lander-registry.md`

**Interfaces:**
- Consumes: everything above
- Produces: `DEVICES.coffee`, so `DEVICE_IDS`, `isReadDevice`, the route validators, the eval, the registry and the walk page all pick coffee up with no further edit

- [ ] **Step 1: Extend the device union**

In `shared/readDevices.ts`:

```ts
export type ReadDevice = "dream" | "tea" | "coffee";
```

Also update the header comment listing the axes:

```ts
//   device  — ?device=  which instrument the ad quizzed (dream | tea | coffee)
```

- [ ] **Step 2: Add the config**

Immediately after the `TEA` const. Fill `optionLabel`, `mark` and `reading` from Task 8's assignments and Task 9's cut-1 lines — the example below uses road/key/bridge and **must be replaced with the real values**:

```ts
// A second device on the same three hooks, so the picture is the variable and no
// new guard is needed. Same pick mechanic as tea, deliberately: change the picture
// AND how she chooses and neither can be read as the cause.
//
// ⚠ Coffee uses coffee-native symbol names rather than reusing bird/tree/anchor
// (operator call, 2026-09-01), so the option labels changed too. A coffee-vs-tea
// result is not cleanly attributable to the photograph alone. Recorded in
// docs/superpowers/specs/2026-09-01-fb-read-coffee-device-design.md.
const COFFEE: DeviceConfig = {
  id: "coffee",
  eyebrow: "The Cup Has Been Turned",
  instruction: "Look into the cup. Which of these do you see?",
  beatNoun: "cup",
  continueCta: "There's more the cup is showing me — begin your free reading",
  chooseMoment: "the moment you named it",
  pick: "symbol",
  cupImage: { url: "/read/coffee-cup.jpg", width: 1254, height: 1254 },
  cupAlt: "The inside of a coffee cup, the grounds drained down its pale wall",
  optionLabel: { a: "Road", b: "Tree", c: "Lake" },
  // Unused while pick is 'symbol' — the lander reads cupImage. Kept pointing at
  // the same file so a missing cupImage degrades to the right picture.
  strip: { url: "/read/coffee-cup.jpg", width: 1254, height: 1254 },
  // 1560×520, not tea's 1260×420 — the road is a long mark and needs a wider reveal.
  revealStrip: { url: "/read/coffee-reveal-strip.jpg", width: 1560, height: 520 },
  // Tea's grammar is SETTLING and leans on handle-side; coffee's is the DRAIN, and
  // DEPTH carries the meaning. No handle rule — the handle is outside the crop.
  grammar:
    "The cup was drunk down, turned upside down onto the saucer and left to drain, so the grounds ran DOWN the wall and settled as they went. Depth is the whole reading here. A mark high on the wall, just under the RIM, came to rest last and belongs to the weeks just ahead. A mark HALFWAY UP the wall is what is standing in her life now. A mark on the FLOOR of the cup settled first and belongs to what she was built on — the oldest thing, the ground under everything else. Grounds that run in a LINE are movement; grounds gathered in ONE PLACE are something settled and already hers. Use this; it is what makes a reading feel earned rather than guessed. Never explain the system to her — she should feel the position mean something, never be taught it.",
  options: ["a", "b", "c"],
  // Measured off the photograph — see improve-v1/fb-read/images/coffee/SOURCE.md.
  // 🔴 These must carry the same content words as cut 1 of each read, or the
  // eval's art-coherence check fails the build.
  mark: {
    a: "a road running under the rim of the cup",
    b: "a tree halfway up the wall of the cup",
    c: "a lake in the bottom of the cup, where the grounds settled first",
  },
  reading: {
    a: "the moving heart",
    b: "the standing heart",
    c: "the deep heart",
  },
};
```

- [ ] **Step 3: Register it**

```ts
export const DEVICES: Record<ReadDevice, DeviceConfig> = {
  dream: DREAM,
  tea: TEA,
  coffee: COFFEE,
};
```

- [ ] **Step 4: Compile the copy**

```bash
node scripts/build-read-copy.mjs
```

Expected: it emits `shared/readCopy.ts` and then regenerates `fb-read/docs/lander-registry.md`. It **refuses** anything carrying `__UNWRITTEN__`, over 25 words, over 2 sentences, or containing an exclamation mark — a refusal here names the offending bubble; fix the draft, never `readCopy.ts`.

- [ ] **Step 5: Run the guard file**

```bash
npx vitest run tests/fb-read-registry.test.ts
```

Expected: **6 passed**. The `cupAlt` test proves coffee's alt text names neither `tea` nor `dream`; the art test proves both coffee images are on disk now that coffee is servable.

- [ ] **Step 6: Free copy check**

```bash
npx tsx improve-v1/fb-read/evals/run-eval.mjs --dry
```

Expected: the WRITTEN half only, no model calls. **27/27** across 3 hooks × 3 devices × 3 panels.

🔴 If art coherence fails with `mark words absent: …`, cut 1 and the `mark` disagree. **The picture wins** — fix whichever of the two the photograph contradicts.

🔴 If a guard fires, **check the assertion, not the vocabulary.** The eval has cried wolf five times, every time flagging something the approved copy does deliberately: reflecting back a man she named, naming her smaller ask, quoting her own question. A claim only counts when it is not behind a negation or an interrogative.

- [ ] **Step 7: Pin the guards**

```bash
npx tsx improve-v1/fb-read/evals/run-eval.mjs --selftest
```

Expected: **10/10**, no model calls. If you loosened anything in Step 6, this is what proves the loosening did not rot the guard.

- [ ] **Step 8: Commit**

```bash
git add shared/readDevices.ts shared/readCopy.ts fb-read/docs/lander-registry.md
git commit -m "feat(fb-read): wire coffee as a second device

Same three hooks as tea, so no new guard. pick:'symbol' held constant so the
picture is the variable. Coffee's own grammar carries the drain — the cup was
turned onto the saucer, so direction means something tea's settling cannot."
```

---

### Task 13: The live eval and the persona walks

**Files:** none created. This is verification.

**Interfaces:**
- Consumes: everything wired in Task 12
- Produces: `audit-runs/fb-read-walk/index.html` — seven whole conversations a human reads

- [ ] **Step 1: Run the live eval, both halves**

```bash
npm run dev      # needs a live ANTHROPIC_API_KEY
npx tsx improve-v1/fb-read/evals/run-eval.mjs
```

🔴 **Restart the dev server first if `shared/readDevices.ts` changed since it started.** A stale server serves old marks while the eval grades new ones.

Expected: 27 cases, both halves. **The live eval is not deterministic** — tea alone scored 18/18 and 16/18 on clean runs — so read the *failures*, never the total. Re-run a failing case before believing it.

- [ ] **Step 2: Start the sandbox server**

🔒 **Never the ordinary dev server.** Dev and production share a database; a "sandboxed" run in July fired 309 real Lead events.

```bash
PORT=5056 DOTENV_CONFIG_PATH=.env.sandbox NODE_ENV=development npx tsx server/index.ts
```

- [ ] **Step 3: Walk every persona on coffee**

```bash
LOCAL_BASE_URL=http://localhost:5056 node scripts/walk-read-all.mjs coffee
```

Takes ~40 minutes; these are live model calls.

- [ ] **Step 4: 🚦 Read the walks**

```bash
open audit-runs/fb-read-walk/index.html
```

- **Read the first turns, discount the rest.** Only turn 1 is the persona; the eight after are deliberately plain filler, because the walk tests whether the funnel REACHES the pitch, not her prose. Judge Evelyn's opening replies hard and the later ones lightly.
- **`7/7 reached the close` is the plumbing, not the verdict** — it is exactly the number that hides a bad reading.
- Watch specifically for the generated half **re-describing the picture**. `buildReadReflectPrompt` passes the opening bubble under `## ALREADY SAID` with "do not describe the picture again" as its first rule; coffee is the first test of that on a second symbol device.
- Watch for the model explaining the **grammar** to her. She should feel the position mean something, never be taught it.
- Flag anything the funnel serves that it should not by opening a persona `note` with 🔴 — the walk page flags those automatically, which is cheaper than hand-keeping `OPEN_THREADS`.

- [ ] **Step 5: Report findings before proceeding**

Any breach found here is a copy fix in a draft plus a recompile, not a code change. Loop back to the relevant Phase C task.

---

### Task 14: The ad, and closing the docs

**Files:**
- Create: `improve-v1/fb-read/images/coffee/ads/` (generated)
- Modify: `fb-read/docs/HANDOVER.md` — §7 device instructions and the §8 command list

**Interfaces:**
- Consumes: Task 4's `--device`, Task 8's PNG master
- Produces: the three ad creatives and a handover a fresh session can run from

- [ ] **Step 1: Build the three ads**

```bash
npx tsx scripts/build-read-ad.mjs love-again       --device coffee
npx tsx scripts/build-read-ad.mjs still-think      --device coffee
npx tsx scripts/build-read-ad.mjs hiding-something --device coffee
```

Expected: two files per hook (1080×1350 portrait, 1080×1080 square) in `improve-v1/fb-read/images/coffee/ads/`.

- [ ] **Step 2: Check the ad against the lander**

Open a portrait ad beside the lander. The **question** must be identical — it is imported from `HEADLINES`, so it cannot drift, but confirm the render. The **three option names in the same order** must match the lander's buttons. Nothing she decided in the feed should have to be decided again.

🔴 The options row is a plain row along the bottom and is **never** placed over the regions it belongs to. Pointing A at a spot in the cup hands her the answer's location before Evelyn has said a word.

- [ ] **Step 3: Update `HANDOVER.md` §7**

Replace the `### A new device — new artwork` paragraph with the truth this work established:

```markdown
### A new device — new artwork

For a **panel** device (`dream`, `candle`): one `DeviceConfig` entry plus a strip in
`client/public/read/`, composed by `npx tsx scripts/compose-read-strips.mjs`.

For a **`pick:'symbol'`** device (`tea`, `coffee`) there is more, because she taps a
name over one photograph:

1. Licence-checked reference photography FIRST — it decides the brief.
2. Five candidates per round → `node scripts/select-tea-cup.mjs <dir> --debug`.
   Run `--debug` before believing any number; that harness has printed confident
   wrong numbers five times. Two failed rounds means stop generating and shoot.
3. Human picks at zoom, assigns symbols to regions **by position, after the art**.
4. `node scripts/ring-read-cup.mjs <rings.json> <out-dir>` — the ringed cup, three
   420² crops and the 1260×420 reveal strip. Ring geometry lives in the per-device
   `rings.json` and belongs to that ONE photograph.
5. Write `SOURCE.md`: provenance, the geometry table, and what is never served.
6. The config needs `pick`, `cupImage`, `cupAlt`, `optionLabel`, `revealStrip` and
   its OWN `grammar`. `tests/fb-read-registry.test.ts` enforces all of them.
7. Then the readings, written to the photograph — never before it.

⚠ **Fix candle's copy before wiring it.** The flame leans *right* while the draft
says "pulls left"; the smoke is pale grey while the draft says "dark smoke". The
picture should win — change the copy.
```

- [ ] **Step 4: Update `HANDOVER.md` §8 commands**

Add the commands this work introduced:

```bash
# the /fb-read guard file — registry freshness and per-device invariants
npx vitest run tests/fb-read-registry.test.ts

# reveal art for a pick:'symbol' device
node scripts/ring-read-cup.mjs improve-v1/fb-read/images/coffee/rings.json \
                               improve-v1/fb-read/images/coffee

# the ad, per device
npx tsx scripts/build-read-ad.mjs love-again --device coffee
```

- [ ] **Step 5: Regenerate the registry and confirm the whole suite**

```bash
npx tsx scripts/read-registry.mjs
npx vitest run tests/fb-read-registry.test.ts tests/ring-read-cup.test.ts
```

Expected: registry prints `27/27 landers written across 3 hooks × 3 devices`; vitest **9 passed**.

- [ ] **Step 6: Commit**

```bash
git add improve-v1/fb-read/images/coffee/ads/ fb-read/docs/HANDOVER.md \
        fb-read/docs/lander-registry.md
git commit -m "feat(fb-read): coffee ad creative, and a handover that matches the build

§7 said a device was 'one config entry plus its art'. True for the runtime;
the symbol-device art pipeline did not exist as reusable tooling until now."
```

---

## Done means

| | |
|---|---|
| `npx vitest run tests/fb-read-registry.test.ts tests/ring-read-cup.test.ts` | 9 passed |
| `npx tsx scripts/read-registry.mjs --check` | current — 27/27 across 3 hooks × 3 devices |
| `npx tsx improve-v1/fb-read/evals/run-eval.mjs --dry` | 27/27 WRITTEN |
| `npx tsx improve-v1/fb-read/evals/run-eval.mjs --selftest` | 10/10 |
| `npx tsx improve-v1/fb-read/evals/run-eval.mjs` | read the failures, not the total — it is not deterministic |
| `node scripts/walk-read-all.mjs coffee` | 7 personas read by a human, from a **sandbox** server |
| Ads | 6 files across 3 hooks, question and option order matching the lander |
| Docs | README scope section, HANDOVER §7 and §8, `SOURCE.md`, `REFERENCES.md` all match the code |

**Not in scope, and still true afterwards:** `candle` remains unwired with two art/copy mismatches; nothing here is merged to `Production` or deployed; shape-picking (`pick:'panel'`) as a mechanic test is a separate, later test.
