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
  // ── FLOWERY (operator 2026-08-20: "I find the language still too flowery") ────────────
  // 🔴 THE TELL IS AN APHORISM — a line shaped as a general truth rather than something about
  // HER week. "Stopped and gone are not the same." "Careful looks the same from outside."
  // "Waiting is not the same as leaving." Measured before adding this: the signed-off landers
  // (cards-feels, cards-return, cards-who-he-is) contain ZERO of them; the batch the operator
  // flagged carried up to three per lander. If a line would work on a fridge magnet it is not
  // about the woman reading it — say the specific thing instead.
  [/\b(is|are|was|were)\s+not\s+the\s+same(\s+as)?\b/i,
   'aphorism — "X is not the same as Y" is a saying, not her week. Say the specific thing.'],
  [/\b(is|are|looks?|feels?|sounds?)\s+(nearer|closer)\s+to\s+\w+\b(?!\s+(you|him|her|it))/i,
   'aphorism — "it is nearer to X" is a saying. Name the thing plainly.'],
  [/\blooks the same from (outside|the outside|out there)\b|\bstarts to look like (one|it)\b/i,
   'aphorism — a general observation, not her situation'],
  [/\bcan be \w+ and \w+ at once\b|\bdo(es)? not cancel\b|\bneeded a third\b/i,
   'aphorism — balanced clause doing the work a plain sentence should do'],
  // ⚠ NOT BANNED, deliberately: the short verbless tail ("One thing at a time, and quietly.").
  // It reads flowery in isolation but there are 246 of them across the wired corpus — it is
  // house style, and stripping them makes the copy stiffer, not plainer. Measured before
  // assuming.
  // A blind "it is"->"it's" pass produced "which one it's" and "the most modest thing there's".
  // A contraction at the end of a clause, or after a noun that needs the full verb, is a bug.
  [/\b(it's|there's|that's)\s*(?=[.,;?!…]|$)/i, "contraction at a clause end — needs the full verb (\"which one it IS\")"],
  [/\b(thing|one|which|what)\s+(it's|there's)\b/i, 'contraction after a noun that needs the full verb'],
]
// ── VOICE RULE 3 · the contraction floor, per lander not per bubble ──────────────────────
// 🔴 A PER-BUBBLE check would be wrong here — plenty of good single bubbles have nothing to
// contract. What went wrong on 2026-08-20 was a whole LANDER drifting formal: two of three new
// drafts sat at 33-35% while the signed-off landers run 83-100%. So this scores the lander.
//
// ⚠ It REPORTS a rate; it never rewrites. `fb-tarot/docs/natural-tarot-cut.md` bans a blind
// contraction pass outright — one produced "which one it's" and "the most modest thing there's".
const CONTRACTED = /\b\w+['’](s|re|t|ll|ve|d|m)\b/gi
const CONTRACTIBLE =
  /\b(you are|it is|that is|there is|i will|i am|do not|does not|did not|is not|are not|was not|were not|cannot|has not|have not|had not|will not|would not|could not|should not|you have|you will|they are|we are|he is|she is|what is|who is)\b/gi
const CONTRACTION_FLOOR = 60   // signed-off landers run 83-100; the flagged batch ran 33-35

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
for (const d of files) {
  // voice rule 3 — score the whole lander before walking its bubbles
  if (!WIRED_AND_SIGNED_OFF.has(d.hook)) {
    const body = Object.values(d.decks).flatMap((byCard) => Object.values(byCard).flatMap((b) => b.slice(1))).join(' ')
    const used = (body.match(CONTRACTED) ?? []).length
    const missed = (body.match(CONTRACTIBLE) ?? []).length
    const pct = used + missed ? Math.round((used / (used + missed)) * 100) : 100
    if (pct < CONTRACTION_FLOOR) {
      n++
      console.log(`${d.hook} — reads WRITTEN, not spoken: ${pct}% contractions (floor ${CONTRACTION_FLOOR}%, signed-off landers run 83-100%)`)
      console.log(`    ${missed} spot(s) left uncontracted — contract by hand, never with a blind regex`)
    }
  }
  for (const [deck, byCard] of Object.entries(d.decks)) for (const [c, bubbles] of Object.entries(byCard)) {
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
}
console.log(n ? `\n${n} problem(s)` : '\nno problems')
