// Server-side Claude API wrapper

import { anthropicFailover as anthropic } from './anthropicWithFailover'
import logger from './logger'
import { fireWithBreaker, anthropicBreaker, isCircuitOpenError } from './circuitBreaker'
import { getModelForOperation } from './modelConfig'
import { sanitizePredictionsV1 } from './predictionSanitizer'
import type { UserData } from '../../shared/types'
import {
  buildReading1Prompt,
  buildReading2Prompt,
  buildFutureValidationPrompt,
  buildCrisisRevealPrompt,
  buildCrisisCostPrompt,
  buildCrisisUrgencyPrompt,
  buildShadowSummaryPrompt,
  buildValueExplainPrompt,
  buildCrisisPrompt,
  buildObjectionPrompt,
  buildReadingPrompt, // legacy
  buildManifestRevealPrompt,
  buildManifestPersonalizePrompt,
  buildPalmOpenerPrompt,
  buildPalmReflectPrompt,
  buildTarotReflectPrompt,
  buildReadReflectPrompt,
} from './prompts'
import type { ReadDevice, ReadHook, ReadOption } from '../../shared/readDevices'
import { remainingBubbles } from '../../shared/readDevices'
import { readReplyHarms, deepReplyHarms } from '../../shared/readGuards'

interface ClaudeResponse {
  messages: string[]
  needsClarification?: boolean
  detectedTopic?: string
  subBucket?: string
  objectionType?: string
}

async function callClaude(prompt: string): Promise<ClaudeResponse> {
  try {
    // V1-only model override via env var (per-Railway-service → isolates dev from prod AND
    // V1 from V2, and is instantly reversible by removing it). UNSET → the shared conversation
    // model, byte-identical to previous behavior. Set to 'claude-sonnet-5' on dev/local to test
    // the migration; V2 (chatEngine.ts) is unaffected — it never reads this.
    const model = process.env.V1_CONVERSATION_MODEL?.trim() || getModelForOperation('conversation')
    const response = await fireWithBreaker(anthropicBreaker, () =>
      anthropic.messages.create({
        model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
        // Sonnet 5 runs adaptive thinking ON when `thinking` is omitted; a leading thinking
        // block would make the JSON extraction below miss the text, and every V1 reply would
        // fall back to canned messages. Disable thinking on Sonnet 5. Older models (e.g. 4.5)
        // omit the field = current no-thinking behavior, unchanged.
        ...(model === 'claude-sonnet-5' ? { thinking: { type: 'disabled' as const } } : {}),
      }),
    )

    // Take the FIRST TEXT block (not content[0]) — defensive so any leading non-text block
    // (a thinking block, etc.) can never silently blank the reply. With thinking disabled this
    // is content[0] anyway, so behavior is unchanged for the current model.
    const textBlock = response.content.find((b) => b.type === 'text')
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed.messages)) {
        return {
          messages: sanitizePredictionsV1(parsed.messages),
          needsClarification: parsed.needsClarification || false,
          detectedTopic: parsed.detectedTopic,
          subBucket: parsed.subBucket,
          objectionType: parsed.objectionType,
        }
      }
    }

    logger.error('Failed to parse Claude response:', text)
    return { messages: getFallbackMessages() }
  } catch (error) {
    if (isCircuitOpenError(error)) {
      logger.warn('Anthropic circuit open, using fallback messages')
    } else {
      logger.error('Claude API error:', error)
    }
    return { messages: getFallbackMessages() }
  }
}

function getFallbackMessages(): string[] {
  return [
    "I sense something shifting in your energy...",
    "Let me focus more deeply...",
    "There's more here than meets the eye...",
  ]
}

