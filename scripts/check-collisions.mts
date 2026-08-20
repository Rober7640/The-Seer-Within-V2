#!/usr/bin/env npx tsx
// check-collisions — does a new family reuse art or wording that is already on the deck?
//
//   npx tsx scripts/check-collisions.mts cards-slipping-past cards-choosing-wrong …
//   npx tsx scripts/check-collisions.mts --all          # every draft not yet wired
//
// WHY THIS EXISTS. Two guards in every family's test file fail on wording, not on meaning:
// beat-1 art lines must be unique across the whole deck (she is LOOKING at the card, and a
// detail spent twice is the one thing on the page she can check), and beat 3 may share no
// six-word run with any other hook. Writing eight landers in one sitting hit SEVENTEEN
// beat-3 collisions (2026-08-19) — almost all of them on the framework's own mandated cut-6
// opener, because apostrophes tokenize apart and "that s why you re worn" burns six tokens
// on four words. Finding those by running the full vitest suite costs 50 seconds a go; this
// costs under two.
//
// 🔴 IT MUST MATCH THE REAL GUARDS, OR IT IS WORSE THAN NOTHING. The first version of this
// check compared every card against every other card and reported 26 collisions — nine of
// them phantom, because the real guards compare SAME CARD LETTER ONLY (card a vs card a).
// Chasing phantoms rewrites copy that was fine. The two rules, copied from the sibling
// guards so they cannot drift:
//   1. same card letter only        (reads[new][c][2] vs reads[other][c][2])
//   2. against the WIRED REGISTRY, not other drafts — plus the new family against itself
import { readFileSync, readdirSync } from 'node:fs'
import { DECKS, TAROT_HOOKS, SELF_FRAME_HOOKS } from '../client/src/content/tarotReads'

const DECK = 'return-mhf' as const
const CARDS = ['a', 'b', 'c'] as const
const DIR = 'fb-tarot/docs/drafts/rewrites/'

// 7 draft bubbles -> the 4 registry beats; beat 3 carries bubbles 3-6. Same fold as
// scripts/wire-drafts-setup.mts, so what is compared here is what gets wired.
const toBeats = (b: string[]) => [b[0], b[1], b.slice(2, 6).join('\n'), b[6]]

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
const RUNS = new Map<string, Set<string>>()
const runsOf = (str: string, n = 6) => {
  const hit = RUNS.get(str)
  if (hit) return hit
  const w = words(str)
  const out = new Set<string>()
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '))
  RUNS.set(str, out)
  return out
}
const shared = (a: string, b: string) => {
  const rb = runsOf(b)
  return [...runsOf(a)].filter((r) => rb.has(r))
}

const argv = process.argv.slice(2)
const wired: Record<string, Record<string, string[]>> = (DECKS as any)[DECK]?.reads ?? {}

let hooks = argv.filter((a) => !a.startsWith('--'))
if (argv.includes('--all') || !hooks.length) {
  hooks = readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(DIR + f, 'utf8')).hook)
    .filter((h: string) => !wired[h])          // unwired only — a wired hook is already guarded
}
if (!hooks.length) {
  console.log('no unwired drafts to check')
  process.exit(0)
}

const mine: Record<string, Record<string, string[]>> = {}
for (const h of hooks) {
  const d = JSON.parse(readFileSync(`${DIR}${h}.json`, 'utf8'))
  const deck = d.decks?.[DECK]
  if (!deck) { console.error(`🔴 ${h}.json has no ${DECK} deck`); process.exit(2) }
  mine[h] = Object.fromEntries(CARDS.map((c) => [c, toBeats(deck[c])]))
}

console.log(`checking ${hooks.length} hook(s) x 3 cards against ${Object.keys(wired).length} wired hooks on ${DECK}\n`)

// ── beat 1: exact-string uniqueness across the whole deck ────────────────────────────────
const seen = new Map<string, string>()
for (const [h, byCard] of Object.entries(wired)) {
  if (hooks.includes(h)) continue
  for (const c of CARDS) { const l = byCard[c]?.[0]; if (l) seen.set(l, `${h}/${c}`) }
}
const artDupes: string[] = []
for (const h of hooks) for (const c of CARDS) {
  const line = mine[h][c][0]
  const other = seen.get(line)
  if (other) artDupes.push(`${h}/${c} reuses ${other}\n     "${line}"`)
  seen.set(line, `${h}/${c}`)      // also catches two NEW landers sharing a line
}
console.log('── beat 1 · art lines, exact string, whole deck ──')
console.log(artDupes.length ? artDupes.map((d) => `  🔴 ${d}`).join('\n') : `  ✓ all ${hooks.length * 3} unique`)

// ── beat 3: six-word runs, same card letter ──────────────────────────────────────────────
const runDupes: string[] = []
for (let i = 0; i < hooks.length; i++) for (let j = i + 1; j < hooks.length; j++) for (const c of CARDS) {
  for (const r of shared(mine[hooks[i]][c][2], mine[hooks[j]][c][2]))
    runDupes.push(`${hooks[i]}/${c} ~ ${hooks[j]}/${c}: "${r}"`)
}
for (const h of hooks) for (const c of CARDS) for (const other of TAROT_HOOKS as readonly string[]) {
  if (hooks.includes(other)) continue
  const beat = wired[other]?.[c]?.[2]
  if (!beat) continue
  for (const r of shared(mine[h][c][2], beat)) runDupes.push(`${h}/${c} ~ ${other}/${c} (live): "${r}"`)
}
// The live self-frame incumbents on the OTHER decks — the running baseline a new family is
// most likely to rhyme with, and the one comparison a return-mhf-only sweep would miss.
for (const h of hooks) for (const c of CARDS) for (const oh of SELF_FRAME_HOOKS) {
  for (const deck of ['arcana-mfh', 'arcana-eef'] as const) {
    const inc = (DECKS as any)[deck]?.reads?.[oh]
    if (!inc?.[c]) continue
    for (const r of shared(mine[h][c][2], inc[c][2])) runDupes.push(`${h}/${c} ~ ${oh}@${deck}/${c}: "${r}"`)
  }
}
console.log('\n── beat 3 · six-word runs, same card letter ──')
console.log(runDupes.length ? runDupes.map((d) => `  🔴 ${d}`).join('\n') : '  ✓ none shared')

const total = artDupes.length + runDupes.length
console.log(`\n${total ? `🔴 ${total} collision(s) — rewrite before running the suite` : '✓ clear'}`)
process.exit(total ? 1 : 0)
