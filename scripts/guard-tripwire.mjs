#!/usr/bin/env node
// guard-tripwire — prove a guard file actually BITES before trusting its green tick.
//
//   node scripts/guard-tripwire.mjs soulmate-ageband
//   node scripts/guard-tripwire.mjs soulmate-ageband --case DURATION
//
// WHY THIS EXISTS. `scripts/wire-drafts-setup.mts` can only patch a hook the registry
// already has (`if (!reads?.[d.hook]) continue`), so for a family that is NOT YET WIRED
// every deck-level guard silently skips and the run still prints a tick. Three money drafts
// passed both gates for a day while being checked by neither. A gate that silently passes is
// worse than no gate, so the rule is: before you trust a new family's guard, feed it a
// deliberate violation and watch it fail.
//
// HOW IT WORKS. For each case it writes the violating line into the REAL draft JSON, runs
// the family's vitest file, records whether it failed, and restores the file byte-for-byte
// from the string it read first. Never `git checkout` — that would also discard unrelated
// edits in the working tree.
//
// 🔴 RESTORE IS UNCONDITIONAL. If vitest throws, is killed, or the process is interrupted,
// the original content is still written back — an aborted run must never leave a poisoned
// draft on disk. That is what the try/finally and the signal handlers below are for.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const REGISTRY = 'client/src/content/tarotReads.ts'
import { execSync } from 'node:child_process'

const DIR = 'fb-tarot/docs/drafts/rewrites/'
const argv = process.argv.slice(2)
const family = argv.find((a) => !a.startsWith('--'))
const only = argv.includes('--case') ? argv[argv.indexOf('--case') + 1] : null
if (!family) {
  console.error('usage: guard-tripwire.mjs <family> [--case LABEL]')
  console.error('  e.g. guard-tripwire.mjs soulmate-ageband')
  process.exit(2)
}
const TEST = `tests/tarot-${family}-copy.test.ts`
if (!existsSync(TEST)) { console.error(`no guard file at ${TEST}`); process.exit(2) }

