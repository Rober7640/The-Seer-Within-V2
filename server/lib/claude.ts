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
} from './prompts'

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

// New expanded flow functions
export async function generateReading1(userData: UserData, concern: string): Promise<ClaudeResponse> {
  const prompt = buildReading1Prompt(userData, concern)
  return callClaude(prompt)
}

export async function generateReading2(userData: UserData, deeperResponse: string): Promise<ClaudeResponse> {
  const prompt = buildReading2Prompt(userData, deeperResponse)
  return callClaude(prompt)
}

export async function generateFutureValidation(userData: UserData, vision: string): Promise<ClaudeResponse> {
  const prompt = buildFutureValidationPrompt(userData, vision)
  return callClaude(prompt)
}

export async function generateCrisisReveal(userData: UserData, emotionalResponse: string): Promise<ClaudeResponse> {
  const prompt = buildCrisisRevealPrompt(userData, emotionalResponse)
  return callClaude(prompt)
}

export async function generateCrisisCost(userData: UserData, durationResponse: string): Promise<ClaudeResponse> {
  const prompt = buildCrisisCostPrompt(userData, durationResponse)
  return callClaude(prompt)
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
