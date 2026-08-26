import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const REGISTRY = readFileSync('fb-tarot/docs/lander-registry.md', 'utf8')
const NATURAL = readFileSync('fb-tarot/docs/writeups/natural/REVIEW-money-alone-commit-2026-08-25.md', 'utf8')
const SHADOW = readFileSync('fb-tarot/docs/writeups/shadow/REVIEW-money-alone-commit-2026-08-25.md', 'utf8')

type Read = Record<number, [string, string, string]>
type Lander = { headline: string; read: Read }

function draftRegistry(): Map<string, string> {
  const draft = REGISTRY.slice(REGISTRY.indexOf('## Draft —'))
  const rows = new Map<string, string>()
  for (const line of draft.split('\n')) {
    if (!line.startsWith('| `cards-')) continue
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
    rows.set(cells[0].replaceAll('`', ''), cells[1])
  }
  return rows
}

function manuscript(md: string): Map<string, Lander> {
  const landers = new Map<string, Lander>()
  let current: { hook: string; read: Read } | null = null
  for (const line of md.split('\n')) {
    if (line.startsWith('### `cards-')) {
      const hook = line.split('`')[1]
      const headline = line.split('*"')[1]?.slice(0, -2)
      if (!hook || !headline) throw new Error(`cannot parse manuscript title: ${line}`)
      const read: Read = {}
      current = { hook, read }
      landers.set(hook, { headline, read })
      continue
    }
    if (!current || !line.startsWith('| **')) continue
    const row = line.match(/^\| \*\*(\d)\*\* [^|]*\|(.+)\|\s*$/)
    if (!row) continue
    const cells = row[2].split('|').map((cell) => cell.trim()).filter(Boolean)
    if (cells.length !== 3) throw new Error(`${current.hook} beat ${row[1]} has ${cells.length} card cells`)
    current.read[Number(row[1])] = cells as [string, string, string]
  }
  return landers
}

const registry = draftRegistry()
const natural = manuscript(NATURAL)
const shadow = manuscript(SHADOW)
const allCells = (landers: Map<string, Lander>) =>
  [...landers.values()].flatMap((lander) => Object.values(lander.read).flat())

