// Belief-lane registry guard: lookups, the opener shape, and the copy rules over EVERY
// registry string. A new lane entry is covered the moment it is added.
//
//   npx tsx --test shared/beliefLanes.test.ts      (or: npm run test:lanes)
//
// The copy rules are the operator's voice rules (fb-belief-lanes SKILL.md), checked the
// way the lane renderer checks them (.claude/skills/fb-belief-lanes/scripts/render_lanes.py)
// so a lane that passed review cannot fail here, and the reverse.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  LANE_IDS,
  getLane,
  isLaneId,
  laneAweberTag,
  laneChatPath,
  laneCopyStrings,
  laneOpenerAfterName,
  laneOpenerBeforeName,
  laneQuestion,
  type BeliefLane,
} from './beliefLanes'
import { copyRuleFails } from './laneCopyRules'

function lanes(): BeliefLane[] {
  return LANE_IDS.map((id) => getLane(id)!)
}

describe('belief lane registry — lookups', () => {
  it('holds only approved lanes (manifest, astrology)', () => {
    assert.deepEqual([...LANE_IDS], ['manifest', 'astrology'])
  })

  it('resolves a known id to its own entry', () => {
    for (const id of LANE_IDS) {
      assert.equal(getLane(id)?.id, id)
      assert.equal(isLaneId(id), true)
    }
  })

  it('returns undefined for unknown, junk and prototype ids', () => {
    for (const bad of [undefined, null, '', 'pattern', 'family', 'MANIFEST', 'manifest ', ' manifest', 'ASTROLOGY', 'astrology ', 'toString', '__proto__', 'constructor', 'hasOwnProperty', 42, {}, ['manifest']]) {
      assert.equal(getLane(bad), undefined, `getLane(${JSON.stringify(bad)})`)
      assert.equal(isLaneId(bad), false)
    }
  })

  it('builds the chat link and the AWeber tag from the id', () => {
    assert.equal(laneChatPath('manifest'), '/fb/chat?lane=manifest')
    assert.equal(laneAweberTag('manifest'), 'lane-manifest')
  })
})

describe('belief lane registry — the six-beat opener', () => {
  for (const lane of lanes()) {
    it(`${lane.id}: beat 1 is a line, beat 2 is today's name ask, then her name`, () => {
      assert.equal(lane.chat[0].who, 'e')
      assert.equal(lane.chat[1].who, 'e')
      assert.equal(lane.chat[1].text, "What's your first name, dear?")
      assert.equal(lane.chat[2].who, 'me')
      assert.deepEqual(laneOpenerBeforeName(lane), [lane.chat[0].text, "What's your first name, dear?"])
    })

    it(`${lane.id}: beats 3–5 fill {Name}; beat 6 is the one question, last`, () => {
      const after = laneOpenerAfterName(lane, 'Maureen')
      assert.ok(after.length >= 2 && after.length <= 3, `beats 3–5, got ${after.length}`)
      assert.ok(after[0].startsWith('Maureen'), after[0])
      for (const t of after) assert.ok(!t.includes('{'), `unfilled placeholder: ${t}`)
      assert.equal(lane.chat.filter((b) => b.who === 'q').length, 1)
      assert.equal(lane.chat[lane.chat.length - 1].who, 'q')
      // Beat 6 may be an ask ("Tell me …, dear.") rather than a literal question.
      const q = laneQuestion(lane, 'Maureen')
      assert.ok(q.length > 10, q)
      assert.ok(!q.includes('{'), q)
    })

    it(`${lane.id}: the card's line under the button starts "It's free to message Evelyn."`, () => {
      assert.ok(lane.card.sc.startsWith("It's free to message Evelyn."), lane.card.sc)
    })

    it(`${lane.id}: every body block is a known type, and the page ends with the ask`, () => {
      for (const b of lane.body) assert.ok(['h', 'p', 'list', 'faq', 'ask'].includes(b.t), b.t)
      assert.equal(lane.body[lane.body.length - 1].t, 'ask')
      assert.ok(lane.body.some((b) => b.t === 'faq'), 'an FAQ')
    })
  }
})

describe('belief lane registry — copy rules over every string', () => {
  for (const lane of lanes()) {
    it(`${lane.id}: no string breaks a voice rule`, () => {
      const strings = laneCopyStrings(lane)
      assert.ok(strings.length > 40, `expected the whole lane, got ${strings.length} strings`)
      const fails: string[] = []
      for (const s of strings) {
        // The directive is held to every rule but the sentence-level "free" one,
        // exactly as the renderer does (it is never shown to her).
        const f = copyRuleFails(s, { freeRule: s !== lane.directive })
        if (f.length) fails.push(`${JSON.stringify(s)} → ${f.join('; ')}`)
      }
      assert.deepEqual(fails, [])
    })

    it(`${lane.id}: walks every field of the entry (nothing escapes the rule check)`, () => {
      // Belt and braces: collect EVERY string reachable in the entry, whatever its key,
      // so a field added later is checked without anyone remembering to list it.
      const all: string[] = []
      const walk = (v: unknown) => {
        if (typeof v === 'string') all.push(v)
        else if (Array.isArray(v)) v.forEach(walk)
        else if (v && typeof v === 'object') Object.values(v).forEach(walk)
      }
      walk(lane)
      const fails = all
        .map((s) => [s, copyRuleFails(s, { freeRule: s !== lane.directive })] as const)
        .filter(([, f]) => f.length)
        .map(([s, f]) => `${JSON.stringify(s)} → ${f.join('; ')}`)
      assert.deepEqual(fails, [])
    })
  }

  it('the checker itself catches each rule (so a pass means something)', () => {
    assert.ok(copyRuleFails('A free reading tonight').length > 0)
    assert.ok(copyRuleFails('Our psychic sees it').length > 0)
    assert.ok(copyRuleFails('Ask the AI').length > 0)
    assert.ok(copyRuleFails('Only $5').length > 0)
    assert.ok(copyRuleFails('Begin now!').length > 0)
    assert.ok(copyRuleFails('Bless you').length > 0)
    assert.ok(copyRuleFails('Your soulmate').length > 0)
    assert.ok(copyRuleFails('A gift for the holiday').length > 0)
    assert.ok(copyRuleFails('It is free.').length > 0)
    assert.deepEqual(copyRuleFails("It's free to message Evelyn."), [])
    assert.deepEqual(copyRuleFails('That part isn\'t free.'), [])
    assert.deepEqual(copyRuleFails('Yes. The chat is free.'), [])
    assert.deepEqual(copyRuleFails('She said it again, plainly.'), [])
  })
})
