// Belief-lane derail replay — does the lane survive the first two message steps
// after the opener (reading1, reading2)? Adapted from fb-palm-derail-replay.mjs
// (improve-v1/04-fb-palm-derail-PROVEN.md), which proved that fb-palm's identity
// vanished the moment the shared deepening resumed.
//
// NO SERVER, NO DATABASE. It builds the reading1 and reading2 prompts with the real
// builders in server/lib/prompts.ts for the SAME made-up answers, once with
// userData.lane = 'manifest' (/fb?lane=manifest) and once without (plain /fb), and
// sends them straight to Anthropic with the same call shape server/lib/claude.ts
// callClaude() uses (model, max_tokens 1000, one user message, thinking off, first text
// block, JSON extraction, sanitizePredictionsV1).
//
//   npx tsx improve-v1/evidence/belief-lane-derail-replay.ts [runs=2] [budget=12]
//
// PASS = in every run, the lane arm's reading1 AND reading2 each contain a lane word
// (manifest / attract / the list / what she asked for …) and the control arm's contain
// none. The made-up answers deliberately contain none of those words, so a hit can only
// come from the lane directive, never from Evelyn echoing her.
//
// Hard cap: 12 Anthropic calls per invocation by default (4 per run; failed and retried
// calls count). Pass a lower budget when calls were already spent elsewhere.
//
// Keys are tried in the app's failover order (server/lib/anthropicWithFailover.ts):
// ANTHROPIC_API_KEY, then _BACKUP_1, then _BACKUP_2. A key that answers "credit balance
// is too low", 401/403, 429 or 5xx is dropped for the rest of the invocation, so a dead
// primary costs one call, not one per request.

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import type { UserData } from '../../shared/types'
import { buildReading1Prompt, buildReading2Prompt } from '../../server/lib/prompts'
import { sanitizePredictionsV1 } from '../../server/lib/predictionSanitizer'

const MAX_CALLS = Math.max(1, Math.min(12, Number(process.argv[3] ?? 12)))
const RUNS = Math.max(1, Math.min(3, Number(process.argv[2] ?? 2)))

// The model the V1 chat uses with no DB override: V1_CONVERSATION_MODEL, else
// HARDCODED_DEFAULTS.conversation in server/lib/modelConfig.ts — read from the file
// rather than imported, so this script never loads the DB pool.
const modelConfigSrc = fs.readFileSync(path.resolve(import.meta.dirname, '../../server/lib/modelConfig.ts'), 'utf-8')
const DEFAULT_MODEL = /conversation:\s*'([^']+)'/.exec(modelConfigSrc)?.[1]
const MODEL = process.env.V1_CONVERSATION_MODEL?.trim() || DEFAULT_MODEL
if (!MODEL) throw new Error('could not read the default conversation model')
// thinkingOffForModel() in modelConfig.ts, applied centrally by anthropicWithFailover.
const THINKING_OFF: Record<string, unknown> = {
  'claude-sonnet-5-5': { thinking: { type: 'between_tools' } },
  'claude-haiku-5-5': { thinking: { type: 'disabled' } },
  'claude-sonnet-5': { thinking: { type: 'disabled' } },
}

// The lane's words. Matched case-insensitively on whole words.
const LANE_TOKENS: Array<[string, RegExp]> = [
  ['manifest', /\bmanifest\w*/gi],
  ['attract', /\battract\w*/gi],
  ['law of attraction', /\blaw of attraction\b/gi],
  ['list', /\blists?\b/gi],
  ['asked for', /\b(asked for|ask(ed|ing)? for|what you asked)\b/gi],
  ['vision board', /\bvision boards?\b/gi],
  ['scripting', /\bscripting\b/gi],
]

// Her made-up answers — the same for both arms, and free of every lane word.
const FIRST_NAME = 'Maureen'
// Lane: her answer to beat 6 ("Tell me what you asked for, dear... and what you never
// let yourself ask."). Plain /fb: her answer to "Now, tell me more about what's on your
// mind...". Same words either way: that is the point of the comparison.
const ANSWER_1 =
  "A man who calls when he says he will, and stays. I never let myself say I want to be someone's first choice. The last one went quiet after eight months, like they all do."
// Her answer to reading1's closing question.
const ANSWER_2 = 'About ten years now. My sister says I always pick the same kind of man.'

for (const [, re] of LANE_TOKENS) {
  re.lastIndex = 0
  if (re.test(ANSWER_1) || re.test(ANSWER_2)) throw new Error('an answer contains a lane word — the test would prove nothing')
  re.lastIndex = 0
}

const KEYS = (['ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY_BACKUP_1', 'ANTHROPIC_API_KEY_BACKUP_2'] as const)
  .filter((k) => process.env[k]?.trim())
  .map((k) => ({ name: k, client: new Anthropic({ apiKey: process.env[k]!.trim() }), dead: false }))
let calls = 0
const keyLog: string[] = []

