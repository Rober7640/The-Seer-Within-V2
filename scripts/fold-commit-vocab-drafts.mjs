#!/usr/bin/env node
// fold-commit-vocab-drafts — manuscript tables -> per-hook draft JSON, so the house gates
// (check-draft.mjs, check-collisions.mts, dryrun-drafts.mts, preview-rewrite.mjs) can read this
// family the same way they read every other one.
//
//   node scripts/fold-commit-vocab-drafts.mjs
//
// The manuscripts stay the source of truth and the guard file reads THEM, not these. This only
// projects them into the shape the existing tooling expects: 7 bubbles per card on the natural
// method, 6 on the inherited shadow.
import { readFileSync, writeFileSync } from 'node:fs'

const VOC = 'fb-tarot/docs/drafts/rewrites/_voc-commit-vocab-2026-08-27.md'

const SOURCES = [
  { md: 'fb-tarot/docs/writeups/natural/REVIEW-commit-vocab-2026-08-27.md', method: 'natural-cut', out: 'fb-tarot/docs/drafts/rewrites', beats: 7 },
  { md: 'fb-tarot/docs/writeups/shadow/REVIEW-commit-vocab-2026-08-27.md', method: 'inherited-shadow', out: 'fb-tarot/docs/drafts/shadow', beats: 6 },
]

// Per-hook VOC record. Verdicts follow the skill's table: ok = 5+ buyers, thin = fewer than 5.
const VOCS = {
  'cards-expecting-too-much': { pulled: '2026-08-27', pattern: 'cv-expecting', matched: 5, buyers: 3, verdict: 'thin', why: 'Almost nobody phrases it as "expecting too much"; the corpus carries the same fear under "what am I doing wrong", already solved live on cards-doing-wrong-wont-commit. Inherited that finding. The 3 buyers who did type it indict their TIMING as well as their wanting.' },
  'cards-played-the-wife': { pulled: '2026-08-27', pattern: 'cv-wife2', matched: 7567, buyers: 100, verdict: 'ok', why: '' },
  'cards-instant-connection-commit': { pulled: '2026-08-27', pattern: 'cv-connection', matched: 1759, buyers: 100, verdict: 'ok', why: '' },
  'cards-connection-without-commitment': { pulled: '2026-08-27', pattern: 'cv-connection', matched: 1759, buyers: 100, verdict: 'ok', why: '' },
  'cards-connection-heading-commit': { pulled: '2026-08-27', pattern: 'cv-connection', matched: 1759, buyers: 100, verdict: 'ok', why: '' },
  'cards-stopping-him-committing': { pulled: '2026-08-27', pattern: 'cv-stopping', matched: 59, buyers: 6, verdict: 'ok', why: '' },
}