// The violation catalogue. Each entry is [label, hook, card, bubbleIndex, text, whichBan].
// Bubble 4 (index 4) is the "But…" turn — a middle bubble, so it lands inside beat 3 where
// every clause-level ban sweeps. Add a row whenever a family invents a new ban.
//
// ⚠ KEEP EACH VIOLATION MINIMAL — trip ONE pattern, not several. Found while meta-testing this
// script (2026-08-19): the FATE case read "But this was meant to be, dear. The universe has a
// plan for you." That trips /meant to be/ AND /the universe (has|is|wants)/, so neutering the
// first pattern still showed "guard BIT" — the second was silently carrying the case. A case
// that trips N patterns only proves that AT LEAST ONE of them works, and it will keep passing
// while the others rot. Where a ban has several distinct patterns worth pinning, give it several
// rows (see DURATION / DURATION-2) rather than one sentence that trips them all.
const CATALOGUE = {
  'soulmate-ageband': [
    ['DURATION',   'cards-keeps-waiting',  'a', 4, 'But he is not far off, dear. A few months at most.', 'ban 1 — no duration'],
    ['DURATION-2', 'cards-longer-to-wait', 'b', 4, 'But it will not be long now, dear. He is nearly there.', 'ban 1 — negator-carrying duration'],
    ['BLAME',      'cards-choosing-wrong', 'c', 4, 'But you keep choosing the same man, dear.', 'ban 2 — no self-blame'],
    // ⚠ SPLIT OUT of BLAME on 2026-08-20. The case above used to carry "You are not ready yet"
    // as a second sentence, which meant it proved only that ONE of the two patterns worked —
    // exactly the masking this file's header warns about. The sibling keyword guard turned out
    // to have a real hole at precisely this pattern (its blanket negator exemption saw the
    // "not" and waved the clause through); this family escapes it only because its blame sweep
    // uses the narrow DECLINE exemption. Pinned separately so that stays true.
    ['NOTREADY',   'cards-found-me-yet',   'a', 4, 'But you are not ready yet, dear.', 'ban 2 — the negator-carrying blame'],
    ['MEDIUMSHIP', 'cards-slipping-past',  'b', 4, 'But he is at peace, dear. He would want you to be happy.', 'ban 3 — no mediumship'],
    ['HEALTH',     'cards-too-late-love',  'c', 4, 'But your health is the real block, dear. A baby is off the table.', 'ban 4 — no health/fertility'],
    ['AGE',        'cards-too-late-love',  'a', 4, 'But at your age it is harder, dear. You are 70 years old.', 'ban 5 — no age/number'],
    ['PRESUMES',   'cards-after-marriage', 'a', 4, 'But since your divorce you have hidden, dear. The day he left broke you.', 'ban 6 — no presumption'],
    ['PLACE',      'cards-second-time',    'b', 4, 'But he is already in your circle, dear. Someone you already know.', 'ban 7 — no place'],
    ['STRATEGY',   'cards-found-me-yet',   'c', 4, 'But you should try the apps, dear. Put yourself out there.', 'ban 7 — no strategy'],
    ['FATE',       'cards-slipping-past',  'c', 4, 'But this was meant to be, dear. The universe has a plan for you.', 'ban 7 — no fate'],
    ['VERDICT',    'cards-choosing-wrong', 'a', 4, 'But he is the one, dear. He loves you and he always has.', 'ban 7 — no verdict on a real man'],
    // ── added with the 45-54/55-64/65+ third rungs, 2026-08-19 ────────────────────────────
    // 🔴 The her-as-subject rule. This is the ONLY ban in the family that sweeps with no
    // negator exemption at all, because "he isn't falling" was one of the original defects —
    // a negator does not make the figure less of an actor.
    ['ACTOR',      'cards-keeps-waiting',  'c', 4, 'But he is walking, dear. The road is under him.', 'her-as-subject — figure en route'],
    ['ACTOR-2',    'cards-found-me-yet',   'b', 4, 'But he cannot reach you, dear. That is all it is.', 'her-as-subject — figure blocked'],
    ['REVIVE',     'cards-missed-chance',  'a', 4, 'But he is still there, dear. The one that got away.', 'missed-chance — revives a remembered man'],
    ['MISSED',     'cards-missed-chance',  'b', 4, 'But you missed him, dear. That is the plain reading.', 'missed-chance — the banned half of the binary'],
    ['LEAVE',      'cards-best-years',     'c', 4, 'But you should walk away, dear. Time to go.', 'best-years — tells her to leave'],
    ['LESSON',     'cards-best-years',     'a', 4, 'But it happened for a reason, dear. That was the lesson.', 'best-years — makes the suffering purposeful'],
    ['PREDICT',    'cards-allowed-to-want','b', 4, 'But you will meet someone, dear. That much I can see.', 'allowed-to-want — answers with a prediction'],
    ['LOOKS',      'cards-allowed-to-want','a', 4, 'But you are beautiful still, dear. Anyone would say so.', 'allowed-to-want — her looks'],
    ['GENDER',     'cards-allowed-to-want','c', 4, 'But a man is out there, dear. Waiting on you.', 'allowed-to-want — genders the soulmate'],
  ],
  // Test B — soulmate x keyword (2026-08-20). Bubble 4 is cut 5 (inside beat 3); bubble 6 is
  // cut 7, which is where this family's obstruction rule lives.
  'soulmate-keyword': [
    ['BLAME',      'cards-energy-away',        'a', 4, 'But your energy is keeping him away, dear. It always was.', 'blames her energy'],
    ['HEALGATE',   'cards-heal-first',         'a', 4, 'But you have to heal first, dear. That is the order of it.', 'gates love on her healing'],
    ['NOTREADY',   'cards-waiting-to-heal',    'b', 4, 'But you are not ready yet, dear. That is the plain of it.', 'rules she is not ready'],
    ['COACHING',   'cards-blocking-soulmate',  'c', 4, 'But it comes when you stop looking, dear. It always does.', 'the kindest-sounding tactic'],
    ['PRACTICE',   'cards-energy-soulmate',    'b', 4, 'But raise your energy first, dear. Then see.', 'an energy practice'],
    ['THERAPY',    'cards-waiting-to-heal',    'c', 4, 'But your attachment style is the shape of it, dear.', 'therapy or diagnosis language'],
    ['FEELING',    'cards-connection-nothing', 'a', 4, 'But a feeling that strong is your answer, dear.', 'her feeling as the proof'],
    ['CERTIFY',    'cards-connection-soulmate','b', 4, 'But you have been right all along, dear.', 'the psychic ruling on her'],
    ['MONEYCLONE', 'cards-energy-away',        'a', 4, 'But yours has been pouring out at full strength for years, dear.', 'reuses the money lander sentences'],
    ['WHO',        'cards-heal-first',         'c', 6, 'Let me look closer at who put that mark where it is…', 'cut 7 asks WHO'],
    ['GENERIC',    'cards-blocked-before',     'b', 6, 'Let me look closer at what is in your way…', 'cut 7 could be pasted anywhere'],
    ['ACTOR',      'cards-blocking-soulmate',  'a', 4, 'But he is walking, dear. The road is under him.', 'her-as-subject — figure en route'],
    // ⚠ NO ROW FOR THE FRAME SPLIT. That test reads server/lib/prompts.ts, not the copy, so no
    // bubble can trip it — it is pinned by the Set membership assertions instead. Same reason
    // there is no row for the density test on the age-band family.
    // ⚠ NO ROW FOR THE DENSITY TEST, on purpose. It asserts he/him/his per beat across all 33
    // cards; one poisoned bubble cannot move a 99-beat average past the 0.41 threshold, so a
    // tripwire row for it would report "guard did NOT bite" and be misread as a broken guard.
    // It is a trend guard, not a clause guard, and the ACTOR rows cover the shape it protects.
  ],
}
const cases = (CATALOGUE[family] ?? []).filter((c) => !only || c[0] === only)
if (!cases.length) {
  console.error(`no tripwire cases for "${family}"${only ? ` matching --case ${only}` : ''}.`)
  console.error('Add a row to CATALOGUE — one per ban the family invents.')
  process.exit(2)
}

