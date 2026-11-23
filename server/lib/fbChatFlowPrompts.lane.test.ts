// The belief lane must ride through the arm-B "reading" flow (v1_fb_chat_flow_2026)
// just as it does through arm A — otherwise a lane visitor in arm B gets a chat that
// is indistinguishable from plain /fb (the fb-palm-derail failure, improve-v1/
// 04-fb-palm-derail-PROVEN.md). laneDirective() is threaded into every arm-B builder.
//
//   npx tsx --test server/lib/fbChatFlowPrompts.lane.test.ts   (or: npm run test:lanes)

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { UserData } from '../../shared/types'
import {
  buildFbB1Prompt,
  buildFbB2Prompt,
  buildFbB3Prompt,
  buildFbBDiagnosisPrompt,
} from './fbChatFlowPrompts'
import { getLane } from '../../shared/beliefLanes'
import { copyRuleFails } from '../../shared/laneCopyRules'

const LANE = getLane('manifest')!

const base: UserData = {
  firstName: 'Maureen',
  email: null,
  bucket: 'love',
  subBucket: 'PATTERN_REPEAT',
  personName: null,
  concern: 'They always go quiet on me after a few months.',
  desires: 'Someone who stays.',
  blockSource: 'My mother never trusted men.',
  location: null,
  timeOfDay: 'evening',
  objectionCount: 0,
}

// A lane visitor's prior bot messages are the lane opener — never the plain-/fb candle
// script — so the fixture carries no candle/smoke of its own.
const EARLIER = ['You came in on the page about manifesting love.', 'Now, tell me what is weighing on your heart.']

// Every arm-B builder carries laneDirective (it is the whole reading flow).
const BUILDERS: Array<[string, (u: UserData) => string]> = [
  ['fbB1', (u) => buildFbB1Prompt(u, EARLIER, 'They always go quiet.')],
  ['fbB2', (u) => buildFbB2Prompt(u, EARLIER, 'A man who stays.')],
  ['fbB3', (u) => buildFbB3Prompt(u, EARLIER, 'My mother.')],
  ['fbBDiagnosis', (u) => buildFbBDiagnosisPrompt(u, EARLIER)],
]

describe('arm-B laneDirective — no lane / unknown lane changes nothing', () => {
  for (const [name, build] of BUILDERS) {
    it(`${name}: identical for no lane, an unknown lane and a junk value`, () => {
      const plain = build(base)
      for (const lane of [undefined, '', 'pattern', 'MANIFEST', '__proto__']) {
        assert.equal(build({ ...base, lane }), plain, `lane=${JSON.stringify(lane)}`)
      }
    })
  }
})

describe('arm-B laneDirective — /fb?lane=manifest', () => {
  for (const [name, build] of BUILDERS) {
    it(`${name}: carries the lane's directive`, () => {
      const plain = build(base)
      const lane = build({ ...base, lane: 'manifest' })
      assert.notEqual(lane, plain)
      assert.ok(lane.includes(LANE.directive), 'the approved directive, verbatim')
      assert.ok(lane.includes('## The page she came from'), 'its heading')
    })
  }

  it('the injected block passes the lane copy rules', () => {
    const lane = buildFbB1Prompt({ ...base, lane: 'manifest' }, EARLIER, 'x')
    const block = lane.slice(lane.indexOf('## The page she came from'), lane.indexOf('mechanically.') + 'mechanically.'.length)
    assert.deepEqual(copyRuleFails(block, { freeRule: false }), [])
  })
})

describe('arm-B candle/smoke device steps aside for lanes', () => {
  it('no arm-B prompt mentions a candle or smoke when a lane is set', () => {
    for (const [name, build] of BUILDERS) {
      const lane = build({ ...base, lane: 'manifest' })
      assert.ok(!/candle|smoke/i.test(lane), `${name}: candle/smoke must not reach a lane prompt`)
    }
  })

  it('plain /fb (no lane) still runs the candle/smoke device', () => {
    // The open loop lives in session() (so every fbB step) and is closed in the diagnosis.
    assert.match(buildFbB1Prompt(base, EARLIER, 'x'), /candle|smoke/i)
    assert.match(buildFbBDiagnosisPrompt(base, EARLIER), /smoke/i)
  })
})
