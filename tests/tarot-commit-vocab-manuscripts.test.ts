// Copy guards for the commitment AGE-MATRIX additions and the new CONNECTION-VOCAB family
// (2026-08-27). Six landers on `return-mhf`, face down, written to BOTH live methods.
//
//   npx vitest run tests/tarot-commit-vocab-manuscripts.test.ts --testTimeout=300000
//
// 🔴 THESE LANDERS ARE NOT WIRED YET. This file loads the MANUSCRIPTS, not the registry — the
// hooks are not in `TarotHook`, so every deck-level guard would silently skip them and still
// print a tick. Re-point `natural`/`shadow` at the registry at wiring time and keep both.
//
// METHOD, so a reviewer never has to guess which one a lander was written to:
//   · natural manuscript  — `natural-cut`, SEVEN cuts. Cut 3 ANSWERS her fear flat.
//   · shadow manuscript   — `inherited-shadow`, SIX beats. Beat 3 OPENS and never answers;
//                            beat 5 carries one handle plus the mandatory origin finding.
//
// Deliberately NOT appended to tests/tarot-money-alone-commit-manuscripts.test.ts: that file
// hard-codes 44 hooks, 924 natural cells and 792 shadow cells, plus several toHaveLength(44).
// Adding six landers to Joel's manuscripts would fail his suite rather than extend it.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const NATURAL = readFileSync('fb-tarot/docs/writeups/natural/REVIEW-commit-vocab-2026-08-27.md', 'utf8')
const SHADOW = readFileSync('fb-tarot/docs/writeups/shadow/REVIEW-commit-vocab-2026-08-27.md', 'utf8')

type Read = Record<number, [string, string, string]>
type Lander = { headline: string; read: Read }

