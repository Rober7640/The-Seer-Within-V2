// Server-side Claude API wrapper

import Anthropic from '@anthropic-ai/sdk'
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
} from './prompts'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

interface ClaudeResponse {
  messages: string[]
  needsClarification?: boolean
  detectedTopic?: string
  subBucket?: string
  objectionType?: string
}

async function callClaude(prompt: string): Promise<ClaudeResponse> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed.messages)) {
        return {
          messages: parsed.messages,
          needsClarification: parsed.needsClarification || false,
          detectedTopic: parsed.detectedTopic,
          subBucket: parsed.subBucket,
          objectionType: parsed.objectionType,
        }
      }
    }

    console.error('Failed to parse Claude response:', text)
    return { messages: getFallbackMessages() }
  } catch (error) {
    console.error('Claude API error:', error)
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
