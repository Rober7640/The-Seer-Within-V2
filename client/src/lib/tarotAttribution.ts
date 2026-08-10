// Session-scoped PostHog attribution for the /fb-tarot funnel — WHICH deck, hook and
// card a visitor actually came through, resolved once and carried all the way to the
// upsell purchases.
//
// ── Why this exists ──────────────────────────────────────────────────────────
// The tarot ad URLs are deliberately CLEAN (`/fb-tarot/c?hook=cards-return`, with no
// `&deck=`, matching the fb-palm convention of omitting the default sign). So the deck
// is IMPLIED by DEFAULT_DECK on the lander — and by the time the visitor reaches
// `/fb-tarot/welcome1` the URL carries no funnel params at all, because Stripe
// redirects there with only its own session id.
//
// A PostHog event fired on an upsell step therefore CANNOT recover the deck from the
// URL. Before this module `lander_view` hardcoded a `'decode-him'` fallback, which was
// wrong on every clean URL (the live deck is `return-mhf`) and disagreed with
// `tarot_bridge_view.deck`. Parsing the URL harder cannot fix that — on the later steps
// the information genuinely is not in the URL.
//
// The fix is to resolve ONCE where the params do exist, and remember it for the tab.
//
// ── Why sessionStorage and not posthog.register() ────────────────────────────
// register() would attach these as super-properties to every later event for free.
// Rejected: super-properties persist in localStorage+cookie ACROSS funnels, so a
// visitor who afterwards landed on /fb-palm would keep carrying `tarot_deck` and
// corrupt palm's breakdowns. sessionStorage is tab-scoped and read explicitly at each
// call site, so a tarot property can only ever appear on an event we chose to tag.
//
// ── Face-up decks ────────────────────────────────────────────────────────────
// `facing` is read from the deck registry, NOT hardcoded here. When a face-up
// decode-him deck ships on `?deck=<id>`, every event below starts splitting face-up vs
// face-down on its own — no change to this file and no change to any call site. The
// same holds for `card`/`panel`: on a face-down deck they differ (the draw is
// shuffled), on a face-up deck they are equal (she can see what she picked), so
// comparing them measures tap-position bias on exactly the decks where it applies.

import {
  DEFAULT_DECK,
  DEFAULT_HOOK,
  angleForHook,
  getDeck,
  isTarotCard,
  isTarotDeck,
  isTarotHook,
  type TarotAngle,
  type TarotDeck,
  type TarotHook,
  type TarotOption,
  type TarotVersion,
} from '../content/tarotReads'

const STORAGE_KEY = 'seer_tarot_attribution'

/** The property bag spread onto every tarot-funnel PostHog event. */
export interface TarotEventProps {
  /** Which card set the ad quizzed, e.g. 'return-mhf'. */
  deck: TarotDeck
  /** 'down' = backs, drawn on reveal. 'up' = faces, chosen. From the deck registry. */
  facing: 'down' | 'up'
  /** Which decode-him question the ad asked, e.g. 'cards-return'. */
  hook: TarotHook
  /**
   * The hook's ad ANGLE — 'decode-him' | 'trust' | 'self-frame'. Derived from the hook
   * registry, so a new hook is categorised automatically. Lets the two decode-him
   * families be compared as GROUPS in PostHog (one `angle = trust` filter rather than
   * listing every trust hook), which is what breaks down the original angles vs the
   * trust angles.
   */
  angle: TarotAngle
  /** Lander variant: 'a' = reveal card, 'b'/'c' = straight to chat. */
  version: TarotVersion
  /** The card she DREW — drives the reveal, the read and the chat handoff. */
  card?: TarotOption
  /** The position she TAPPED. Differs from `card` on a shuffled face-down deck. */
  panel?: TarotOption
}

interface StoredAttribution {
  deck: TarotDeck
  hook: TarotHook
  version: TarotVersion
  card?: TarotOption
  panel?: TarotOption
}

function safeSession(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null
    return window.sessionStorage
  } catch {
    // Private-mode / blocked storage. Analytics must never break the funnel.
    return null
  }
}

function readStored(): StoredAttribution | null {
  const s = safeSession()
  if (!s) return null
  try {
    const raw = s.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Record<string, unknown>
    // Re-validate on the way out: a deck id that has since been removed from the
    // registry must not resurface as a junk breakdown value.
    const deck = typeof p.deck === 'string' && isTarotDeck(p.deck) ? p.deck : null
    const hook = typeof p.hook === 'string' && isTarotHook(p.hook) ? p.hook : null
    if (!deck || !hook) return null
    return {
      deck,
      hook,
      version: p.version === 'b' || p.version === 'c' ? p.version : 'a',
      card: typeof p.card === 'string' && isTarotCard(p.card) ? p.card : undefined,
      panel: typeof p.panel === 'string' && isTarotCard(p.panel) ? p.panel : undefined,
    }
  } catch {
    return null
  }
}

function writeStored(a: StoredAttribution): void {
  const s = safeSession()
  if (!s) return
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(a))
  } catch {
    // quota / blocked — non-fatal, events just fall back to URL resolution
  }
}

function toProps(a: StoredAttribution): TarotEventProps {
  return {
    deck: a.deck,
    // Registry-driven, so a new face-up deck needs no change here.
    facing: getDeck(a.deck).facing,
    hook: a.hook,
    // Registry-driven like `facing`: a new hook is categorised by the arrays in
    // tarotReads.ts, so nothing here changes when one is added.
    angle: angleForHook(a.hook),
    version: a.version,
    ...(a.card ? { card: a.card } : {}),
    ...(a.panel ? { panel: a.panel } : {}),
  }
}

