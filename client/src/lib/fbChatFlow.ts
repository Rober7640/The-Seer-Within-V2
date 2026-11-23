// /fb chat-flow A/B (v1_fb_chat_flow_2026) — client side.
import type { ChatState } from '@/types/chat'

/**
 * Ask the server which chat this /fb visitor gets. The server assigns on the visitor
 * cookie and logs the exposure in the same call, so AWAIT THIS BEFORE THE GREETING:
 * rendering first would record an arm she never saw.
 *
 * Every failure path (draft test, non-OK response, bad body, network error) answers
 * 'a', today's chat.
 *
 * Preview: `?chatflow=b` (or `=a`) forces the arm for a walk-through WITHOUT calling
 * the server, so a preview is never counted in the test.
 */
export async function fetchAssignedFbChatFlow(): Promise<'a' | 'b'> {
  const override = new URLSearchParams(window.location.search).get('chatflow')
  if (override === 'a' || override === 'b') return override
  try {
    const r = await fetch('/api/fb/chat-flow')
    if (!r.ok) return 'a'
    const data = await r.json()
    return data?.flow === 'b' ? 'b' : 'a'
  } catch {
    return 'a'
  }
}

/** Evelyn's own messages so far, so each B step can be told never to repeat a line. */
export function fbBEarlier(chat: ChatState): string[] {
  return chat.messages
    .filter((m) => m.type === 'bot' && typeof m.content === 'string')
    .map((m) => m.content)
    .slice(-40)
}
