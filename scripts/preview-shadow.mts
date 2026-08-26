#!/usr/bin/env npx tsx
// preview-shadow — render the PROPOSED Inherited Shadow reads as plain Markdown for reading.
//
// The sibling of scripts/preview-rewrite.mjs, for the six-beat method. Same job, same place:
//   draft JSON  →  THIS PREVIEW  →  human "go"  →  wired into the registry
//
// 🔴 IT REPORTS NOTHING ABOUT PASS/FAIL, ON PURPOSE. An earlier version of this preview led
// with green "clean" gate tiles. Three of the four were false, and a reviewer who reads
// "clean" reasonably stops being sceptical — which is the opposite of what a copy review is
// for. Gate state lives in the checklist; this file is the copy and nothing else.
//
//   npx tsx scripts/preview-shadow.mts            # -> fb-tarot/docs/drafts/shadow/PREVIEW.md
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { DECKS } from '../client/src/content/tarotReads'

const DIR = new URL('../fb-tarot/docs/drafts/shadow/', import.meta.url)
const WIRED: Record<string, Record<string, string[]>> = (DECKS as any)['return-mhf'].reads
const CARDS = [['a','the Magician, the card of will and intention'],
               ['b','the Hanged Man, the card of the pause and a new angle'],
               ['c','the Fool, the card of new beginnings']]
const BEAT = ['claim','proof','what it means for her','but','so','look closer']
const ORDER = [
  ['Commitment', ['cards-will-commit','cards-wont-commit','cards-ready-commit']],
  ['Money', ['cards-blocked-retiring','cards-nest-egg','cards-too-late','cards-still-working',
             'cards-how-much-longer','cards-out-of-time','cards-my-energy','cards-money-wont-stay',
             'cards-energy-how-long','cards-prayed-years','cards-prayers-unanswered']],
  ['Soulmate × keyword', ['cards-blocking-soulmate','cards-blocked-before','cards-energy-away',
             'cards-energy-soulmate','cards-waiting-to-heal','cards-heal-first']],
  ['Soulmate × age band', ['cards-slipping-past','cards-choosing-wrong','cards-found-me-yet',
             'cards-keeps-waiting','cards-missed-chance','cards-after-marriage','cards-second-time',
             'cards-best-years','cards-too-late-love','cards-longer-to-wait','cards-allowed-to-want']],
  ['Soulmate × where', ['cards-where-soulmate','cards-soulmate-closer','cards-not-found-yet']],
  ['Soulmate × after loss', ['cards-new-soulmate','cards-soulmate-out-there','cards-ready-to-love']],
]
const drafts: Record<string, any> = Object.fromEntries(readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => { const d = JSON.parse(readFileSync(new URL(f, DIR), 'utf8')); return [d.hook, d] }))

// The art line (beat 2) is the one thing on the page she can check, so a sentence spent twice
// is worth seeing while reading. Flagged inline rather than counted in a summary.
const art = new Map<string, string[]>()
for (const d of Object.values(drafts)) for (const [c] of CARDS) {
  const k = `${c}|${d.decks['return-mhf'][c][1]}`
  art.set(k, [...(art.get(k) ?? []), d.hook])
}

const out: string[] = [`# Inherited Shadow — the 37 proposed reads

> 🤖 **GENERATED** by \`npx tsx scripts/preview-shadow.mts\` from the draft JSON beside this file.
> **Nothing here is in the code yet.** Say go and it gets wired verbatim — the approved strings
> are the strings that ship, nothing is retyped.

Each numbered line below is a **separate chat message**, with its own typing pause. Six beats,
one argument: **claim → proof → what it means for her → but → so → look closer**.

The live read is shown under each card. It is **not replaced** — arming a lander makes it the
30% arm, so both run.

⚠ Known blockers are tracked in \`fb-tarot/docs/writeups/shadow-split-test-checklist.md\`, not here. This
file is the copy, so that reading it is reading the copy.
`]

for (const [section, hooks] of ORDER) {
  out.push(`\n---\n\n# ${section} — ${hooks.length}\n`)
  for (const hook of hooks) {
    const d = drafts[hook]
    out.push(`\n## \`${hook}\` — "${d.headline}"\n`)
    out.push(d.note.split('\n').map((l) => l.trim()).filter(Boolean).join('\n\n') + '\n')
    for (const [c, vocab] of CARDS) {
      const b = d.decks['return-mhf'][c]
      const shared = (art.get(`${c}|${b[1]}`) ?? []).filter((h) => h !== hook)
      out.push(`\n### card ${c} — ${vocab}\n`)
      out.push(b.map((line, i) => {
        const flag = i === 1 && shared.length ? `  ⚠ **same art line as \`${shared.join('`, `')}\`**` : ''
        return `${i + 1}. *${BEAT[i]}* — ${line}${flag}`
      }).join('\n'))
      const w = WIRED[hook]?.[c]
      out.push(`\n<details><summary>the live read — becomes the 30% arm, unchanged</summary>\n`)
      out.push(w ? w.flatMap((s) => String(s).split('\n')).map((s, i) => `${i + 1}. ${s}`).join('\n')
                 : '_not on the wired registry_')
      out.push(`\n</details>\n`)
    }
  }
}
writeFileSync(new URL('PREVIEW.md', DIR), out.join('\n'))
const dupes = [...art.values()].filter((v) => v.length > 1)
console.log(`PREVIEW.md — 37 landers, 111 reads`)
console.log(dupes.length ? `⚠ ${dupes.length} art lines used on more than one lander (flagged inline)` : '')
