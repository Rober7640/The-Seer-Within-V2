// Which belief lane (/fb?lane=<id>, shared/beliefLanes.ts) this tab came through —
// resolved where the URL carries it and remembered for the tab, so the steps that
// have no query string (Stripe redirects to /fb/welcome1 with only its session id)
// can still be attributed. Same reasoning and same storage choice as
// lib/tarotAttribution.ts: sessionStorage, not posthog.register(), so a lane can only
// ever appear on an event we chose to tag and never leaks into a later funnel.
//
// 🔴 PLAIN /fb STAYS PLAIN. Only funnel v1-fb (the /fb prefix) can carry a lane, and on
// the lander itself the URL is the whole truth: /fb with no lane, or with an id the
// registry does not know, clears the remembered lane and resolves to none. Every
// consumer therefore sees `undefined` — and spreads nothing — for non-lane traffic.

import { getLane, LANE_LANDER_PATH, type BeliefLane, type LaneId } from '@shared/beliefLanes'
import { funnelDefForPath } from '@shared/funnelConfig'
import { DEFAULT_LOCALE } from '@shared/locales'
import { linkParams } from './funnel'
import { currentLocale } from './locale'

const STORAGE_KEY = 'seer_lane'

function safeSession(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null
    return window.sessionStorage
  } catch {
    // Private mode / blocked storage. Attribution must never break the funnel.
    return null
  }
}

function readStored(): string | null {
  try {
    return safeSession()?.getItem(STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

function writeStored(id: string | null): void {
  const s = safeSession()
  if (!s) return
  try {
    if (id) s.setItem(STORAGE_KEY, id)
    else s.removeItem(STORAGE_KEY)
  } catch {
    // quota / blocked — non-fatal
  }
}

/**
 * The lane for this route, recorded for the tab. Call on any /fb route; it is a
 * no-op (returns undefined, touches nothing) everywhere else.
 *   - a valid ?lane= wins and is remembered;
 *   - on the lander (/fb) an absent or unknown ?lane= means NO lane, and clears it;
 *   - on a later /fb step with no usable param, the remembered lane (re-validated).
 * English visitors only: lane copy (card, chat openers, lane question) is English, so a
 * visitor in another language (?lang=fr) gets the plain /fb in her language instead.
 */
export function resolveLane(path?: string, search?: string): BeliefLane | undefined {
  const p = path ?? (typeof window === 'undefined' ? '' : window.location.pathname)
  if (funnelDefForPath(p)?.param !== 'v1-fb') return undefined
  if (currentLocale() !== DEFAULT_LOCALE) return undefined
  const fromUrl = getLane(linkParams(search).get('lane'))
  if (fromUrl) {
    writeStored(fromUrl.id)
    return fromUrl
  }
  if (p === LANE_LANDER_PATH) {
    writeStored(null)
    return undefined
  }
  return getLane(readStored())
}

/** `{ lane }` for a PostHog event on a lane visit, `{}` for everyone else. */
export function laneEventProps(): { lane?: LaneId } {
  const lane = resolveLane()
  return lane ? { lane: lane.id as LaneId } : {}
}
