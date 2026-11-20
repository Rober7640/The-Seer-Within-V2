// /fb chat-flow B (v1_fb_chat_flow_2026): copy + prompt guards.
//
// B is the reading flow on /fb: a name reading (candle + number), topic lines that pick
// up the smoke, three reading steps and a diagnosis. These guards pin what the operator
// approved and what the offline 10-chat run showed B must never do.
import { describe, it, expect } from 'vitest'
import { nameNumber, fbBNameLines, fbBTopicLines } from '../client/src/content/fbChatFlowB'
import {
  buildFbB1Prompt,
  buildFbB2Prompt,
  buildFbB3Prompt,
  buildFbBDiagnosisPrompt,
  cleanEarlier,
  FB_B_READING_CRAFT,
} from '../server/lib/fbChatFlowPrompts'
import { EVELYN_BASE_PROMPT } from '../server/lib/prompts'
import type { UserData } from '../shared/types'

const words = (s: string) => s.trim().split(/\s+/).length

const user = (over: Partial<UserData> = {}): UserData => ({
  firstName: 'Maria', email: null, bucket: 'love', subBucket: null, personName: null,
  concern: null, desires: null, location: null, timeOfDay: null, objectionCount: 0,
  chatFlow: 'b', ...over,
})

describe('name number', () => {
  it('adds letter values and reduces to one digit', () => {
    expect(nameNumber('Maria')).toBe(6) // 4+1+9+9+1 = 24 → 6
    expect(nameNumber('Ann')).toBe(granted(1 + 5 + 5))
    expect(nameNumber('Zoe')).toBe(granted(8 + 6 + 5))
  })
  it('strips accents and ignores non-letters', () => {
    expect(nameNumber('José')).toBe(nameNumber('Jose'))
    expect(nameNumber('Ann-Marie')).toBe(nameNumber('AnnMarie'))
  })
  it('is null when there are no A–Z letters', () => {
    expect(nameNumber('')).toBeNull()
    expect(nameNumber('李')).toBeNull()
    expect(nameNumber('123')).toBeNull()
  })
  it('always lands on 1–9', () => {
    for (const n of ['Al', 'Bea', 'Christopher', 'Xiomara', 'Kimberly', 'Yvonne', 'Rosalind', 'Ty', 'Iz'])
      expect(nameNumber(n)).toBeGreaterThanOrEqual(1), expect(nameNumber(n)).toBeLessThanOrEqual(9)
  })
})

// The digital root of a sum, written out so the expected value is visible above.
function granted(sum: number): number {
  while (sum > 9) sum = String(sum).split('').reduce((a, d) => a + Number(d), 0)
  return sum
}

describe('name step copy', () => {
  it('opens the candle loop without explaining it', () => {
    const lines = fbBNameLines('Maria')
    expect(lines[0]).toBe('Maria...')
    expect(lines.join(' ')).toMatch(/candle beside me bent/)
    expect(lines.join(' ')).toMatch(/black smoke/)
    expect(lines.join(' ')).toMatch(/I know what that means\./)
    expect(lines).toContain('Your name carries a number too. Maria comes to a 6.')
    expect(lines.at(-1)).toBe("Now, what's weighing on your heart today?")
  })
  it('has a number line for every number, each under 25 words', () => {
    const seen = new Set<string>()
    for (const name of ['Al', 'Bea', 'Cy', 'Dee', 'Ed', 'Flo', 'Gus', 'Hal', 'Ida', 'Jo', 'Kim', 'Lu', 'Maria', 'Ned', 'Oz', 'Pia', 'Quin', 'Ray', 'Sue', 'Tam']) {
      const lines = fbBNameLines(name)
      const i = lines.findIndex((l) => l.startsWith('Your name carries a number'))
      expect(i).toBeGreaterThan(0)
      seen.add(String(nameNumber(name)))
      expect(words(lines[i + 1])).toBeLessThanOrEqual(25)
    }
    expect(seen.size).toBe(9)
  })
  it('skips the number lines when the name has no letters to count', () => {
    expect(fbBNameLines('李').join(' ')).not.toMatch(/comes to a/)
  })
  it('every scripted line is under 25 words', () => {
    for (const l of [...fbBNameLines('Maria'), ...(['love', 'money', 'purpose', 'someone'] as const).flatMap((b) => fbBTopicLines(b, 'Maria'))])
      expect(words(l)).toBeLessThanOrEqual(25)
  })
})

