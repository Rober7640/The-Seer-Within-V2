import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { DEVICES, type ReadOption } from '../shared/readDevices'
import { READS } from '../shared/readCopy'

// The coffee A/B/C guard.
//
// 🔴 WHY THIS FILE EXISTS. On 2026-09-03 coffee's A and B were swapped so the lander
// matched the ad creatives, which had gone out with A as the tree and B as the road.
// The letters are DERIVED from the option keys (`OPTION_LABEL` in ReadBridge.tsx,
// `LETTER` in build-read-ad.mjs), so there is no letter to edit — the fix is to move
// everything that hangs off the key.
//
// That is FIVE places, and they fail INDEPENDENTLY and SILENTLY:
//   1. optionLabel   the name on the button
//   2. mark          the phrase injected into the Version-C prompt
//   3. reading       the archetype label
//   4. READS         the 21 written bubbles (generated from fb-read/docs/drafts/)
//   5. rings.json    the ring geometry, which fixes the ORDER OF THE REVEAL PANELS
//
// Move four and forget the fifth and the page still renders perfectly. She taps
// "A. Tree", and is shown a ringed ROAD while Evelyn describes a tree — the exact
// failure the art brief exists to prevent, invisible to anyone reading the diff.
//
// So this file does not check the letters in isolation. It checks that all five agree
// WITH EACH OTHER, which is the only property that actually matters.

const COFFEE = DEVICES.coffee
const RINGS = 'improve-v1/fb-read/images/coffee/rings.json'
const OPTIONS: ReadOption[] = ['a', 'b', 'c']

// The symbol each option must carry, everywhere. Written out rather than derived so
// that a wholesale re-swap has to come through this line and be a deliberate act.
const EXPECTED: Record<ReadOption, string> = { a: 'Tree', b: 'Road', c: 'Lake' }

describe('/fb-read coffee options', () => {
  it('labels A Tree, B Road, C Lake — the order the ad creatives use', () => {
    expect(COFFEE.optionLabel).toEqual(EXPECTED)
  })

  it('names the same symbol in the label, the mark and the written opening', () => {
    for (const o of OPTIONS) {
      const symbol = EXPECTED[o].toLowerCase()

      // The mark is what the server injects into the Version-C prompt.
      expect(COFFEE.mark[o], `coffee.mark.${o}`).toContain(symbol)

      // …and every written opening bubble must describe that same mark, or the
      // picture she was shown and the words she is read come apart.
      for (const hook of Object.keys(READS.coffee ?? {})) {
        const opening = READS.coffee?.[hook as keyof typeof READS.coffee]?.[o]?.[0] ?? ''
        expect(opening.toLowerCase(), `READS.coffee.${hook}.${o} bubble 1`).toContain(symbol)
      }
    }
  })

  it('keeps each archetype with its own symbol', () => {
    expect(COFFEE.reading.a).toBe('the standing heart') // the tree — what is standing now
    expect(COFFEE.reading.b).toBe('the moving heart') // the road — the weeks just ahead
    expect(COFFEE.reading.c).toBe('the deep heart') // the lake — what she was built on
  })

  // 🔴 THE ONE THAT CATCHES A HALF-DONE SWAP.
  //
  // ring-read-cup.mjs writes reveal-strip.jpg by walking rings.json in a, b, c order,
  // and both the lander (ReadBridge's optionStyle) and the chat (revealArtFor) crop
  // that strip by `options.indexOf(opt)`. So rings.json's KEY ORDER *is* the panel
  // order of the served art. If it disagrees with optionLabel, the ring she is shown
  // belongs to a symbol she did not choose — and nothing else in the suite would
  // notice, because the registry and the copy would both still be self-consistent.
  it('has ring geometry whose keys match the labels, so the reveal panels line up', () => {
    expect(
      existsSync(RINGS),
      `${RINGS} is missing — it is the source of the served reveal strip and the only ` +
        `place the ring coordinates live`,
    ).toBe(true)

    const rings = JSON.parse(readFileSync(RINGS, 'utf8')).rings as Record<
      ReadOption,
      { label: string }
    >

    for (const o of OPTIONS) {
      expect(rings[o]?.label, `rings.json rings.${o}.label`).toBe(EXPECTED[o].toLowerCase())
    }
  })

  // The reveal strip is cropped into `options.length` equal panels, so the file has to
  // be exactly that many crops wide or every tap target slides off its artwork.
  it('declares a reveal strip that divides into three equal panels', () => {
    const strip = COFFEE.revealStrip
    expect(strip, 'coffee.revealStrip').toBeTruthy()
    expect(strip!.width / COFFEE.options.length).toBe(strip!.height)
  })
})
