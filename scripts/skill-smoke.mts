#!/usr/bin/env npx tsx
// skill-smoke — did an /fb-tarot-hooks run actually DO each stage, or just produce copy?
//
//   npx tsx scripts/skill-smoke.mts --family soulmate-keyword cards-energy-away cards-heal-first
//   npx tsx scripts/skill-smoke.mts --family soulmate-ageband --all-in-guard
//
// WHY THIS EXISTS. The skill is a process, not a function, so nothing was checking that it
// RAN — only that the copy it produced obeyed the bans. Those are different questions, and
// the gap is not theoretical: on 2026-08-20 all eight test-B landers passed readability,
// collisions, the registry gate, their own guard file and 12/12 tripwire cases while NO VOC
// PULL HAD EVER RUN behind them. Every gate was green. The one stage that decides who the ad
// actually reaches had been skipped, and the only record of that was a sentence I happened to
// type into a note by hand.
//
// So this checks the ARTIFACTS each stage is supposed to leave on disk. If stage 1 ran, there
// is a voc record. If stage 4 ran, there is a guard file and tripwire rows. If stage 7 ran,
// the three rosters agree. Green here means the run was complete; it says nothing about
// whether the copy is any good, which is what the guards and the human review gate are for.
import { readFileSync, existsSync, readdirSync } from 'node:fs'

const DIR = 'fb-tarot/docs/drafts/rewrites/'
const argv = process.argv.slice(2)
const arg = (n: string) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
const family = arg('--family')
let hooks = argv.filter((a) => !a.startsWith('--') && a !== family)

if (!family) { console.error('usage: skill-smoke.mts --family <name> <hook…> | --all-in-guard'); process.exit(2) }
const GUARD = `tests/tarot-${family}-copy.test.ts`

// Pull the roster out of the guard file when asked — the guard is the family's record.
if (argv.includes('--all-in-guard')) {
  if (!existsSync(GUARD)) { console.error(`no guard file at ${GUARD}`); process.exit(2) }
  // 🔴 BETWEEN THE MARKERS ONLY. A guard file names plenty of hooks that are not its own —
  // the keyword guard lists four MONEY landers as collision twins, and grabbing every
  // 'cards-…' string in the file pulled those in and reported 17 phantom failures against
  // landers that belong to another family entirely.
  const src = readFileSync(GUARD, 'utf8')
  const roster = src.match(/@roster-start([\s\S]*?)@roster-end/)
  if (!roster) { console.error(`${GUARD} has no @roster-start/@roster-end markers`); process.exit(2) }
  hooks = [...new Set((roster[1].match(/'(cards-[a-z0-9-]+)'/g) ?? []).map((x) => x.slice(1, -1)))]
}
if (!hooks.length) { console.error('no hooks given'); process.exit(2) }

type Row = { level: 'FAIL' | 'WARN' | 'ok'; stage: string; msg: string }
const rows: Record<string, Row[]> = {}
const add = (h: string, level: Row['level'], stage: string, msg: string) => (rows[h] ??= []).push({ level, stage, msg })

const client = readFileSync('client/src/content/tarotReads.ts', 'utf8')
const prompts = readFileSync('server/lib/prompts.ts', 'utf8')
const routes = readFileSync('server/routes.ts', 'utf8')
const tripwire = existsSync('scripts/guard-tripwire.mjs') ? readFileSync('scripts/guard-tripwire.mjs', 'utf8') : ''
const specs = readdirSync('tests').filter((f) => f.endsWith('.spec.ts'))
  .map((f) => readFileSync(`tests/${f}`, 'utf8')).join('\n')
const guardSrc = existsSync(GUARD) ? readFileSync(GUARD, 'utf8') : ''

