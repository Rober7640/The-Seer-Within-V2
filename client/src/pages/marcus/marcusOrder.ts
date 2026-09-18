import { useEffect, useState } from 'react'

// 08 Marcus — the one order read the bridge and the receipt share.
//
// Source: GET /api/backend/order/:sessionId (server/routes/backendOffers.ts,
// `publicOrder`). The local reference app read `GET /api/orders/:id`
// (improve-v1/v1-one-time-BEs/local/08-marcus/server.ts); the field names below are
// production's, mapped in the page files.
//
// Status codes, as the route emits them:
//   200 → { order }              the row (webhook already wrote it, or Stripe says paid)
//   402 → not paid yet           retryable: Stripe has not settled / async payment
//   404 → not a backend order    final
//   400 → not a `cs_` id         final
//   5xx / network                final after the poll window
//
// The poll exists for one race: Stripe's success_url can land her here before the
// paid webhook has written the row. The route itself falls back to Stripe on a miss,
// so most loads settle on the first request; the poll is the belt to that brace.

export interface PublicMarcusOrder {
  reference: string
  offer: string
  offerNumber: string
  firstName: string | null
  email: string | null
  amountCents: number
  bumpPurchased: boolean
  status: string
  readingCents: number
  bumpCents: number
  bumpProductKey: string | null
  deliveryHours: number
  dueAt: string | null
  deliveredAt: string | null
  createdAt: string | null
  editionId: string | null
  editionVersion: number | null
  edition: { id: string; version: number; slug: string; question: string; theme: string } | null
  // T8 fills `purchased` from the real entitlement; today it is always false.
  audio: { available: boolean; priceCents: number; purchased: boolean }
}

export type MarcusOrderResult =
  | { kind: 'ok'; order: PublicMarcusOrder }
  | { kind: 'unpaid' }
  | { kind: 'not-found' }
  | { kind: 'error' }

export async function fetchMarcusOrder(sessionId: string): Promise<MarcusOrderResult> {
  const r = await fetch(`/api/backend/order/${encodeURIComponent(sessionId)}`)
  if (r.status === 402) return { kind: 'unpaid' }
  if (r.status === 404) return { kind: 'not-found' }
  if (!r.ok) return { kind: 'error' }
  const data = (await r.json()) as { order?: PublicMarcusOrder | null }
  if (!data?.order) return { kind: 'not-found' }
  return { kind: 'ok', order: data.order }
}

/** Every 2 s, up to ~40 s — the same window OffersUpsell1's chain tolerates. */
export const ORDER_POLL_MS = 2_000
export const ORDER_POLL_WINDOW_MS = 40_000

export type MarcusOrderState =
  | { status: 'missing' } // no session id in the URL
  | { status: 'loading' }
  | { status: 'paid'; order: PublicMarcusOrder }
  | { status: 'unpaid' } // 402 for the whole window, or a row whose status is not 'paid'
  | { status: 'not-found' }
  | { status: 'error' }

/**
 * Load the order for a session id, polling through the webhook race.
 * `paid` means the row exists AND `order.status === 'paid'` — a refunded or
 * cancelled row reads as `unpaid`, so neither page moves her forward on it.
 * Nothing is stored anywhere: a reload starts again from the URL.
 */
export function useMarcusOrder(sessionId: string | null): MarcusOrderState {
  const [state, setState] = useState<MarcusOrderState>(
    sessionId ? { status: 'loading' } : { status: 'missing' },
  )

  useEffect(() => {
    if (!sessionId) {
      setState({ status: 'missing' })
      return
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const deadline = Date.now() + ORDER_POLL_WINDOW_MS
    setState({ status: 'loading' })

    const attempt = async () => {
      let result: MarcusOrderResult
      try {
        result = await fetchMarcusOrder(sessionId)
      } catch {
        // A dropped connection is retried like a 402 until the window closes.
        result = { kind: 'error' }
      }
      if (cancelled) return

      if (result.kind === 'ok') {
        setState(
          result.order.status === 'paid'
            ? { status: 'paid', order: result.order }
            : { status: 'unpaid' },
        )
        return
      }
      if (result.kind === 'not-found') {
        setState({ status: 'not-found' })
        return
      }
      if (Date.now() < deadline) {
        timer = setTimeout(attempt, ORDER_POLL_MS)
        return
      }
      setState(result.kind === 'unpaid' ? { status: 'unpaid' } : { status: 'error' })
    }

    void attempt()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [sessionId])

  return state
}

/** `?session_id=` (Stripe's placeholder, the bridge) or `?s=` (the deck's receipts). */
export function sessionIdFromSearch(search: string): string | null {
  const params = new URLSearchParams(search)
  const id = params.get('session_id') || params.get('s')
  return id && id.trim() ? id.trim() : null
}
