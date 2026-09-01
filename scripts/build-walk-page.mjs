// build-walk-page — one readable page from every /fb-read walk on disk.
//
//   npx tsx scripts/build-walk-page.mjs        → audit-runs/fb-read-walk/index.html
//
// 🔴 YOU DO NOT NORMALLY RUN THIS. `walk-read-funnel.mjs` calls it at the end of
// every walk, for the same reason `build-read-copy.mjs` calls `read-registry.mjs`:
// a page you have to remember to rebuild is a page that is quietly one run out of
// date, and reading last week's copy believing it is today's is worse than having
// no page at all.
//
// WHAT IT IS FOR. The transcripts are the record, but seven markdown files with 60
// bubbles each is not something anyone sits down and reads. This is the reading
// view: pick a woman, read her whole conversation, ad lander to the $35 close, both
// sides. Judging the COPY is the job the walk exists to serve — "7/7 reached the
// pitch" only proves the plumbing works.
//
// 🔴 REGISTRY-DRIVEN, so a new build needs no edit here. Hooks, ad questions,
// frames and symbol names all come from shared/readDevices.ts, and the personas
// from the eval's own list. Add a hook, a device or a persona and it appears.
// That is why this runs under tsx — it imports the real TypeScript registry
// rather than a copy that could disagree with it.
import { readdirSync, readFileSync, existsSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { DEVICES, HEADLINES, READ_HOOKS, READ_FRAME } from '../shared/readDevices.ts'
import { PERSONAS } from '../improve-v1/fb-read/evals/personas.mjs'

const WALKS = 'audit-runs/fb-read-walk'
const OUT = join(WALKS, 'index.html')

// 🔴 HAND-KEPT, AND DELIBERATELY SO. Everything else on this page is derived, but
// "the funnel serves this woman something it should not" is editorial judgement
// that no registry holds. A persona is also flagged automatically if its own note
// in personas.mjs opens with 🔴 — that is the cheaper way to mark a new one.
// A stale entry here costs a wrong label on a review page, not a broken funnel.
const OPEN_THREADS = {
  widowed: 'Bereavement, served by a heartbreak frame',
  'never-met-him': 'Money already sent, never met',
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── read every walk on disk ─────────────────────────────────────────────────

function readWalk(dir) {
  const full = join(WALKS, dir)
  if (!statSync(full).isDirectory()) return null
  const tPath = join(full, 'transcript.md')
  if (!existsSync(tPath)) return null

  const lines = readFileSync(tPath, 'utf8').split('\n')
  const turns = []
  for (const line of lines) {
    if (line.startsWith('- ')) turns.push({ who: 'evelyn', text: line.slice(2).trim() })
    else if (line.startsWith('**SHE TYPES ▸** ')) turns.push({ who: 'types', text: line.slice(16).trim() })
    else if (line.startsWith('**SHE TAPS ▸** ')) turns.push({ who: 'taps', text: line.slice(15).trim() })
  }
  if (!turns.length) return null

  // meta.json is the walker's machine-readable twin of the header. Walks recorded
  // before it existed are parsed from the folder name and the header instead, so
  // an old run still renders rather than vanishing from the page.
  const mPath = join(full, 'meta.json')
  let meta
  if (existsSync(mPath)) {
    meta = JSON.parse(readFileSync(mPath, 'utf8'))
  } else {
    const header = lines[2] || ''
    const parts = dir.split('-')
    const symbol = parts.pop()
    const known = PERSONAS.map((p) => p.id).sort((a, b) => b.length - a.length)
    const personaId = known.find((id) => dir.startsWith(id + '-')) || parts.join('-')
    const mid = dir.slice(personaId.length + 1, dir.length - symbol.length - 1)
    meta = {
      personaId, symbol, device: mid || 'tea',
      reachedPitch: /Reached pitch: \*\*yes\*\*/.test(header),
      typed: Number((header.match(/turns typed: (\d+)/) || [])[1] || 0),
    }
  }

  const persona = PERSONAS.find((p) => p.id === meta.personaId)
  if (!persona) return null
  return {
    dir, ...meta, persona,
    hook: meta.hook || persona.hook,
    turns,
    bubbles: turns.filter((t) => t.who === 'evelyn').length,
  }
}

const walks = readdirSync(WALKS)
  .map((d) => { try { return readWalk(d) } catch { return null } })
  .filter(Boolean)
  // Group by hook in registry order, so the three questions read together.
  .sort((a, b) => (READ_HOOKS.indexOf(a.hook) - READ_HOOKS.indexOf(b.hook))
    || a.device.localeCompare(b.device) || a.symbol.localeCompare(b.symbol))

if (!walks.length) {
  console.error(`🔴 no walks found in ${WALKS}/ — run scripts/walk-read-funnel.mjs first`)
  process.exit(2)
}

const symbolName = (device, sym) => {
  const d = DEVICES[device]
  if (!d) return sym
  return d.optionLabel?.[sym]?.toLowerCase() ?? d.reading?.[sym] ?? sym
}
const flagOf = (w) => OPEN_THREADS[w.personaId] || (w.persona.note.startsWith('🔴') ? 'Boundary case' : null)
const cleanNote = (n) => n.replace(/^🔴\s*/, '')

const totalBubbles = walks.reduce((n, w) => n + w.bubbles, 0)
const reached = walks.filter((w) => w.reachedPitch).length
const typedSet = [...new Set(walks.map((w) => w.typed))]

// ── rail ────────────────────────────────────────────────────────────────────
let lastHook = null
const rail = walks.map((w, i) => {
  let head = ''
  if (w.hook !== lastHook) {
    lastHook = w.hook
    head = `<li class="rail-head"><span class="hook-q">${esc(HEADLINES[w.hook] ?? w.hook)}</span><span class="hook-frame">${esc(READ_FRAME[w.hook]?.line ?? '')}</span></li>`
  }
  const flag = flagOf(w)
  return head + `<li><button class="rail-btn${i === 0 ? ' is-on' : ''}" data-i="${i}" type="button">
    <span class="rail-name">${esc(w.persona.label)}</span>
    <span class="rail-meta">${esc(w.device)} · ${esc(symbolName(w.device, w.symbol))} · ${w.bubbles} bubbles</span>
    ${flag ? `<span class="rail-flag">${esc(flag)}</span>` : ''}
  </button></li>`
}).join('\n')

// ── panels ──────────────────────────────────────────────────────────────────
const panels = walks.map((w, i) => {
  const body = w.turns.map((t) => {
    if (t.who === 'evelyn') {
      // The one line that turns a reading into a sale. Marked so the eye can find
      // where the copy stops comforting her and starts charging her.
      const isClose = /sacred offering is \$\d/.test(t.text)
      return `<p class="b evelyn${isClose ? ' is-close' : ''}">${esc(t.text)}</p>`
    }
    if (t.who === 'taps') return `<p class="b taps"><span class="lbl">taps</span>${esc(t.text)}</p>`
    return `<p class="b types">${esc(t.text)}</p>`
  }).join('\n')
  const flag = flagOf(w)

  return `<section class="panel" data-i="${i}" ${i === 0 ? '' : 'hidden'}>
    <header class="phead">
      <p class="eyebrow">${esc(HEADLINES[w.hook] ?? w.hook)} &nbsp;·&nbsp; ${esc(w.device)} &nbsp;·&nbsp; she taps ${esc(symbolName(w.device, w.symbol))}</p>
      <h2>${esc(w.persona.label)}</h2>
      <p class="note">${esc(cleanNote(w.persona.note))}</p>
      ${flag ? `<p class="flag">${esc(flag)}</p>` : ''}
      <dl class="stats">
        <div><dt>Reached the close</dt><dd>${w.reachedPitch ? 'yes' : 'no'}</dd></div>
        <div><dt>She typed</dt><dd>${w.typed} times</dd></div>
        <div><dt>Evelyn said</dt><dd>${w.bubbles} bubbles</dd></div>
      </dl>
    </header>
    <div class="convo">${body}</div>
  </section>`
}).join('\n')

const html = `<title>The Tea Cup Walks</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap">
<style>
:root{
  --ground:#F1F4F3; --panel:#FFFFFF; --ink:#151A19; --ink-2:#4A5654; --ink-3:#798583;
  --line:#DDE3E1; --line-2:#EAEEEC;
  --evelyn-bg:#FBF7F0; --evelyn-line:#EBE2D2; --evelyn-ink:#1E2422;
  --her-bg:#1E3A38; --her-ink:#E4EDEA;
  --brass:#A8792C; --rust:#9E4B34; --rust-bg:#F7EDEA;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --ground:#101413; --panel:#161B1A; --ink:#E7ECEA; --ink-2:#A3AFAC; --ink-3:#77837F;
    --line:#293230; --line-2:#1F2726;
    --evelyn-bg:#1D211E; --evelyn-line:#333A32; --evelyn-ink:#EDE6D8;
    --her-bg:#2C4E4A; --her-ink:#E8F1EE;
    --brass:#D4A64F; --rust:#D08163; --rust-bg:#2A1F1C;
  }
}
:root[data-theme="dark"]{
  --ground:#101413; --panel:#161B1A; --ink:#E7ECEA; --ink-2:#A3AFAC; --ink-3:#77837F;
  --line:#293230; --line-2:#1F2726;
  --evelyn-bg:#1D211E; --evelyn-line:#333A32; --evelyn-ink:#EDE6D8;
  --her-bg:#2C4E4A; --her-ink:#E8F1EE;
  --brass:#D4A64F; --rust:#D08163; --rust-bg:#2A1F1C;
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--ground); color:var(--ink);
  font-family:"IBM Plex Sans",system-ui,-apple-system,sans-serif;
  font-size:16px; line-height:1.55; -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px 96px}
.mast{padding:48px 0 28px;border-bottom:1px solid var(--line)}
.kicker{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--brass);margin:0 0 14px}
.mast h1{font-family:Newsreader,Georgia,serif;font-weight:300;font-size:clamp(32px,5vw,52px);line-height:1.08;letter-spacing:-.015em;margin:0 0 14px;text-wrap:balance;max-width:16ch}
.dek{margin:0;max-width:62ch;color:var(--ink-2);font-size:16.5px}
.runbar{display:flex;flex-wrap:wrap;gap:8px 28px;margin:24px 0 0;padding:0;list-style:none;font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12.5px;color:var(--ink-2)}
.runbar b{color:var(--ink);font-weight:500;font-variant-numeric:tabular-nums}
.cols{display:grid;grid-template-columns:280px minmax(0,1fr);gap:44px;margin-top:36px;align-items:start}
@media (max-width:900px){.cols{grid-template-columns:1fr;gap:24px}}
.rail{position:sticky;top:24px}
@media (max-width:900px){.rail{position:static}}
.rail ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.rail-head{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);margin:22px 0 6px;display:flex;flex-direction:column;gap:3px;padding:0 10px}
.rail-head:first-child{margin-top:0}
.hook-q{color:var(--brass)}
.hook-frame{text-transform:none;letter-spacing:0;font-size:11px;color:var(--ink-3)}
.rail-btn{width:100%;text-align:left;background:none;border:1px solid transparent;border-radius:3px;padding:9px 10px;cursor:pointer;color:inherit;font:inherit;display:flex;flex-direction:column;gap:3px;transition:background .12s,border-color .12s}
.rail-btn:hover{background:var(--line-2)}
.rail-btn:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
.rail-btn.is-on{background:var(--panel);border-color:var(--line);box-shadow:inset 2px 0 0 var(--brass)}
.rail-name{font-size:14.5px;font-weight:500}
.rail-meta{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;color:var(--ink-3);font-variant-numeric:tabular-nums}
.rail-flag{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10.5px;color:var(--rust);letter-spacing:.02em;margin-top:2px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:4px;overflow:hidden}
.phead{padding:30px 34px 26px;border-bottom:1px solid var(--line-2)}
@media (max-width:600px){.phead{padding:22px 20px 20px}}
.eyebrow{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--brass);margin:0 0 10px}
.phead h2{font-family:Newsreader,Georgia,serif;font-weight:400;font-size:29px;line-height:1.15;margin:0 0 12px;letter-spacing:-.01em;text-wrap:balance}
.note{margin:0;max-width:64ch;color:var(--ink-2);font-size:15px}
.flag{margin:14px 0 0;padding:9px 13px;background:var(--rust-bg);border-left:2px solid var(--rust);color:var(--rust);font-size:13.5px;border-radius:0 3px 3px 0;max-width:64ch}
.stats{display:flex;flex-wrap:wrap;gap:26px;margin:20px 0 0}
.stats div{display:flex;flex-direction:column;gap:2px}
.stats dt{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}
.stats dd{margin:0;font-size:15px;font-variant-numeric:tabular-nums}
.convo{padding:30px 34px 40px;display:flex;flex-direction:column;gap:9px}
@media (max-width:600px){.convo{padding:22px 20px 30px}}
.b{margin:0;max-width:62ch;border-radius:4px}
.evelyn{font-family:Newsreader,Georgia,serif;font-size:18px;line-height:1.5;background:var(--evelyn-bg);border:1px solid var(--evelyn-line);color:var(--evelyn-ink);padding:12px 17px;align-self:flex-start}
.evelyn.is-close{border-color:var(--brass);box-shadow:0 0 0 1px var(--brass)}
.types,.taps{align-self:flex-end;background:var(--her-bg);color:var(--her-ink);padding:12px 17px;font-size:15px;line-height:1.5;margin:14px 0}
.taps{display:flex;align-items:baseline;gap:9px}
.lbl{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;opacity:.7}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>

<div class="wrap">
  <header class="mast">
    <p class="kicker">/fb-read · sandbox walk · ${new Date().toISOString().slice(0, 10)}</p>
    <h1>The Tea Cup Walks</h1>
    <p class="dek">Personas built from real answers, each taken through the whole funnel — from the ad lander to the close. Evelyn speaks in the serif. Their replies are the plain ones on the right. Nothing was bought; the walk stops at the button.</p>
    <ul class="runbar">
      <li><b>${reached} / ${walks.length}</b> reached the close</li>
      <li><b>${typedSet.length === 1 ? typedSet[0] : typedSet.join('/')}</b> turns typed each</li>
      <li><b>${totalBubbles}</b> bubbles read</li>
      <li><b>0</b> Meta events fired</li>
    </ul>
  </header>
  <div class="cols">
    <nav class="rail" aria-label="Personas"><ul>${rail}</ul></nav>
    <main>${panels}</main>
  </div>
</div>

<script>
const btns=[...document.querySelectorAll('.rail-btn')],panels=[...document.querySelectorAll('.panel')];
btns.forEach(b=>b.addEventListener('click',()=>{
  const i=b.dataset.i;
  btns.forEach(x=>x.classList.toggle('is-on',x===b));
  panels.forEach(p=>{const on=p.dataset.i===i;p.hidden=!on});
  window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
}));
</script>`

writeFileSync(OUT, html)
console.log(`  → ${OUT}  (${walks.length} walks, ${totalBubbles} bubbles)`)
