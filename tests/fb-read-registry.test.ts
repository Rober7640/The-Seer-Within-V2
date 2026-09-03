// The /fb-read guard file.
//
// Every other funnel family has one. This funnel had the eval and its self-test and
// nothing in the ordinary test run that bites on the REGISTRY.
//
// 🔴 WHY THE FIRST TEST EXISTS. fb-read/docs/HANDOVER.md claimed "the test run calls
// read-registry.mjs --check, so editing a device, hook or guard without regenerating
// fails the tests rather than quietly drifting." Nothing called it. build-read-copy.mjs
// invokes the GENERATOR as a side effect of compiling copy, so editing
// shared/readDevices.ts alone — which is most of what adding a device is — left
// lander-registry.md stale and silent.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ReadDevice } from '../shared/readDevices'
import { DEVICES, DEVICE_IDS, READ_HOOKS } from '../shared/readDevices'
import { isReadWritten } from '../shared/readCopy'

const PUBLIC_READ = 'client/public/read'

// A device is SERVABLE once any one of its landers is written. Art is only required
// from that point — which is what lets a device's config land before its photograph
// without breaking the suite, and still fails the moment it can serve traffic.
function isServable(device: ReadDevice): boolean {
  return READ_HOOKS.some((h) => DEVICES[device].options.some((o) => isReadWritten(device, h, o)))
}

describe('fb-read registry', () => {
  it('lander-registry.md is not stale', () => {
    // --check exits 1 with a message naming the fix, 0 with a tally.
    expect(() =>
      // shell:true so this resolves npx.cmd on Windows. Without it execFileSync throws
      // `spawnSync npx ENOENT` on every Windows machine and the assertion fails for a
      // reason that has nothing to do with the registry being stale — a red guard that
      // protects nothing. The script needs tsx (it imports the TS registry), so plain
      // node cannot stand in for it.
      execFileSync('npx', ['tsx', 'scripts/read-registry.mjs', '--check'], {
        stdio: 'pipe',
        shell: true,
      }),
    ).not.toThrow()
  })

  it('every device id matches its own config id', () => {
    for (const id of DEVICE_IDS) expect(DEVICES[id].id).toBe(id)
  })

  it("every pick:'symbol' device carries the four fields that mechanic needs", () => {
    for (const id of DEVICE_IDS) {
      const cfg = DEVICES[id]
      if (cfg.pick !== 'symbol') continue
      // She taps a NAME over ONE photograph, so all four are load-bearing. Without
      // cupImage the lander falls back to a strip built for three panels; without
      // optionLabel the buttons render bare letters; without revealStrip the chat
      // shows an unringed cup while Evelyn describes a ring; without grammar the
      // generated half invents what a position means.
      expect(cfg.cupImage, `${id}.cupImage`).toBeTruthy()
      expect(cfg.optionLabel, `${id}.optionLabel`).toBeTruthy()
      expect(cfg.revealStrip, `${id}.revealStrip`).toBeTruthy()
      expect(cfg.grammar, `${id}.grammar`).toBeTruthy()
      for (const o of cfg.options) {
        expect(cfg.optionLabel?.[o], `${id}.optionLabel.${o}`).toBeTruthy()
        // Bare nouns, no article and no letter — the A/B/C prefix is derived at
        // render time in both the lander and the ad generator. Written as articles,
        // tea's first draft produced two options both labelled A.
        expect(cfg.optionLabel?.[o], `${id}.optionLabel.${o} has an article`).not.toMatch(/^(a|an|the)\s/i)
        expect(cfg.optionLabel?.[o], `${id}.optionLabel.${o} has a letter`).not.toMatch(/^[ABC][.)]\s*/)
      }
    }
  })

  it('the reveal strip is exactly three crops wide', () => {
    // The lander slices it into exact thirds by background-position and never
    // inspects the artwork for seams, so a strip that is not 3:1 in panel terms
    // silently shows her the wrong reveal for the symbol she tapped.
    for (const id of DEVICE_IDS) {
      const rs = DEVICES[id].revealStrip
      if (!rs) continue
      expect(rs.width, `${id}.revealStrip is not 3 equal panels`).toBe(rs.height * 3)
    }
  })

  it('every device carries a cupAlt, and it never names another instrument', () => {
    for (const id of DEVICE_IDS) {
      const cfg = DEVICES[id]
      expect(cfg.cupAlt, `${id}.cupAlt`).toBeTruthy()
      for (const other of DEVICE_IDS.filter((d) => d !== id)) {
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
