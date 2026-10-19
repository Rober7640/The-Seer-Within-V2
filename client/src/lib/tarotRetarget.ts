// Retargeting mode of the /fb-tarot lander — URL parsing and the stored-name read.
//
// Trigger: `?src=retarget` on /fb-tarot or /fb-tarot/b. The attribution marker IS the
// mode switch, so the two can never disagree: every order placed from this page
// carries `src=retarget` into Stripe, and no visit without the marker ever sees it.
//
// The page is pages/TarotRetargetOffer.tsx (the only retarget page since 2026-10-16);
// its copy lives in content/tarotRetargetOffer.ts.

import {
  DEFAULT_HOOK,
  getDeck,
  hookToBucket,
  isTarotHook,
  type TarotDeck,
  type TarotHook,
} from '../content/tarotReads'
import { RETARGET_DECK as SHARED_RETARGET_DECK } from '@shared/retargetCheckout'
import { linkParams } from './funnel'

export type RetargetBucket = 'love' | 'money'

/** The deck every live tarot ad uses; retarget mode always shows it. */
export const RETARGET_DECK: TarotDeck = SHARED_RETARGET_DECK satisfies TarotDeck

/** True when this visit is retarget mode (`src=retarget`). */
export function isRetargetVisit(search?: string): boolean {
  return linkParams(search).get('src') === 'retarget'
}

/**
 * The hook to label and bucket this visit with. `deck=` is ignored on purpose: retarget
 * mode always shows return-mhf. A hook the deck has no reads for falls back to the
 * default, exactly as TarotBridge does, so analytics and copy agree.
 */
export function retargetHook(search?: string): TarotHook {
  const raw = linkParams(search).get('hook')
  const hook: TarotHook = isTarotHook(raw) ? raw : DEFAULT_HOOK
  return getDeck(RETARGET_DECK).reads[hook] ? hook : DEFAULT_HOOK
}

/** love | money, from the hook. The copy only has those two. */
export function retargetBucket(hook: TarotHook): RetargetBucket {
  return hookToBucket(hook) === 'money' ? 'money' : 'love'
}

// useConversation's localStorage session. Same key, same 24-hour expiry.
const STORAGE_KEY = 'seer_conversation'
const SESSION_EXPIRY_HOURS = 24
const MAX_NAME = 40

/**
 * Her first name from an earlier chat on this browser, if it is still within the
 * chat's own 24-hour window. A bonus only — every line must work without it.
 * Read-only: the session is NOT removed here (the normal bridge removes it).
 */
export function storedFirstName(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as { state?: { userData?: { firstName?: unknown } }; timestamp?: unknown }
    if (typeof session?.timestamp !== 'number') return null
    const hours = (Date.now() - session.timestamp) / (1000 * 60 * 60)
    if (hours > SESSION_EXPIRY_HOURS) return null
    const name = session.state?.userData?.firstName
    if (typeof name !== 'string') return null
    const trimmed = name.trim().slice(0, MAX_NAME)
    return trimmed || null
  } catch {
    return null
  }
}

// The first-name box's placeholder and error line. The LABEL comes from
// content/tarotRetargetOffer.ts.
export const NAME_PLACEHOLDER = 'Your first name'
export const NAME_ERROR = 'Tell me your first name, dear, so I know who I am clearing this for.'

/** Name input rule for the offer block: trimmed, 1–40 characters. */
export function cleanFirstName(value: string): string | null {
  const v = value.trim()
  if (v.length < 1 || v.length > MAX_NAME) return null
  return v
}