function manuscript(md: string): Map<string, Lander> {
  const landers = new Map<string, Lander>()
  let current: { hook: string; read: Read } | null = null
  // 🔴 Strip \r before splitting. The title parse ends in `.slice(0, -2)` to drop the closing
  // `"*`, so on a CRLF file it drops `*\r` instead and every headline keeps a stray quote — a
  // one-character diff that reads as a copy change. Cost a debug cycle on 2026-08-27 the moment
  // a Windows editor touched the manuscript. tests/tarot-money-alone-commit-manuscripts.test.ts
  // has the same parser and the same latent trap.
  for (const line of md.replace(/\r/g, '').split('\n')) {
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

const natural = manuscript(NATURAL)
const shadow = manuscript(SHADOW)
const allCells = (landers: Map<string, Lander>) =>
  [...landers.values()].flatMap((lander) => Object.values(lander.read).flat())

// @roster-start
const AGE_MATRIX = ['cards-expecting-too-much', 'cards-played-the-wife']
const CONNECTION_VOCAB = [
  'cards-instant-connection-commit',
  'cards-connection-without-commitment',
  'cards-connection-heading-commit',
  'cards-stopping-him-committing',
]
const FAMILY = [...AGE_MATRIX, ...CONNECTION_VOCAB]
// @roster-end

const HEADLINES: Record<string, string> = {
  'cards-expecting-too-much': 'Am I expecting too much, or should he have committed by now?',
  'cards-played-the-wife': "I've played the wife without the commitment. Why?",
  'cards-instant-connection-commit': "The connection was instant. So why won't he commit?",
  'cards-connection-without-commitment': 'How long can a connection this strong go without commitment?',
  'cards-connection-heading-commit': 'Is this connection heading for commitment, or staying as it is?',
  'cards-stopping-him-committing': 'Something is stopping him from committing. What is it?',
}

const cellsOf = (hook: string) => [
  ...Object.values(natural.get(hook)!.read).flat(),
  ...Object.values(shadow.get(hook)!.read).flat(),
]

describe('commit-vocab manuscripts — shape', () => {
  it('covers the same six exact hooks and headlines in both methods', () => {
    expect([...natural.keys()].sort()).toEqual([...FAMILY].sort())
    expect([...shadow.keys()].sort()).toEqual([...FAMILY].sort())
    for (const hook of FAMILY) {
      expect(natural.get(hook)!.headline, hook).toBe(HEADLINES[hook])
      expect(shadow.get(hook)!.headline, hook).toBe(HEADLINES[hook])
    }
  })

  it('contains 18 complete Natural reads and 126 cuts', () => {
    for (const [hook, lander] of natural) {
      expect(Object.keys(lander.read).map(Number), hook).toEqual([1, 2, 3, 4, 5, 6, 7])
      for (const cells of Object.values(lander.read)) expect(cells.every(Boolean), hook).toBe(true)
    }
    expect(allCells(natural)).toHaveLength(126)
  })

  it('contains 18 complete Shadow reads and 108 beats', () => {
    for (const [hook, lander] of shadow) {
      expect(Object.keys(lander.read).map(Number), hook).toEqual([1, 2, 3, 4, 5, 6])
      for (const cells of Object.values(lander.read)) expect(cells.every(Boolean), hook).toBe(true)
    }
    expect(allCells(shadow)).toHaveLength(108)
  })

  it('tells the face-down truth in every opening', () => {
    const blind = /face[- ]down|hidden|backs|could not see|couldn't see|unseen|without seeing|no picture|nothing (?:showed|revealed|gave)|before seeing/i
    const violations: string[] = []
    for (const [method, landers] of [['natural', natural], ['shadow', shadow]] as const) {
      for (const [hook, lander] of landers) {
        for (const cell of lander.read[1]) if (!blind.test(cell)) violations.push(`${method}/${hook}: ${cell}`)
      }
    }
    expect(violations).toEqual([])
  })

  it("does not use the Fool's cliff-side foot or step as positive proof", () => {
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
})

describe('commit-vocab manuscripts — the Shadow method', () => {
  it('gives every beat 5 one origin finding and rotates all three handles', () => {
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

  it('keeps every beat 6 a neutral pointer', () => {
    const property = /\b(?:before|after|long|quiet(?:ly)?|hard|close|near|where|point|moment|start(?:ed|ing)?|begin(?:s|ning)?|first|same|again|still|never|always|already)\b/i
    const violations: string[] = []
    for (const [hook, lander] of shadow) {
      for (const cell of lander.read[6]) if (property.test(cell)) violations.push(`${hook}: ${cell}`)
    }
    expect(violations).toEqual([])
  })

  it('never repeats a beat 6 pointer across the family', () => {
    const loops = [...shadow.values()].flatMap((lander) => lander.read[6])
    expect(new Set(loops).size, `repeated pointers:\n${loops.join('\n')}`).toBe(loops.length)
  })

  it('beat 3 opens the question and never answers it', () => {
    // An answer on this method is a verdict; beat 3's job is to put something in front of Evelyn.
    const verdict = /\b(?:it isn't you|not your fault|you didn't|he will|he won't|the answer is)\b/i
    const violations: string[] = []
    for (const [hook, lander] of shadow) {
      for (const cell of lander.read[3]) if (verdict.test(cell)) violations.push(`${hook}: ${cell}`)
    }
    expect(violations).toEqual([])
  })
})

describe('commit-vocab manuscripts — the commitment angle bans', () => {
  // Inherited verbatim from tests/tarot-commitment-copy.test.ts. DIRECTIONAL since 2026-08-19:
  // "he will commit" is allowed, pronouncing that he never will is not. The her-fault block is
  // WHOLE-BEAT — this angle presupposes his refusal, so the read slides into her fault at the
  // first opening, and the phrases are unavailable even inside a refusal.
  const BANNED: Array<[RegExp, string]> = [
    [/\bhe will never\b/i, 'pronounces he never will'],
    [/\bnever commit\b/i, 'pronounces he never will'],
    [/\bhe is not capable\b/i, 'verdict on his capacity'],
    [/\bwithin (a|the|\d)/i, 'a dated prediction'],
    [/\bin (a few|the next|\d+) (day|week|month|year)/i, 'a dated prediction'],
    [/\bby (the end of|christmas|new year|spring|summer|autumn|winter)\b/i, 'a dated prediction'],
    [/\byour fault\b/i, 'blames her'],
    [/\btoo much\b/i, 'blames her'],
    [/\bnot enough\b/i, 'blames her'],
    [/\bgood enough\b/i, 'blames her'],
    [/\btoo available\b/i, 'blames her'],
    [/\btoo eager\b/i, 'blames her'],
  ]

  it('never pronounces he NEVER will, never dates it, never lands as HER fault', () => {
    const hits: string[] = []
    for (const hook of FAMILY) for (const cell of cellsOf(hook)) {
      for (const [re, why] of BANNED) if (re.test(cell)) hits.push(`${hook} (${why}): "${cell}"`)
    }
    expect(hits, `verdict/timeframe/blame language:\n${hits.join('\n')}`).toEqual([])
  })
})

describe('commit-vocab manuscripts — the bans this family invents', () => {
  // Every one of these comes from the 2026-08-27 VOC pull, not from taste. The pull is recorded
  // at fb-tarot/docs/drafts/rewrites/_voc-commit-vocab-2026-08-27.md.

  it("cards-played-the-wife never rules on another woman", () => {
    // The pull's single best match for this headline is a reader whose rival is "practically
    // married in everything but name" and "forbids him to have anything to do with me". Naming
    // or ruling on that woman is the harm this lander can do.
    const other = /\b(?:another woman|the other woman|his wife|her place|a rival|someone else's)\b/i
    const hits = cellsOf('cards-played-the-wife').filter((c) => other.test(c))
    expect(hits, `rules on a third woman:\n${hits.join('\n')}`).toEqual([])
  })

  it('cards-played-the-wife never predicts a marriage, and never touches money or legal standing', () => {
    // The pull also carries live divorce and property disputes — conjugal property, mortgages,
    // settlements — and marriages that ended after decades.
    const banned = /\b(?:marry|married|marriage|propose|proposal|engaged|wedding|divorce|money|mortgage|property|estate|settlement|lawyer|will\b)\b/i
    const hits = cellsOf('cards-played-the-wife').filter((c) => banned.test(c))
    expect(hits, `predicts a marriage or enters money/legal:\n${hits.join('\n')}`).toEqual([])
  })

  it('cards-played-the-wife never rules that the years were wasted', () => {
    const wasted = /\b(?:wasted|for nothing|threw away|thrown away|nothing to show)\b/i
    const hits = cellsOf('cards-played-the-wife').filter((c) => wasted.test(c))
    expect(hits, `rules the years wasted:\n${hits.join('\n')}`).toEqual([])
  })

  it('the connection landers never presume ongoing contact or a meeting', () => {
    // The corpus uses "connection" for men not seen in twenty years. A read that assumes she can
    // speak to him answers a question she did not ask.
    const contact = /\b(?:next time you (?:see|speak|talk)|when he calls|when you see him|when you next|ask him|tell him|reach out to him)\b/i
    const hits = ['cards-instant-connection-commit', 'cards-connection-without-commitment', 'cards-connection-heading-commit']
      .flatMap((h) => cellsOf(h).filter((c) => contact.test(c)).map((c) => `${h}: ${c}`))
    expect(hits, `presumes contact:\n${hits.join('\n')}`).toEqual([])
  })

  it('the connection landers never convict him either', () => {
    // One buyer's own verdict is "he uses women". The read may not adopt it.
    const convict = /\b(?:he uses|using you|a player|stringing you|leading you on|he doesn't care)\b/i
    const hits = CONNECTION_VOCAB.flatMap((h) => cellsOf(h).filter((c) => convict.test(c)).map((c) => `${h}: ${c}`))
    expect(hits, `convicts him:\n${hits.join('\n')}`).toEqual([])
  })

  it('cards-connection-without-commitment never supplies a length', () => {
    // She asks for a number. Handing one over is the whole failure mode of a duration question.
    // 🔴 WIDENED 2026-08-27 after the tripwire caught it asleep. The first version required the
    // quantifier to sit directly against the unit, so "another two years" — the single most
    // likely way to hand over a length — sailed straight through. The quantifier and the unit
    // are now allowed up to two words apart, and spelled-out numbers count.
    const duration = /\b(?:\d+|another|a few|several|couple|one|two|three|four|five|six|seven|eight|nine|ten)\b(?:\s+\w+){0,2}?\s+\b(?:day|days|week|weeks|month|months|year|years)\b/i
    const hits = cellsOf('cards-connection-without-commitment').filter((c) => duration.test(c))
    expect(hits, `supplies a length:\n${hits.join('\n')}`).toEqual([])
  })

  it('cards-stopping-him-committing never names his motive', () => {
    // The headline promises to identify the obstacle. Naming a man's motive is banned across the
    // funnel, and the pull shows "something" is often another woman or an online stranger.
    const motive = /\b(?:because he|he's afraid|he is afraid|he's scared|his ex|another woman|his marriage|he doesn't want|the reason he)\b/i
    const hits = cellsOf('cards-stopping-him-committing').filter((c) => motive.test(c))
    expect(hits, `names his motive:\n${hits.join('\n')}`).toEqual([])
  })

  it('cards-stopping-him-committing never affirms a man is real, and never confirms another reader', () => {
    const banned = /\b(?:he is real|he's real|genuine|telling the truth|another reader|the last reading|you were told)\b/i
    const hits = cellsOf('cards-stopping-him-committing').filter((c) => banned.test(c))
    expect(hits, `affirms a man or a prior reading:\n${hits.join('\n')}`).toEqual([])
  })
})

// ── After wiring ─────────────────────────────────────────────────────────────
// 🔴 The gates above check the MANUSCRIPT. This block checks that what actually ships is the
// same copy, folded correctly — the one thing no manuscript gate can see. A bad fold produces
// valid TypeScript, renders a real lander, and quietly serves half a read.
describe('commit-vocab — the wired registry matches the approved manuscripts', () => {
  const NL = String.fromCharCode(10)
  const foldNatural = (r: Read, i: number) => [r[1][i], r[2][i], [r[3][i], r[4][i], r[5][i], r[6][i]].join(NL), r[7][i]]
  const foldShadow = (r: Read, i: number) => [[r[1][i], r[2][i]].join(NL), r[3][i], [r[4][i], r[5][i]].join(NL), r[6][i]]

  it('every hook is in the registry with the right angle, bucket and headline', async () => {
    const { DECKS, HEADLINES: LIVE, TAROT_HOOKS, angleForHook, hookToBucket } = await import('@/content/tarotReads')
    for (const hook of FAMILY) {
      expect(TAROT_HOOKS, `${hook} missing from TAROT_HOOKS`).toContain(hook)
      expect(LIVE[hook], `${hook} headline`).toBe(HEADLINES[hook])
      expect(hookToBucket(hook as never), `${hook} must stay a LOVE lander`).toBe('love')
      expect(DECKS['return-mhf'].reads[hook as never], `${hook} has no read on the default deck`).toBeTruthy()
    }
    for (const hook of AGE_MATRIX) expect(angleForHook(hook as never), hook).toBe('commitment-ageband')
    for (const hook of CONNECTION_VOCAB) expect(angleForHook(hook as never), hook).toBe('commitment-connection')
  })

  it('the natural fold is byte-identical to the manuscript', async () => {
    const { DECKS } = await import('@/content/tarotReads')
    for (const hook of FAMILY) {
      const wired = DECKS['return-mhf'].reads[hook as never]!
      for (const [ci, card] of (['a', 'b', 'c'] as const).entries()) {
        expect(wired[card], `${hook}/${card} fold drifted`).toEqual(foldNatural(natural.get(hook)!.read, ci))
      }
    }
  })

  it('the shadow fold is byte-identical to the manuscript', async () => {
    const { SHADOW_READS } = await import('@/content/tarotReadsShadow')
    for (const hook of FAMILY) {
      const wired = SHADOW_READS['return-mhf']![hook as never]!
      expect(wired, `${hook} has no shadow read`).toBeTruthy()
      for (const [ci, card] of (['a', 'b', 'c'] as const).entries()) {
        expect(wired[card], `${hook}/${card} shadow fold drifted`).toEqual(foldShadow(shadow.get(hook)!.read, ci))
      }
    }
  })

  it('the route validator accepts all six — without it the chat handoff 400s', () => {
    const routes = readFileSync('server/routes.ts', 'utf8')
    const validHooks = routes.match(/const validHooks = \[[^\]]*"cards-honest"[^\]]*\]/)
    expect(validHooks, 'tarot validHooks array not found').toBeTruthy()
    for (const hook of FAMILY) expect(validHooks![0], `${hook} missing from validHooks`).toContain(`"${hook}"`)
  })

  it('the server vocab carries a tendency for each — B and C must not contradict each other', () => {
    const prompts = readFileSync('server/lib/prompts.ts', 'utf8')
    for (const hook of FAMILY) expect(prompts, `${hook} has no TAROT_HOOK_TENDENCY entry`).toContain(`'${hook}':`)
  })
})