for (const hook of hooks) {
  const path = `${DIR}${hook}.json`
  if (!existsSync(path)) { add(hook, 'FAIL', '2 draft', 'no draft json'); continue }
  const d = JSON.parse(readFileSync(path, 'utf8'))

  // ── stage 1 · did the VOC pull happen, and is the evidence recorded? ───────────────────
  const v = d.voc
  if (!v) {
    add(hook, 'FAIL', '1 VOC', 'no voc record — cannot tell whether the pull ran at all')
  } else if (v.verdict === 'none') {
    add(hook, 'FAIL', '1 VOC', `NO PULL RAN — ${v.why?.slice(0, 90) ?? 'no reason given'}`)
  } else if (v.verdict === 'thin') {
    add(hook, 'WARN', '1 VOC', `thin: ${v.matched ?? '?'} matched / ${v.buyers ?? '?'} buyers (${v.pattern})`)
  } else if (v.verdict === 'unrecorded') {
    add(hook, 'WARN', '1 VOC', `pull ran (${v.pattern}) but the counts were never written down`)
  } else if (typeof v.buyers === 'number' && v.buyers < 5) {
    add(hook, 'FAIL', '1 VOC', `${v.buyers} buyers but verdict is "ok" — mark it thin`)
  } else {
    add(hook, 'ok', '1 VOC', `${v.matched ?? '?'} matched / ${v.buyers ?? '?'} buyers (${v.pattern}, ${v.pulled})`)
  }
  if (v && v.verdict !== 'ok' && !v.why) add(hook, 'FAIL', '1 VOC', `verdict "${v.verdict}" with no reason recorded`)

  // ── stage 2 · seven cuts, three cards ──────────────────────────────────────────────────
  const deck = d.decks?.['return-mhf']
  if (!deck) add(hook, 'FAIL', '2 draft', 'no return-mhf deck')
  else {
    for (const c of ['a', 'b', 'c']) {
      const b = deck[c]
      if (!Array.isArray(b) || b.length !== 7) { add(hook, 'FAIL', '2 draft', `${c}: ${b?.length ?? 0} bubbles, need 7`); continue }
      const opens: [number, RegExp, string][] = [[0, /^You turned /, 'cut 1 picture'], [1, /^You asked /, 'cut 2 bridge'],
        [2, /^So /, 'cut 3 answer'], [3, /^And /, 'cut 4 hidden'], [4, /^But /, 'cut 5 turn'],
        [5, /^That's why /, 'cut 6 recognition'], [6, /…$/, 'cut 7 open loop']]
      for (const [i, re, what] of opens) if (!re.test(b[i])) add(hook, 'FAIL', '2 draft', `${c} ${what} does not follow the chain`)
    }
    if (Object.keys(rows[hook] ?? {}).length && !rows[hook].some((r) => r.stage === '2 draft')) { /* noop */ }
    if (!rows[hook]?.some((r) => r.stage === '2 draft' && r.level === 'FAIL')) add(hook, 'ok', '2 draft', '3 cards x 7 cuts, chain intact')
  }

  // ── stage 4 · guard file and tripwire ──────────────────────────────────────────────────
  if (!guardSrc) add(hook, 'FAIL', '4 guard', `no guard file at ${GUARD}`)
  else if (!guardSrc.includes(`'${hook}'`)) add(hook, 'FAIL', '4 guard', `guard file does not name this hook`)
  else add(hook, 'ok', '4 guard', GUARD.replace('tests/', ''))

  // ── stage 7 · the three rosters, all or nothing ────────────────────────────────────────
  const inClient = new RegExp(`^ {4}'${hook}': \\{`, 'm').test(client)
  const inRoster = client.includes(`  '${hook}',`)
  const inHeadlines = new RegExp(`'${hook}': ['"]`).test(client)
  const inContext = (prompts.match(new RegExp(`'${hook}':`, 'g')) ?? []).length >= 2
  const inRoutes = routes.includes(`"${hook}"`)
  const wiredBits = [['reads', inClient], ['roster', inRoster], ['headline', inHeadlines],
    ['prompts', inContext], ['route validator', inRoutes]] as const
  const on = wiredBits.filter(([, b]) => b).map(([n]) => n)
  const off = wiredBits.filter(([, b]) => !b).map(([n]) => n)
  if (on.length === 0) add(hook, 'WARN', '7 wire', 'not wired (draft only)')
  else if (off.length) add(hook, 'FAIL', '7 wire', `HALF-WIRED — missing: ${off.join(', ')} (the chat handoff 400s)`)
  else {
    add(hook, 'ok', '7 wire', 'client + server + route validator in sync')
    // A wired hook must be in exactly one frame set, or it inherits decode-him silently.
    const frames = [...prompts.matchAll(/const ([A-Z_]+_TAROT_HOOKS) = new Set\(\[([\s\S]*?)\]\)/g)]
      .filter(([, , body]) => body.includes(`'${hook}'`)).map(([, n]) => n)
    if (frames.length > 1) add(hook, 'FAIL', '7 wire', `in ${frames.length} frame sets: ${frames.join(', ')}`)
    else add(hook, 'ok', '7 wire', frames.length ? `frame: ${frames[0]}` : 'frame: decode-him (default)')
    if (!specs.includes(hook)) add(hook, 'FAIL', '5 smoke', 'no playwright spec covers this lander')
    else add(hook, 'ok', '5 smoke', 'covered by a playwright spec')
  }
}

// Family-level: the tripwire must have rows, or the guard's green tick is unproven.
const famRows = new RegExp(`'${family}': \\[`).test(tripwire)

const W = Math.max(...hooks.map((h) => h.length))
let fails = 0, warns = 0
for (const hook of hooks) {
  console.log(`\n${hook}`)
  for (const r of rows[hook] ?? []) {
    if (r.level === 'FAIL') fails++
    if (r.level === 'WARN') warns++
    const icon = r.level === 'FAIL' ? '🔴' : r.level === 'WARN' ? '⚠ ' : '✓ '
    console.log(`  ${icon} ${r.stage.padEnd(9)} ${r.msg}`)
  }
}
console.log(`\n${famRows ? '✓ ' : '🔴'} tripwire   ${famRows ? `catalogue has rows for "${family}"` : `NO tripwire rows for "${family}" — the guard's green tick is unproven`}`)
if (!famRows) fails++

console.log(`\n${'─'.repeat(64)}`)
console.log(`${hooks.length} lander(s) · ${fails} failure(s) · ${warns} warning(s)`)
if (fails) {
  console.log('\n🔴 This skill run is INCOMPLETE. Green copy gates do not cover the stages above.')
  process.exit(1)
}
console.log(warns ? '\n⚠ Complete, with evidence gaps recorded above.' : '\n✓ Every stage left the artifact it was supposed to.')