function isFailover(e: unknown): boolean {
  const err = e as { status?: number; message?: string }
  return (
    (err.status === 400 && /credit balance/i.test(err.message ?? '')) ||
    err.status === 401 || err.status === 403 || err.status === 429 || (err.status ?? 0) >= 500
  )
}

async function callClaude(prompt: string): Promise<{ messages: string[]; subBucket?: string; raw: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Anthropic.Message | undefined
    for (const key of KEYS) {
      if (key.dead) continue
      if (calls >= MAX_CALLS) throw new Error(`call cap reached (${MAX_CALLS})`)
      calls++
      try {
        res = await key.client.messages.create({
          model: MODEL!,
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
          ...((THINKING_OFF[MODEL!] as object) ?? {}),
        } as Anthropic.MessageCreateParamsNonStreaming)
        keyLog.push(key.name)
        break
      } catch (e) {
        if (!isFailover(e)) throw e
        key.dead = true
        keyLog.push(`${key.name} failed over (${(e as { status?: number }).status})`)
      }
    }
    if (!res) throw new Error('every key failed')
    const block = res.content.find((b) => b.type === 'text')
    const text = block && block.type === 'text' ? block.text : ''
    const m = text.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        const parsed = JSON.parse(m[0])
        if (Array.isArray(parsed.messages)) {
          return { messages: sanitizePredictionsV1(parsed.messages), subBucket: parsed.subBucket, raw: text }
        }
      } catch {
        /* retry below */
      }
    }
  }
  throw new Error('unparseable reply twice')
}

function scan(messages: string[]): Record<string, number> {
  const text = messages.join(' ')
  const out: Record<string, number> = {}
  for (const [label, re] of LANE_TOKENS) {
    re.lastIndex = 0
    const n = (text.match(re) ?? []).length
    if (n) out[label] = n
  }
  return out
}

function baseUser(): UserData {
  return {
    firstName: FIRST_NAME,
    email: null,
    bucket: 'love',
    subBucket: null,
    personName: null,
    concern: null,
    desires: null,
    location: null,
    timeOfDay: 'evening',
    objectionCount: 0,
  }
}

async function arm(lane: string | undefined) {
  const userData: UserData = { ...baseUser(), ...(lane ? { lane } : {}) }
  const r1 = await callClaude(buildReading1Prompt({ ...userData, concern: ANSWER_1 }, ANSWER_1))
  userData.concern = ANSWER_1
  if (r1.subBucket) userData.subBucket = r1.subBucket
  const r2 = await callClaude(buildReading2Prompt(userData, ANSWER_2))
  return { r1: r1.messages, sub: r1.subBucket, r2: r2.messages }
}

async function main() {
  const lines: string[] = []
  const log = (s = '') => {
    lines.push(s)
    console.log(s)
  }
  log('BELIEF-LANE DERAIL REPLAY — lane=manifest vs plain /fb, same answers')
  log(`date ${new Date().toISOString()} · model ${MODEL} · runs ${RUNS} · no server, no DB`)
  log(`her name: ${FIRST_NAME}`)
  log(`answer 1 (reading1 input): "${ANSWER_1}"`)
  log(`answer 2 (reading2 input): "${ANSWER_2}"`)

  let pass = true
  for (let run = 1; run <= RUNS; run++) {
    for (const lane of ['manifest', undefined] as const) {
      const label = lane ? 'LANE    /fb?lane=manifest' : 'CONTROL plain /fb       '
      const res = await arm(lane)
      for (const [step, msgs] of [['reading1', res.r1], ['reading2', res.r2]] as const) {
        const hits = scan(msgs)
        const n = Object.values(hits).reduce((a, b) => a + b, 0)
        const ok = lane ? n > 0 : n === 0
        if (!ok) pass = false
        log('')
        log(`── run ${run} · ${label} · ${step}${step === 'reading1' && res.sub ? ` (subBucket=${res.sub})` : ''} · lane words: ${n ? JSON.stringify(hits) : 'NONE'} · ${ok ? 'ok' : 'FAIL'}`)
        for (const m of msgs) log(`   Evelyn: ${m}`)
      }
    }
  }
  log('')
  log(`Anthropic calls used: ${calls} of ${MAX_CALLS} · keys, in call order: ${keyLog.join(', ')}`)
  log(`VERDICT: ${pass ? 'PASS' : 'FAIL'} — the lane's words ${pass ? 'appear in reading1 AND reading2 with the lane, and in neither without it, in every run' : 'did not separate the arms in every run (see FAIL lines)'}`)

  const out = path.resolve(import.meta.dirname, `belief-lane-derail-replay-${new Date().toISOString().slice(0, 10)}.txt`)
  fs.writeFileSync(out, lines.join('\n') + '\n')
  console.log(`\nsaved ${path.relative(process.cwd(), out)}`)
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error('REPLAY ERROR:', e?.message ?? e)
  console.error(`Anthropic calls used: ${calls} · keys: ${keyLog.join(', ')}`)
  process.exit(2)
})
