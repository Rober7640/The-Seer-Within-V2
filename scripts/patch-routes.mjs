// One-line production edit: extend the tarot validHooks with the six new landers.
// Deliberately NOT taking dev's whole routes.ts — that file carries dev-only work that must
// not travel to Production. See the deploy note in the commit message.
import { readFileSync, writeFileSync } from 'node:fs'
const f = 'server/routes.ts'
const raw = readFileSync(f, 'utf8')
const crlf = raw.includes('\r\n')
const t = raw.replace(/\r\n/g, '\n')
const anchor = '"cards-commit-or-company"]'
const n = t.split(anchor).length - 1
if (n !== 1) { console.error(`anchor matched ${n}x, expected 1`); process.exit(1) }
const six = ['cards-expecting-too-much', 'cards-played-the-wife', 'cards-instant-connection-commit', 'cards-connection-without-commitment', 'cards-connection-heading-commit', 'cards-stopping-him-committing']
const out = t.replace(anchor, '"cards-commit-or-company", ' + six.map((h) => `"${h}"`).join(', ') + ']')
writeFileSync(f, crlf ? out.replace(/\n/g, '\r\n') : out)
console.log('validHooks extended on Production routes.ts')