/** `/fb-tarot`, `/fb-tarot/b`, `/fb-tarot/c` — a fresh quiz, not a later funnel step. */
function isBridgePath(path: string): boolean {
  const p = path.replace(/\/+$/, '')
  return p === '/fb-tarot' || p === '/fb-tarot/b' || p === '/fb-tarot/c'
}

/**
 * Resolve the tarot attribution for the current route and persist it for the tab.
 * Call on EVERY /fb-tarot route change, before any event fires for that route.
 *
 * The URL wins wherever it carries a param (the bridge has `hook`, the chat also has
 * `card` and a non-default `deck`); stored values fill in the steps that have no query
 * string at all (`/welcome1`, `/welcome2`, `/success`).
 */
export function syncTarotAttribution(path: string, search: string): TarotEventProps {
  const stored = readStored()
  const p = new URLSearchParams(search)
  const bridge = isBridgePath(path)

  // A clean ad URL carries no `&deck=`, so an absent param means the DEFAULT deck —
  // it does NOT mean "keep whatever the last visit used". Only fall back to the stored
  // deck off-bridge, where the param is legitimately missing from every URL.
  const deckParam = p.get('deck')
  const deck: TarotDeck = isTarotDeck(deckParam)
    ? deckParam
    : bridge
      ? DEFAULT_DECK
      : (stored?.deck ?? DEFAULT_DECK)

  const hookParam = p.get('hook')
  const hookRaw: TarotHook = isTarotHook(hookParam)
    ? hookParam
    : (stored?.hook ?? DEFAULT_HOOK)
  // Mirrors TarotBridge: a hook with no reads for this deck falls back wholesale, so
  // the analytics hook is the one whose copy she was actually shown.
  const hook: TarotHook = getDeck(deck).reads[hookRaw] ? hookRaw : DEFAULT_HOOK

  // Version comes from the route on the bridge (/b, /c) and from `&v=` on the chat.
  const vParam = p.get('v')
  const version: TarotVersion = bridge
    ? (path.replace(/\/+$/, '').endsWith('/b')
        ? 'b'
        : path.replace(/\/+$/, '').endsWith('/c')
          ? 'c'
          : 'a')
    : vParam === 'b' || vParam === 'c'
      ? vParam
      : (stored?.version ?? 'a')

  const cardParam = p.get('card')
  // Landing on the bridge is a FRESH quiz (TarotBridge drops the chat session for the
  // same reason), so a previous visit's draw must not leak into this one.
  const card: TarotOption | undefined = isTarotCard(cardParam)
    ? cardParam
    : bridge
      ? undefined
      : stored?.card
  const panel: TarotOption | undefined = bridge ? undefined : stored?.panel

  const next: StoredAttribution = { deck, hook, version, card, panel }
  writeStored(next)
  return toProps(next)
}

/**
 * Record the draw at card-select time. `card` is what she drew, `panel` the position
 * she tapped — equal on a face-up deck, independent on a shuffled face-down one.
 */
export function rememberTarotDraw(card: TarotOption, panel: TarotOption): void {
  const stored = readStored()
  if (!stored) return
  writeStored({ ...stored, card, panel })
}

/**
 * Overwrite the stored version after the server assigns an arm.
 *
 * 🔴 NOT optional bookkeeping. `version` is resolved from the URL on every route
 * change and spread onto EVERY tarot PostHog event. When the B-vs-C experiment moves
 * a visitor off the version her URL named, leaving the store alone would report her
 * whole session — lander view, card select, lead, checkout, both upsells — under the
 * arm she did not see, while the database counted her under the arm she did. The two
 * reporting surfaces would disagree and neither would be checkable against the other.
 */
export function rememberTarotVersion(version: TarotVersion): void {
  const stored = readStored()
  if (!stored || stored.version === version) return
  writeStored({ ...stored, version })
}

/**
 * Ask the server which opener this visitor should get — Version B (smart template)
 * or Version C (LLM). See resolveTarotVersion in server/lib/experiments.ts.
 *
 * `urlVersion` is what the URL alone would have served, and is returned unchanged on
 * EVERY failure path: version A (never in the test), a non-OK response, a malformed
 * body, or a network error. So a draft experiment, a deploy mid-flight or an outage
 * all degrade to exactly today's funnel rather than to a broken chat.
 *
 * 🔴 AWAIT THIS BEFORE RENDERING THE OPENER, never in parallel with it. The server
 * logs the exposure as it answers, so a caller that renders first and reconciles
 * later would record an arm the visitor never saw — the one corruption this test
 * cannot recover from afterwards.
 */
export async function fetchAssignedTarotVersion(
  deck: TarotDeck,
  hook: TarotHook,
  urlVersion: TarotVersion,
): Promise<TarotVersion> {
  if (urlVersion === 'a') return 'a'
  try {
    const qs = new URLSearchParams({
      v: urlVersion,
      hook,
      deck,
      // Registry-derived, exactly as toProps does it — so the exposure row carries the
      // same facing/angle labels the PostHog events do and the two can be reconciled.
      facing: getDeck(deck).facing,
      angle: angleForHook(hook),
    })
    const r = await fetch(`/api/tarot/version?${qs.toString()}`)
    if (!r.ok) return urlVersion
    const data = await r.json()
    return data?.version === 'b' || data?.version === 'c' ? data.version : urlVersion
  } catch {
    return urlVersion
  }
}

/**
 * The tarot property bag for the current tab, or undefined if this visitor never came
 * through the tarot bridge. Callers on shared V1 components MUST gate on
 * `getPostHogFunnel() === 'tarot'` — sessionStorage outlives the funnel within a tab,
 * so an ungated spread would tag a later palm/fb upsell with tarot properties.
 */
export function tarotEventProps(): TarotEventProps | undefined {
  const stored = readStored()
  return stored ? toProps(stored) : undefined
}
