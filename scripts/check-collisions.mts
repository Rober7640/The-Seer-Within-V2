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
const argvRaw = process.argv.slice(2)
const flagValue = (n: string) => { const i = argvRaw.indexOf(n); return i >= 0 ? argvRaw[i + 1] : null }
const DIRNAME = flagValue('--dir') ?? 'rewrites'
const SHADOW = DIRNAME === 'shadow'
const DIR = `fb-tarot/docs/drafts/${DIRNAME}/`

// 🔴 RETIRED FOR THE INHERITED SHADOW (operator, 2026-08-25). This whole check does not apply
// to the six-beat method, and running it there is worse than not running it.
//
// WHY. Both rules below assume a corpus where two landers sharing wording means someone
// copy-pasted. The Inherited Shadow's canon now REQUIRES the sharing:
//
//   · beat 5 carries a MANDATORY measured origin finding — "I don't think this began with
//     you" — on all 108 reads (inherited-shadow-cut.md §the beats).
//   · beat 4 states the one fact her ad establishes, and the operator ruled that repeating a
//     true sentence beats swapping in synonyms to dodge a checker.
//   · 37 landers share ONE three-card deck, so the drawn detail in beats 1-2 is the same
//     picture by definition. Three landers looking at the Magician's table is not reuse.
//
// Measured 2026-08-25: 3,251 flags on the 37 approved landers, 91% of them in beats 4 and 5 —
// the two beats the rulings make identical on purpose. A checker that flags the spec teaches
// everyone to ignore it, and then it cannot catch the thing it was built for either.
//
// ⚠ WHAT DID NOT CHANGE. The canon's own §Pre-flight step 3 still stands: the THREE CARDS
// INSIDE ONE LANDER must not open the same way. That is a different rule about a different
// axis, it is checked by eye before drafting, and nothing here touches it.
//
// The check stays fully live for the seven-cut drafts (`--dir rewrites`), where its premise
// still holds: those families have their own hooks and their own cards.
if (SHADOW) {
  console.log('check-collisions does not apply to the Inherited Shadow — retired 2026-08-25.')
  console.log('  Beat 5\'s origin finding and beat 4\'s ad fact are identical across landers by')
  console.log('  canon, and all 37 share one three-card deck. See the header for the full reason.')
  console.log('  Within-lander sameness is still checked: inherited-shadow-cut.md §Pre-flight step 3.')
  process.exit(0)
}

// Draft bubbles -> the 4 slots this check COMPARES on. For the seven-cut drafts that is the
// registry fold itself (beat 3 carries bubbles 3-6), same as scripts/wire-drafts-setup.mts.
//
// ⚠ THE SIX-BEAT FOLD IS NOT A WIRING DECISION. The Inherited Shadow's registry fold is
// deliberately unwritten until a lander is actually wired (inherited-shadow-cut.md §three
// candles). What is below is only how the six beats are GROUPED FOR COMPARISON: slot 0 the
// claim, slot 1 the proof, slot 2 the argument (her / but / so), slot 3 the loop. Change the
// fold at wiring time without touching this.
const toBeats = (b: string[]) =>
  b.length >= 7 ? [b[0], b[1], b.slice(2, 6).join('\n'), b[6]]
                : [b[0], b[1], b.slice(2, 5).join('\n'), b[5]]

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

const argv = argvRaw
const wired: Record<string, Record<string, string[]>> = (DECKS as any)[DECK]?.reads ?? {}

let hooks = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--dir')
if (argv.includes('--all') || !hooks.length) {
  hooks = readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(DIR + f, 'utf8')).hook)
    // 🔴 The default rule is "unwired only — a wired hook is already guarded". That reasoning
    // does NOT reach a shadow draft: every one of the 37 is already wired WITH ITS NATURAL READ,
    // and the wired guard protects that read, not this one. Skipping them would have checked
    // nothing and printed a tick. The two arms of the SAME hook are excluded from each other
    // below (`hooks.includes(other)`), which is right — a visitor is served one arm or the other.
    .filter((h: string) => SHADOW || !wired[h])
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
// ── the PROOF line · reported, never failed ──────────────────────────────────────────────
// The shadow method points at a real detail in the art, and the deck has about five usable
// details per card (decks/return-mhf/symbols.md). Across 37 landers a detail is REUSED by
// design — "one shadow side per card, constant across every lander on that deck". What is
// worth seeing is whether one detail is carrying far more than its share: symbols.md's
// standing warning is "ration the table … one detail cannot carry a hundred landers".
if (SHADOW) {
  const tally = new Map<string, string[]>()
  for (const h of hooks) for (const c of CARDS) {
    const proof = mine[h][c][1]
    if (!tally.has(`${c}|${proof}`)) tally.set(`${c}|${proof}`, [])
    tally.get(`${c}|${proof}`)!.push(h)
  }
  const perCard = new Map<string, number>()
  for (const [k, hs] of tally) perCard.set(k[0], (perCard.get(k[0]) ?? 0) + hs.length)
  console.log('\n── proof lines · rationing (report only) ──')
  for (const c of CARDS) {
    const rows = [...tally].filter(([k]) => k.startsWith(`${c}|`)).sort((a, b) => b[1].length - a[1].length)
    console.log(`  card ${c}: ${rows.length} distinct proof line(s) over ${perCard.get(c) ?? 0} lander(s)`)
    for (const [k, hs] of rows.slice(0, 3)) console.log(`     ${String(hs.length).padStart(2)}x  ${k.slice(2).slice(0, 66)}`)
  }
}

console.log('\n── beat 3 · six-word runs, same card letter ──')
console.log(runDupes.length ? runDupes.map((d) => `  🔴 ${d}`).join('\n') : '  ✓ none shared')

const total = artDupes.length + runDupes.length
console.log(`\n${total ? `🔴 ${total} collision(s) — rewrite before running the suite` : '✓ clear'}`)
process.exit(total ? 1 : 0)
