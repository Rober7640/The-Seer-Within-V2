#!/usr/bin/env node
// preview-rewrite — render PROPOSED /fb-tarot read rewrites for human sign-off, BEFORE
// a single character is changed in client/src/content/tarotReads.ts.
//
// WHY THIS EXISTS. The operator asked to see the new copy first (2026-08-19), and he is
// right to: the reads are the whole product on Version B, there are 64 landers still to
// rewrite, and a rewrite that has to be argued about after it is wired costs a revert plus
// a test run. So the pipeline gets a middle step:
//
//    draft JSON  →  THIS PREVIEW (gated, old vs new)  →  human "go"  →  wired into the registry
//
// Drafts live in fb-tarot/docs/drafts/rewrites/<hook>.json and are the SOURCE the wiring
// step reads, so nothing is retyped between sign-off and code — the exact strings that were
// approved are the exact strings that ship.
//
// Draft shape:
//   { hook, headline, note?, decks: { <deck>: { a: [...bubbles], b: [...], c: [...] } } }
// Bubbles are what Version B SENDS, minus the shared name-capture line. Beat 3 is written
// as separate bubbles here and joined with '\n' at wiring time — see the SKILL.
//
//   node scripts/preview-rewrite.mjs                 # every pending draft → PREVIEW.md
//   node scripts/preview-rewrite.mjs --hook cards-feels
//   node scripts/preview-rewrite.mjs --stdout        # print instead of writing
//   node scripts/preview-rewrite.mjs --html          # also emit PREVIEW.html for publishing
//
// Exit 1 if any draft fails the copy gate or would collide with existing copy — a preview
// must never show the operator something that cannot actually be wired.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { checkBubble, checkEcho } from './check-read.mjs'

const argv = process.argv.slice(2)
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }

const DIR = new URL('../fb-tarot/docs/drafts/rewrites/', import.meta.url)
const { DECKS, HEADLINES, openerB } = await import('../client/src/content/tarotReads.ts')

// --hook may be repeated, so one family can be previewed on its own page for review.
const only = argv.reduce((a, v, i) => (v === '--hook' ? [...a, argv[i + 1]] : a), [])
// --out redirects both files, so a filtered run never overwrites the full PREVIEW.
const outHtml = arg('--out')
const drafts = readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, DIR), 'utf8')))
  .filter((d) => !only.length || only.includes(d.hook))
  .sort((a, b) => a.hook.localeCompare(b.hook))

if (!drafts.length) { console.error(`no drafts found${only.length ? ` for ${only.join(', ')}` : ''} in fb-tarot/docs/drafts/rewrites/`); process.exit(2) }

// Beat 1 is compared by EXACT STRING across the whole deck by the distinctness guards in
// 8 test files. Reusing a sibling hook's picture line is the easy mistake — same card, so
// the same true detail comes to mind twice. Catch it here, not in a test run after wiring.
function collisions(deck, hook, opener) {
  const out = []
  for (const [h, byCard] of Object.entries(DECKS[deck].reads)) {
    if (h === hook) continue
    for (const [c, beats] of Object.entries(byCard)) if (beats[0] === opener) out.push(`${h}/${c}`)
  }
  return out
}

let failures = 0
const md = []
md.push('# Proposed read rewrites — awaiting sign-off')
md.push('')
md.push('> 🤖 **GENERATED** by `node scripts/preview-rewrite.mjs` from the draft JSON beside this')
md.push('> file. **Nothing here is in the code yet.** Say go and it gets wired verbatim — the')
md.push('> approved strings are the strings that ship, nothing is retyped.')
md.push('')
md.push('Each bubble below is a **separate chat message**, with its own typing pause. Old copy is')
md.push('shown underneath so you can see what it replaces. `[Nw gN.N]` = words and reading grade — grade is shown for information only and fails nothing.')
md.push('')

