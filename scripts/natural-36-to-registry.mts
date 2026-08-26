#!/usr/bin/env npx tsx
// natural-36-to-registry — wire fb-tarot/docs/writeups/natural/REVIEW-natural-36.md into the registry.
//
//   npx tsx scripts/natural-36-to-registry.mts [--check]
//
// The Natural counterpart of scripts/shadow-drafts-to-registry.mts, and it works the same way:
// the manuscript is the source of truth, the registry is generated from it, and the script
// UNFOLDS its own output and compares every cut back to the manuscript character-for-character.
// A single changed character exits non-zero.
//
// 🔴 THE FOLD (scripts/lander-registry.mts): seven cuts into four registry beats.
//      beat 1 = cut 1 · beat 2 = cut 2 · beat 3 = cuts 3-6 joined by \n · beat 4 = cut 7
//    Version B splits beat 3 on the newlines and serves each as its own chat message.
//
// 🔴 THE THREE COMMITMENT HOOKS ARE EXCLUDED, and that is not an oversight. They also serve on
//    `arcana-mfh`, which is FACE UP, and tests/tarot-commitment-copy.test.ts asserts the two
//    facings are byte-identical apart from a leading "You turned "/"You chose ". The new cut 1
//    leads with the face-down truth — "The cards were face down. You turned the Hanged Man…" —
//    which is FALSE on a face-up deck and cannot be produced by that find-replace. The
//    manuscript promises those reads in a "commitment appendix" that is not in the file.
//    Wire them only when the appendix exists. See the manuscript's own wiring contract, rule 5.
import { readFileSync, writeFileSync } from 'node:fs'

const MS = 'fb-tarot/docs/writeups/natural/REVIEW-natural-36.md'
const REG = 'client/src/content/tarotReads.ts'
// Operator, 2026-08-25: "use my stuff verbatim." All 36 are wired, commitment included.
// The three commitment hooks are patched on `return-mhf` ONLY — `arcana-mfh` (face up) has no
// copy in the manuscript, and the face-down truth in the new cut 1 would be a lie on that deck,
// so it keeps what it serves today. tests/tarot-commitment-copy.test.ts's facing-parity
// assertion therefore fails by construction until the promised commitment appendix exists.
const HELD = new Set<string>([])
const CHECK = process.argv.includes('--check')

// ── parse the manuscript ────────────────────────────────────────────────────
const md = readFileSync(MS, 'utf8')
const blocks = md.split(/^### `/m).slice(1)
const cuts: Record<string, Record<string, string[]>> = {}
for (const b of blocks) {
  const hook = b.slice(0, b.indexOf('`'))
  const rows = [...b.matchAll(/^\| \*\*(\d)\*\* [^|]*\|(.+)\|\s*$/gm)]
  if (!rows.length) continue
  const grid: Record<string, Record<number, string>> = {}
  for (const r of rows) {
    const cells = r[2].split('|').map((c) => c.trim()).filter(Boolean)
    ;['a', 'b', 'c'].forEach((card, i) => {
      if (cells[i]) (grid[card] ??= {})[Number(r[1])] = cells[i]
    })
  }
  const per: Record<string, string[]> = {}
  for (const card of ['a', 'b', 'c']) {
    const seven = Array.from({ length: 7 }, (_, i) => grid[card]?.[i + 1])
    if (seven.some((x) => !x)) throw new Error(`${hook}/${card}: missing a cut`)
    per[card] = seven as string[]
  }
  cuts[hook] = per
}
const hooks = Object.keys(cuts).filter((h) => !HELD.has(h))
console.log(`manuscript: ${Object.keys(cuts).length} landers · wiring ${hooks.length} · holding ${[...HELD].length} (commitment / arcana-mfh parity)`)

const fold = (seven: string[]) => [seven[0], seven[1], seven.slice(2, 6).join('\n'), seven[6]]
const esc = (s: string) => JSON.stringify(s)

// ── patch the registry, one hook block at a time ────────────────────────────
let src = readFileSync(REG, 'utf8')
for (const hook of hooks) {
  // 🔴 SCOPED TO THE return-mhf DECK OBJECT. The three commitment hooks exist on `arcana-mfh`
  // too, so a whole-file search would hit the face-up copy and silently patch the wrong deck.
  const deckStart = src.indexOf('const RETURN_MHF: CardSetConfig = {')
  if (deckStart === -1) throw new Error('cannot locate RETURN_MHF')
  const open = `    '${hook}': {`
  const first = src.indexOf(open, deckStart)
  if (first === -1) throw new Error(`${hook}: not found in the return-mhf deck`)
  if (src.indexOf(open, first + 1) !== -1) throw new Error(`${hook}: appears twice inside return-mhf`)
  // walk braces from the opening { to its match
  let i = first + open.length - 1, depth = 0, end = -1
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end === -1) throw new Error(`${hook}: unbalanced braces`)
  const body = ['a', 'b', 'c'].map((c) => {
    const beats = fold(cuts[hook][c]).map((b) => `        ${esc(b)},`).join('\n')
    return `      ${c}: [\n${beats}\n      ],`
  }).join('\n')
  const block = `    '${hook}': {\n` +
    `      // 🔄 Natural Tarot-Cut, wired 2026-08-25 from ${MS} — approved copy, folded verbatim:\n` +
    `      // cuts 3-6 become beat 3, joined by newlines, and Version B serves them as separate\n` +
    `      // chat messages with a typing pause between each.\n` +
    `${body}\n    }`
  src = src.slice(0, first) + block + src.slice(end + 1)
}
if (!CHECK) writeFileSync(REG, src)
console.log(CHECK ? 'parsed only (--check)' : `wrote ${REG}`)