const NOTES = {
  'cards-expecting-too-much': 'Commitment AGE-MATRIX addition (2026-08-27). Angle `commitment-ageband`.\n\nTHE WORD DOING THE WORK: "too". Not whether she is expecting — whether her wanting is excessive.\n\nTHE FEAR: is my wanting the problem. The buyer who typed it indicts herself TWICE — "Am I expecting too much? Did I jump in too soon?" — so the read must refuse her WANTING and her TIMING, and rule on neither him nor her.\n\n🔴 "too much" is a whole-beat banned phrase on this angle (blames her, unavailable even inside a refusal). Beat 2 says her question back, so it PARAPHRASES and never quotes the ad.',
  'cards-played-the-wife': 'Commitment AGE-MATRIX addition (2026-08-27). Angle `commitment-ageband`.\n\nTHE FEAR: that it counted for nothing. The read answers that the work was real and was never named — her POSITION, which is sayable without any of the bans below.\n\n🔴🔴 THE PULL SAYS THIS HEADLINE SELECTS THREE AUDIENCES IT CANNOT SERVE, and none is the cohabiting-no-ring woman it pictures: (1) a rival who holds the wife role in fact — "practically married in everything but name… she forbids him to have anything to do with me"; (2) marriages ended after decades; (3) live divorce and property disputes. Flagged to the operator on 2026-08-27; he chose to keep the lander, so the bans carry the safety instead.\n\nBANS: never name or rule on another woman · never predict a marriage or a proposal · never touch money, property or legal standing · never rule that the years were wasted.',
  'cards-instant-connection-commit': 'CONNECTION-VOCAB family (2026-08-27). NEW angle `commitment-connection` — one angle per keyword, per the soulmate-keyword convention.\n\nTHE FEAR: did I invent what that meant. Cut 3 affirms the speed was real without ruling on him.\n\n🔴 The corpus uses "connection" for men not seen in twenty years, so the read may NOT presume ongoing contact or a recent meeting.\n⚠ One buyer\'s own verdict is "he uses women" — the read does not adopt it.',
  'cards-connection-without-commitment': 'CONNECTION-VOCAB family (2026-08-27). Angle `commitment-connection`.\n\nShe asks for a LENGTH, so the duration ban is on: no number, no date, no season. Cut 3 refuses the number and moves the doubt off the connection itself.\n\n🔴 Same no-ongoing-contact rule as the rest of the family.',
  'cards-connection-heading-commit': 'CONNECTION-VOCAB family (2026-08-27). Angle `commitment-connection`.\n\nBoth halves of her fork are unsayable — a promise that it moves, or a verdict that it never will. Cut 3 refuses the FORK rather than picking a side.\n\n🔴 Same no-ongoing-contact rule as the rest of the family.',
  'cards-stopping-him-committing': 'CONNECTION-VOCAB family (2026-08-27), and its NO-VOCABULARY CONTROL — the same commitment-obstacle question without the word "connection" in it. Angle `commitment-connection`.\n\n🎯 A buyer types this headline almost verbatim, and the next one gives the real fear: "I want to know what is holding him back. Am i not good enough?" So cut 3 answers IT ISN\'T YOU and never names his obstacle.\n\n🔴 Never name his motive · never affirm a man met only online is real · never rule on a third party\'s relationship · never confirm what a previous reader told her. "not enough" and "good enough" are banned as phrases; the acquittal is written without them.',
}

function manuscript(md) {
  const landers = new Map()
  let current = null
  for (const line of md.split('\n')) {
    if (line.startsWith('### `cards-')) {
      const hook = line.split('`')[1]
      const headline = line.split('*"')[1]?.slice(0, -2)
      current = { hook, headline, read: {} }
      landers.set(hook, current)
      continue
    }
    if (!current || !line.startsWith('| **')) continue
    const row = line.match(/^\| \*\*(\d)\*\* [^|]*\|(.+)\|\s*$/)
    if (!row) continue
    current.read[Number(row[1])] = row[2].split('|').map((c) => c.trim()).filter(Boolean)
  }
  return landers
}

let written = 0
for (const src of SOURCES) {
  const landers = manuscript(readFileSync(src.md, 'utf8'))
  for (const [hook, lander] of landers) {
    const cards = { a: [], b: [], c: [] }
    for (let beat = 1; beat <= src.beats; beat++) {
      const cells = lander.read[beat]
      if (!cells || cells.length !== 3) throw new Error(`${hook} beat ${beat} is incomplete in ${src.md}`)
      cards.a.push(cells[0]); cards.b.push(cells[1]); cards.c.push(cells[2])
    }
    const json = {
      hook,
      headline: lander.headline,
      method: src.method,
      note: `${NOTES[hook]}\n\nVOC: ${VOC}\nManuscript: ${src.md}`,
      voc: VOCS[hook],
      decks: { 'return-mhf': cards },
    }
    writeFileSync(`${src.out}/${hook}.json`, JSON.stringify(json, null, 2) + '\n')
    written++
  }
}
console.log(`wrote ${written} draft files (${SOURCES.map((s) => s.out).join(', ')})`)