for (const d of drafts) {
  md.push('---')
  md.push('')
  md.push(`# \`${d.hook}\` — "${d.headline ?? HEADLINES[d.hook]}"`)
  md.push('')
  if (d.note) { md.push(`${d.note}`); md.push('') }

  for (const [deck, byCard] of Object.entries(d.decks)) {
    const cfg = DECKS[deck]
    md.push(`## ${deck} — ${cfg.facing === 'up' ? 'cards face UP (she chose)' : 'cards face DOWN (she turned)'}`)
    md.push('')
    for (const card of Object.keys(byCard)) {
      const bubbles = byCard[card]
      const problems = [
        ...checkEcho(bubbles, d.headline ?? HEADLINES[d.hook]),
        ...bubbles.flatMap((b, i) => checkBubble(b, i, d.headline ?? HEADLINES[d.hook])),
      ]
      const clash = collisions(deck, d.hook, bubbles[0])
      failures += problems.length + clash.length

      md.push(`### card ${card} — ${cfg.mark[card]}`)
      md.push('')
      md.push(problems.length || clash.length
        ? `🔴 **${problems.length + clash.length} problem(s)** — not wirable as written.`
        : '✅ passes the copy gate · beat 1 is unique on this deck')
      md.push('')
      md.push('**NEW — what she would read**')
      md.push('')
      bubbles.forEach((b, i) => md.push(`${i + 1}. ${b}`))
      md.push('')
      for (const p of problems) md.push(`- 🔴 bubble issue: ${p}`)
      for (const c of clash) md.push(`- 🔴 beat 1 is identical to \`${c}\` on this deck — the distinctness guard fails`)
      if (problems.length || clash.length) md.push('')
      // Track B landers do not exist in the registry yet, so there is nothing to compare
      // against — say so rather than rendering an empty panel that reads like a bug.
      if (!DECKS[deck].reads[d.hook]) {
        md.push('> 🆕 **New lander** — nothing to compare against; this hook is not in the registry yet.')
      } else {
        md.push('<details><summary>OLD — what she reads today</summary>')
        md.push('')
        openerB(deck, d.hook, card).slice(0, -1).forEach((b, i) => md.push(`${i + 1}. ${b}`))
        md.push('')
        md.push('</details>')
      }
      md.push('')
    }
  }
}

md.push('---')
md.push('')
md.push(failures
  ? `# 🔴 ${failures} problem(s) — fix before showing this to anyone`
  : '# ✅ Every draft above is wirable as written')
md.push('')
md.push('The gate cannot judge warmth, rhythm, or whether a line is worth saying. Read it aloud.')
md.push('')