describe('money/alone/commit manuscripts', () => {
  // 2026-08-26: this batch was promoted to live — see scripts/lander-registry.mts's
  // DRAFT_CANDIDATES note. There is no draft-registry snapshot to check against any more, so
  // this compares the two manuscripts directly instead of routing through the (now empty)
  // draft section — the invariant (44 matching hooks and headlines) is unchanged.
  it('covers the same 44 exact hooks and headlines in both methods', () => {
    expect(natural.size).toBe(44)
    expect(shadow.size).toBe(44)
    expect([...shadow.keys()].sort()).toEqual([...natural.keys()].sort())
    for (const [hook, lander] of natural) {
      expect(shadow.get(hook)?.headline).toBe(lander.headline)
    }
  })

  it('contains 132 complete Natural reads and 924 cuts', () => {
    expect(natural.size).toBe(44)
    for (const [hook, lander] of natural) {
      expect(Object.keys(lander.read).map(Number), hook).toEqual([1, 2, 3, 4, 5, 6, 7])
      for (const cells of Object.values(lander.read)) expect(cells.every(Boolean), hook).toBe(true)
    }
    expect(allCells(natural)).toHaveLength(924)
  })

  it('contains 132 complete Shadow reads and 792 beats', () => {
    expect(shadow.size).toBe(44)
    for (const [hook, lander] of shadow) {
      expect(Object.keys(lander.read).map(Number), hook).toEqual([1, 2, 3, 4, 5, 6])
      for (const cells of Object.values(lander.read)) expect(cells.every(Boolean), hook).toBe(true)
    }
    expect(allCells(shadow)).toHaveLength(792)
  })

  it('tells the face-down truth in every opening', () => {
    const blind = /face[- ]down|hidden|backs|could not see|couldn't see|unseen|without seeing|no picture|nothing (?:showed|revealed|gave)|before seeing|before .* visible/i
    const violations: string[] = []
    for (const [method, landers] of [['natural', natural], ['shadow', shadow]] as const) {
      for (const [hook, lander] of landers) {
        for (const cell of lander.read[1]) if (!blind.test(cell)) violations.push(`${method}/${hook}: ${cell}`)
      }
    }
    expect(violations).toEqual([])
  })

  it('does not use the Fool\'s cliff-side foot or step as positive proof', () => {
    const banned = /\b(?:foot|feet|step|steps|stepping)\b/i
    const violations: string[] = []
    for (const [method, landers] of [['natural', natural], ['shadow', shadow]] as const) {
      for (const [hook, lander] of landers) {
        for (const beat of [1, 2, 3]) {
          const fool = lander.read[beat][2]
          if (banned.test(fool)) violations.push(`${method}/${hook}/${beat}: ${fool}`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('gives every Shadow beat 5 one origin finding and rotates all three handles', () => {
    const origin = /I don't think (?:it|this|any of it) (?:began|started) with you\.$/
    const handle = (cell: string) => {
      if (/^(?:Something (?:sits|stands)|There's something|I keep coming back to something) between /.test(cell)) return 'position'
      if (/^Something (?:appears|shows up|turns up|reaches|meets) /.test(cell)) return 'timing'
      if (/^(?:Just as|Right where|At the point where) .+, something appears\./.test(cell)) return 'timing'
      if (/^(?:Whatever|What|The thing that) /.test(cell) || /^Something (?:has|keeps|holds|is holding)\b/.test(cell)) return 'manner'
      return 'unknown'
    }
    for (const [hook, lander] of shadow) {
      const beats = lander.read[5]
      for (const cell of beats) expect(origin.test(cell), `${hook}: ${cell}`).toBe(true)
      expect(new Set(beats.map(handle)), hook).toEqual(new Set(['position', 'timing', 'manner']))
    }
  })

  it('keeps every Shadow beat 6 a neutral pointer', () => {
    const property = /\b(?:before|after|long|quiet(?:ly)?|hard|close|near|where|point|moment|start(?:ed|ing)?|begin(?:s|ning)?|first|same|again|still|never|always|already)\b/i
    const violations: string[] = []
    for (const [hook, lander] of shadow) {
      for (const cell of lander.read[6]) if (property.test(cell)) violations.push(`${hook}: ${cell}`)
    }
    expect(violations).toEqual([])
  })

  it('keeps the spoken cells to two sentences or fewer', () => {
    const violations: string[] = []
    for (const [method, landers] of [['natural', natural], ['shadow', shadow]] as const) {
      for (const [hook, lander] of landers) {
        for (const [beat, cells] of Object.entries(lander.read)) {
          for (const cell of cells) {
            const sentenceEnds = cell.match(/[.!?](?:["”'])?(?=\s+[A-Z“"]|$)/g)?.length ?? 0
            if (sentenceEnds > 2) violations.push(`${method}/${hook}/${beat}: ${cell}`)
          }
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('does not let Natural boundary language turn a full read clinical', () => {
    const violations: string[] = []
    for (const [hook, lander] of natural) {
      for (let card = 0; card < 3; card++) {
        const read = Object.values(lander.read).map((cells) => cells[card]).join(' ')
        const uncontracted = read.match(/\b(?:cannot|does not)\b/gi)?.length ?? 0
        if (uncontracted > 2) violations.push(`${hook}/${String.fromCharCode(97 + card)}: ${uncontracted}`)
      }
    }
    expect(violations).toEqual([])
  })

  it('keeps Shadow loops varied enough to avoid a template rhythm', () => {
    const loops = [...shadow.values()].flatMap((lander) => lander.read[6])
    const frequencies = new Map<string, number>()
    for (const loop of loops) frequencies.set(loop, (frequencies.get(loop) ?? 0) + 1)
    expect(frequencies.size).toBeGreaterThanOrEqual(40)
    expect(Math.max(...frequencies.values())).toBeLessThanOrEqual(11)
  })

  it('varies the spoken grammar of all three Shadow handles', () => {
    const beats = [...shadow.values()].flatMap((lander) => lander.read[5])
    const positionLeads = beats
      .map((cell) => cell.match(/^(Something sits|There's something|Something stands|I keep coming back to something) between /)?.[1])
      .filter(Boolean) as string[]
    const mannerLeads = beats.flatMap((cell) => {
      const fixed = cell.match(/^(Whatever|What|The thing that) /)?.[1]
      if (fixed) return [fixed]
      return /^Something (?:has|keeps|holds|is holding)\b/.test(cell) ? ['Something'] : []
    })
    const timingLeads = beats.flatMap((cell) => {
      const fixed = cell.match(/^(Something appears right where|Just as|Right where|At the point where) /)?.[1]
      if (fixed) return [fixed]
      const something = cell.match(/^(Something (?:appears|shows up|turns up|reaches|meets)) /)?.[1]
      return something ? [something] : []
    })
    const maxFrequency = (values: string[]) => {
      const counts = new Map<string, number>()
      for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
      return Math.max(...counts.values())
    }
    expect(positionLeads).toHaveLength(44)
    expect(mannerLeads).toHaveLength(44)
    expect(timingLeads).toHaveLength(44)
    expect(new Set(positionLeads).size).toBeGreaterThanOrEqual(4)
    expect(new Set(mannerLeads).size).toBeGreaterThanOrEqual(4)
    expect(new Set(timingLeads).size).toBeGreaterThanOrEqual(4)
    expect(maxFrequency(positionLeads)).toBeLessThanOrEqual(11)
    expect(maxFrequency(mannerLeads)).toBeLessThanOrEqual(11)
    expect(maxFrequency(timingLeads)).toBeLessThanOrEqual(20)
    expect(timingLeads.filter((lead) => lead === 'Something appears right where')).toHaveLength(8)
    expect(beats.filter((cell) => /\b(?:close in|close by|very near)\b/i.test(cell))).toHaveLength(0)
  })

  it('keeps inheritance authors, occult harm and diagnosis language out of Shadow copy', () => {
    const banned = /\b(?:family line|mother|grandmother|relative|ancestor|ancestral|generations?|curse|hex|karma|past life|spell|evil eye|epigenetic|inherited trauma|attachment style)\b/i
    for (const cell of allCells(shadow)) expect(banned.test(cell), cell).toBe(false)
  })

  it('does not wire either manuscript', () => {
    expect(NATURAL).toContain('Do not wire')
    expect(SHADOW).toContain('Do not wire')
    const live = REGISTRY.slice(0, REGISTRY.indexOf('## Draft —'))
    for (const hook of registry.keys()) expect(live).not.toContain(`\`${hook}\``)
  })
})
