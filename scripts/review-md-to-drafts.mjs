#!/usr/bin/env node
// review-md-to-drafts — turn the markdown review file into draft JSON the gate can read.
//
// WHY THIS EXISTS. `check-draft.mjs` reads JSON drafts, not markdown, so a review batch written
// as tables in a .md file cannot be gated directly. Revision 3 of the shadow review was checked
// against a scratch folder that was then deleted, which made the "no problems" claim
// unreproducible (operator, 2026-08-25). This script is the missing half.
//
//   node scripts/review-md-to-drafts.mjs                      # → fb-tarot/docs/drafts/shadow-review/
//   node scripts/check-draft.mjs --dir shadow-review          # gate the result
//
// 🔴 IT VALIDATES THE WHOLE FILE BEFORE IT WRITES ANYTHING (operator, 2026-08-25). A parser that
// silently drops a malformed table hands the gate a smaller corpus and the gate says "no
// problems" about copy nobody checked. So: parse everything, assert the shape, and only then
// touch the output folder. Any failure exits non-zero having deleted nothing.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const EXPECT = { landers: 36, reads: 108, beats: 6, cards: 3 }
const SRC = new URL('../fb-tarot/docs/drafts/shadow/REVIEW-new-voice.md', import.meta.url)
const OUT = new URL('../fb-tarot/docs/drafts/shadow-review/', import.meta.url)

const md = readFileSync(SRC, 'utf8')
const errors = []
const parsed = []

for (const section of md.split(/^### /m).slice(1)) {
  const head = section.match(/^`(cards-[a-z-]+)` — \*"(.+?)"\*/)
  if (!head) continue
  const [, hook, headline] = head
  const rows = new Map()
  for (const line of section.split('\n')) {
    const m = line.match(/^\|\s+\*\*(\d)\*\*\s+\|(.+)\|\s*$/)
    if (!m) continue
    const beat = Number(m[1])
    const cells = m[2].split(' | ').map((c) => c.trim())
    if (rows.has(beat)) errors.push(`${hook}: beat ${beat} appears twice`)
    if (cells.length !== EXPECT.cards) errors.push(`${hook} beat ${beat}: ${cells.length} cells, expected ${EXPECT.cards}`)
    const empty = cells.findIndex((c) => !c || c === '—')
    if (empty >= 0) errors.push(`${hook} beat ${beat}: card ${'abc'[empty]} is empty`)
    rows.set(beat, cells)
  }
  const missing = [1, 2, 3, 4, 5, 6].filter((b) => !rows.has(b))
  if (missing.length) errors.push(`${hook}: missing beat row(s) ${missing.join(', ')}`)
  if (rows.size !== EXPECT.beats) errors.push(`${hook}: ${rows.size} beat rows, expected ${EXPECT.beats}`)
  parsed.push({ hook, headline, rows })
}

const seen = new Set()
for (const { hook } of parsed) {
  if (seen.has(hook)) errors.push(`${hook}: duplicated section`)
  seen.add(hook)
}
if (parsed.length !== EXPECT.landers) errors.push(`${parsed.length} landers, expected ${EXPECT.landers}`)
const reads = parsed.reduce((n, p) => n + (p.rows.size === EXPECT.beats ? EXPECT.cards : 0), 0)
if (reads !== EXPECT.reads) errors.push(`${reads} complete reads, expected ${EXPECT.reads}`)

if (errors.length) {
  console.error(`✗ REVIEW-new-voice.md failed validation — nothing was written or deleted:`)
  for (const e of errors) console.error(`   ${e}`)
  process.exit(1)
}

rmSync(fileURLToPath(OUT), { recursive: true, force: true })
mkdirSync(fileURLToPath(OUT), { recursive: true })
for (const { hook, headline, rows } of parsed) {
  const cards = {}
  ;['a', 'b', 'c'].forEach((card, i) => { cards[card] = [1, 2, 3, 4, 5, 6].map((b) => rows.get(b)[i]) })
  writeFileSync(new URL(`${hook}.json`, OUT),
    JSON.stringify({ hook, headline, method: 'inherited-shadow', note: 'generated from REVIEW-new-voice.md — not a wired draft', decks: { 'return-mhf': cards } }, null, 2) + '\n')
}
console.log(`✓ ${parsed.length} landers · ${reads} reads · ${readdirSync(fileURLToPath(OUT)).length} files written`)