// Deep-flow harm net for quiz-bridge traffic. check → retry once naming the breach →
// drop the offending bubble if the retry still breaches and something clean remains.
//
// 🔴 A PROMPT INSTRUCTION IS A REQUEST; THIS IS THE NET. tarotDirective and
// readDirective tell the model what not to say and the persona walks show it listens
// — but that is evidence, not a guarantee, and this guard has been walked through
// twice by a model that already had it. The prompt is the primary defence; this stops
// the residue reaching her.
//
// Returns the response UNTOUCHED for root / fb / fb2 / gdn / palm, because
// deepReplyHarms returns [] without a read or tarot hook on userData.
async function callGuardedDeep(
  userData: UserData,
  prompt: string,
  phase: string,
): Promise<ClaudeResponse> {
  const first = await callClaude(prompt)
  const msgsOf = (r: ClaudeResponse): string[] =>
    Array.isArray((r as any)?.messages) ? ((r as any).messages as string[]) : []

  let harms = deepReplyHarms(userData, msgsOf(first))
  if (!harms.length) return first

  console.warn(`[deep-guard] ${phase} breached: ${harms.join(' · ')} — retrying`)
  const retry = await callClaude(
    `${prompt}\n\nYour previous reply broke a rule: ${harms.join('; ')}. Never state what a specific man thinks or feels about her — nobody can report a thought, and it is the one claim she can later find false. Say it again without that claim.`,
  )
  const retryMsgs = msgsOf(retry)
  harms = deepReplyHarms(userData, retryMsgs)
  if (!harms.length) return retry

  // Still breaching. Drop only the offending bubbles, and only if something is left —
  // a short reading is recoverable, a verdict on a real man is not.
  const clean = retryMsgs.filter((m) => !deepReplyHarms(userData, [m]).length)
  console.warn(`[deep-guard] ${phase} breached on retry too: ${harms.join(' · ')} — dropping ${retryMsgs.length - clean.length} bubble(s)`)
  if (!clean.length) return retry
  return { ...(retry as any), messages: clean } as ClaudeResponse
}

// New expanded flow functions
export async function generateReading1(userData: UserData, concern: string): Promise<ClaudeResponse> {
  const prompt = buildReading1Prompt(userData, concern)
  return callGuardedDeep(userData, prompt, 'generateReading1')
}

export async function generateReading2(userData: UserData, deeperResponse: string): Promise<ClaudeResponse> {
  const prompt = buildReading2Prompt(userData, deeperResponse)
  return callGuardedDeep(userData, prompt, 'generateReading2')
}

export async function generateFutureValidation(userData: UserData, vision: string): Promise<ClaudeResponse> {
  const prompt = buildFutureValidationPrompt(userData, vision)
  return callGuardedDeep(userData, prompt, 'generateFutureValidation')
}

export async function generateCrisisReveal(userData: UserData, emotionalResponse: string): Promise<ClaudeResponse> {
  const prompt = buildCrisisRevealPrompt(userData, emotionalResponse)
  return callGuardedDeep(userData, prompt, 'generateCrisisReveal')
}

export async function generateCrisisCost(userData: UserData, durationResponse: string): Promise<ClaudeResponse> {
  const prompt = buildCrisisCostPrompt(userData, durationResponse)
  return callGuardedDeep(userData, prompt, 'generateCrisisCost')
}

export async function generateCrisisUrgency(userData: UserData, worthResponse: string): Promise<ClaudeResponse> {
  const prompt = buildCrisisUrgencyPrompt(userData, worthResponse)
  return callClaude(prompt)
}

export async function generateShadowSummary(userData: UserData): Promise<ClaudeResponse> {
  const prompt = buildShadowSummaryPrompt(userData)
  return callClaude(prompt)
}

export async function generateValueExplain(userData: UserData): Promise<ClaudeResponse> {
  const prompt = buildValueExplainPrompt(userData)
  return callClaude(prompt)
}

// Legacy functions for backwards compatibility
export async function generateReading(userData: UserData, concern: string): Promise<ClaudeResponse> {
  return generateReading1(userData, concern)
}

export async function generateCrisis(userData: UserData, desires: string): Promise<ClaudeResponse> {
  const prompt = buildCrisisPrompt(userData, desires)
  return callClaude(prompt)
}

export async function handleObjection(userData: UserData, objection: string, count: number): Promise<ClaudeResponse> {
  const prompt = buildObjectionPrompt(userData, objection, count)
  return callClaude(prompt)
}

export async function generateManifestReveal(userData: UserData, concern: string): Promise<ClaudeResponse> {
  const prompt = buildManifestRevealPrompt(userData, concern)
  return callClaude(prompt)
}

export async function generateManifestPersonalize(userData: UserData, concern: string): Promise<ClaudeResponse> {
  const prompt = buildManifestPersonalizePrompt(userData, concern)
  return callClaude(prompt)
}

