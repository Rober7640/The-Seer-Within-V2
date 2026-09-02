// audit-read-copy — can she READ the /fb-read landers?
//
//   npx tsx .claude/skills/v1-funnel-audit/scripts/audit-read-copy.mjs
//   npx tsx .claude/skills/v1-funnel-audit/scripts/audit-read-copy.mjs --device coffee --strict
//
// The /fb-read sibling of audit-copy.mjs, which imports tarotReads.ts and so has
// never been able to see this funnel at all. Same rule set, imported from the same
// scripts/check-read.mjs, so the writer's gate and the audit's gate cannot drift.
//
// 🔴 IT SCORES openerB, NOT THE RAW DRAFTS. The same reason audit-copy does: what
// she reads is composed at render time, and grading the registry strings would grade
// a line that never ships. On /fb-read the difference is smaller than tarot's — the
// bubbles are stored whole — but the rule is the rule, and the moment a picture line
// gets spliced in this stays correct for free.
//
// 🔴 NOT A GATE BY DEFAULT. audit-copy shipped as a report because the whole tarot
// deck predated its rules. This funnel is newer, so the numbers are better, but the
// same principle applies: --strict is opt-in, --device gates one device's landers.

import { checkBubble, checkEcho, RULES } from '../../../../scripts/check-read.mjs'
import { DEVICES, DEVICE_IDS, READ_HOOKS, HEADLINES } from '../../../../shared/readDevices.ts'
import { isReadWritten } from '../../../../shared/readCopy.ts'
import { openerB } from '../../../../client/src/content/readReads.ts'

const argv = process.argv.slice(2)
const at = (f) => { const i = argv.indexOf(f); return i > -1 ? argv[i + 1] : null }
const onlyDevice = at('--device')
const onlyHook = at('--hook')
const strict = argv.includes('--strict')

if (onlyDevice && !DEVICE_IDS.includes(onlyDevice)) {
  console.error(`unknown device "${onlyDevice}". known: ${DEVICE_IDS.join(', ')}`)
  process.exit(2)
}

const devices = onlyDevice ? [onlyDevice] : DEVICE_IDS
const hooks = onlyHook ? [onlyHook] : READ_HOOKS

let landers = 0
let clean = 0
const problems = []

for (const device of devices) {
  for (const hook of hooks) {
    for (const option of DEVICES[device].options) {
      if (!isReadWritten(device, hook, option)) continue
      landers++
      const headline = HEADLINES[hook]
      const bubbles = openerB(device, hook, option)
      const issues = []

      // 🔴 BOTH OF THESE RETURN ARRAYS OF STRINGS. The first version of this script
      // spread each one into an object and printed `undefined undefined` for every
      // real problem, and tested `if (echo)` — where [] is truthy, so it flagged an
      // echo failure on every lander including the clean ones. It reported 0/9 and
      // the number was meaningless. Check the harness before believing it.
      bubbles.forEach((b, i) => {
        for (const detail of checkBubble(b, i, headline)) issues.push({ bubble: i + 1, detail })
      })
      // She clicked a question. Bubbles 1-2 have to say it back, or she has been
      // answered for something she was never asked.
      for (const detail of checkEcho(bubbles, headline)) issues.push({ bubble: '1-2', detail })

      const id = `${hook} · ${device} · ${option}`
      if (issues.length === 0) { clean++; console.log(`  ✓ ${id}`) }
      else {
        console.log(`  ✗ ${id}  — ${issues.length} problem${issues.length === 1 ? '' : 's'}`)
        for (const p of issues) console.log(`      bubble ${p.bubble}: ${p.detail}`)
        problems.push({ id, issues })
      }
    }
  }
}

console.log(`\n  ${clean}/${landers} landers clean` + (onlyDevice ? `  (device: ${onlyDevice})` : ''))
console.log(`  rules: ${RULES.MAX_WORDS} words · ${RULES.MAX_SENTENCES} sentences · ` +
            `${RULES.MAX_SYLLABLES} syllables · ${RULES.MAX_NEGATIVES} negatives per sentence`)
console.log(`\n  A floor, not a bar. Read it aloud.\n`)

if (strict && problems.length) process.exit(1)
