// walk-read-all — walk EVERY persona, then hand back one page to read.
//
//   PORT=5056 DOTENV_CONFIG_PATH=.env.sandbox NODE_ENV=development npx tsx server/index.ts
//   LOCAL_BASE_URL=http://localhost:5056 node scripts/walk-read-all.mjs [device]
//
// 🔴 SANDBOX ONLY. This drives real /api/chat turns and writes real conversation
// rows — walk-read-funnel.mjs carries the full warning and the three layers. This
// only sequences it, so every guard there still applies here.
//
// WHY A SCRIPT AND NOT A SHELL LOOP. The obvious `for p in "widowed b" ...` does
// not word-split in zsh, so every walk is handed "widowed b" as one persona id and
// the whole run fails instantly while printing exit=0 — the loop tails a pipe, so
// it reports tail's status, not node's. That happened. This runs them one at a
// time, reports the REAL exit code, and keeps going after a failure so one bad
// walk does not cost you the other six.
//
// Each walk rebuilds audit-runs/fb-read-walk/index.html on its own, so the page is
// current even if this is interrupted half way.
import { spawnSync } from 'node:child_process'
import { PERSONAS } from '../improve-v1/fb-read/evals/personas.mjs'

const device = process.argv[2] || 'tea'

// Rotate the symbol across personas rather than walking all three per persona:
// 7 personas × 3 symbols is 21 live walks and roughly two hours. The join that
// actually breaks in a bridge funnel is lander-tap → close, and rotating covers
// every symbol at least twice while keeping the run to about 40 minutes.
const SYMBOLS = ['a', 'b', 'c']

const results = []
for (const [i, p] of PERSONAS.entries()) {
  const symbol = SYMBOLS[i % SYMBOLS.length]
  console.log(`\n──────── ${p.id} · ${device} · ${symbol}  (${i + 1}/${PERSONAS.length}) ────────`)
  const r = spawnSync('node', ['scripts/walk-read-funnel.mjs', p.id, symbol, device], { stdio: 'inherit' })
  results.push({ id: p.id, symbol, ok: r.status === 0 })
}

const ok = results.filter((r) => r.ok).length
console.log(`\n════════ ${ok}/${results.length} reached the close ════════`)
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.id} · ${r.symbol}`)
console.log(`\n  read it:  open audit-runs/fb-read-walk/index.html\n`)
process.exit(ok === results.length ? 0 : 1)
