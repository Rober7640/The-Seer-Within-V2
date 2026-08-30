import { DECKS, HEADLINES, TAROT_HOOKS, angleForHook, hookToBucket, isTarotHook, COMMITMENT_AGEBAND_HOOKS, COMMITMENT_CONNECTION_HOOKS } from '../client/src/content/tarotReads'
import { SHADOW_READS, hasShadowRead } from '../client/src/content/tarotReadsShadow'
const SIX = ['cards-expecting-too-much','cards-played-the-wife','cards-instant-connection-commit','cards-connection-without-commitment','cards-connection-heading-commit','cards-stopping-him-committing'] as const
let bad = 0
for (const h of SIX) {
  const inHooks = TAROT_HOOKS.includes(h as any)
  const head = HEADLINES[h as any]
  const angle = angleForHook(h as any)
  const bucket = hookToBucket(h as any)
  const reads = DECKS['return-mhf'].reads[h as any]
  const beats = reads ? [reads.a.length, reads.b.length, reads.c.length].join('/') : 'NONE'
  const sh = hasShadowRead('return-mhf', h as any)
  const ok = inHooks && !!head && !!reads && sh && bucket === 'love'
  if (!ok) bad++
  console.log(`${ok ? 'OK ' : '🔴 '} ${h.padEnd(36)} angle=${angle.padEnd(22)} bucket=${bucket} beats=${beats} shadow=${sh ? 'yes' : 'NO'}`)
  console.log(`      "${head}"`)
}
console.log(`\nCOMMITMENT_AGEBAND_HOOKS = ${COMMITMENT_AGEBAND_HOOKS.length} (was 12)`)
console.log(`COMMITMENT_CONNECTION_HOOKS = ${COMMITMENT_CONNECTION_HOOKS.length}`)
console.log(`TAROT_HOOKS total = ${TAROT_HOOKS.length} (was 148)`)
console.log(`HEADLINES total = ${Object.keys(HEADLINES).length}`)
console.log(`return-mhf reads = ${Object.keys(DECKS['return-mhf'].reads).length}`)
console.log(`shadow reads = ${Object.keys(SHADOW_READS['return-mhf']!).length}`)
console.log(bad ? `\n🔴 ${bad} PROBLEM(S)` : '\n✅ all six wired end to end')