// ── WIRED vs UNWIRED: poison whatever the guard actually READS ───────────────────────────
// 🔴 The guard files load the DRAFT JSON while a family is unwired and the REGISTRY once it
// is wired (that is the point of the `source` map in each of them). This script originally
// only ever wrote the draft — so the moment a family shipped, every case here started
// reporting "GUARD PASSED A VIOLATION". Twenty phantom holes, on a guard that was fine.
//
// So: pick the target by asking where the hook lives now. The registry stores FOUR beats
// while the catalogue indexes SEVEN draft bubbles, so a wired write also has to map the
// bubble onto its beat — bubbles 3-6 all live inside beat 3, one per line.
const isWired = (hook) =>
  existsSync(REGISTRY) && new RegExp(`^ {4}'${hook}': \\{`, 'm').test(readFileSync(REGISTRY, 'utf8'))

// bubble index (0-6) -> [beat index (0-3), line index within that beat]
const beatOf = (idx) => (idx <= 1 ? [idx, 0] : idx === 6 ? [3, 0] : [2, idx - 2])

// Replace one bubble inside one card of one wired hook, in the TS source. Returns the file's
// original contents so the caller can put it back byte-for-byte.
const poisonRegistry = (hook, card, idx, text) => {
  const original = readFileSync(REGISTRY, 'utf8')
  const start = original.search(new RegExp(`^ {4}'${hook}': \\{`, 'm'))
  if (start < 0) throw new Error(`${hook} is not in the registry`)
  const end = original.indexOf('\n    },', start) + '\n    },'.length
  const block = original.slice(start, end)
  const arr = block.match(new RegExp(`^ {6}${card}: \\[\\n([\\s\\S]*?)^ {6}\\],`, 'm'))
  if (!arr) throw new Error(`${hook}/${card} not found in the registry`)
  const lines = arr[1].split('\n').filter((l) => l.trim().startsWith('"'))
  const [beat, line] = beatOf(idx)
  if (!lines[beat]) throw new Error(`${hook}/${card} has no beat ${beat}`)
  const indent = lines[beat].match(/^\s*/)[0]
  // The stored beat is a single quoted JS string; split it on the escaped newline, swap the
  // one line, and put it back so the other three bubbles in beat 3 are untouched.
  const body = lines[beat].trim().replace(/,$/, '')
  const parts = JSON.parse(body).split('\n')
  parts[line] = text
  const rebuilt = indent + JSON.stringify(parts.join('\n')) + ','
  const newArr = arr[0].replace(lines[beat], rebuilt)
  writeFileSync(REGISTRY, original.slice(0, start) + block.replace(arr[0], newArr) + original.slice(end))
  return original
}

// Everything we have touched, so the finally block can put it all back.
const originals = new Map()
const restoreAll = () => {
  for (const [path, content] of originals) writeFileSync(path, content)
  originals.clear()
}
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { restoreAll(); console.error(`\n${sig} — drafts restored.`); process.exit(130) })
}

let bit = 0
const missed = []
try {
  for (const [label, hook, card, idx, text, ban] of cases) {
    const wired = isWired(hook)
    const path = wired ? REGISTRY : `${DIR}${hook}.json`
    let original
    if (wired) {
      original = poisonRegistry(hook, card, idx, text)
      originals.set(path, original)
    } else {
      original = readFileSync(path, 'utf8')
      originals.set(path, original)
      const j = JSON.parse(original)
      const deck = j.decks?.['return-mhf']
      if (!deck?.[card]) { console.error(`🔴 ${hook}.json has no return-mhf/${card}`); process.exit(2) }
      deck[card][idx] = text
      writeFileSync(path, JSON.stringify(j, null, 2) + '\n')
    }

    let failed = false
    try {
      execSync(`npx vitest run ${TEST} --testTimeout=300000 --maxWorkers=2`, { stdio: 'pipe', encoding: 'utf8' })
    } catch {
      failed = true
    }
    writeFileSync(path, original)
    originals.delete(path)

    if (failed) { bit++; console.log(`✓ ${label.padEnd(11)} ${(wired ? '[registry]' : '[draft]   ').padEnd(11)} (${ban}) — guard BIT`) }
    else { missed.push(`${label} — ${ban}`); console.log(`🔴 ${label.padEnd(11)} ${(wired ? '[registry]' : '[draft]   ').padEnd(11)} (${ban}) — GUARD PASSED A VIOLATION`) }
  }
} finally {
  restoreAll()
}

console.log(`\n${bit}/${cases.length} deliberate violations caught`)
if (missed.length) {
  console.log('\n🔴 NOT CAUGHT — the guard has a hole here:')
  for (const m of missed) console.log(`   ${m}`)
  console.log('\nA green suite on this family currently means nothing for those bans.')
  process.exit(1)
}
console.log('sources restored byte-for-byte.')