// ── --html: the same drafts as a readable page ──────────────────────────────
// The markdown above is right for the repo; it is the wrong shape for JUDGING copy. These
// are CHAT MESSAGES, and the only way to tell whether a bubble lands is to see it as a
// bubble at the width she reads it on a phone. Same data, rendered as the medium.
if (argv.includes('--html')) {
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const h = []
  h.push('<title>Tarot Read Rewrites</title>')
  h.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
  h.push('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">')
  h.push(`<style>
:root{
  --ground:#F6F5F9; --surface:#FFFFFF; --sunk:#EFEEF4; --line:#DEDCE7;
  --text:#1A1823; --muted:#5D5872; --faint:#8B86A0;
  --violet:#6B5CA5; --ochre:#8A6320; --pass:#2A6F51; --flag:#9B3535;
  --bubble:#EAE7F2; --bubble-text:#241F33;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --ground:#14121C; --surface:#1C1927; --sunk:#191622; --line:#2E2A3D;
  --text:#E9E7F0; --muted:#A8A2BC; --faint:#7C7694;
  --violet:#A697DE; --ochre:#D4A855; --pass:#69C79B; --flag:#E58A8A;
  --bubble:#2A2539; --bubble-text:#E9E7F0;
}}
:root[data-theme="dark"]{
  --ground:#14121C; --surface:#1C1927; --sunk:#191622; --line:#2E2A3D;
  --text:#E9E7F0; --muted:#A8A2BC; --faint:#7C7694;
  --violet:#A697DE; --ochre:#D4A855; --pass:#69C79B; --flag:#E58A8A;
  --bubble:#2A2539; --bubble-text:#E9E7F0;
}
*{box-sizing:border-box}
body{background:var(--ground);color:var(--text);
  font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
  font-size:16px;line-height:1.6;margin:0;padding:0 1.25rem 6rem;
  -webkit-font-smoothing:antialiased}
.wrap{max-width:54rem;margin:0 auto}
header.top{padding:3.5rem 0 2rem;border-bottom:1px solid var(--line);margin-bottom:2.5rem}
h1{font-family:"Playfair Display",Georgia,serif;font-weight:600;
  font-size:clamp(1.9rem,4.5vw,2.7rem);line-height:1.15;margin:0 0 .6rem;text-wrap:balance}
.standfirst{color:var(--muted);font-size:1.0625rem;max-width:40rem;margin:0 0 1.5rem}
.callout{background:var(--sunk);border-left:3px solid var(--violet);
  padding:1rem 1.15rem;border-radius:0 6px 6px 0;font-size:.9375rem;color:var(--muted)}
.callout strong{color:var(--text)}
h2.hook{font-family:"Playfair Display",Georgia,serif;font-weight:600;
  font-size:clamp(1.45rem,3.2vw,1.9rem);margin:4rem 0 .35rem;text-wrap:balance}
.slug{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.8125rem;
  color:var(--violet);letter-spacing:.02em;margin:0 0 .5rem}
.note{color:var(--muted);font-size:.9375rem;margin:0 0 2rem;max-width:42rem}
h3.deck{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.11em;
  color:var(--faint);margin:2.75rem 0 1.25rem;padding-bottom:.5rem;border-bottom:1px solid var(--line)}
h3.deck em{font-style:normal;color:var(--violet);text-transform:none;letter-spacing:0;font-weight:500}
.reveal{background:var(--surface);border:1px solid var(--line);border-radius:10px;
  padding:1.4rem 1.5rem 1.25rem;margin-bottom:1.25rem}
.cardname{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.75rem;
  text-transform:uppercase;letter-spacing:.08em;color:var(--ochre);margin:0 0 .15rem}
.mark{font-family:"Playfair Display",Georgia,serif;font-size:1.15rem;margin:0 0 1rem;color:var(--text)}
.pill{display:inline-flex;align-items:center;gap:.4rem;font-size:.78125rem;font-weight:500;
  padding:.22rem .6rem;border-radius:999px;margin-bottom:1.15rem;
  font-family:"IBM Plex Mono",ui-monospace,monospace}
.pill.ok{color:var(--pass);background:color-mix(in srgb,var(--pass) 12%,transparent)}
.pill.bad{color:var(--flag);background:color-mix(in srgb,var(--flag) 14%,transparent)}
ol.thread{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.55rem}
ol.thread li{display:grid;grid-template-columns:1.5rem 1fr;gap:.7rem;align-items:start}
.n{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.75rem;color:var(--faint);
  text-align:right;padding-top:.55rem;font-variant-numeric:tabular-nums}
.bub{background:var(--bubble);color:var(--bubble-text);border-radius:14px 14px 14px 4px;
  padding:.6rem .9rem;max-width:34rem;font-size:.98rem;line-height:1.55}
.meta{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.6875rem;color:var(--faint);
  padding-top:.7rem;white-space:nowrap;font-variant-numeric:tabular-nums}
li.withmeta{grid-template-columns:1.5rem 1fr auto}
details{margin-top:1.15rem;border-top:1px dashed var(--line);padding-top:.85rem}
summary{cursor:pointer;font-size:.8125rem;color:var(--faint);font-weight:500}
summary:hover{color:var(--violet)}
summary:focus-visible{outline:2px solid var(--violet);outline-offset:3px;border-radius:3px}
details ol{list-style:none;padding:0;margin:.9rem 0 0;display:flex;flex-direction:column;gap:.5rem}
details .bub{background:transparent;border:1px solid var(--line);color:var(--muted);border-radius:8px}
.prob{color:var(--flag);font-size:.875rem;margin:.5rem 0 0}
.newlander{margin:1.15rem 0 0;padding-top:.85rem;border-top:1px dashed var(--line);font-size:.8125rem;color:var(--faint)}
footer.end{margin-top:5rem;padding-top:2rem;border-top:1px solid var(--line);color:var(--muted);font-size:.9375rem}
footer.end .verdict{font-family:"Playfair Display",Georgia,serif;font-size:1.35rem;color:var(--text);margin:0 0 .5rem}
@media (max-width:34rem){.meta{display:none}li.withmeta{grid-template-columns:1.5rem 1fr}}
</style>`)
  h.push('<div class="wrap">')
  h.push('<header class="top">')
  h.push('<h1>Proposed read rewrites</h1>')
  const hookList = drafts.map((d) => d.hook).join(' · ')
  h.push(`<p class="standfirst">Every bubble below is one chat message with its own typing pause — shown at the width she reads it, because that is the only way to judge whether it lands. ${drafts.length} hook${drafts.length === 1 ? '' : 's'}: ${esc(hookList)}.</p>`)
  h.push('<p class="callout"><strong>Nothing here is in the code yet.</strong> This is generated from draft files, and the strings you approve are wired verbatim — nothing gets retyped between your go and the deploy. Old copy sits under each panel so you can see what it replaces.</p>')
  h.push('</header>')

  for (const d of drafts) {
    h.push(`<h2 class="hook">&ldquo;${esc(d.headline ?? HEADLINES[d.hook])}&rdquo;</h2>`)
    h.push(`<p class="slug">?hook=${esc(d.hook)}</p>`)
    if (d.note) h.push(`<p class="note">${esc(d.note)}</p>`)
    for (const [deck, byCard] of Object.entries(d.decks)) {
      const cfg = DECKS[deck]
      h.push(`<h3 class="deck">${esc(deck)} <em>${cfg.facing === 'up' ? 'she chose a face-up card' : 'she turned a face-down card'}</em></h3>`)
      for (const card of Object.keys(byCard)) {
        const bubbles = byCard[card]
        const headline = d.headline ?? HEADLINES[d.hook]
        const probs = [...checkEcho(bubbles, headline), ...bubbles.flatMap((b, i) => checkBubble(b, i, headline))]
        const clash = collisions(deck, d.hook, bubbles[0])
        h.push('<article class="reveal">')
        h.push(`<p class="cardname">Card ${esc(card)}</p>`)
        h.push(`<p class="mark">${esc(cfg.mark[card])}</p>`)
        h.push(probs.length + clash.length
          ? `<p class="pill bad">${probs.length + clash.length} problem${probs.length + clash.length === 1 ? '' : 's'} — not wirable</p>`
          : '<p class="pill ok">passes the gate · beat 1 unique on this deck</p>')
        h.push('<ol class="thread">')
        bubbles.forEach((b, i) => {
          const w = (b.match(/[A-Za-z']+/g) ?? []).length
          h.push(`<li class="withmeta"><span class="n">${i + 1}</span><span class="bub">${esc(b)}</span><span class="meta">${w}w</span></li>`)
        })
        h.push('</ol>')
        for (const p of probs) h.push(`<p class="prob">${esc(p)}</p>`)
        for (const c of clash) h.push(`<p class="prob">beat 1 is identical to ${esc(c)} on this deck</p>`)
        if (!DECKS[deck].reads[d.hook]) {
          h.push('<p class="newlander">🆕 New lander — nothing to compare against yet.</p>')
        } else {
          h.push('<details><summary>Show what she reads today</summary><ol>')
          openerB(deck, d.hook, card).slice(0, -1).forEach((b, i) =>
            h.push(`<li class="withmeta"><span class="n">${i + 1}</span><span class="bub">${esc(b)}</span></li>`))
          h.push('</ol></details>')
        }
        h.push('</article>')
      }
    }
  }
  h.push('<footer class="end">')
  h.push(`<p class="verdict">${failures ? `${failures} problem${failures === 1 ? '' : 's'} to fix first` : 'All wirable as written'}</p>`)
  h.push('<p>The gate checks length, stacked negatives, the echo of the ad and a banned-phrase list. Reading grade is shown but no longer gated — it fell whenever a real noun was deleted, so it rewarded vagueness. It cannot judge warmth, rhythm, or whether a line is worth saying — so read it aloud before you say go.</p>')
  h.push('</footer></div>')
  const htmlPath = outHtml ? new URL(`file://${outHtml}`) : new URL('PREVIEW.html', DIR)
  writeFileSync(htmlPath, h.join('\n'))
  console.log(`wrote ${outHtml ?? 'fb-tarot/docs/drafts/rewrites/PREVIEW.html'}`)
}

const text = md.join('\n')
if (argv.includes('--stdout')) console.log(text)
else {
  if (!outHtml) writeFileSync(new URL('PREVIEW.md', DIR), text)
  console.log(`${outHtml ? 'rendered' : 'wrote fb-tarot/docs/drafts/rewrites/PREVIEW.md'} — ${drafts.length} hook(s), ${failures} problem(s)`)
}
process.exit(failures ? 1 : 0)
