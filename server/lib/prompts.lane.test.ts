// laneDirective() in the shared reading/crisis builders — the belief lane must reach
// every later chat step, not only the opener (improve-v1/04-fb-palm-derail-PROVEN.md).
//
//   npx tsx --test server/lib/prompts.lane.test.ts      (or: npm run test:lanes)

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { UserData } from '../../shared/types'
import {
  buildReading1Prompt,
  buildReading2Prompt,
  buildFutureValidationPrompt,
  buildCrisisRevealPrompt,
  buildCrisisCostPrompt,
  buildCrisisUrgencyPrompt,
  buildShadowSummaryPrompt,
  buildValueExplainPrompt,
  buildObjectionPrompt,
} from './prompts'
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
  location: null,
  timeOfDay: 'evening',
  objectionCount: 0,
}

// The builders readDirective() is injected into — laneDirective rides beside it.
const WITH_DIRECTIVE: Array<[string, (u: UserData) => string]> = [
  ['reading1', (u) => buildReading1Prompt(u, 'They always go quiet.')],
  ['reading2', (u) => buildReading2Prompt(u, 'About ten years.')],
  ['futureValidation', (u) => buildFutureValidationPrompt(u, 'A man who stays.')],
  ['crisisReveal', (u) => buildCrisisRevealPrompt(u, 'Relief.')],
  ['crisisCost', (u) => buildCrisisCostPrompt(u, 'My mother.')],
]
// The builders readDirective() is NOT in. Out of scope for the lane, same as /fb-read.
const WITHOUT_DIRECTIVE: Array<[string, (u: UserData) => string]> = [
  ['crisisUrgency', (u) => buildCrisisUrgencyPrompt(u, 'Yes.')],
  ['shadowSummary', (u) => buildShadowSummaryPrompt(u)],
  ['valueExplain', (u) => buildValueExplainPrompt(u)],
  ['objection', (u) => buildObjectionPrompt(u, 'I am not sure.', 1)],
]

describe('laneDirective — no lane / unknown lane changes nothing', () => {
  for (const [name, build] of [...WITH_DIRECTIVE, ...WITHOUT_DIRECTIVE]) {
    it(`${name}: identical for no lane, an unknown lane and a junk value`, () => {
      const plain = build(base)
      for (const lane of [undefined, '', 'soulmate', 'MANIFEST', '__proto__']) {
        assert.equal(build({ ...base, lane }), plain, `lane=${JSON.stringify(lane)}`)
      }
    })
  }
})

describe('laneDirective — /fb?lane=manifest', () => {
  for (const [name, build] of WITH_DIRECTIVE) {
    it(`${name}: carries the lane's directive`, () => {
      const plain = build(base)
      const lane = build({ ...base, lane: 'manifest' })
      assert.notEqual(lane, plain)
      assert.ok(lane.includes(LANE.directive), 'the approved directive, verbatim')
      assert.ok(lane.includes('## The page she came from'), 'its heading')
      // Additive: removing the injected block gives back the plain prompt exactly.
      const block = lane.slice(lane.indexOf('\n\n## The page she came from'), lane.indexOf('mechanically.') + 'mechanically.'.length)
      assert.equal(lane.replace(block, ''), plain)
    })
  }

  for (const [name, build] of WITHOUT_DIRECTIVE) {
    it(`${name}: unchanged (readDirective is not here either)`, () => {
      assert.equal(build({ ...base, lane: 'manifest' }), build(base))
    })
  }

  it('the injected block itself passes the copy rules (the model echoes what it is given)', () => {
    const lane = buildReading1Prompt({ ...base, lane: 'manifest' }, 'x')
    const block = lane.slice(lane.indexOf('## The page she came from'), lane.indexOf('mechanically.') + 'mechanically.'.length)
    assert.ok(block.length > LANE.directive.length)
    assert.deepEqual(copyRuleFails(block, { freeRule: false }), [])
  })
})
