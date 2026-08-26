// Vitest setup that loads the PENDING DRAFTS into the in-memory registry, so the real
// tests/tarot-*-copy.test.ts guard files run against proposed copy BEFORE it is wired.
//
// WHY. `preview-rewrite.mjs` gates readability and `dryrun-drafts.mts` re-implements a
// subset of the guards by hand — and a hand re-implementation only proves what it happens
// to have transcribed. Running the ACTUAL guard files is the only thing that proves a draft
// is wirable. On the 2026-08-19 batch this caught 12 failures both other gates passed clean,
// including a whole class nobody had anticipated: restating her own headline in beat 2 trips
// that family's own ban ("there is someone else", "he still loves you", "you are ready",
// "stop searching", "you will be alone forever").
//
// It mutates the imported module object only. No source file is touched.
//
//   npx vitest run --config scripts/vitest.drafts.config.ts tests/tarot-
import { readdirSync, readFileSync } from 'node:fs'
const { DECKS } = await import('@/content/tarotReads')
const DIR = new URL('../fb-tarot/docs/drafts/rewrites/', import.meta.url)
const CARDS = ['a', 'b', 'c'] as const
// 7 bubbles -> the 4 registry beats; beat 3 carries bubbles 3-6, joined at wiring time.
const toBeats = (b: string[]) => [b[0], b[1], b.slice(2, 6).join('\n'), b[6]]
let n = 0
for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
  const d = JSON.parse(readFileSync(new URL(f, DIR), 'utf8'))
  for (const [deck, byCard] of Object.entries(d.decks as Record<string, any>)) {
    const reads = (DECKS as any)[deck]?.reads
    if (!reads?.[d.hook]) continue
    for (const c of CARDS) reads[d.hook][c] = toBeats(byCard[c])
    n++
  }
}
console.log(`[drafts] ${n} pending lander(s) loaded into the in-memory registry`)
