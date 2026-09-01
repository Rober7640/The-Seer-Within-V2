// run-personas — the seven, through the API, with full transcripts.
//
//   npx tsx improve-v1/fb-read/evals/run-personas.mjs [--base http://localhost:5000]
//
// 7 personas × her best-fit hook × all 3 symbols = 21 readings.
//
// 🔴 GRADED BY THE SAME GUARDS PRODUCTION USES. It imports shared/readGuards, the
// module the live reflect path imports, so a persona that trips a guard here is a
// persona the server would have blocked and fallen back on. That is the point: it
// measures the funnel as shipped, not a copy of it.
//
// The transcripts are the deliverable. Read them.

import { PERSONAS } from './personas.mjs'
import { readReplyHarms } from '../../../shared/readGuards.ts'
import { DEVICES, HEADLINES, READ_QUESTION, openingBubble } from '../../../shared/readDevices.ts'

const argv = process.argv.slice(2)
const at = argv.indexOf('--base')
const base = at > -1 ? argv[at + 1] : 'http://localhost:5000'
const DEVICE = 'tea'

const wrap = (s, w = 84, pad = '           ') =>
  s.split(/\s+/).reduce((lines, word) => {
    const last = lines[lines.length - 1]
    if (!last || (last + ' ' + word).length > w) lines.push(word)
    else lines[lines.length - 1] = last + ' ' + word
    return lines
  }, []).join('\n' + pad)

const results = []
for (const p of PERSONAS) {
  for (const option of DEVICES[DEVICE].options) {
    const label = `${p.id} · ${DEVICES[DEVICE].optionLabel?.[option] ?? option}`
    console.log('\n' + '━'.repeat(90))
    console.log(`${p.label}  —  she taps ${DEVICES[DEVICE].optionLabel?.[option]}`)
    console.log('─'.repeat(90))
    console.log(`  AD       ${HEADLINES[p.hook]}`)
    console.log(`  EVELYN   ${wrap(openingBubble(DEVICE, p.hook, option))}`)
    console.log(`  EVELYN   ${wrap(READ_QUESTION[p.hook])}`)
    console.log(`\n  SHE      ${wrap(p.answer)}\n`)

    let messages = []
    let error = null
    try {
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'readReflect',
          readDevice: DEVICE,
          readHook: p.hook,
          readCard: option,
          input: p.answer,
        }),
      })
      const json = await res.json()
      messages = Array.isArray(json?.messages) ? json.messages : []
      if (!messages.length) error = `no messages (HTTP ${res.status})`
    } catch (e) {
      error = String(e?.message ?? e)
    }

    for (const m of messages) console.log(`  EVELYN   ${wrap(m)}`)

    // Did the reading contradict a fact she gave? The corpus is full of ages and
    // durations, and a reading that gets one wrong is one she can catch.
    const joined = messages.join(' ')
    const herNumbers = (p.answer.match(/\b(\d{1,2})\b/g) ?? []).map(Number).filter((n) => n > 1)
    const invented = (joined.match(/\b(\d{1,2})\s*(years?|months?)\b/gi) ?? []).filter(
      (m) => !herNumbers.includes(Number(m.match(/\d+/)[0])),
    )

    const harms = error ? [] : readReplyHarms({ device: DEVICE, hook: p.hook, option, answer: p.answer, messages })
    const notes = [...harms]
    if (invented.length) notes.push(`a number she never gave (${[...new Set(invented)].join(', ')})`)

    console.log(
      `\n           ${error ? '✗ ERROR  ' + error : notes.length ? '✗ ' + notes.join(' · ') : '✓ clean'}`,
    )
    results.push({ persona: p.id, label, hook: p.hook, option, notes, error, messages })
  }
}

console.log('\n' + '━'.repeat(90))
console.log('SUMMARY  —  7 personas × her hook × 3 symbols\n')
for (const r of results) {
  const mark = r.error ? '✗' : r.notes.length ? '✗' : '✓'
  console.log(`  ${mark} ${r.label.padEnd(34)} ${r.hook.padEnd(18)} ${r.error ?? r.notes.join(' · ')}`)
}
const bad = results.filter((r) => r.error || r.notes.length)
console.log(`\n  ${results.length - bad.length}/${results.length} clean\n`)
process.exit(bad.length ? 1 : 0)