// Palm "quiz bridge" Version C — LLM-generated opening reading from the tapped
// thumb. On any failure callClaude returns fallback messages; the client also
// falls back to the static Version-B opener, so the funnel never breaks.
export async function generatePalmOpener(userData: UserData, sign: string, hook: string, thumb: string): Promise<ClaudeResponse> {
  const prompt = buildPalmOpenerPrompt(userData, sign, hook, thumb)
  return callClaude(prompt)
}

// Version C (interactive) — read her typed answer to the opener question.
export async function generatePalmReflect(userData: UserData, sign: string, hook: string, thumb: string, answer: string): Promise<ClaudeResponse> {
  const prompt = buildPalmReflectPrompt(userData, sign, hook, thumb, answer)
  return callClaude(prompt)
}

// Tarot "decode-him card" bridge (/fb-tarot) Version C — read her typed answer,
// woven with the card she drew (reads HIM as a tendency). Same fallback safety as
// palm: callClaude returns fallback messages, and the client falls back to the
// static reveal, so the funnel never breaks.
export async function generateTarotReflect(userData: UserData, deck: string, hook: string, card: string, answer: string): Promise<ClaudeResponse> {
  const prompt = buildTarotReflectPrompt(userData, deck, hook, card, answer)
  return callClaude(prompt)
}

// /fb-read Version C. Takes no userData: at this point in the flow she has given
// neither a name nor an email, and the prompt needs nothing else about her — her
// answer is passed separately. device/hook/option are validated enums, so
// buildReadReflectPrompt looks the opening bubble up itself rather than trusting
// the client to send prompt text back to the server.
// 🔴 THE ONLY PLACE A VERSION-C REPLY IS READ BEFORE SHE SEES IT.
//
// Until 2026-08-31 this function was three lines — build, call, return — and every
// guard on this funnel lived in a test file. The eval knew that answering a woman
// who had never mentioned a man with "…what you were before him" breached the
// love-again frame. Production did not, and shipped it.
//
// Now: check, retry once, and if it still breaches, fall back to the WRITTEN read.
// The fallback is not new machinery — `remainingBubbles` is already what Version C
// serves when the model call fails, so a guard breach simply becomes another kind
// of failure. She gets the real reading instead of a bad one, with no dead air and
// nothing on screen to tell her anything went wrong.
//
// 🔴 A FALSE POSITIVE HERE COSTS HER THE GENERATED READING. In the eval it costs a
// red line in a report. That asymmetry is why readGuards carries harms only and no
// quality checks, and why its negation handling is the most-tested part of it.
export async function generateReadReflect(device: ReadDevice, hook: ReadHook, option: ReadOption, answer: string): Promise<ClaudeResponse> {
  const prompt = buildReadReflectPrompt(device, hook, option, answer)

  const attempt = async (extra?: string): Promise<{ res: ClaudeResponse; harms: string[] }> => {
    const res = await callClaude(extra ? `${prompt}\n\n${extra}` : prompt)
    const messages = Array.isArray((res as any)?.messages) ? (res as any).messages as string[] : []
    if (!messages.length) return { res, harms: [] }
    return { res, harms: readReplyHarms({ device, hook, option, answer, messages }) }
  }

  let out = await attempt()
  if (out.harms.length) {
    console.warn(`[fb-read] reflect breached ${device}/${hook}/${option}: ${out.harms.join(' · ')} — retrying`)
    // Name the breach rather than repeat the whole guard: the prompt already
    // carries the frame, and the model missed it. Telling it which line it broke
    // is a smaller ask than reciting the frame again.
    out = await attempt(
      `## YOUR LAST REPLY BROKE THE READING AND WAS NOT SENT\nIt did this: ${out.harms.join('; ')}.\nWrite the reply again without that. Change nothing else about your approach.`,
    )
  }

  if (out.harms.length) {
    console.error(`[fb-read] reflect FELL BACK ${device}/${hook}/${option}: ${out.harms.join(' · ')}`)
    // The written read, minus the opening bubble she has already been shown.
    return { messages: remainingBubbles(device, hook, option) } as ClaudeResponse
  }
  return out.res
}