describe('topic step copy', () => {
  it('ties each topic back to the smoke', () => {
    for (const b of ['love', 'money', 'purpose', 'someone'] as const)
      expect(fbBTopicLines(b, 'Maria')[0]).toMatch(/That's where the smoke was pulling, Maria\./)
  })
  it('drops A\'s dead-end "flicker of shadow"', () => {
    expect(fbBTopicLines('love', 'Maria').join(' ')).not.toMatch(/flicker/)
  })
  it('someone still asks for their first name (PERSON_NAME_CAPTURE follows)', () => {
    expect(fbBTopicLines('someone', 'Maria').at(-1)).toBe("Tell me... what's their first name?")
  })
})

describe('B prompts', () => {
  const said = 'I always end up giving everything and he never stays'
  const all = [
    buildFbB1Prompt(user(), [], said),
    buildFbB2Prompt(user({ concern: said }), ['earlier line'], 'to be chosen'),
    buildFbB3Prompt(user({ concern: said, desires: 'to be chosen' }), ['earlier line'], 'my mother'),
    buildFbBDiagnosisPrompt(user({ concern: said, desires: 'to be chosen', blockSource: 'my mother' }), ['earlier line']),
  ]

  it("keep every one of A's persona rules, including the safety override", () => {
    const rules = EVELYN_BASE_PROMPT.slice(0, EVELYN_BASE_PROMPT.indexOf('## Cold Reading Techniques'))
    for (const p of all) {
      expect(p).toContain(rules.trim())
      expect(p).toContain('SAFETY OVERRIDE')
      expect(p).toContain('## Response Format')
    }
  })
  it("never carry A's quoted stock lines (the AI copies them)", () => {
    for (const p of all) {
      expect(p).not.toMatch(/You carry more than others realize|heart has walls|loved deeply before|shadow is blocking|took root|Has anyone in your family/i)
      expect(p).toContain(FB_B_READING_CRAFT)
    }
  })
  it('ban the words the offline run produced', () => {
    expect(FB_B_READING_CRAFT).toMatch(/verdict/)
    expect(FB_B_READING_CRAFT).toMatch(/can't tell, can't know/)
  })
  it('step 2 asks where it started without suggesting family', () => {
    expect(all[1]).toMatch(/where she thinks this started\. Do NOT suggest family/)
  })
  it('step 3 uses family only if she raised it', () => {
    expect(all[2]).toMatch(/Mention family, parents or the past ONLY if she did/)
  })
  it('the diagnosis closes the smoke loop, never asks, and keeps the weight', () => {
    expect(all[3]).toMatch(/what the black smoke was/)
    expect(all[3]).toMatch(/NONE of them is a question/)
    expect(all[3]).toMatch(/will not lift by itself/)
    expect(all[3]).toContain('Where she thinks it started, in her words: "my mother"')
  })
  it('pass her earlier lines in, so she is never repeated', () => {
    expect(all[1]).toContain('• earlier line')
  })
})

describe('cleanEarlier', () => {
  it('drops junk, keeps the last 40, and caps each line', () => {
    expect(cleanEarlier('nope')).toEqual([])
    expect(cleanEarlier([1, null, '  ', 'ok'])).toEqual(['ok'])
    const many = Array.from({ length: 60 }, (_, i) => `line ${i}`)
    expect(cleanEarlier(many)).toHaveLength(40)
    expect(cleanEarlier(many)[0]).toBe('line 20')
    expect(cleanEarlier(['x'.repeat(1000)])[0]).toHaveLength(300)
  })
})
