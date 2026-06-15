// Generalized persona lander chat engine — Haiku turn-reply + static opener.
//
// Persona-agnostic port of evelynLanderEngine.ts: the voice (system prompt,
// openers, fallbacks) is injected via a PersonaLanderConfig from
// personaLanderConfig.ts, so one engine serves Marcus/Luna/Nova/Maren and any
// future persona. Same design rules as the Evelyn engine:
//   - Opener is static (no Haiku call on page load) — prefetcher-safe + fast boot.
//   - Turn replies use Haiku 4.5, max 250 tokens, with the persona's stripped-down
//     warm-up system prompt and explicit guardrails.
//   - On any Haiku failure, callers fall back to a short static reply.

import { anthropicFailover as anthropic } from './anthropicWithFailover';
import { getModelForOperation } from './modelConfig';
import logger from './logger';
import type {
  Bucket,
  ChatMessage,
  OpenerInput,
  PersonaLanderConfig,
} from './personaLanderConfig';

export type { Bucket, ChatMessage } from './personaLanderConfig';

const MAX_TOKENS = 250;

export interface TurnReplyInput {
  // Full conversation so far, including the static opener as the first assistant
  // message. The new user message is appended by the caller.
  messages: ChatMessage[];
  firstName: string | null;
  bucket: Bucket | null;
  // True on the second (final) user message — the persona wraps up gently.
  isFinalTurn: boolean;
}

/** Static opener for the page (no Haiku call). Delegates to the persona's config. */
export function selectStaticOpener(
  config: PersonaLanderConfig,
  input: OpenerInput,
): string {
  return config.selectOpener(input);
}

function buildContextLine(input: TurnReplyInput): string {
  const parts: string[] = [];
  if (input.firstName) parts.push(`The user's first name is ${input.firstName}.`);
  if (input.bucket) {
    const label =
      input.bucket === 'specific' ? 'someone specific in their life' : input.bucket;
    parts.push(`Their primary concern is around ${label}.`);
  }
  return parts.join(' ');
}

/** One Haiku turn reply in the persona's voice; falls back to static copy on error. */
export async function generateTurnReply(
  config: PersonaLanderConfig,
  input: TurnReplyInput,
): Promise<{ reply: string; fromFallback: boolean }> {
  const contextLine = buildContextLine(input);
  const system =
    config.systemPrompt +
    (contextLine ? `\n\n${contextLine}` : '') +
    (input.isFinalTurn ? config.finalTurnInstruction : '');

  try {
    const res = await anthropic.messages.create({
      model: getModelForOperation('greeting'), // Haiku
      max_tokens: MAX_TOKENS,
      system,
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const block = res.content[0];
    const text = block && block.type === 'text' ? block.text.trim() : '';
    if (!text) {
      throw new Error('empty Haiku reply');
    }
    return { reply: text, fromFallback: false };
  } catch (err) {
    logger.warn('personaLanderEngine: turn fallback', {
      persona: config.slug,
      err: (err as Error).message,
      isFinalTurn: input.isFinalTurn,
    });
    return { reply: config.turnFallback(input.isFinalTurn), fromFallback: true };
  }
}
