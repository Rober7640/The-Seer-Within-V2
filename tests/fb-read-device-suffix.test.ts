import { describe, it, expect } from 'vitest'
import { funnelDefForParam, type FunnelParam } from '../shared/funnelConfig'
import { deviceProductSuffix, isReadDevice, DEVICE_IDS } from '../shared/readDevices'
import { bumpProductName } from '../shared/orderBump'

// EXACT mirror of fbSuffix() in server/routes.ts. Kept here rather than exported from
// routes.ts because that module boots the whole Express app on import; the logic is
// four lines and the point of this file is to freeze its BEHAVIOUR, not to share code.
//
// 🔴 IF fbSuffix() IN routes.ts CHANGES, CHANGE THIS TOO. The `every registered device
// round-trips` case below is what catches a drift in the derivation itself.
function fbSuffix(funnel: unknown, readDevice?: unknown): string {
  const def = funnelDefForParam(funnel)
  if (!def) return ''
  if (def.param === 'v1-read' && isReadDevice(readDevice)) return deviceProductSuffix(readDevice)
  return def.productSuffix
}

describe('/fb-read device-aware Stripe suffix', () => {
  it('bills coffee as " - COFFEE" and tea as " - TEA"', () => {
    expect(fbSuffix('v1-read', 'coffee')).toBe(' - COFFEE')
    expect(fbSuffix('v1-read', 'tea')).toBe(' - TEA')
    expect(fbSuffix('v1-read', 'coffee')).not.toBe(fbSuffix('v1-read', 'tea'))
  })

  // The whole safety argument for shipping coffee onto a live funnel: the device is
  // carried through Stripe metadata and can go missing (an order placed before this
  // shipped, a metadata read that fails, a tampered body). Every one of those must
  // land on tea — the behaviour that was already live — never a blank or another
  // instrument's word.
  it.each([undefined, null, '', 'bogus', 'TEA', 'Coffee', 42, {}])(
    'falls back to " - TEA" for %p',
    (bad) => {
      expect(fbSuffix('v1-read', bad)).toBe(' - TEA')
    },
  )

  it('every registered device round-trips to its own upper-cased label', () => {
    for (const d of DEVICE_IDS) {
      expect(fbSuffix('v1-read', d)).toBe(` - ${d.toUpperCase()}`)
    }
    // A fourth device must not silently inherit another instrument's label.
    expect(new Set(DEVICE_IDS.map((d) => fbSuffix('v1-read', d))).size).toBe(DEVICE_IDS.length)
  })

  // The reason this change is safe to put on a live funnel: nothing else can move.
  it.each<FunnelParam>(['v1-tarot', 'v1-palm', 'v1-fb', 'v1-fb2', 'v1-gdn'])(
    '%s ignores the device entirely',
    (f) => {
      const own = funnelDefForParam(f)!.productSuffix
      expect(fbSuffix(f)).toBe(own)
      for (const d of [...DEVICE_IDS, 'bogus', undefined]) {
        expect(fbSuffix(f, d)).toBe(own)
      }
    },
  )

  it('base V1 (no funnel) stays unsuffixed', () => {
    expect(fbSuffix(undefined)).toBe('')
    expect(fbSuffix(undefined, 'coffee')).toBe('')
    expect(fbSuffix('nonsense', 'coffee')).toBe('')
  })

  // The bump is a SECOND line item on the same session. If the two disagree, one order
  // reads as two funnels — which is exactly what the shared fbSuffix() call prevents.
  it('the bump line carries the same instrument as the main line', () => {
    for (const d of DEVICE_IDS) {
      const s = fbSuffix('v1-read', d)
      expect(bumpProductName(s)).toContain(s)
      expect(bumpProductName(s, 'A')).toContain(s)
    }
  })

  // The funnel default IS the fallback, so it must stay tea. If someone later edits
  // funnelConfig's v1-read row to " - READ" again, every missing-device order silently
  // reverts to the umbrella label this change existed to remove.
  it('the v1-read funnel default is still " - TEA"', () => {
    expect(funnelDefForParam('v1-read')!.productSuffix).toBe(' - TEA')
  })
})
