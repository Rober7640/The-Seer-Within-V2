#!/usr/bin/env node
// check-draft — per-bubble readability readout for pending drafts, so a failing line can be
// found and fixed in one pass instead of bisecting the preview output.
//   node scripts/check-draft.mjs cards-loyal          # only the failing bubbles
//   node scripts/check-draft.mjs cards-loyal --all    # every bubble
import { readFileSync, readdirSync } from 'node:fs'
import { checkBubble, checkEcho } from './check-read.mjs'

// ── Comprehension rules (operator 2026-08-19) ────────────────────────────────────────────
// The shared gate counts syllables and sentence length. It cannot see abstraction, so it
// passed a whole batch containing lines like "It is not a length." — grade 2, and she still
// stops. These three sit ON TOP of it, on drafts only, so signed-off copy is not reopened.
const COMPREHENSION = [
  // Each bubble is its own chat message with a typing pause, so a bare pronoun at the start
  // has nothing to attach to — the referent scrolled. "That gap is real" is fine (noun attached).
  [/^(It|That|This|Those|These|They|Both)\s+(is|was|are|were|does|do|did|has|have|had|will|would|means?|tells?|leaves?|cannot|can|never|only|of)\b/,
   'opens on a bare It/That/This — the referent is in the PREVIOUS message. Attach a noun, or name the thing.'],
  [/\b(a length|the length|premise|notion|ration|hinge|designation|a real fork|shape problem|the unknown|fullness|mid-air|faculty)\b/i,
   'concept-noun — name the actual thing instead'],
  [/\byour word\b|\bwhen you say it\b|\bLook at your word\b|\bListen to your word\b/i,
   'makes her analyse her own wording — do that work for her'],
  // A blind "it is"->"it's" pass produced "which one it's" and "the most modest thing there's".
  // A contraction at the end of a clause, or after a noun that needs the full verb, is a bug.
  [/\b(it's|there's|that's)\s*(?=[.,;?!…]|$)/i, "contraction at a clause end — needs the full verb (\"which one it IS\")"],
  [/\b(thing|one|which|what)\s+(it's|there's)\b/i, 'contraction after a noun that needs the full verb'],
]
// operator 2026-08-19: leave the already-wired, signed-off copy alone.
const WIRED_AND_SIGNED_OFF = new Set(['cards-feels', 'cards-who-he-is'])

const DIR = new URL('../fb-tarot/docs/drafts/rewrites/', import.meta.url)
const argv = process.argv.slice(2)
const all = argv.includes('--all')
const hooks = argv.filter((a) => !a.startsWith('--'))
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, DIR), 'utf8')))
  .filter((d) => !hooks.length || hooks.includes(d.hook))
let n = 0
for (const d of files) for (const [deck, byCard] of Object.entries(d.decks)) for (const [c, bubbles] of Object.entries(byCard)) {
  const echo = checkEcho(bubbles, d.headline)
  if (echo.length) { n++; console.log(`${d.hook} ${deck}/${c} ECHO — ${echo[0]}`) }
  bubbles.forEach((b, i) => {
    const p = checkBubble(b, i, d.headline)
    // cards-feels / cards-who-he-is are already wired and signed off (operator 2026-08-19:
    // "leave them"), so the comprehension rules are not applied retroactively to them.
    if (!WIRED_AND_SIGNED_OFF.has(d.hook)) {
      for (const [re, why] of COMPREHENSION) if (re.test(b)) p.push(why)
    }
    if (p.length) n++
    if (p.length || all) console.log(`${p.length ? '✗' : ' '} ${d.hook} ${deck}/${c} b${i + 1}${p.length ? ` — ${p.join(' · ')}` : ''}\n    ${b}`)
  })
}
console.log(n ? `\n${n} problem(s)` : '\nno problems')
